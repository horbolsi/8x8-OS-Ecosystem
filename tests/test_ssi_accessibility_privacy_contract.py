from __future__ import annotations

import json
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "ssi" / "index.html"
VERCEL_PATH = ROOT / "vercel.json"
WORKFLOW_PATH = ROOT / ".github" / "workflows" / "vercel-release-readback.yml"


class ContractParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []
        self.tabs: list[dict[str, str | None]] = []
        self.panels: list[dict[str, str | None]] = []
        self.external_urls: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"])
        if values.get("role") == "tab":
            self.tabs.append(values)
        if values.get("role") == "tabpanel":
            self.panels.append(values)
        for key in ("src", "href", "action"):
            value = values.get(key)
            if value and re.match(r"(?i)https?://", value):
                self.external_urls.append(value)


class SsiAccessibilityPrivacyContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = HTML_PATH.read_text(encoding="utf-8")
        cls.vercel = json.loads(VERCEL_PATH.read_text(encoding="utf-8"))
        cls.parser = ContractParser()
        cls.parser.feed(cls.html)

    def test_eight_tabs_and_panels_have_complete_relationships(self):
        self.assertEqual(len(self.parser.tabs), 8)
        self.assertEqual(len(self.parser.panels), 8)
        self.assertEqual(len(self.parser.ids), len(set(self.parser.ids)))
        panel_ids = {panel["id"] for panel in self.parser.panels}
        tab_ids = {tab["id"] for tab in self.parser.tabs}
        self.assertEqual({tab["aria-controls"] for tab in self.parser.tabs}, panel_ids)
        self.assertEqual(
            {panel["aria-labelledby"] for panel in self.parser.panels}, tab_ids
        )
        self.assertEqual(
            sum(tab.get("aria-selected") == "true" for tab in self.parser.tabs), 1
        )
        self.assertEqual(sum("hidden" in panel for panel in self.parser.panels), 7)
        self.assertTrue(all(tab.get("type") == "button" for tab in self.parser.tabs))

    def test_keyboard_focus_and_reduced_motion_contract(self):
        for marker in (
            ".navBtn:focus-visible",
            "ArrowRight",
            "ArrowLeft",
            "ArrowDown",
            "ArrowUp",
            "event.key==='Home'",
            "event.key==='End'",
            "prefers-reduced-motion: reduce",
            "aria-selected",
        ):
            self.assertIn(marker, self.html)

    def test_mobile_contract(self):
        for marker in (
            'name="viewport"',
            "@media(max-width:760px)",
            "overflow-x:hidden",
            ".rail{position:sticky",
        ):
            self.assertIn(marker, self.html)

    def test_no_external_or_stateful_privacy_surfaces(self):
        self.assertFalse(
            (ROOT / "ssi" / "preview-entry.html").exists(),
            "unused transform carrier must not diverge from served ssi/index.html",
        )
        self.assertEqual(self.parser.external_urls, [])
        forbidden = (
            "fetch(",
            "XMLHttpRequest",
            "WebSocket",
            "EventSource",
            "navigator.sendBeacon",
            "document.cookie",
            "localStorage",
            "sessionStorage",
            "<iframe",
            "<form",
        )
        for marker in forbidden:
            self.assertNotIn(marker, self.html)

    def test_fail_closed_headers_and_permissions(self):
        all_headers = {}
        ssi_headers = {}
        for rule in self.vercel["headers"]:
            target = all_headers if rule["source"] == "/(.*)" else None
            if rule["source"] == "/ssi(.*)":
                target = ssi_headers
            if target is not None:
                target.update(
                    {header["key"].lower(): header["value"] for header in rule["headers"]}
                )

        self.assertEqual(
            ssi_headers["x-8x8-preview-identity"],
            "SSI-R5.1-VISION-CONVERGENCE",
        )
        self.assertEqual(ssi_headers["x-8x8-release-channel"], "preview")
        self.assertEqual(ssi_headers["x-8x8-production-promotion"], "false")
        self.assertIn("no-store", ssi_headers["cache-control"])
        self.assertIn("noindex", ssi_headers["x-robots-tag"])

        permissions = all_headers["permissions-policy"]
        for capability in (
            "camera=()",
            "microphone=()",
            "geolocation=()",
            "payment=()",
            "usb=()",
            "serial=()",
            "bluetooth=()",
        ):
            self.assertIn(capability, permissions)

        csp = all_headers["content-security-policy"]
        for directive in (
            "default-src 'self'",
            "connect-src 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "form-action 'none'",
        ):
            self.assertIn(directive, csp)

    def test_protected_readback_blocker_fails_required_job(self):
        workflow = WORKFLOW_PATH.read_text(encoding="utf-8")
        blocked = workflow.index(
            "SSI_PROTECTED_READBACK=BLOCKED_BYPASS_SECRET_NOT_CONFIGURED"
        )
        verifier = workflow.index(
            "python3 scripts/verify_ssi_preview_readback.py", blocked
        )
        branch = workflow[blocked:verifier]
        self.assertIn('echo "::error::SSI_PROTECTED_READBACK=', branch)
        self.assertIn("exit 1", branch)
        self.assertNotIn("exit 0", branch)

    def test_economic_truth_markers_remain_gated(self):
        self.assertNotIn("<strong>FUNCTIONAL</strong>", self.html)
        self.assertIn("UPCOMING / IN DEVELOPMENT", self.html)
        self.assertIn("UPCOMING · LEGAL/RESERVE GATED", self.html)
        self.assertIn("visual-convergence candidate · not production", self.html)


if __name__ == "__main__":
    unittest.main()
