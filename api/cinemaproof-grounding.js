function parseMcp(text){
  const t=(text||"").trim();
  if(!t) return null;
  try{return JSON.parse(t)}catch{}
  const data=t.split(/\r?\n/).filter(l=>l.startsWith("data:")).map(l=>l.slice(5).trim()).filter(Boolean);
  for(let i=data.length-1;i>=0;i--){try{return JSON.parse(data[i])}catch{}}
  return {raw:t.slice(0,12000)};
}
async function postMcp(body,session){
  const headers={"content-type":"application/json","accept":"application/json, text/event-stream"};
  if(session) headers["mcp-session-id"]=session;
  const r=await fetch("https://search.parallel.ai/mcp",{method:"POST",headers,body:JSON.stringify(body)});
  const text=await r.text();
  return {ok:r.ok,status:r.status,session:r.headers.get("mcp-session-id")||session,json:parseMcp(text)};
}
function compact(result){
  const content=result?.result?.content||[];
  const texts=content.filter(x=>x?.type==="text").map(x=>x.text).join("\n");
  let parsed=null; try{parsed=JSON.parse(texts)}catch{}
  const source=(parsed?.results||parsed?.search?.results||[]).slice(0,8);
  return {
    sourceCount:source.length,
    sources:source.map(x=>({title:x.title||null,url:x.url||null,excerpts:(x.excerpts||[]).slice(0,3)})),
    rawText: parsed?null:texts.slice(0,16000)
  };
}
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method==="GET") return res.status(200).json({service:"cinemaproof-parallel",provider:"Parallel Search MCP",endpoint:"https://search.parallel.ai/mcp",auth:"anonymous-free-tier",status:"configured"});
  if(req.method!=="POST") return res.status(405).json({error:"method_not_allowed"});
  const brief=(req.body?.brief||"").toString().slice(0,6000);
  const objective=(req.body?.objective||`Ground a film-production decision with current, verifiable public sources. Identify location, weather, regulatory, technical, equipment, safety-context, or factual research that materially affects this production brief: ${brief}`).toString().slice(0,4000);
  const queries=Array.isArray(req.body?.search_queries)&&req.body.search_queries.length?req.body.search_queries.slice(0,3).map(x=>String(x).slice(0,120)):[
    "film production location requirements",
    "production safety technical guidance",
    "filmmaking equipment location constraints"
  ];
  try{
    const init=await postMcp({jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-03-26",capabilities:{},clientInfo:{name:"CinemaProof-Agent",version:"0.2.0"}}});
    if(!init.ok) return res.status(502).json({mode:"parallel-mcp-error",stage:"initialize",http:init.status});
    const session=init.session;
    await postMcp({jsonrpc:"2.0",method:"notifications/initialized",params:{}},session);
    const call=await postMcp({jsonrpc:"2.0",id:2,method:"tools/call",params:{name:"web_search",arguments:{objective,search_queries:queries,session_id:"cinemaproof-"+Date.now().toString(36),model_name:"gemini-2.5-flash"}}},session);
    if(!call.ok) return res.status(502).json({mode:"parallel-mcp-error",stage:"tool_call",http:call.status});
    const evidence=compact(call.json);
    return res.status(200).json({mode:"live-parallel-search-mcp",provider:"Parallel",tool:"web_search",objective,search_queries:queries,...evidence});
  }catch(e){
    return res.status(502).json({mode:"parallel-mcp-error",error:String(e?.message||e)});
  }
}