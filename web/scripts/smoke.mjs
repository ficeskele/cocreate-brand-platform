// Smoke test: /app carga, se ven productos del backend y la conversación real.
import { chromium } from 'playwright';
const B = process.env.BASE_URL ?? 'http://localhost:3456/app';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(B + '/explorar'); await p.waitForSelector('.card');
await p.waitForSelector('.demo.live', { timeout: 5000 });
const live = await p.locator('.card .demo.live').count();
await p.screenshot({ path: 'docs/screenshots/app-feed-backend-1440.png' });
await p.locator('.card:has(.demo.live) .card-title a').first().click();
await p.waitForSelector('.threads'); const msgs = await p.locator('.threads .thread').count();
await p.screenshot({ path: 'docs/screenshots/app-detalle-backend-1440.png', fullPage: true });
console.log(JSON.stringify({ ok: live > 0 && msgs > 0 && !errs.length, liveCards: live, apiMessages: msgs, errors: errs }));
await b.close(); process.exit(live > 0 && msgs > 0 && !errs.length ? 0 : 1);
