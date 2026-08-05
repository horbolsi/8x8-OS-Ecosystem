import fs from 'node:fs';

const manifestPath = new URL('../public/visual-council/manifest.json', import.meta.url);
const pagePath = new URL('../public/visual-council/index.html', import.meta.url);
const cssPath = new URL('../public/visual-council/styles.css', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const html = fs.readFileSync(pagePath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(manifest.release_unit === 'visual-council-registry-v1', 'release unit drift');
assert(manifest.truth_state === 'VISION_ARTIFACTS_NOT_LIVE_TELEMETRY', 'truth boundary missing');
assert(manifest.scope_score?.earned === 100 && manifest.scope_score?.possible === 100, 'declared-scope score invalid');
assert(manifest.whole_system_score === 'NOT_INFERRED', 'whole-system completion must not be inferred');
assert(Array.isArray(manifest.canonical_images) && manifest.canonical_images.length === 4, 'exactly four public concept records required');

const ids = new Set();
const hashes = new Set();
for (const image of manifest.canonical_images) {
  assert(/^8X8-VIS-\d{4}$/.test(image.id), `invalid image id: ${image.id}`);
  assert(!ids.has(image.id), `duplicate image id: ${image.id}`);
  ids.add(image.id);
  assert(/^[a-f0-9]{64}$/.test(image.sha256), `invalid SHA-256: ${image.id}`);
  assert(!hashes.has(image.sha256), `duplicate binary digest: ${image.id}`);
  hashes.add(image.sha256);
  assert(Array.isArray(image.dimensions) && image.dimensions.length === 2, `dimensions missing: ${image.id}`);
  assert(image.benchmark_score >= 0 && image.benchmark_score <= 100, `benchmark range error: ${image.id}`);
  assert(image.public_provenance === 'OWNER_APPROVED_CONCEPT_RECORD', `unexpected public provenance: ${image.id}`);
  assert(image.binary_publication_state === 'NOT_PUBLISHED_IN_THIS_REPOSITORY', `binary publication state drift: ${image.id}`);
  assert(!('drive_id' in image), `private storage identifier found: ${image.id}`);
  assert(!('drive_url' in image), `private storage URL found: ${image.id}`);
  assert(!('authorship' in image), `private working attribution found: ${image.id}`);
}

assert(manifest.public_submission_contract?.status === 'PUBLIC_CONTRACT_DEFINED_NO_SUBMISSIONS_CLAIMED', 'submission truth state drift');
assert(html.includes('Whole-system completion: NOT INFERRED'), 'public truth marker missing');
assert(html.includes('/visual-council/manifest.json'), 'manifest link missing');
assert(css.includes('prefers-reduced-motion'), 'reduced motion support missing');
assert(css.includes('forced-colors'), 'forced-colors support missing');

const combined = `${html}\n${css}\n${JSON.stringify(manifest)}`;
for (const forbidden of [
  /drive\.google\.com/i,
  /canva\.com\/d\//i,
  /BEGIN (?:RSA|OPENSSH|EC) PRIVATE KEY/i,
  /authorization:\s*bearer/i,
  /localhost/i,
  /127\.0\.0\.1/,
  /navigator\.bluetooth/i,
  /getUserMedia/i,
  /ethereum\.request/i
]) assert(!forbidden.test(combined), `forbidden public capability found: ${forbidden}`);

console.log('visual-council-registry-v1: PASS (4 redacted concept records, unique SHA-256, explicit truth boundary)');
