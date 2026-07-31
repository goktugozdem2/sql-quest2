/* Blog quiz widget — the middle rung of the content funnel.
 *
 * THE FUNNEL
 * ----------
 * Measured 2026-07-31: blog posts sent 3 people to the app in 90 days
 * (0 solves, 1 signup). The posts answer a search query and then offer one
 * generic "Practice Free" link — a reader who isn't ready to commit has no
 * smaller step to take, so they leave. This widget inserts that step:
 *
 *   read the post
 *     → answer 3 questions on the SAME topic, inline, no signup   (this file)
 *     → score screen with a challenge matched to the topic
 *     → app.html?challenge=<slug>&src=blog-<post>                 (deep link
 *        suppresses onboarding — hasContentDeepLink — so the reader lands
 *        INSIDE the challenge, not on a tour)
 *     → the app's existing guest ladder takes over
 *        (1st solve → soft email capture → drip → signup prompt)
 *
 * Several posts point at challenges 168-179 deliberately: those on-ramps are
 * in no roadmap stage, so inside the app they are effectively unreachable
 * (ON-1r measured a 14x open-rate gap). The blog is their front door.
 *
 * MEASUREMENT
 * -----------
 * Emits through window.sqTrack (src/track.js, injected on every blog page),
 * so rows land in pro_events with reason='landing', the page slug, and the
 * same aid the app stamps — each funnel step above is one query away.
 * Event names are blog_quiz_* so they can never be confused with the app's
 * own placement-quiz events.
 *
 * PAGE CONTRACT
 * -------------
 * <script type="application/json" id="sq-quiz">{ ...QuizData }</script>
 * <div id="sq-quiz-root"></div>
 * <script defer src="/blog-quiz.js"></script>
 *
 * QuizData: {
 *   topic:  string                       — shown in the header
 *   questions: [{ q, options: [4], correct: idx, why }]
 *   cta: { href, label, high, low }      — high/low = copy above the button,
 *                                          picked by score (>=2 → high)
 * }
 *
 * Styling reuses the blog pages' own palette (#7c3aed/#c084fc purple, slate
 * grays) — no new colors. The app's DESIGN.md accent rules govern the app;
 * these marketing pages have their own established look and the widget
 * should read as part of the article, not as a foreign component.
 */
