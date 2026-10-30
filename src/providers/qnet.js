// Official Q-Net endpoints. Credentials remain server-side in Cloudflare Secrets.
const CATALOG_URL = "http://openapi.q-net.or.kr/api/service/rest/InquiryListNationalQualifcationSVC/getList";
const ITEM_PAGE = "https://www.q-net.or.kr/crf005.do";
const CACHE_MS = 6 * 60 * 60 * 1000;
let catalogCache = { records: null, until: 0 };

const text = value => String(value ?? "").trim();
const cleanCode = value => text(value).toUpperCase();
const decodeEntities = value => text(value)
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, m => ({
    "&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&apos;":"'","&nbsp;":" "
  }[m.toLowerCase()] || m));
const stripHtml = html => decodeEntities(text(html).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const xmlField = (block, name) => {
  const r = new RegExp("<(?:\\w+:)?"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?"+name+">","i").exec(block);
  return r ? decodeEntities(r[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1")) : "";
};
const validIso = iso => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y,m,d]=iso.split("-").map(Number);
  return new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)===iso;
};
const compactDate = raw => {
  const s=text(raw).replace(/[^\d]/g,"");
  if(!/^(?:20)\d{6}$/.test(s)) return "";
  const iso=s.slice(0,4)+"-"+s.slice(4,6)+"-"+s.slice(6,8);
  return validIso(iso)?iso:"";
};
const qualifiedKey = (env, names) => {
  for (const n of names) {
    const value=text(env[n]);
    if(value){
      // Some public-data keys arrive already percent-encoded.
      try { return /%[0-9a-f]{2}/i.test(value) ? decodeURIComponent(value) : value; }
      catch { return value; }
    }
  }
  return null;
};
async function getUpstream(url, accept) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try {
    const response=await fetch(url, {headers:{"accept":accept,"accept-language":"ko-KR,ko;q=0.9","user-agent":"HealingMart-EXAM/1.0 (official public data)"},signal:controller.signal,redirect:"follow"});
    if (!response.ok) throw Object.assign(new Error("UPSTREAM_HTTP"),{code:"UPSTREAM_HTTP",httpStatus:response.status});
    const body=await response.text();
    if(body.length>7_000_000)throw Object.assign(new Error("UPSTREAM_TOO_LARGE"),{code:"UPSTREAM_TOO_LARGE"});
    return body;
  }catch(error){
    if(error.name==="AbortError")throw Object.assign(new Error("UPSTREAM_TIMEOUT"),{code:"UPSTREAM_TIMEOUT"});
    throw error;
  }finally{clearTimeout(timer)}
}
function checkOfficialResponse(body) {
  const code=xmlField(body,"resultCode");
  if (code && !["00","0","NORMAL_SERVICE"].includes(code)) {
    throw Object.assign(new Error("QNET_RESPONSE_ERROR"),{code:"QNET_RESPONSE_ERROR",resultCode:code});
  }
  if(!/<(?:\w+:)?(?:response|items|item)\b/i.test(body)) {
    throw Object.assign(new Error("QNET_RESPONSE_FORMAT"),{code:"QNET_RESPONSE_FORMAT"});
  }
}
export function parseCatalog(xml) {
  checkOfficialResponse(xml);
  const blocks=[...xml.matchAll(/<(?:\w+:)?item(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?item>/gi)];
  const seen=new Set();const rows=[];
  for(const [,raw] of blocks){
    const code=cleanCode(xmlField(raw,"jmcd")||xmlField(raw,"jmCd"));
    const name=xmlField(raw,"jmfldnm")||xmlField(raw,"jmNm");
    if (!/^[A-Z0-9]{4}$/.test(code)||!name||seen.has(code)) continue;
    seen.add(code);
    rows.push({
      itemCode:code,
      name,
      series:xmlField(raw,"seriesnm")||xmlField(raw,"seriesNm"),
      type:xmlField(raw,"qualgbnm")||xmlField(raw,"qualgbNm")||"국가자격",
      officialUrl:officialItemUrl(code)
    });
  }
  return rows;
}
export const officialItemUrl = itemCode => {
  const u=new URL(ITEM_PAGE);
  u.searchParams.set("gId","");
  u.searchParams.set("gSite","Q");
  u.searchParams.set("id","crf00503s02");
  u.searchParams.set("jmCd",itemCode);
  u.searchParams.set("jmInfoDivCcd","B0");
  return u.toString();
};
export async function officialCatalog(env){
  if(Array.isArray(catalogCache.records)&&Date.now()<catalogCache.until)return catalogCache.records;
  const key=qualifiedKey(env,["HRDK_SCHEDULE_SERVICE_API_KEY","HRDK_SUBJECT_EXAM_API_KEY","DATA_GO_KR_API_KEY"]);
  if(!key)throw Object.assign(new Error("MISSING_CREDENTIAL"),{code:"MISSING_CREDENTIAL"});
  const u=new URL(CATALOG_URL);
  u.searchParams.set("serviceKey",key);u.searchParams.set("numOfRows","2000");u.searchParams.set("pageNo","1");
  const raw=await getUpstream(u.toString(),"application/xml,text/xml,*/*");
  const records=parseCatalog(raw);
  if(!records.length)throw Object.assign(new Error("QNET_CATALOG_EMPTY"),{code:"QNET_CATALOG_EMPTY"});
  catalogCache={records,until:Date.now()+CACHE_MS};
  return records;
}
export async function findOfficialItems(env,query,limit=20){
  const normalized=text(query).toLocaleLowerCase("ko-KR");
  if(normalized.length<2||normalized.length>60)throw Object.assign(new Error("INVALID_QUERY"),{code:"INVALID_QUERY"});
  const records=await officialCatalog(env);
  const matched=records.filter(r=>[r.name,r.series,r.type,r.itemCode].some(v=>text(v).toLocaleLowerCase("ko-KR").includes(normalized)));
  matched.sort((a,b)=>(a.name===query?0:a.name.startsWith(query)?1:2)-(b.name===query?0:b.name.startsWith(query)?1:2)||a.name.localeCompare(b.name,"ko"));
  return {source:"한국산업인력공단 Q-Net",sourceUrl:"https://www.q-net.or.kr/",query,count:matched.length,items:matched.slice(0,Math.max(1,Math.min(limit,30))),isOfficial:true};
}
const dateText = html => [...stripHtml(html).matchAll(/(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})/g)]
  .map(m=>compactDate(m[1]+String(m[2]).padStart(2,"0")+String(m[3]).padStart(2,"0")))
  .filter(Boolean);
