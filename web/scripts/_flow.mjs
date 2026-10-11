import { chromium } from 'playwright';
const base = process.argv[2]; const tag = process.argv[3];
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = []; p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(`HTTP ${r.status()} ${r.url().slice(0, 120)}`); });
const out = { base };
try {
  await p.goto(base + '/app/'); await p.waitForTimeout(2500);
  out.landing = { title: await p.title(), links: await p.$$eval('a', as => as.map(a => a.getAttribute('href')).filter(h => h && h.startsWith('/app')).slice(0, 12)) };
  await p.screenshot({ path: `docs/screenshots/flow-${tag}-1-landing.png` });
  await p.goto(base + '/app/explore'); await p.waitForTimeout(3500);
  out.explore = { backendNote: await p.locator('.page-head .tiny').textContent().catch(() => null), cards: await p.locator('.card').count(), backendCards: await p.locator('.card .demo.live').count() };
  await p.screenshot({ path: `docs/screenshots/flow-${tag}-2-explore.png` });
  const card = p.locator('.card:has(.demo.live) .card-title a').first();
  if (await card.count()) { await card.click(); await p.waitForTimeout(2500); } else { out.noBackendCard = true; await p.locator('.card .card-title a').first().click(); await p.waitForTimeout(2500); }
  out.detail = { url: p.url(), tabs: await p.locator('.tabs button').allTextContents(), hasComposer: await p.locator('#api-composer').count(), hasGenerate: await p.locator('#api-generate').count(), renderStage: await p.locator('.render-stage').count() };
  await p.screenshot({ path: `docs/screenshots/flow-${tag}-3-detail.png`, fullPage: true });
} catch (e) { out.error = e.message; }
out.errs = errs.slice(0, 8); console.log(JSON.stringify(out, null, 1)); await b.close();
