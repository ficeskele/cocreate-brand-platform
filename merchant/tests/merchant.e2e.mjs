// Reuses the repository's Chrome DevTools Protocol approach; no browser test package.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const chromePath = process.env.CHROME_PATH || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(existsSync);
if (!chromePath) throw new Error('Install Google Chrome or set CHROME_PATH to your Chrome/Chromium executable.');
const origin = 'http://127.0.0.1:5178';
const profile = mkdtempSync(join(tmpdir(), 'mup-browser-test-'));
mkdirSync(join(root, 'test-results'), { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5178', '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '';
server.stdout.on('data', d => { serverLog += d; });
server.stderr.on('data', d => { serverLog += d; });
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9338', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let chromeLog = '';
chrome.stderr.on('data', d => { chromeLog += d; });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
let testPassed = false;
try {
  let targets;
  for (let i = 0; i < 120; i++) {
    try {
      const ready = await fetch(origin);
      targets = await (await fetch('http://127.0.0.1:9338/json')).json();
      if (ready.ok && targets.some(t => t.type === 'page')) break;
    } catch { /* Wait for owned browser and server. */ }
    if (server.exitCode !== null || chrome.exitCode !== null) throw new Error(`Preview could not start.\n${serverLog}\n${chromeLog}`);
    await sleep(100);
  }
  const target = targets?.find(t => t.type === 'page');
  assert.ok(target, `Chrome did not become ready.\n${chromeLog}`);
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let sequence = 0;
  const requests = new Map();
  const browserErrors = [];
  let pageLoadCount = 0;
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Page.loadEventFired') pageLoadCount++;
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.id) {
      const request = requests.get(message.id);
      if (request) { clearTimeout(request.timer); requests.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); }
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { requests.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    requests.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result?.value;
  };
  const waitFor = async (expression, label = expression) => {
    for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await sleep(75); }
    throw new Error(`Timed out: ${label}\nPage: ${await evaluate('document.body.innerText')}`);
  };
  const go = async path => { await send('Page.navigate', { url: origin + path }); await waitFor('!!document.querySelector("main")'); };
  const reload = async () => { const before = pageLoadCount; await send('Page.reload'); for (let i = 0; i < 120 && pageLoadCount === before; i++) await sleep(75); if (pageLoadCount === before) throw new Error('Timed out waiting for page reload'); };
  const click = async (selector, text) => {
    const expression = `Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(el => ${text === undefined ? 'true' : `el.textContent.trim() === ${JSON.stringify(text)}`})`;
    await waitFor(`!!(${expression})`, `Find ${selector}: ${text || ''}`);
    await evaluate(`(${expression}).click()`);
    await sleep(50);
  };
  const fill = async (selector, value) => {
    await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await sleep(50);
  };
  const select = async (selector, value) => { await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change', { bubbles: true })); })()`); await sleep(50); };
  const screenshot = async name => { const { cssContentSize } = await send('Page.getLayoutMetrics'); const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 } }); writeFileSync(join(root, 'test-results', name), Buffer.from(result.data, 'base64')); };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await go('/'); await waitFor('document.querySelectorAll(".idea-card").length === 6');
  await waitFor('Array.from(document.images).every(i => i.complete && i.naturalWidth > 0)');
  await screenshot('discover-desktop.png');
  await fill('input[aria-label="Search ideas"]', 'canvas'); await waitFor('document.querySelectorAll(".idea-card").length === 1');
  assert.match(await evaluate('document.querySelector(".idea-card").innerText'), /Custom Canvas Tote/);
  await click('button[aria-label="Clear search"]'); await click('.category-chip', 'Workspace'); await waitFor('document.querySelectorAll(".idea-card").length === 2');
  await click('.category-chip', 'All ideas6');
  await select('select[aria-label="Sort ideas"]', 'recent'); await waitFor('document.querySelector(".idea-card h2").textContent === "Personalized Pet Tag"');
  await select('select[aria-label="Sort ideas"]', 'popular'); await waitFor('document.querySelector(".idea-card h2").textContent === "Modular Desk Organizer"');
  await click('.idea-card .card-footer a'); await waitFor('document.querySelectorAll(".branch-card").length === 3');
  await click('.branch-card:nth-child(2)'); await waitFor('document.querySelector(".detail-info h2").textContent === "Clay Edition"');
  assert.match(await evaluate('document.querySelector(".cost-block").innerText'), /14\.00/);
  await click('a', 'Explore this branch'); await waitFor('document.querySelector("h1").textContent === "Clay Edition"');
  await click('button[aria-label="Show detail view"]'); await waitFor('document.querySelector(".gallery-main img").src.endsWith("-detail.svg")');
  await click('button', 'Apply to Sell'); await waitFor('!!document.querySelector("dialog[open]")');
  assert.match(await evaluate('document.querySelector("dialog").innerText'), /Proposed creator commission[\s\S]*12% of selling price/);
  assert.match(await evaluate('document.querySelector("dialog").innerText'), /subject to creator approval/);
  await click('button', 'Cancel'); await waitFor('!document.querySelector("dialog")');
  await click('button', 'Apply to Sell'); await click('button', 'Confirm application'); await waitFor('!!document.querySelector(".notice.success[role=status]")');
  assert.match(await evaluate('document.querySelector(".notice.success").innerText'), /Application submitted/);
  await click('a', 'View application'); await waitFor('document.querySelectorAll(".application-card").length === 1');
  assert.match(await evaluate('document.querySelector(".application-card").innerText'), /Pending/);
  const app = await evaluate('JSON.parse(localStorage.getItem("mup.merchant.demo.v1")).applications[0]');
  assert.deepEqual(app.commissionTerms, { commissionRate: 0.12, commissionRecipientId: app.commissionTerms.commissionRecipientId, commissionStatus: 'proposed' });
  await go(`/#/launch/${app.id}`); await waitFor('document.querySelector("h1")?.textContent === "Creator approval comes first"');
  await go('/#/applications'); await click('button', 'Approve'); await waitFor('!!document.querySelector(".application-card .status-approved")');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("mup.merchant.demo.v1")).applications[0].commissionTerms.commissionRate'), 0.12);
  await click('a', 'Prepare Product Draft'); await waitFor('!!document.querySelector("form")');
  await fill('.field > input', 'Evergreen Clay Desk Set'); await fill('input[aria-label="Selling price (USD)"]', '40');
  await waitFor('document.querySelector(".margin-card").innerText.includes("$21.20")');
  assert.match(await evaluate('document.querySelector(".margin-card").innerText'), /53\.0%/);
  assert.match(await evaluate('document.querySelector(".profit-breakdown").innerText'), /Creator commission \(12%\)[\s\S]*\$4\.80/);
  await fill('input[aria-label="Selling price (USD)"]', '10');
  await waitFor('document.querySelector(".margin-card").classList.contains("negative")');
  assert.match(await evaluate('document.querySelector(".margin-card").innerText'), /-\$5\.20/);
  await fill('input[aria-label="Selling price (USD)"]', '0');
  await waitFor('document.querySelector(".margin-card").innerText.includes("—")');
  assert.equal(await evaluate('document.querySelector("form").checkValidity()'), false);
  await fill('input[aria-label="Selling price (USD)"]', '40');
  await click('.demo-toggle'); await waitFor("!!document.querySelector('input[aria-label=\"Creator commission rate (%)\"]')");
  await fill('input[aria-label="Arcade manufacturing cost estimate (USD)"]', '20');
  await fill('input[aria-label="Creator commission rate (%)"]', '20');
  await waitFor('document.querySelector(".margin-card").innerText.includes("$12.00")');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("mup.merchant.demo.v1")).applications[0].commissionTerms.commissionRate'), 0.12);
  await click('.demo-toggle'); await waitFor("!document.querySelector('input[aria-label=\"Creator commission rate (%)\"]')");
  await waitFor('document.querySelector(".margin-card").innerText.includes("$21.20")');
  await screenshot('product-draft-desktop.png');
  await click('button', 'Create Product Draft'); await waitFor('document.querySelector(".empty-state h2")?.textContent === "Your product draft is ready"');
  await click('a', 'View My Product Drafts'); await waitFor('document.querySelectorAll(".saved-draft").length === 1');
  const saved = await evaluate('document.querySelector(".saved-draft").innerText');
  assert.match(saved, /Evergreen Clay Desk Set/); assert.match(saved, /branch-organizer-2/); assert.match(saved, /mock_shopify_/); assert.match(saved, /\$21\.20/);
  const savedDraft = await evaluate('JSON.parse(localStorage.getItem("mup.merchant.demo.v1")).drafts[0]');
  assert.equal(savedDraft.applicationId, app.id); assert.equal(savedDraft.pricing.creatorCommissionAmount, 4.8); assert.equal(savedDraft.pricing.merchantEstimatedProfit, 21.2); assert.equal(savedDraft.commissionTerms.commissionRate, 0.12);
  await reload(); await waitFor('document.querySelectorAll(".saved-draft").length === 1');
  assert.match(await evaluate('document.querySelector(".saved-draft").innerText'), /\$40\.00/);
  console.log('PASS: discovery → branch selection → pending application → demo approval → persistent draft');

  await evaluate('localStorage.removeItem("mup.merchant.demo.v1")'); await reload();
  await waitFor('document.querySelector(".empty-state h2")?.textContent === "A new collection starts with one idea"');
  await go('/'); await fill('input[aria-label="Search ideas"]', 'no-such-product'); await waitFor('document.querySelector(".empty-state h2")?.textContent === "No ideas found"');
  await click('button', 'Clear filters'); await waitFor('document.querySelectorAll(".idea-card").length === 6');
  await go('/#/branches/branch-lamp-3'); assert.equal(await evaluate('Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Applications not yet open"))?.disabled'), true);
  await go('/#/branches/branch-tote-1'); await click('button', 'Apply to Sell'); await click('button', 'Confirm application'); await waitFor('!!document.querySelector(".application-state")');
  await reload(); await waitFor('!!document.querySelector(".application-state")');
  assert.equal(await evaluate('Array.from(document.querySelectorAll("button")).some(b => b.textContent.trim() === "Apply to Sell")'), false);
  await go('/#/applications'); await click('button', 'Reject'); await waitFor('!!document.querySelector(".application-card .status-rejected")');
  const rejected = await evaluate('JSON.parse(localStorage.getItem("mup.merchant.demo.v1")).applications[0]');
  await go(`/#/launch/${rejected.id}`); await waitFor('document.querySelector("h1")?.textContent === "Creator approval comes first"');
  await go('/#/branches/branch-tote-1'); await click('button', 'Apply again'); await click('button', 'Confirm application'); await waitFor('!!document.querySelector(".application-state")');
  await go('/#/applications'); await waitFor('document.querySelectorAll(".application-card").length === 2');
  await click('.category-chip', 'Pending1'); await waitFor('document.querySelectorAll(".application-card").length === 1');
  console.log('PASS: empty states, unavailable designs, duplicates, rejection, and reapplication');

  await evaluate('localStorage.removeItem("mup.merchant.demo.v1")');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await go('/'); await waitFor('document.querySelectorAll(".idea-card").length === 6');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await waitFor('Array.from(document.images).every(i => i.complete && i.naturalWidth > 0)'); await screenshot('discover-mobile.png');
  await click('button[aria-label="Open navigation"]'); await click('button', 'Quick start guide'); await waitFor('!!document.querySelector("dialog[open]")');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await waitFor('!document.querySelector("dialog")');
  await click('nav a', 'My Applications'); await waitFor('document.querySelector("h1")?.textContent === "My Applications"');
  assert.equal(await evaluate('document.querySelector(".sidebar").classList.contains("mobile-open")'), false);
  await go('/#/branches/branch-organizer-1'); await click('button', 'Apply to Sell'); await click('button', 'Confirm application');
  await go('/#/applications'); await click('button', 'Approve'); await click('a', 'Prepare Product Draft');
  await waitFor('!!document.querySelector(".pricing-panel")');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  assert.equal(await evaluate('document.querySelector(".pricing-panel").getBoundingClientRect().top < document.querySelector(".form-stack").getBoundingClientRect().top'), true);
  await screenshot('product-draft-mobile.png');
  console.log('PASS: mobile layout, image loading, navigation, and keyboard dialog dismissal');

  await go('/#/ideas/missing'); await waitFor('document.querySelector(".empty-state h2")?.textContent === "Idea not found"');
  await go('/#/missing'); await waitFor('document.querySelector(".empty-state h2")?.textContent === "This page has wandered off"');
  assert.deepEqual(browserErrors, []);
  console.log('PASS: invalid route recovery and no uncaught browser errors');
  testPassed = true;
} finally {
  if (ws?.readyState === WebSocket.OPEN) ws.close();
  chrome.kill(); server.kill();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true });
  if (!testPassed) console.error('Browser walkthrough failed. See the assertion above.');
}
