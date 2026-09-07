// Validate capital-one-codesignal mock questions against finans_fraud, mirroring
// the app's loadDataset typing (first-row typeof) + scripts/validate-fraud-challenges.js.
//
// Two kinds of question, two checks:
//   SQL  — the stated `solution` runs and returns at least one row.
//   MCQ  — the question's `verify.sql` runs, its single row is flattened to a
//          `value` string, and we assert that EXACTLY ONE option carries that
//          value AND that option is the stated `correctOptionId`. The correct
//          answer is therefore never hand-asserted: it is whatever the data
//          says, and a distractor that accidentally becomes true is a failure,
//          not a silent second correct answer.
//
// Usage:
//   node scripts/validate-capital-one-mock.mjs            # the whole interview
//   node scripts/validate-capital-one-mock.mjs "SELECT …"  # ad-hoc query
import fs from 'node:fs'; import vm from 'node:vm'; import Database from 'better-sqlite3';
import { isMcqQuestion, validateMcqQuestion } from '../src/utils/mock-interview.js';
const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
function loadWin(file){const sb={window:{},console:{log(){}}};vm.createContext(sb);vm.runInContext(fs.readFileSync(`${ROOT}/${file}`,'utf8'),sb);return sb.window;}
const ds=loadWin('src/data/finans-fraud-data.js').publicDatasetsData.finans_fraud;
const db=new Database(':memory:');
for(const [name,t] of Object.entries(ds.tables)){
  const types=t.columns.map((_,i)=>{const s=t.data[0]?.[i];return typeof s==='number'?(Number.isInteger(s)?'INTEGER':'REAL'):'TEXT';});
  db.exec(`CREATE TABLE ${name} (${t.columns.map((c,i)=>`${c} ${types[i]}`).join(', ')})`);
  const ins=db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(()=>'?').join(',')})`);
  db.transaction(rows=>rows.forEach(r=>ins.run(r)))(t.data);
  console.log(`  ${name.padEnd(13)} ${t.data.length} rows`);
}

// One row -> one comparable string. Numbers are normalised through Number() so
// 33517.90 and 33517.9 compare equal; multi-column verifications (e.g. "which
// query returns which count") join with a pipe, in the column order the
// verification SQL selects.
const flatten = (row) => Object.values(row).map(v => (typeof v === 'number' ? String(Number(v)) : String(v))).join('|');

const adhoc=process.argv[2];
let qs;
if(adhoc){ qs=[{id:'adhoc',title:'adhoc',solution:adhoc,timeLimit:0}]; }
else {
  const mi=loadWin('src/data/mock-interviews.js').mockInterviewsData.find(i=>i.id==='capital-one-codesignal');
  if(!mi){console.error('interview not found');process.exit(2);}
  const mcqCount=mi.questions.filter(isMcqQuestion).length;
  console.log(`\n${mi.title} — ${mi.questions.length} questions (${mcqCount} MCQ / ${mi.questions.length-mcqCount} SQL), totalTime ${mi.totalTime/60} min, sum timeLimit ${mi.questions.reduce((s,q)=>s+q.timeLimit,0)/60} min, points ${mi.questions.reduce((s,q)=>s+q.points,0)}`);
  if(mi.questionsCount!==mi.questions.length){console.log(`  WARN: questionsCount ${mi.questionsCount} != ${mi.questions.length} actual questions`);}
  if(mi.questions.reduce((s,q)=>s+q.timeLimit,0)>mi.totalTime){console.log('  WARN: per-question time limits exceed totalTime');}
  qs=mi.questions;
}
let fail=0;
for(const q of qs){
  if(isMcqQuestion(q)){
    // (a) shape
    const shapeErrors=validateMcqQuestion(q);
    // (b) the data decides which option is correct
    if(!q.verify?.sql){ fail++; console.log(`\n[${q.id}] FAIL: MCQ has no verify.sql`); continue; }
    let computed;
    try{
      const rows=db.prepare(q.verify.sql).all();
      if(rows.length!==1){ fail++; console.log(`\n[${q.id}] FAIL: verify.sql returned ${rows.length} rows, expected exactly 1`); continue; }
      computed=flatten(rows[0]);
    }catch(e){ fail++; console.log(`\n[${q.id}] verify.sql ERROR: ${e.message}`); continue; }

    const matches=q.options.filter(o=>String(o.value)===computed);
    const stated=q.options.find(o=>o.id===q.correctOptionId);
    console.log(`\n[${q.id}] ${q.title} (MCQ, ${q.timeLimit/60} min) -> data says "${computed}"`);
    console.log(`    stated correct: ${q.correctOptionId} = "${stated?.value}"  |  options matching data: ${matches.length}`);
    for(const e of shapeErrors){ fail++; console.log(`   FAIL: ${e}`); }
    if(matches.length!==1){ fail++; console.log(`   FAIL: ${matches.length} options match the computed value (need exactly 1) — ${matches.map(o=>o.id).join(', ')||'none'}`); }
    else if(matches[0].id!==q.correctOptionId){ fail++; console.log(`   FAIL: data matches option '${matches[0].id}' but correctOptionId is '${q.correctOptionId}'`); }
    continue;
  }
  try{ const st=db.prepare(q.solution); const rows=st.all(); const cols=st.columns().map(c=>c.name);
    console.log(`\n[${q.id}] ${q.title} (SQL, ${q.timeLimit/60} min) -> ${rows.length} rows  cols: ${cols.join(', ')}`);
    rows.slice(0,4).forEach(r=>console.log('   ',JSON.stringify(Object.values(r))));
    if(rows.length<1){fail++;console.log('   FAIL: zero rows');}
  }catch(e){fail++;console.log(`\n[${q.id}] ERROR: ${e.message}`);}
}
console.log(fail?`\n${fail} FAIL`:'\nALL PASS');process.exit(fail?1:0);
