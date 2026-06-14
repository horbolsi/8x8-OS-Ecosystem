#!/usr/bin/env python3
"""
8x8 Hub — FAL.ai Image Generation Bridge
Generates images using FAL.ai's Flux Pro / Flux Dev models
"""

import os
import json
import time
import base64
import hashlib
import subprocess
import urllib.request
import urllib.parse
from pathlib import Path
from datetime import datetime, UTC

# ─── Configuration ───────────────────────────────────────────────

FAL_KEY = os.environ.get('FAL_KEY', '')
FAL_API_URL = "https://fal.run"

DEFAULT_OUTPUT_DIR = "/storage/emulated/0/8x8 OS/06_MEDIA/photos"

# Model registry
MODELS = {
    "flux-pro": {
        "endpoint": "fal-ai/flux-pro/v1.1-ultra",
        "description": "Flux Pro 1.1 Ultra - highest quality",
        "default_size": "square_hd",
    },
    "flux-dev": {
        "endpoint": "fal-ai/flux/dev",
        "description": "Flux Dev - fast generation",
        "default_size": "square",
    },
    "flux-schnell": {
        "endpoint": "fal-ai/flux/schnell",
        "description": "Flux Schnell - fastest generation",
        "default_size": "square",
    },
}

# In-memory job store (for status tracking)
_jobs = {}


# ─── Helpers ─────────────────────────────────────────────────────

def _job_id():
    return hashlib.sha256(f"{time.time()}-{os.urandom(8).hex()}".encode()).hexdigest()[:16]


def _ensure_dir(path):
    Path(path).mkdir(parents=True, exist_ok=True)


def _download_image(url, output_path):
    """Download image from URL (handles data: URLs and http(s) URLs)."""
    if url.startswith("data:image"):
        # Base64-encoded image
        header, b64data = url.split(",", 1)
        ext = "jpeg" if "jpeg" in header or "jpg" in header else "png"
        if not output_path.endswith(f".{ext}"):
            output_path = output_path.rsplit(".", 1)[0] + f".{ext}"
        with open(output_path, "wb") as f:
            f.write(base64.b64decode(b64data))
    else:
        # HTTP URL
        req = urllib.request.Request(url, headers={"User-Agent": "8x8-hub/1.0"})
        resp = urllib.request.urlopen(req, timeout=60)
        with open(output_path, "wb") as f:
            f.write(resp.read())
    return output_path


# ─── Core API ────────────────────────────────────────────────────

def generate_image(
    prompt: str,
    model: str = "flux-pro",
    image_size: str = None,
    num_images: int = 1,
    output_dir: str = None,
    filename: str = None,
    seed: int = None,
) -> dict:
    """
    Generate an image using FAL.ai.

    Args:
        prompt: Text description of the image
        model: Model key (flux-pro, flux-dev, flux-schnell)
        image_size: Size preset (square, square_hd, portrait_4_3, landscape_16_9, etc.)
        num_images: Number of images to generate (1-4)
        output_dir: Directory to save images
        filename: Custom filename (without extension)
        seed: Random seed for reproducibility

    Returns:
        dict with job_id, status, images list, and metadata
    """
    if model not in MODELS:
        return {"error": f"Unknown model: {model}. Available: {list(MODELS.keys())}"}

    jid = _job_id()
    model_info = MODELS[model]
    size = image_size or model_info["default_size"]
    out_dir = output_dir or DEFAULT_OUTPUT_DIR
    _ensure_dir(out_dir)

    _jobs[jid] = {
        "id": jid,
        "status": "pending",
        "prompt": prompt,
        "model": model,
        "created_at": datetime.now(UTC).isoformat(),
        "images": [],
    }

    try:
        os.environ["FAL_KEY"] = FAL_KEY
        from fal_client import submit

        payload = {
            "prompt": prompt,
            "num_images": num_images,
            "image_size": size,
            "sync_mode": True,
        }
        if seed is not None:
            payload["seed"] = seed

        handler = submit(model_info["endpoint"], payload)
        result = handler.get()

        images = []
        raw_images = result.get("images", [])

        for i, img in enumerate(raw_images):
            url = img.get("url", "")
            width = img.get("width", 0)
            height = img.get("height", 0)

            if filename:
                fname = f"{filename}_{i+1}" if len(raw_images) > 1 else filename
            else:
                ts = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
                safe_prompt = "".join(c if c.isalnum() else "_" for c in prompt[:30]).strip("_")
                fname = f"{model}_{safe_prompt}_{ts}_{i+1}"

            output_path = os.path.join(out_dir, fname)
            saved_path = _download_image(url, output_path)

            images.append({
                "path": saved_path,
                "url": url if not url.startswith("data:") else None,
                "width": width,
                "height": height,
            })

        _jobs[jid]["status"] = "completed"
        _jobs[jid]["images"] = images
        _jobs[jid]["completed_at"] = datetime.now(UTC).isoformat()
        _jobs[jid]["seed"] = result.get("seed")

        return {
            "job_id": jid,
            "status": "completed",
            "model": model,
            "prompt": prompt,
            "images": images,
            "seed": result.get("seed"),
        }

    except Exception as e:
        _jobs[jid]["status"] = "failed"
        _jobs[jid]["error"] = str(e)
        return {
            "job_id": jid,
            "status": "failed",
            "error": str(e),
        }


def get_job_status(job_id: str) -> dict:
    """Get the status of a generation job."""
    if job_id not in _jobs:
        return {"error": "Job not found", "job_id": job_id}
    return _jobs[job_id]


def list_jobs(limit: int = 20) -> list:
    """List recent generation jobs."""
    sorted_jobs = sorted(_jobs.values(), key=lambda j: j.get("created_at", ""), reverse=True)
    return sorted_jobs[:limit]


def list_models() -> dict:
    """List available models."""
    return MODELS


# ─── CLI ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python3 image_gen.py <command> [args]")
        print("Commands:")
        print("  generate <prompt> [model] [filename]  - Generate an image")
        print("  status <job_id>                        - Check job status")
        print("  jobs                                   - List recent jobs")
        print("  models                                 - List available models")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "generate":
        prompt = sys.argv[2] if len(sys.argv) > 2 else "A beautiful sunset over mountains"
        model = sys.argv[3] if len(sys.argv) > 3 else "flux-pro"
        filename = sys.argv[4] if len(sys.argv) > 4 else None
        result = generate_image(prompt, model=model, filename=filename)
        print(json.dumps(result, indent=2, default=str))

    elif cmd == "status":
        jid = sys.argv[2] if len(sys.argv) > 2 else ""
        print(json.dumps(get_job_status(jid), indent=2, default=str))

    elif cmd == "jobs":
        print(json.dumps(list_jobs(), indent=2, default=str))

    elif cmd == "models":
        print(json.dumps(list_models(), indent=2, default=str))

    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
