#!/usr/bin/env node
/**
 * /sql-mock-interview/ (C2, 2026-11-22): the general "timed SQL mock interview"
 * page the G1 GEO read found missing (panel prompt #11, docs/reads/geo-2026-11-22.md).
 *
 * Copy: src/data/sql-mock-interview.js. Every fact about a mock — its title,
 * question count and format, minutes, pass mark, free or Pro — is read here
 * from src/data/mock-interviews.js, the file the app runs, so the page cannot
 * drift from the Interview tab. No mock's question or answer is rendered;
 * tests/sql-mock-interview.test.js checks the page against all of them.
 *
 * Rows carry their position (data-mock="1"…), never the mock's id: one legacy
 * id holds a phrase tests/seo-consistency.test.js bans anywhere in a page.
 *
 * Company mocks (`sourced: true`) are named and linked to their company page,
 * which carries the dated sources; this page states nothing about any
 * company's screen. Only the free mock gets an ?interview= link: a Pro mock's
 * link would open the Pro modal, and one mock's legacy id would put a banned
 * frequency phrase in an href (tests/seo-consistency.test.js).
 *
 * Writes src/sql-mock-interview.html (build-static-pages.js copies it to
 * public/) and the sitemap block <!-- mock-page:start/end -->. Runs in
 * `npm run build` before build-static-pages.js. Do not hand-edit the page.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { esc, inline, shell, breadcrumb, article, faqPage, faqSection, writeSitemapBlock, ROOT, SITE } from './guide-page-shell.mjs';
import {
  MOCK_PAGE_SLUG, MOCK_PAGE_PUBLISHED, MOCK_PAGE_TITLE, MOCK_PAGE_H1, MOCK_PAGE_DESCRIPTION, MOCK_PAGE_APP_SRC,
  CLOCK_POINTS, REHEARSE_STEPS, mockPageFaq,
} from '../src/data/sql-mock-interview.js';

export const SRC_PAGE = path.join(ROOT, 'src', `${MOCK_PAGE_SLUG}.html`);

export function loadMocks() {
  const ctx = { window: {}, console: { log() {}, warn() {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/data/mock-interviews.js'), 'utf8'), ctx);
  return ctx.window.mockInterviewsData;
}

/** The company page a sourced mock links to, e.g. Capital One → /capital-one-sql-interview/. */
export const companyPagePath = company => `/${String(company).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-sql-interview/`;

/** The facts the page states about each mock, all derived. */
export function mockRows(mocks = loadMocks()) {
  return mocks.map(m => {
    const mcq = m.questions.filter(q => q.type === 'mcq').length;
    const written = m.questions.length - mcq;
    return {
      id: m.id,
      title: m.title,
      role: m.role,
      questionsCount: m.questions.length,
      format: mcq ? `${m.questions.length} (${mcq} multiple choice, ${written} written SQL)` : `${written} written SQL`,
      minutes: Math.round(m.totalTime / 60),
      passingScore: m.passingScore,
      isFree: m.isFree === true,
      company: m.sourced ? m.company : null,
    };
  });
}

export function pageFacts(rows = mockRows()) {
  const free = rows.filter(r => r.isFree);
  if (free.length !== 1) throw new Error(`build-mock-interview-page: expected one free mock, found ${free.length}`);
  const byLength = rows.slice().sort((a, b) => a.minutes - b.minutes);
  const sourced = rows.filter(r => r.company);
  const companies = [...new Set(sourced.map(r => r.company))];
  return {
    free: free[0],
    proCount: rows.length - 1,
    shortest: byLength[0],
    longest: byLength[byLength.length - 1],
    proShortest: byLength.find(r => !r.isFree),
    sourced,
    companyList: companies,
    companies: companies.join(' and '),
  };
}

