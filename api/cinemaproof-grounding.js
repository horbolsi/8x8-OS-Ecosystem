const MAX_AGE_SECONDS=3600;
const UPSTREAM_TIMEOUT_MS=12000;

function parseMcp(text){
  const t=(text||"").trim();
  if(!t) return null;
  try{return JSON.parse(t)}catch{}
  const data=t.split(/\r?\n/).filter(l=>l.startsWith("data:")).map(l=>l.slice(5).trim()).filter(Boolean);
  for(let i=data.length-1;i>=0;i--){try{return JSON.parse(data[i])}catch{}}
  return {raw:t.slice(0,12000)};
}

function stableId(prefix,value){
  let h=2166136261;
  for(const c of String(value||"")){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}
  return `${prefix}-${(h>>>0).toString(16).padStart(8,"0")}`;
}

function authority(url){
  let host="";
  try{host=new URL(url).hostname.toLowerCase()}catch{return {class:"UNKNOWN",rationale:"URL could not be parsed"}}
  if(host.endsWith(".gov")||host.endsWith(".gov.uk")||host.endsWith(".mil")) return {class:"GOVERNMENT",rationale:"Government-controlled domain"};
  if(host.endsWith(".edu")||host.endsWith(".ac.uk")) return {class:"ACADEMIC",rationale:"Accredited academic domain"};
  if(host==="bbc.com"||host.endsWith(".bbc.com")||host==="bbc.co.uk"||host.endsWith(".bbc.co.uk")) return {class:"ESTABLISHED_MEDIA",rationale:"Established editorial publisher"};
  return {class:"COMMERCIAL_OR_OTHER",rationale:"No institutional domain signal; manual review required"};
}

async function postMcp(body,session){
  const headers={"content-type":"application/json","accept":"application/json, text/event-stream"};
  if(session) headers["mcp-session-id"]=session;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),UPSTREAM_TIMEOUT_MS);
  try{
    const r=await fetch("https://search.parallel.ai/mcp",{method:"POST",headers,body:JSON.stringify(body),signal:controller.signal});
    const text=await r.text();
    return {ok:r.ok,status:r.status,session:r.headers.get("mcp-session-id")||session,json:parseMcp(text)};
  }finally{clearTimeout(timer)}
}

function compact(result,retrievedAt){
  const content=result?.result?.content||[];
  const texts=content.filter(x=>x?.type==="text").map(x=>x.text).join("\n");
  let parsed=null; try{parsed=JSON.parse(texts)}catch{}
  const rows=(parsed?.results||parsed?.search?.results||[]).slice(0,8);
  const sources=rows.map(x=>{
    const url=x.url||null;
    const rank=authority(url);
    return {sourceId:stableId("src",url||x.title),title:x.title||null,url,publicationDate:x.published_at||x.publication_date||null,authorityClass:rank.class,authorityRationale:rank.rationale,excerpts:(x.excerpts||[]).slice(0,3)};
  });
  const dated=sources.filter(x=>x.publicationDate).length;
  return {
    sourceCount:sources.length,
    retrievedAt,
    maxAgeSeconds:MAX_AGE_SECONDS,
    ageSeconds:0,
    freshnessState:sources.length?"FRESH_RETRIEVAL":"UNAVAILABLE",
    usabilityState:!sources.length?"NO_USABLE_EVIDENCE":dated===sources.length?"USABLE_DATED_EVIDENCE":"PARTIAL_UNDATED_EVIDENCE",
    authorityRanking:"GOVERNMENT_ACADEMIC_ESTABLISHED_MEDIA_THEN_OTHER",
    claimEdges:[],
    citationCoverage:0,
    contradictionState:"NOT_EVALUATED",
    sources,
    rawText:parsed?null:texts.slice(0,16000)
  };
}

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method==="GET" && req.query?.probe!=="1") return res.status(200).json({service:"cinemaproof-parallel",provider:"Parallel Search MCP",endpoint:"https://search.parallel.ai/mcp",auth:"anonymous-free-tier",status:"configured",evidenceContract:"8X8.EVIDENCE.RANKING.V1",maxAgeSeconds:MAX_AGE_SECONDS,upstreamTimeoutMs:UPSTREAM_TIMEOUT_MS});
  if(req.method==="GET" && req.query?.probe==="1"){
    req.body={objective:"Find current official filmmaking safety guidance relevant to a small production crew. Prefer authoritative sources.",search_queries:["film production safety guidance","filmmaking crew safety guidance"]};
    req.method="POST";
  }
  if(req.method!=="POST") return res.status(405).json({error:"method_not_allowed"});
  const brief=(req.body?.brief||"").toString().slice(0,6000);
  const objective=(req.body?.objective||`Ground a film-production decision with current, verifiable public sources. Identify location, weather, regulatory, technical, equipment, safety-context, or factual research that materially affects this production brief: ${brief}`).toString().slice(0,4000);
  const queries=Array.isArray(req.body?.search_queries)&&req.body.search_queries.length?req.body.search_queries.slice(0,3).map(x=>String(x).slice(0,120)):["film production location requirements","production safety technical guidance","filmmaking equipment location constraints"];
  try{
    const init=await postMcp({jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-03-26",capabilities:{},clientInfo:{name:"CinemaProof-Agent",version:"0.3.0"}}});
    if(!init.ok) return res.status(502).json({mode:"parallel-mcp-error",evidenceState:"UPSTREAM_ERROR",stage:"initialize",http:init.status});
    const session=init.session;
    await postMcp({jsonrpc:"2.0",method:"notifications/initialized",params:{}},session);
    const call=await postMcp({jsonrpc:"2.0",id:2,method:"tools/call",params:{name:"web_search",arguments:{objective,search_queries:queries,session_id:"cinemaproof-"+Date.now().toString(36),model_name:"gemini-2.5-flash"}}},session);
    if(!call.ok) return res.status(502).json({mode:"parallel-mcp-error",evidenceState:"UPSTREAM_ERROR",stage:"tool_call",http:call.status});
    const retrievedAt=new Date().toISOString();
    const evidence=compact(call.json,retrievedAt);
    return res.status(200).json({mode:"parallel-search-evidence",transportMode:"live-parallel-search-mcp",liveTransport:true,provider:"Parallel",tool:"web_search",evidenceContract:"8X8.EVIDENCE.RANKING.V1",objective,search_queries:queries,...evidence});
  }catch(e){
    const timeout=e?.name==="AbortError";
    return res.status(502).json({mode:"parallel-mcp-error",evidenceState:timeout?"UPSTREAM_TIMEOUT":"UPSTREAM_ERROR",error:timeout?"upstream_timeout":String(e?.message||e)});
  }
}
