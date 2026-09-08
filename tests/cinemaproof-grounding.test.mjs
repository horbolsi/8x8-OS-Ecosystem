import test from "node:test";
import assert from "node:assert/strict";
import {
  authority,
  canonicalizeUrl,
  compact,
  stableId,
  postMcp,
} from "../api/cinemaproof-grounding.js";

const retrievedAt = "2026-09-08T16:20:00.000Z";

function result(rows) {
  return {
    result: {
      content: [{ type: "text", text: JSON.stringify({ results: rows }) }],
    },
  };
}

test("canonical URL removes fragments and tracking parameters deterministically", () => {
  const first = canonicalizeUrl("HTTPS://Example.COM/path/?utm_source=x&b=2&a=1#section");
  const second = canonicalizeUrl("https://example.com/path?a=1&b=2");
  assert.equal(first, second);
  assert.equal(first, "https://example.com/path?a=1&b=2");
});

test("source IDs repeat across URL variants and use a 96-bit digest", () => {
  const first = canonicalizeUrl("https://example.com/report/?utm_medium=email");
  const second = canonicalizeUrl("https://EXAMPLE.com/report");
  assert.equal(stableId("src", first), stableId("src", second));
  assert.match(stableId("src", first), /^src-[0-9a-f]{24}$/);
});

test("authority classes are explicit", () => {
  assert.equal(authority("https://agency.gov/rule").class, "GOVERNMENT");
  assert.equal(authority("https://school.edu/paper").class, "ACADEMIC");
  assert.equal(authority("https://www.bbc.com/news").class, "ESTABLISHED_MEDIA");
  assert.equal(authority("https://vendor.example/report").class, "COMMERCIAL_OR_OTHER");
  assert.equal(authority("not a url").class, "UNKNOWN");
});

test("compact applies declared authority order", () => {
  const evidence = compact(
    result([
      { title: "Vendor", url: "https://vendor.example/report" },
      { title: "BBC", url: "https://bbc.com/story" },
      { title: "University", url: "https://film.edu/safety" },
      { title: "Agency", url: "https://agency.gov/guidance" },
    ]),
    retrievedAt,
  );
  assert.equal(evidence.authorityRankingApplied, true);
  assert.deepEqual(
    evidence.sources.map((source) => source.authorityClass),
    ["GOVERNMENT", "ACADEMIC", "ESTABLISHED_MEDIA", "COMMERCIAL_OR_OTHER"],
  );
});

test("compact distinguishes empty, undated, and dated evidence", () => {
  const empty = compact(result([]), retrievedAt);
  assert.equal(empty.usabilityState, "NO_USABLE_EVIDENCE");
  assert.equal(empty.freshnessState, "UNAVAILABLE");

  const undated = compact(
    result([{ title: "Agency", url: "https://agency.gov/guidance" }]),
    retrievedAt,
  );
  assert.equal(undated.usabilityState, "PARTIAL_UNDATED_EVIDENCE");

  const dated = compact(
    result([
      {
        title: "Agency",
        url: "https://agency.gov/guidance",
        published_at: "2026-09-01",
      },
    ]),
    retrievedAt,
  );
  assert.equal(dated.usabilityState, "USABLE_DATED_EVIDENCE");
});

test("postMcp exposes bounded timeout as AbortError", async () => {
  const fetchImpl = (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    });
  await assert.rejects(
    postMcp({}, null, { fetchImpl, timeoutMs: 5 }),
    (error) => error.name === "AbortError",
  );
});

test("postMcp preserves non-timeout upstream HTTP failure", async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 503,
    headers: { get: () => null },
    text: async () => JSON.stringify({ error: "unavailable" }),
  });
  const response = await postMcp({}, null, { fetchImpl, timeoutMs: 50 });
  assert.equal(response.ok, false);
  assert.equal(response.status, 503);
  assert.deepEqual(response.json, { error: "unavailable" });
});
