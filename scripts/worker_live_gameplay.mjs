import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
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
  assert.ok(ready, 'Published game did not initialize');
  await verifyGameplay(page, process.env.GAME_ID);
  assert.deepEqual(page.errors, []);
  const shot = await page.command('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(artifacts, 'live-gameplay.png'), Buffer.from(shot.data, 'base64'));
  await writeFile(join(artifacts, 'live-gameplay.json'), JSON.stringify({
    timestamp: new Date().toISOString(), url: process.env.GAME_URL, game: process.env.GAME_ID, status: 'PASS',
  }, null, 2) + '\n', 'utf8');
} finally { await page.close(); }
