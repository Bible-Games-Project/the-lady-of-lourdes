// Shared helpers for the daily statistics job: HTTP, CSV/TSV parsing, zip, currency rates.
import { inflateRawSync } from 'node:zlib';

export const round2 = (n) => Math.round(n * 100) / 100;
export const isoDate = (d) => d.toISOString().slice(0, 10);

/** fetch() that throws on HTTP errors with a short message (never the response body). */
export async function http(url, options = {}, { allow404 = false, retries = 2 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, options);
    if (allow404 && res.status === 404) return null;
    if (res.ok) return res;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= retries) {
      throw new Error(`HTTP ${res.status} from ${new URL(url).host}${new URL(url).pathname}`);
    }
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
}

/** Decodes report bytes: UTF-16 (Google Play statistics) or UTF-8, without a BOM. */
export function decodeText(buf) {
  const b = Buffer.from(buf);
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(b.subarray(2));
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(b.subarray(2));
  const text = new TextDecoder('utf-8').decode(b);
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Parses delimited text into objects keyed by the header row (RFC 4180 quoting). */
export function parseDelimited(text, delimiter = ',') {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === delimiter) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ''));
  if (!nonEmpty.length) return [];
  const header = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

/** Number from a report cell ("1,234.50", "-3", ""). */
export function num(v) {
  if (v == null || v === '') return 0;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Minimal zip reader (stored or deflated entries) for Google Play earnings reports. */
export function unzip(buf) {
  const b = Buffer.from(buf);
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
    if (b.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a zip file');
  const count = b.readUInt16LE(eocd + 10);
  let p = b.readUInt32LE(eocd + 16);
  const files = {};
  for (let n = 0; n < count; n++) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error('Bad zip directory');
    const method = b.readUInt16LE(p + 10);
    const compSize = b.readUInt32LE(p + 20);
    const nameLen = b.readUInt16LE(p + 28), extraLen = b.readUInt16LE(p + 30), commentLen = b.readUInt16LE(p + 32);
    const local = b.readUInt32LE(p + 42);
    const name = b.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    const dataStart = local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28);
    const data = b.subarray(dataStart, dataStart + compSize);
    if (method === 0) files[name] = Buffer.from(data);
    else if (method === 8) files[name] = inflateRawSync(data);
    else throw new Error(`Unsupported zip compression ${method}`);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

/**
 * Euro conversion with the European Central Bank reference rates (the official daily
 * EUR exchange rates). For a weekend or holiday, the last published rate before it is used.
 */
export function createFx() {
  const series = new Map(); // currency -> sorted [[date, rate]]
  async function load(cur) {
    if (series.has(cur)) return series.get(cur);
    const url = `https://data-api.ecb.europa.eu/service/data/EXR/D.${cur}.EUR.SP00.A?format=csvdata&startPeriod=2015-01-01`;
    const res = await http(url);
    const rows = parseDelimited(await res.text())
      .map((r) => [r.TIME_PERIOD, Number(r.OBS_VALUE)])
      .filter(([d, v]) => d && v > 0)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1));
    if (!rows.length) throw new Error(`No ECB rates for ${cur}`);
    series.set(cur, rows);
    return rows;
  }
  return {
    /** Converts `amount` in `currency` on `date` (YYYY-MM-DD) to euros. */
    async toEur(amount, currency, date) {
      const cur = String(currency || '').toUpperCase();
      if (!amount || cur === 'EUR') return amount;
      const rows = await load(cur);
      let rate = null;
      for (const [d, v] of rows) { if (d <= date) rate = v; else break; }
      if (rate == null) throw new Error(`No ECB rate for ${cur} on ${date}`);
      return amount / rate;
    },
  };
}
