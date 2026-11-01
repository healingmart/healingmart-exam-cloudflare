"use strict";
(()=>{
const host=document.getElementById("examSpotlight"), picks=document.getElementById("examPicks");
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const date=s=>s?String(s).replaceAll("-","."):"—", n=v=>Number(v||0).toLocaleString("ko-KR");
const day=s=>new Date(s+"T12:00:00+09:00");
let exams=[], active=null,tab="overview",selectedStage=0,checked=new Set(),lastQuery="";
function phaseStatus(p,today){
  if(p.start>today)return "예정";
  if(p.end<today)return "종료";
  return "진행 중";
}
function findExam(q){
  const norm=String(q||"").toLowerCase().replace(/\s/g,"");
  if(norm.length<2)return null;
  return exams.find(ex=>ex.aliases.some(a=>norm.includes(a.toLowerCase().replace(/\s/g,""))))||null;
}
function nextDate(ex){
  return ex.phases.find(p=>p.end>=state.today&&p.start>=state.today)||
         ex.phases.find(p=>p.end>=state.today)||
         null;
}
function delta(s){return Math.round((day(s)-day(state.today))/86400000)}
function stageHTML(ex){
  return '<div class="exam-phase-list" role="list" aria-label="공식 시험 일정">'+ex.phases.map((p,i)=>{
    const status=phaseStatus(p,state.today);
    return '<button type="button" class="exam-phase '+(selectedStage===i?'is-active ':'')+(status==='진행 중'?'is-ongoing ':'')+'" data-stage="'+i+'" aria-pressed="'+(selectedStage===i)+'">'+
      '<span class="exam-phase-step">'+String(i+1).padStart(2,"0")+'</span><span class="exam-phase-name">'+E(p.label)+'</span>'+
      '<span class="exam-phase-date">'+E(date(p.start))+(p.start===p.end?'':' — '+E(date(p.end)))+'</span>'+
      '<span class="exam-phase-state '+(status==='진행 중'?'active':'')+'">'+status+'</span></button>';
  }).join('')+'</div><div class="exam-phase-caption" id="examPhaseCaption"></div>';
}
function stats(ex){
  const s=ex.stat;if(!s)return {last:null,previous:null,rate:null,change:null};
  const points=s.points,last=points.at(-1),previous=points.at(-2);
  return {last,previous,rate:last?.participants?last.passed/last.participants*100:null,change:previous?.participants?(last.participants/previous.participants-1)*100:null};
}
function badge(ex){
  const next=nextDate(ex);
  return next?'<span class="exam-current-pill">'+(next.start>state.today?'다음 일정 · ':'진행 중 · ')+E(next.label)+'</span>':'<span class="exam-current-pill">올해 공개 일정 종료 · 다음 회차 미확인</span>';
}
function overview(ex){
  const s=stats(ex),next=nextDate(ex);
  const dateText=next?(next.start>state.today?date(next.start):date(next.end)):'다음 회차 미공고';
  const near=next?(next.start>state.today?'D-'+delta(next.start):'진행 중'):'일정 대기';
  return '<div class="exam-overview-metrics">'+
  '<div class="exam-metric exam-metric-key"><span>다음 공식 단계</span><strong>'+E(dateText)+'</strong><small>'+E(next?.label||"다음 공식 공고 확인")+' · '+E(near)+'</small></div>'+
  '<div class="exam-metric"><span>최근 실제 응시자</span><strong>'+(s.last?n(s.last.participants)+'<em>명</em>':'공식자료 연결 중')+'</strong><small>'+(s.last?'2025년 · 2차 실제 응시 인원':'검증된 연도별 통계 미연결')+'</small></div>'+
  '<div class="exam-metric"><span>최근 합격률</span><strong>'+(s.rate!==null?s.rate.toFixed(2)+'<em>%</em>':'공식자료 연결 중')+'</strong><small>'+(s.last?'2025년 · 2차 합격자 / 실제 응시자':'합격률 임의 추정 안 함')+'</small></div></div>'+
  '<div class="exam-main-grid"><div class="exam-block"><div class="exam-block-head"><h3>접수부터 발표까지</h3><span>'+E(ex.round)+'</span></div>'+
  stageHTML(ex)+'</div><aside class="exam-block exam-decision"><span class="exam-side-tag">응시 준비</span><h3>이 시험, 내가 볼 수 있을까?</h3><p>'+E(ex.qualification)+'</p>'+
  '<a href="'+E(ex.qualificationSource)+'" target="_blank" rel="noopener noreferrer">공식 응시자격 확인 ↗</a>'+
  '<div class="exam-next-action"><strong>원서접수는 어떻게 하나요?</strong><p>로그인부터 접수 완료 확인까지 단계별로 안내합니다.</p>'+
  '<button type="button" data-tab="apply">원서접수 가이드 보기 →</button></div></aside></div>'+
  '<div class="exam-insight-line"><span>데이터 해석</span><p>'+E(s.last&&s.change!==null?'2025년 2차 실제 응시자는 전년 대비 '+Math.abs(s.change).toFixed(1)+'% '+(s.change<0?'감소':'증가')+'했습니다. 이는 시험 참여 추이이며 자격의 취업·매출 전망과 동일하지 않습니다.':ex.prospect.description)+'</p></div>';
}
function chart(ex){
  const d=ex.stat;if(!d)return '<div class="exam-empty-stats"><strong>검증된 응시자 시계열이 아직 없습니다.</strong><p>공식 통계에서 차수별 실제 응시·합격을 확인한 뒤 제공합니다. 접수자와 실제 응시자를 혼합하지 않습니다.</p><a target="_blank" rel="noopener noreferrer" href="'+E(ex.officialUrl)+'">공식 원문 확인 ↗</a></div>';
  const p=d.points,max=Math.max(...p.map(x=>x.participants))*1.13;
  const x=i=>50+i*105, y=v=>160-130*v/max;
  const poly=p.map((v,i)=>x(i)+','+y(v.participants).toFixed(1)).join(' ');
  const svg='<svg class="exam-svg" viewBox="0 0 540 220" role="img" aria-label="'+E(d.basis)+' 2021년부터 2025년까지 응시자 추이"><g stroke="currentColor" opacity=".14">'+[0,1,2,3].map(i=>'<line x1="40" y1="'+(30+i*43)+'" x2="510" y2="'+(30+i*43)+'"/>').join('')+'</g>'+
  '<polyline points="'+poly+'" fill="none" stroke="#288bdc" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'+
  p.map((v,i)=>'<circle cx="'+x(i)+'" cy="'+y(v.participants).toFixed(1)+'" r="6" fill="#288bdc" stroke="#fff" stroke-width="2"/><text class="exam-svg-label" x="'+x(i)+'" y="'+(y(v.participants)-13).toFixed(1)+'" text-anchor="middle">'+E((v.participants/1000).toFixed(1))+'천</text><text class="exam-svg-year" x="'+x(i)+'" y="192" text-anchor="middle">'+v.year+'</text>').join('')+'</svg>';
  const s=stats(ex);
  return '<div class="exam-chart-shell"><div class="exam-block-head"><h3>실제 응시자 수 추이</h3><span>공인중개사 2차 · 2021–2025</span></div>'+svg+
  '<div class="exam-chart-note"><strong>'+n(s.last.participants)+'명</strong><span>2025년 기준, 2024년 대비 '+Math.abs(s.change).toFixed(1)+'% '+(s.change<0?'감소':'증가')+'</span></div>'+
  '<details><summary>연도별 원자료 수치 펼치기</summary><div class="exam-table-scroll"><table><thead><tr><th>연도</th><th>접수자</th><th>실제 응시자</th><th>합격자</th><th>합격률</th></tr></thead><tbody>'+
  p.map(v=>'<tr><td>'+v.year+'</td><td>'+n(v.applicants)+'</td><td>'+n(v.participants)+'</td><td>'+n(v.passed)+'</td><td>'+(100*v.passed/v.participants).toFixed(2)+'%</td></tr>').join('')+'</tbody></table></div></details>'+
  '<p class="exam-provenance">2차 시험 기준 · 원자료: 한국산업인력공단. 이 표는 공시에서 재인용된 수치로, <a href="'+E(d.officialStatsUrl)+'" target="_blank" rel="noopener noreferrer">Q-Net 공식 통계 첨부자료</a> 및 <a href="'+E(d.sourceUrl)+'" target="_blank" rel="noopener noreferrer">인용 공시</a>를 함께 표시합니다. 연도·차수가 다른 통계를 합산하지 않습니다.</p></div>';
}
function application(ex){
 return '<div class="exam-block exam-application"><div class="exam-block-head"><h3>원서접수 실제 진행 순서</h3><span>주관기관 Q-Net · 직접 신청</span></div><p>'+E(ex.application.intro)+'</p><ol class="exam-application-steps">'+ex.application.steps.map((x,i)=>'<li><label><input type="checkbox" data-check="'+i+'" '+(checked.has(i)?'checked':'')+'><span><b>'+E(x)+'</b><small>단계를 확인했다면 체크하세요</small></span></label></li>').join('')+'</ol><div class="exam-apply-note">'+E(ex.application.photoNote||'')+'</div><a href="'+E(ex.officialUrl)+'" target="_blank" rel="noopener noreferrer" class="exam-go-official">Q-Net 공식 접수·안내 페이지 이동 ↗</a><p class="exam-provenance">접수 대행·자동 제출 기능은 제공하지 않습니다. 시험 응시료·서류·접수 시간은 반드시 해당 회차의 최신 공식 공고에서 최종 확인하세요.</p></div>';
}
function outlook(ex){
 const d=ex.prospect,s=stats(ex);
 return '<div class="exam-block exam-outlook"><div class="exam-block-head"><h3>자격의 활용과 전망</h3><span>사실과 해석을 구분합니다</span></div><h4>'+E(d.headline)+'</h4><p>'+E(d.description)+'</p><div class="exam-outlook-two"><div><span>이 자격으로 할 수 있는 일</span><p>'+E(d.career)+'</p></div><div><span>확인할 다른 지표</span><p>취업·채용 공고, 관련 산업 수요, 지역별 신규 등록·폐업 추이, 자격 취득자 활동현황 등의 공식 통계가 필요합니다.</p></div></div><p class="exam-provenance">실제 취업률·소득·취업 보장 여부는 현재 확인 자료가 없어 수치를 제시하지 않습니다. 유행·인기도와 직업 전망은 별도로 검증합니다.</p></div>';
}
function render(){
 if(!active)return;
 host.hidden=false;host.innerHTML='<div class="exam-focus-header"><div><span class="exam-label">HEALINGMART EXAM · ONE-PAGE REPORT</span><div class="exam-title-line"><h2 id="examSpotlightTitle">'+E(active.title)+'</h2><span class="exam-type-tag">'+E(active.category)+'</span></div><p>'+E(active.round)+' · '+E(active.agency)+' <span class="exam-data-stamp">자료 확인 2026.11.01</span></p></div><div class="exam-focus-actions">'+badge(active)+'<a href="'+E(active.scheduleSource)+'" target="_blank" rel="noopener noreferrer">공식 시험 일정 ↗</a></div></div>'+
 '<div class="exam-tabs" role="tablist" aria-label="시험 정보 보기">'+[['overview','한눈에 보기'],['stats','응시 통계'],['apply','원서접수 방법'],['outlook','활용·전망']].map(([k,label])=>'<button type="button" role="tab" data-tab="'+k+'" aria-selected="'+(k===tab)+'" class="'+(k===tab?'selected':'')+'">'+label+'</button>').join('')+'</div>'+
 '<div class="exam-focus-panel" role="tabpanel">'+(tab==='overview'?overview(active):tab==='stats'?chart(active):tab==='apply'?application(active):outlook(active))+'</div>'+
 '<div class="exam-focus-source">공식 Q-Net 원문 확인 <a href="'+E(active.scheduleSource)+'" target="_blank" rel="noopener noreferrer">시행계획 ↗</a> · 표시된 일정 외 2027년 일정은 확인 전입니다.</div>';
 if(tab==='overview')updateStage();
}
function updateStage(){
 const p=active?.phases[selectedStage],panel=document.getElementById('examPhaseCaption');
 if(!p||!panel)return;
 panel.innerHTML='<strong>'+E(p.label)+'</strong><span>'+E(date(p.start))+(p.start===p.end?'':' ~ '+E(date(p.end)))+' · '+phaseStatus(p,state.today)+'</span><p>'+E(p.note||'실제 응시 장소·개인별 일정은 공식 공고에서 재확인하세요.')+'</p>';
}
function open(ex,scroll=true){
 active=ex;tab='overview';selectedStage=Math.max(0,ex.phases.findIndex(p=>p.end>=state.today));
 checked=new Set();render();
 if(scroll)host.scrollIntoView({behavior:'smooth',block:'start'});
 return true;
}
function byId(id,scroll=true){const ex=exams.find(e=>e.id===id);return ex?open(ex,scroll):false}
function byQuery(q,scroll=false){lastQuery=q;const ex=findExam(q);if(!ex){active=null;host.hidden=true;return false;}open(ex,scroll);return true}
window.EXAM_FOCUS={
 query:q=>byQuery(q,false),
 fromQnet:item=>{const ex=findExam(item.name);return ex?open(ex,true):false},
 open:id=>byId(id)
};
picks?.addEventListener('click',e=>{const b=e.target.closest('[data-focus-id]');if(b)byId(b.dataset.focusId)});
host.addEventListener('click',e=>{
 const t=e.target.closest('[data-tab]');if(t){tab=t.dataset.tab;render();return}
 const stage=e.target.closest('[data-stage]');if(stage){selectedStage=Number(stage.dataset.stage);host.querySelectorAll('[data-stage]').forEach(x=>{x.classList.toggle('is-active',x===stage);x.setAttribute('aria-pressed',String(x===stage))});updateStage();}
});
host.addEventListener('change',e=>{if(e.target.matches('[data-check]')){const i=Number(e.target.dataset.check);if(e.target.checked)checked.add(i);else checked.delete(i);}});
document.getElementById('directoryInput')?.addEventListener('input',e=>byQuery(e.target.value,false));
document.querySelectorAll('[data-query]').forEach(b=>b.addEventListener('click',()=>{const ex=findExam(b.dataset.query);if(ex)open(ex,true)}));
fetch('/data/featured-exams.json').then(r=>{if(!r.ok)throw Error('featured');return r.json()}).then(d=>{exams=d.exams||[];if(lastQuery)byQuery(lastQuery,false);const search=state.query||new URLSearchParams(location.search).get('exam');if(search)byQuery(search,false);}).catch(err=>console.error('EXAM_FOCUS_DATA_UNAVAILABLE',err));
})();
