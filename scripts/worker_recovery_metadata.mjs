// Only reads Cloudflare metadata and public assets. Deployment is a separate workflow step.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
const worker = process.env.GAME_WORKER;
assert.ok(['battleship', 'word-chain-game'].includes(worker), 'Unexpected Worker');
const phase = process.env.RECOVERY_PHASE;
assert.ok(['before', 'after'].includes(phase), 'Unexpected recovery phase');
const allowCreate = process.env.ALLOW_CREATE === 'true';
const canonicalDomain = worker === 'battleship' ? 'battleship.giacomel.info' : 'wordchain.giacomel.info';
const token = process.env.CLOUDFLARE_API_TOKEN;
assert.ok(token, 'Cloudflare credential required');
const folder = resolve('artifacts/worker-recovery');
await mkdir(folder, { recursive: true });
const base = 'https://api.cloudflare.com/client/v4/accounts/291702df5c8eef8684918f4f92ca4c4d';
async function api(path, allowMissing = false) {
  const response = await fetch(base + path, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(30000) });
  const body = await response.json();
  if (allowMissing && response.status === 404) return null;
  if (!response.ok || !body.success) throw new Error('Cloudflare ' + path + ': HTTP ' + response.status + ', codes ' + (body.errors || []).map(e => e.code).join(','));
  return body.result;
}
const deploymentResult = await api('/workers/scripts/' + worker + '/deployments', phase === 'before' && allowCreate);
const deployments = deploymentResult?.deployments || deploymentResult || [];
const current = deployments[0];
assert.ok(current?.id || (phase === 'before' && allowCreate), 'An existing deployment is required');
if (current) {
  assert.equal(current.versions.length, 1, 'Do not replace a gradual deployment');
  assert.equal(current.versions[0].percentage, 100, 'Do not replace split traffic');
}
let url;
if (phase === 'before') {
  const subdomain = await api('/workers/subdomain');
  const settings = current ? await api('/workers/scripts/' + worker + '/subdomain') : { enabled: true };
  const domains = await api('/workers/domains');
  const candidates = domains.filter(item => item.service === worker).map(item => 'https://' + item.hostname + '/');
  if (!current) candidates.unshift('https://' + canonicalDomain + '/');
  if (settings.enabled) candidates.push('https://' + worker + '.' + subdomain.subdomain + '.workers.dev/');
  assert.ok(candidates.length, 'No public Worker URL found');
  const probes = [];
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { signal: AbortSignal.timeout(30000) });
      await response.arrayBuffer(); probes.push({ url: candidate, status: response.status });
      if (response.ok) { url = candidate; break; }
    } catch (error) {
      if (current || !allowCreate) throw error;
      probes.push({ url: candidate, status: 0, error: error.message });
    }
  }
  console.log('Public URL probes: ' + JSON.stringify(probes));
  if (!url && !current && allowCreate) url = 'https://' + canonicalDomain + '/';
  assert.ok(url, 'No public Worker URL responds successfully: ' + JSON.stringify(probes));
} else url = JSON.parse(await readFile(join(folder, 'before.json'), 'utf8')).url;
// Same serial HTTP workload before and after, in the same runner. Not FPS or UI latency.
const samples = [], statuses = [];
for (let i = 0; i < 10; i++) {
  const start = performance.now();
  try {
    const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(30000) });
    await response.arrayBuffer(); statuses.push(response.status);
  } catch (error) {
    if (current || phase !== 'before' || !allowCreate) throw error;
    statuses.push(0); console.log('Unavailable deleted endpoint: ' + error.message);
  }
  samples.push(performance.now() - start);
}
const sorted = [...samples].sort((a, b) => a - b), mean = samples.reduce((a, b) => a + b, 0) / samples.length;
const report = { timestamp: new Date().toISOString(), worker, phase, url,
  deployment: current ? { id: current.id, versions: current.versions } : null,
  http: { samples: samples.length, statuses, mean_ms: mean, p50_ms: sorted[4], p95_ms: sorted[9], ops_per_second: 1000 / mean } };
if (phase === 'after') {
  const before = JSON.parse(await readFile(join(folder, 'before.json'), 'utf8'));
  assert.notEqual(current.id, before.deployment?.id, 'No new deployment active');
  const index = await readFile(resolve('dist/index.html'));
  const expected = createHash('sha256').update(index).digest('hex');
  let actual, lastBody, lastStatus;
  for (let retry = 0; retry < 30; retry++) {
    const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(30000) });
    lastBody = Buffer.from(await response.arrayBuffer()); lastStatus = response.status;
    actual = createHash('sha256').update(lastBody).digest('hex');
    if (response.ok && actual === expected) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (actual !== expected) {
    const html = lastBody.toString('utf8');
    const diagnostics = { status: lastStatus, expectedBytes: index.length, actualBytes: lastBody.length,
      expectedHash: expected, actualHash: actual, title: html.match(/<title[^>]*>([^<]*)/i)?.[1],
      expectedScripts: [...index.toString('utf8').matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]),
      actualScripts: [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]),
      normalizedHash: createHash('sha256').update(html.replace(/\r\n/g, '\n')).digest('hex'),
      expectedNormalizedHash: createHash('sha256').update(index.toString('utf8').replace(/\r\n/g, '\n')).digest('hex') };
    await writeFile(join(folder, 'html-diagnostics.json'), JSON.stringify(diagnostics, null, 2) + '\n', 'utf8');
    console.log('HTML diagnostics: ' + JSON.stringify(diagnostics));
  }
  assert.equal(actual, expected, 'Published HTML does not match the tested build');
  assert.ok(statuses.every(status => status === 200), 'Live navigation failed');
  report.index_sha256 = actual;
  report.source_sha = process.env.SOURCE_SHA;
  report.speedup = before.http.statuses.every(status => status === 200) ? before.http.mean_ms / report.http.mean_ms : null;
}
await writeFile(join(folder, phase + '.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT,
  'game_url=' + url + '\nrollback_version=' + (current?.versions[0].version_id || '') + '\n', 'utf8');
console.log(JSON.stringify(report));
