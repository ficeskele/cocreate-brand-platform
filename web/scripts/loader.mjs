import { chromium } from 'playwright';
const B = process.env.BASE_URL ?? 'http://localhost:3456/app'; const b = await chromium.launch(); const out = [];
for (const w of [390, 1440]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 } }); const p = await ctx.newPage();
  const t0 = Date.now(); await p.goto(B + '/'); await p.waitForSelector('[role=status] canvas'); await p.waitForTimeout(700);
  await p.screenshot({ path: `docs/screenshots/loader-${w}.png` });
  await p.waitForSelector('[role=status]', { state: 'detached', timeout: 4000 }); const gone = Date.now() - t0;
  await p.reload(); const again = await p.locator('[role=status]').count();
  out.push({ w, goneAfterMs: gone, shownOnReload: again });
  await ctx.close();
}
const ctx = await b.newContext({ reducedMotion: 'reduce' }); const p = await ctx.newPage(); const t0 = Date.now();
await p.goto(B + '/'); await p.waitForSelector('[role=status]'); await p.waitForSelector('[role=status]', { state: 'detached' }); out.push({ reducedGoneMs: Date.now() - t0 });
const c2 = await b.newContext(); const q = await c2.newPage(); await q.goto(B + '/'); await q.waitForSelector('[role=status]'); await q.waitForTimeout(300); await q.mouse.click(100, 100); const t1 = Date.now();
await q.waitForSelector('[role=status]', { state: 'detached' }); out.push({ clickSkipMs: Date.now() - t1 });
await b.close(); console.log(JSON.stringify(out));
