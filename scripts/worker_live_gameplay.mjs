import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = resolve('.'), artifacts = join(root, 'artifacts/worker-recovery');
const { openBrowser, delay } = await import(pathToFileURL(join(root, 'scripts/game-kit-cdp.mjs')));
const { verifyGameplay } = await import(pathToFileURL(join(root, 'scripts/game-kit-gameplay.mjs')));
const page = await openBrowser(root, { entry: '/dist/index.html', artifactsPath: artifacts, blockRemoteAI: true });
try {
  await page.command('Page.navigate', { url: process.env.GAME_URL });
  let ready = false;
  for (let i = 0; i < 200; i++) {
    if (await page.evaluate('Boolean(window.__gameKit)')) { ready = true; break; }
    await delay(100);
  }
  if (!ready) {
    const diagnostics = await page.evaluate('({url:location.href,title:document.title,body:document.body.innerText.slice(0,400)})');
    await writeFile(join(artifacts, 'live-unavailable.json'), JSON.stringify(diagnostics, null, 2) + '\n', 'utf8');
    console.error('Live browser response:', diagnostics);
  }
  assert.ok(ready, 'Published game did not initialize');
  const index = await readFile(join(root, 'dist/index.html'), 'utf8');
  const paths = [...index.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1])
    .filter(path => /^(?:\.\/|\/)?assets\/[^?#]+\.(?:js|css)$/.test(path));
  assert.ok(paths.length, 'Build bundles missing');
  const assets = [];
  for (const path of paths) {
    const remote = new URL(path, process.env.GAME_URL);
    assert.equal(remote.origin, new URL(process.env.GAME_URL).origin);
    const local = await readFile(resolve(root, 'dist', '.' + remote.pathname));
    const actual = await page.evaluate(`(async()=>{const r=await fetch(${JSON.stringify(remote.href)},{cache:'no-store'});if(!r.ok)throw new Error('Asset HTTP '+r.status);const digest=await crypto.subtle.digest('SHA-256',await r.arrayBuffer());return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');})()`);
    assert.equal(actual, createHash('sha256').update(local).digest('hex'), 'Published bundle differs from tested build: ' + path);
    assets.push({ path, sha256: actual });
  }
  await verifyGameplay(page, process.env.GAME_ID);
  assert.deepEqual(page.errors, []);
  const shot = await page.command('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(artifacts, 'live-gameplay.png'), Buffer.from(shot.data, 'base64'));
  await writeFile(join(artifacts, 'live-gameplay.json'), JSON.stringify({
    timestamp: new Date().toISOString(), url: process.env.GAME_URL, game: process.env.GAME_ID, status: 'PASS', assets,
  }, null, 2) + '\n', 'utf8');
} finally { await page.close(); }
