// Only reads Cloudflare metadata and public assets. Deployment is a separate workflow step.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
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
const publicHeaders = { 'Cache-Control': 'no-cache', 'User-Agent': 'Mozilla/5.0 (compatible; GameVerification/1.0)' };
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
  // Use the known application domain. A workers.dev URL may be a successful
  // Cloudflare Access login response, which is not the application.
  url = 'https://' + canonicalDomain + '/';
  assert.ok(!current || candidates.includes(url), 'Canonical domain is not attached to this Worker');
} else url = JSON.parse(await readFile(join(folder, 'before.json'), 'utf8')).url;
// Same serial HTTP workload before and after, in the same runner. Not FPS or UI latency.
async function measureHttp() {
const samples = [], statuses = [];
for (let i = 0; i < 10; i++) {
  const start = performance.now();
  try {
    const response = await fetch(url, { headers: publicHeaders, signal: AbortSignal.timeout(30000) });
    await response.arrayBuffer(); statuses.push(response.status);
  } catch (error) {
    if (current || phase !== 'before' || !allowCreate) throw error;
    statuses.push(0); console.log('Unavailable deleted endpoint: ' + error.message);
  }
  samples.push(performance.now() - start);
}
const sorted = [...samples].sort((a, b) => a - b), mean = samples.reduce((a, b) => a + b, 0) / samples.length;
return { samples: samples.length, statuses, mean_ms: mean, p50_ms: sorted[4], p95_ms: sorted[9], ops_per_second: 1000 / mean };
}
const report = { timestamp: new Date().toISOString(), worker, phase, url,
  deployment: current ? { id: current.id, versions: current.versions } : null,
  http: null };
if (phase === 'before') report.http = await measureHttp();
if (phase === 'after') {
  const before = JSON.parse(await readFile(join(folder, 'before.json'), 'utf8'));
  assert.notEqual(current.id, before.deployment?.id, 'No new deployment active');
  report.http = await measureHttp();
  report.http.anonymous_probe_blocked = report.http.statuses.some(status => status !== 200);
  report.integrity_gate = 'Required in the following real-browser step; anonymous HTTP may receive Cloudflare security pages';
  report.source_sha = process.env.SOURCE_SHA;
  report.speedup = before.http.statuses.every(status => status === 200) && report.http.statuses.every(status => status === 200) ? before.http.mean_ms / report.http.mean_ms : null;
}
await writeFile(join(folder, phase + '.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT,
  'game_url=' + url + '\nrollback_version=' + (current?.versions[0].version_id || '') + '\n', 'utf8');
console.log(JSON.stringify(report));
