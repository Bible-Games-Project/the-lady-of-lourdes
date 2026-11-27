// Steam: paid copies and net revenue from the Steamworks financial Web API
// (IPartnerFinancialsService). Unique players are only shown in the Steamworks dashboard
// ("Lifetime unique users"), so they come from manual.json.
// https://partner.steamgames.com/doc/webapi/IPartnerFinancialsService
import { http, round2, num } from './util.mjs';

const API = 'https://partner.steam-api.com/IPartnerFinancialsService';

export function isConfigured(env) {
  return Boolean(env.STEAM_FINANCIAL_API_KEY);
}

/** Pure calculation over one day of GetDetailedSales results, exported for tests. */
export function summarizeDay(results, appIds) {
  let purchases = 0, netSalesUsd = 0;
  for (const r of results) {
    const app = String(r.primary_appid ?? r.appid ?? '');
    if (appIds.size && !appIds.has(app)) continue;
    purchases += num(r.net_units_sold); // units sold minus units returned
    netSalesUsd += num(r.net_sales_usd); // sales minus returns and taxes, before Valve's share
  }
  return { purchases, netSalesUsd: round2(netSalesUsd) };
}

export async function collect(env, cfg, fx, state) {
  const key = encodeURIComponent(env.STEAM_FINANCIAL_API_KEY);
  const appIds = new Set((cfg.appIds || []).map(String));
  state.days ||= {};

  const changed = await (await http(`${API}/GetChangedDatesForPartner/v001/?key=${key}&highwatermark=${state.highwatermark || 0}`)).json();
  for (const date of changed.response?.dates || []) {
    const results = [];
    for (let mark = 0; ;) {
      const body = await (await http(`${API}/GetDetailedSales/v001/?key=${key}&date=${date}&highwatermark_id=${mark}`)).json();
      results.push(...(body.response?.results || []));
      const max = Number(body.response?.max_id || 0);
      if (!max || max === mark) break;
      mark = max;
    }
    state.days[date] = summarizeDay(results, appIds);
  }
  if (changed.response?.result_highwatermark) state.highwatermark = changed.response.result_highwatermark;

  let purchases = 0, contributions = 0;
  for (const [date, day] of Object.entries(state.days)) {
    purchases += day.purchases;
    contributions += await fx.toEur(day.netSalesUsd * cfg.developerShare, 'USD', date.replace(/\//g, '-'));
  }
  return { purchases, contributions: round2(contributions) };
}
