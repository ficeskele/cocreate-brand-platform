import { chromium } from 'playwright';
const B = process.env.BASE_URL ?? 'http://localhost:3456/app';
const widths = { mobile: 390, tablet: 834, desktop: 1440 };
const only = process.argv[2];
const pages = [
  ['landing', '/'], ['feed', '/explore'], ['detalle', '/i/bolso-bici'], ['detalle-version', '/i/bolso-bici/v/bolso-bici-botella'],
  ['registro', '/i/bolso-bici', async p => { await p.getByRole('button', { name: 'Crear versión' }).click(); await p.waitForSelector('.modal'); }],
  ['buscar', '/buscar', async p => { await p.fill('input', 'bolso bici'); }],
  ['buscar-vacio', '/buscar', async p => { await p.fill('input', 'paraguas plegable'); }],
  ['comentarios-pins', '/i/bolso-bici/v/bolso-bici-botella?pin=1'],
  ['interes', '/i/bolso-bici/v/bolso-bici-botella?tab=interes'],
  ['versiones', '/i/bolso-bici?tab=versiones'],
  ['ganancias', '/ganancias'], ['notificaciones', '/notificaciones'], ['perfil', '/perfil'],
  ['feed-cargando', '/estado/cargando'], ['feed-error', '/estado/error'],
];
const browser = await chromium.launch();
const issues = [];
async function signin(p) { await p.goto(B + '/perfil'); await p.getByRole('button', { name: 'Crear cuenta' }).first().click(); await p.fill('input[autocomplete=nickname]', 'Sergio'); await p.fill('input[type=email]', 'sergio@demo.app'); await p.fill('input[type=password]', 'demodemo'); await p.getByRole('button', { name: /Crear cuenta y continuar/ }).click(); }
for (const [wn, w] of Object.entries(widths)) {
  if (only && only !== wn) continue;
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : 1000 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  for (const [name, url, act] of pages) {
    await p.goto(B + url); await p.waitForLoadState('networkidle'); if (act) await act(p); await p.waitForTimeout(250);
    const o = await p.evaluate(() => { const over = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && !e.closest('.table-wrap,.text-tabs,.tabs'); }).slice(0, 3).map(e => e.className || e.tagName); return { sw: document.documentElement.scrollWidth, iw: innerWidth, over }; });
    if (o.sw > o.iw || o.over.length) issues.push({ wn, name, ...o });
    await p.screenshot({ path: `shots/${name}-${w}.png`, fullPage: true });
  }
  // flujos con cuenta
  await signin(p);
  const flow = [
    ['crear-version-paso1', '/crear-version/bolso-bici'], ['aportes', '/aportes'],
  ];
  for (const [name, url] of flow) { await p.goto(B + url); await p.waitForTimeout(250); await p.screenshot({ path: `shots/${name}-${w}.png`, fullPage: true }); }
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(issues, null, 1));
