// End-to-end through the React UI against the real backend:
// open a Backend idea -> ask for a version in the Generate box -> wait for the agent (arcade.ai, ~1-2 min) ->
// Versions: View changes + Merge proposal (as bob) -> Stores: Create release + Open store.
// Usage: node web/scripts/e2e.mjs   (server on :3456, AGENT_MOCK_DESIGN=1 is fine)
import { chromium } from 'playwright';
const B = process.env.BASE_URL ?? 'http://localhost:3456/app';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const out = {};
try {
  await p.goto(B + '/explore'); await p.waitForSelector('.card .demo.live');
  // original (non-derived) backend idea
  await p.locator('.card:has(.demo.live):not(:has(.card-derived)) .card-title a').first().click();
  await p.waitForSelector('.threads'); out.idea = await p.locator('h1.detail-title').textContent();
  const before = await p.locator('.threads .thread').count();
  if (process.env.SKIP_AGENT) { out.agentFinal = 'skipped (SKIP_AGENT=1)'; } else {
  // 1. post a mention
  await p.fill('#api-generate', 'e2e test: add plum blossoms, use 20x20 linen');
  await p.getByRole('button', { name: 'Generate a version' }).click();
  await p.waitForFunction(n => document.querySelectorAll('.threads .thread').length > n, before, { timeout: 15000 });
  await p.waitForSelector('.assist', { timeout: 10000 }); out.agentStarted = await p.locator('.assist').textContent();

  // 2. wait for the agent to finish (polls every 2s in the UI)
  await p.waitForFunction(() => !/running/.test(document.querySelector('.assist')?.textContent ?? ''), null, { timeout: 300000 });
  out.agentFinal = await p.locator('.assist').textContent();
  await p.screenshot({ path: 'docs/screenshots/e2e-1-agent-done.png', fullPage: true });
  }

  // 3. Versions tab: proposal, diff, merge as bob
  await p.goto(p.url().split('?')[0] + '?tab=versions'); await p.waitForSelector('.panel:has-text("Open proposals")');
  const props = p.locator('.panel', { has: p.locator('h3', { hasText: 'Open proposals' }) });
  await props.locator('.stack').first().waitFor({ timeout: 15000 });
  out.openProposals = await props.locator('.stack').count();
  await p.getByRole('button', { name: 'View changes' }).first().click();
  await props.locator('ul li').first().waitFor(); out.diffRows = await props.locator('ul li').count();
  await p.screenshot({ path: 'docs/screenshots/e2e-2-proposal-diff.png', fullPage: true });
  // switch backend user to bob via Profile, then come back and merge
  const detailUrl = p.url();
  await p.goto(B + '/profile'); await p.getByRole('radio', { name: 'bob' }).click();
  await p.goto(detailUrl); await p.locator('.panel', { has: p.locator('h3', { hasText: 'Open proposals' }) }).locator('.stack').first().waitFor();
  await p.getByRole('button', { name: 'Merge proposal' }).first().click();
  await p.waitForSelector('.toast'); out.mergeToast = await p.locator('.toast').textContent();
  await p.waitForTimeout(2500);
  out.coauthors = await p.locator('.panel', { has: p.locator('h3', { hasText: 'Co-authors' }) }).locator('li').allTextContents();
  await p.screenshot({ path: 'docs/screenshots/e2e-3-merged.png', fullPage: true });

  // 4. Stores: release + open store
  await p.goto(detailUrl.replace(/\?.*$/, '') + '?tab=stores'); await p.locator('.panel', { has: p.locator('h3', { hasText: 'Release' }) }).waitFor();
  await p.getByRole('button', { name: 'Create release' }).click();
  await p.waitForSelector('text=/Release v\\d+ created/'); out.release = await p.locator('text=/Release v\\d+ created/').textContent();
  await p.getByRole('button', { name: 'Open store' }).click();
  await p.waitForSelector('a:has-text("Open checkout")', { timeout: 60000 }); out.checkout = await p.locator('a:has-text("Open checkout")').getAttribute('href');
  await p.screenshot({ path: 'docs/screenshots/e2e-4-store.png', fullPage: true });
} catch (e) { out.error = String(e.message); await p.screenshot({ path: 'docs/screenshots/e2e-error.png', fullPage: true }).catch(() => {}); }
out.pageErrors = errs;
console.log(JSON.stringify(out, null, 1));
await b.close();
process.exit(out.error || errs.length || !out.checkout ? 1 : 0);
