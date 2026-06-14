#!/usr/bin/env python3
"""
ElevenLabs Voice Synthesis Service for 8x8 OS
Provides agent-specific voice synthesis via ElevenLabs TTS API.

Agent Voice Assignments:
  FLASH     → Adam      (pNInz6obpgDQGcFmaJgB) - Deep, American
  AEGIS     → Charlie   (IKne3meq5aSn9XLyUdCD) - Confident, Australian, Hyped
  VOLT      → Brian     (nPczCjzI2devNBz1zQrb) - Warm, American, Classy
  CANVAS    → Lily      (pFZP5JQG7iQjIQuC4Bku) - Velvety, British, Confident
  TRADER    → Will      (bIHbv24MWmeRgasZH58o) - Relaxed, American, Chill
  SAGE      → Daniel    (onwK4e9ZLuTAKqWW03F9) - Broadcaster, British, Formal
  SCRIBE    → Roger     (CwhRBWXzGAHq8TQ4Fs17) - Casual, American, Classy
  PULSE     → Laura     (FGY2WhTYpPnrIDTdsKH5) - Enthusiast, American, Sassy
  ORACLE    → Matilda   (XrExE9yKIg1WjnnlVkGX) - Professional, American, Upbeat
  NOVA      → Liam      (TX3LPaxmHKxFdv7VOQHJ) - Quirky, American, Confident
  WRENCH    → Eric      (cjVigY5qzO86Huf0OWal) - Smooth, American, Classy
  BEQA      → Jessica   (cgSgspJ2msm6clMCkdW9) - Playful, American, Cute
  FORTRESS  → Harry     (SOYHLrjzK2X1ezoPC6cr) - Fierce, American, Rough
  PHANTOM   → Callum    (N2lVS1w4EtoT3dr4eOWO) - Husky, American
  DIPLOMAT  → George    (JBFqnCBsd6RMkjVDRZzb) - Warm Storyteller, British, Mature
  MERCURY   → Alice     (Xb7hH8MSUJpSbSDYk0k2) - Clear Educator, British, Professional
"""

import os
import json
import urllib.request
import urllib.error
from typing import Optional

# ── API Configuration ──────────────────────────────────────────────────────────

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
ELEVENLABS_BASE_URL = os.environ.get("ELEVENLABS_BASE_URL", "https://api.elevenlabs.io/v1")
DEFAULT_MODEL = "eleven_turbo_v2_5"

# ── Agent-to-Voice Mapping ─────────────────────────────────────────────────────

