// App Store: first-time downloads, paid purchases and proceeds, from the App Store Connect API
// (Sales and Trends reports for units, Finance reports for the money actually paid out).
// https://developer.apple.com/documentation/appstoreconnectapi/download-sales-and-trends-reports
// https://developer.apple.com/documentation/appstoreconnectapi/download-finance-reports
import { createPrivateKey, sign } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { http, parseDelimited, num, round2, isoDate } from './util.mjs';

// Product type identifiers (Apple's "Product Type Identifier" table).
const FIRST_DOWNLOAD = new Set(['1', '1F', '1T', 'F1', '1E', '1EP', '1EU']);
const NOT_A_PURCHASE = new Set(['3', '3F', '3T', 'F3', '7', '7F', '7T', 'F7']); // re-downloads, updates

export function isConfigured(env) {
  return Boolean(env.APP_STORE_ISSUER_ID && env.APP_STORE_KEY_ID && env.APP_STORE_PRIVATE_KEY && env.APP_STORE_VENDOR_NUMBER);
}

function jwt(env) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'ES256', kid: env.APP_STORE_KEY_ID, typ: 'JWT' })}.${b64({
    iss: env.APP_STORE_ISSUER_ID, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1',
  })}`;
  const key = createPrivateKey(env.APP_STORE_PRIVATE_KEY.replace(/\\n/g, '\n'));
  const sig = sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${unsigned}.${sig}`;
}

/** Downloads one report. Returns its rows, or null if Apple has no data for that period. */
async function report(path, filters, env) {
  const q = new URLSearchParams(Object.entries(filters).map(([k, v]) => [`filter[${k}]`, v]));
  q.set('filter[vendorNumber]', env.APP_STORE_VENDOR_NUMBER);
  const res = await http(`https://api.appstoreconnect.apple.com/v1/${path}?${q}`, {
    headers: { Authorization: `Bearer ${jwt(env)}`, Accept: 'application/a-gzip' },
  }, { allow404: true });
  if (!res) return null;
  return parseDelimited(gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf8'), '\t');
}

/** Pure calculation over Sales and Trends rows, exported for tests. */
export function summarizeSales(rows, appIds) {
  let players = 0, purchases = 0;
  for (const r of rows) {
    const app = r['Apple Identifier'], parent = r['Parent Identifier'];
    if (!appIds.has(app) && !appIds.has(parent)) continue;
    const type = r['Product Type Identifier'];
    const units = num(r['Units']); // refunds are negative units
    if (FIRST_DOWNLOAD.has(type) && appIds.has(app)) players += units;
    if (!NOT_A_PURCHASE.has(type) && num(r['Customer Price']) !== 0) purchases += units;
  }
  return { players, purchases };
}

/** Pure calculation over a consolidated Finance report, exported for tests. */
export async function summarizeFinance(rows, appIds, fx, date) {
  let eur = 0;
  for (const r of rows) {
    if (!appIds.has(r['Apple Identifier'])) continue;
    eur += await fx.toEur(num(r['Extended Partner Share']), r['Partner Share Currency'], date);
  }
  return eur;
}

const months = (since, until) => {
  const out = [];
  const d = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), 1));
  while (d < until) { out.push(d.toISOString().slice(0, 7)); d.setUTCMonth(d.getUTCMonth() + 1); }
  return out;
};

export async function collect(env, cfg, fx, state) {
  const appIds = new Set(cfg.appIds.map(String));
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  state.salesMonths ||= {};
  state.salesDays ||= {};
  state.financeMonths ||= {};

  // Units: monthly Sales reports for finished months (kept once Apple has published them),
  // daily reports for the days not covered by a monthly report yet.
  for (const m of months(new Date(cfg.since), now)) {
    if (m === thisMonth || state.salesMonths[m]) continue;
    const rows = await report('salesReports', { frequency: 'MONTHLY', reportDate: m, reportSubType: 'SUMMARY', reportType: 'SALES', version: '1_0' }, env);
    const ageDays = (now - new Date(`${m}-01T00:00:00Z`)) / 864e5;
    if (rows) state.salesMonths[m] = summarizeSales(rows, appIds);
    else if (ageDays > 45) state.salesMonths[m] = { players: 0, purchases: 0 }; // Apple: no sales that month
  }
  for (const day of Object.keys(state.salesDays)) if (state.salesMonths[day.slice(0, 7)]) delete state.salesDays[day];
  for (let i = 1; i <= 62; i++) {
    const day = isoDate(new Date(now.getTime() - i * 864e5));
    if (day < cfg.since || state.salesMonths[day.slice(0, 7)] || state.salesDays[day]) continue;
    const rows = await report('salesReports', { frequency: 'DAILY', reportDate: day, reportSubType: 'SUMMARY', reportType: 'SALES', version: '1_0' }, env);
    if (rows) state.salesDays[day] = summarizeSales(rows, appIds);
    else if (i > 3) state.salesDays[day] = { players: 0, purchases: 0 };
  }

  // Money: consolidated Finance reports (region ZZ), one per Apple fiscal month.
  for (const m of months(new Date(cfg.since), now)) {
    if (m === thisMonth || state.financeMonths[m] != null) continue;
    const rows = await report('financeReports', { regionCode: 'ZZ', reportDate: m, reportType: 'FINANCIAL' }, env);
    if (rows) state.financeMonths[m] = round2(await summarizeFinance(rows, appIds, fx, `${m}-28`));
  }

  const units = [...Object.values(state.salesMonths), ...Object.values(state.salesDays)];
  return {
    players: units.reduce((s, u) => s + u.players, 0),
    purchases: units.reduce((s, u) => s + u.purchases, 0),
    contributions: round2(Object.values(state.financeMonths).reduce((s, v) => s + v, 0)),
  };
}
