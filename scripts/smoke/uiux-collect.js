// In-page collectors for the UI/UX audit (scripts/smoke/uiux-audit.mjs).
// Plain browser JavaScript, no imports: each function is passed to
// page.evaluate and runs inside the page. They only MEASURE; every judgement
// is made in scripts/smoke/uiux-checks.mjs.
/* eslint-disable no-undef */

// Shared helpers, installed once per document as window.__uiux.
export function installHelpers() {
  if (window.__uiux) return true;
  const ACCENTS = [[255, 227, 77], [245, 197, 24]];
  const parse = (s) => {
    const m = String(s || '').match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?/);
    return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null;
  };
  const isAccent = (s) => { const c = parse(s); return !!c && c[3] >= 0.5 && ACCENTS.some(a => Math.abs(a[0] - c[0]) <= 2 && Math.abs(a[1] - c[1]) <= 2 && Math.abs(a[2] - c[2]) <= 2); };
  const yellowish = (s) => { const c = parse(s); return !!c && c[3] > 0.3 && c[0] > 200 && c[1] > 150 && c[2] < 130; };
  const cssEsc = (s) => String(s).replace(/([^a-zA-Z0-9_-])/g, '\\$1');
  // A readable signature, not a unique path: tag + up to two classes, under
  // the nearest landmark (id, data-testid, header/nav/footer/main/dialog).
  const short = (el) => {
    if (!el || el.nodeType !== 1) return '?';
    if (el.id && !/^\d/.test(el.id)) return '#' + cssEsc(el.id);
    const tid = el.getAttribute('data-testid');
    if (tid) return `[data-testid="${tid}"]`;
    const tag = el.tagName.toLowerCase();
    const cls = [...el.classList].filter(c => !/^(hover|focus|active|group|transition|duration|animate)/.test(c)).slice(0, 2).map(c => '.' + cssEsc(c)).join('');
    return tag + cls;
  };
  const LANDMARK = 'header,nav,footer,main,aside,[role=dialog],[aria-modal=true],[data-testid],[id]';
  const sel = (el) => {
    if (!el || el.nodeType !== 1) return '?';
    const own = short(el);
    if (own.startsWith('#') || own.startsWith('[data-testid')) return own;
    const lm = el.parentElement && el.parentElement.closest(LANDMARK);
    if (!lm || lm === document.body || lm === document.documentElement) return own;
    return short(lm) + ' ' + own;
  };
  const opacityChain = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity || '1'); return o; };
  const visible = (el) => {
    if (!el || !el.getClientRects().length) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.visibility === 'collapse' || cs.display === 'none') return false;
    if (el.closest('[aria-hidden="true"],[inert]')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    return opacityChain(el) > 0.05;
  };
  const rect = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
  const PRIMARY_TESTIDS = '[data-testid="plan-annual"],[data-testid="plan-monthly"],[data-primary]';
  const INTERACTIVE = 'a[href],button,input:not([type=hidden]),select,textarea,[role=button],summary';
  const isPrimary = (el) => {
    const cs = getComputedStyle(el);
    // The accent background IS the primary CTA (DESIGN.md's one allowed
    // use); the Pro modal's plan cards are its primary buttons without it.
    return isAccent(cs.backgroundColor) || el.classList.contains('bp') || el.matches(PRIMARY_TESTIDS);
  };
  const openModal = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const cands = [...document.querySelectorAll('[role=dialog],[aria-modal=true],body *')].filter(el => {
      if (!visible(el)) return false;
      if (el.matches('[role=dialog],[aria-modal=true]')) return true;
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed') return false;
      const r = el.getBoundingClientRect();
      return r.width >= vw * 0.9 && r.height >= vh * 0.9;
    });
    return cands[cands.length - 1] || null;
  };
  window.__uiux = { parse, isAccent, yellowish, sel, visible, rect, opacityChain, INTERACTIVE, isPrimary, openModal };
  return true;
}