AGENT_VOICES: dict = {
    "FLASH": {
        "voice_id": "pNInz6obpgDQGcFmaJgB",
        "name": "Adam",
        "labels": {"style": "deep american"},
        "settings": {"stability": 0.50, "similarity_boost": 0.75, "style": 0.0, "use_speaker_boost": True},
    },
    "AEGIS": {
        "voice_id": "IKne3meq5aSn9XLyUdCD",
        "name": "Charlie",
        "labels": {"style": "confident australian hyped"},
        "settings": {"stability": 0.45, "similarity_boost": 0.80, "style": 0.35, "use_speaker_boost": True},
    },
    "VOLT": {
        "voice_id": "nPczCjzI2devNBz1zQrb",
        "name": "Brian",
        "labels": {"style": "warm american classy"},
        "settings": {"stability": 0.50, "similarity_boost": 0.75, "style": 0.0, "use_speaker_boost": True},
    },
    "CANVAS": {
        "voice_id": "pFZP5JQG7iQjIQuC4Bku",
        "name": "Lily",
        "labels": {"style": "velvety british confident"},
        "settings": {"stability": 0.50, "similarity_boost": 0.80, "style": 0.30, "use_speaker_boost": True},
    },
    "TRADER": {
        "voice_id": "bIHbv24MWmeRgasZH58o",
        "name": "Will",
        "labels": {"style": "relaxed american chill"},
        "settings": {"stability": 0.55, "similarity_boost": 0.70, "style": 0.15, "use_speaker_boost": True},
    },
    "SAGE": {
        "voice_id": "onwK4e9ZLuTAKqWW03F9",
        "name": "Daniel",
        "labels": {"style": "broadcaster british formal"},
        "settings": {"stability": 0.60, "similarity_boost": 0.75, "style": 0.10, "use_speaker_boost": True},
    },
    "SCRIBE": {
        "voice_id": "CwhRBWXzGAHq8TQ4Fs17",
        "name": "Roger",
        "labels": {"style": "casual american classy"},
        "settings": {"stability": 0.50, "similarity_boost": 0.70, "style": 0.25, "use_speaker_boost": True},
    },
    "PULSE": {
        "voice_id": "FGY2WhTYpPnrIDTdsKH5",
        "name": "Laura",
        "labels": {"style": "enthusiast american sassy"},
        "settings": {"stability": 0.40, "similarity_boost": 0.78, "style": 0.55, "use_speaker_boost": True},
    },
    "ORACLE": {
        "voice_id": "XrExE9yKIg1WjnnlVkGX",
        "name": "Matilda",
        "labels": {"style": "professional american upbeat"},
        "settings": {"stability": 0.55, "similarity_boost": 0.80, "style": 0.20, "use_speaker_boost": True},
    },
    "NOVA": {
        "voice_id": "TX3LPaxmHKxFdv7VOQHJ",
        "name": "Liam",
        "labels": {"style": "quirky american confident energetic"},
        "settings": {"stability": 0.42, "similarity_boost": 0.78, "style": 0.50, "use_speaker_boost": True},
    },
    "WRENCH": {
        "voice_id": "cjVigY5qzO86Huf0OWal",
        "name": "Eric",
        "labels": {"style": "smooth american classy"},
        "settings": {"stability": 0.52, "similarity_boost": 0.76, "style": 0.15, "use_speaker_boost": True},
    },
    "BEQA": {
        "voice_id": "cgSgspJ2msm6clMCkdW9",
        "name": "Jessica",
        "labels": {"style": "playful american cute"},
        "settings": {"stability": 0.40, "similarity_boost": 0.75, "style": 0.60, "use_speaker_boost": True},
    },
    "FORTRESS": {
        "voice_id": "SOYHLrjzK2X1ezoPC6cr",
        "name": "Harry",
        "labels": {"style": "fierce american rough"},
        "settings": {"stability": 0.35, "similarity_boost": 0.85, "style": 0.55, "use_speaker_boost": True},
    },
    "PHANTOM": {
        "voice_id": "N2lVS1w4EtoT3dr4eOWO",
        "name": "Callum",
        "labels": {"style": "husky american"},
        "settings": {"stability": 0.48, "similarity_boost": 0.80, "style": 0.30, "use_speaker_boost": True},
    },
    "DIPLOMAT": {
        "voice_id": "JBFqnCBsd6RMkjVDRZzb",
        "name": "George",
        "labels": {"style": "warm storyteller british mature"},
        "settings": {"stability": 0.55, "similarity_boost": 0.75, "style": 0.20, "use_speaker_boost": True},
    },
    "MERCURY": {
        "voice_id": "Xb7hH8MSUJpSbSDYk0k2",
        "name": "Alice",
        "labels": {"style": "clear educator british professional"},
        "settings": {"stability": 0.55, "similarity_boost": 0.78, "style": 0.15, "use_speaker_boost": True},
    },
}


def resolve_voice(agent: Optional[str] = None, voice_id: Optional[str] = None) -> dict:
    """Resolve the voice config for a given agent name or voice_id."""
    if voice_id:
        # Direct voice_id override
        for cfg in AGENT_VOICES.values():
            if cfg["voice_id"] == voice_id:
                return {"voice_id": voice_id, "voice_name": cfg["name"], "settings": cfg["settings"]}
        return {"voice_id": voice_id, "voice_name": "Custom", "settings": AGENT_VOICES["FLASH"]["settings"]}

    agent_name = (agent or "FLASH").upper()
    if agent_name in AGENT_VOICES:
        cfg = AGENT_VOICES[agent_name]
        return {"voice_id": cfg["voice_id"], "voice_name": cfg["name"], "settings": cfg["settings"]}

    # Fallback to FLASH
    cfg = AGENT_VOICES["FLASH"]
    return {"voice_id": cfg["voice_id"], "voice_name": cfg["name"], "settings": cfg["settings"]}


