#!/usr/bin/env node
/*
 * Daily refresh of the community statistics on the supporter page.
 *
 * Reads each platform's official reports with credentials from environment variables,
 * and writes public/donate/data/stats.json. A platform without credentials is skipped. A
 * platform that fails keeps its last verified figures and date, so the page can mark them
 * as possibly out of date. Nothing is estimated. See README.md and public/donate/STATS.md.
 *
 * Usage: node tools/donate-stats/update.mjs   (or bun)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFx } from './util.mjs';
import * as paypal from './paypal.mjs';
import * as googlePlay from './google-play.mjs';
import * as appStore from './app-store.mjs';
import * as steam from './steam.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const STATS_FILE = path.resolve(here, '../../public/donate/data/stats.json');
const STATE_FILE = path.join(here, 'state.json');
const readJson = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback);

const config = readJson(path.join(here, 'config.json'));
const manual = readJson(path.join(here, 'manual.json'), {});
const stats = readJson(STATS_FILE);
const state = readJson(STATE_FILE, {});
const fx = createFx();
const env = process.env;
const now = new Date().toISOString();

const collectors = { paypal, googlePlay, appStore, steam };
let anyVerified = false;
let failures = 0;

for (const [id, collector] of Object.entries(collectors)) {
  const record = stats.platforms[id];
  if (!collector.isConfigured(env)) {
    record.status = 'not-configured';
    console.log(`${record.name}: not configured, skipped`);
    continue;
  }
  try {
    state[id] ||= {};
    const figures = await collector.collect(env, config[id], fx, state[id]);
    Object.assign(record, figures, { status: 'ok', verifiedAt: now });
    anyVerified = true;
    console.log(`${record.name}: ${JSON.stringify(figures)}`);
  } catch (err) {
    // Keep the last verified figures and their date; the page flags them as possibly outdated.
    record.status = 'error';
    failures++;
    console.error(`${record.name}: failed (${err.message}); keeping figures verified at ${record.verifiedAt}`);
  }
}

// Steam unique players are only available in the Steamworks dashboard.
const steamUsers = manual.steam?.lifetimeUniqueUsers;
if (Number.isFinite(steamUsers) && manual.steam?.asOf) {
  stats.platforms.steam.players = steamUsers;
  stats.platforms.steam.playersAsOf = manual.steam.asOf;
}

if (anyVerified) stats.updatedAt = now;
fs.writeFileSync(STATS_FILE, `${JSON.stringify(stats, null, 2)}\n`);
fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
console.log(anyVerified ? `stats.json updated (${now})` : 'No platform verified; stats.json figures unchanged');
if (failures) process.exitCode = 1;
