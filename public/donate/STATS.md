# Community statistics — how they are calculated

The three figures in the "Our community" section come from `data/stats.json`, which the daily
job in [`tools/donate-stats/`](../../tools/donate-stats/README.md) writes from each platform's
official reports. Each platform has its own figures and the date they were last verified. The
page adds up the platforms that have a number, lists them under each figure ("Includes PayPal ·
Steam"), and shows "—" while no platform has one. Nothing is estimated or rounded up (money is
rounded down to whole euros).

## Players reached

What platforms report, and why most of it is not "people":

| Metric | What it counts | Used? |
|---|---|---|
| Downloads / install events | Every download, including re-downloads and re-installs | No |
| Updates | Existing players updating | No |
| Device installs (Google Play "Daily Device Installs") | Devices installing the game for the first time | **Google Play** |
| First-time downloads (App Store product types 1, 1F, 1T, F1, 1E…) | Once per Apple ID per app | **App Store** |
| Active users / active devices | Who is playing in a period, not total reach | No |
| Activated copies (Steam CD keys) | Keys redeemed, played or not | No |
| Lifetime unique users (Steamworks) | Steam accounts that launched the game | **Steam** |

- **Google Play** — sum of "Daily Device Installs" from the monthly installs reports. Google
  retired its per-account figures ("Total User Installs" is now always 0), so one person with
  two devices counts twice.
- **App Store** — first-time downloads from Sales and Trends; refunds (negative units) are
  subtracted, re-downloads (3, 3F, 3T, F3) and updates (7, 7F, 7T, F7) are excluded.
- **Steam** — "Lifetime unique users" summed over our games. No Steamworks Web API returns it,
  so it is read from the Steamworks dashboard and entered in `tools/donate-stats/manual.json`
  with its date; the page flags it when it is more than two days old.

**Limitation (stated on the page):** no platform identifies people across platforms or across
games, so someone who plays two of our games, or on two platforms, counts more than once.

## Supporters & purchases

- **PayPal** — distinct PayPal payer accounts with completed donations or subscription payments
  (event codes T0002, T0006, T0011, T0013, status S). Someone who gives monthly *and* once counts
  once. A donor whose payments were all refunded or charged back is not counted.
- **Purchases** — paid purchases, minus refunds: Google Play orders with a "Charge" and no
  "Charge refund"; App Store paid units (refunds are negative); Steam `net_units_sold`. Free
  downloads are not purchases.

The stores never identify buyers, so a buyer who also donates counts as one supporter and one
purchase. That is why the figure is called "Supporters & purchases", not "people".

## Total contributions (EUR, net)

- **PayPal** — completed payments plus their fees (negative), refunds, reversals and chargebacks
  linked by `paypal_reference_id`. Temporary holds (T1110/T1111) are ignored.
- **Google Play** — sum of "Amount (Merchant Currency)" in the monthly earnings reports for our
  packages: charges, Google's fee, withheld taxes and refunds.
- **App Store** — "Extended Partner Share" in the consolidated Finance reports (proceeds after
  Apple's commission and taxes, refunds included).
- **Steam** — `net_sales_usd` (sales minus returns and taxes) × the developer share in
  `config.json` (70%, Valve's standard revenue share).

Each transaction or report line is counted once (by transaction ID, order ID, or report period).
Other currencies are converted with the European Central Bank reference rate of the
transaction's date (App Store: the end of the report month). This is the only conversion, so the
total may differ from the bank payouts by a few cents per transaction. Store earnings reports are
monthly: the current month's sales appear in early next month.

## `data/stats.json`

```json
{
  "updatedAt": "2026-11-27T05:30:00Z",
  "currency": "EUR",
  "platforms": {
    "paypal":     { "name": "PayPal", "status": "ok", "verifiedAt": "…", "supporters": 0, "contributions": 0 },
    "googlePlay": { "name": "Google Play", "status": "ok", "verifiedAt": "…", "players": 0, "purchases": 0, "contributions": 0 },
    "appStore":   { "name": "App Store", "status": "ok", "verifiedAt": "…", "players": 0, "purchases": 0, "contributions": 0 },
    "steam":      { "name": "Steam", "status": "ok", "verifiedAt": "…", "players": 0, "playersAsOf": "2026-11-20", "purchases": 0, "contributions": 0 }
  }
}
```

- `updatedAt` — last run in which at least one platform was verified ("Last updated").
- `verifiedAt` / `<field>AsOf` — when that platform's figures were last verified. Older than two
  days → the page says "<Platform> figures were last verified on … and may be out of date."
- `status` — `ok`, `error` (last run failed; figures kept) or `not-configured`.
- `null` — not verified: the platform is left out of that figure.

Until the daily job runs, figures can be entered by hand from each platform's official
dashboard, with `verifiedAt` set to the date they were read. Only enter numbers copied from
those reports.
