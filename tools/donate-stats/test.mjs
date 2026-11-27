// Offline checks of the calculations with small sample reports. Run: bun tools/donate-stats/test.mjs
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { parseDelimited, decodeText, unzip } from './util.mjs';
import { summarize } from './paypal.mjs';
import { countFirstInstalls, summarizeEarnings } from './google-play.mjs';
import { summarizeSales, summarizeFinance } from './app-store.mjs';
import { summarizeDay } from './steam.mjs';

const fx = { toEur: async (a, cur) => (cur === 'USD' ? a / 1.25 : a) };
const money = (value, currency_code = 'EUR') => ({ value: String(value), currency_code });
const txn = (id, code, amount, fee, payer, ref, status = 'S') => ({
  transaction_info: {
    transaction_id: id, transaction_event_code: code, transaction_status: status,
    transaction_amount: money(amount), fee_amount: money(fee), paypal_reference_id: ref,
    transaction_initiation_date: '2026-10-01T10:00:00+0000',
  },
  payer_info: { account_id: payer },
});

// PayPal: monthly donor counted once, refunded donor not counted, pending and outgoing ignored.
const pp = await summarize(
  [
    txn('A1', 'T0002', 5, -0.5, 'P1'), txn('A2', 'T0002', 5, -0.5, 'P1'), txn('A2', 'T0002', 5, -0.5, 'P1'),
    txn('B1', 'T0013', 25, -1.2, 'P2'), txn('C1', 'T0006', 10, -0.7, 'P3'), txn('C2', 'T1107', -10, 0.3, 'P3', 'C1'),
    txn('D1', 'T0013', 50, -2, 'P4', null, 'P'), txn('E1', 'T0000', -20, 0, 'P5'), txn('F1', 'T1110', -25, 0, 'P2', 'B1'),
  ],
  { incomingEventCodes: ['T0002', 'T0006', 'T0011', 'T0013'] }, fx,
);
assert.deepEqual(pp, { supporters: 2, contributions: round(4.5 + 4.5 + 23.8 + 9.3 - 9.7) });

// Google Play installs (UTF-16 CSV with BOM) and earnings (zip).
const csv = 'Date,Package Name,Daily Device Installs,Daily Device Uninstalls,Daily Device Upgrades,Total User Installs\n'
  + '2026-10-01,com.x,3,1,40,0\n2026-10-02,com.x,2,0,12,0\n';
const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(csv, 'utf16le')]);
assert.equal(countFirstInstalls([decodeText(utf16)]), 5);
const earningsCsv = 'Description,Transaction Date,Transaction Type,Product id,Merchant Currency,Amount (Merchant Currency)\n'
  + 'GPA.1,"Oct 1, 2026",Charge,com.x,EUR,4.99\nGPA.1,"Oct 1, 2026",Google fee,com.x,EUR,-0.75\n'
  + 'GPA.2,"Oct 2, 2026",Charge,com.x,EUR,4.99\nGPA.2,"Oct 2, 2026",Google fee,com.x,EUR,-0.75\n'
  + 'GPA.2,"Oct 3, 2026",Charge refund,com.x,EUR,-4.99\nGPA.2,"Oct 3, 2026",Google fee refund,com.x,EUR,0.75\n'
  + 'GPA.3,"Oct 3, 2026",Charge,com.other,EUR,9.99\n';
const zip = makeZip('earnings.csv', Buffer.from(earningsCsv));
const rows = parseDelimited(decodeText(unzip(zip)['earnings.csv']));
assert.deepEqual(await summarizeEarnings(rows, new Set(['com.x']), fx), { purchases: 1, contributions: 4.24 });

// App Store Sales and Trends: first downloads, re-downloads and updates, paid units and refunds.
const sales = parseDelimited([
  'Apple Identifier\tParent Identifier\tProduct Type Identifier\tUnits\tCustomer Price',
  '111\t\t1\t10\t0', '111\t\t3\t4\t0', '111\t\t7\t30\t0', '222\t\t1F\t2\t2.99', '222\t\t1F\t-1\t-2.99', '999\t\t1\t50\t0',
].join('\n'), '\t');
assert.deepEqual(summarizeSales(sales, new Set(['111', '222'])), { players: 11, purchases: 1 });
const finance = parseDelimited('Apple Identifier\tExtended Partner Share\tPartner Share Currency\n222\t2.10\tUSD\n222\t1.50\tEUR\nTotal_Rows\t2\t\n', '\t');
assert.equal(await summarizeFinance(finance, new Set(['222']), fx, '2026-10-28'), 2.10 / 1.25 + 1.5);

// Steam: net units and net sales, other apps ignored.
assert.deepEqual(summarizeDay([
  { primary_appid: 2298350, net_units_sold: 3, net_sales_usd: '14.9700' },
  { primary_appid: 2298350, net_units_sold: -1, net_sales_usd: '-4.9900' },
  { appid: 1, net_units_sold: 9, net_sales_usd: '90.0000' },
  { primary_appid: 2298350, gross_units_activated: 10 },
], new Set(['2298350'])), { purchases: 2, netSalesUsd: 9.98 });

console.log('All donate-stats checks passed');

function round(n) { return Math.round(n * 100) / 100; }
function makeZip(name, data) {
  const comp = deflateRawSync(data), nameBuf = Buffer.from(name);
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8);
  local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuf.length, 26);
  const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10);
  central.writeUInt32LE(comp.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt32LE(0, 42);
  const cdOffset = local.length + nameBuf.length + comp.length;
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + nameBuf.length, 12); end.writeUInt32LE(cdOffset, 16);
  return Buffer.concat([local, nameBuf, comp, central, nameBuf, end]);
}
