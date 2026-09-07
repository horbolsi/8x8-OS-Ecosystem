export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method==="GET") return res.status(200).json({service:"cinemaproof",status:"ok",geminiConfigured:!!process.env.GEMINI_API_KEY});
  if(req.method!=="POST") return res.status(405).json({error:"method_not_allowed"});
  const brief=(req.body?.brief||"").toString().slice(0,12000);
  const forceDemo=!!req.body?.forceDemo;
  const demo={mode:"demo",criticalRisks:4,confidence:"82%",output:
`DEMO MODE — no live Gemini claim

SCENE GRAPH
• S1 Wake-up / greenhouse pressure loss
• S2 Oxygen alarm escalates
• S3 Manual repair attempt
• S4 Final choice / extraction

CONTINUITY CONSTRAINTS
• Oxygen display must decrease monotonically scene-to-scene.
• Costume dirt, visor fog, plant damage and prop positions inherit from prior scene state.
• Establish one master continuity still after every major setup.

CRITICAL RISKS
1. Safety: no stunt coordinator → prohibit fall/stunt choreography; redesign tension with camera, blocking and sound.
2. Schedule: one shooting day → cluster by location and lighting state.
3. Budget: minimal VFX → prioritize practical display inserts, light cues and comp-ready locked plates.
4. Continuity: nonlinear shot order → use scene-state cards and visible oxygen-state IDs.

SHOT STRATEGY
• Wide geography master for each location.
• 35mm-equivalent medium coverage for performance.
• Controlled macro inserts for oxygen meter, damaged seals and plant distress.
• Locked VFX plate only where narrative payoff justifies it.

SCHEDULE
AM: greenhouse masters + clean continuity.
MIDDAY: inserts + progressive distress states.
PM: damaged-state coverage + final scene.
Keep 20-minute continuity checkpoints between state changes.

PROOF PACKET
Every recommendation is linked to a constraint: safety, continuity, budget or schedule. Director overrides should record what constraint changed and what downstream shots become invalid.`};
  if(forceDemo||!process.env.GEMINI_API_KEY) return res.status(200).json(demo);
  try{
    const prompt=`You are CinemaProof Agent for professional film pre-production. Convert the following production brief into a concise proof-backed production packet with sections: scene graph, continuity constraints, critical risks, shot strategy, schedule/resource plan, and override consequences. Every recommendation must state the constraint that caused it. Do not invent legal/safety certifications. Brief:\n\n${brief}`;
    const url="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="+encodeURIComponent(process.env.GEMINI_API_KEY);
    const g=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.25,maxOutputTokens:2200}})});
    if(!g.ok) throw new Error("gemini_http_"+g.status);
    const data=await g.json();
    const text=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
    return res.status(200).json({mode:"live-gemini",criticalRisks:"AI",confidence:"LIVE",output:text||"Gemini returned no text."});
  }catch(e){
    return res.status(200).json({...demo,mode:"demo",runtimeError:String(e?.message||e)});
  }
}