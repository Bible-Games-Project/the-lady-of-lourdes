// Google Play: first installs per device, paid purchases and net earnings, from the reports
// Play Console exports to its Google Cloud Storage bucket.
// https://support.google.com/googleplay/android-developer/answer/6135870
import { createSign } from 'node:crypto';
import { http, decodeText, parseDelimited, num, unzip, round2 } from './util.mjs';

export function isConfigured(env) {
  return Boolean(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON && env.GOOGLE_PLAY_REPORTS_BUCKET);
}

const b64url = (v) => Buffer.from(v).toString('base64url');

async function token(env) {
  const sa = JSON.parse(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/devstorage.read_only',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');
  const res = await http('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  });
  return (await res.json()).access_token;
}

async function listObjects(bucket, prefix, auth) {
  const names = [];
  let pageToken = '';
  do {
    const q = new URLSearchParams({ prefix, fields: 'items(name),nextPageToken' });
    if (pageToken) q.set('pageToken', pageToken);
    const res = await http(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?${q}`, auth);
    const body = await res.json();
    names.push(...(body.items || []).map((i) => i.name));
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return names;
}

async function download(bucket, name, auth) {
  const res = await http(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}?alt=media`, auth);
  return Buffer.from(await res.arrayBuffer());
}

/** Pure calculation over the installs overview CSVs, exported for tests. */
export function countFirstInstalls(csvTexts) {
  // "Daily Device Installs": devices that installed the app that day. Updates are a separate
  // column and re-installs on the same device are reported as "Install events", not here.
  let total = 0;
  for (const text of csvTexts) {
    for (const row of parseDelimited(text)) total += num(row['Daily Device Installs']);
  }
  return total;
}

/** Pure calculation over earnings rows, exported for tests. */
export async function summarizeEarnings(rows, packages, fx) {
  let contributions = 0;
  const orders = new Map(); // order ID -> +1 charge / -1 refund
  for (const row of rows) {
    if (!packages.has(row['Product id'])) continue;
    const date = toIsoDate(row['Transaction Date']);
    contributions += await fx.toEur(num(row['Amount (Merchant Currency)']), row['Merchant Currency'], date);
    const type = row['Transaction Type'];
    const order = row['Description'];
    if (type === 'Charge') orders.set(order, (orders.get(order) || 0) + 1);
    if (type === 'Charge refund') orders.set(order, (orders.get(order) || 0) - 1);
  }
  const purchases = [...orders.values()].filter((v) => v > 0).length;
  return { purchases, contributions: round2(contributions) };
}

function toIsoDate(v) {
  const d = new Date(v);
  return isNaN(d) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

export async function collect(env, cfg, fx) {
  const bucket = env.GOOGLE_PLAY_REPORTS_BUCKET;
  const packages = new Set(cfg.packages);
  const auth = { headers: { Authorization: `Bearer ${await token(env)}` } };

  const installFiles = (await listObjects(bucket, 'stats/installs/', auth))
    .filter((name) => cfg.packages.some((pkg) => name.startsWith(`stats/installs/installs_${pkg}_`) && name.endsWith('_overview.csv')));
  const installTexts = [];
  for (const name of installFiles) installTexts.push(decodeText(await download(bucket, name, auth)));

  const earningRows = [];
  for (const name of (await listObjects(bucket, 'earnings/', auth)).filter((n) => n.endsWith('.zip'))) {
    for (const [file, data] of Object.entries(unzip(await download(bucket, name, auth)))) {
      if (file.toLowerCase().endsWith('.csv')) earningRows.push(...parseDelimited(decodeText(data)));
    }
  }
  const earnings = await summarizeEarnings(earningRows, packages, fx);
  return { players: countFirstInstalls(installTexts), ...earnings };
}
