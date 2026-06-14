/**
 * ElevenLabs Voice Synthesis Service for 8x8 OS
 * Provides agent-specific voice synthesis via ElevenLabs TTS API.
 *
 * Agent Voice Assignments:
 *   FLASH     → Adam      (pNInz6obpgDQGcFmaJgB) - Deep, American
 *   AEGIS     → Charlie   (IKne3meq5aSn9XLyUdCD) - Confident, Australian, Hyped
 *   VOLT      → Brian     (nPczCjzI2devNBz1zQrb) - Warm, American, Classy
 *   CANVAS    → Lily      (pFZP5JQG7iQjIQuC4Bku) - Velvety, British, Confident
 *   TRADER    → Will      (bIHbv24MWmeRgasZH58o) - Relaxed, American, Chill
 *   SAGE      → Daniel    (onwK4e9ZLuTAKqWW03F9) - Broadcaster, British, Formal
 *   SCRIBE    → Roger     (CwhRBWXzGAHq8TQ4Fs17) - Casual, American, Classy
 *   PULSE     → Laura     (FGY2WhTYpPnrIDTdsKH5) - Enthusiast, American, Sassy
 *   ORACLE    → Matilda   (XrExE9yKIg1WjnnlVkGX) - Professional, American, Upbeat
 *   NOVA      → Liam      (TX3LPaxmHKxFdv7VOQHJ) - Quirky, American, Confident
 *   WRENCH    → Eric      (cjVigY5qzO86Huf0OWal) - Smooth, American, Classy
 *   BEQA      → Jessica   (cgSgspJ2msm6clMCkdW9) - Playful, American, Cute
 *   FORTRESS  → Harry     (SOYHLrjzK2X1ezoPC6cr) - Fierce, American, Rough
 *   PHANTOM   → Callum    (N2lVS1w4EtoT3dr4eOWO) - Husky, American
 *   DIPLOMAT  → George    (JBFqnCBsd6RMkjVDRZzb) - Warm Storyteller, British, Mature
 *   MERCURY   → Alice     (Xb7hH8MSUJpSbSDYk0k2) - Clear Educator, British, Professional
 */

export interface VoiceConfig {
  voice_id: string;
  name: string;
  labels: Record<string, string>;
  settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
}

