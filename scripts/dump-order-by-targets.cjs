#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const win = {};
global.window = win;
eval(fs.readFileSync(path.join(root, 'src/data/challenges.js'), 'utf8').replace(/window\./g, 'win.'));
const ids = [23,24,27,28,30,32,36,40,41,43,48,49,51,53,54,55,57,65,86,101,118];
const targets = win.challengesData.filter(c => ids.includes(c.id));
for (const c of targets) {
  console.log('====================');
  console.log('ID:', c.id, '|', c.title);
  console.log('SOLUTION ORDER BY:');
  const m = c.solution.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT\b|$)/i);
  console.log('  ', m ? m[1] : '?');
  console.log('DESCRIPTION (en):');
  console.log('  ', JSON.stringify(c.description));
  console.log('DESCRIPTION (tr):');
  console.log('  ', JSON.stringify(c.description_tr));
}
