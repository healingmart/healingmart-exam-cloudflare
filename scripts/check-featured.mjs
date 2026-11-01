import fs from 'node:fs';import assert from 'node:assert/strict';
const raw=JSON.parse(fs.readFileSync(new URL('../public/data/featured-exams.json',import.meta.url),'utf8'));
assert(Array.isArray(raw.exams)&&raw.exams.length===2);
const iso=x=>/^\d{4}-\d\d-\d\d$/.test(x)&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
for(const exam of raw.exams){
 assert(exam.id&&exam.title&&exam.officialUrl.startsWith('https://')&&exam.scheduleSource.startsWith('https://'));
 assert(exam.phases.length>=3&&exam.phases.every(p=>iso(p.start)&&iso(p.end)&&p.end>=p.start));
 for(const [i,p] of exam.phases.entries())assert(p.label,exam.title+' '+i);
 if(exam.stat){
  assert(exam.stat.basis.includes('2차'));
  assert(exam.stat.points.every(p=>p.year&&p.applicants>=p.participants&&p.participants>=p.passed));
  assert(exam.stat.points.at(-1).year===exam.stat.year);
  assert(exam.stat.sourceUrl.startsWith('https://')&&exam.stat.officialStatsUrl.startsWith('https://'));
 }
 assert(exam.application.steps.length>=4&&exam.qualificationSource.startsWith('https://'));
}
const realtor=raw.exams.find(x=>x.id==='realtor');
assert(realtor.phases.some(x=>x.label.includes('시험')&&x.start==='2026-10-31'));
assert(realtor.phases.some(x=>x.label.includes('발표')&&x.start==='2026-12-02'));
assert.equal(realtor.stat.points.at(-1).participants,33247);
assert.equal(realtor.stat.points.at(-1).passed,10686);
console.log('EXAM_FEATURED_CHECK_OK',raw.exams.map(x=>x.title).join(', '));