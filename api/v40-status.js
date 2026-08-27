export default function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('X-8X8-Release-Identity','V40-AUTHENTIC-ONE-SURFACE-20260827');
  const baseConfigured=Boolean((process.env.EIGHTX8_PROTECTED_API_BASE||'').trim());
  const carrierSecretConfigured=Boolean((process.env.EIGHTX8_CARRIER_SHARED_SECRET||'').trim());
  const protectedBound=baseConfigured && carrierSecretConfigured;
  res.status(200).json({
    state: protectedBound?'PRESENT_PROVEN_V41_CARRIER_PROTECTED_BACKEND_CONFIGURED':'PRESENT_PROVEN_V41_CARRIER_BACKEND_BINDING_REQUIRED',
    canonical_root:'fabric://8x8/core',
    release_id:'V40-AUTHENTIC-ONE-SURFACE-20260827',
    source_head:'6210a35cdbdbc08b5f0b9511e08c3c465ae94314',
    carriers:['BROWSER','TELEGRAM','DISCORD','ANDROID','IOS'],
    one_visual_source:true,
    one_identity_contract:true,
    one_vault_contract:true,
    protected_backend_configured:protectedBound,
    protected_api_base_configured:baseConfigured,
    carrier_shared_secret_configured:carrierSecretConfigured,
    owner_private_core_projected:false,
    raw_secret_rendered:false,
    payment_effect:false,
    wallet_signing:false,
    mainnet:false,
    token_mint:false,
    live_trade:false,
    note:protectedBound?'V41 carrier has both protected API base and server-side carrier secret configured. Endpoint-level authentication still requires readback proof.':'Configure both EIGHTX8_PROTECTED_API_BASE and EIGHTX8_CARRIER_SHARED_SECRET before promotion.'
  });
}