def synthesize_speech(
    text: str,
    agent: Optional[str] = None,
    voice_id: Optional[str] = None,
    model_id: Optional[str] = None,
    api_key: Optional[str] = None,
) -> bytes:
    """
    Synthesize speech from text using ElevenLabs TTS API.
    Returns raw audio bytes (MP3).
    """
    key = api_key or ELEVENLABS_API_KEY
    if not key:
        raise RuntimeError("ELEVENLABS_API_KEY is not configured. Set it in the environment.")

    if not text or not text.strip():
        raise ValueError("Text is required for speech synthesis.")

    if len(text) > 5000:
        raise ValueError("Text exceeds maximum length of 5000 characters.")

    voice = resolve_voice(agent, voice_id)
    model = model_id or DEFAULT_MODEL
    url = f"{ELEVENLABS_BASE_URL}/text-to-speech/{voice['voice_id']}"

    payload = json.dumps({
        "text": text,
        "model_id": model,
        "voice_settings": {
            "stability": voice["settings"]["stability"],
            "similarity_boost": voice["settings"]["similarity_boost"],
            "style": voice["settings"]["style"],
            "use_speaker_boost": voice["settings"]["use_speaker_boost"],
        },
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": key,
        },
        method="POST",
    )

    print(f"[VoiceSynth] agent={agent or 'DEFAULT'}, voice={voice['voice_name']} ({voice['voice_id']}), model={model}, text='{text[:80]}{'...' if len(text) > 80 else ''}'")

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            audio = resp.read()
            print(f"[VoiceSynth] Audio generated: {len(audio)} bytes")
            return audio
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        if e.code == 401:
            raise RuntimeError("ElevenLabs API key is invalid or expired (401 Unauthorized)")
        elif e.code == 429:
            raise RuntimeError("ElevenLabs rate limit exceeded (429 Too Many Requests)")
        elif e.code == 402:
            raise RuntimeError("ElevenLabs quota exhausted (402 Payment Required)")
        else:
            raise RuntimeError(f"ElevenLabs API error: {e.code} {body}")


def fetch_available_voices(api_key: Optional[str] = None) -> list:
    """Fetch available voices from ElevenLabs API."""
    key = api_key or ELEVENLABS_API_KEY
    if not key:
        print("[VoiceSynth] No API key, returning cached voice list")
        return [
            {"voice_id": v["voice_id"], "name": v["name"], "labels": v["labels"]}
            for v in AGENT_VOICES.values()
        ]

    url = f"{ELEVENLABS_BASE_URL}/voices"
    req = urllib.request.Request(url, headers={"xi-api-key": key})

    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return data.get("voices", [])


def get_agent_voice_map() -> dict:
    """Get the agent-to-voice mapping."""
    return {
        agent: {"voice_id": cfg["voice_id"], "voice_name": cfg["name"], "labels": cfg["labels"]}
        for agent, cfg in AGENT_VOICES.items()
    }


if __name__ == "__main__":
    import sys
    # Quick test when run directly
    test_agent = sys.argv[1] if len(sys.argv) > 1 else "FLASH"
    test_text = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else f"Hello, this is {test_agent} speaking."
    print(f"Testing voice synthesis for agent: {test_agent}")
    print(f"Text: {test_text}")
    audio = synthesize_speech(test_text, agent=test_agent)
    out_path = f"/tmp/voice_test_{test_agent.lower()}.mp3"
    with open(out_path, "wb") as f:
        f.write(audio)
    print(f"Saved to {out_path}")
