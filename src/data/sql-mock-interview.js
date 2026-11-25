// /sql-mock-interview/ (C2, 2026-11-22). The G1 GEO read of 2026-11-22
// (docs/reads/geo-2026-11-22.md, panel prompt #11 "timed SQL mock interview
// online"): the mocks lived inside the Capital One and Revolut pages and no
// general page existed, while dbSyntax, DataDriven and Exponent each had one
// in the search proxy's top 10. Ledger: "two buyer-question pages: a 2-week
// prep plan and a timed mock".
//
// Rendered by scripts/build-mock-interview-page.mjs to src/sql-mock-interview.html.
// Every number about a mock (questions, minutes, pass mark, free or Pro) is
// read from src/data/mock-interviews.js at build time; this file holds words.
//
// Rules this content keeps (CLAUDE.md):
//   - never a mock's question or answer on the page (tests/sql-mock-interview.test.js
//     compares the page against every mock's prompts, snippets and solutions);
//   - no claim about any company's real screen: the company mocks are named
//     and linked to their company page, where the dated sources are;
//   - no claim about how often anything is asked; no price figure; what is
//     free is the mocks' own `isFree`.

export const MOCK_PAGE_SLUG = 'sql-mock-interview';
export const MOCK_PAGE_PUBLISHED = '2026-11-22';
export const MOCK_PAGE_TITLE = 'Timed SQL Mock Interview Online, Scored in the Browser | SQLQuest.app';
export const MOCK_PAGE_H1 = 'Timed SQL mock interview online: rehearse the screen before the screen';
export const MOCK_PAGE_DESCRIPTION = 'Sit a timed SQL mock interview in your browser: one clock, a limit per question, your rows checked and a score at the end. One mock is free; the rest are Pro.';
export const MOCK_PAGE_APP_SRC = 'sql-mock-interview';

/** What a timed sitting changes, in our mocks' terms. Plain description, no rates. */
export const CLOCK_POINTS = [
  'Practice lets you stop, look something up and come back tomorrow. A timed sitting does not: the clock runs while you read the tables, while you think and while you fix a typo.',
  'In a SQL Quest mock each question has its own time limit, and when it runs out your answer is submitted as it stands. When the whole clock runs out, the mock ends and is scored.',
  'A written answer is run and its rows are compared with the expected rows, so a query that runs but returns the wrong rows scores as wrong. At the end you get a score against the mock\'s pass mark.',
];

/** How to rehearse, in order. `link` keys are resolved by the generator. */
export const REHEARSE_STEPS = [
  { h: 'Find your weakest skill.', p: 'The readiness test shows a Skillmap across the nine skills and the one to fix first, with no signup.', link: 'readiness' },
  { h: 'Practise it untimed first.', p: 'Solve that skill\'s Medium questions until you can write them without a hint. The 2-week prep plan lays the nine skills out one a day.', link: 'plan' },
  { h: 'Sit the free mock as if it were the screen.', p: 'One sitting, no other tabs, no hints. Read every table before you write a line.', link: 'free' },
  { h: 'Read each miss, then retry only the misses.', p: 'Every wrong answer gets one sentence saying what went wrong. A retry gives you only the questions you missed, on a clock scaled to how many they are.' },
  { h: 'Sit a Pro mock that matches the interview.', p: 'A few days before, take the mock that matches your role or the company, so the format is not new on the day.' },
];

/** The FAQ, visible and JSON-LD alike. A function: every number comes from the mock data. */
export const mockPageFaq = ({ free, proCount, shortest, longest, companies }) => [
  ['Is there a free SQL mock interview?',
    `Yes: the ${free.title}, ${free.questionsCount} written SQL questions in ${free.minutes} minutes with a pass mark of ${free.passingScore}%. It starts in the browser with no signup. The other ${proCount} mocks are Pro.`],
  ['How long is a mock interview?',
    `From ${shortest.minutes} minutes (${shortest.title}) to ${longest.minutes} minutes (${longest.title}). Each mock's length and question count are in the table on this page.`],
  ['What happens when the time runs out?',
    'Each question has its own limit; when it runs out, your answer is submitted as it stands. When the whole clock runs out, the mock ends and is scored against its pass mark.'],
  ['Can I retry a mock?',
    'Yes. After a mock you can retry only the questions you missed, on a clock scaled to how many they are, and every wrong answer carries one sentence on what went wrong.'],
  [`Are the ${companies} mocks the real interview?`,
    'No. They are practice modelled on what candidates report about those screens, and each company page lists its sources with dates. No company wrote or endorsed them.'],
  ['Which SQL dialect do the mocks use?',
    'SQLite, in your browser. Joins, GROUP BY, CTEs and window functions are written the same way in PostgreSQL, MySQL and Snowflake; dates are where they differ.'],
];
