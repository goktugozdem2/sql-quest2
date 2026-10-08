// The Pro modal's order: plans first or features first (PLAN item 2,
// 2026-10-08; ledger "the plans above the fold").
//
// Measured before it (docs/funnel.md, 30 days to 10-06): 298 people saw the
// modal, 22 picked a plan. On a 1366x768 laptop the plan cards begin at
// y = 630 in a 768-px window — the prices peek in, the trial line and the
// buttons do not; on the 1272x588 and 1528x732 windows real visitors use,
// they are not on screen at all. 95% of modal viewers are on desktop. On a
// 375-px phone the cards begin at y = 1,203 below a nine-item, two-column
// feature list. 41% close the modal inside three seconds.
//
// Arm `plans_first`: the headline, then the plan cards with the trial line
// and the currency note, then "What you get with Pro". Arm `control`: today.
// Nothing else differs — copy, prices, order of the two plans, the email
// step and the quota wall's free road back are the same in both arms.
//
// Behind `modalPlansFirst` (dark until the founder's go — the modal is the
// money surface). Flag off: everyone is `control`, byte for byte today's
// modal. Flag on: half of browsers by aid, sticky (the hash is the record).

export const MODAL_LAYOUT_TEST_ID = 'modal_layout_v1';
export const MODAL_LAYOUT_ARMS = ['plans_first', 'control'];

// FNV-style hash + murmur3 finalizer, the same construction as
// companyAskArm: without the finalizer a two-arm split mirrors the
// first-screen test's arms for every aid (CLAUDE.md, the A/B hash trap).
export function modalLayoutHashArm(aid) {
  let h = 2166136261;
  const s = `${String(aid)}:${MODAL_LAYOUT_TEST_ID}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return MODAL_LAYOUT_ARMS[(h >>> 0) % MODAL_LAYOUT_ARMS.length];
}

export function modalLayoutArm({ flagOn = false, aid = null } = {}) {
  if (!flagOn || !aid) return 'control';
  return modalLayoutHashArm(aid);
}

export function plansFirst(arm) {
  return arm === 'plans_first';
}
