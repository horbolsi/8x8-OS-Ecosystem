import { Request, Response } from 'express';

const SYSTEM_PROMPT = `You are Pioneer AI, the intelligent guardian of the 8×8 Ecosystem — a cyberpunk blockchain hub. You are powered by TinyLlama and help users with:
- 8×8 Hub features (NFT vaults, staking, trading, governance, referrals, store)
- Token info: 8x8 (Pi Network), TM8 (AI token), 0x8 (governance token)
- DeFi concepts, crypto trading strategies
- Technical analysis (RSI, MACD, SMA, EMA, VWAP)
- Pi Network ecosystem
- Seraphim Guardian security features
Be concise, helpful, and use cyberpunk terminology. Always reference 8×8 Ecosystem specifics when relevant.`;

const KNOWLEDGE_BASE: Record<string, string> = {
  nft: "8×8 NFT Vaults support up to 8,888,888 NFTs. Each vault permanently locks 0.001 π. You can mint, burn (earn 8x8 tokens), and stake NFTs. Burn mechanics reduce supply and reward holders.",
  staking: "The 8×8 staking system supports PoW (Proof of Work), PoS (Proof of Stake), and PoSt (Proof of Storage). Allocation sliders must total 100%. Storage packages: 8GB, 88GB, 888GB. Current APY ~8-18% depending on pool.",
  trade: "The 8×8 Trade Engine offers: Swap (4.88% fee, 1% with 8Pass), 3-Min Dash (leveraged 3x/5x/8x/16x positions closing in 3 minutes), Order Book, and Perpetual Positions. Fee breakdown: Liquidity 1%, Staking 0.6%, Mining 0.6%, Rewards 1%, Dev 0.8%, LSMR 0.8%, Burn 0.08%.",
  wallet: "The 8×8 Wallet supports MetaMask, OKX Wallet, and Pi Wallet. Manage 8x8, TM8, 0x8, and π tokens. Send/receive with QR codes, view transaction history, and connect multiple chains.",
  governance: "0x8 token holders vote on ecosystem parameters: burn rate, supply limits, LSMR allocation, fee structure. Proposals use quadratic voting weighted by 0x8 holdings.",
  referral: "3-tier referral system: Tier 1 (direct) = full reward, Tier 2 = 0.8× reward, Tier 3 = 0.6× reward. Track your network in the referral tree visualization.",
  store: "8×8 Global Store has 88 locations across 14 countries, 8 categories: NFTs, Passes, Access, Tokens, Food, Travel, Digital. 8Pass holders get priority access and 1% trading fee.",
  radio: "5 radio stations: 8×8 Radio Alpha (ecosystem news), Pioneer FM (AI-curated music), Crypto Waves (market analysis), Pi Community (Pi Network), DeFi Beats (electronic). Background playback across all pages.",
  "8pass": "8Pass is the VIP membership. Benefits: 1% trading fee (vs 4.88% standard), priority store access, exclusive NFT drops, governance voting multiplier.",
  pi: "Pi Network is the foundational blockchain. 8x8 tokens are built on Pi. 1 π ≈ $1.14 USD. Pi wallet connects directly in the 8×8 Hub.",
  rsi: "RSI (Relative Strength Index) is a momentum oscillator. RSI < 30 = oversold (potential buy signal). RSI > 70 = overbought (potential sell signal). RSI 50 = neutral momentum.",
  macd: "MACD (Moving Average Convergence Divergence) = EMA(12) - EMA(26). Positive MACD = bullish. Negative MACD = bearish. Signal line crossovers indicate entry/exit points.",
  vwap: "VWAP (Volume Weighted Average Price) = Σ(Price×Volume) / Σ(Volume). Price above VWAP = bullish. Price below VWAP = bearish. Used by institutions as a benchmark.",
  default: "I'm Pioneer AI, guardian of the 8×8 Ecosystem. I can help you with NFT vaults, staking, trading, governance, referrals, the store, Pi Network, crypto analysis, and all hub features. What would you like to know?",
};

