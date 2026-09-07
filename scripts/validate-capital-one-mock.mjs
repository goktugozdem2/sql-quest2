// Validate capital-one-codesignal mock questions against finans_fraud, mirroring
// the app's loadDataset typing (first-row typeof) + scripts/validate-fraud-challenges.js.
import fs from 'node:fs'; import vm from 'node:vm'; import Database from 'better-sqlite3';
const ROOT='/Users/cgozdemm/sql-quest2';
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
const adhoc=process.argv[2];
let qs;
if(adhoc){ qs=[{id:'adhoc',title:'adhoc',solution:adhoc,timeLimit:0}]; }
else {
  const mi=loadWin('src/data/mock-interviews.js').mockInterviewsData.find(i=>i.id==='capital-one-codesignal');
  if(!mi){console.error('interview not found');process.exit(2);}
  console.log(`\n${mi.title} — ${mi.questions.length} questions, totalTime ${mi.totalTime/60} min, sum timeLimit ${mi.questions.reduce((s,q)=>s+q.timeLimit,0)/60} min, points ${mi.questions.reduce((s,q)=>s+q.points,0)}`);
  qs=mi.questions;
}
let fail=0;
for(const q of qs){
  try{ const st=db.prepare(q.solution); const rows=st.all(); const cols=st.columns().map(c=>c.name);
    console.log(`\n[${q.id}] ${q.title} (${q.timeLimit/60} min) -> ${rows.length} rows  cols: ${cols.join(', ')}`);
    rows.slice(0,4).forEach(r=>console.log('   ',JSON.stringify(Object.values(r))));
    if(rows.length<1){fail++;console.log('   FAIL: zero rows');}
  }catch(e){fail++;console.log(`\n[${q.id}] ERROR: ${e.message}`);}
}
console.log(fail?`\n${fail} FAIL`:'\nALL PASS');process.exit(fail?1:0);
