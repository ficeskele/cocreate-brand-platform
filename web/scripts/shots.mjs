import { chromium } from 'playwright';
const B = process.env.BASE_URL ?? 'http://localhost:3456/app';
const widths = { mobile: 390, tablet: 834, desktop: 1440 };
const only = process.argv[2];
const pages = [
  ['landing', '/', async p => { for (let y = 0; y < 6000; y += 300) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(120); } await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400); }], ['feed', '/explore'], ['detail', '/i/bike-bag'], ['detail-version', '/i/bike-bag/v/bottle-pocket'],
  ['signup', '/i/bike-bag', async p => { await p.getByRole('button', { name: 'Create version' }).click(); await p.waitForSelector('.modal'); }],
  ['search', '/search', async p => { await p.fill('input', 'bike bag'); }],
  ['search-empty', '/search', async p => { await p.fill('input', 'folding umbrella'); }],
  ['comments-pins', '/i/bike-bag/v/bottle-pocket?pin=1'],
  ['interest', '/i/bike-bag/v/bottle-pocket?tab=interest'],
  ['versions', '/i/bike-bag?tab=versions'],
  ['earnings', '/earnings'], ['notifications', '/notifications'], ['profile', '/profile'],
  ['feed-loading', '/state/loading'], ['feed-error', '/state/error'],
];
const browser = await chromium.launch();
const issues = [];
async function signin(p) { await p.goto(B + '/profile'); await p.getByRole('button', { name: 'Create account' }).first().click(); await p.fill('input[autocomplete=nickname]', 'Sam'); await p.fill('input[type=email]', 'sam@demo.app'); await p.fill('input[type=password]', 'demodemo'); await p.getByRole('button', { name: /Create account and continue/ }).click(); }
for (const [wn, w] of Object.entries(widths)) {
  if (only && only !== wn) continue;
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : 1000 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); await p.addInitScript(() => sessionStorage.setItem('droplab-intro-seen', '1'));
  for (const [name, url, act] of pages) {
    await p.goto(B + url); await p.waitForLoadState('networkidle'); if (act) await act(p); await p.waitForTimeout(250);
    const o = await p.evaluate(() => { const over = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && !e.closest('.table-wrap,.text-tabs,.tabs'); }).slice(0, 3).map(e => e.className || e.tagName); return { sw: document.documentElement.scrollWidth, iw: innerWidth, over }; });
    if (o.sw > o.iw || o.over.length) issues.push({ wn, name, ...o });
    await p.screenshot({ path: `shots/${name}-${w}.png`, fullPage: true });
  }
  // flows that need an account
  await signin(p);
  const flow = [
    ['create-version-step1', '/create-version/bike-bag'], ['contributions', '/contributions'],
  ];
  for (const [name, url] of flow) { await p.goto(B + url); await p.waitForTimeout(250); await p.screenshot({ path: `shots/${name}-${w}.png`, fullPage: true }); }
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(issues, null, 1));
