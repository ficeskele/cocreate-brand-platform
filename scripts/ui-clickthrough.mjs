// Drive the UI through headless Chrome via CDP: open a product, click Release, click Open store, screenshot.
// Usage: node scripts/ui-clickthrough.mjs <productId> <out.png>
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const [productId, out = "ui-clickthrough.png"] = process.argv.slice(2);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1400,1500", "--user-data-dir=/tmp/cdp-profile", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  let targets;
  for (let i = 0; i < 40 && !targets; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch { await sleep(250); } }
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  const evalJs = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;

  await send("Page.enable");
  await send("Page.navigate", { url: `http://localhost:3456/#product=${productId}` });
  await sleep(2500);
  console.log("title:", await evalJs("document.title"), "| product:", await evalJs("document.querySelector('main strong')?.textContent"));

  await evalJs("document.querySelector('#releaseBtn').click(); 'clicked release'");
  await sleep(1500);
  console.log("release box:", await evalJs("document.querySelector('.release-box')?.textContent.slice(0, 80)"));

  await evalJs("document.querySelector('#storeBtn').click(); 'clicked store'");
  for (let i = 0; i < 40; i++) { await sleep(500); if (await evalJs("!!document.querySelector('.checkout')")) break; }
  console.log("checkout:", await evalJs("document.querySelector('.checkout')?.href"));

  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  console.log("saved", out);
  ws.close();
} finally {
  chrome.kill();
}
