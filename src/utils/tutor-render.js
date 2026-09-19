// How tutor text becomes screen text (2026-09-19, founder QA round 3,
// items 1–3). Pure: the parse is here, the JSX is TutorText in app.jsx.
//
// What went wrong before: the study chat ran
//   content.replace(/\*\*/g, '').replace(/\*/g, '')
// over the WHOLE message, code included, so COUNT(*) printed as COUNT().
// Headings came through as a literal "## What Your Query Did". And the code
// font (JetBrains Mono) draws >= as a ≥ ligature; when the model itself
// writes ≥, a copy is a syntax error.
//
// The rules now:
//   - fenced code (```…```) is split out FIRST and never touched by any
//     markdown rule; typographic operators inside it are put back to ASCII
//   - outside code: `inline code` is also left alone (same ASCII fix),
//     **bold** becomes bold, a "# heading" line becomes a bold line,
//     QUESTION: keeps its highlight; a single * is just a character

const OPS = [
  [/≥/g, '>='], [/≤/g, '<='], [/≠/g, '<>'],
  [/[“”]/g, '"'], [/[‘’]/g, "'"], [/−/g, '-'], [/×/g, '*'],
];
/** Typographic operators and quotes back to what SQL accepts. */
export function asciiSql(code) {
  let s = String(code || '');
  for (const [re, to] of OPS) s = s.replace(re, to);
  return s;
}

function inline(text) {
  // `code`, **bold**, QUESTION: — in that order of precedence.
  const out = [];
  const re = /(`[^`\n]+`)|(\*\*[^*\n]+?\*\*)|(QUESTION:)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) });
    if (m[1]) out.push({ t: 'code', v: asciiSql(m[1].slice(1, -1)) });
    else if (m[2]) out.push({ t: 'bold', v: m[2].slice(2, -2) });
    else out.push({ t: 'question', v: 'QUESTION:' });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) });
  return out;
}

/**
 * @param {string} content
 * @returns {Array<{type:'code', code:string} | {type:'heading'|'text', parts:Array<{t:string,v:string}>}>}
 */
export function parseTutorContent(content) {
  const src = String(content || '');
  const blocks = [];
  const pieces = src.split('```');
  pieces.forEach((piece, i) => {
    if (i % 2 === 1) {
      // Drop a language tag on the first line ("sql", "SQL", "sqlite").
      const code = piece.replace(/^[a-zA-Z]+[ \t]*\n/, '').replace(/^\n/, '').replace(/\n$/, '');
      blocks.push({ type: 'code', code: asciiSql(code) });
      return;
    }
    // Text: group lines, headings become their own block.
    let buf = [];
    const flush = () => {
      if (buf.length === 0) return;
      const text = buf.join('\n');
      if (text.trim()) blocks.push({ type: 'text', parts: inline(text) });
      buf = [];
    };
    for (const line of piece.split('\n')) {
      const h = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
      if (h) {
        flush();
        blocks.push({ type: 'heading', parts: inline(h[1].replace(/^\*\*(.*)\*\*$/, '$1')) });
      } else {
        buf.push(line);
      }
    }
    flush();
  });
  return blocks;
}
