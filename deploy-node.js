// deploy-node.js — deploya bolao-worker.js na Cloudflare via REST API
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = __dirname;
const token = fs.readFileSync(path.join(ROOT, '.worker-token'), 'utf8').trim();
const script = fs.readFileSync(path.join(ROOT, 'bolao-worker.js'), 'utf8');
const workerName = 'copa2026-bolao';

const ENV_VARS = [
  { name: 'SUPABASE_URL',  type: 'plain_text',  text: 'https://etbezmraylbvlnycltha.supabase.co' },
  { name: 'SUPABASE_KEY',  type: 'secret_text', text: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0YmV6bXJheWxidmxueWNsdGhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI3NDE0MCwiZXhwIjoyMDk2ODUwMTQwfQ.kbcmnTI-anyEaTEIf7tlo107-EL1XEWIm7bzNBGfCbs' },
  { name: 'JWT_SECRET',    type: 'secret_text', text: 'minhachavesecreta123' },
  { name: 'TURNSTILE_SEC', type: 'secret_text', text: '0x4AAAAAADj0kQff4_E5yllvUOzc2sCtF2k' },
  { name: 'ADMIN_KEY',     type: 'secret_text', text: 'Copa2026-Bolao-Admin-v19' },
  { name: 'ADMIN_HASH',    type: 'secret_text', text: '96ce37787d5e040a0951f7dc3d3f724d1c66d68c3e6e2d93855bccf8e6f43786' },
  { name: 'CRON_SECRET',   type: 'secret_text', text: '9xf0Dra4XZhg3NEKiSIVAs85QYuM7nLv' },
];

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const log = fs.createWriteStream(path.join(ROOT, 'deploy_log.txt'), { flags: 'a' });
  const print = s => { process.stdout.write(s + '\n'); log.write(s + '\n'); };

  print('\n=== Node Deploy ===');

  // 1. Get account ID
  print('[...] Autenticando...');
  const acctRes = await request({
    hostname: 'api.cloudflare.com',
    path: '/client/v4/accounts',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
  });
  const acct = JSON.parse(acctRes.body);
  if (!acct.success) { print('[ERRO] ' + acct.errors[0].message); process.exit(1); }
  const accountId = acct.result[0].id;
  print('[OK] Account ID: ' + accountId);

  // 2. Multipart upload
  const boundary = 'boundary_' + Date.now();
  const nl = '\r\n';
  const meta = JSON.stringify({ body_part: 'script', bindings: ENV_VARS });
  const parts = [
    '--' + boundary + nl,
    'Content-Disposition: form-data; name="script"; filename="worker.js"' + nl,
    'Content-Type: application/javascript' + nl + nl,
    script + nl,
    '--' + boundary + nl,
    'Content-Disposition: form-data; name="metadata"' + nl + nl,
    meta + nl,
    '--' + boundary + '--' + nl
  ].join('');

  print('[...] Enviando ' + workerName + ' (' + ENV_VARS.length + ' bindings)...');
  const upRes = await request({
    hostname: 'api.cloudflare.com',
    path: '/client/v4/accounts/' + accountId + '/workers/scripts/' + workerName,
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
      'Content-Length': Buffer.byteLength(parts)
    }
  }, parts);

  if (upRes.status >= 400) {
    print('[ERRO] HTTP ' + upRes.status + ': ' + upRes.body.slice(0, 300));
    process.exit(1);
  }
  const upJson = JSON.parse(upRes.body);
  if (!upJson.success) {
    print('[ERRO] ' + JSON.stringify(upJson.errors));
    process.exit(1);
  }
  print('[OK] ' + workerName + ' deployado com sucesso! (' + new Date().toISOString() + ')');
  log.end();
}

main().catch(e => {
  fs.appendFileSync(path.join(ROOT, 'deploy_log.txt'), '[ERRO FATAL] ' + e.message + '\n');
  console.error('[ERRO FATAL]', e.message);
  process.exit(1);
});
