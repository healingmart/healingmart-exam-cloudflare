"use strict";
const $ = (id) => document.getElementById(id);
const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const number = v => Number(v||0).toLocaleString("ko-KR");
const normal = v => String(v||"").normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/\s+/g,"");
const safeUrl = v => {try{const u=new URL(v);return ["https:","http:"].includes(u.protocol)?u.href:null;}catch{return null;}};
const isoDate = s => {if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||"")))return false;const [y,m,d]=s.split("-").map(Number);return new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)===s};
const kstToday = () => {const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());return ["year","month","day"].map(n=>parts.find(p=>p.type===n)?.value).join("-")};
const dateOf = iso => new Date(iso+"T12:00:00Z");
const dayLabel = iso => {const [y,m,d]=iso.split("-").map(Number);return ["일","월","화","수","목","금","토"][new Date(Date.UTC(y,m-1,d)).getUTCDay()]};
const shortDate = iso => iso?.replace(/^(\d{4})-(\d\d)-(\d\d)$/,"$1.$2.$3")||"—";
const GROUP = {national:"국가자격",private:"등록 민간자격",accredited:"국가공인 민간자격"};
const state = {today:kstToday(),selected:"",year:0,month:0,events:[],catalog:[],seed:[],manifest:{},query:"",filter:"all",page:0,pageSize:12,calendarType:"all",ranking:"applicants",rankings:{},briefs:[],details:{},catalogLoading:false};
state.selected=state.today;[state.year,state.month]=state.today.slice(0,7).split("-").map(Number);
const json=async path=>{const r=await fetch(path,{cache:"default"});if(!r.ok)throw Error(path+": HTTP "+r.status);return r.json()};
const classOf=r=>r.type==="민간공인"?"accredited":r.type==="민간등록"?"private":"national";
const relevant=r=>[r.name,r.agency,r.registration,r.ministry,r.region].map(normal).join("|");
const officialEvent=e=>e?.status==="verified"&&isoDate(e.date)&&(!e.endDate||(isoDate(e.endDate)&&e.endDate>=e.date))&&e.title&&e.source&&e.verifiedAt&&isoDate(e.verifiedAt)&&safeUrl(e.url)&&["exam","apply","announce"].includes(e.type);
const eventEnd=e=>e.endDate&&isoDate(e.endDate)?e.endDate:e.date;
const eventIsOn=(e,day)=>e.date<=day&&eventEnd(e)>=day;
const eventPeriod=e=>e.endDate&&e.endDate!==e.date?shortDate(e.date)+" ~ "+shortDate(e.endDate):shortDate(e.date);
const eventStatus=(e,day)=>eventEnd(e)===day&&e.date!==day?"오늘 종료":e.date===day?"오늘 시작":eventIsOn(e,day)?"진행 중":"예정";
const futureEvents=()=>state.events.filter(e=>eventEnd(e)>=state.today).sort((a,b)=>(eventIsOn(a,state.today)?0:1)-(eventIsOn(b,state.today)?0:1)|| (eventIsOn(a,state.today)?eventEnd(a).localeCompare(eventEnd(b)):a.date.localeCompare(b.date)) || a.id.localeCompare(b.id));

