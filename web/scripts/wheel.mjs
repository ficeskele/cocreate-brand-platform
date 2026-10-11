// Verifica la rueda de la portada: render, scroll con rueda, arrastre y enlaces.
import { chromium } from 'playwright';
const B = process.env.BASE_URL ?? 'http://localhost:3456/app';
const b = await chromium.launch(); const out = [];
for (const w of [390, 834, 1440]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 700 ? 844 : 1000 } }); const p = await ctx.newPage();
  await p.addInitScript(() => sessionStorage.setItem('droplab-intro-seen', '1')); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + '/'); await p.waitForSelector('[role=listbox]'); await p.waitForTimeout(600);
  await p.screenshot({ path: `docs/screenshots/landing-ring-${w}.png` });
  const stage = p.locator('[role=listbox]'); await stage.scrollIntoViewIfNeeded(); await p.waitForTimeout(700); const box = await stage.boundingBox();
  const sel = () => p.evaluate(() => document.querySelector('[role=listbox]')?.getAttribute('aria-activedescendant'));
  const ow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 4; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(60); }
  await p.waitForTimeout(900); const afterWheel = await sel();
  await p.screenshot({ path: `docs/screenshots/landing-drum-${w}.png` });
  // arrastre vertical (pointer)
  await p.mouse.move(box.x + box.width / 2, box.y + box.height * 0.75); await p.mouse.down();
  for (let i = 0; i < 10; i++) { await p.mouse.move(box.x + box.width / 2, box.y + box.height * 0.75 - i * 45); }
  await p.mouse.up(); await p.waitForTimeout(900); const afterDrag = await sel();
  await p.screenshot({ path: `docs/screenshots/landing-drag-${w}.png` });
  const href = await p.locator('[role=option]').first().getAttribute('href');
  const n = await p.locator('[role=option]').count();
  out.push({ w, cards: n, overflowX: ow, afterWheel, afterDrag, firstHref: href, errors: errs });
  await ctx.close();
}
// enlace abre el detalle
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await ctx.newPage();
await p.goto(B + '/'); await p.waitForSelector('[role=option]'); const h = await p.locator('[role=option]').first().getAttribute('href');
await p.goto('http://localhost:3456' + h); await p.waitForSelector('.detail-title'); out.push({ linkOpens: await p.locator('.detail-title').textContent() });
await b.close(); console.log(JSON.stringify(out, null, 1));
