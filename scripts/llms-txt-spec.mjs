// llms.txt conformance — the spec's required shape, checked in JS (2026-11-24).
//
// The spec (https://llmstxt.org) and its reference parser, `llms-txt` on PyPI
// (AnswerDotAI/llms-txt, llms_txt/core.py, v0.0.7 of 2026-09-24), define a
// file as, in this order:
//   1. an H1 with the site's name — the only required part;
//   2. optionally, a blockquote: a one-line summary (`> …`);
//   3. optionally, any markdown that is NOT a heading (paragraphs, lists);
//   4. zero or more H2 sections, each a "file list": every line is
//      `- [name](url)`, optionally followed by `: notes`.
//
// Why a port and not the package: the reference is Python with fastcore and
// httpx, and this repo's tests are vitest. The port below mirrors core.py's
// regexes one for one (parseLlmsTxt), so a file it accepts is one the
// reference parses, and lintLlmsTxt adds the checks where the reference is
// lenient by accident rather than by spec:
//   - core.py splits sections on /^##\s*(.*?)$/m, which also splits on an
//     H3 (`### x` reads as a section named "# x"), so any heading other than
//     the one H1 and the H2s is an error here;
//   - core.py finds a link ANYWHERE in a section line (re.search), so prose
//     that happens to contain a link passes it; here a line must START as a
//     list item whose first thing is the link;
//   - a section line with no link at all crashes core.py (None.groupdict()):
//     that is the error this check exists to catch first.

// core.py `parse_link`: -\s*\[title\]\(url\)(?::\s*desc)?
const LINK_SEARCH = /-\s*\[(?<title>[^\]]+)\]\((?<url>[^)]+)\)(?::\s*(?<desc>.*))?/;
// Stricter: the line IS a list item that starts with the link.
const LINK_LINE = /^-\s+\[(?<title>[^\]]+)\]\((?<url>[^)\s]+)\)(?<rest>.*)$/;

// A port of core.py `parse_llms_file`. Throws where the reference throws.
export function parseLlmsTxt(txt) {
  const parts = txt.split(/^##\s*(.*?)$/m);
  const start = parts[0].trim();
  const sections = {};
  for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i];
    const body = (parts[i + 1] || '').trim();
    sections[name] = body.split(/\n+/).filter(l => l.trim()).map(l => {
      const m = l.match(LINK_SEARCH);
      if (!m) throw new Error(`section "${name}": no link on line "${l.slice(0, 80)}" (the reference parser crashes here)`);
      return { title: m.groups.title, url: m.groups.url, desc: m.groups.desc ?? null };
    });
  }
  const head = start.match(/^#\s*(?<title>.+?)$\n+(?:^>\s*(?<summary>.+?)$)?\n+(?<info>[\s\S]*)/m);
  if (!head) throw new Error('no H1 title followed by content (the reference parser finds no title)');
  return { title: head.groups.title, summary: head.groups.summary ?? null, info: head.groups.info, sections };
}

// Every way the file departs from the spec's shape: [{ line, message }].
export function lintLlmsTxt(txt) {
  const problems = [];
  const lines = txt.split('\n');
  const at = (i, message) => problems.push({ line: i + 1, message });
  let first = lines.findIndex(l => l.trim());
  if (first === -1) return [{ line: 1, message: 'empty file' }];
  if (!/^# \S/.test(lines[first])) at(first, 'the file must open with an H1 (`# Name`)');
  let section = null;
  let seenH2 = false;
  for (let i = first + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    if (/^#(?!#)\s/.test(l)) { at(i, 'a second H1 — the file has exactly one'); continue; }
    if (/^##\s/.test(l) && !/^###/.test(l)) {
      section = l.replace(/^##\s*/, '').trim();
      seenH2 = true;
      if (!section) at(i, 'an H2 with no name');
      continue;
    }
    if (/^#{3,}/.test(l)) { at(i, `an H${l.match(/^#+/)[0].length} heading — only one H1 and H2 sections are allowed (the reference parser reads it as a section)`); continue; }
    if (/^\s*>/.test(l) && i > first) {
      // The summary is the blockquote straight under the H1, one line.
      const prev = lines.slice(first + 1, i).filter(x => x.trim());
      if (seenH2 || prev.length) at(i, 'a blockquote that is not the one-line summary under the H1');
      else if (/^\s*>/.test(lines[i + 1] || '')) at(i + 1, 'the summary blockquote must be one line');
      continue;
    }
    if (!seenH2) continue; // free markdown between the summary and the first H2
    const m = l.match(LINK_LINE);
    if (!m) { at(i, `in "## ${section}": not a \`- [name](url): notes\` list item`); continue; }
    if (m.groups.rest && !/^:\s+\S/.test(m.groups.rest)) at(i, `in "## ${section}": text after the link must be \`: notes\``);
  }
  try { parseLlmsTxt(txt); } catch (e) { problems.push({ line: 0, message: `reference parser: ${e.message}` }); }
  return problems;
}
