from __future__ import annotations

import importlib.util
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / "scripts"
    / "verify_ssi_preview_readback.py"
)
SPEC = importlib.util.spec_from_file_location("verify_ssi_preview_readback", MODULE_PATH)
assert SPEC and SPEC.loader
VERIFIER = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = VERIFIER
SPEC.loader.exec_module(VERIFIER)


GOOD_BODY = """<!doctype html>
<title>©️8x8 by FlashTM8 ⚡️🌎🤖 · SSI R5.1 Vision Convergence Preview</title>
<b>R5.1 · SSI PREVIEW</b>
<small>visual-convergence candidate · not production</small>
<strong>UPCOMING / IN DEVELOPMENT</strong>
<strong>UPCOMING · LEGAL/RESERVE GATED</strong>
<span>Promotion requires exact preview proof + owner visual acceptance</span>
""".encode()


def good_headers() -> dict[str, str]:
    return {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store, max-age=0",
        "x-robots-tag": "noindex, nofollow",
        "x-8x8-preview-identity": "SSI-R5.1-VISION-CONVERGENCE",
        "x-8x8-release-channel": "preview",
        "x-8x8-production-promotion": "false",
    }


def observation(
    *,
    status: int = 200,
    final_url: str = "https://preview.example.test/ssi?cache=1",
    headers: dict[str, str] | None = None,
    body: bytes = GOOD_BODY,
):
    return VERIFIER.Observation(
        status=status,
        final_url=final_url,
        headers=good_headers() if headers is None else headers,
        raw_body=body,
    )


class VerifySsiPreviewReadbackTests(unittest.TestCase):
    def test_exact_preview_passes(self):
        receipt = VERIFIER.verify_observation(observation(), GOOD_BODY)
        self.assertEqual(receipt["production_promotion"], "false")

    def test_root_content_at_ssi_fails(self):
        root_body = b"<title>ONE FABRIC LIVE R5</title>"
        with self.assertRaisesRegex(RuntimeError, "body marker mismatch"):
            VERIFIER.verify_observation(observation(body=root_body), root_body)

    def test_wrong_header_fails(self):
        headers = good_headers()
        headers["x-8x8-preview-identity"] = "STALE"
        with self.assertRaisesRegex(RuntimeError, "header mismatch"):
            VERIFIER.verify_observation(observation(headers=headers), GOOD_BODY)

    def test_missing_header_fails(self):
        headers = good_headers()
        del headers["x-8x8-release-channel"]
        with self.assertRaisesRegex(RuntimeError, "header mismatch"):
            VERIFIER.verify_observation(observation(headers=headers), GOOD_BODY)

    def test_auth_gate_fails(self):
        with self.assertRaisesRegex(RuntimeError, "authentication-gated"):
            VERIFIER.verify_observation(
                observation(
                    status=401,
                    final_url="https://vercel.com/login",
                    body=b"Vercel Authentication",
                ),
                GOOD_BODY,
            )

    def test_stale_body_fails_even_with_markers(self):
        stale = GOOD_BODY + b"\n<!-- stale -->\n"
        with self.assertRaisesRegex(RuntimeError, "stale or not the exact"):
            VERIFIER.verify_observation(observation(body=stale), GOOD_BODY)

    def test_production_promotion_true_fails(self):
        headers = good_headers()
        headers["x-8x8-production-promotion"] = "true"
        with self.assertRaisesRegex(RuntimeError, "header mismatch"):
            VERIFIER.verify_observation(observation(headers=headers), GOOD_BODY)

    def test_route_redirect_to_root_fails(self):
        with self.assertRaisesRegex(RuntimeError, "escaped its canonical path"):
            VERIFIER.verify_observation(
                observation(final_url="https://preview.example.test/"), GOOD_BODY
            )

    def test_forbidden_live_marker_fails(self):
        body = GOOD_BODY + b"\n<strong>FUNCTIONAL</strong>\n"
        with self.assertRaisesRegex(RuntimeError, "forbidden live-status"):
            VERIFIER.verify_observation(observation(body=body), body)

    def test_invalid_deployment_sha_fails(self):
        with self.assertRaisesRegex(ValueError, "40-character"):
            VERIFIER.validate_deployed_sha("short")

    def test_authoritative_deployment_attestation_passes(self):
        sha = "a" * 40
        url = "https://preview.example.test"
        receipt = VERIFIER.verify_deployment_attestation(
            {"id": 88, "sha": sha, "url": "https://api.github.test/deployments/88"},
            {
                "id": 99,
                "state": "success",
                "environment_url": url,
                "deployment_url": "https://api.github.test/deployments/88",
            },
            sha,
            url,
        )
        self.assertEqual(receipt["sha"], sha)
        self.assertEqual(receipt["deployment_id"], 88)

    def test_authoritative_deployment_sha_mismatch_fails(self):
        with self.assertRaisesRegex(RuntimeError, "SHA mismatch"):
            VERIFIER.verify_deployment_attestation(
                {"id": 88, "sha": "b" * 40, "url": "https://api.test/d/88"},
                {
                    "id": 99,
                    "state": "success",
                    "environment_url": "https://preview.example.test",
                    "deployment_url": "https://api.test/d/88",
                },
                "a" * 40,
                "https://preview.example.test",
            )

    def test_authoritative_deployment_url_mismatch_fails(self):
        with self.assertRaisesRegex(RuntimeError, "URL mismatch"):
            VERIFIER.verify_deployment_attestation(
                {"id": 88, "sha": "a" * 40, "url": "https://api.test/d/88"},
                {
                    "id": 99,
                    "state": "success",
                    "environment_url": "https://other.example.test",
                    "deployment_url": "https://api.test/d/88",
                },
                "a" * 40,
                "https://preview.example.test",
            )

    def test_authoritative_deployment_non_success_fails(self):
        with self.assertRaisesRegex(RuntimeError, "not success"):
            VERIFIER.verify_deployment_attestation(
                {"id": 88, "sha": "a" * 40, "url": "https://api.test/d/88"},
                {
                    "id": 99,
                    "state": "pending",
                    "environment_url": "https://preview.example.test",
                    "deployment_url": "https://api.test/d/88",
                },
                "a" * 40,
                "https://preview.example.test",
            )

    def test_public_request_never_uses_bypass_secret(self):
        with patch.dict(os.environ, {"VERCEL_AUTOMATION_BYPASS_SECRET": "secret"}):
            headers = VERIFIER.request_headers("public")
        self.assertNotIn("x-vercel-protection-bypass", headers)

    def test_protected_request_requires_configured_bypass(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "requires"):
                VERIFIER.request_headers("protected-approved-bypass")

    def test_protected_request_uses_bypass_without_exposing_it(self):
        with patch.dict(
            os.environ, {"VERCEL_AUTOMATION_BYPASS_SECRET": "opaque-secret"}
        ):
            headers = VERIFIER.request_headers("protected-approved-bypass")
        self.assertEqual(headers["x-vercel-protection-bypass"], "opaque-secret")
        self.assertEqual(headers["x-vercel-set-bypass-cookie"], "true")


if __name__ == "__main__":
    unittest.main()
