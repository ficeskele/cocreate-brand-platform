import assert from 'node:assert/strict';
import { test } from 'node:test';
import { branches, ideas } from '../src/data/catalog.ts';
import { calculateMargin, createMerchantService, type ShopifyDraftGateway } from '../src/services/merchantService.ts';
import { calculateProfit } from '../src/services/pricing.ts';
import { MerchantRepository, STORAGE_KEY, type StorageAdapter } from '../src/services/storage.ts';
function fixture() { const map = new Map<string, string>(); const storage: StorageAdapter = { getItem: key => map.get(key) ?? null, setItem: (key, value) => { map.set(key, value); } }; return { storage, map, service: createMerchantService(new MerchantRepository(storage)) }; }
const merchant = 'merchant-test';
const branch = 'branch-organizer-1';
const fields = { title: 'My new product', description: 'An approved community design.', sellingPrice: 30 };
test('catalog has six ideas, three independent designs each, and valid parent relationships', async () => {
  assert.equal(ideas.length, 6); assert.equal(branches.length, 18);
  for (const idea of ideas) assert.equal(branches.filter(b => b.ideaId === idea.id).length, 3);
  for (const b of branches) { if (b.parentBranchId) assert.equal(branches.find(p => p.id === b.parentBranchId)?.ideaId, b.ideaId); assert.ok(b.images.length > 0); }
  const { service } = fixture(); assert.equal((await service.getIdeaById('idea-organizer'))?.id, 'idea-organizer'); assert.equal((await service.getBranchesByIdeaId('idea-organizer')).length, 3); assert.equal((await service.getBranchById(branch))?.id, branch);
});
test('application starts pending and prevents duplicate active applications', async () => {
  const { service } = fixture(); const app = await service.applyToSell(merchant, branch); assert.equal(app.status, 'pending'); assert.equal(app.branchId, branch);
  assert.deepEqual(app.commissionTerms, { commissionRate: 0.1, commissionRecipientId: branches.find(b => b.id === branch)?.creatorId, commissionStatus: 'proposed' });
  await assert.rejects(service.applyToSell(merchant, branch), /active application/);
  await service.updateApplicationStatus(merchant, app.id, 'approved'); await assert.rejects(service.applyToSell(merchant, branch), /active application/);
  assert.deepEqual((await service.getMerchantApplications(merchant))[0].commissionTerms, { ...app.commissionTerms, commissionStatus: 'approved' });
  assert.equal((await service.applyToSell('another-merchant', branch)).status, 'pending');
});
test('pending and rejected applications cannot create drafts; rejection permits reapplication', async () => {
  const { service } = fixture(); const app = await service.applyToSell(merchant, branch);
  await assert.rejects(service.createProductDraft(merchant, { applicationId: app.id, ...fields }), /approval/);
  await service.updateApplicationStatus(merchant, app.id, 'rejected');
  await assert.rejects(service.createProductDraft(merchant, { applicationId: app.id, ...fields }), /approval/);
  const second = await service.applyToSell(merchant, branch); assert.notEqual(app.id, second.id); assert.equal(second.status, 'pending');
});
test('approved draft persists across service reload and cannot be created twice', async () => {
  const { service, storage } = fixture(); const app = await service.applyToSell(merchant, branch); await service.updateApplicationStatus(merchant, app.id, 'approved');
  const draft = await service.createProductDraft(merchant, { ...fields, applicationId: app.id });
  assert.equal(draft.status, 'draft'); assert.match(draft.shopifyProductId, /^mock_shopify_/); assert.equal(draft.branchId, branch); assert.equal(draft.applicationId, app.id);
  assert.equal(draft.pricing.manufacturingCost, 12.5); assert.equal(draft.pricing.creatorCommissionAmount, 3); assert.equal(draft.pricing.merchantEstimatedProfit, 14.5);
  assert.deepEqual(draft.commissionTerms, { ...app.commissionTerms, commissionStatus: 'approved' });
  const reloaded = createMerchantService(new MerchantRepository(storage)); assert.deepEqual(await reloaded.getProductDrafts(merchant), [draft]); assert.equal((await reloaded.getMerchantApplications(merchant))[0].status, 'approved');
  await assert.rejects(reloaded.createProductDraft(merchant, { ...fields, applicationId: app.id }), /already exists/);
});
test('service rejects invalid fields, unavailable branches, and access by a different merchant', async () => {
  const { service } = fixture(); await assert.rejects(service.applyToSell(merchant, 'missing'), /not available/); await assert.rejects(service.applyToSell(merchant, 'branch-lamp-3'), /not available/);
  const app = await service.applyToSell(merchant, branch); await assert.rejects(service.updateApplicationStatus('other', app.id, 'approved'), /not found/); await service.updateApplicationStatus(merchant, app.id, 'approved');
  await assert.rejects(service.updateApplicationStatus(merchant, app.id, 'rejected'), /Only pending/);
  for (const invalid of [{ title: ' ' }, { title: 'a'.repeat(201) }, { description: '' }, { sellingPrice: 0 }, { sellingPrice: -1 }, { sellingPrice: NaN }, { sellingPrice: Infinity }, { sellingPrice: 0.001 }, { sellingPrice: 1000001 }]) await assert.rejects(service.createProductDraft(merchant, { applicationId: app.id, ...fields, ...invalid }));
  await assert.rejects(service.createProductDraft('other', { applicationId: app.id, ...fields }), /not found/); assert.equal((await service.getProductDrafts(merchant)).length, 0);
});
test('concurrent submissions create one draft; gateway failures allow retry', async () => {
  const { storage, service } = fixture(); const app = await service.applyToSell(merchant, branch); await service.updateApplicationStatus(merchant, app.id, 'approved');
  let calls = 0; const gateway: ShopifyDraftGateway = { async createDraft() { calls++; await new Promise(r => setTimeout(r, 10)); return { shopifyProductId: 'mock_shopify_test' }; } };
  const delayed = createMerchantService(new MerchantRepository(storage), gateway); const results = await Promise.allSettled([delayed.createProductDraft(merchant, { ...fields, applicationId: app.id }), delayed.createProductDraft(merchant, { ...fields, applicationId: app.id })]);
  assert.equal(calls, 1); assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const another = await service.applyToSell(merchant, 'branch-tote-1'); await service.updateApplicationStatus(merchant, another.id, 'approved');
  let fail = true; const retrying = createMerchantService(new MerchantRepository(storage), { async createDraft() { if (fail) throw new Error('Gateway unavailable'); return { shopifyProductId: 'mock_shopify_retry' }; } });
  await assert.rejects(retrying.createProductDraft(merchant, { ...fields, applicationId: another.id }), /Gateway unavailable/); fail = false; await retrying.createProductDraft(merchant, { ...fields, applicationId: another.id });
});
test('unavailable, full, and corrupt storage fall back to session state without crashing', async () => {
  const unavailable = new MerchantRepository(); const service = createMerchantService(unavailable); await service.applyToSell(merchant, branch); assert.equal((await service.getMerchantApplications(merchant)).length, 1); assert.match(unavailable.warning, /session only/);
  const full = new MerchantRepository({ getItem: () => null, setItem: () => { throw new Error('Quota exceeded'); } }); const fullService = createMerchantService(full); await fullService.applyToSell(merchant, branch); assert.equal((await fullService.getMerchantApplications(merchant)).length, 1); assert.match(full.warning, /full or unavailable/);
  const { storage, map } = fixture(); map.set(STORAGE_KEY, '{broken'); const corrupt = new MerchantRepository(storage); assert.deepEqual(corrupt.read(), { applications: [], drafts: [] }); assert.match(corrupt.warning, /could not be read/); assert.equal(map.get(STORAGE_KEY), '{broken');
});
test('margin is price minus production cost, with percentage based on selling price', () => { assert.deepEqual(calculateMargin(25, 12.5), { amount: 12.5, percentage: 50 }); assert.deepEqual(calculateMargin(10, 12.5), { amount: -2.5, percentage: -25 }); assert.deepEqual(calculateMargin(0, 12.5), { amount: -12.5, percentage: 0 }); });
test('commission and estimated profit update from price and handle negative and invalid values', () => {
  assert.deepEqual(calculateProfit(100, 40, 0.1), { currency: 'USD', sellingPrice: 100, manufacturingCost: 40, creatorCommissionRate: 0.1, creatorCommissionAmount: 10, merchantEstimatedProfit: 50, merchantEstimatedProfitMargin: 50, demoOverride: false });
  assert.equal(calculateProfit(10, 12.5, 0.1).merchantEstimatedProfit, -3.5);
  assert.equal(calculateProfit(0, 12.5, 0.1).merchantEstimatedProfitMargin, 0);
  assert.equal(calculateProfit(NaN, 12.5, 0.1).merchantEstimatedProfitMargin, 0);
  assert.equal(calculateProfit(19.99, 2, 0.12).creatorCommissionAmount, 2.4);
});
test('demo scenarios save separately from approved commission terms', async () => {
  const { service, storage } = fixture();
  const app = await service.applyToSell(merchant, 'branch-organizer-2');
  assert.equal(app.commissionTerms.commissionRate, 0.12);
  await service.updateApplicationStatus(merchant, app.id, 'approved');
  await assert.rejects(service.createProductDraft(merchant, { ...fields, applicationId: app.id, creatorCommissionRate: 0.2 }), /Demo Controls/);
  const draft = await service.createProductDraft(merchant, { ...fields, applicationId: app.id, demoOverride: true, manufacturingCost: 40, creatorCommissionRate: 0.2 });
  assert.equal(draft.pricing.creatorCommissionRate, 0.2);
  assert.equal(draft.pricing.creatorCommissionAmount, 6);
  assert.equal(draft.pricing.merchantEstimatedProfit, -16);
  assert.equal(draft.pricing.demoOverride, true);
  assert.equal(draft.commissionTerms.commissionRate, 0.12);
  const reloaded = createMerchantService(new MerchantRepository(storage));
  assert.equal((await reloaded.getProductDrafts(merchant))[0].pricing.merchantEstimatedProfit, -16);
  assert.equal((await reloaded.getMerchantApplications(merchant))[0].commissionTerms.commissionRate, 0.12);
});
test('version 1 demo data migrates applications and drafts without duplicating records', async () => {
  const { storage, map } = fixture();
  map.set(STORAGE_KEY, JSON.stringify({ version: 1, applications: [{ id: 'legacy-match', merchantId: merchant, branchId: branch, status: 'approved', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }], drafts: [{ id: 'legacy-draft', applicationId: 'legacy-match', merchantId: merchant, branchId: branch, ideaId: 'idea-organizer', creatorId: 'creator-maya', title: 'Legacy', description: 'Earlier draft', images: ['/products/organizer-minimal.svg'], sellingPrice: 30, estimatedManufacturingCost: 12.5, currency: 'USD', status: 'draft', shopifyProductId: 'mock_shopify_legacy', createdAt: '2026-01-01T00:00:00.000Z' }] }));
  const service = createMerchantService(new MerchantRepository(storage));
  assert.equal((await service.getMerchantApplications(merchant))[0].commissionTerms.commissionStatus, 'approved');
  assert.equal((await service.getProductDrafts(merchant))[0].pricing.merchantEstimatedProfit, 14.5);
  await assert.rejects(service.createProductDraft(merchant, { ...fields, applicationId: 'legacy-match' }), /already exists/);
  assert.equal((await service.getProductDrafts(merchant)).length, 1);
});