function smartFallback(prompt: string): string {
  const lower = prompt.toLowerCase();
  for (const [key, answer] of Object.entries(KNOWLEDGE_BASE)) {
    if (key !== 'default' && lower.includes(key)) return answer;
  }
  if (lower.includes('fee') || lower.includes('commission')) return KNOWLEDGE_BASE.trade;
  if (lower.includes('token') || lower.includes('8x8') || lower.includes('tm8') || lower.includes('0x8')) return "Token info — 8x8: Pi Network ecosystem token. TM8: AI utility token (used for AI features, staking rewards). 0x8: Governance token (vote on ecosystem parameters). All three can be staked, traded, and used in the 8×8 Hub.";
  if (lower.includes('buy') || lower.includes('sell') || lower.includes('price') || lower.includes('market')) return "For live trading: Use the Trade page for Swap, 3-Min Dash, or Perpetuals. For BTC real-time analysis with multi-exchange WebSocket data, technical indicators (RSI, MACD, VWAP), and BUY/SELL signals, visit the BTC Realtime page.";
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) return "Greetings, Pioneer! I am Pioneer AI. Ask me anything about the 8×8 Ecosystem: NFTs, staking, trading, governance, or crypto analysis. I'm powered by TinyLlama and trained on 8×8 knowledge.";
  if (lower.includes('help') || lower.includes('what can')) return "I can help you with: NFT Vaults (mint/burn/stake up to 8,888,888 NFTs), Staking (PoW/PoS/PoSt pools), Trading (Swap, 3-Min Dash, Order Book), Governance (0x8 voting), Referrals (3-tier rewards), Store (88 global locations), and Technical Analysis (RSI, MACD, VWAP). What do you need?";
  if (lower.includes('seraphim') || lower.includes('guardian')) return "Seraphim is the Guardian AI of the 8×8 Ecosystem. She monitors security, verifies identities, seals NFT vaults, and works alongside Pioneer AI to protect Pioneer assets.";
  return KNOWLEDGE_BASE.default;
}

async function attemptOllama(messages: any[], model?: string, ollamaUrl?: string) {
  const url = ollamaUrl || process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
  const response = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model === 'ollama' ? 'tinyllama' : model || 'tinyllama',
      messages,
      stream: false,
      options: { temperature: 0.7, num_predict: 300, num_ctx: 2048 },
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Ollama error ${response.status}`);
  const data = await response.json();
  return data.message?.content || data.response || '';
}

async function attemptFlashStudio(messages: any[], model?: string) {
  const url = process.env.FLASHTM8_URL || 'http://127.0.0.1:5000/api/generate';
  const apiKey = process.env.FLASHTM8_API_KEY;
  const prompt = messages.map((m: any) => `${m.role}: ${m.content}`).join('\n');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ prompt, model: model || 'llama3.2' }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`FlashTM8 error ${response.status}`);
  const data = await response.json();
  return data.text || data.response || '';
}

async function attemptOpenAI(messages: any[], model?: string) {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey || apiKey === 'placeholder') throw new Error('OpenAI key missing');
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || 'https://api.openai.com';
  const response = await fetch(`${baseURL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages,
      max_tokens: 512,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`OpenAI error ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function attemptClaude(messages: any[], model?: string) {
  const apiKey = process.env.AI_INTEGRATIONS_CLAUDE_API_KEY;
  if (!apiKey) throw new Error('Claude key missing');
  const baseURL = process.env.AI_INTEGRATIONS_CLAUDE_URL || 'https://api.anthropic.com/v1/messages';
  const response = await fetch(baseURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-3.5-sonnet',
      messages,
      max_tokens: 1200,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Claude error ${response.status}`);
  const data = await response.json();
  return data.content?.[0]?.text || data.reply || data.message?.content || '';
}

