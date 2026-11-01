"use strict";
// The home briefing reads the existing, verified schedule; it does not
// manufacture an exam day or confuse a multi-day national window with a seat date.
(() => {
  const qs = id => document.getElementById(id);
  const addDays = (iso, n) => {const d=new Date(iso+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
  const dateLabel = iso => Number(iso.slice(5,7))+"월 "+Number(iso.slice(8,10))+"일 "+dayLabel(iso)+"요일";
  const shortLabel = iso => Number(iso.slice(5,7))+"."+Number(iso.slice(8,10));
  const typeWord = e => ({exam:"시험", apply:"원서접수", announce:"합격 발표"})[e.type]||"일정";
  const milestoneWord = (e,when) => {
    const multi=eventEnd(e)!==e.date;
    if(!multi) return typeWord(e);
    if(when==="start")return e.type==="apply"?"접수 시작":e.type==="exam"?"시험기간 시작":"발표기간 시작";
    if(when==="end")return e.type==="apply"?"접수 마감":e.type==="exam"?"시험기간 종료":"발표기간 종료";
    return e.type==="apply"?"접수 진행 중":e.type==="exam"?"시험 시행기간 중":"발표기간 중";
  };
  let chosen = null;
  let ready = false;
  function openCalendar(yes=true,scroll=true){
    const content=qs("calendarContent"),toggle=qs("portalCalendarToggle");
    if(!content||!toggle)return;
    content.hidden=!yes;
    toggle.setAttribute("aria-expanded",String(yes));
    toggle.innerHTML=yes?'월간 캘린더 접기 <span aria-hidden="true">⌃</span>':'월간 캘린더 펼치기 <span aria-hidden="true">⌄</span>';
    if(yes&&scroll)qs("calendar").scrollIntoView({behavior:"smooth",block:"start"});
  }
  const dateEvents = iso => state.events.filter(e=>eventIsOn(e,iso));
  function showHomeDay(){
    const day=chosen||state.today;
    const events=dateEvents(day);
    const isToday=day===state.today;
    qs("portalDateText").textContent=(isToday?"오늘 · ":"")+dateLabel(day);
    qs("portalArtDay").textContent=day.slice(8);
    const name=qs("portalTodayHeading");
    const desc=qs("portalTodayDesc");
    const out=qs("portalTodayEvents");
    if(!ready){
      name.textContent="오늘의 시험 일정을 확인하세요";
      desc.textContent="공식 일정을 불러오고 있습니다.";
      out.innerHTML="";
      return;
    }
    if(!events.length){
      name.textContent=(isToday?"오늘":"선택한 날짜")+"은 공식 일정 미등록";
      desc.textContent="등록된 확인 일정이 없습니다. 실제 시험이 없다는 의미는 아닙니다.";
      out.innerHTML='<div class="portal-event-empty"><span class="portal-event-empty-icon" aria-hidden="true">✦</span> 오늘도 당신의 도전을 응원합니다.</div>';
      return;
    }
    const exact=events.filter(e=>e.date===eventEnd(e));
    const windows=events.filter(e=>e.date!==eventEnd(e));
    if(exact.length){
      name.textContent=(isToday?"오늘 확인할":"선택한 날짜의")+" 공식 일정 "+events.length+"건";
      desc.textContent="원서접수·시험·합격 발표의 공식 등록 날짜를 확인하세요.";
    }else{
      name.textContent="진행 중인 공식 시행기간 "+windows.length+"건";
      desc.textContent="시험 시행기간은 실제 개별 배정일과 다를 수 있습니다.";
    }
    out.innerHTML=events.slice(0,2).map(e=>{
      const what=e.date===day?"start":eventEnd(e)===day?"end":"ongoing";
      return '<a class="portal-today-event" href="'+escapeHtml(safeUrl(e.url))+'" target="_blank" rel="noopener noreferrer">'+
      '<span class="portal-today-event-mark">'+escapeHtml(milestoneWord(e,what))+'</span>'+
      '<span class="portal-today-event-name">'+escapeHtml(e.title)+'</span><span aria-hidden="true">↗</span></a>';
    }).join("")+(events.length>2?'<div class="portal-more-count">추가 '+(events.length-2)+'건은 월간 달력에서 확인할 수 있습니다.</div>':"");
  }
  function renderWeek(){
    const begin=state.today,end=addDays(begin,6);
    qs("portalWeekRange").textContent=shortLabel(begin)+" – "+shortLabel(end);
    if(!ready)return;
    const milestones=[];
    for(const e of state.events){
      for(const [date,when] of [[e.date,"start"],[eventEnd(e),"end"]]){
        if(date<begin||date>end)continue;
        if(when==="end"&&date===e.date)continue;
        milestones.push({date,when,e});
      }
    }
    milestones.sort((a,b)=>a.date.localeCompare(b.date)||a.e.id.localeCompare(b.e.id));
    const out=qs("portalWeekEvents");
    if(!milestones.length){
      const ongoing=state.events.filter(e=>e.date<=end&&eventEnd(e)>=begin);
      if(ongoing.length){
        out.innerHTML=ongoing.slice(0,3).map(e=>
          '<a class="portal-week-row" href="'+escapeHtml(safeUrl(e.url))+'" target="_blank" rel="noopener noreferrer">'+
          '<span class="portal-week-date-box"><strong>진행</strong><small>기간</small></span>'+
          '<span class="portal-week-copy"><span class="portal-week-type">'+escapeHtml(milestoneWord(e,"ongoing"))+'</span><strong>'+escapeHtml(e.title)+'</strong><small>'+escapeHtml(e.source)+' · '+shortLabel(e.date)+'~'+shortLabel(eventEnd(e))+'</small></span><span class="portal-week-arrow" aria-hidden="true">↗</span></a>'
        ).join("");
      }else{
        out.innerHTML='<div class="portal-week-empty"><strong>앞으로 7일간 등록된 주요 일정이 없습니다.</strong><p>자료 범위 밖의 시험은 공식 시행기관에서 확인해 주세요.</p></div>';
      }
    }else{
      out.innerHTML=milestones.slice(0,4).map(({date,when,e})=>
        '<a class="portal-week-row" href="'+escapeHtml(safeUrl(e.url))+'" target="_blank" rel="noopener noreferrer">'+
        '<span class="portal-week-date-box"><strong>'+date.slice(8)+'</strong><small>'+dayLabel(date)+'</small></span>'+
        '<span class="portal-week-copy"><span class="portal-week-type">'+escapeHtml(milestoneWord(e,when))+'</span><strong>'+escapeHtml(e.title)+'</strong><small>'+escapeHtml(e.source)+'</small></span><span class="portal-week-arrow" aria-hidden="true">↗</span></a>'
      ).join("");
    }
  }
  function renderRail(){
    const begin=state.today;
    qs("portalWeekDays").innerHTML=Array.from({length:7},(_,n)=>{
      const day=addDays(begin,n);
      const events=dateEvents(day);
      const starts=events.filter(e=>e.date===day).length;
      const ends=events.filter(e=>eventEnd(e)===day&&e.date!==day).length;
      const label=!ready?"확인 중":starts?"시작 "+starts+"건":ends?"마감 "+ends+"건":events.length?"진행 "+events.length+"건":"등록 없음";
      return '<button type="button" class="portal-day'+(day===(chosen||begin)?" selected":"")+'" data-portal-day="'+day+'" aria-pressed="'+String(day===(chosen||begin))+'" aria-label="'+escapeHtml(dateLabel(day)+" "+label)+'">'+
        '<span class="portal-day-week">'+(n===0?"오늘":dayLabel(day)+"요일")+'</span>'+
        '<strong>'+Number(day.slice(8,10))+'</strong>'+
        '<span class="portal-day-count'+(events.length?" is-event":"")+'">'+label+'</span></button>';
    }).join("");
  }
  function update(){
    if(!qs("portalTodayHeading"))return;
    ready=Boolean(state.manifest&&state.manifest.fullCatalog!==undefined);
    showHomeDay();renderWeek();renderRail();
  }
  function setup(){
    chosen=state.today;
    qs("portalCalendarToggle").addEventListener("click",()=>openCalendar(qs("calendarContent").hidden));
    qs("portalTodayFull").addEventListener("click",()=>openCalendar(true));
    document.querySelectorAll('a[href="#calendar"],[data-open-calendar]').forEach(a=>a.addEventListener("click",e=>{
      e.preventDefault();openCalendar(true);history.replaceState(null,"","#calendar");
    }));
    qs("portalWeekDays").addEventListener("click",e=>{
      const btn=e.target.closest("[data-portal-day]");if(!btn)return;
      chosen=btn.dataset.portalDay;
      state.selected=chosen;state.year=Number(chosen.slice(0,4));state.month=Number(chosen.slice(5,7));
      showCalendar();showHomeDay();renderRail();
    });
    document.querySelectorAll("[data-portal-filter]").forEach(btn=>btn.addEventListener("click",()=>{
      const type=btn.dataset.portalFilter;
      state.filter=type;
      document.querySelectorAll("[data-filter]").forEach(x=>{
        const yes=x.dataset.filter===type;
        x.classList.toggle("selected",yes);x.setAttribute("aria-pressed",String(yes));
      });
      applyQuery("");
      qs("directoryInput").focus({preventScroll:true});
    }));
    if(location.hash==="#calendar"||location.hash==="#calendarView")openCalendar(true,false);
    window.addEventListener("hashchange",()=>{if(location.hash==="#calendar"||location.hash==="#calendarView")openCalendar(true,false)});
    update();
  }
  window.updatePortalDashboard=update;
  setup();
})();