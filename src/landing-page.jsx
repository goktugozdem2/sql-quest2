import { useState, useEffect, useRef } from "react";

// ─── TYPING SQL ───
function TypingSQL() {
  const queries = [
    "SELECT name, age FROM passengers WHERE survived = 1;",
    "SELECT class, COUNT(*) FROM passengers GROUP BY class;",
    "SELECT *, RANK() OVER(ORDER BY fare DESC) FROM passengers;",
  ];
  const [qi, setQi] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const query = queries[qi];
    let timer;
    if (!deleting) {
      if (text.length < query.length) timer = setTimeout(() => setText(query.slice(0, text.length + 1)), 40 + Math.random() * 30);
      else timer = setTimeout(() => setDeleting(true), 2200);
    } else {
      if (text.length > 0) timer = setTimeout(() => setText(text.slice(0, -1)), 18);
      else { setDeleting(false); setQi((qi + 1) % queries.length); }
    }
    return () => clearTimeout(timer);
  }, [text, deleting, qi]);
  const kw = /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LIMIT|COUNT|DESC|ASC|AND|OR|JOIN|LEFT|RIGHT|INNER|ON|AS|RANK|OVER|PARTITION|ROW_NUMBER|DENSE_RANK|HAVING|DISTINCT|CASE|WHEN|THEN|ELSE|END|AVG|SUM|MIN|MAX|BETWEEN|LIKE|IN|NOT|NULL|IS)\b/gi;
  const parts = []; let last = 0; let m; const re = new RegExp(kw);
  while ((m = re.exec(text)) !== null) { if (m.index > last) parts.push({ t: text.slice(last, m.index), k: false }); parts.push({ t: m[0], k: true }); last = re.lastIndex; }
  if (last < text.length) parts.push({ t: text.slice(last), k: false });
  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 15, minHeight: 24 }}>
      {parts.map((p, i) => <span key={i} style={p.k ? { color: '#c084fc', fontWeight: 700 } : { color: '#94a3b8' }}>{p.t}</span>)}
      <span style={{ borderRight: '2px solid #c084fc', animation: 'blink 1s step-end infinite', marginLeft: 1 }}>&nbsp;</span>
    </div>
  );
}

// ─── ANIMATED COUNTER ───
function Counter({ end, duration = 2000, suffix = "" }) {
  const [count, setCount] = useState(0); const ref = useRef(null); const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true; const s = performance.now();
        const step = (now) => { const p = Math.min((now - s) / duration, 1); setCount(Math.floor((1 - Math.pow(1 - p, 3)) * end)); if (p < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ─── FAQ ───
function FAQ({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 0', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', flex: 1, paddingRight: 16 }}>{q}</p>
        <span style={{ color: '#7c3aed', fontSize: 22, transition: 'transform 0.3s', transform: open ? 'rotate(45deg)' : 'rotate(0)', flexShrink: 0 }}>+</span>
      </div>
      <div style={{ maxHeight: open ? 300 : 0, overflow: 'hidden', transition: 'max-height 0.4s ease' }}>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: '#94a3b8', paddingTop: 12 }}>{a}</p>
      </div>
    </div>
  );
}

