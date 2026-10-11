// Headless check of the render-status media area: error state, running state (3 users), finished state with versions strip.
// Usage: node web/scripts/render-status-check.mjs <productWithFailedRun> <productToGenerate>
import { chromium } from 'playwright';
const [failedPid, genPid] = process.argv.slice(2);
const B = 'http://localhost:3456';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); const out = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  if (failedPid) {
    await p.goto(`${B}/app/i/api-${failedPid}`); await p.waitForSelector('.render-stage'); await sleep(2500);
    out.errorState = (await p.locator('.gen-error').allTextContents()).map(t => t.slice(0, 120));
    await p.screenshot({ path: 'docs/screenshots/render-1-error.png' });
  }
  await p.goto(`${B}/app/i/api-${genPid}`); await p.waitForSelector('.render-stage'); await sleep(1500);
  for (const [u, body] of [['u_alice', 'bright circus clowns, style toile, cotton_velvet 18x18'], ['u_bob', 'same clowns but pastel and calm, linen 20x20'], ['u_carol', 'clowns riding cats, cute, canvas 16x16']]) {
    await fetch(`${B}/products/${genPid}/generate`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-user-id': u }, body: JSON.stringify({ instruction: body }) });
  }
  await sleep(6000);
  out.running = { title: await p.locator('.gen-title').textContent().catch(() => null), runs: await p.locator('.gen-run').count(), stagesOn: await p.locator('.gen-stages li.on').allTextContents(), label: await p.locator('.render-label').textContent() };
  await p.screenshot({ path: 'docs/screenshots/render-2-running.png' });
  // wait until the strip shows 3 version thumbs (reloadApi after runs finish)
  await p.waitForFunction(() => document.querySelectorAll('.versions-thumb:not(.pending)').length >= 3, null, { timeout: 420000 });
  await sleep(1500);
  out.done = { label: await p.locator('.render-label').textContent(), title: await p.locator('.gen-title').textContent().catch(() => null), thumbs: await p.locator('.versions-thumb:not(.pending) span').allTextContents() };
  await p.screenshot({ path: 'docs/screenshots/render-3-versions.png' });
} catch (e) { out.error = e.message; await p.screenshot({ path: 'docs/screenshots/render-error.png' }).catch(() => {}); }
out.pageErrors = errs; console.log(JSON.stringify(out, null, 1)); await b.close();
