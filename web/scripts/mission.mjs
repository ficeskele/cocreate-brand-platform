// Viewport shots of the landing mid-scroll (scroll-revealed mission copy, CTA buttons).
import { chromium } from 'playwright';
const B = process.env.BASE_URL ?? 'http://localhost:3456/app'; const b = await chromium.launch();
for (const w of [390, 834, 1440]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 700 ? 844 : 1000 } }); const p = await ctx.newPage();
  await p.addInitScript(() => sessionStorage.setItem('droplab-intro-skip', '1'));
  await p.goto(B + '/'); await p.waitForSelector('#mission'); await p.waitForTimeout(800);
  await p.screenshot({ path: `docs/screenshots/landing-hero-${w}.png` });
  await p.locator('#mission').evaluate(e => e.scrollIntoView({ block: 'center' }));
  await p.mouse.wheel(0, 200); await p.waitForTimeout(900);
  await p.screenshot({ path: `docs/screenshots/landing-mission-${w}.png` });
  await p.locator('.ml-cta').evaluate(e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(900);
  await p.screenshot({ path: `docs/screenshots/landing-cta-${w}.png` });
  await ctx.close();
}
await b.close(); console.log('ok');