async function attemptOpenJarvis(messages: any[], model?: string) {
  const apiKey = process.env.AI_INTEGRATIONS_OPENJARVIS_API_KEY;
  if (!apiKey) throw new Error('OpenJarvis key missing');
  const baseURL = process.env.OPENJARVIS_URL || 'https://api.openjarvis.ai/v1/chat/completions';
  const response = await fetch(baseURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'openjarvis-chat',
      messages,
      max_tokens: 1200,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`OpenJarvis error ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || data.response || data.text || '';
}

async function attemptJarvis(messages: any[], model?: string) {
  const apiKey = process.env.AI_INTEGRATIONS_JARVIS_API_KEY;
  if (!apiKey) throw new Error('Jarvis key missing');
  const baseURL = process.env.AI_INTEGRATIONS_JARVIS_URL || 'https://api.jarvis.ai/v1/chat/completions';
  const response = await fetch(baseURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'jarvis-chat',
      messages,
      max_tokens: 1200,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Jarvis error ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || data.response || data.text || '';
}

async function attemptOpenClaw(messages: any[], model?: string) {
  const apiKey = process.env.AI_INTEGRATIONS_OPENCLAW_API_KEY;
  if (!apiKey) throw new Error('OpenClaw key missing');
  const baseURL = process.env.OPENCLAW_URL || 'https://api.openclaw.ai/v1/chat/completions';
  const response = await fetch(baseURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'openclaw-chat',
      messages,
      temperature: 0.7,
      max_tokens: 1200,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`OpenClaw error ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || data.response || data.text || '';
}

async function attemptClaw(messages: any[], model?: string) {
  const apiKey = process.env.AI_INTEGRATIONS_CLAW_API_KEY;
  if (!apiKey) throw new Error('Claw key missing');
  const baseURL = process.env.AI_INTEGRATIONS_CLAW_URL || 'https://api.claw.ai/v1/chat/completions';
  const response = await fetch(baseURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'claw-1',
      messages,
      temperature: 0.7,
      max_tokens: 1200,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Claw error ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || data.output?.[0]?.content?.text || data.response || '';
}

async function attemptYoubits(messages: any[], model?: string) {
  const apiKey = process.env.AI_INTEGRATIONS_YOUBITS_API_KEY;
  if (!apiKey) throw new Error('YouBits key missing');
  const baseURL = process.env.AI_INTEGRATIONS_YOUBITS_URL || 'https://api.youbits.ai/v1/chat/completions';
  const response = await fetch(baseURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'youbits-chat',
      messages,
      temperature: 0.7,
      max_tokens: 1200,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`YouBits error ${response.status}`);
  const data = response.json();
  return data.choices?.[0]?.message?.content || data.response || data.output?.[0]?.content || '';
}

// ==========================================
// INFERENCE.SH - Best Free Unlimited Model
// ==========================================
// inference.sh provides FREE access to Qwen3-32B and other top models
// Sign up at: https://inference.sh
// Docs: https://docs.inference.sh

async function attemptInferenceSH(messages: any[], model?: string) {
  const apiKey = process.env.INFERENCE_SH_API_KEY;
  if (!apiKey) {
    // Try using inference.sh CLI if available
    const { execSync } = await import('child_process');
    try {
      const prompt = messages.map((m: any) => `${m.role}: ${m.content}`).join('\n');
      const result = execSync(`infsh app run openrouter/qwen3-32b --input '{"prompt":"${prompt.replace(/"/g, '\\"')}"}'`, {
        timeout: 30000,
        encoding: 'utf-8',
      });
      const parsed = JSON.parse(result);
      return parsed.text || parsed.response || parsed.choices?.[0]?.message?.content || '';
    } catch (e) {
      throw new Error('InferenceSH CLI not available');
    }
  }
  
  const baseURL = process.env.INFERENCE_SH_URL || 'https://api.inference.sh/v1/chat/completions';
  const response = await fetch(baseURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'qwen3-32b',
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`InferenceSH error ${response.status}`);
  const data = response.json();
  return data.choices?.[0]?.message?.content || data.response || data.text || '';
}

// OpenRouter integration (uses inference.sh under the hood)
async function attemptOpenRouter(messages: any[], model?: string) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.INFERENCE_SH_API_KEY;
  if (!apiKey) throw new Error('OpenRouter key missing');
  const baseURL = 'https://openrouter.ai/api/v1/chat/completions';
  const response = await fetch(baseURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.HUB_MINI_APP_URL || 'https://8x8-hub.local',
      'X-Title': '8x8 Hub',
    },
    body: JSON.stringify({
      model: model || 'qwen/qwen3-32b',
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`OpenRouter error ${response.status}`);
  const data = response.json();
  return data.choices?.[0]?.message?.content || data.response || '';
}

async function tryProviders(order: string[], messages: any[], model?: string, ollamaUrl?: string) {
  for (const provider of order) {
    try {
      if (provider === 'flashstudio') {
        const reply = await attemptFlashStudio(messages, model);
        if (reply) return { reply, source: 'flashstudio' };
      }
      if (provider === 'ollama') {
        const reply = await attemptOllama(messages, model, ollamaUrl);
        if (reply) return { reply, source: 'ollama' };
      }
      if (provider === 'claude') {
        const reply = await attemptClaude(messages, model);
        if (reply) return { reply, source: 'claude' };
      }
      if (provider === 'openjarvis') {
        const reply = await attemptOpenJarvis(messages, model);
        if (reply) return { reply, source: 'openjarvis' };
      }
      if (provider === 'jarvis') {
        const reply = await attemptJarvis(messages, model);
        if (reply) return { reply, source: 'jarvis' };
      }
      if (provider === 'openclaw') {
        const reply = await attemptOpenClaw(messages, model);
        if (reply) return { reply, source: 'openclaw' };
      }
      if (provider === 'claw') {
        const reply = await attemptClaw(messages, model);
        if (reply) return { reply, source: 'claw' };
      }
      if (provider === 'youbits') {
        const reply = await attemptYoubits(messages, model);
        if (reply) return { reply, source: 'youbits' };
      }
      if (provider === 'openai') {
        const reply = await attemptOpenAI(messages, model);
        if (reply) return { reply, source: 'openai' };
      }
      // === BEST FREE UNLIMITED MODELS ===
      if (provider === 'inferencesh') {
        const reply = await attemptInferenceSH(messages, model);
        if (reply) return { reply, source: 'inferencesh-qwen3-32b' };
      }
      if (provider === 'openrouter') {
        const reply = await attemptOpenRouter(messages, model);
        if (reply) return { reply, source: 'openrouter-qwen3-32b' };
      }
    } catch (error) {
      console.log(`[AI] ${provider} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return null;
}

export async function aiHandler(req: Request, res: Response) {
  const { messages, model, provider, ollamaUrl } = req.body;
  const lastMsg = messages?.[messages.length - 1]?.content || '';
  const normalizedMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...((messages || []).map((m: any) => ({ role: m.role, content: m.content }))),
  ];

  const requestedProvider = typeof provider === 'string' ? provider : undefined;
  // Priority: Local > Free Unlimited > Paid
  const order = [
    ...(requestedProvider ? [requestedProvider] : []),
    // === FREE UNLIMITED (Best Quality) ===
    'inferencesh',    // Qwen3-32B - BEST FREE MODEL
    'openrouter',     // Qwen3-32B via OpenRouter
    // === LOCAL MODELS ===
    'flashstudio',
    'ollama',
    // === PAID MODELS ===
    'claude',
    'openai',
    'openjarvis',
    'jarvis',
    'openclaw',
    'claw',
    'youbits',
  ].filter((value, index, self) => self.indexOf(value) === index);

  const providerResult = await tryProviders(order, normalizedMessages, model, ollamaUrl);
  if (providerResult) {
    return res.json({ reply: providerResult.reply, source: providerResult.source });
  }

  const fallbackReply = smartFallback(lastMsg);
  res.json({ reply: fallbackReply, model: 'knowledge-base', source: 'fallback' });
}
