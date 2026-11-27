# Supporter page statistics job

Refreshes the three figures of the supporter page (`public/donate/`) once a day, from the
official reports of each platform, and writes `public/donate/data/stats.json`. How each
figure is defined is explained in [`public/donate/STATS.md`](../../public/donate/STATS.md).

- `update.mjs`: the job. Run it with `bun tools/donate-stats/update.mjs` (or Node 20+).
- `paypal.mjs`, `google-play.mjs`, `app-store.mjs`, `steam.mjs`: one collector per platform.
- `config.json`: which apps and packages are Bible Games Project's (public IDs only).
- `manual.json`: figures that no API provides (Steam lifetime unique users), with their date.
- `state.json`: cached monthly/daily aggregates (no personal data), kept by the job.
- `daily-stats.workflow.yml`: GitHub Actions schedule. **Not active**: see below.
- `test.mjs`: offline checks of the calculations with sample reports (`bun tools/donate-stats/test.mjs`).

## Status

The collectors follow the platforms' official documentation but have **not been run
against real accounts yet**: no credentials exist so far. Expect to check the first real
run's log for each platform.

## Credentials (environment variables / CI secrets — never in a file)

| Variable | Where to get it |
|---|---|
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | PayPal Developer Dashboard > Apps & Credentials > Live app with the *Transaction search* feature enabled. Optional `PAYPAL_ENV=sandbox` for testing. |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Google Cloud service account key (JSON), invited in Play Console > Users and permissions with *View app information* and *View financial data*. |
| `GOOGLE_PLAY_REPORTS_BUCKET` | Play Console > Download reports > *Copy Cloud Storage URI*: the `pubsite_prod_...` part. |
| `APP_STORE_ISSUER_ID`, `APP_STORE_KEY_ID`, `APP_STORE_PRIVATE_KEY` | App Store Connect > Users and Access > Integrations > App Store Connect API: team key with the *Finance* role (the `.p8` file content). |
| `APP_STORE_VENDOR_NUMBER` | App Store Connect > Payments and Financial Reports (top left). |
| `STEAM_FINANCIAL_API_KEY` | Steamworks > Users & Permissions > Manage Groups > a *Financial API Group* > Web API key. |

## Switching on the daily schedule

1. Add the secrets above to the GitHub repository (Settings > Secrets and variables > Actions).
2. Copy `daily-stats.workflow.yml` to `.github/workflows/donate-stats.yml`.
3. Run it once by hand (Actions > Supporter page statistics > Run workflow) and read the log.

The job commits only when a figure changed, then starts the preview deploy.