// Agent-to-voice mapping — each agent gets a unique personality-matched voice
export const AGENT_VOICES: Record<string, VoiceConfig> = {
  FLASH: {
    voice_id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    labels: { style: "deep american" },
    settings: { stability: 0.50, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
  },
  AEGIS: {
    voice_id: "IKne3meq5aSn9XLyUdCD",
    name: "Charlie",
    labels: { style: "confident australian hyped" },
    settings: { stability: 0.45, similarity_boost: 0.80, style: 0.35, use_speaker_boost: true },
  },
  VOLT: {
    voice_id: "nPczCjzI2devNBz1zQrb",
    name: "Brian",
    labels: { style: "warm american classy" },
    settings: { stability: 0.50, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
  },
  CANVAS: {
    voice_id: "pFZP5JQG7iQjIQuC4Bku",
    name: "Lily",
    labels: { style: "velvety british confident" },
    settings: { stability: 0.50, similarity_boost: 0.80, style: 0.30, use_speaker_boost: true },
  },
  TRADER: {
    voice_id: "bIHbv24MWmeRgasZH58o",
    name: "Will",
    labels: { style: "relaxed american chill" },
    settings: { stability: 0.55, similarity_boost: 0.70, style: 0.15, use_speaker_boost: true },
  },
  SAGE: {
    voice_id: "onwK4e9ZLuTAKqWW03F9",
    name: "Daniel",
    labels: { style: "broadcaster british formal" },
    settings: { stability: 0.60, similarity_boost: 0.75, style: 0.10, use_speaker_boost: true },
  },
  SCRIBE: {
    voice_id: "CwhRBWXzGAHq8TQ4Fs17",
    name: "Roger",
    labels: { style: "casual american classy" },
    settings: { stability: 0.50, similarity_boost: 0.70, style: 0.25, use_speaker_boost: true },
  },
  PULSE: {
    voice_id: "FGY2WhTYpPnrIDTdsKH5",
    name: "Laura",
    labels: { style: "enthusiast american sassy" },
    settings: { stability: 0.40, similarity_boost: 0.78, style: 0.55, use_speaker_boost: true },
  },
  ORACLE: {
    voice_id: "XrExE9yKIg1WjnnlVkGX",
    name: "Matilda",
    labels: { style: "professional american upbeat" },
    settings: { stability: 0.55, similarity_boost: 0.80, style: 0.20, use_speaker_boost: true },
  },
  NOVA: {
    voice_id: "TX3LPaxmHKxFdv7VOQHJ",
    name: "Liam",
    labels: { style: "quirky american confident energetic" },
    settings: { stability: 0.42, similarity_boost: 0.78, style: 0.50, use_speaker_boost: true },
  },
  WRENCH: {
    voice_id: "cjVigY5qzO86Huf0OWal",
    name: "Eric",
    labels: { style: "smooth american classy" },
    settings: { stability: 0.52, similarity_boost: 0.76, style: 0.15, use_speaker_boost: true },
  },
  BEQA: {
    voice_id: "cgSgspJ2msm6clMCkdW9",
    name: "Jessica",
    labels: { style: "playful american cute" },
    settings: { stability: 0.40, similarity_boost: 0.75, style: 0.60, use_speaker_boost: true },
  },
  FORTRESS: {
    voice_id: "SOYHLrjzK2X1ezoPC6cr",
    name: "Harry",
    labels: { style: "fierce american rough" },
    settings: { stability: 0.35, similarity_boost: 0.85, style: 0.55, use_speaker_boost: true },
  },
  PHANTOM: {
    voice_id: "N2lVS1w4EtoT3dr4eOWO",
    name: "Callum",
    labels: { style: "husky american" },
    settings: { stability: 0.48, similarity_boost: 0.80, style: 0.30, use_speaker_boost: true },
  },
  DIPLOMAT: {
    voice_id: "JBFqnCBsd6RMkjVDRZzb",
    name: "George",
    labels: { style: "warm storyteller british mature" },
    settings: { stability: 0.55, similarity_boost: 0.75, style: 0.20, use_speaker_boost: true },
  },
  MERCURY: {
    voice_id: "Xb7hH8MSUJpSbSDYk0k2",
    name: "Alice",
    labels: { style: "clear educator british professional" },
    settings: { stability: 0.55, similarity_boost: 0.78, style: 0.15, use_speaker_boost: true },
  },
};

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const ELEVENLABS_BASE_URL = process.env.ELEVENLABS_BASE_URL || "https://api.elevenlabs.io/v1";
const DEFAULT_MODEL = "eleven_turbo_v2_5";

export interface SynthesizeOptions {
  text: string;
  agent?: string;
  voice_id?: string;
  model_id?: string;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export interface SynthesizeResult {
  audio: Buffer;
  content_type: string;
  agent: string;
  voice_id: string;
  voice_name: string;
  model_id: string;
  text_length: number;
}

function resolveVoice(opts: SynthesizeOptions): { voice_id: string; voice_name: string; settings: Record<string, any> } {
  if (opts.voice_id) {
    for (const cfg of Object.values(AGENT_VOICES)) {
      if (cfg.voice_id === opts.voice_id) {
        return { voice_id: opts.voice_id, voice_name: cfg.name, settings: opts.voice_settings || cfg.settings };
      }
    }
    return { voice_id: opts.voice_id, voice_name: "Custom", settings: AGENT_VOICES.FLASH.settings };
  }

  const agentName = (opts.agent || "FLASH").toUpperCase();
  const agentVoice = AGENT_VOICES[agentName];
  if (agentVoice) {
    return { voice_id: agentVoice.voice_id, voice_name: agentVoice.name, settings: opts.voice_settings || agentVoice.settings };
  }

  return { voice_id: AGENT_VOICES.FLASH.voice_id, voice_name: AGENT_VOICES.FLASH.name, settings: AGENT_VOICES.FLASH.settings };
}

export async function synthesizeSpeech(opts: SynthesizeOptions): Promise<SynthesizeResult> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not configured. Set it in the environment or .env file.");
  }
  if (!opts.text || opts.text.trim().length === 0) {
    throw new Error("Text is required for speech synthesis.");
  }
  if (opts.text.length > 5000) {
    throw new Error("Text exceeds maximum length of 5000 characters.");
  }

  const { voice_id, voice_name, settings } = resolveVoice(opts);
  const model_id = opts.model_id || DEFAULT_MODEL;
  const url = `${ELEVENLABS_BASE_URL}/text-to-speech/${voice_id}`;

  const payload = {
    text: opts.text,
    model_id,
    voice_settings: {
      stability: settings.stability ?? 0.5,
      similarity_boost: settings.similarity_boost ?? 0.75,
      style: settings.style ?? 0.0,
      use_speaker_boost: settings.use_speaker_boost ?? true,
    },
  };

  console.log(`[VoiceSynth] Synthesizing: agent=${opts.agent || "DEFAULT"}, voice=${voice_name} (${voice_id}), model=${model_id}, text="${opts.text.substring(0, 80)}${opts.text.length > 80 ? "..." : ""}"`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Accept": "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
  });

  if (response.status === 401) throw new Error("ElevenLabs API key is invalid or expired (401 Unauthorized)");
  if (response.status === 429) throw new Error("ElevenLabs rate limit exceeded (429 Too Many Requests)");
  if (response.status === 402) throw new Error("ElevenLabs quota exhausted (402 Payment Required)");
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`ElevenLabs API error: ${response.status} ${body}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  const content_type = response.headers.get("content_type") || "audio/mpeg";
  console.log(`[VoiceSynth] Audio generated: ${audio.length} bytes, content-type=${content_type}`);

  return { audio, content_type, agent: opts.agent || "DEFAULT", voice_id, voice_name, model_id, text_length: opts.text.length };
}

export async function fetchAvailableVoices(): Promise<any[]> {
  if (!ELEVENLABS_API_KEY) {
    console.warn("[VoiceSynth] No API key, returning cached voice list");
    return Object.values(AGENT_VOICES).map(v => ({ voice_id: v.voice_id, name: v.name, labels: v.labels }));
  }
  const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Failed to fetch voices: ${response.status}`);
  const data = await response.json();
  return data.voices || [];
}

export function getAgentVoiceMap(): Record<string, { voice_id: string; voice_name: string; labels: Record<string, string> }> {
  const result: Record<string, any> = {};
  for (const [agent, config] of Object.entries(AGENT_VOICES)) {
    result[agent] = { voice_id: config.voice_id, voice_name: config.name, labels: config.labels };
  }
  return result;
}
