// Read-only audit. The deployment credential stays inside GitHub Actions.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const account = '291702df5c8eef8684918f4f92ca4c4d';
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) throw new Error('CLOUDFLARE_API_TOKEN is required');
const report = { timestamp: new Date().toISOString(), account, mutationApplied: false, requests: [], workers: [] };
async function get(path) {
  const response = await fetch('https://api.cloudflare.com/client/v4' + path, {
    headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(30000),
  });
  const body = await response.json();
  report.requests.push({ path, status: response.status, success: Boolean(body.success), errorCodes: (body.errors || []).map(error => error.code) });
  return body.success ? body.result : null;
}
try {
  const verified = await get('/user/tokens/verify');
  report.token = verified ? { id: verified.id, status: verified.status } : null;
  const scripts = await get('/accounts/' + account + '/workers/scripts');
  const buildTokens = await get('/accounts/' + account + '/builds/tokens');
  report.buildTokens = Array.isArray(buildTokens) ? buildTokens.map(item => ({
    build_token_uuid: item.build_token_uuid, cloudflare_token_id: item.cloudflare_token_id,
    owner_type: item.owner_type,
  })) : null;
  for (const name of ['battleship', 'word-chain-game']) {
    const worker = Array.isArray(scripts) && scripts.find(item => item.id === name);
    if (!worker) { report.workers.push({ name, found: false }); continue; }
    const triggers = await get('/accounts/' + account + '/builds/workers/' + worker.tag + '/triggers');
    report.workers.push({ name, tag: worker.tag, triggers: Array.isArray(triggers) ? triggers.map(item => ({
      trigger_uuid: item.trigger_uuid, build_token_uuid: item.build_token_uuid,
      build_command: item.build_command, deploy_command: item.deploy_command,
      branch_includes: item.branch_includes, branch_excludes: item.branch_excludes,
    })) : null });
  }
} finally {
  const folder = new URL('../artifacts/cloudflare-builds/', import.meta.url);
  await mkdir(folder, { recursive: true });
  await writeFile(new URL('audit.json', folder), JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(report, null, 2));
  console.log('Read-only audit saved to ' + fileURLToPath(new URL('audit.json', folder)));
}