// ─── MAIN ───
export default function Landing() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const sec = { maxWidth: 1100, margin: '0 auto', padding: '100px 24px' };
  const btn = (primary, size = 'md') => ({
    padding: size === 'lg' ? '16px 40px' : primary ? '13px 32px' : '11px 24px',
    borderRadius: 12, fontSize: size === 'lg' ? 17 : primary ? 15 : 14, fontWeight: 700,
    border: primary ? 'none' : '1px solid rgba(124,58,237,0.4)',
    background: primary ? 'linear-gradient(135deg, #7c3aed, #db2777)' : 'transparent',
    color: primary ? '#fff' : '#c084fc', cursor: 'pointer', transition: 'all 0.3s',
    display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none',
  });

  const faangQuestions = [
    { company: 'Meta', icon: '📘', q: 'Find the top 3 departments by average salary using window functions', topics: ['Window Functions', 'Aggregation', 'Subqueries'], difficulty: 'Hard' },
    { company: 'Google', icon: '🔍', q: 'Calculate month-over-month revenue growth rate for each product', topics: ['Window Functions', 'Date Functions', 'CASE'], difficulty: 'Hard' },
    { company: 'Amazon', icon: '📦', q: 'Find customers who ordered every product in a category', topics: ['GROUP BY', 'HAVING', 'Subqueries'], difficulty: 'Medium' },
    { company: 'Apple', icon: '🍎', q: 'Rank employees by tenure within each department, handling ties', topics: ['Window Functions', 'JOIN', 'Date Functions'], difficulty: 'Medium' },
    { company: 'Netflix', icon: '🎬', q: 'Find the most-watched genre per country using only SQL', topics: ['GROUP BY', 'Subqueries', 'Aggregation'], difficulty: 'Medium' },
    { company: 'Stripe', icon: '💳', q: 'Detect duplicate transactions within a 5-minute window', topics: ['Window Functions', 'CASE', 'Date Functions'], difficulty: 'Hard' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#06060f', color: '#e2e8f0', overflowX: 'hidden', fontFamily: "'DM Sans', 'Nunito', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Space+Grotesk:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes blink { 50% { border-color: transparent; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes gradient-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes pulse-glow { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        ::selection { background: #7c3aed55; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { margin: 0; }
      `}</style>

      {/* ══════ NAV ══════ */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: scrollY > 50 ? 'rgba(6,6,15,0.92)' : 'transparent', backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none', borderBottom: scrollY > 50 ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'all 0.3s' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
            <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>SQL Quest</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {['Features', 'Interview Prep', 'Pricing', 'FAQ'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
              >{l}</a>
            ))}
            <a href="#start" style={btn(true)}>Start Free →</a>
          </div>
        </div>
      </div>

      {/* ══════ HERO ══════ */}
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,58,237,0.15) 0%, transparent 60%)' }} />
        <div style={{ position: 'absolute', top: '15%', left: '8%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08), transparent 70%)', animation: 'float 8s ease-in-out infinite', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(219,39,119,0.06), transparent 70%)', animation: 'float 10s ease-in-out infinite 2s', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)' }} />

        <div style={{ ...sec, paddingTop: 140, paddingBottom: 60, display: 'flex', gap: 56, alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
          <div style={{ flex: '1 1 480px', minWidth: 320 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 100, padding: '6px 16px', marginBottom: 28, animation: 'fadeUp 0.6s both' }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: '#22c55e', animation: 'pulse-glow 2s infinite' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#c084fc' }}>Ace your FAANG SQL interview</span>
            </div>
            <h1 style={{ fontSize: 'clamp(38px, 5vw, 62px)', fontWeight: 800, lineHeight: 1.08, marginBottom: 24, fontFamily: "'Space Grotesk', sans-serif", animation: 'fadeUp 0.6s 0.1s both' }}>
              Stop reading tutorials.
              <br />
              <span style={{ background: 'linear-gradient(135deg, #c084fc, #f472b6, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% 200%', animation: 'gradient-shift 4s ease infinite' }}>
                Start writing SQL.
              </span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.8, color: '#94a3b8', marginBottom: 36, maxWidth: 520, animation: 'fadeUp 0.6s 0.2s both' }}>
              200+ hands-on challenges. Real datasets. AI tutoring. Practice the exact SQL patterns Meta, Google, and Amazon ask in interviews — all in your browser.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', animation: 'fadeUp 0.6s 0.3s both' }}>
              <a href="#start" style={btn(true)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(124,58,237,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >Start Learning Free</a>
              <a href="#interview-prep" style={btn(false)}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >See FAANG Questions ↓</a>
            </div>
            <div style={{ display: 'flex', gap: 28, marginTop: 44, animation: 'fadeUp 0.6s 0.4s both' }}>
              {[{ n: 'No install', d: 'Runs in browser' }, { n: 'Real datasets', d: '891 rows to query' }, { n: 'AI-powered', d: 'Personal tutor' }].map(i => (
                <div key={i.n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: '#22c55e' }} />
                  <div><p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{i.n}</p><p style={{ fontSize: 11, color: '#64748b' }}>{i.d}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* Editor mock */}
          <div style={{ flex: '1 1 420px', minWidth: 340, animation: 'fadeUp 0.8s 0.3s both' }}>
            <div style={{ background: 'rgba(10,10,25,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.1)' }}>
              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {['#ef4444','#eab308','#22c55e'].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />)}
                <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>interview_prep.sql</span>
              </div>
              <div style={{ padding: '20px 20px 16px', display: 'flex', gap: 12 }}>
                <div style={{ color: '#475569', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", userSelect: 'none', lineHeight: '24px' }}>{[1,2,3].map(n => <div key={n}>{n}</div>)}</div>
                <div style={{ flex: 1 }}><TypingSQL /></div>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: 16, background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: 11, color: '#22c55e', marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>✓ 3 rows returned (0.002s)</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.6fr 0.8fr', gap: '6px 16px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                  {['name','class','rank'].map(h => <span key={h} style={{ color: '#7c3aed', fontWeight: 700, borderBottom: '1px solid rgba(124,58,237,0.2)', paddingBottom: 4 }}>{h}</span>)}
                  <span style={{ color: '#94a3b8' }}>Cardeza, Mr</span><span style={{ color: '#94a3b8' }}>1st</span><span style={{ color: '#f59e0b' }}>1</span>
                  <span style={{ color: '#94a3b8' }}>Ward, Miss</span><span style={{ color: '#94a3b8' }}>1st</span><span style={{ color: '#f59e0b' }}>2</span>
                  <span style={{ color: '#94a3b8' }}>Baxter, Mrs</span><span style={{ color: '#94a3b8' }}>1st</span><span style={{ color: '#f59e0b' }}>3</span>
                </div>
              </div>
              <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(22,163,74,0.06))', borderTop: '1px solid rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>✅ Correct! Window function mastered</span>
                <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>+25 XP ⭐</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════ COMPANY LOGOS BAR ══════ */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.012)', padding: '32px 24px' }}>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#475569', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 20 }}>Practice SQL patterns asked at</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { name: 'Meta', icon: '📘' }, { name: 'Google', icon: '🔍' }, { name: 'Amazon', icon: '📦' },
            { name: 'Apple', icon: '🍎' }, { name: 'Netflix', icon: '🎬' }, { name: 'Stripe', icon: '💳' },
            { name: 'Uber', icon: '🚗' }, { name: 'Airbnb', icon: '🏠' },
          ].map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.5, transition: 'opacity 0.3s', cursor: 'default' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
            >
              <span style={{ fontSize: 20 }}>{c.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8', fontFamily: "'Space Grotesk', sans-serif" }}>{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════ FAANG INTERVIEW PREP ══════ */}
      <div id="interview-prep" style={{ background: 'linear-gradient(180deg, rgba(124,58,237,0.04) 0%, transparent 100%)' }}>
        <div style={sec}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 2 }}>🔥 Interview Prep</span>
            <h2 style={{ fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, marginTop: 12, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.15 }}>
              The SQL questions
              <span style={{ color: '#c084fc' }}> FAANG actually asks</span>
            </h2>
            <p style={{ fontSize: 16, color: '#94a3b8', marginTop: 16, maxWidth: 600, margin: '16px auto 0' }}>
              We analyzed hundreds of interview reports from Glassdoor, Blind, and Leetcode. These are the real patterns — and you'll master every one.
            </p>
          </div>

          {/* Question type breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 48, marginBottom: 48 }}>
            {[
              { topic: 'Window Functions', pct: 34, color: '#7c3aed', desc: 'RANK, ROW_NUMBER, LAG/LEAD, running totals' },
              { topic: 'JOINs & Subqueries', pct: 28, color: '#3b82f6', desc: 'Multi-table queries, CTEs, correlated subqueries' },
              { topic: 'GROUP BY & Aggregation', pct: 22, color: '#22c55e', desc: 'HAVING, conditional aggregates, pivot patterns' },
              { topic: 'Date & String', pct: 10, color: '#f59e0b', desc: 'Date math, EXTRACT, string manipulation' },
              { topic: 'CASE & Logic', pct: 6, color: '#ec4899', desc: 'Conditional columns, NULL handling, COALESCE' },
            ].map(t => (
              <div key={t.topic} style={{ background: 'rgba(10,10,25,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '20px 16px', textAlign: 'center', transition: 'border-color 0.3s, transform 0.3s', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = t.color + '44'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = ''; }}
              >
                <p style={{ fontSize: 32, fontWeight: 800, color: t.color, fontFamily: "'Space Grotesk', sans-serif" }}>{t.pct}%</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginTop: 4 }}>{t.topic}</p>
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>{t.desc}</p>
              </div>
            ))}
          </div>

          {/* Sample FAANG Questions */}
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20, textAlign: 'center' }}>Sample questions by company</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {faangQuestions.map((fq, i) => (
                <div key={i} style={{ background: 'rgba(10,10,25,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '20px', transition: 'border-color 0.3s', cursor: 'default' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{fq.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{fq.company}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: fq.difficulty === 'Hard' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)', color: fq.difficulty === 'Hard' ? '#ef4444' : '#eab308' }}>{fq.difficulty}</span>
                  </div>
                  <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 12 }}>{fq.q}</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {fq.topics.map(t => (
                      <span key={t} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, background: 'rgba(124,58,237,0.1)', color: '#a78bfa', fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <a href="#start" style={btn(true)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(124,58,237,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >Practice These Questions Free →</a>
            </div>
          </div>
        </div>
      </div>

      {/* ══════ FEATURES ══════ */}
      <div id="features" style={sec}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 2 }}>Platform</span>
          <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, marginTop: 12, fontFamily: "'Space Grotesk', sans-serif" }}>
            Everything you need to <span style={{ color: '#c084fc' }}>master SQL</span>
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {[
            { icon: '🤖', title: 'AI Personal Tutor', desc: 'Get instant explanations, hints, and targeted practice. Like having a SQL mentor available 24/7 who knows your weak spots.', color: '#7c3aed' },
            { icon: '📊', title: 'Real Titanic Dataset', desc: 'Query 891 real passenger records — not toy data. Practice on the same kind of messy, real-world data you\'ll face on the job.', color: '#22c55e' },
            { icon: '🗓️', title: '30-Day Challenge', desc: 'A structured daily path from SELECT to Window Functions. Each day builds on the last with warm-ups, challenges, and insights.', color: '#f59e0b' },
            { icon: '💼', title: 'Mock Interviews', desc: 'Timed SQL interviews with scoring, difficulty levels, and detailed feedback. Know exactly where you stand before the real thing.', color: '#f97316' },
            { icon: '📈', title: 'Skill Radar', desc: 'Multi-signal proficiency tracking across 10 categories. Weighted by difficulty, success rate, speed, and confidence.', color: '#ec4899' },
            { icon: '⚡', title: 'Zero Setup', desc: 'Runs entirely in your browser using WebAssembly SQLite. No downloads, no accounts required. Open and start writing SQL in 10 seconds.', color: '#3b82f6' },
          ].map((f, i) => (
            <div key={i} style={{ background: 'rgba(15,15,30,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '28px 24px', transition: 'transform 0.3s, border-color 0.3s', cursor: 'default', position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = f.color + '33'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
            >
              <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, background: `radial-gradient(circle, ${f.color}10 0%, transparent 70%)` }} />
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif" }}>{f.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#94a3b8' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══════ PRICING ══════ */}
      <div id="pricing" style={{ background: 'rgba(255,255,255,0.012)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={sec}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: 2 }}>Pricing</span>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, marginTop: 12, fontFamily: "'Space Grotesk', sans-serif" }}>
              Start free. <span style={{ color: '#c084fc' }}>Go Pro when you're hooked.</span>
            </h2>
            <p style={{ fontSize: 16, color: '#94a3b8', marginTop: 12 }}>No credit card required. Upgrade only when you want more.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, maxWidth: 780, margin: '0 auto' }}>
            {/* Free */}
            <div style={{ background: 'rgba(10,10,25,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '36px 28px', display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Free</p>
              <div style={{ margin: '16px 0 24px', display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 48, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: '#f1f5f9' }}>$0</span>
                <span style={{ fontSize: 14, color: '#64748b' }}>/ forever</span>
              </div>
              <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 28, lineHeight: 1.6 }}>A real taste of everything — enough to get started and see results.</p>
              <div style={{ flex: 1 }}>
                {[
                  'Easy & Medium challenges',
                  'Daily challenges (Easy difficulty)',
                  '30-Day path (first 10 days)',
                  '3 AI tutor calls per day',
                  '1 mock interview',
                  'Starter warm-up quiz set',
                  'Basic skill radar',
                  'XP, streaks & leaderboard',
                ].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                    <span style={{ color: '#22c55e', fontSize: 14, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 14, color: '#cbd5e1' }}>{f}</span>
                  </div>
                ))}
              </div>
              <a href="#start" style={{ ...btn(false), justifyContent: 'center', marginTop: 28, width: '100%', textAlign: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >Get Started Free</a>
            </div>

            {/* Pro */}
            <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(219,39,119,0.08))', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 20, padding: '36px 28px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #7c3aed, #db2777)', padding: '5px 20px', borderRadius: '0 0 12px 12px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#fff' }}>Full Access</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', letterSpacing: 1 }}>Pro</p>
              <div style={{ margin: '16px 0 8px' }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                  {[
                    { label: 'Monthly', price: '$19', sub: '/month', tag: null },
                    { label: 'Annual', price: '$99', sub: '/year', tag: 'SAVE 57%' },
                    { label: 'Lifetime', price: '$199', sub: 'one-time', tag: 'BEST VALUE' },
                  ].map(p => (
                    <div key={p.label} style={{ flex: '1 1 80px', background: 'rgba(10,10,25,0.5)', borderRadius: 12, padding: '12px 10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
                      {p.tag && <span style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', background: p.tag === 'BEST VALUE' ? '#f59e0b' : '#22c55e', color: '#000', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 100, whiteSpace: 'nowrap' }}>{p.tag}</span>}
                      <p style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', fontFamily: "'Space Grotesk', sans-serif" }}>{p.price}</p>
                      <p style={{ fontSize: 11, color: '#64748b' }}>{p.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
              <p style={{ fontSize: 14, color: '#c4b5fd', marginBottom: 24, lineHeight: 1.6 }}>Unlock everything. No limits. Dominate your SQL interviews.</p>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginBottom: 8 }}>Everything in Free, plus:</p>
                {[
                  'All challenges including Hard difficulty',
                  'All daily challenge difficulties',
                  'Full 30-Day path (all days)',
                  'Unlimited AI tutor calls',
                  'All mock interviews (timed & scored)',
                  'Complete warm-up question bank',
                  'Full skill radar with AI Training',
                  'Detailed weekly reports',
                ].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
                    <span style={{ color: '#c084fc', fontSize: 14, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 14, color: '#e2e8f0' }}>{f}</span>
                  </div>
                ))}
              </div>
              <a href="#start" style={{ ...btn(true), justifyContent: 'center', marginTop: 24, width: '100%', textAlign: 'center' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(124,58,237,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >Start Pro — 7 Day Free Trial</a>
              <p style={{ fontSize: 11, color: '#475569', textAlign: 'center', marginTop: 12 }}>🔒 Secure payment via Stripe · Cancel anytime</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════ TESTIMONIALS ══════ */}
      <div style={sec}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
            From learners who <span style={{ color: '#c084fc' }}>got the job</span>
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {[
            { q: "I practiced FAANG questions here for 3 weeks. The mock interview format is so close to the real thing — I passed Meta's SQL screen on the first try.", name: 'Sarah K.', role: 'Now Data Analyst @ Meta', c: ['#7c3aed','#db2777'] },
            { q: "The 30-day challenge took me from zero SQL to writing window functions confidently. The AI tutor filled every gap my bootcamp left.", name: 'Marcus T.', role: 'Junior Developer @ Shopify', c: ['#22c55e','#3b82f6'] },
            { q: "I assign this to all my students now. The real dataset makes SQL click in a way that textbook examples never did. And it's free!", name: 'Dr. Lisa Chen', role: 'CS Professor, UC Berkeley', c: ['#f59e0b','#ef4444'] },
          ].map((t, i) => (
            <div key={i} style={{ background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '28px 24px' }}>
              <div style={{ fontSize: 48, color: '#7c3aed', opacity: 0.25, fontFamily: 'Georgia', lineHeight: 1, marginBottom: -8 }}>"</div>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: '#cbd5e1', marginBottom: 20, fontStyle: 'italic' }}>{t.q}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 19, background: `linear-gradient(135deg, ${t.c[0]}, ${t.c[1]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>{t.name[0]}</div>
                <div><p style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{t.name}</p><p style={{ fontSize: 12, color: '#64748b' }}>{t.role}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════ FINAL CTA ══════ */}
      <div id="start" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(124,58,237,0.15) 0%, transparent 60%)' }} />
        <div style={{ ...sec, textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <h2 style={{ fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.15, marginBottom: 20 }}>
            Your next SQL interview is
            <br /><span style={{ background: 'linear-gradient(135deg, #c084fc, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>30 days away from easy</span>
          </h2>
          <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 540, margin: '0 auto 40px' }}>
            No signup required. No credit card. Open the app and write your first query right now.
          </p>
          <a href="#" style={{ ...btn(true, 'lg'), boxShadow: '0 0 40px rgba(124,58,237,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(124,58,237,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 40px rgba(124,58,237,0.3)'; }}
          >Launch SQL Quest — It's Free ⚡</a>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 20 }}>Works on Chrome, Firefox, Safari, Edge · No plugins · No downloads</p>
        </div>
      </div>

      {/* ══════ FAQ ══════ */}
      <div id="faq" style={{ background: 'rgba(255,255,255,0.012)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ ...sec, maxWidth: 720 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 48, fontFamily: "'Space Grotesk', sans-serif" }}>Frequently Asked</h2>
          <FAQ q="Is SQL Quest really free?" a="Yes. All 200+ challenges, the 30-day path, daily challenges, and 10 AI tutor sessions per day are completely free. Pro unlocks unlimited AI, mock interviews, and extra datasets." />
          <FAQ q="Do I need to install anything?" a="No. SQL Quest runs entirely in your browser using WebAssembly-powered SQLite. Works on any modern browser — even offline once loaded." />
          <FAQ q="What SQL flavor does it use?" a="Standard SQL (SQLite dialect). The patterns — JOINs, window functions, aggregation — transfer directly to PostgreSQL, MySQL, BigQuery, Snowflake, and every database you'll encounter in interviews." />
          <FAQ q="Will this actually help me pass FAANG interviews?" a="We focus on the exact question patterns that appear in technical screens at Meta, Google, Amazon, and similar companies. The mock interview format, timed pressure, and scoring simulate real conditions." />
          <FAQ q="How does the AI tutor work?" a="Powered by Claude AI. It explains your errors in plain language, generates practice problems matched to your skill level, and walks through solutions step by step. Free tier gets 10 sessions per day." />
          <FAQ q="Can I use this for my team or classroom?" a="Yes — our Teams plan includes admin dashboards, custom challenge sets, shared leaderboards, and bulk management. Email us for a demo." />
        </div>
      </div>

      {/* ══════ FOOTER ══════ */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #7c3aed, #db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
          <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>SQL Quest</span>
        </div>
        <p style={{ fontSize: 13, color: '#475569' }}>Master SQL through hands-on practice.</p>
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 24 }}>
          {['Twitter', 'Reddit', 'GitHub', 'Blog', 'Contact'].map(l => (
            <a key={l} href="#" style={{ color: '#64748b', textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
            >{l}</a>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#334155', marginTop: 24 }}>© 2026 SQL Quest. Built with ❤️ for SQL learners everywhere.</p>
      </div>
    </div>
  );
}
