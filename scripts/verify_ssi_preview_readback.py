#!/usr/bin/env python3
"""Fail-closed readback verifier for the SSI R5.1 preview surface.

This verifier binds a Vercel preview URL to the exact checked-out deployment
SHA and exact local SSI body. It never permits an authentication-gated skip
and it rejects production promotion, stale/root content, and missing headers.

Stdlib-only. Read-only. No deployment mutation.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path


EXPECTED_HEADERS = {
    "x-8x8-preview-identity": "SSI-R5.1-VISION-CONVERGENCE",
    "x-8x8-release-channel": "preview",
    "x-8x8-production-promotion": "false",
}

EXPECTED_MARKERS = (
    "SSI R5.1",
    "visual-convergence candidate · not production",
    "UPCOMING / IN DEVELOPMENT",
    "UPCOMING · LEGAL/RESERVE GATED",
    "Promotion requires exact preview proof + owner visual acceptance",
)

FORBIDDEN_MARKERS = (
    "<strong>FUNCTIONAL</strong>",
    "<strong>LIVE</strong>",
)

AUTH_MARKERS = (
    "vercel.com/login",
    "vercel authentication",
    "authentication required",
)


@dataclass(frozen=True)
class Observation:
    status: int
    final_url: str
    headers: dict[str, str]
    raw_body: bytes

    @property
    def body(self) -> str:
        return self.raw_body.decode("utf-8", "replace")

    @property
    def body_sha256(self) -> str:
        return hashlib.sha256(self.raw_body).hexdigest()


def validate_base_url(base_url: str) -> str:
    parsed = urllib.parse.urlparse(base_url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("base URL must be an absolute HTTPS URL")
    if parsed.username or parsed.password or parsed.fragment:
        raise ValueError("base URL must not contain credentials or a fragment")
    if parsed.path.rstrip("/"):
        raise ValueError("base URL must identify the deployment origin, not a path")
    return base_url.rstrip("/")


def validate_deployed_sha(deployed_sha: str) -> str:
    if not re.fullmatch(r"[0-9a-fA-F]{40}", deployed_sha):
        raise ValueError("deployed SHA must be a full 40-character Git commit SHA")
    return deployed_sha.lower()


def verify_deployment_attestation(
    deployment: dict,
    deployment_status: dict,
    deployed_sha: str,
    base_url: str,
) -> dict[str, object]:
    observed_sha = validate_deployed_sha(str(deployment.get("sha", "")))
    if observed_sha != deployed_sha:
        raise RuntimeError(
            "authoritative deployment SHA mismatch: "
            f"observed={observed_sha} expected={deployed_sha}"
        )
    if deployment_status.get("state") != "success":
        raise RuntimeError(
            "authoritative deployment status is not success: "
            f"{deployment_status.get('state')!r}"
        )
    observed_url = validate_base_url(str(deployment_status.get("environment_url", "")))
    if observed_url != base_url:
        raise RuntimeError(
            "authoritative deployment URL mismatch: "
            f"observed={observed_url!r} expected={base_url!r}"
        )
    deployment_api_url = deployment.get("url")
    status_deployment_url = deployment_status.get("deployment_url")
    if not deployment_api_url or status_deployment_url != deployment_api_url:
        raise RuntimeError("deployment status is not bound to the attested deployment")
    return {
        "provider": "github_deployments_api",
        "deployment_id": deployment.get("id"),
        "deployment_status_id": deployment_status.get("id"),
        "sha": observed_sha,
        "environment_url": observed_url,
    }


def request_headers(access_mode: str) -> dict[str, str]:
    headers = {
        "User-Agent": "8x8-ssi-preview-readback/2",
        "Cache-Control": "no-cache, no-store, max-age=0",
        "Pragma": "no-cache",
        "Accept": "text/html,*/*;q=0.8",
    }
    if access_mode == "public":
        return headers
    if access_mode != "protected-approved-bypass":
        raise ValueError(f"unsupported access mode: {access_mode!r}")
    bypass = os.environ.get("VERCEL_AUTOMATION_BYPASS_SECRET", "")
    if not bypass:
        raise RuntimeError(
            "protected readback requires VERCEL_AUTOMATION_BYPASS_SECRET"
        )
    headers["x-vercel-protection-bypass"] = bypass
    headers["x-vercel-set-bypass-cookie"] = "true"
    return headers


def fetch_ssi(base_url: str, timeout: float, access_mode: str) -> Observation:
    request_url = (
        f"{base_url}/ssi?__8x8_ssi_readback={time.time_ns()}"
    )
    req = urllib.request.Request(
        request_url,
        headers=request_headers(access_mode),
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return Observation(
                status=resp.status,
                final_url=resp.geturl(),
                headers={k.lower(): v for k, v in resp.headers.items()},
                raw_body=resp.read(2_000_000),
            )
    except urllib.error.HTTPError as exc:
        return Observation(
            status=exc.code,
            final_url=exc.geturl(),
            headers={k.lower(): v for k, v in exc.headers.items()},
            raw_body=exc.read(2_000_000),
        )


def verify_observation(observation: Observation, expected_body: bytes) -> dict[str, object]:
    combined = (observation.final_url + "\n" + observation.body[:10_000]).lower()
    if observation.status in {401, 403} or any(x in combined for x in AUTH_MARKERS):
        raise RuntimeError("SSI preview target is authentication-gated")
    if observation.status != 200:
        raise RuntimeError(f"SSI preview returned HTTP {observation.status}")

    final_path = urllib.parse.urlparse(observation.final_url).path.rstrip("/")
    if final_path != "/ssi":
        raise RuntimeError(
            f"SSI route escaped its canonical path: observed={final_path!r}"
        )

    content_type = observation.headers.get("content-type", "").lower()
    if "text/html" not in content_type:
        raise RuntimeError(f"SSI content type is not HTML: {content_type!r}")

    for key, expected in EXPECTED_HEADERS.items():
        observed = observation.headers.get(key)
        if observed != expected:
            raise RuntimeError(
                f"SSI header mismatch for {key}: observed={observed!r} expected={expected!r}"
            )

    cache_control = observation.headers.get("cache-control", "").lower()
    if "no-store" not in cache_control:
        raise RuntimeError("SSI preview must be served with Cache-Control: no-store")
    robots = observation.headers.get("x-robots-tag", "").lower()
    if "noindex" not in robots:
        raise RuntimeError("SSI preview must be served with X-Robots-Tag: noindex")

    missing = [marker for marker in EXPECTED_MARKERS if marker not in observation.body]
    if missing:
        raise RuntimeError(f"SSI body marker mismatch; missing={missing}")
    present_forbidden = [
        marker for marker in FORBIDDEN_MARKERS if marker in observation.body
    ]
    if present_forbidden:
        raise RuntimeError(
            f"SSI body contains forbidden live-status markers: {present_forbidden}"
        )

    expected_sha256 = hashlib.sha256(expected_body).hexdigest()
    if observation.body_sha256 != expected_sha256:
        raise RuntimeError(
            "SSI body is stale or not the exact checked-out carrier: "
            f"observed={observation.body_sha256} expected={expected_sha256}"
        )

    return {
        "status": observation.status,
        "final_url": observation.final_url,
        "body_sha256": observation.body_sha256,
        "preview_identity": observation.headers["x-8x8-preview-identity"],
        "release_channel": observation.headers["x-8x8-release-channel"],
        "production_promotion": observation.headers["x-8x8-production-promotion"],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--deployed-sha", required=True)
    parser.add_argument("--deployment-record", required=True)
    parser.add_argument("--deployment-status-record", required=True)
    parser.add_argument("--expected-body", default="ssi/index.html")
    parser.add_argument("--environment", default="Preview")
    parser.add_argument(
        "--access-mode",
        choices=("public", "protected-approved-bypass"),
        default="public",
    )
    parser.add_argument("--timeout", type=float, default=20.0)
    args = parser.parse_args()

    base_url = validate_base_url(args.base_url)
    deployed_sha = validate_deployed_sha(args.deployed_sha)
    if args.environment.strip().lower() != "preview":
        raise ValueError("SSI verifier is preview-only; production promotion is denied")

    expected_path = Path(args.expected_body)
    if not expected_path.is_file():
        raise FileNotFoundError(f"expected SSI body not found: {expected_path}")
    expected_body = expected_path.read_bytes()

    deployment = json.loads(Path(args.deployment_record).read_text(encoding="utf-8"))
    deployment_status = json.loads(
        Path(args.deployment_status_record).read_text(encoding="utf-8")
    )
    attestation = verify_deployment_attestation(
        deployment,
        deployment_status,
        deployed_sha,
        base_url,
    )

    observation = fetch_ssi(base_url, args.timeout, args.access_mode)
    receipt = verify_observation(observation, expected_body)
    receipt.update(
        {
            "schema": "8x8.ssi-preview-readback.v1",
            "deployment_sha": deployed_sha,
            "deployment_url": base_url,
            "environment": "Preview",
            "source_body_sha256": hashlib.sha256(expected_body).hexdigest(),
            "deployment_attestation": attestation,
            "access_mode": args.access_mode,
            "public_preview_acceptance": args.access_mode == "public",
            "protection_decision": (
                "PUBLIC_UNAUTHENTICATED"
                if args.access_mode == "public"
                else "PROTECTED_APPROVED_AUTOMATION_BYPASS"
            ),
        }
    )
    print("SSI_PREVIEW_READBACK_RECEIPT=" + json.dumps(receipt, sort_keys=True))
    print("SSI_PREVIEW_READBACK=PASS")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(
            f"SSI_PREVIEW_READBACK=FAIL {type(exc).__name__}: {exc}",
            file=sys.stderr,
        )
        raise SystemExit(1)
