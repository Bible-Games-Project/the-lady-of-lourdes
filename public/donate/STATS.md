# Community statistics — how they are calculated

The three figures in the "Our community" section come from `data/stats.json`.
The page adds up the sources that have a number and lists them under each figure
("Includes Google Play · App Store"). A source set to `null` is left out. If no
source of a figure has a number, the page shows "—" in grey. Nothing is ever
estimated, rounded up or filled in.

## The figures

### Players reached
Sum of:
- **Google Play**: users who installed each game (the "user installs" metric of
  the Play Console statistics reports). Re-installs on the same account are not counted again.
- **App Store**: first-time downloads (App Store Connect Sales and Trends, product types for
  first-time downloads only; updates and re-downloads are excluded).
- **Steam**: copies activated (Steamworks sales/activations reports).

Limitation: no platform gives us unique *people*, and we cannot link the same person across
platforms. The page says so ("Downloads and copies…") instead of claiming unique players.

### Supporters & purchases
Sum of:
- **PayPal donors**: distinct PayPal payer accounts that made at least one completed,
  non-refunded donation or subscription payment. A person who gives every month counts once.
- **Store purchases**: paid game purchases on Google Play, the App Store and Steam, minus refunds.

Limitation: stores do not tell us who buys a game, so a buyer who also donates may be counted
twice. That is why the page calls this figure "Supporters & purchases" and not "people".

### Total contributions
Net amount received, in euros:
- **PayPal**: completed donations and subscription payments, minus PayPal fees, refunds,
  reversals and chargebacks.
- **Google Play / App Store / Steam**: developer proceeds (after the store's commission and
  taxes it withholds), minus refunds.

Amounts in other currencies use the exchange rate reported by each platform in its own
financial report. Each transaction is counted once, keyed by its platform transaction ID.

## `data/stats.json`

```json
{
  "updatedAt": "2026-11-27T06:00:00Z",
  "currency": "EUR",
  "stats": {
    "playersReached":     { "sources": { "googlePlay": 0, "appStore": 0, "steam": 0 } },
    "supporters":         { "sources": { "paypalDonors": 0, "storePurchases": 0 } },
    "totalContributions": { "sources": { "paypal": 0, "googlePlay": 0, "appStore": 0, "steam": 0 } }
  }
}
```

`updatedAt` is the time of the last successful refresh and is shown as "Last updated".
Until an automatic refresh exists, the figures can be entered by hand from each platform's
official reports. Only enter numbers copied from those reports.

## Automatic daily refresh (planned, not built yet)

It needs credentials that only the account owners can create, and it can't be tested
until they exist. The official data sources are:

| Platform | Official source | Credentials needed |
|---|---|---|
| PayPal | Transaction Search API (`/v1/reporting/transactions`): payer ID, gross, fee and refunds per transaction; at most 31 days per request | REST app Client ID + Secret with Transaction Search enabled |
| Google Play | Statistics and earnings reports exported by Play Console to its Google Cloud Storage bucket | Google Cloud service account invited in Play Console with access to reports |
| App Store | App Store Connect API: Sales and Trends reports (`salesReports`) and finance reports (`financeReports`) | App Store Connect API key (Issuer ID, Key ID, .p8 file) with the Sales/Finance role |
| Steam | Steamworks partner Web API, financial reports (`IPartnerFinancialsService`) | Steamworks Financial API Group Web API key |

Planned design: a scheduled job runs once a day. For each platform it fetches new report
data and stores it as dated raw records, removing duplicates by transaction or report ID.
It then recomputes the totals and writes `data/stats.json` with the new `updatedAt`. If a
platform fails, the job keeps that platform's last verified figure, reports the error and
does not change `updatedAt` for it. Secrets must live in the hosting/CI secret store. They
must never be in this folder: everything here is public.
