// Vendors a PINNED schema.org vocabulary for scripts/structured-data.mjs, so
// the structured-data check never touches the network in CI (2026-11-24).
//
// Usage:  node scripts/vendor/vendor-schemaorg.mjs
//           → downloads release VERSION, checks its sha256, writes
//             scripts/vendor/schemaorg-<VERSION>.trimmed.json
//         node scripts/vendor/vendor-schemaorg.mjs --from <file>
//           → the same, from a copy already on disk (sha256 still checked)
//
// Why a TRIMMED copy: the full schemaorg-all-https.jsonld is 1.5 MB, and the
// laptop's pre-push redaction hook cannot scan a file over 1 MB (fleet
// README, "Build output from the laptop"). @adobe/structured-data-validator's
// schema.org pass (src/types/schemaOrg.js, v1.7.1) reads exactly four fields
// from exactly two kinds of entity: `@id`, `@type`, `rdfs:subClassOf` and
// `schema:domainIncludes`, on entities whose `@type` is the string
// 'rdfs:Class' or 'rdf:Property'. Everything else (labels, comments, enum
// members, ranges) is never read. The trim keeps those four fields on those
// entities, verbatim, so the validator sees the same class tree and the same
// property domains. Checked 2026-11-24: the probe over public/ gave the same
// 187 issues with the full file and with the trimmed one.
//
// To move to a newer release: change VERSION and SHA256 (read the sha from the
// file you download, after reading its release notes), run this, then run
// `node scripts/structured-data.mjs --write-baseline` and review the diff.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const VERSION = '30.1'; // released 2026-09-16 (schemaorg/schemaorg versions.json)
const SHA256 = '07e7c663dbc12a0937581745e59a98ed12b8698f38e8e3b03650287d9df88ae5';
const URL = `https://raw.githubusercontent.com/schemaorg/schemaorg/main/data/releases/${VERSION}/schemaorg-all-https.jsonld`;
const KEEP_TYPES = new Set(['rdfs:Class', 'rdf:Property']);
const KEEP_FIELDS = ['@id', '@type', 'rdfs:subClassOf', 'schema:domainIncludes'];

export const OUT = path.join(import.meta.dirname, `schemaorg-${VERSION}.trimmed.json`);

export function trim(full) {
  const graph = full['@graph']
    .filter(e => typeof e['@type'] === 'string' && KEEP_TYPES.has(e['@type']))
    .map(e => Object.fromEntries(KEEP_FIELDS.filter(k => k in e).map(k => [k, e[k]])))
    .sort((a, b) => (a['@id'] < b['@id'] ? -1 : a['@id'] > b['@id'] ? 1 : 0));
  return graph;
}

// One entity per line: small, stable diffs when the release moves.
export function serialise(graph) {
  const head = `{"_source":${JSON.stringify(URL)},"_version":${JSON.stringify(VERSION)},"_sha256_of_full_file":${JSON.stringify(SHA256)},"_trimmed":"only @id/@type/rdfs:subClassOf/schema:domainIncludes on rdfs:Class and rdf:Property entities — see scripts/vendor/vendor-schemaorg.mjs",\n"@graph":[\n`;
  return head + graph.map(e => JSON.stringify(e)).join(',\n') + '\n]}\n';
}

async function main() {
  const i = process.argv.indexOf('--from');
  const buf = i > 0
    ? fs.readFileSync(process.argv[i + 1])
    : Buffer.from(await (await fetch(URL)).arrayBuffer());
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  if (sha !== SHA256) {
    console.error(`sha256 mismatch for schema.org ${VERSION}: got ${sha}, pinned ${SHA256}`);
    process.exit(1);
  }
  const graph = trim(JSON.parse(buf.toString('utf8')));
  fs.writeFileSync(OUT, serialise(graph));
  console.log(`wrote ${path.relative(process.cwd(), OUT)}: ${graph.length} entities, ${fs.statSync(OUT).size} bytes`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
