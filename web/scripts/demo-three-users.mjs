// Visible demo: three users improve the same idea; each request becomes its own branch (version)
// with its own arcade.ai render. Nothing replaces the original. The original + its versions is the brand space.
// Usage: node web/scripts/demo-three-users.mjs [productId]   (server on :3456; without an id the first Backend idea is used)
import { chromium } from 'playwright';
const B = process.env.BASE_URL ?? 'http://localhost:3456/app';
const API = B.replace(/\/app$/, '');
const REQUESTS = [
  ['u_alice', '@agent:concept bright circus clowns, style toile, cotton_velvet 18x18'],
  ['u_bob', '@agent:concept same clowns but pastel and calm, linen 20x20'],
  ['u_carol', '@agent:concept clowns riding cats, cute, canvas 16x16'],
];
const b = await chromium.launch({ channel: 'chrome', headless: false, slowMo: 250, args: ['--window-size=1440,1000', '--window-position=40,40'] });
const ctx = await b.newContext({ viewport: null }); const p = await ctx.newPage();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const say = async (t) => { await p.evaluate(t => { let d = document.getElementById('__demo'); if (!d) { d = document.createElement('div'); d.id = '__demo'; d.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:99999;background:#111;color:#fff;padding:12px 16px;border-radius:10px;font:600 16px system-ui;max-width:70vw;box-shadow:0 8px 24px rgba(0,0,0,.3)'; document.body.appendChild(d); } d.textContent = t; }, t).catch(() => {}); console.log('>', t); };
const headers = (u) => ({ 'content-type': 'application/json', 'x-user-id': u });

try {
  let productId = process.argv[2];
  if (!productId) { const brands = await (await fetch(`${API}/brands`)).json(); productId = brands[0]?.products[0]?.id; }
  if (!productId) throw new Error('no backend product; run the one-sentence demo first');
  await p.goto(`${B}/i/api-${productId}`); await p.waitForSelector('.detail-media');
  await say('One idea. Three people. Each sends their own @agent:concept request; each becomes a branch.'); await sleep(4000);

  for (const [u, body] of REQUESTS) {
    await say(`${u.slice(2)} asks: "${body.replace('@agent:concept ', '')}"`);
    await fetch(`${API}/products/${productId}/messages`, { method: 'POST', headers: headers(u), body: JSON.stringify({ body }) });
    await sleep(2500);
  }
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await say('Three runs in flight. The render area shows each person\'s progress live. The original is untouched.');

  // wait for all three runs on the backend
  for (let i = 0; i < 180; i++) {
    const msgs = await (await fetch(`${API}/products/${productId}/messages`)).json();
    const ids = msgs.filter(m => m.agent_run_id && m.author_type === 'user').slice(-3).map(m => m.agent_run_id);
    const runs = await Promise.all(ids.map(async id => (await fetch(`${API}/agent-runs/${id}`)).json()));
    if (runs.length === 3 && runs.every(r => r.status !== 'running')) { console.log('runs:', runs.map(r => r.status).join(',')); break; }
    await sleep(3000);
  }
  await sleep(4000);
  await say('All three versions have renders now. Thumbnails under the original; each is its own branch.'); await sleep(5000);
  await p.goto(`${B}/i/api-${productId}?tab=versions`); await p.waitForSelector('.tree');
  await say('Versions tab: the tree is the brand space. Nothing was merged; people can keep discussing and branching.'); await sleep(6000);
  const link = await p.locator('.tree a.tree-node').nth(1).getAttribute('href');
  if (link) { await p.goto(`${B}${link}`); await p.waitForSelector('.detail-media'); await say('A version page: its own render, its own votes, same shared conversation. Window stays open 3 minutes.'); }
  await sleep(180000);
} catch (e) { await say('Demo error: ' + e.message); console.error(e); await sleep(20000); }
await b.close();
