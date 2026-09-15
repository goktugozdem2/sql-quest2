// Which screens the gallery captures, and how to reach each one.
// prepare() returns a clip in CSS pixels (the capture is at 2×).
const rectOf = sel => `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height }; })()`;

export const SHOTS = [
  { name: 'plan', path: '/app/', width: 800, prepare: async ({ ev, wait }) => { await wait(2500); return ev(rectOf('[data-testid="practice-plan"]')); } },
  { name: 'skillmap', path: '/app/', width: 800, prepare: async ({ ev, wait }) => { await wait(2500); return ev(rectOf('[data-testid="coach-radar-panel"]')); } },
  { name: 'wrong', path: '/app/', width: 1100, height: 1400, prepare: async ({ ev, wait }) => {
    await wait(2500);
    const r = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const item = document.querySelector('[data-plan-item="175"]');
      if (!item) return { item: false };
      (item.querySelector('button,a') || item).click(); await w(2500);
      const cm = document.querySelector('.CodeMirror');
      if (!cm) return { cm: false, btn: Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim()).slice(0,30) };
      cm.CodeMirror.setValue("SELECT c.name, c.membership, o.product, o.total\\nFROM customers c\\nJOIN orders o ON c.customer_id = o.customer_id\\nORDER BY c.name, o.order_id;");
      await w(400);
      const submit = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Submit');
      submit.click(); await w(3000);
      const panel = Array.from(document.querySelectorAll('div.border-orange-500\\\\/40')).find(d => d.textContent.includes('Wrong number of rows'));
      const ed = document.querySelector('.sql-cm-editor');
      if (!panel || !ed) return { panel: !!panel, ed: !!ed };
      ed.scrollIntoView({ block: 'start' }); await w(300);
      // The editor's card: the nearest ancestor that holds the "Your Solution" title.
      let card = ed; while (card.parentElement && !/Your Solution/.test(card.textContent)) card = card.parentElement;
      const box = el => { const b = el.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height }; };
      return { clip: [{ part: 'editor', clip: box(card) }, { part: 'diagnosis', clip: box(panel) }] };
    })()`);
    if (!r.clip) throw new Error('wrong: ' + JSON.stringify(r));
    return r.clip;
  } },
];

SHOTS.push(
  { name: 'company', path: '/app/?company=Capital%20One', width: 1280, height: 1000, prepare: async ({ ev, wait }) => {
    await wait(2500);
    const r = await ev(`(() => {
      const leaf = re => Array.from(document.querySelectorAll('div,section')).filter(d => re.test(d.textContent || '')).sort((a, b) => a.textContent.length - b.textContent.length)[0];
      const banner = leaf(/You.re practicing Capital One/);
      const cards = Array.from(document.querySelectorAll('div,button,a,article')).filter(d => /^#\\d+\\s*·\\s*ID/.test((d.textContent || '').trim()) && d.getBoundingClientRect().width > 250 && d.getBoundingClientRect().width < 520 && d.getBoundingClientRect().height > 100);
      const box = el => { const b = el.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height }; };
      if (!banner || cards.length < 3) return { banner: !!banner, cards: cards.length };
      // The outermost card elements (a card contains no other card).
      const outer = cards.filter(c => !cards.some(o => o !== c && c.contains(o)));
      const grid = outer.slice(0, 3).map(box);
      const top = grid[0].y, bottom = Math.max(...grid.map(g => g.y + g.height));
      const left = Math.min(...grid.map(g => g.x)), right = Math.max(...grid.map(g => g.x + g.width));
      return { clip: [
        { part: 'banner', clip: box(banner) },
        { part: 'cards', clip: { x: left, y: top, width: right - left, height: bottom - top } },
        ...outer.slice(0, 3).map((c, k) => ({ part: 'card' + (k + 1), clip: box(c) })),
      ] };
    })()`);
    if (!r.clip) throw new Error('company: ' + JSON.stringify(r));
    return r.clip;
  } },
  // A Pro learner mid-mock: the timer is the point of the frame. Pro is a
  // product state like any other; the frame says "Pro" where it matters.
  { name: 'mock', path: '/app/?interview=capital-one-codesignal&src=ph', width: 1080, height: 1000,
    patch: { proStatus: true, proType: 'annual', proExpiry: new Date(Date.now() + 200 * 86400000).toISOString() },
    prepare: async ({ ev, wait }) => {
      await wait(3000);
      const r = await ev(`(() => {
        const q = document.querySelector('[data-testid="interview-question"]');
        if (!q) return null;
        let m = q; while (m.parentElement && !/Q1\\/\\d+/.test(m.textContent)) m = m.parentElement;
        const b = m.getBoundingClientRect();
        return { x: b.left, y: Math.max(0, b.top), width: b.width, height: Math.min(b.bottom, innerHeight) - Math.max(0, b.top) };
      })()`);
      if (!r) throw new Error('mock did not start');
      return r;
    } },
  // The free, no-signup door. Both window-function questions and one of the
  // two aggregation ones answered wrong: a result with a shape, not a sweep.
  { name: 'readiness', path: '/sql-interview-readiness-test/?company=capital-one', cold: true, width: 1000, height: 1000, prepare: async ({ ev, wait }) => {
    await wait(800);
    const r = await ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      document.getElementById('go').click(); await w(200);
      let aggMissed = false;
      for (let k = 0; k < QUESTIONS.length; k++) {
        const q = QUESTIONS[k];
        const miss = /Window/.test(q.skill) || (/Aggregation/.test(q.skill) && !aggMissed && (aggMissed = true));
        const pick = miss ? (q.answer + 1) % q.options.length : q.answer;
        document.getElementById('opts').children[pick].click(); await w(80);
        document.getElementById('next').click(); await w(120);
      }
      await w(800); window.scrollTo(0, 0); await w(300);
      const el = document.getElementById('result');
      const b = el.getBoundingClientRect();
      return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height };
    })()`);
    return r;
  } },
  { name: 'pricing', path: '/', cold: true, width: 1200, height: 1000, prepare: async ({ ev, wait }) => {
    await wait(800);
    // No scrollIntoView: the fixed nav would paint over the top of the clip.
    return ev(`(() => { const el = document.getElementById('pricing'); window.scrollTo(0, 0); const b = el.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height }; })()`);
  } },
);
