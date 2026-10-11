import { branches, ideas } from '../data/catalog.ts';
import type { ApplicationStatus, CreateDraftInput, MatchApplication, ProductDraft } from '../types';
import { calculateProfit } from './pricing.ts';
import { MerchantRepository } from './storage.ts';
export interface ShopifyDraftGateway {
  createDraft(product: Omit<ProductDraft, 'shopifyProductId'>): Promise<{ shopifyProductId: string }>;
}
export const mockShopifyGateway: ShopifyDraftGateway = {
  async createDraft(product) { return { shopifyProductId: `mock_shopify_${product.id.replace('draft-', '')}` }; },
};
export function calculateMargin(price: number, cost: number) {
  return { amount: price - cost, percentage: price > 0 ? ((price - cost) / price) * 100 : 0 };
}
export function createMerchantService(repository: MerchantRepository, gateway = mockShopifyGateway) {
  const inFlight = new Set<string>();
  const getApplication = (merchantId: string, id: string) => {
    const app = repository.read().applications.find(a => a.id === id && a.merchantId === merchantId);
    if (!app) throw new Error('Application not found for this merchant.');
    return app;
  };
  return {
    getIdeas: async () => structuredClone(ideas),
    getIdeaById: async (id: string) => structuredClone(ideas.find(i => i.id === id)),
    getBranchesByIdeaId: async (id: string) => structuredClone(branches.filter(b => b.ideaId === id)),
    getBranchById: async (id: string) => structuredClone(branches.find(b => b.id === id)),
    getMerchantApplications: async (merchantId: string) => repository.read().applications.filter(a => a.merchantId === merchantId),
    getProductDrafts: async (merchantId: string) => repository.read().drafts.filter(d => d.merchantId === merchantId),
    getStorageWarning: () => repository.warning,
    async applyToSell(merchantId: string, branchId: string): Promise<MatchApplication> {
      if (!merchantId.trim()) throw new Error('A merchant is required.');
      const branch = branches.find(b => b.id === branchId);
      if (!branch || branch.status !== 'available') throw new Error('This branch is not available for applications.');
      const data = repository.read();
      if (data.applications.some(a => a.merchantId === merchantId && a.branchId === branchId && a.status !== 'rejected')) throw new Error('You already have an active application for this branch.');
      const now = new Date().toISOString();
      const application: MatchApplication = {
        id: `application-${crypto.randomUUID()}`, merchantId, branchId, status: 'pending',
        commissionTerms: { commissionRate: branch.proposedCommissionRate, commissionRecipientId: branch.creatorId, commissionStatus: 'proposed' },
        createdAt: now, updatedAt: now,
      };
      repository.write({ ...data, applications: [application, ...data.applications] });
      return application;
    },
    async updateApplicationStatus(merchantId: string, id: string, status: Exclude<ApplicationStatus, 'pending'>) {
      const app = getApplication(merchantId, id);
      if (status !== 'approved' && status !== 'rejected') throw new Error('Invalid application status.');
      if (app.status !== 'pending') throw new Error('Only pending applications can be reviewed.');
      const data = repository.read();
      repository.write({ ...data, applications: data.applications.map(a => a.id === id ? {
        ...a, status, updatedAt: new Date().toISOString(),
        commissionTerms: { ...a.commissionTerms, commissionStatus: status === 'approved' ? 'approved' as const : 'proposed' as const },
      } : a) });
    },
    async createProductDraft(merchantId: string, input: CreateDraftInput): Promise<ProductDraft> {
      const app = getApplication(merchantId, input.applicationId);
      if (app.status !== 'approved') throw new Error('Creator approval is required before creating a product draft.');
      if (inFlight.has(app.id)) throw new Error('This draft is already being created.');
      const data = repository.read();
      if (data.drafts.some(d => d.applicationId === app.id)) throw new Error('A product draft already exists for this application.');
      const branch = branches.find(b => b.id === app.branchId);
      if (!branch) throw new Error('The approved branch was not found.');
      if (!input.title.trim() || input.title.trim().length > 200) throw new Error('Enter a product title between 1 and 200 characters.');
      if (!input.description.trim() || input.description.trim().length > 5000) throw new Error('Enter a description between 1 and 5,000 characters.');
      if (!Number.isFinite(input.sellingPrice) || input.sellingPrice <= 0 || input.sellingPrice > 1000000) throw new Error('Enter a selling price greater than $0 and no more than $1,000,000.');
      if (!branch.images.length) throw new Error('At least one product image is required.');
      const approvedRate = app.commissionTerms.commissionRate;
      const manufacturingCost = input.demoOverride ? input.manufacturingCost : branch.estimatedManufacturingCost;
      const commissionRate = input.demoOverride ? input.creatorCommissionRate : approvedRate;
      if (manufacturingCost === undefined || !Number.isFinite(manufacturingCost) || manufacturingCost < 0 || manufacturingCost > 1000000) throw new Error('Enter an estimated manufacturing cost from $0 to $1,000,000.');
      if (commissionRate === undefined || !Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 1) throw new Error('Enter a creator commission rate from 0% to 100%.');
      if (!input.demoOverride && ((input.manufacturingCost !== undefined && input.manufacturingCost !== manufacturingCost) || (input.creatorCommissionRate !== undefined && input.creatorCommissionRate !== approvedRate))) throw new Error('Enable Demo Controls to adjust the approved cost or commission rate.');
      const pricing = calculateProfit(input.sellingPrice, manufacturingCost, commissionRate,
        Boolean(input.demoOverride && (manufacturingCost !== branch.estimatedManufacturingCost || commissionRate !== approvedRate)));
      if (pricing.sellingPrice <= 0) throw new Error('Selling price must be at least $0.01.');
      const draft = { id: `draft-${crypto.randomUUID()}`, applicationId: app.id, merchantId, branchId: branch.id, ideaId: branch.ideaId, creatorId: branch.creatorId,
        title: input.title.trim(), description: input.description.trim(), images: [...branch.images],
        commissionTerms: { ...app.commissionTerms }, pricing, status: 'draft' as const, createdAt: new Date().toISOString() };
      inFlight.add(app.id);
      try {
        const result = { ...draft, ...await gateway.createDraft(draft) };
        const latest = repository.read();
        if (getApplication(merchantId, app.id).status !== 'approved') throw new Error('Approval is no longer available.');
        repository.write({ ...latest, drafts: [result, ...latest.drafts] });
        return result;
      } finally { inFlight.delete(app.id); }
    },
  };
}
export type MerchantService = ReturnType<typeof createMerchantService>;
