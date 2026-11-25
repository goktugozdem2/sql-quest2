// /sql-ddl-dml-practice/ (C6, 2026-11-25): every statement on the page runs,
// and the page prints what SQLite returned; practice links can never point at
// an id the bank does not hold.
//
// The engine is sql.js (the package the state-grade tests use), the tables are
// loaded the app's way (loadDataset: a column's type comes from the first
// row's value), and every step gets its own fresh database, as each attempt
// in the app does.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import initSqlJs from 'sql.js';
import {
  DDL_DML_SECTIONS, DDL_DML_DATASET, DDL_DML_TITLE, DDL_DML_DESCRIPTION, DDL_DML_SLUG, DDL_DML_APP_SRC,
} from '../src/data/sql-ddl-dml.js';
import {
  renderDdlDmlPage, practiceItems, loadBank, LINK_TARGETS, LINK_START, withLink,
} from '../scripts/build-ddl-dml-page.mjs';

const here = rel => fileURLToPath(new URL(rel, import.meta.url));
const sb = { window: {}, console: { log() {} } };
vm.createContext(sb);
vm.runInContext(readFileSync(here('../src/data/datasets.js'), 'utf8'), sb);
const datasets = sb.window.publicDatasetsData;
const bank = loadBank();

let SQL;
beforeAll(async () => { SQL = await initSqlJs(); });

