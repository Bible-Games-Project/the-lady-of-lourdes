// PayPal: distinct donors and net donations, from the Transaction Search API.
// https://developer.paypal.com/docs/api/transaction-search/v1/
import { http, round2 } from './util.mjs';

const DAY = 24 * 60 * 60 * 1000;
// Fees, refunds, reversals and chargebacks that point at a counted payment through
// paypal_reference_id. T1110/T1111 are temporary holds (released later), not losses.
const ADJUSTMENT_PREFIXES = ['T01', 'T11', 'T12'];
const IGNORED_ADJUSTMENTS = new Set(['T1110', 'T1111']);

export function isConfigured(env) {
  return Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
}

async function token(base, env) {
  const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await http(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  return (await res.json()).access_token;
}

async function listTransactions(base, accessToken, start, end) {
  const all = [];
  // The API accepts at most 31 days per request and keeps 3 years of history.
  for (let from = start; from < end; from = new Date(from.getTime() + 31 * DAY)) {
    const to = new Date(Math.min(from.getTime() + 31 * DAY - 1000, end.getTime()));
    for (let page = 1, pages = 1; page <= pages; page++) {
      const q = new URLSearchParams({
        start_date: from.toISOString().replace(/\.\d{3}Z$/, 'Z'),
        end_date: to.toISOString().replace(/\.\d{3}Z$/, 'Z'),
        fields: 'transaction_info,payer_info',
        page_size: '500',
        page: String(page),
      });
      const res = await http(`${base}/v1/reporting/transactions?${q}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = await res.json();
      pages = body.total_pages || 1;
      all.push(...(body.transaction_details || []));
    }
  }
  return all;
}

/** Pure calculation, exported for tests. */
export async function summarize(transactions, cfg, fx) {
  const incomingCodes = new Set(cfg.incomingEventCodes);
  const counted = new Map(); // transaction_id -> payer account
  const byPayer = new Map(); // payer account -> net EUR
  let net = 0;

  const eur = async (info, field) => {
    const a = info[field];
    if (!a || a.value == null) return 0;
    const date = String(info.transaction_initiation_date || '').slice(0, 10);
    return fx.toEur(Number(a.value), a.currency_code, date);
  };

  const seen = new Set();
  const unique = transactions.filter((t) => {
    const id = t.transaction_info?.transaction_id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  // 1. Completed incoming payments: donations, subscription payments, checkout payments.
  for (const t of unique) {
    const info = t.transaction_info;
    if (!incomingCodes.has(info.transaction_event_code)) continue;
    if (info.transaction_status !== 'S') continue;
    const gross = await eur(info, 'transaction_amount');
    if (gross <= 0) continue;
    const payer = t.payer_info?.account_id || `txn:${info.transaction_id}`;
    const value = gross + (await eur(info, 'fee_amount')); // fee_amount is negative
    counted.set(info.transaction_id, payer);
    byPayer.set(payer, (byPayer.get(payer) || 0) + value);
    net += value;
  }

  // 2. Fees, refunds, reversals and chargebacks of those payments.
  for (const t of unique) {
    const info = t.transaction_info;
    const code = info.transaction_event_code || '';
    if (!ADJUSTMENT_PREFIXES.some((p) => code.startsWith(p)) || IGNORED_ADJUSTMENTS.has(code)) continue;
    const payer = counted.get(info.paypal_reference_id);
    if (!payer || counted.has(info.transaction_id)) continue;
    if (info.transaction_status === 'D' || info.transaction_status === 'V') continue;
    const value = (await eur(info, 'transaction_amount')) + (await eur(info, 'fee_amount'));
    byPayer.set(payer, byPayer.get(payer) + value);
    net += value;
  }

  const supporters = [...byPayer.values()].filter((v) => v > 0.005).length;
  return { supporters, contributions: round2(net) };
}

export async function collect(env, cfg, fx) {
  const base = env.PAYPAL_ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
  const end = new Date();
  const oldest = new Date(end.getTime() - (3 * 365 - 2) * DAY);
  const since = cfg.since ? new Date(cfg.since) : oldest;
  const start = since < oldest ? oldest : since;
  const accessToken = await token(base, env);
  const transactions = await listTransactions(base, accessToken, start, end);
  return summarize(transactions, cfg, fx);
}