export function renderMockInterviewPage(mocks = loadMocks()) {
  const url = `${SITE}/${MOCK_PAGE_SLUG}/`;
  const rows = mockRows(mocks);
  const f = pageFacts(rows);
  const faq = mockPageFaq(f);
  const freeHref = `/app/?interview=${f.free.id}&amp;src=${MOCK_PAGE_APP_SRC}`;
  const ldObjects = [
    breadcrumb('Timed SQL mock interview', url),
    article({ headline: MOCK_PAGE_H1, description: MOCK_PAGE_DESCRIPTION, url, published: MOCK_PAGE_PUBLISHED }),
    faqPage(faq),
  ];
  const nameCell = r => r.company
    ? `${esc(r.title)}<br><a href="${companyPagePath(r.company)}">Format and sources on the ${esc(r.company)} page</a>`
    : esc(r.title);
  const table = `<div class="tbl prose"><table><thead><tr><th>Mock</th><th>Questions</th><th>Minutes</th><th>Pass mark</th><th>Access</th></tr></thead><tbody>${
    rows.map((r, i) => `<tr data-mock="${i + 1}"><td>${nameCell(r)}</td><td>${esc(r.format)}</td><td>${r.minutes}</td><td>${r.passingScore}%</td><td>${r.isFree ? 'Free' : 'Pro'}</td></tr>`).join('')
  }</tbody></table></div>`;
  const stepLink = {
    readiness: ' <a href="/sql-interview-readiness-test/" data-track="cta_mockpage_readiness">Take the readiness test</a>.',
    plan: ' <a href="/sql-interview-prep-plan/">Open the 2-week plan</a>.',
    free: ` <a href="${freeHref}" data-track="cta_mockpage_free_step">Start the ${esc(f.free.title)}</a>.`,
  };
  const sourcedByCompany = f.companyList.map(c => {
    const n = f.sourced.filter(r => r.company === c).length;
    return `<a href="${companyPagePath(c)}">${esc(c)}</a> (${n === 1 ? 'one mock' : n === 2 ? 'two mocks' : `${n} mocks`})`;
  }).join(' and ');
  const body = `  <h1 class="fd">${esc(MOCK_PAGE_H1)}</h1>
  <p class="answer" data-answer-first="true">SQL Quest's mock interviews run in your browser against a clock: a time limit for the whole sitting and one for each question, your query checked against the expected rows, and a score against a pass mark at the end. The ${esc(f.free.title)} (${f.free.questionsCount} questions, ${f.free.minutes} minutes) is free with no signup. The other ${f.proCount} mocks are Pro, from ${f.proShortest.minutes} to ${f.longest.minutes} minutes.</p>

  <h2 class="fd">What the clock changes</h2>
  <div class="why">${CLOCK_POINTS.map(p => `<p>${inline(p)}</p>`).join('')}</div>

  <h2 class="fd">The mocks</h2>
  ${table}
  <p class="lead" style="margin-top:12px;">${f.sourced.length} of the Pro mocks are practice modelled on what candidates report about ${f.companyList.length === 1 ? 'one company\'s screen' : `${f.companyList.length === 2 ? 'two' : f.companyList.length} companies' screens`}: ${sourcedByCompany}. Each company page gives the format with its sources and dates; no company wrote or endorsed these mocks. The questions and answers of every mock stay in the app, so the first time you meet a question is under the clock.</p>

  <h2 class="fd">How to rehearse a timed SQL screen</h2>
  <ol class="steps">${REHEARSE_STEPS.map(s => `<li><strong>${esc(s.h)}</strong> ${inline(s.p)}${s.link ? stepLink[s.link] : ''}</li>`).join('')}</ol>

  <div class="box" style="margin-top:36px;text-align:center;">
    <p class="fd" style="font-size:19px;font-weight:800;margin-bottom:6px;">Sit the free mock now</p>
    <p style="font-size:14px;color:#94a3b8;margin-bottom:16px;">${f.free.questionsCount} written SQL questions, ${f.free.minutes} minutes, a pass mark of ${f.free.passingScore}%. It runs in your browser, no signup.</p>
    <a class="btn bp" href="${freeHref}" data-track="cta_mockpage_free">Start the free mock →</a>
  </div>

${faqSection(faq)}

  <h2 class="fd">Related</h2>
  <div class="rel">
    <a href="/sql-interview-prep-plan/">2-week SQL interview prep plan<span>One skill a day, a mock near the end</span></a>
    <a href="/sql-interview-readiness-test/">SQL interview readiness test<span>Ten questions, a Skillmap, no signup</span></a>
    <a href="/sql-interview-prep/">Company interview guides<span>Every company page, grouped by sector</span></a>
    <a href="/sql-exercises/">SQL practice questions<span>By topic and difficulty</span></a>
  </div>`;
  return shell({
    generator: 'scripts/build-mock-interview-page.mjs', dataFile: 'src/data/sql-mock-interview.js',
    title: MOCK_PAGE_TITLE, description: MOCK_PAGE_DESCRIPTION, url, ldObjects, crumb: 'Timed mock interview', body,
  });
}

export const writeSitemap = () => writeSitemapBlock('mock-page', MOCK_PAGE_SLUG, MOCK_PAGE_PUBLISHED);

if (import.meta.url === `file://${process.argv[1]}`) {
  const mocks = loadMocks();
  fs.writeFileSync(SRC_PAGE, renderMockInterviewPage(mocks));
  writeSitemap();
  console.log(`[mock-interview-page] src/${MOCK_PAGE_SLUG}.html · ${mocks.length} mocks (${mocks.filter(m => m.isFree).length} free) · sitemap block 1 URL`);
}
