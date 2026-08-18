import hashlib
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def git_blob(path: Path) -> str:
    data = path.read_bytes()
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()


class TelegramMiniAppAssetRoutingTest(unittest.TestCase):
    def test_no_slash_route_resolves_exact_accepted_bundle(self):
        vercel = json.loads((ROOT / "vercel.json").read_text())
        receipt = json.loads((ROOT / "telegram-release-identity.json").read_text())
        rewrites = {row["source"]: row["destination"] for row in vercel["rewrites"]}

        self.assertEqual(receipt["route"], "/telegram")
        self.assertEqual(rewrites["/telegram"], "/telegram/index.html")
        self.assertEqual(rewrites["/telegram/"], "/telegram/index.html")

        aliases = receipt["browser_asset_aliases"]
        self.assertEqual(aliases["/styles.css"], "/telegram/styles.css")
        self.assertEqual(aliases["/app.js"], "/telegram/app.js")
        self.assertEqual(aliases["/feature-registry.js"], "/telegram/feature-registry.js")
        for request_path, destination in aliases.items():
            self.assertEqual(rewrites[request_path], destination)

        html = (ROOT / "telegram/index.html").read_text()
        self.assertIn('href="./styles.css"', html)
        self.assertIn('src="./app.js"', html)
        app = (ROOT / "telegram/app.js").read_text()
        self.assertIn("from './feature-registry.js'", app)

        for path, expected_sha in receipt["active_git_blobs"].items():
            self.assertEqual(git_blob(ROOT / path), expected_sha)

        self.assertFalse(receipt["owner_8080_exposed"])
        self.assertFalse(receipt["owner_8087_exposed"])
        self.assertFalse(receipt["raw_credentials_in_browser_bundle"])
        self.assertFalse(receipt["financial_effect"])
        self.assertFalse(receipt["signing"])
        self.assertFalse(receipt["mainnet"])
        self.assertFalse(receipt["mint"])
        self.assertFalse(receipt["payment"])


if __name__ == "__main__":
    unittest.main()
