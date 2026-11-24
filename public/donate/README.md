# Bible Games Project — donation landing page

A standalone static page (plain HTML + CSS, no build step, no dependencies).
It is **not part of the game**; it only lives in this repo temporarily so it can
be previewed at `/donate/` on the game's preview site.

To move it to its own site or custom domain, copy this whole folder and serve
`index.html` from the root. Nothing else is needed. When it gets its own domain,
change `og:image` in `index.html` to an absolute URL.

- Every donation button links to the existing PayPal campaign
  (`https://www.paypal.com/donate?campaign_id=5MYZAE9BRQXQ2`) in the same tab.
  There is no payment handling on the page itself.
- Images in `assets/img/` were generated for this page. Fonts in
  `assets/fonts/` are self-hosted (SIL Open Font License, see the license files).
