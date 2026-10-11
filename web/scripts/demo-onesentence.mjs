// Visible, slow demo of the one-sentence setup in a real Chrome window.
// Usage: node web/scripts/demo-onesentence.mjs ["your sentence"]   (server on :3456)
import { chromium } from 'playwright';
const SENTENCE = process.argv[2] ?? 'a pillow full of bright circus clowns to make my room go wild';
const B = process.env.BASE_URL ?? 'http://localhost:3456/app';
const API = B.replace(/\/app$/, '');
const b = await chromium.launch({ channel: 'chrome', headless: false, slowMo: 300, args: ['--window-size=1440,1000', '--window-position=40,40'] });
const ctx = await b.newContext({ viewport: null }); const p = await ctx.newPage();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const say = async (t) => { await p.evaluate(t => { let d = document.getElementById('__demo'); if (!d) { d = document.createElement('div'); d.id = '__demo'; d.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:99999;background:#111;color:#fff;padding:12px 16px;border-radius:10px;font:600 16px system-ui;max-width:70vw;box-shadow:0 8px 24px rgba(0,0,0,.3)'; document.body.appendChild(d); } d.textContent = t; }, t).catch(() => {}); console.log('>', t); };
const next = () => p.getByRole('button', { name: /^(Next|Predict and continue)$/ }).click();

try {
  await p.goto(B + '/create'); await p.waitForSelector('.empty, .wizard');
  if (await p.locator('.empty').count()) {
    await say('Creating needs an account (demo sign-up, nothing is sent anywhere).'); await sleep(1500);
    await p.getByRole('button', { name: 'Create account' }).click(); await p.waitForSelector('form');
    await p.locator('form input[autocomplete="nickname"]').pressSequentially('Lin', { delay: 60 });
    await p.locator('form input[type="email"]').pressSequentially('lin@example.com', { delay: 40 });
    await p.locator('form input[type="password"]').pressSequentially('secret123', { delay: 40 });
    await p.getByRole('button', { name: /Create account and continue/ }).click();
  }
  await p.waitForSelector('.wizard textarea');
  await say('Step 1 · The user types ONE sentence. Nothing else.'); await sleep(1500);
  await p.locator('.wizard textarea').click();
  await p.locator('.wizard textarea').pressSequentially(SENTENCE, { delay: 70 });
  await sleep(1000);
  await say('Click "Predict the rest": the backend matches the sentence against mock past ideas.');
  await p.getByRole('button', { name: /Predict the rest/ }).click();
  await p.waitForSelector('.panel:has-text("Predicted")', { timeout: 15000 });
  await p.locator('.panel:has-text("Predicted")').scrollIntoViewIfNeeded();
  await say('Predicted: name, category + arcade.ai category and style, audience, features, price band, brand voice and palette, and which similar ideas were used. All editable.'); await sleep(7000);

  await next(); await sleep(800);
  await say('Step 2 · Already filled in: name, description, category, features.'); await sleep(4500);
  await next(); await sleep(800);
  await say('Step 3 · Interest: expected price chip is pre-selected from the predicted price band.'); await sleep(3500);
  await next(); await sleep(800);
  await say('Step 4 · Review. Publishing creates the idea on the backend and starts the agent on arcade.ai.'); await sleep(4000);
  await p.getByRole('button', { name: /Publish idea/ }).click();
  await p.waitForURL(/\/app\/i\/api-/, { timeout: 20000 });
  const productId = p.url().match(/api-([^/?]+)/)[1];
  await p.waitForSelector('.threads .thread', { timeout: 15000 });
  await say('Created. The @agent:concept message was posted automatically with the predicted style and material. Generating on arcade.ai (1 to 2 minutes)…');

  // wait on the backend for the run
  let run;
  for (let i = 0; i < 150; i++) {
    const msgs = await (await fetch(`${API}/products/${productId}/messages`)).json();
    const runId = msgs.filter(m => m.agent_run_id && m.author_type === 'user').at(-1)?.agent_run_id;
    if (runId) { run = await (await fetch(`${API}/agent-runs/${runId}`)).json(); if (run.status !== 'running') break; }
    await sleep(2000);
  }
  if (!run || run.status !== 'succeeded') throw new Error('agent did not succeed: ' + (run?.error ?? 'timeout'));
  await sleep(3000);
  await say('Agent done. Open the Versions tab to see the generated product.'); await sleep(3000);
  await p.goto(p.url().split('?')[0] + '?tab=versions');
  await p.locator('.panel', { has: p.locator('h3', { hasText: /Open proposals/i }) }).locator('.stack').first().waitFor({ timeout: 15000 });
  await p.evaluate(() => document.querySelector('.tree')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  await say('One sentence → a real arcade.ai product with render, maker and price, waiting for merge. Window stays open 3 minutes.');
  await sleep(180000);
} catch (e) { await say('Demo error: ' + e.message); console.error(e); await sleep(20000); }
await b.close();
