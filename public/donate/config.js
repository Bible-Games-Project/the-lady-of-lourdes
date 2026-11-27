/*
 * Donation settings for the Bible Games Project supporter page.
 *
 * Everything here is PUBLIC by design: a PayPal Client ID and plan IDs are meant to be
 * visible in the browser. NEVER put the PayPal *Secret* (or any other secret key) in
 * this file or anywhere else in the page.
 *
 * - paypalClientId: PayPal Developer Dashboard -> Apps & Credentials -> your app -> Client ID.
 *   Use the Sandbox Client ID to test with fake money, the Live one to accept real payments.
 *   While it is empty, one-time donations fall back to the PayPal campaign link below and
 *   monthly support shows as "coming soon".
 * - monthlyTiers[].planId: the "P-..." ID of a monthly subscription plan created in the same
 *   PayPal account (and the same Sandbox/Live mode) as the Client ID. A tier without a plan
 *   ID is shown as "coming soon".
 */
window.BGP_DONATE_CONFIG = {
  paypalClientId: '',
  currency: 'EUR',

  oneTimeAmounts: [5, 10, 25, 50],
  defaultOneTimeAmount: 10,
  minAmount: 1,
  maxAmount: 10000,

  monthlyTiers: [
    { amount: 3, name: 'Friend of Bible Games Project', planId: '' },
    { amount: 5, name: 'Supporter of Bible Games Project', planId: '' },
    { amount: 10, name: 'Patron of Bible Games Project', planId: '' },
    { amount: 25, name: 'Benefactor of Bible Games Project', planId: '' },
  ],
  defaultMonthlyTier: 1,

  // Existing PayPal donation campaign, used only while paypalClientId is empty.
  fallbackDonateUrl: 'https://www.paypal.com/donate?campaign_id=5MYZAE9BRQXQ2',

  brandName: 'Bible Games Project',
};
