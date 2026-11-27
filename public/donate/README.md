# Bible Games Project — supporter page

A standalone static page (plain HTML + CSS + JS, no build step, no server, no
dependencies). It is **not part of the game**; it only lives in this repo
temporarily so it can be previewed at `/donate/` on the game's preview site.
To move it to its own site or custom domain, copy this whole folder and serve
`index.html` from the root. When it gets its own domain, change `og:image` in
`index.html` to an absolute URL.

## Editing the content

- `data/games.js` — the games shown in "Our games" and in the hero. Add a game by copying
  an entry. Use only real artwork from each game (in `assets/games/`). A game without an
  image shows a clearly marked "Artwork coming soon" placeholder.
- `data/stats.json` — the three community figures. `null` = not verified yet (shown as
  "—"). See `STATS.md` for how every figure is calculated and for the planned daily refresh.
- `config.js` — donation amounts, monthly tiers and PayPal settings.

## How donating works

`donate.js` opens a dialog: one-time (€5/10/25/50 or a custom amount) or
monthly (the tiers in `config.js`), then renders the official PayPal JavaScript
SDK buttons. PayPal runs the checkout (popup or redirect) and the page only
shows "thank you" after PayPal confirms: a one-time order must come back from
capture as `COMPLETED` (or `PENDING`, shown as "still processing"); a monthly
subscription must be approved by PayPal.

All settings are in `config.js` and are public by design:

- `paypalClientId` — the PayPal app's **Client ID** (Sandbox to test, Live for
  real money). Never put the PayPal **Secret** anywhere in this page.
- `monthlyTiers[].planId` — one PayPal subscription plan (`P-...`) per tier,
  created in the same PayPal account and mode as the Client ID.

While `paypalClientId` is empty, one-time donations send people to the existing
PayPal campaign link (they confirm the amount on PayPal) and monthly tiers show
"Coming soon". Nothing is ever simulated.

There is no server: no webhooks, no stored records. Donation and subscription
history lives in the PayPal account itself.

Images in `assets/img/` were generated for this page. Fonts in `assets/fonts/`
are self-hosted (SIL Open Font License, see the license files).
