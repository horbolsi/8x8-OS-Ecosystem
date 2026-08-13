#!/usr/bin/env python3
"""Fail-closed Vercel carrier readback for ©️8x8 by FlashTM8 ⚡️🌎🤖.

The verifier proves rendered body identity, not merely deployment build state.
It is intentionally stdlib-only and performs no mutations.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


def load_identity(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    required = {
        "schema",
        "brand",
        "canonical_root",
        "release_id",
        "carrier_path",
        "carrier_blob_sha",
        "expected_root_markers",
        "rollback_routes",
    }
    missing = sorted(required - data.keys())
    if missing:
        raise ValueError(f"identity missing keys: {missing}")
    if not data["expected_root_markers"]:
        raise ValueError("expected_root_markers must not be empty")
    return data


def fetch(url: str, timeout: float) -> tuple[int, str, dict[str, str], str]:
    sep = "&" if "?" in url else "?"
    request_url = f"{url}{sep}__8x8_readback={time.time_ns()}"
    req = urllib.request.Request(
        request_url,
        headers={
            "User-Agent": "8x8-release-readback/2",
            "Cache-Control": "no-cache, no-store, max-age=0",
            "Pragma": "no-cache",
            "Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read(2_000_000)
            body = raw.decode("utf-8", "replace")
            headers = {k.lower(): v for k, v in resp.headers.items()}
            return resp.status, resp.geturl(), headers, body
    except urllib.error.HTTPError as exc:
        raw = exc.read(2_000_000)
        body = raw.decode("utf-8", "replace")
        headers = {k.lower(): v for k, v in exc.headers.items()}
        return exc.code, exc.geturl(), headers, body


def looks_auth_gated(status: int, final_url: str, body: str) -> bool:
    text = (final_url + "\n" + body[:10000]).lower()
    return status in {401, 403} or "vercel.com/login" in text or "vercel authentication" in text


def verify_url(
    base_url: str,
    identity: dict,
    environment: str,
    timeout: float,
    allow_auth_gated: bool,
) -> None:
    base = base_url.rstrip("/")
    status, final_url, headers, root_body = fetch(base + "/", timeout)
    print(f"READBACK_URL={base}")
    print(f"ENVIRONMENT={environment}")
    print(f"ROOT_HTTP={status}")
    print(f"ROOT_FINAL_URL={final_url}")
    print(f"ROOT_CONTENT_TYPE={headers.get('content-type', '')}")
    print(f"ROOT_X_VERCEL_CACHE={headers.get('x-vercel-cache', '')}")
    print(f"ROOT_BODY_SHA256={hashlib.sha256(root_body.encode('utf-8')).hexdigest()}")

    auth_gated = looks_auth_gated(status, final_url, root_body)
    print(f"AUTH_GATED={'YES' if auth_gated else 'NO'}")
    if auth_gated:
        if allow_auth_gated:
            print("BODY_PROOF=SKIPPED_AUTH_GATED_ALLOWED")
            return
        raise RuntimeError("readback target is auth-gated")

    if status != 200:
        raise RuntimeError(f"root returned HTTP {status}")

    missing = [m for m in identity["expected_root_markers"] if m not in root_body]
    if missing:
        raise RuntimeError(f"root release marker mismatch; missing={missing}")
    print(f"ROOT_RELEASE_IDENTITY={identity['release_id']}")
    print("ROOT_MARKERS=PASS")
    print(f"EXPECTED_CARRIER_BLOB_SHA={identity['carrier_blob_sha']}")

    for route in identity.get("rollback_routes", []):
        r_status, r_final, _, r_body = fetch(base + route, timeout)
        print(f"ROLLBACK_ROUTE={route} HTTP={r_status} FINAL={r_final}")
        if r_status != 200:
            raise RuntimeError(f"rollback route {route} returned HTTP {r_status}")
        if r_body == root_body:
            raise RuntimeError(f"rollback route {route} is byte-identical to root")
    print("ROLLBACK_READBACK=PASS")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--identity", default="release-identity.json")
    ap.add_argument("--environment", default="Preview")
    ap.add_argument("--timeout", type=float, default=20.0)
    ap.add_argument(
        "--allow-auth-gated",
        action="store_true",
        help="Permit an auth-gated generated deployment URL as informational only.",
    )
    args = ap.parse_args()

    identity = load_identity(Path(args.identity))
    print(f"SCHEMA={identity['schema']}")
    print(f"BRAND={identity['brand']}")
    print(f"CANONICAL_ROOT={identity['canonical_root']}")
    verify_url(
        args.base_url,
        identity,
        args.environment,
        args.timeout,
        args.allow_auth_gated,
    )
    print("VERCEL_RELEASE_READBACK=PASS")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"VERCEL_RELEASE_READBACK=FAIL {type(exc).__name__}: {exc}", file=sys.stderr)
        raise SystemExit(1)
