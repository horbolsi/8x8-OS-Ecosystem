const ALLOW = new Set([
  'GET /api/health',
  'GET /api/v1/manifest',
  'POST /api/v1/auth/register',
  'POST /api/v1/auth/login',
  'POST /api/v1/auth/logout',
  'GET /api/v1/me',
  'GET /api/v1/runtime/vault-v32',
  'GET /api/v1/vault/template-v32',
  'POST /api/v1/vault/import-v32',
  'GET /api/v1/vault/status-v32',
  'POST /api/v1/vault/setup-plan-v32',
]);

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-8X8-Canonical-Root','fabric://8x8/core');
  res.setHeader('X-8X8-Proxy','V41-ALLOWLISTED-PROTECTED-API');

  const base=(process.env.EIGHTX8_PROTECTED_API_BASE||'').trim().replace(/\/+$/,'');
  const secret=(process.env.EIGHTX8_CARRIER_SHARED_SECRET||'').trim();
  if(!base || !secret){
    return res.status(503).json({state:'BLOCKED_V41_PROTECTED_BACKEND_NOT_CONFIGURED',canonical_root:'fabric://8x8/core'});
  }
  if(!/^https:\/\//i.test(base)){
    return res.status(503).json({state:'BLOCKED_V41_PROTECTED_BACKEND_MUST_BE_HTTPS'});
  }

  const path=String(req.query.path||'');
  const method=String(req.method||'GET').toUpperCase();
  if(!path.startsWith('/api/') || path.includes('..') || !ALLOW.has(`${method} ${path}`)){
    return res.status(403).json({state:'BLOCKED_V41_ROUTE_NOT_ALLOWLISTED'});
  }

  const headers={
    'Accept':'application/json',
    'X-8X8-Carrier-Key':secret,
    'X-8X8-Carrier':'VERCEL-V41'
  };
  if(req.headers.authorization) headers.Authorization=req.headers.authorization;
  if(req.headers['content-type']) headers['Content-Type']=req.headers['content-type'];

  let body;
  if(method!=='GET' && method!=='HEAD'){
    if(req.body == null) body=undefined;
    else if(typeof req.body==='string' || Buffer.isBuffer(req.body)) body=req.body;
    else { body=JSON.stringify(req.body); headers['Content-Type']='application/json'; }
    if(body && Buffer.byteLength(body)>1048576) return res.status(413).json({state:'BLOCKED_V41_REQUEST_TOO_LARGE'});
  }

  try{
    const upstream=await fetch(base+path,{method,headers,body,redirect:'manual',cache:'no-store'});
    const text=await upstream.text();
    const ctype=upstream.headers.get('content-type')||'application/json; charset=utf-8';
    res.setHeader('Content-Type',ctype);
    res.status(upstream.status).send(text);
  }catch(_e){
    res.status(502).json({state:'BLOCKED_V41_PROTECTED_UPSTREAM_UNREACHABLE',canonical_root:'fabric://8x8/core'});
  }
}
