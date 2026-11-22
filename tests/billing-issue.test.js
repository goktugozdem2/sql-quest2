// A failed Stripe charge gets its fix link in the app (M-01,
// docs/plans/monetization-ideas-2026-11-22.md). Pins: billingIssueLine
// answers only for a record carrying `billingIssue` with an
// https://invoice.stripe.com link, and the client's URL rule agrees with the
// webhook's on one table; the wiring reads the record in loadUserSession,
// sits above the early returns, is flagged, fires its two events, carries no
// accent, and links to the line's own URL.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { billingIssueLine, isStripeInvoiceUrl, billingIssueDays, BILLING_ISSUE_TEXT } from '../src/utils/billing-issue.js';
import { stripeInvoiceUrl } from '../supabase/functions/stripe-webhook/payment-failed-email.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');
const flags = fs.readFileSync(path.join(ROOT, 'src/data/feature-flags.js'), 'utf8');

const GOOD = 'https://invoice.stripe.com/i/acct_1AbC/live_YWNjdF8xQWJD';
const issue = (invoiceUrl, extra = {}) => ({ billingIssue: { since: '2026-11-20T10:00:00.000Z', invoiceUrl, subscriptionId: 'sub_1', ...extra } });

// One table, both rules: the app and the webhook must never disagree on what
// a fix link may be.
const URLS = [
  [GOOD, true],
  ['https://invoice.stripe.com/i/acct_1/test_x?s=ap', true],
  ['http://invoice.stripe.com/i/acct_1/x', false],
  ['https://invoice.stripe.com.evil.example/i/x', false],
  ['https://evilinvoice.stripe.com/i/x', false],
  ['https://pay.stripe.com/invoice/x', false],
  ['https://billing.stripe.com/p/login/x', false],
  ['https://user:pw@invoice.stripe.com/i/x', false],
  ['https://invoice.stripe.com:8443/i/x', false],
  ['javascript:alert(1)', false],
  ['//invoice.stripe.com/i/x', false],
  ['', false],
  [null, false],
  [undefined, false],
  [42, false],
  ['https://invoice.stripe.com/' + 'a'.repeat(2100), false],
];

describe('billingIssueLine', () => {
  it('returns the text and the invoice URL for a valid record', () => {
    expect(billingIssueLine(issue(GOOD))).toEqual({ text: BILLING_ISSUE_TEXT, url: GOOD });
    expect(BILLING_ISSUE_TEXT).toBe("Your card didn't go through — fix it in Stripe");
  });
  it('returns null without the field', () => {
    for (const ud of [null, undefined, {}, { proStatus: true }, { billingIssue: null }, { billingIssue: 'x' }, { billingIssue: {} }]) {
      expect(billingIssueLine(ud), JSON.stringify(ud)).toBeNull();
    }
  });
  it('returns null for any link that is not https://invoice.stripe.com', () => {
    for (const [u, ok] of URLS) {
      const got = billingIssueLine(issue(u));
      if (ok) expect(got?.url, String(u)).toBe(new URL(u).href);
      else expect(got, String(u)).toBeNull();
    }
  });
  it('the app and the webhook agree on every URL', () => {
    for (const [u, ok] of URLS) {
      expect(isStripeInvoiceUrl(u), `app: ${u}`).toBe(ok);
      expect(stripeInvoiceUrl(u) !== null, `webhook: ${u}`).toBe(ok);
    }
  });
  it('counts whole days since the webhook wrote it', () => {
    expect(billingIssueDays(issue(GOOD), Date.parse('2026-11-22T12:00:00Z'))).toBe(2);
    expect(billingIssueDays({}, Date.now())).toBeNull();
  });
});

describe('app.jsx wiring', () => {
  it('loadUserSession reads the record whatever the plan says, and sign-out clears it', () => {
    const at = app.indexOf('const loadUserSession = async');
    const load = app.slice(at, app.indexOf('if (userData.proStatus === true) {', at) + 40);
    expect(load).toContain("setBillingIssueRecord(userData.billingIssue && typeof userData.billingIssue === 'object' ? userData.billingIssue : null);");
    // set BEFORE the plan branch, so a lapsed trial still sees its invoice
    expect(load.indexOf('setBillingIssueRecord(')).toBeLessThan(load.indexOf('if (userData.proStatus === true) {'));
    expect((app.match(/setBillingIssueRecord\(null\);/g) || []).length).toBe(2);
  });
  it('the flag exists, ships on, and gates the line; hooks sit above the early returns', () => {
    expect(flags).toMatch(/\n {4}billingIssueLine: true,\n/);
    expect(app).toContain("const billingIssue = window.FF?.feature?.('billingIssueLine') === true\n    ? billingIssueLine({ billingIssue: billingIssueRecord })\n    : null;");
    const early = Math.min(app.indexOf('\n  if (showAuth) {'), app.indexOf('\n  if (!dbReady) return ('));
    expect(early).toBeGreaterThan(0);
    for (const k of ['const [billingIssueRecord, setBillingIssueRecord] = useState(null);', 'const billingIssue = window.FF', 'const billingIssueShownRef = useRef(null);', "trackActivationEvent('billing_issue_shown'"]) {
      expect(app.indexOf(k), k).toBeGreaterThan(0);
      expect(app.indexOf(k), k).toBeLessThan(early);
    }
  });
  it('billing_issue_shown fires once per page session per person, not once per browser', () => {
    const at = app.indexOf('const billingIssueShownRef = useRef(null);');
    const fx = app.slice(at, app.indexOf('}, [!!billingIssue, isSessionLoading, currentUser]);', at));
    expect(fx).toContain('if (billingIssueShownRef.current === who) return;');
    expect(fx).not.toContain('onceKey');
  });
  it('one line right under the header, linking to the line\'s own URL, with the click event and no accent', () => {
    const at = app.indexOf('data-testid="billing-issue-line"');
    expect(at).toBeGreaterThan(0);
    const block = app.slice(app.lastIndexOf('{billingIssue && (', at), app.indexOf('</div>', at));
    expect(block).toContain('href={billingIssue.url}');
    expect(block).toContain('{billingIssue.text}');
    expect(block).toContain('rel="noopener noreferrer"');
    expect(block).toContain("trackActivationEvent('billing_issue_clicked'");
    expect(block).not.toMatch(/FFE34D|F5C518|\.bp\b|bg-yellow|text-yellow/i);
    // first thing in the content column after </header>
    const header = app.lastIndexOf('</header>', at);
    expect(header).toBeGreaterThan(0);
    expect(app.slice(header, at)).not.toContain('data-testid=');
  });
});