// Everything that does not move the page.
export function collectStatic() {
  const U = window.__uiux;
  const vw = window.innerWidth;
  const interactive = [];
  for (const el of document.querySelectorAll(U.INTERACTIVE)) {
    const vis = U.visible(el);
    if (!vis) continue;
    // A sideways scroller (auto/scroll) lets a person reach the element; a
    // clipping ancestor (hidden/clip) does not — the mock's Quit button sat
    // past a hidden-overflow window edge (2026-11-22).
    let inScroller = false;
    let clippedBy = null;
    const er = el.getBoundingClientRect();
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/auto|scroll/.test(cs.overflowX) && p.scrollWidth > p.clientWidth + 1) { inScroller = true; break; }
      if (/hidden|clip/.test(cs.overflowX)) {
        const pr = p.getBoundingClientRect();
        // A clip box of 3 px or less is a visually hidden wrapper (CodeMirror's input textarea).
        if (pr.width <= 3 || pr.height <= 3) { clippedBy = 'hidden'; break; }
        if (er.right > pr.right + 1 || er.left < pr.left - 1) { clippedBy = U.sel(p); break; }
      }
    }
    if (clippedBy === 'hidden') continue;
    const cs = getComputedStyle(el);
    let inlineText = false;
    if (el.tagName === 'A' && cs.display === 'inline') {
      const parent = el.parentElement;
      const own = (el.textContent || '').trim().length;
      const all = parent ? (parent.textContent || '').trim().length : 0;
      inlineText = all > own + 10;
    }
    interactive.push({ selector: U.sel(el), rect: U.rect(el), visible: true, inScroller, clippedBy, inlineText, disabled: !!el.disabled });
  }

  // Text: every element that directly holds a non-empty text node.
  const texts = [];
  const styled = [];
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue || !n.nodeValue.trim()) continue;
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION)$/.test(el.tagName)) continue;
    if (!U.visible(el)) continue;
    // Text inside a box narrower than 2 px is a visually hidden helper.
    const r = el.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2) continue;
    const cs = getComputedStyle(el);
    const bgStack = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const ecs = getComputedStyle(e);
      bgStack.push({ color: ecs.backgroundColor, image: ecs.backgroundImage && ecs.backgroundImage !== 'none' });
      if (U.parse(ecs.backgroundColor) && U.parse(ecs.backgroundColor)[3] >= 1) break;
    }
    const len = (el.textContent || '').trim().length;
    // Running text, not chrome: footer, nav and header lines, captions and
    // breadcrumbs are labels whatever their tag.
    const chrome = !!el.closest('footer,nav,header,figcaption,small,[class*="crumb"]');
    const body = !chrome && (/^(P|LI|TD|DD|BLOCKQUOTE)$/.test(el.tagName) || (len >= 40 && /block|list-item|table-cell/.test(cs.display) && !el.closest('button,a,label')));
    texts.push({
      selector: U.sel(el), visible: true,
      fontSize: parseFloat(cs.fontSize), fontWeight: cs.fontWeight,
      color: cs.color, opacity: U.opacityChain(el), bgStack, body,
    });
    styled.push({ selector: U.sel(el), visible: true, fontFamily: cs.fontFamily, background: 'transparent', borderColors: [], interactive: !!el.closest('a,button') });
  }
  // Accent backgrounds and borders, on any element.
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    const borders = ['Top', 'Right', 'Bottom', 'Left'].filter(s => parseFloat(cs['border' + s + 'Width']) > 0).map(s => cs['border' + s + 'Color']);
    if (!U.yellowish(cs.backgroundColor) && !borders.some(U.yellowish)) continue;
    if (!U.visible(el)) continue;
    styled.push({ selector: U.sel(el), visible: true, fontFamily: '', background: cs.backgroundColor, borderColors: borders, interactive: !!el.closest('a,button,[role=button]') });
  }

  // Boxes that clip their own overflow and hold text: how far the text runs past the box.
  const clipBoxes = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    const clipX = /hidden|clip/.test(cs.overflowX);
    const clipY = /hidden|clip/.test(cs.overflowY);
    if (!clipX && !clipY) continue;
    if (!(el.textContent || '').trim()) continue;
    if (!U.visible(el)) continue;
    const box = el.getBoundingClientRect();
    const inner = { left: box.left + el.clientLeft, top: box.top + el.clientTop };
    inner.right = inner.left + el.clientWidth; inner.bottom = inner.top + el.clientHeight;
    let maxR = inner.right, maxB = inner.bottom;
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let n2 = 0;
    for (let t = tw.nextNode(); t && n2 < 400; t = tw.nextNode()) {
      if (!t.nodeValue.trim()) continue;
      const p = t.parentElement;
      if (!p || !U.visible(p)) continue;
      // Text in a nested scroller or clipper is that box's business.
      let nested = false;
      for (let a = p; a && a !== el; a = a.parentElement) { const acs = getComputedStyle(a); if (acs.overflowX !== 'visible' || acs.overflowY !== 'visible' || acs.position === 'fixed') { nested = true; break; } }
      if (nested) continue;
      n2++;
      range.selectNodeContents(t);
      for (const rr of range.getClientRects()) { if (rr.width < 1) continue; maxR = Math.max(maxR, rr.right); maxB = Math.max(maxB, rr.bottom); }
    }
    const ellipsis = cs.textOverflow === 'ellipsis' || [...el.querySelectorAll('*')].some(c => getComputedStyle(c).textOverflow === 'ellipsis');
    const lineClamp = (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') || false;
    clipBoxes.push({
      selector: U.sel(el), visible: true, clipX, clipY, ellipsis, lineClamp,
      clientWidth: el.clientWidth, clientHeight: el.clientHeight,
      scrollWidth: Math.round(el.clientWidth + Math.max(0, maxR - inner.right)),
      scrollHeight: Math.round(el.clientHeight + Math.max(0, maxB - inner.bottom)),
    });
  }

  const media = [...document.querySelectorAll('img,iframe,video')].filter(U.visible).map(m => {
    const cs = getComputedStyle(m);
    const hasAttr = m.hasAttribute('width') && m.hasAttribute('height');
    const hasCss = cs.aspectRatio && cs.aspectRatio !== 'auto' && !/^auto\b/.test(cs.aspectRatio);
    const fixedBox = /px$/.test(m.style.width || '') && /px$/.test(m.style.height || '');
    return { selector: U.sel(m), visible: true, hasDims: hasAttr || hasCss || fixedBox };
  });

  const canvasEl = [document.body, document.documentElement].find(e => { const c = U.parse(getComputedStyle(e).backgroundColor); return c && c[3] > 0; });
  return {
    vw,
    docWidth: Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0),
    interactive, texts, styled, clipBoxes, media,
    canvas: canvasEl ? getComputedStyle(canvasEl).backgroundColor : 'rgb(255, 255, 255)',
    cls: window.__uiuxCls || 0,
    modalOpen: !!U.openModal(),
  };
}

