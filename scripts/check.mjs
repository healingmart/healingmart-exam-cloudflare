import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../public");
const file=p=>fs.readFileSync(path.join(base,p),"utf8");
const read=p=>JSON.parse(file("data/"+p));
const hasHttps=url=>{try{return new URL(url).protocol==="https:"}catch{return false}};
const validDate=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s)))return false;const [y,m,d]=s.split("-").map(Number);return new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)===s};
for(const name of ["index.html","app.js","style.css","favicon.svg","data/seed.json","data/manifest.json","data/schedule.json","data/rankings.json","data/briefs.json"]){
  assert(fs.statSync(path.join(base,name)).size>0,"missing "+name);
}
const seed=read("seed.json"),manifest=read("manifest.json"),schedule=read("schedule.json"),rank=read("rankings.json"),briefs=read("briefs.json");
assert(Array.isArray(seed)&&seed.length>=6,"seed catalog invalid");
assert(new Set(seed.map(x=>x.id)).size===seed.length,"duplicate seed id");
assert(typeof manifest.fullCatalog==="boolean"&&validDate(manifest.lastSync),"manifest invalid");
for(const row of seed)assert(row.id&&row.name&&row.agency&&row.registration&&hasHttps(row.url),"unverified seed identity");
assert(Array.isArray(schedule.events),"schedule invalid");
const dateIds=new Set();
for(const e of schedule.events){
  assert(e.status==="verified"&&validDate(e.date)&&validDate(e.verifiedAt)&&hasHttps(e.url)&&e.id&&e.source&&e.title&&["exam","apply","announce"].includes(e.type),"unsafe event");
  assert(!dateIds.has(e.id),"duplicate event");dateIds.add(e.id);
}
assert.equal(manifest.scheduleCount,schedule.events.length,"event count mismatch");
assert(Array.isArray(briefs)&&briefs.every(b=>validDate(b.published)&&hasHttps(b.url)&&b.title&&b.source),"official briefing invalid");
for(const key of ["applicants","difficulty","growth"]){
  const r=rank[key];assert(r&&Array.isArray(r.rows),"ranking schema missing");
  for(const row of r.rows)assert(Number.isInteger(r.year)&&row.name&&Number.isFinite(row.value)&&row.value>=0&&hasHttps(row.sourceUrl),"unverified ranking metric");
}
if(manifest.fullCatalog){
  const rec=read("index.json").records;
  assert(Array.isArray(rec)&&rec.length>50000,"full catalog unexpectedly small");
  assert.equal(manifest.privateQualifications,rec.length,"manifest record mismatch");
  assert.equal(manifest.total,rec.length+manifest.nationalQualifications,"total mismatch");
  const seen=new Set();
  const shards=new Map();
  for(const row of rec){
    assert(row.id&&row.name&&row.agency&&row.registration&&Number.isInteger(row.shard)&&row.shard>=0&&row.shard<256,"invalid catalog record");
    assert(!seen.has(row.id),"duplicate catalog id");seen.add(row.id);
    if(!shards.has(row.shard))shards.set(row.shard,[]);
    shards.get(row.shard).push(row.id);
  }
  for(const [n,ids] of shards){
    const detail=read("details/"+String(n).padStart(3,"0")+".json");
    for(const id of ids)assert(detail[id]?.status==="등록완료"&&hasHttps(detail[id].url),"invalid active detail "+id);
  }
  assert.equal(manifest.statusCounts.registered,rec.length,"active records don't match source");
  console.log("EXAM_CATALOG_OK",rec.length,"active","EXCLUDED",manifest.statusCounts.closed+manifest.statusCounts.canceled);
}
const worker=(await import("../src/worker.js")).default;
const ctx={ASSETS:{fetch:async()=>new Response(JSON.stringify(manifest))}};
const health=await worker.fetch(new Request("https://test.local/api/health"),ctx);
assert.equal(health.status,200);assert.equal((await health.json()).recordCount,manifest.total);
assert.equal((await worker.fetch(new Request("https://test.local/api/unknown"),ctx)).status,404);
console.log("EXAM_CHECK_OK",JSON.stringify({catalog:manifest.total,verifiedSchedule:schedule.events.length,officialBriefs:briefs.length,d1:false}));


// Q-Net parser and API input contracts: no raw secret needed for deterministic checks.
const {parseCatalog,parseOfficialSchedule} = await import("../src/providers/qnet.js");
const catalogFixture='<response><header><resultCode>00</resultCode></header><body><items><item><jmcd>1150</jmcd><jmfldnm>전기기사</jmfldnm><seriesnm>기사</seriesnm><qualgbnm>국가기술자격</qualgbnm></item></items></body></response>';
const rows=parseCatalog(catalogFixture);
assert.equal(rows.length,1,"QNet catalog fixture mismatch");
assert.equal(rows[0].itemCode,"1150");
assert.equal(rows[0].name,"전기기사");
const scheduleFixture='<table><tr><th>2026년 정기 기사 4회</th><td>2026.09.01 ~ 2026.09.04</td><td>2026.09.25 ~ 2026.10.10</td><td>2026.10.28</td><td></td><td></td><td></td></tr></table>';
const milestones=parseOfficialSchedule(scheduleFixture,"1150",2026);
assert.equal(milestones.length,3,"QNet milestone extraction mismatch");
assert.deepEqual(milestones.map(x=>x.type),["apply","exam","announce"]);
assert.deepEqual(milestones.map(x=>x.date),["2026-09-01","2026-09-25","2026-10-28"]);
assert.equal(milestones[0].endDate,"2026-09-04");
const invalid=await worker.fetch(new Request("https://test.local/api/qnet/items?q=a"),ctx);
assert.equal(invalid.status,400,"invalid query must not call upstream");
const unavailable=await worker.fetch(new Request("https://test.local/api/qnet/items?q=전기기사"),ctx);
assert.equal(unavailable.status,503,"missing secret must not be hidden");
const noKeyLeak=await unavailable.text();
assert(!noKeyLeak.includes("serviceKey="),"API response leaked credentials");
assert(file("app.js").includes('initQnetUI()')&&file("index.html").includes('id="qnetResults"'),"QNet frontend integration missing");
console.log("EXAM_QNET_CHECK_OK",JSON.stringify({sampleItems:rows.length,sampleMilestones:milestones.length,missingCredentialStatus:unavailable.status}));