function freshDb() {
  const db = new SQL.Database();
  for (const [name, t] of Object.entries(datasets[DDL_DML_DATASET].tables)) {
    const types = t.columns.map((_, i) => {
      const s = t.data[0]?.[i];
      return typeof s === 'number' ? (Number.isInteger(s) ? 'INTEGER' : 'REAL') : 'TEXT';
    });
    db.run(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
    for (const r of t.data) db.run(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(', ')})`, r);
  }
  return db;
}

/** setup → sql → check on a fresh db; returns { error } or { result } projected onto `columns`. */
function runStep(section, step) {
  const db = freshDb();
  try {
    if (section.setup) db.exec(section.setup);
    try {
      if (step.sql) db.exec(step.sql);
    } catch (e) {
      return { error: e.message };
    }
    const [r] = db.exec(step.check);
    const cols = step.result.columns;
    const idx = cols.map(c => r.columns.indexOf(c));
    return { result: { columns: cols, rows: r.values.map(v => idx.map(i => v[i])) } };
  } finally {
    db.close();
  }
}

const steps = DDL_DML_SECTIONS.flatMap(s => s.steps.map((st, i) => [`${s.id} #${i + 1} (${st.kind}): ${st.label}`, s, st]));

describe('every statement on the page runs and returns what the page prints', () => {
  it.each(steps)('%s', (_, section, step) => {
    const out = runStep(section, step);
    if (step.error) {
      expect(out.error, 'the page says this statement fails').toBeDefined();
      expect(out.error).toContain(step.error);
    } else {
      expect(out.error, `unexpected error: ${out.error}`).toBeUndefined();
      expect(out.result).toEqual(step.result);
    }
  });

  it('a section setup alone runs clean', () => {
    for (const s of DDL_DML_SECTIONS.filter(x => x.setup)) {
      const db = freshDb();
      expect(() => db.exec(s.setup), s.id).not.toThrow();
      db.close();
    }
  });
});

describe('every section has a statement, a trap and its line', () => {
  it.each(DDL_DML_SECTIONS.map(s => [s.id, s]))('%s', (_, s) => {
    expect(s.steps.some(st => st.kind === 'right')).toBe(true);
    expect(s.steps.some(st => st.kind === 'trap')).toBe(true);
    expect(s.trap.length).toBeGreaterThan(40);
    expect(['DDL', 'DML']).toContain(s.kind);
  });

  it('the trap steps are really different from the right ones (a silent trap changes the result)', () => {
    for (const s of DDL_DML_SECTIONS) {
      const right = s.steps.find(st => st.kind === 'right' && st.result);
      for (const t of s.steps.filter(st => st.kind === 'trap' && st.result)) {
        if (right && right.check === t.check) expect(t.result, s.id).not.toEqual(right.result);
      }
    }
  });

  it('covers the six statements the page title names, plus CREATE TABLE', () => {
    const ids = DDL_DML_SECTIONS.map(s => s.id);
    expect(ids).toEqual(expect.arrayContaining(['insert-select', 'update', 'delete', 'upsert', 'alter-table', 'create-index', 'create-table']));
  });
});

describe('practice links: never a dead link, never a solution', () => {
  const html = renderDdlDmlPage(bank);
  const linkedIds = [...html.matchAll(/\/app\/\?challenge=(\d+)&amp;src=([a-z-]+)/g)].map(m => [Number(m[1]), m[2]]);

  it('every ?challenge= on the page is a state-graded challenge in the live bank, with the page src', () => {
    expect(linkedIds.length).toBeGreaterThan(0);
    for (const [id, src] of linkedIds) {
      const c = bank.find(x => x.id === id);
      expect(c, `challenge ${id}`).toBeDefined();
      expect(c.grade).toBe('state');
      expect(src).toBe(DDL_DML_APP_SRC);
    }
  });

  it('an id missing from the bank renders nothing: no link, no title', () => {
    const without = bank.filter(c => c.id !== 327);
    const page = renderDdlDmlPage(without);
    expect(page).not.toContain('challenge=327&');
    expect(page).not.toContain('The Sync Ran Twice');
    expect(practiceItems([327, 999999], without)).toEqual([]);
  });

  it('a SELECT-graded challenge with a listed id is not linked as DDL/DML practice', () => {
    const fake = bank.map(c => (c.id === 325 ? { ...c, grade: undefined } : c));
    expect(practiceItems([325], fake)).toEqual([]);
  });

  it('an id that lands later (355-359, PR #298) links as soon as the bank holds it; a locked Hard is named, not linked', () => {
    const later = [
      ...bank.filter(c => c.id < 355 || c.id > 359),
      { id: 355, title: 'Probe Medium', difficulty: 'Medium', grade: 'state' },
      { id: 359, title: 'Probe Hard', difficulty: 'Hard', grade: 'state' },
    ];
    const page = renderDdlDmlPage(later);
    expect(page).toContain(`/app/?challenge=355&amp;src=${DDL_DML_APP_SRC}`);
    expect(page).toContain('Probe Hard (Hard, Pro)');
    expect(page).not.toContain('challenge=359&');
    expect(page).toContain('the Hard one is Pro');
  });

  it('prints no linked challenge’s reference solution', () => {
    const norm = s => String(s).replace(/\s+/g, ' ').trim().toLowerCase();
    const text = norm(html.replace(/<[^>]+>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
    for (const [id] of linkedIds) {
      const c = bank.find(x => x.id === id);
      expect(text.includes(norm(c.solution)), `solution of ${id}`).toBe(false);
    }
  });
});

describe('the committed page, its links in and the sitemap', () => {
  const src = readFileSync(here(`../src/${DDL_DML_SLUG}.html`), 'utf8');

  it('the committed page is generated and links only ids the bank holds', () => {
    expect(src).toContain('GENERATED by scripts/build-ddl-dml-page.mjs');
    for (const m of src.matchAll(/challenge=(\d+)&amp;/g)) {
      const c = bank.find(x => x.id === Number(m[1]));
      expect(c && c.grade, `challenge ${m[1]}`).toBe('state');
    }
  });

  it('title and description fit the snippet caps', () => {
    expect(DDL_DML_TITLE.length).toBeLessThanOrEqual(70);
    expect(DDL_DML_DESCRIPTION.length).toBeLessThanOrEqual(170);
    expect(src).toContain(`<link rel="canonical" href="https://sqlquest.app/${DDL_DML_SLUG}/">`);
  });

  it('the FAQ JSON-LD says exactly what the visible FAQ says', () => {
    const ld = [...src.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    const faq = ld.find(o => o['@type'] === 'FAQPage');
    const visible = [...src.matchAll(/<h3>(.*?)<\/h3>\n\s*<p>(.*?)<\/p>/g)].map(m => m[1]);
    expect(faq.mainEntity.map(q => q.name.replace(/&/g, '&amp;'))).toEqual(visible);
  });

  it('/sql-exercises/ and the topic hub link to the page, once each', () => {
    for (const t of LINK_TARGETS) {
      const page = readFileSync(here(`../src/${t.file}`), 'utf8');
      expect(page.split(LINK_START).length - 1, t.file).toBe(1);
      expect(page).toContain(`href="/${DDL_DML_SLUG}/"`);
      expect(withLink(page, t), `${t.file}: a rebuild changes nothing`).toBe(page);
    }
  });

  it('the sitemap carries the page in its own block', () => {
    const xml = readFileSync(here('../public/sitemap.xml'), 'utf8');
    expect(xml).toMatch(new RegExp(`<!-- ddl-dml:start -->\\s*<url>\\s*<loc>https://sqlquest.app/${DDL_DML_SLUG}/</loc>`));
  });
});