(function () {
  'use strict';

  var dataEl = document.getElementById('sq-quiz');
  var root = document.getElementById('sq-quiz-root');
  if (!dataEl || !root) return;

  var quiz;
  try { quiz = JSON.parse(dataEl.textContent); } catch (_) { return; }
  if (!quiz || !Array.isArray(quiz.questions) || !quiz.questions.length || !quiz.cta) return;

  function track(event, props) {
    try { if (typeof window.sqTrack === 'function') window.sqTrack(event, props || {}); } catch (_) {}
  }

  var css = document.createElement('style');
  css.textContent =
    '.sqq{border:1px solid rgba(124,58,237,.25);border-radius:20px;padding:28px;margin:48px 0;background:linear-gradient(135deg,rgba(124,58,237,.10),rgba(219,39,119,.06))}' +
    '.sqq-kicker{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#c084fc;margin-bottom:6px}' +
    '.sqq-title{font-size:20px;font-weight:700;color:#f1f5f9;margin-bottom:4px;font-family:"Space Grotesk",sans-serif}' +
    '.sqq-progress{font-size:13px;color:#64748b;margin-bottom:18px}' +
    '.sqq-q{font-size:16px;color:#e2e8f0;margin-bottom:14px;line-height:1.6}' +
    '.sqq-q code{color:#c084fc}' +
    '.sqq-opt{display:block;width:100%;text-align:left;padding:12px 16px;margin:8px 0;border-radius:12px;border:1px solid rgba(148,163,184,.25);background:rgba(15,23,42,.4);color:#cbd5e1;font-size:15px;line-height:1.5;cursor:pointer;transition:border-color .15s}' +
    '.sqq-opt:hover{border-color:#7c3aed}' +
    '.sqq-opt[disabled]{cursor:default}' +
    '.sqq-opt.ok{border-color:#22c55e;background:rgba(34,197,94,.08);color:#e2e8f0}' +
    '.sqq-opt.no{border-color:#ef4444;background:rgba(239,68,68,.07)}' +
    '.sqq-why{font-size:14px;color:#94a3b8;line-height:1.7;margin:12px 0 4px;padding:12px 16px;border-left:3px solid #7c3aed;background:rgba(124,58,237,.06);border-radius:0 10px 10px 0}' +
    '.sqq-next{margin-top:12px;padding:10px 26px;border-radius:10px;border:0;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;font-size:15px;font-weight:700;cursor:pointer}' +
    '.sqq-score{font-size:34px;font-weight:800;color:#f1f5f9;margin:6px 0;font-family:"Space Grotesk",sans-serif}' +
    '.sqq-tease{font-size:15px;color:#94a3b8;line-height:1.7;max-width:440px;margin:0 auto 22px}' +
    '.sqq-cta{display:inline-flex;align-items:center;padding:14px 36px;font-size:16px;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;border-radius:12px;font-weight:700;text-decoration:none;transition:all .3s}' +
    '.sqq-cta:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(124,58,237,.35);text-decoration:none}' +
    '.sqq-end{text-align:center;padding:8px 0}';
  document.head.appendChild(css);

  var i = 0;
  var score = 0;
  var started = false;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderQuestion() {
    var q = quiz.questions[i];
    var html =
      '<div class="sqq-kicker">Quick check</div>' +
      '<div class="sqq-title">' + esc(quiz.topic) + '</div>' +
      '<div class="sqq-progress">Question ' + (i + 1) + ' of ' + quiz.questions.length + '</div>' +
      '<div class="sqq-q">' + q.q + '</div>';
    for (var k = 0; k < q.options.length; k++) {
      html += '<button class="sqq-opt" data-k="' + k + '">' + q.options[k] + '</button>';
    }
    box.innerHTML = html;

    var opts = box.querySelectorAll('.sqq-opt');
    for (var j = 0; j < opts.length; j++) {
      opts[j].addEventListener('click', onAnswer);
    }
  }

  function onAnswer(e) {
    var q = quiz.questions[i];
    var picked = parseInt(e.currentTarget.getAttribute('data-k'), 10);
    var right = picked === q.correct;
    if (right) score++;

    if (!started) {
      started = true;
      track('blog_quiz_started', { topic: quiz.topic });
    }
    track('blog_quiz_answered', { topic: quiz.topic, q: i + 1, correct: right });

    var opts = box.querySelectorAll('.sqq-opt');
    for (var j = 0; j < opts.length; j++) {
      opts[j].disabled = true;
      if (j === q.correct) opts[j].classList.add('ok');
      else if (j === picked) opts[j].classList.add('no');
    }

    var why = document.createElement('div');
    why.className = 'sqq-why';
    why.innerHTML = q.why;
    box.appendChild(why);

    var next = document.createElement('button');
    next.className = 'sqq-next';
    next.textContent = (i + 1 < quiz.questions.length) ? 'Next question →' : 'See my result →';
    next.addEventListener('click', function () {
      i++;
      if (i < quiz.questions.length) renderQuestion();
      else renderEnd();
    });
    box.appendChild(next);
  }

  function renderEnd() {
    track('blog_quiz_completed', { topic: quiz.topic, score: score, total: quiz.questions.length });
    var tease = score >= 2 ? quiz.cta.high : quiz.cta.low;
    box.innerHTML =
      '<div class="sqq-end">' +
      '<div class="sqq-kicker">Your result</div>' +
      '<div class="sqq-score">' + score + ' / ' + quiz.questions.length + '</div>' +
      '<p class="sqq-tease">' + tease + '</p>' +
      // data-track lets src/track.js's delegated click relay log the click
      // with keepalive, so the navigation away doesn't eat the event.
      '<a class="sqq-cta" data-track="cta_blog_quiz" href="' + esc(quiz.cta.href) + '">' +
      esc(quiz.cta.label) + '</a>' +
      '</div>';
  }

  var box = document.createElement('div');
  box.className = 'sqq';
  root.appendChild(box);
  renderQuestion();
})();
