import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, relative, isAbsolute, extname } from 'node:path';
import { once } from 'node:events';
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function openBrowser(root, { entry = '/examples/index.html', artifactsPath, blockRemoteAI = false } = {}) {
  const artifacts = artifactsPath || join(root, 'artifacts'); await mkdir(artifacts, { recursive: true });
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname === '/') { res.writeHead(302, { Location: entry }).end(); return; }
      const path = resolve(root, '.' + (pathname === '/' ? '/examples/index.html' : pathname));
      const rel = relative(root, path);
      if (rel.startsWith('..') || isAbsolute(rel)) { res.writeHead(403).end(); return; }
      const data = await readFile(path);
      res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' })[extname(path)] || 'application/octet-stream');
      res.end(data);
    } catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 400).end(); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = 'http://127.0.0.1:' + server.address().port;
  const candidates = [process.env.BROWSER_BINARY,
    join(process.env['ProgramFiles(x86)'] || '', 'Microsoft/Edge/Application/msedge.exe'),
    join(process.env.ProgramFiles || '', 'Google/Chrome/Application/chrome.exe'),
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  const binary = candidates.find(existsSync);
  if (!binary) { server.close(); throw new Error('Set BROWSER_BINARY to an installed Chrome or Edge executable'); }
  const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const debug = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const browser = spawn(binary, ['--headless', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + debug,
    '--user-data-dir=' + join(artifacts, 'browser-profile-' + Date.now()), blockRemoteAI ? 'about:blank' : url], { windowsHide: true, stdio: ['ignore','ignore','pipe'] });
  let diagnostics = ''; browser.stderr.on('data', data => { diagnostics += data.toString(); });
  let spawnError; browser.once('error', error => { spawnError = error; });
  let socket; const pending = new Map(); let nextId = 0; const errors = [];
  const close = async () => {
    if (socket?.readyState === WebSocket.OPEN) {
      try { await command('Browser.close'); } catch (error) { errors.push('Cleanup: ' + error.message); }
    }
    socket?.close(); browser.kill(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  };
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId, timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
  try {
    let page;
    for (let attempt = 0; attempt < 300; attempt++) {
      if (spawnError) throw spawnError;
      if (browser.exitCode !== null && browser.exitCode !== 0) throw new Error('Browser exited before CDP was ready: ' + browser.exitCode + ' ' + diagnostics);
      try { page = (await (await fetch('http://127.0.0.1:' + debug + '/json')).json()).find(p => blockRemoteAI ? p.url === 'about:blank' : p.url.startsWith(url)); }
      catch (error) { if (attempt === 299) throw new Error('Browser CDP unavailable: ' + diagnostics.slice(-4000), { cause: error }); }
      if (page) break; await delay(100);
    }
    if (!page) throw new Error('Browser page was not created');
    socket = new WebSocket(page.webSocketDebuggerUrl); await once(socket, 'open');
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const task = pending.get(message.id); if (!task) return;
        pending.delete(message.id); clearTimeout(task.timer);
        if (message.error) task.reject(new Error(JSON.stringify(message.error))); else task.resolve(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(message.params.exceptionDetails));
    });
    await command('Runtime.enable'); await command('Page.enable');
    if (blockRemoteAI) {
      await command('Network.enable');
      await command('Network.setBlockedURLs', { urls: ['*generativelanguage.googleapis.com*','*aiplatform.googleapis.com*','*fonts.googleapis.com*','*fonts.gstatic.com*','*pagead2.googlesyndication.com*'] });
      await command('Page.navigate', { url: url + entry });
    }
    const evaluate = async expression => {
      const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    return { command, evaluate, errors, url, artifacts, close };
  } catch (error) { await close(); throw error; }
}
