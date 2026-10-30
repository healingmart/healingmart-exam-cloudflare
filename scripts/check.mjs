import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const root=path.resolve(import.meta.dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,"public","data",p),"utf8"));
for(const f of ["index.html","style.css","app.js","data/seed.json","data/manifest.json","data/schedule.json"]){
  assert(fs.statSync(path.join(root,"public",f)).size>0,"File missing or empty: "+f);
}
const seed=read("seed.json"),manifest=read("manifest.json"),schedule=read("schedule.json");
assert(Array.isArray(seed),"seed is not array");
assert(seed.length>=6,"missing verified official seed data");
assert(new Set(seed.map(x=>x.id)).size===seed.length,"duplicate seed ids");
assert(typeof manifest.fullCatalog==="boolean");
assert(Array.isArray(schedule.events));
for(const item of seed){
  assert(item.name && item.registration && item.agency,"incomplete identity: "+item.id);
  assert(/^https?:\/\//i.test(item.url),"unsafe or missing URL");
  assert(["민간등록","민간공인","국가기술","국가전문"].includes(item.type),"unknown category");
}
for(const item of schedule.events){
  assert(/^\d{4}-\d{2}-\d{2}$/.test(item.date),"invalid calendar date");
  assert(item.title && item.source && /^https?:\/\//.test(item.url) && item.verifiedAt,"unverified schedule");
}
if(manifest.fullCatalog){
  const catalog=read("index.json");
  assert(Array.isArray(catalog.records)&&catalog.records.length>=100,"missing full catalog");
  assert(manifest.privateQualifications===catalog.records.length,"manifest mismatch");
  assert(new Set(catalog.records.map(x=>x.id)).size===catalog.records.length,"duplicate ids");
  for(const item of catalog.records.slice(0,100)){
    const shard=String(item.shard).padStart(3,"0");
    const details=read("details/"+shard+".json");
    assert(details[item.id],"missing details "+item.id);
  }
}
console.log("EXAM_CHECK_OK",JSON.stringify({seed:seed.length,fullCatalog:manifest.fullCatalog,events:schedule.events.length}));

const worker = (await import("../src/worker.js")).default;
const stub = { ASSETS: { fetch: async () => new Response(JSON.stringify(manifest)) } };
const health = await worker.fetch(new Request("https://example.org/api/health"), stub);
assert.equal(health.status, 200, "health API failed");
assert.equal((await health.json()).recordCount, manifest.total, "health manifest mismatch");
assert.equal((await worker.fetch(new Request("https://example.org/api/missing"), stub)).status, 404);
assert.equal((await worker.fetch(new Request("https://example.org/api/health", { method: "POST" }), stub)).status, 405);
console.log("EXAM_API_CHECK_OK");