const dateOffset=iso=>Math.round((dateOf(iso)-dateOf(state.today))/86400000);
function initHeader(){
  const now=state.today;
  $("todayStamp").textContent=now.replace(/-/g,".")+" ("+dayLabel(now)+")";
  $("heroToday").textContent=now.slice(8);
}
function readStats(){
  const m=state.manifest;
  $("statCatalog").textContent=number(m.fullCatalog?(m.privateQualifications||0)+(m.nationalQualifications||0):state.catalog.length);
  $("catalogNote").textContent=m.fullCatalog?"수집·검증된 서비스 검색 데이터":"초기 검증 데이터 · 민간자격 원장 수집 진행 전";
  $("statEvents").textContent=number(state.events.length);
  $("statUpdated").textContent=shortDate(m.lastSync||state.today).slice(5);
}
function showCalendar(){
  const y=state.year,m=state.month,first=new Date(Date.UTC(y,m-1,1)).getUTCDay();
  const last=new Date(Date.UTC(y,m,0)).getUTCDate();
  $("calTitle").textContent=y+"년 "+m+"월";
  const month=String(m).padStart(2,"0"), total=Math.ceil((first+last)/7)*7;
  let html="";
  for(let i=0;i<total;i++){
    const day=i-first+1;
    if(day<1||day>last){html+='<div class="calendar-cell outside" role="gridcell"></div>';continue;}
    const iso=y+"-"+month+"-"+String(day).padStart(2,"0");
    const active=visibleCalendarEvents().filter(e=>eventIsOn(e,iso));
    const counts={apply:active.filter(e=>e.type==="apply").length,exam:active.filter(e=>e.type==="exam").length,announce:active.filter(e=>e.type==="announce").length};
    const major=active.some(e=>e.type==="apply")?"apply":active.some(e=>e.type==="exam")?"exam":"announce";
    const classes=["calendar-cell",iso===state.selected?"active":"",iso===state.today?"is-today":"",active.length?"has-events has-"+major:""].filter(Boolean).join(" ");
    const chips=[["apply","접수"],["exam","시험"],["announce","발표"]].filter(([type])=>counts[type]>0);
    const flags=chips.map(([type,label])=>'<span class="date-flag '+type+'">'+label+(counts[type]>1?'<b>'+counts[type]+'</b>':"")+'</span>').join("");
    const marker=active.length?active.find(e=>e.type===major)||active[0]:null;
    const caption=marker?eType(marker)+" · "+(marker.date===iso?"시작":eventEnd(marker)===iso?"종료":"기간 중"):"";
    const aria=iso+" "+(active.length?active.length+"건 일정 · "+caption:"검증 일정 미등록");
    html+='<button class="'+classes+'" type="button" role="gridcell" data-day="'+iso+'" aria-label="'+escapeHtml(aria)+'"><span class="cell-num">'+day+'</span>'+(active.length?'<span class="date-flags">'+flags+'</span><span class="cell-label">'+escapeHtml(caption)+'</span>':"")+'</button>';
  }
  $("calendarGrid").innerHTML=html;
  showDay();
  renderCalendarExtras();
}
function eType(e){return {exam:"시험",apply:"원서접수",announce:"합격 발표"}[e.type]||"일정"}
function visibleCalendarEvents(){
  return state.calendarType==="all"?state.events:state.events.filter(e=>e.type===state.calendarType);
}
function eventRowHtml(e,day){
  const status=eventStatus(e,day);
  return '<div class="day-event"><span class="type-marker '+e.type+'">'+eType(e)+'</span><div>'+
    '<a target="_blank" rel="noopener noreferrer" href="'+escapeHtml(safeUrl(e.url))+'">'+escapeHtml(e.title)+' ↗</a>'+
    '<strong class="event-period">'+escapeHtml(eventPeriod(e))+'</strong>'+
    '<span class="event-progress '+e.type+'">'+escapeHtml(status)+'</span>'+
    '<small>'+escapeHtml(e.source)+(e.round?' · '+escapeHtml(e.round):"")+'</small>'+
    (e.scope?'<small class="event-scope">'+escapeHtml(e.scope)+'</small>':"")+
    '</div></div>';
}
function showDay(){
  const iso=state.selected;
  $("selectedDayNum").textContent=iso.slice(8);
  $("selectedDayWeek").textContent=dayLabel(iso)+"요일";
  $("selectedDayMonth").textContent=Number(iso.slice(5,7))+"월 "+iso.slice(0,4)+"년";
  const list=visibleCalendarEvents().filter(e=>eventIsOn(e,iso));
  const sorted=[...list].sort((a,b)=>({apply:0,exam:1,announce:2}[a.type]-{apply:0,exam:1,announce:2}[b.type])||a.date.localeCompare(b.date));
  if(sorted.length){
    const first=sorted.slice(0,3).map(e=>eventRowHtml(e,iso)).join("");
    const extra=sorted.length>3?'<details class="day-more"><summary>다른 일정 '+(sorted.length-3)+'건 더 보기</summary>'+
      sorted.slice(3).map(e=>eventRowHtml(e,iso)).join("")+'</details>':"";
    $("dayEventList").innerHTML='<div class="selected-total"><strong>'+sorted.length+'건</strong>의 공식 일정</div>'+first+extra;
  }else{
    $("dayEventList").innerHTML='<div class="no-events"><strong>이 날짜에 등록된 일정이 없습니다.</strong><span>미등록은 미시행을 의미하지 않습니다.</span></div>';
  }
  const next=futureEvents().filter(e=>state.calendarType==="all"||e.type===state.calendarType).slice(0,3);
  $("upcomingEvents").innerHTML=next.length?next.map(e=>{
    const ongoing=eventIsOn(e,state.today),soonDate=ongoing?eventEnd(e):e.date,diff=dateOffset(soonDate);
    return '<div class="upcoming-row"><span class="u-day">'+soonDate.slice(5).replace("-",".")+'</span>'+
      '<span class="u-meta"><b>'+escapeHtml(e.title)+'</b><small>'+escapeHtml(eventPeriod(e))+
      (ongoing?' · 진행 중':diff===0?' · 오늘':' · D-'+diff)+'</small></span>'+
      '<a class="u-link" href="'+escapeHtml(safeUrl(e.url))+'" target="_blank" rel="noopener noreferrer" aria-label="'+escapeHtml(e.title)+' 공식 공고">↗</a></div>';
  }).join(""):'<div class="no-events">검증된 다음 일정이 없습니다.</div>';
}
function jumpMonth(delta){
  const dt=new Date(Date.UTC(state.year,state.month-1+delta,1));
  state.year=dt.getUTCFullYear();state.month=dt.getUTCMonth()+1;
  const selected=state.year+"-"+String(state.month).padStart(2,"0")+"-01";
  state.selected=selected;showCalendar();
}
function applyQuery(value){
  state.query=value.trim();state.page=0;$("directoryInput").value=value;$("globalSearch").value=value;
  renderCatalog();document.querySelector("#directory").scrollIntoView({behavior:"smooth",block:"start"});
  if(state.manifest.fullCatalog&&state.catalog.length<=state.seed.length)loadCatalog();
}
function filtered(){
  const q=normal(state.query);
  let a=state.catalog.filter(r=>(state.filter==="all"||classOf(r)===state.filter)&&(!q||relevant(r).includes(q)));
  // Hide seed national records when the same official Q-Net item is returned.
  if(q&&qnetEnabled()&&qnetUI.entries.length){
    const names=new Set(qnetUI.entries.map(x=>normal(x.name)));
    a=a.filter(r=>classOf(r)!=="national"||!names.has(normal(r.name)));
  }
  if(q){
    const weight=r=>{const n=normal(r.name),reg=normal(r.registration);return n===q?0:n.startsWith(q)?1:reg===q?2:n.includes(q)?3:4};
    a=a.sort((x,y)=>weight(x)-weight(y)||x.name.localeCompare(y.name,"ko"));
  }
  return a;
}
function resultCard(r){
  const type=classOf(r),letter=r.name?.trim()?.slice(0,1)||"·";
  return '<button type="button" class="result-row '+type+'" data-id="'+escapeHtml(r.id)+'"><span class="result-initial">'+escapeHtml(letter)+'</span><span class="result-copy"><strong class="result-title">'+escapeHtml(r.name)+'</strong><span class="result-sub">'+escapeHtml(r.agency||"기관 확인 필요")+' &nbsp;·&nbsp; '+escapeHtml(r.registration||"등록번호 미확인")+'</span></span><span class="class-tag '+type+'">'+GROUP[type]+'</span><span class="result-arrow">↗</span></button>';
}
function renderCatalog(){
  const list=filtered(), end=(state.page+1)*state.pageSize;
  const officialCount=qnetEnabled()&&normal(state.query).length>=2?qnetUI.entries.length:0;
  $("searchTotal").textContent=number(list.length+officialCount)+"개 검색 결과";
  $("searchNotice").textContent=state.query?'“'+state.query+'” 검색':'자격명 · 발급기관 · 등록번호 기준';
  $("dataState").textContent=state.manifest.fullCatalog?"공식 원장 데이터":"초기 검증 6종목";
  $("resultList").hidden=!list.length&&officialCount>0;
  $("resultList").innerHTML=list.length?list.slice(0,end).map(resultCard).join(""):'<div class="directory-empty"><b>검색 결과가 없습니다.</b>다른 자격명이나 기관명으로 검색해보세요.'+(!state.manifest.fullCatalog?'<br>현재는 공식 전체 원장 연결 전입니다.':'')+'</div>';
  $("moreResults").hidden=end>=list.length;
  $("resultPagination").textContent=list.length?number(Math.min(end,list.length))+" / "+number(list.length)+"개":'';
}
async function loadCatalog(){
  if(!state.manifest.fullCatalog||state.catalogLoading)return;
  state.catalogLoading=true;
  $("dataState").textContent="전체 원장 불러오는 중";
  try {
    const d=await json("/data/index.json");
    if(!Array.isArray(d.records))throw Error("Invalid catalog");
    state.catalog=[...state.seed.filter(x=>classOf(x)==="national"),...d.records];
    renderCatalog();
  }catch(err){console.error("CATALOG_INDEX_ERROR",err);$("dataState").textContent="전체 원장 로드 실패";}finally{state.catalogLoading=false}
}
async function openDetail(id){
  const rec=state.catalog.find(r=>r.id===id);
  if(!rec)return;
  let r=rec;
  if(rec.shard!==undefined&&!rec.description){
    const shard=String(rec.shard).padStart(3,"0");
    try{
      if(!state.details[shard])state.details[shard]=await json("/data/details/"+shard+".json");
      r={...rec,...(state.details[shard][rec.id]||{})};
    }catch(err){console.error("DETAIL_LOAD_ERROR",err)}
  }
  const type=classOf(r),isNational=type==="national";
  const plus=isNational?"국가가 관리하는 자격체계와 응시요건을 공식 자료에서 확인할 수 있습니다.":"자기계발과 특정 직무 학습의 목표를 세우는 참고자료가 될 수 있습니다.";
  const minus=isNational?"응시자격과 시험 방식이 종목마다 다르며 취득이 취업을 보장하지 않습니다.":"등록 민간자격은 국가공인과 다릅니다. 검정료·갱신·채용 인정 여부를 개별 확인해야 합니다.";
  const kv=[
    ["자격 구분",GROUP[type]],["관리·발급기관",r.agency||"공식 출처 확인"],["등록·종목번호",r.registration||"원문 확인"],["자격 등급",r.grade||"원문 확인"],["공인 범위",isNational?"국가자격":r.accreditedScope==="부분공인"?"일부 등급 공인":r.accreditedScope==="공인"?"공인":"등록(공인 아님)"],["주무부처",r.ministry||"원문 확인"],["자격 운영 상태",r.status||"원문 확인"],["최초 등록일",r.registeredAt||"원문 확인"],["자료 기준일",r.verified||state.manifest.lastSync||"확인 전"]
  ];
  $("detailBody").innerHTML='<span class="class-tag '+type+'">'+GROUP[type]+'</span><h2 id="detailHeading">'+escapeHtml(r.name)+'</h2><p class="detail-lead">'+escapeHtml(r.description||"공식 자격정보 원장에서 직무내용과 응시자격을 확인할 수 있습니다.")+'</p><div class="detail-label">IDENTITY & SOURCE</div>'+kv.map(([a,b])=>'<div class="detail-row"><span>'+escapeHtml(a)+'</span><b>'+escapeHtml(b)+'</b></div>').join("")+'<div class="detail-advice"><b>활용 관점</b><p>＋ '+escapeHtml(plus)+'</p><b>확인해야 할 점</b><p>— '+escapeHtml(minus)+'</p></div><div class="detail-label">EXAM SCHEDULE</div><p class="detail-lead">이 자격의 공식 검증된 접수·시험·발표 일정만 달력에 표시합니다. 응시료와 합격률은 출처 확인 후 추가됩니다.</p>'+(safeUrl(r.url)?'<a class="detail-source" href="'+escapeHtml(safeUrl(r.url))+'" target="_blank" rel="noopener noreferrer">공식 원문 확인 ↗</a>':'')+'<p class="detail-notice">※ 실무 활용도 및 장단점은 일반적인 참고사항이며, 법적 효력과 취업 가능성을 보증하지 않습니다.</p>';
  $("detailDialog").showModal();
}
function showRank(){
  const r=state.rankings[state.ranking];
  const rows=Array.isArray(r?.rows)?r.rows.filter(x=>x.name&&Number.isFinite(x.value)&&x.value>=0&&safeUrl(x.sourceUrl)&&r.year):[];
  $("rankingYear").textContent=rows.length?String(r.year)+"년 기준":"자료 검증 중";
  if(!rows.length){
    $("rankingContent").innerHTML='<div class="ranking-pending"><div class="pending-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><strong>공식 통계 연결을 준비하고 있습니다.</strong><p>데이터가 확보되면 조사연도·모집단·출처를 함께 확인할 수 있습니다.<br>임의의 순위나 합격률은 게시하지 않습니다.</p></div>';return;
  }
  const max=Math.max(1,...rows.map(x=>x.value));
  $("rankingContent").innerHTML=rows.slice(0,6).map((x,i)=>'<a class="rank-entry" href="'+escapeHtml(safeUrl(x.sourceUrl))+'" target="_blank" rel="noopener noreferrer"><span class="rank-index">'+String(i+1).padStart(2,"0")+'</span><strong>'+escapeHtml(x.name)+'</strong><span class="rank-bar"><i style="width:'+Math.max(1,Math.min(100,100*x.value/max))+'%"></i></span><b>'+number(x.value)+(r.unit||"")+'</b></a>').join("");
}
function showBriefing(){
  const articles=state.briefs.filter(a=>a.title&&a.source&&isoDate(a.published)&&safeUrl(a.url));
  $("briefingList").innerHTML=articles.length?articles.slice(0,6).map(a=>'<a class="brief-card" href="'+escapeHtml(safeUrl(a.url))+'" target="_blank" rel="noopener noreferrer"><div class="brief-top"><span class="brief-source">'+escapeHtml(a.source)+'</span><span>'+escapeHtml(shortDate(a.published))+'</span></div><h3>'+escapeHtml(a.title)+'</h3><p>'+escapeHtml(a.summary||"공식 발표 원문을 확인하세요.")+'</p><span class="brief-link">공식 원문 읽기 ↗</span></a>').join(""):'<div class="brief-empty">검증된 공식 소식을 준비하고 있습니다. 제목과 날짜를 임의로 만들지 않습니다.</div>';
}
function setup(){
  initHeader();
  $("calPrev").onclick=()=>jumpMonth(-1);
  $("calNext").onclick=()=>jumpMonth(1);
  $("calToday").onclick=()=>{state.selected=state.today;[state.year,state.month]=state.today.slice(0,7).split("-").map(Number);showCalendar()};
  $("calendarGrid").addEventListener("click",e=>{const b=e.target.closest("[data-day]");if(b){state.selected=b.dataset.day;showCalendar()}});
  $("calendarTypeFilters").addEventListener("click",e=>{
    const b=e.target.closest("[data-calendar-type]");
    if(!b)return;
    state.calendarType=b.dataset.calendarType;
    for(const button of document.querySelectorAll("[data-calendar-type]")){
      const pressed=button===b;button.classList.toggle("selected",pressed);
      button.setAttribute("aria-pressed",String(pressed));
    }
    showCalendar();
  });
  $("heroSearchBtn").onclick=()=>applyQuery($("globalSearch").value);
  $("globalSearch").addEventListener("keydown",e=>{if(e.key==="Enter")applyQuery(e.target.value)});
  document.querySelectorAll("[data-query]").forEach(b=>b.onclick=()=>applyQuery(b.dataset.query));
  let searchTimer;
  $("directoryInput").addEventListener("input",e=>{const q=e.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{state.query=q.trim();state.page=0;renderCatalog();if(state.manifest.fullCatalog&&state.catalog.length<=state.seed.length)loadCatalog()},170)});
  $("directoryInput").addEventListener("focus",()=>{if(state.manifest.fullCatalog&&state.catalog.length<=state.seed.length)loadCatalog()});
  $("clearSearch").onclick=()=>{state.query="";$("directoryInput").value="";$("globalSearch").value="";renderCatalog()};
  $("filterTabs").addEventListener("click",e=>{const b=e.target.closest("[data-filter]");if(!b)return;state.filter=b.dataset.filter;state.page=0;document.querySelectorAll("[data-filter]").forEach(x=>{x.classList.toggle("selected",x===b);x.setAttribute("aria-pressed",String(x===b))});renderCatalog()});
  $("resultList").addEventListener("click",e=>{const b=e.target.closest("[data-id]");if(b)openDetail(b.dataset.id)});
  $("moreResults").onclick=()=>{state.page++;renderCatalog()};
  $("rankTabs").addEventListener("click",e=>{const b=e.target.closest("[data-rank]");if(!b)return;state.ranking=b.dataset.rank;document.querySelectorAll("[data-rank]").forEach(x=>{x.classList.toggle("selected",x===b);x.setAttribute("aria-pressed",String(x===b))});showRank()});
  $("closeDetail").onclick=()=>$("detailDialog").close();
  $("detailDialog").addEventListener("click",e=>{if(e.target===$("detailDialog"))$("detailDialog").close()});
  if("IntersectionObserver" in window){const io=new IntersectionObserver(entries=>{entries.forEach(ent=>{if(ent.isIntersecting){document.querySelectorAll(".side-nav a").forEach(x=>x.classList.toggle("active",x.hash==="#"+ent.target.id))}})},{threshold:.24});document.querySelectorAll("section[id]").forEach(s=>io.observe(s))}
}
async function main(){
  setup();showCalendar();showRank();showBriefing();
  try{
    const [manifest,seed,dates,ranks,briefs]=await Promise.all([json("/data/manifest.json?v=focus-calendar-20261030-5"),json("/data/seed.json"),json("/data/schedule.json?v=focus-calendar-20261030-5"),json("/data/rankings.json"),json("/data/briefs.json")]);
    if(!Array.isArray(seed)||typeof manifest.fullCatalog!=="boolean")throw Error("Invalid manifest");
    state.manifest=manifest;state.seed=seed;state.catalog=seed;
    state.events=(dates.events||[]).filter(officialEvent).sort((a,b)=>a.date.localeCompare(b.date));
    state.rankings=ranks||{};state.briefs=Array.isArray(briefs)?briefs:[];
    readStats();showCalendar();renderCatalog();showRank();showBriefing();renderHeroUpcoming();
    if(location.hash==="#directory"&&state.manifest.fullCatalog)loadCatalog();
  }catch(err){
    console.error("EXAM_BOOTSTRAP_FAILED",err);
    $("resultList").innerHTML='<div class="directory-empty"><b>데이터 연결을 확인하고 있습니다.</b>잠시 후 다시 시도하거나 공식기관 원문을 확인해 주세요.</div>';
    $("dataState").textContent="연결 오류";
  }
}
main();


