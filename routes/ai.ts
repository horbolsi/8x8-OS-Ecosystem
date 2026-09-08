import { Request, Response } from 'express';

const SYSTEM_PROMPT = `You are Pioneer AI, a policy-aware, read-only guide to the 8×8 Ecosystem.
Truth boundaries:
- SOURCE_PRESENT is not RUNTIME_ACTIVE, PRODUCTIVE, AUDITED, DEPLOYED, or VERIFIED.
- MARKET_DATA is not STRATEGY_SIGNAL, PAPER_POSITION, LIVE_ORDER, or VERIFIED_EXECUTION.
- LIVE_TRADE=false, PAYMENT_EFFECT=false, WALLET_SIGNING=false, MAINNET=false.
Current canonical source policy: maximum supply 8,888,888; 4.44% applies only where an explicitly defined economic event says so; ordinary non-sale/P2P companion-token transfers are 0%. The former 4.88% policy and legacy Pi semantics are PAST_PRESERVED, not current.
Never claim live minting, burning, staking, trading, wallet transfer, mainnet execution, yield, price, balances, or confirmation without a fresh runtime receipt. Keep answers concise and label unknown or future-gated capabilities explicitly.`;

const KNOWLEDGE_BASE: Record<string, string> = {
  nft: "NFT Vault reference designs are SOURCE_ONLY / NOT_AUDITED / NOT_DEPLOYED / FUTURE_GATED unless a fresh receipt proves otherwise. Source presence is not minting, burning, staking, ownership, or chain provenance.",
  staking: "Staking and mining are FUTURE_GATED. No APY, reward, PoW, PoS, PoSt, or productive staking runtime is verified here.",
  trade: "Trading is disabled: LIVE_TRADE=false. Market data is not a strategy signal; a signal is not a paper position; a paper position is not a live order or verified execution. No leverage, perpetual, swap, order, or withdrawal authority is granted.",
  wallet: "Wallet surfaces are watch-only or source-only unless separately verified. WALLET_SIGNING=false and no send, receive, seed, private-key, balance, or chain authority is implied.",
  governance: "Governance is a source-policy concept. No live vote, treasury action, or token-weighted authority is established by this interface.",
  referral: "Referral and reward claims require an explicit entitlement ledger and durable receipt. None is proven by this knowledge base.",
  store: "Store, subscription, and payment capabilities are FUTURE_GATED until destination provenance, amount, fee disclosure, replay/idempotency, confirmation/finality, durable entitlement, failure recovery, refund/cancellation, security review, and rollback receipts are present.",
  radio: "Radio and media surfaces are independent of economic or blockchain execution.",
  "8pass": "8Pass is a source-level membership concept. It does not prove a paid subscription, trading-fee discount, token entitlement, or payment completion.",
  pi: "Legacy Pi-chain and Pi-price semantics are PAST_PRESERVED donors, not current policy or deployed-chain proof.",
  policy: "Current source policy: maximum supply 8,888,888; 4.44% only for explicitly defined events; ordinary non-sale/P2P companion-token transfers 0%. The former 4.88% reference is superseded.",
  default: "I can explain the 8×8 source policy and clearly separate source, simulation, runtime, and verified execution. Economic and blockchain effects remain disabled unless a fresh scoped receipt proves otherwise.",
};

function hasToken(text: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\function smartFallback(prompt: string): string {');
  return new RegExp('(^|[^a-z0-9])' + escaped + '([^a-z0-9]|$)', 'i').test(text);
}

function normalizeUserMessages(value: unknown): Array<{ role: 'user' | 'assistant'; content: string }> | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 32) return null;
  const out: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const item of value) {
    if (!item || (item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string') return null;
    const content = item.content.trim();
    if (!content || content.length > 6000) return null;
    out.push({ role: item.role, content });
  }
  return out.some(item => item.role === 'user') ? out : null;
}

function safeProviderReply(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const reply = value.trim().slice(0, 8000);
  const sensitive = /\b(trade|trading|payment|wallet|sign|signed|signing|mainnet|mint|minted|minting|stake|staking|yield|apy|balance|transaction|confirmed|price|fee|tax|token|nft)\b/i;
  return sensitive.test(reply) ? null : reply;
}
function smartFallback(prompt: string): string {
  const lower = prompt.toLowerCase();
  for (const [key, answer] of Object.entries(KNOWLEDGE_BASE)) {
    if (key !== 'default' && hasToken(lower, key)) return answer;
  }
  if (lower.includes('fee') || lower.includes('tax') || lower.includes('commission') || lower.includes('4.44')) return KNOWLEDGE_BASE.policy;
  if (lower.includes('token') || lower.includes('8x8') || lower.includes('tm8') || lower.includes('0x8')) return "Token designs are source-policy references only. Maximum supply is 8,888,888; ordinary non-sale/P2P companion-token transfers are 0%; no mint, distribution, staking, trading, or chain deployment is verified.";
  if (lower.includes('buy') || lower.includes('sell') || lower.includes('price') || lower.includes('market')) return KNOWLEDGE_BASE.trade;
  if (hasToken(lower, 'hello') || hasToken(lower, 'hi') || hasToken(lower, 'hey')) return "Greetings. I can help with source-policy and read-only ecosystem questions while keeping runtime and value-effect claims explicit.";
  if (lower.includes('help') || lower.includes('what can')) return "I can explain source policy, NFT Vault provenance requirements, watch-only wallet boundaries, chain-observer states, and paper/simulation concepts. I will not present them as deployed financial execution.";
  if (lower.includes('seraphim') || lower.includes('guardian')) return "Seraphim is a preserved guardian concept. Current identity, heartbeat, lease, security actions, and productive artifacts require fresh verification.";
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
  const { model, provider, ollamaUrl } = req.body || {};
  const messages = normalizeUserMessages(req.body?.messages);
  if (!messages) return res.status(400).json({ error: 'invalid_messages', allowedRoles: ['user', 'assistant'] });
  const lastMsg = messages[messages.length - 1].content;
  const normalizedMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];

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
    const safeReply = safeProviderReply(providerResult.reply);
    if (safeReply) return res.json({ reply: safeReply, source: providerResult.source });
  }

  const fallbackReply = smartFallback(lastMsg);
  res.json({ reply: fallbackReply, model: 'knowledge-base', source: 'fallback' });
}
