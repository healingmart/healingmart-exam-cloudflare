// Static assets are served by Cloudflare without invoking this Worker.
// Only explicit /api/* requests call this Worker. No credentials in the browser.
import {findOfficialItems, findOfficialSchedule, qnetCredentialPresent} from "./providers/qnet.js";
const json=(data,status=200,cache=0)=>new Response(JSON.stringify(data),{
  status,
  headers:{
    "content-type":"application/json; charset=utf-8",
    "cache-control":cache?"public, max-age="+cache+", stale-while-revalidate=600":"no-store",
    "x-content-type-options":"nosniff",
    "access-control-allow-origin":"*"
  }
});
function fail(err){
  const code=String(err?.code||"UPSTREAM_UNAVAILABLE");
  const invalid=code==="INVALID_QUERY"||code==="INVALID_SCHEDULE_REQUEST";
  const missing=code==="MISSING_CREDENTIAL";
  const timeout=code==="UPSTREAM_TIMEOUT";
  return json({status:"unavailable",code,message:invalid?"요청 조건을 확인하세요.":missing?"인증키가 연결되지 않았습니다.":"현재 Q-Net 공식 데이터를 확인할 수 없습니다. 잠시 후 다시 시도하세요."},invalid?400:missing?503:timeout?504:502);
}
export default {
  async fetch(request,env){
    if(request.method!=="GET")return json({error:"METHOD_NOT_ALLOWED"},405);
    const u=new URL(request.url),pathname=u.pathname;
    if(pathname==="/api/qnet/items"){
      try{
        const result=await findOfficialItems(env,u.searchParams.get("q"),Number(u.searchParams.get("limit")||20));
        return json({status:"ok",...result},200,1800);
      }catch(err){return fail(err)}
    }
    if(pathname==="/api/qnet/schedule"){
      try{
        const year=Number(u.searchParams.get("year")||new Date().getUTCFullYear());
        const result=await findOfficialSchedule(u.searchParams.get("jmCd"),year);
        return json({status:"ok",...result},200,3600);
      }catch(err){return fail(err)}
    }
    if(pathname==="/api/integrations"){
      return json({status:"ok",qnetConfigured:qnetCredentialPresent(env),nationalScheduleConfigured:Boolean(env.HRDK_SCHEDULE_SERVICE_API_KEY),ncsConfigured:Boolean(env.NCS_STANDARD_API_KEY),statisticsConfigured:Boolean(env.HRDK_EXAM_STATS_API_KEY),neisConfigured:Boolean(env.NEIS_API_KEY)});
    }
    if(pathname!=="/api/health")return json({error:"NOT_FOUND"},404);
    try{
      const response=await env.ASSETS.fetch(new URL("/data/manifest.json",request.url));
      if(!response.ok)throw Error("MANIFEST_MISSING");
      const data=await response.json();
      return json({
        status:"healthy",
        service:"healingmart-exam-cloudflare",
        dataMode:data.mode,
        recordCount:data.total,
        fullCatalog:data.fullCatalog,
        updatedAt:data.lastSync,
        storage:"static-assets",
        d1:false,kv:false,cron:false
      });
    }catch{return json({status:"error",reason:"DATA_UNAVAILABLE"},503)}
  }
};