// Q-Net live integration. Runs only for searches the visitor actually makes.
// Existing PQI static search remains independent; no API key is exposed to the browser.
const qnetUI = {requestId:0, timer:0, entries:[], cached:new Map(), selectedItems:[], selectedName:""};
function qnetEnabled(){
  return state.filter==="all"||state.filter==="national";
}
function qnetCard(item){
  return '<button type="button" class="qnet-result-row" data-qnet-code="'+escapeHtml(item.itemCode)+'">'+
    '<span class="qnet-number">'+escapeHtml(item.itemCode)+'</span>'+
    '<span class="qnet-result-copy"><strong>'+escapeHtml(item.name)+'</strong><small>'+escapeHtml(item.type||"국가자격")+' · '+escapeHtml(item.series||"한국산업인력공단")+'</small></span>'+
    '<span class="qnet-view">일정 확인 <span>↗</span></span></button>';
}
function showQnetResults(status,msg){
  const holder=$("qnetResults");
  if(!holder)return;
  const active=qnetEnabled()&&normal(state.query).length>=2;
  holder.hidden=!active;
  if(!active)return;
  const head='<div class="qnet-head"><div><span class="qnet-eyebrow">OFFICIAL / Q-NET</span><h3>국가기술·전문자격 공식 조회</h3><p>원서접수 · 필기 · 실기 · 합격 발표를 주관기관에서 직접 확인합니다.</p></div><a href="https://www.q-net.or.kr/" target="_blank" rel="noopener noreferrer">Q-NET 원문 ↗</a></div>';
  if(status==="loading"){
    holder.innerHTML=head+'<div class="qnet-message">공식 Q-Net 자격목록을 확인하고 있습니다.</div>';return;
  }
  if(status==="error"){
    holder.innerHTML=head+'<div class="qnet-message">공식 API가 현재 응답하지 않습니다. 민간자격 검색은 계속 이용할 수 있습니다. <a href="https://www.q-net.or.kr/" target="_blank" rel="noopener noreferrer">Q-Net에서 직접 조회 ↗</a></div>';return;
  }
  if(!qnetUI.entries.length){
    holder.innerHTML=head+'<div class="qnet-message">해당 검색어로 확인된 국가자격 종목이 없습니다.</div>';return;
  }
  holder.innerHTML=head+'<div class="qnet-result-count">'+number(qnetUI.entries.length)+'개 표시 · 공식 종목코드 기준</div>'+
    qnetUI.entries.map(qnetCard).join("");
}
async function queryQnet(){
  const query=state.query.trim(),current=++qnetUI.requestId;
  if(!qnetEnabled()||normal(query).length<2||normal(query).length>60){
    qnetUI.entries=[];showQnetResults("empty");renderCatalog();return;
  }
  const k=normal(query);
  if(qnetUI.cached.has(k)){
    qnetUI.entries=qnetUI.cached.get(k);showQnetResults("done");renderCatalog();return;
  }
  qnetUI.entries=[];showQnetResults("loading");
  try{
    const res=await fetch("/api/qnet/items?q="+encodeURIComponent(query)+"&limit=20");
    const data=await res.json();
    if(!res.ok||data.status!=="ok"||!Array.isArray(data.items))throw Error("OFFICIAL_QNET_UNAVAILABLE");
    if(current!==qnetUI.requestId)return;
    qnetUI.entries=data.items.filter(r=>/^[A-Z0-9]{4}$/.test(r.itemCode)&&r.name&&safeUrl(r.officialUrl));
    qnetUI.cached.set(k,qnetUI.entries);
    showQnetResults("done");renderCatalog();
  }catch(e){
    if(current!==qnetUI.requestId)return;
    qnetUI.entries=[];showQnetResults("error");renderCatalog();
  }
}
function enqueueQnet(delay=0){
  clearTimeout(qnetUI.timer);
  qnetUI.timer=setTimeout(queryQnet,delay);
}
function qnetDateCard(event){
  const end=event.endDate&&event.endDate!==event.date?" ~ "+escapeHtml(event.endDate):"";
  const colorClass=["exam","apply","announce"].includes(event.type)?event.type:"exam";
  const label=event.type==="apply"?"접수":event.type==="announce"?"발표":"시험";
  return '<button type="button" class="qnet-date" data-qnet-day="'+escapeHtml(event.date)+'">'+
    '<span class="type-marker '+colorClass+'">'+label+'</span>'+
    '<span class="qnet-date-copy"><strong>'+escapeHtml(event.title)+'</strong><small>'+escapeHtml(event.round)+' · '+escapeHtml(event.date)+end+'</small></span>'+
    '<span class="qnet-date-arrow">→</span></button>';
}
async function showOfficialQnetDetail(item){
  const dialog=$("detailDialog"),body=$("detailBody");
  if(!dialog.open)dialog.showModal();
  const year=Number(state.today.slice(0,4));
  const page=safeUrl(item.officialUrl)||"https://www.q-net.or.kr/";
  body.innerHTML='<span class="class-tag national">국가자격 · 공식 Q-Net</span>'+
    '<h2 id="detailHeading">'+escapeHtml(item.name)+'</h2>'+
    '<p class="detail-lead">한국산업인력공단 종목코드 '+escapeHtml(item.itemCode)+' · '+escapeHtml(item.series||item.type||"국가자격")+'</p>'+
    '<div class="detail-label">OFFICIAL EXAM SCHEDULE / '+year+'</div>'+
    '<p class="detail-lead">공식 종목별 시행일정을 확인하고 있습니다.</p>';
  try{
    const response=await fetch("/api/qnet/schedule?jmCd="+encodeURIComponent(item.itemCode)+"&year="+year);
    const data=await response.json();
    if(!response.ok||data.status!=="ok"||!Array.isArray(data.events))throw Error("SCHEDULE_UNAVAILABLE");
    if(!dialog.open||!body.textContent.includes(item.itemCode))return;
    const events=data.events.filter(officialEvent);
    // One selected qualification at a time. Preserve baseline verified calendar events.
    const owned=new Set(qnetUI.selectedItems);
    state.events=state.events.filter(x=>!owned.has(x.id));
    qnetUI.selectedItems=events.map(x=>x.id);
    qnetUI.selectedName=item.name;
    for(const e of events)if(!state.events.some(x=>x.id===e.id))state.events.push({...e,title:item.name+" · "+e.title});
    state.events.sort((a,b)=>a.date.localeCompare(b.date));
    if(state.manifest&&state.manifest.total)readStats();
    showCalendar();renderHeroUpcoming();
    body.innerHTML='<span class="class-tag national">국가자격 · 공식 Q-Net</span>'+
      '<h2 id="detailHeading">'+escapeHtml(item.name)+'</h2>'+
      '<p class="detail-lead">한국산업인력공단 종목코드 '+escapeHtml(item.itemCode)+' · '+escapeHtml(item.series||item.type||"국가자격")+'</p>'+
      '<div class="detail-label">'+year+' OFFICIAL EXAM SCHEDULE · '+number(events.length)+'건</div>'+
      (events.length?'<div class="qnet-schedule-list">'+events.map(qnetDateCard).join("")+'</div>':
        '<div class="qnet-schedule-empty">확인 가능한 해당 연도의 종목별 일정이 없습니다. 시험 미시행을 의미하지 않으며 공식 공고를 확인해 주세요.</div>')+
      '<p class="detail-notice">일정을 누르면 캘린더에서 해당 시작일과 종료일을 확인할 수 있습니다. 실제 응시일은 종목·지역·개인 배정에 따라 다를 수 있으니 Q-Net을 확인하세요.</p>'+
      '<a class="detail-source" href="'+escapeHtml(page)+'" target="_blank" rel="noopener noreferrer">Q-Net 공식 종목별 상세정보 ↗</a>';
  }catch(e){
    if(!dialog.open)return;
    body.innerHTML='<span class="class-tag national">국가자격 · 공식 Q-Net</span><h2 id="detailHeading">'+escapeHtml(item.name)+'</h2>'+
      '<p class="detail-lead">공식 종목별 일정을 확인할 수 없습니다. 임의의 시험일을 표시하지 않습니다.</p>'+
      '<a class="detail-source" href="'+escapeHtml(page)+'" target="_blank" rel="noopener noreferrer">Q-Net에서 직접 확인 ↗</a>';
  }
}
function initQnetUI(){
  $("heroSearchBtn").addEventListener("click",()=>enqueueQnet());
  $("globalSearch").addEventListener("keydown",e=>{if(e.key==="Enter")enqueueQnet()});
  document.querySelectorAll("[data-query]").forEach(b=>b.addEventListener("click",()=>enqueueQnet()));
  $("directoryInput").addEventListener("input",()=>enqueueQnet(330));
  $("clearSearch").addEventListener("click",()=>{qnetUI.requestId++;clearTimeout(qnetUI.timer);qnetUI.entries=[];showQnetResults("empty")});
  $("filterTabs").addEventListener("click",()=>enqueueQnet());
  $("qnetResults").addEventListener("click",e=>{
    const button=e.target.closest("[data-qnet-code]");
    if(!button)return;
    const item=qnetUI.entries.find(x=>x.itemCode===button.dataset.qnetCode);
    if(item)showOfficialQnetDetail(item);
  });
  $("detailBody").addEventListener("click",e=>{
    const button=e.target.closest("[data-qnet-day]");
    if(!button||!isoDate(button.dataset.qnetDay))return;
    const date=button.dataset.qnetDay;
    state.selected=date;
    [state.year,state.month]=date.slice(0,7).split("-").map(Number);
    showCalendar();
    $("detailDialog").close();
    $("calendar").scrollIntoView({behavior:"smooth",block:"start"});
  });
}
initQnetUI();


