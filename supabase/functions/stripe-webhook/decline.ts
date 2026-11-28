// Why a card was refused — measurement only (2026-11-28).
//
// `pro_payment_failed` and `pro_card_setup_failed` said THAT a card failed,
// never why, so the India checkout read (docs/reads/india-checkout-2026-11-28.md
// §3c, FOUNDER DECISION 6) could count card friction and never explain it:
// a 3D Secure failure, an issuer decline, an off-session charge that needed
// the customer (an Indian card without an e-mandate) all looked the same.
// These read Stripe's own fields off the PaymentIntent (and its latest
// Charge) or the SetupIntent (and its latest SetupAttempt) into flat keys on
// the row. Nothing here decides anything: no branch reads these values.
// Pure, no imports; tests/stripe-webhook-attribution.test.js runs them.

type Obj = Record<string, unknown> | null | undefined;
const asObj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" ? v as Record<string, unknown> : null;
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export type FailureFields = {
  decline_code: string | null;      // issuer's reason (e.g. insufficient_funds, do_not_honor)
  error_code: string | null;        // Stripe's code (e.g. card_declined, authentication_required)
  failure_code: string | null;      // the Charge's failure_code
  error_type: string | null;        // card_error, invalid_request_error …
  intent_status: string | null;     // requires_payment_method, requires_action …
  next_action: string | null;       // use_stripe_sdk / redirect_to_url when the customer must act
  three_d_secure: boolean | null;   // null = nothing to read
  three_d_secure_result: string | null; // authenticated, failed, attempt_acknowledged …
  network_status: string | null;    // the Charge's outcome.network_status
  outcome_reason: string | null;    // the Charge's outcome.reason
};

const AUTH_CODES = new Set([
  "authentication_required",
  "payment_intent_authentication_failure",
  "setup_intent_authentication_failure",
]);
const ACTION_TYPES = new Set(["use_stripe_sdk", "redirect_to_url"]);

function fields(intent: Obj, error: Obj, attemptCard: Obj, charge: Obj): FailureFields {
  const tds = asObj(attemptCard?.three_d_secure);
  const outcome = asObj(charge?.outcome);
  const errorCode = str(error?.code);
  const declineCode = str(error?.decline_code);
  const status = str(intent?.status);
  const nextAction = str(asObj(intent?.next_action)?.type);
  const tdsResult = str(tds?.result);
  let threeDS: boolean | null = null;
  if (intent || error || charge) {
    threeDS = (errorCode !== null && AUTH_CODES.has(errorCode))
      || status === "requires_action"
      || (nextAction !== null && ACTION_TYPES.has(nextAction))
      || tds !== null;
  }
  return {
    decline_code: declineCode,
    error_code: errorCode,
    failure_code: str(charge?.failure_code),
    error_type: str(error?.type),
    intent_status: status,
    next_action: nextAction,
    three_d_secure: threeDS,
    three_d_secure_result: tdsResult,
    network_status: str(outcome?.network_status),
    outcome_reason: str(outcome?.reason),
  };
}

// A PaymentIntent (invoice.payment_intent, retrieved with latest_charge
// expanded). `charge` may be passed separately when it is not expanded.
export function paymentFailureFields(paymentIntent: unknown, charge: unknown = null): FailureFields {
  const pi = asObj(paymentIntent);
  const ch = asObj(charge) || asObj(pi?.latest_charge);
  const card = asObj(asObj(ch?.payment_method_details)?.card);
  return fields(pi, asObj(pi?.last_payment_error), card, ch);
}

// A SetupIntent (retrieved with latest_attempt expanded). Its error is
// `last_setup_error`; its attempt's card details carry the 3D Secure result.
export function setupFailureFields(setupIntent: unknown, attempt: unknown = null): FailureFields {
  const si = asObj(setupIntent);
  const at = asObj(attempt) || asObj(si?.latest_attempt);
  const card = asObj(asObj(at?.payment_method_details)?.card);
  const error = asObj(si?.last_setup_error) || asObj(at?.setup_error);
  return fields(si, error, card, null);
}

export const EMPTY_FAILURE_FIELDS: FailureFields = fields(null, null, null, null);
