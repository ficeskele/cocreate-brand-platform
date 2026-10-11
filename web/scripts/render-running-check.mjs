// Headless: trigger one run on an idea WITHOUT a render and capture the animated running state.
import { chromium } from 'playwright';
const [pid] = process.argv.slice(2); const B = 'http://localhost:3456';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); const sleep = ms => new Promise(r => setTimeout(r, ms));
await p.goto(`${B}/app/i/api-${pid}`); await p.waitForSelector('.render-stage'); await sleep(1000);
await fetch(`${B}/products/${pid}/generate`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-user-id': 'u_bob' }, body: JSON.stringify({ instruction: 'pastel clowns, linen 20x20' }) });
await sleep(6000);
console.log(JSON.stringify({ title: await p.locator('.gen-title').first().textContent().catch(() => null), runs: await p.locator('.gen-run').count(), on: await p.locator('.gen-stages li.on').allTextContents(), label: await p.locator('.render-label').textContent(), errs }));
await p.screenshot({ path: 'docs/screenshots/render-2-running.png' }); await b.close();
