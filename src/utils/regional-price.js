// Regional price (founder's Go, 2026-09-26): India pays $9 a month / $39 a
// year; everyone else sees today's $29 / $99, byte for byte.
//
// Why India: 42% of the people shown the Pro modal in the 30 days to
// 2026-09-24 had an Indian timezone, and India's shown → plan-click rate was
// 3.6% (docs/plans/monetization-2026-09-24.md, finding 1). O1 counts payers,
// so a price that converts beats a price that does not, even at a lower
// average.
//
// The region comes from Vercel's `x-vercel-ip-country` header through
// /api/geo/ — the server's reading of the request, never the browser's
// language or timezone. The Stripe prices live under the EXISTING Monthly
// and Annual products, so stripe-webhook's product mapping gives the right
// plan length (ids in docs/plans/monetization-2026-09-24.md).
//
// Every price the modal shows, and the annual badge, is computed here, so a
// price change is one edit and tests/checkout-surface.test.js binds the
// arithmetic for every region.

export const PRICE_TABLE = {
  default: { monthly: 29, annual: 99 },
  IN: { monthly: 9, annual: 39 },
};

export const REGIONAL_COUNTRIES = { IN: 'IN' };

/** 'IN' when the flag is on and the server says India; 'default' otherwise. */
export function priceRegionFor(country, flagOn) {
  if (!flagOn) return 'default';
  const c = typeof country === 'string' ? country.trim().toUpperCase() : '';
  return REGIONAL_COUNTRIES[c] || 'default';
}

const money = n => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

/** What the plan cards say for a region. */
export function planPrices(region = 'default') {
  const p = PRICE_TABLE[region] || PRICE_TABLE.default;
  const annualPerMonth = Math.round((p.annual / 12) * 100) / 100;
  const savePct = Math.round((1 - p.annual / (p.monthly * 12)) * 100);
  return {
    region: PRICE_TABLE[region] ? region : 'default',
    monthly: money(p.monthly),
    monthlyPerMonth: `${money(p.monthly)}/month`,
    annual: money(p.annual),
    annualPerMonth: `${money(annualPerMonth)}/month`,
    saveBadge: `SAVE ${savePct}%`,
  };
}

/** The checkout link for a plan in a region; falls back to the default link. */
export function checkoutLinkFor(plan, region, linksByRegion) {
  const regional = region !== 'default' ? linksByRegion?.[region]?.[plan] : null;
  return regional || linksByRegion?.default?.[plan] || null;
}

// The Debug set, sold on its own (founder's decision 2026-11-23, PR #251):
// $9 once, India $3; Pro includes it. A ONE-TIME price, so it lives beside
// PRICE_TABLE rather than in it — PRICE_TABLE's rows are the two
// subscription plans and the SAVE badge is computed from them. The region is
// the same one the plans are priced with (priceRegionFor). The Stripe prices
// are STRIPE_PRICE_DEBUG_PACK / STRIPE_PRICE_DEBUG_PACK_IN on
// create-checkout-session; tests/debug-pack.test.js binds the two.
export const DEBUG_PACK_PRICE = { default: 9, IN: 3 };

/** The pack's price text for a region ("$9"); unknown regions get the default. */
export function debugPackPrice(region = 'default') {
  const n = Object.prototype.hasOwnProperty.call(DEBUG_PACK_PRICE, region) ? DEBUG_PACK_PRICE[region] : DEBUG_PACK_PRICE.default;
  return money(n);
}
