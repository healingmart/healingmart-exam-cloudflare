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
