"use strict";
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (n) => Number(n || 0).toLocaleString("ko-KR");
const todayParts = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
const part = (n) => todayParts.find((p) => p.type === n)?.value;
const today = [part("year"),part("month"),part("day")].join("-");
const state = {items:[],seed:[],manifest:null,events:[],type:"all",q:"",page:0,pageSize:20,selected:null,cache:{},year:Number(part("year")),month:Number(part("month")),day:today};
const categories = {
  "국가기술": "국가자격","국가전문":"국가자격","국가자격":"국가자격",
  "민간등록":"등록 민간자격","민간공인":"국가공인 민간자격"
};
const safeUrl = (s) => {try {const u=new URL(s);return ["https:","http:"].includes(u.protocol) ? u.href : null;} catch{return null;}};
const group = (r) => categories[r.type] || r.type || "기타";
const norm = (s) => String(s||"").normalize("NFKC").toLowerCase().replace(/\s+/g,"");
const matchesType = (r) => state.type==="all" || state.type===r.type || (state.type==="국가기술" && group(r)==="국가자격");
let filteredCache = [];
function renderStats(){
  const m=state.manifest||{};
  const isFull=Boolean(m.fullCatalog && state.items.length > 6);
  $("statTotal").textContent=fmt(state.items.length);
  $("statPrivate").textContent=fmt(state.items.filter(x=>group(x)!=="국가자격").length);
  $("statNational").textContent=fmt(state.items.filter(x=>group(x)==="국가자격").length);
  $("statSchedule").textContent=fmt(state.events.length);
  $("statMode").textContent=isFull?"정식 등록원장 기반":"초기 검증 항목 · 전체 수집 전";
  $("lastSync").textContent="데이터 기준 "+(m.lastSync||"미확인");
}
function resultHTML(r){
  const isPrivate=group(r)!=="국가자격";
  return `<button class="result-item ${isPrivate?"private":""} ${state.selected===r.id?"selected":""}" data-id="${esc(r.id)}">
    <span class="result-symbol" aria-hidden="true">${isPrivate?"✳":"▣"}</span>
    <span class="result-body"><span class="result-name">${esc(r.name)}</span><span class="result-meta">${esc(r.agency||"기관 확인 필요")}<em>·</em>${esc(r.registration||"등록번호 확인 필요")}</span></span>
    <span class="result-badge ${isPrivate?"private":""}">${esc(group(r))}</span><span class="item-chevron">›</span></button>`;
}
function filterResults(){
  const q=norm(state.q);
  let list=state.items.filter(r=>matchesType(r)&&(!q||norm([r.name,r.agency,r.registration,r.ministry,r.region].join(" ")).includes(q)));
  if(q){
    const score=(r)=>{const n=norm(r.name),a=norm(r.agency),reg=norm(r.registration);return (n===q?0:n.startsWith(q)?1:reg===q?2:n.includes(q)?3:a.includes(q)?4:5)};
    list=list.sort((a,b)=>score(a)-score(b)||a.name.localeCompare(b.name,"ko"));
  }
  return list;
}
function renderResults(reset=false){
  if(reset)state.page=0;
  filteredCache=filterResults();
  $("resultCount").textContent=fmt(filteredCache.length)+"개 자격 검색 결과";
  $("resultHint").textContent=state.manifest?.fullCatalog?"공식 등록원장 기준":"초기 검증 데이터만 표시 중";
  const end=(state.page+1)*state.pageSize;
  const content=filteredCache.slice(0,end);
  $("results").innerHTML=content.length?content.map(resultHTML).join(""):`<div class="empty"><strong>일치하는 항목이 없습니다.</strong>${state.manifest?.fullCatalog?"다른 검색어 또는 발급기관을 시도하세요.":"현재는 소규모 검증 데이터만 제공됩니다. 전체 원장 연결 후 검색 범위가 확대됩니다."}</div>`;
  $("loadMore").hidden=end>=filteredCache.length;
}
function advice(r){
  if(group(r)==="국가자격"){
    return {plus:"국가자격으로서 관련 법령과 자격체계가 명확한 편입니다. 직무별 활용 가능성을 확인해 보세요.",minus:"응시자격·실기·검정방식·일정이 종목에 따라 다릅니다. 취득 자체가 취업을 보장하지는 않습니다."};
  }
  if(r.type==="민간공인"){
    return {plus:"국가공인 여부와 적용 범위를 공식 자료로 확인할 수 있습니다.",minus:"공인 범위와 유효기간, 채용 분야의 인정 여부를 별도로 확인해야 합니다."};
  }
  return {plus:"관심 분야의 학습 목표와 직무 역량을 체계적으로 정리하는 데 참고할 수 있습니다.",minus:"등록 자체는 국가공인을 뜻하지 않습니다. 응시료·검정방식·실제 활용도는 발급기관과 채용처에서 확인해야 합니다."};
}
async function selectDetail(id){
  state.selected=id;
  const rec=state.items.find(x=>x.id===id);
  if(!rec)return;
  let r=rec;
  if(rec.shard!==undefined && !rec.description){
    const k=String(rec.shard).padStart(3,"0");
    if(!state.cache[k]){ try {const resp=await fetch("/data/details/"+k+".json");if(resp.ok)state.cache[k]=await resp.json();}catch{} }
    r={...rec,...(state.cache[k]?.[rec.id]||{})};
  }
  if(state.selected!==id)return;
  const a=advice(r),link=safeUrl(r.url);
  const status=r.status||"공식 원문 확인";
  $("selected-title").textContent="자격증 상세정보";
  $("detail").innerHTML=`<span class="detail-tag">${esc(group(r))}</span><h4>${esc(r.name)}</h4>
    <p>${esc(r.description||"직무내용은 공식 출처에서 확인하세요.")}</p>
    <div class="detail-row"><span>발급·관리기관</span><strong>${esc(r.agency||"확인 필요")}</strong></div>
    <div class="detail-row"><span>등록·종목번호</span><strong>${esc(r.registration||"확인 필요")}</strong></div>
    <div class="detail-row"><span>주무부처</span><strong>${esc(r.ministry||"원문 확인")}</strong></div>
    <div class="detail-row"><span>지역 / 상태</span><strong>${esc((r.region||"전국·미분류")+" / "+status)}</strong></div>
    <div class="detail-section"><b>활용 관점 · 참고용</b><p>✓ ${esc(a.plus)}</p><p>△ ${esc(a.minus)}</p></div>
    <div class="detail-section"><b>시험일정 및 응시료</b><p>공식 검증 일정이 등록되면 달력에 표시됩니다. 현재 해당 자격의 일정과 응시료를 확정하지 않습니다.</p></div>
    ${link?`<a class="official-btn" href="${esc(link)}" target="_blank" rel="noopener noreferrer">공식 출처에서 확인 ↗</a>`:""}
    <p class="muted">출처: ${esc(r.source||"원장")} · ${esc(r.verified||"갱신일 확인 필요")}</p>`;
  renderResults();
}
function renderMonth(){
  const y=state.year,m=state.month;
  $("monthTitle").textContent=y+"년 "+m+"월";
  const first=new Date(Date.UTC(y,m-1,1)).getUTCDay();
  const days=new Date(Date.UTC(y,m,0)).getUTCDate();
  const monthStr=String(m).padStart(2,"0");
  const eventDays=new Set(state.events.map(e=>String(e.date||"").slice(0,10)));
  let html="";
  for(let i=0;i<first;i++)html+='<span class="month-day outside"></span>';
  for(let day=1;day<=days;day++){
    const date=y+"-"+monthStr+"-"+String(day).padStart(2,"0");
    html+=`<button type="button" class="month-day ${date===today?"today":""} ${date===state.day?"selected":""} ${eventDays.has(date)?"has-event":""}" data-date="${date}" aria-label="${date}">${day}</button>`;
  }
  $("monthGrid").innerHTML=html;
  renderDateEvents();
}
function renderDateEvents(){
  const day=state.day||today;
  const events=state.events.filter(x=>String(x.date).slice(0,10)===day);
  $("dateEvents").innerHTML=`<strong>${esc(day)}</strong>`+(events.length?events.map(e=>`<div class="event-line">${esc(e.title)} ${safeUrl(e.url)?`<a target="_blank" rel="noopener noreferrer" href="${esc(safeUrl(e.url))}">공식 확인 ↗</a>`:""}</div>`).join(""):'<p>공식 확인된 시험 일정이 없습니다.</p>');
}
function attach(){
  let timer;
  $("searchInput").addEventListener("input",(e)=>{clearTimeout(timer);timer=setTimeout(()=>{state.q=e.target.value.trim();renderResults(true);},180);});
  $("searchButton").addEventListener("click",()=>{state.q=$("searchInput").value.trim();renderResults(true);$("explore").scrollIntoView({behavior:"smooth"});});
  $("searchInput").addEventListener("keydown",(e)=>{if(e.key==="Enter")$("searchButton").click();});
  document.querySelectorAll("[data-search]").forEach(b=>b.addEventListener("click",()=>{$("searchInput").value=b.dataset.search;state.q=b.dataset.search;renderResults(true);$("explore").scrollIntoView({behavior:"smooth"});}));
  $("tabs").addEventListener("click",(e)=>{const b=e.target.closest("[data-type]");if(!b)return;state.type=b.dataset.type;document.querySelectorAll("[data-type]").forEach(x=>{const active=x===b;x.classList.toggle("active",active);x.setAttribute("aria-pressed",String(active))});renderResults(true);});
  $("resetButton").addEventListener("click",()=>{$("searchInput").value="";state.q="";state.type="all";document.querySelector('[data-type="all"]').click();renderResults(true);});
  $("results").addEventListener("click",(e)=>{const b=e.target.closest("[data-id]");if(!b)return;selectDetail(b.dataset.id);if(window.innerWidth<851)document.querySelector(".side-stack").scrollIntoView({behavior:"smooth",block:"start"});});
  $("loadMore").addEventListener("click",()=>{state.page++;renderResults();});
  $("prevMonth").addEventListener("click",()=>{state.month--;if(state.month<1){state.month=12;state.year--;}state.day=`${state.year}-${String(state.month).padStart(2,"0")}-01`;renderMonth();});
  $("nextMonth").addEventListener("click",()=>{state.month++;if(state.month>12){state.month=1;state.year++;}state.day=`${state.year}-${String(state.month).padStart(2,"0")}-01`;renderMonth();});
  $("monthGrid").addEventListener("click",(e)=>{const b=e.target.closest("[data-date]");if(b){state.day=b.dataset.date;renderMonth();}});
}
async function getJson(path){const r=await fetch(path,{cache:"no-cache"});if(!r.ok)throw new Error(path+": "+r.status);return r.json();}
async function init(){
  attach();renderMonth();
  try {
    const [seed,manifest,schedule]=await Promise.all([getJson("/data/seed.json"),getJson("/data/manifest.json"),getJson("/data/schedule.json")]);
    state.seed=seed;state.items=seed;state.manifest=manifest;state.events=Array.isArray(schedule.events)?schedule.events.filter(e=>/^\d{4}-\d{2}-\d{2}$/.test(String(e.date||""))):[];
    renderStats();renderResults();
    if(seed.length)await selectDetail(seed[0].id);
    if(manifest.fullCatalog){
      const catalog=await getJson("/data/index.json");
      if(!Array.isArray(catalog.records))throw new Error("Invalid qualification index");
      const national=seed.filter(x=>group(x)==="국가자격");
      state.items=[...national,...catalog.records];renderStats();renderResults(true);
    }
  }catch(error){
    console.error("EXAM_LOAD_FAILED",error);
    $("results").innerHTML='<div class="empty"><strong>정보를 불러오지 못했습니다.</strong>네트워크를 확인하고 새로고침하세요.</div>';
  }
}
init();
