// Visible, slow click-through of the /app demo in a real Chrome window on this machine.
// Usage: node web/scripts/demo-headed.mjs <productId>   (server on :3456, product already seeded)
import { chromium } from 'playwright';
const [productId] = process.argv.slice(2);
const B = process.env.BASE_URL ?? 'http://localhost:3456/app';
const b = await chromium.launch({ channel: 'chrome', headless: false, slowMo: 350, args: ['--window-size=1440,1000', '--window-position=40,40'] });
const ctx = await b.newContext({ viewport: null }); const p = await ctx.newPage();
const sleep = ms => new Promise(r => setTimeout(r, ms));
// On-screen caption so the viewer knows what step is running
const say = async (t) => { await p.evaluate(t => { let d = document.getElementById('__demo'); if (!d) { d = document.createElement('div'); d.id = '__demo'; d.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:99999;background:#111;color:#fff;padding:12px 16px;border-radius:10px;font:600 16px system-ui;max-width:70vw;box-shadow:0 8px 24px rgba(0,0,0,.3)'; document.body.appendChild(d); } d.textContent = t; }, t).catch(() => {}); console.log('>', t); };
const props = () => p.locator('.panel', { has: p.locator('h3', { hasText: 'Open proposals' }) });
const API = B.replace(/\/app$/, '');
// Wait on the backend, not on the DOM: the latest agent run for this product must leave `running`.
async function waitAgent() {
  for (let i = 0; i < 150; i++) {
    const msgs = await (await fetch(`${API}/products/${productId}/messages`)).json();
    const runId = msgs.filter(m => m.agent_run_id && m.author_type === 'user').at(-1)?.agent_run_id;
    if (runId) { const r = await (await fetch(`${API}/agent-runs/${runId}`)).json(); if (r.status !== 'running') return r; }
    await sleep(2000);
  }
  throw new Error('agent still running after 5 minutes');
}

try {
  await p.goto(B + '/'); await p.waitForSelector('.card .demo.live');
  await say('Step 2 · Explore: Demo cards plus one Backend card (Clown Pillow, grey placeholder)'); await sleep(4000);

  await p.locator('.card:has(.demo.live):not(:has(.card-derived)) .card-title a').first().click();
  await p.waitForSelector('.threads');
  if (process.env.SKIP_AGENT) { await say('Step 3 already done earlier: the agent reply is in the thread. Continuing with Versions.'); await sleep(4000); } else {
  await say('Step 3 · Conversation tab. Ask the agent with @agent:concept'); await sleep(2500);
  await p.locator('#api-composer').click();
  await p.locator('#api-composer').pressSequentially('@agent:concept bright clown pattern, 20x20 linen', { delay: 40 });
  await sleep(800); await p.getByRole('button', { name: 'Post' }).click();
  await p.waitForSelector('.assist', { timeout: 15000 });
  await say('Agent is running: designing → arcade.ai generating the pattern → building the product (1 to 2 minutes). Main image stays grey until merge.');
  const run = await waitAgent();
  if (run.status !== 'succeeded') throw new Error('agent failed: ' + run.error);
  await sleep(3000);
  await say('Agent done. Its reply is in the thread. Now the Versions tab.'); await sleep(4000);
  }

  await p.goto(p.url().split('?')[0] + '?tab=versions');
  await props().locator('.stack').first().waitFor({ timeout: 15000 });
  await say('Step 4 · Versions: version tree + the open Proposal. Click "View changes".'); await sleep(2500);
  await p.getByRole('button', { name: 'View changes' }).first().click(); await props().locator('ul li').first().waitFor();
  await say('These are the changed fields. Now switch the backend user to bob in Profile.'); await sleep(4000);
  const detailUrl = p.url();
  await p.goto(B + '/profile'); await sleep(1500); await p.getByRole('radio', { name: 'bob' }).click();
  await say('bob is now the X-User-Id. Back to the idea and merge.'); await sleep(2500);
  await p.goto(detailUrl); await props().locator('.stack').first().waitFor();
  await p.getByRole('button', { name: 'Merge proposal' }).first().click();
  await p.waitForSelector('.toast'); await sleep(3000);
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await say('Merged: the main image is now the arcade.ai render. Scroll down: Co-authors = alice, bob, agent (on behalf of alice).'); await sleep(4000);
  await p.evaluate(() => document.querySelector('.panel h3')?.scrollIntoView({ behavior: 'smooth', block: 'center' })); await sleep(3500);

  await p.goto(detailUrl.replace(/\?.*$/, '') + '?tab=stores');
  await p.locator('.panel', { has: p.locator('h3', { hasText: 'Release' }) }).waitFor();
  await say('Step 5 · Stores: create a release, then open the arcade.ai store.'); await sleep(2500);
  await p.getByRole('button', { name: 'Create release' }).click(); await p.waitForSelector('text=/Release v\\d+ created/'); await sleep(2000);
  await p.getByRole('button', { name: 'Open store' }).click();
  await p.waitForSelector('a:has-text("Open checkout")', { timeout: 60000 });
  const href = await p.locator('a:has-text("Open checkout")').getAttribute('href');
  await say('Done. "Open checkout" links to a real arcade.ai checkout: ' + href + '  (do not pay). Window stays open 3 minutes.');
  await sleep(180000);
} catch (e) { await say('Demo error: ' + e.message); console.error(e); await sleep(20000); }
await b.close();