// Horizontal fluid schedule strip. Links to the existing verified calendar.
function renderHeroUpcoming(){
  const host=$("heroUpcoming");
  if(!host)return;
  const ongoing=futureEvents().filter(e=>eventIsOn(e,state.today));
  const next=futureEvents().filter(e=>!eventIsOn(e,state.today));
  const items=[...ongoing.slice(0,3),...next.slice(0,Math.max(0,3-ongoing.length))];
  if(!items.length){host.innerHTML='<span class="timeline-empty">확인된 다음 일정은 아직 없습니다. 공식 공고를 참고하세요.</span>';return;}
  host.innerHTML=items.map(e=>{
    const day=eventIsOn(e,state.today)?state.today:e.date;
    return '<button type="button" class="timeline-item" data-timeline-day="'+escapeHtml(day)+'" aria-label="'+escapeHtml(e.title)+' 일정 보기"><span class="timeline-date">'+(eventIsOn(e,state.today)?'<b class="timeline-live">진행 중</b>':escapeHtml(e.date.slice(5).replace("-",".")))+'</span><span class="timeline-title">'+escapeHtml(e.title)+'</span><span class="timeline-range">'+escapeHtml(eventPeriod(e))+'</span></button>';
  }).join("");
}

$("heroUpcoming")?.addEventListener("click",event=>{
  const button=event.target.closest("[data-timeline-day]");
  if(!button||!isoDate(button.dataset.timelineDay))return;
  state.selected=button.dataset.timelineDay;
  [state.year,state.month]=state.selected.slice(0,7).split("-").map(Number);
  showCalendar();
  document.querySelector("#calendar").scrollIntoView({behavior:"smooth",block:"start"});
});