// Primary buttons: focusable by Tab, and does focus draw a ring?
// The runner presses Tab once before this, so :focus-visible applies.
export function collectFocus() {
  const U = window.__uiux;
  const modal = U.openModal();
  const scope = modal || document;
  const out = [];
  for (const el of [...scope.querySelectorAll(U.INTERACTIVE + ',[onclick]')].filter(e => U.visible(e) && U.isPrimary(e) && !e.disabled).slice(0, 25)) {
    const focusable = el.tabIndex >= 0 && !el.disabled && !el.closest('[inert]');
    let ringVisible = false;
    if (focusable) {
      const before = getComputedStyle(el);
      const b = { o: before.outlineStyle + before.outlineWidth + before.outlineColor, s: before.boxShadow, c: before.borderColor, bg: before.backgroundColor };
      try { el.focus({ preventScroll: true, focusVisible: true }); } catch (_) { el.focus(); }
      const after = getComputedStyle(el);
      const outline = after.outlineStyle !== 'none' && parseFloat(after.outlineWidth) > 0;
      ringVisible = document.activeElement === el && (outline || after.boxShadow !== b.s || after.borderColor !== b.c || after.backgroundColor !== b.bg);
      el.blur();
    }
    out.push({ selector: U.sel(el), visible: true, focusable, ringVisible });
  }
  return out;
}

// U7: what sits on each primary button's centre at three scroll positions.
export async function collectCoverProbes() {
  const U = window.__uiux;
  const modal = U.openModal();
  const scope = modal || document;
  const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const prims = [...scope.querySelectorAll(U.INTERACTIVE)].filter(e => U.visible(e) && U.isPrimary(e)).slice(0, 20);
  const out = [];
  for (const el of prims) {
    const positions = [];
    for (const block of ['start', 'center', 'end']) {
      el.scrollIntoView({ block, inline: 'nearest' });
      await frame();
      const r = el.getBoundingClientRect();
      const x = Math.min(Math.max(r.left + r.width / 2, 1), window.innerWidth - 1);
      const y = r.top + r.height / 2;
      if (y < 0 || y > window.innerHeight) continue; // this position cannot be reached
      const hit = document.elementFromPoint(x, y);
      if (!hit || hit === el || el.contains(hit) || hit.contains(el)) { positions.push({ block, coveredBy: null }); continue; }
      let fixed = null;
      for (let e = hit; e && e !== document.body; e = e.parentElement) {
        const p = getComputedStyle(e).position;
        if (p === 'fixed' || p === 'sticky') { fixed = e; break; }
      }
      positions.push({ block, coveredBy: fixed && !fixed.contains(el) ? U.sel(fixed) : null });
    }
    out.push({ selector: U.sel(el), positions });
  }
  window.scrollTo(0, 0);
  return out;
}

// U8: the open dialog's primary button, scrolled into view.
export async function collectModals() {
  const U = window.__uiux;
  const modal = U.openModal();
  if (!modal) return [];
  const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const prims = [...modal.querySelectorAll(U.INTERACTIVE)].filter(e => U.isPrimary(e) && e.getClientRects().length);
  const primary = prims[0];
  if (!primary) return [{ selector: U.sel(modal), primarySelector: null }];
  primary.scrollIntoView({ block: 'center', inline: 'nearest' });
  await frame();
  const r = primary.getBoundingClientRect();
  const inView = r.top >= -1 && r.bottom <= window.innerHeight + 1 && r.left >= -1 && r.right <= window.innerWidth + 1;
  const hit = inView ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
  const onTop = !!hit && (hit === primary || primary.contains(hit) || hit.contains(primary));
  return [{
    selector: U.sel(modal), primarySelector: U.sel(primary),
    reachable: inView && onTop,
    why: !inView ? `button at ${Math.round(r.top)}–${Math.round(r.bottom)} of ${window.innerHeight}` : (onTop ? '' : `under ${hit ? U.sel(hit) : 'nothing'}`),
  }];
}

// Installed before any page script: cumulative layout shift.
export const CLS_INIT = `(() => {
  window.__uiuxCls = 0;
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__uiuxCls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (_) {}
})();`;