export function parseOfficialSchedule(html,itemCode,year){
  const rows=[];
  const columns=[
    ["apply","필기 원서접수",1],
    ["exam","필기시험",2],
    ["announce","필기 합격자 발표",3],
    ["apply","실기·면접 원서접수",4],
    ["exam","실기·면접 시험",5],
    ["announce","실기·면접 합격자 발표",6]
  ];
  for(const [rowNumber,match] of [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].entries()){
    const cells=[...match[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map(m=>m[1]);
    if(cells.length<7||!stripHtml(cells[0]).includes(String(year)))continue;
    const round=stripHtml(cells[0]).slice(0,120);
    for(const [type,label,index] of columns){
      const dates=dateText(cells[index]);
      if(!dates.length)continue;
      if(dates[0].slice(0,4)!==String(year))continue;
      rows.push({
        id:"qnet-"+itemCode+"-"+rowNumber+"-"+index+"-"+dates[0],
        date:dates[0],
        endDate:dates[1]&&dates[1]>=dates[0]?dates[1]:null,
        type,
        title:label,
        round,
        source:"한국산업인력공단 Q-Net",
        url:officialItemUrl(itemCode),
        status:"verified",
        verifiedAt:new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Seoul"})
      });
    }
  }
  return [...new Map(rows.map(x=>[x.id,x])).values()];
}
export async function findOfficialSchedule(itemCode,year){
  if(!/^[A-Z0-9]{4}$/.test(cleanCode(itemCode))||!Number.isInteger(year)||year<2020||year>2100){
    throw Object.assign(new Error("INVALID_SCHEDULE_REQUEST"),{code:"INVALID_SCHEDULE_REQUEST"});
  }
  const code=cleanCode(itemCode),url=officialItemUrl(code);
  const html=await getUpstream(url,"text/html,application/xhtml+xml");
  const events=parseOfficialSchedule(html,code,year);
  return {source:"한국산업인력공단 Q-Net",sourceUrl:url,itemCode:code,year,events,verified:events.length>0,notice:events.length?"공식 종목 상세페이지에서 확인한 일정":"공식 종목 페이지에서 확인 가능한 해당 연도 일정이 없습니다. 시험 미시행을 의미하지 않습니다."};
}
export const qnetCredentialPresent=env=>Boolean(qualifiedKey(env,["HRDK_SCHEDULE_SERVICE_API_KEY","HRDK_SUBJECT_EXAM_API_KEY","DATA_GO_KR_API_KEY"]));