function renderCalendarExtras(){
  const overview=$("todayOverview"),month=$("monthEventList"),count=$("monthScheduleCount");
  if(overview){
    const current=state.events.filter(e=>eventIsOn(e,state.today));
    const apply=current.filter(e=>e.type==="apply").length;
    const exam=current.filter(e=>e.type==="exam").length;
    const ends=current.filter(e=>e.type==="apply"&&eventEnd(e)===state.today).length;
    overview.innerHTML='<span class="overview-date">'+escapeHtml(shortDate(state.today))+' 기준</span>'+
      '<span class="overview-text"><strong>오늘 진행 중인 공식 일정</strong>'+
      '<span class="overview-metric apply"><b>'+apply+'</b>건 접수</span>'+
      '<span class="overview-metric exam"><b>'+exam+'</b>건 시험기간</span>'+
      (ends?'<span class="overview-urgent"><b>'+ends+'</b>건 오늘 접수 마감</span>':'')+
      '</span>';
  }
  if(!month||!count)return;
  const first=state.year+"-"+String(state.month).padStart(2,"0")+"-01";
  const last=state.year+"-"+String(state.month).padStart(2,"0")+"-"+String(new Date(Date.UTC(state.year,state.month,0)).getUTCDate()).padStart(2,"0");
  const rows=visibleCalendarEvents().filter(e=>e.date<=last&&eventEnd(e)>=first).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  count.textContent=number(rows.length)+"건";
  month.innerHTML=rows.length?rows.map(e=>{
    const range=eventPeriod(e);
    return '<button class="month-schedule-row" type="button" data-month-day="'+escapeHtml(e.date<first?first:e.date)+'">'+
      '<span class="month-schedule-type '+e.type+'">'+eType(e)+'</span>'+
      '<span class="month-schedule-body"><strong>'+escapeHtml(e.title)+'</strong><small>'+escapeHtml(e.source)+(e.scope?' · '+escapeHtml(e.scope):'')+'</small></span>'+
      '<span class="month-schedule-dates">'+escapeHtml(range)+'</span><span class="month-schedule-arrow">→</span></button>';
  }).join(""):'<div class="month-schedule-empty">이 달에는 등록된 공식 일정이 없습니다. 시험 미시행을 의미하지는 않습니다.</div>';
}
$("monthEventList")?.addEventListener("click",event=>{
  const b=event.target.closest("[data-month-day]");
  if(!b||!isoDate(b.dataset.monthDay))return;
  state.selected=b.dataset.monthDay;
  [state.year,state.month]=state.selected.slice(0,7).split("-").map(Number);
  showCalendar();
  $("calendarGrid").scrollIntoView({behavior:"smooth",block:"center"});
});
