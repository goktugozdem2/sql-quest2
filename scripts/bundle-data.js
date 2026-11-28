// Bundle all data JS files into one file + minify
//
// Lazy sector data (flag `lazySectorData`, 2026-11-24): the five sector
// datasets in LAZY_DATASET_FILES are ALSO written, each on its own, to
// public/data/<file> — on every build, so size-limit always measures them and
// nothing references them while the flag is off. Which shape data.js takes is
// chosen here, at build time, from the flag in src/data/feature-flags.js
// (LAZY_SECTOR_DATA=on|off overrides it for a local measurement or walk):
//   off — data.js is exactly what it was before this flag existed (the same
//         files, the same order, the same bytes);
//   on  — data.js leaves the five out and carries window.LAZY_DATASETS, the
//         manifest src/utils/lazy-datasets.js loads them from on demand.
// Why build time and not a runtime switch: the flag lives INSIDE data.js, so
// the page cannot read it before choosing which data.js to fetch; a runtime
// switch would need a second copy of the flag in app.html. Flipping it is a
// rebuild, like every flag in feature-flags.js.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { combineDataFiles } from './data-files.js';
import { LAZY_DATASET_FILES, LAZY_DATASET_DIR } from '../src/utils/lazy-datasets.js';

const __dirname = import.meta.dirname;
const srcDir = path.join(__dirname, '..', 'src', 'data');
const publicDir = path.join(__dirname, '..', 'public');

function lazySectorDataOn() {
  const env = process.env.LAZY_SECTOR_DATA;
  if (env === 'on') return true;
  if (env === 'off') return false;
  const sandbox = { window: { location: { search: '' } }, console: { log() {} }, URLSearchParams };
  vm.runInNewContext(fs.readFileSync(path.join(srcDir, 'feature-flags.js'), 'utf8'), sandbox);
  return sandbox.window.FEATURE_FLAGS?.features?.lazySectorData === true;
}

function minify(file) {
  try {
    execSync(`npx terser ${file} -c -m -o ${file}`, { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

// 1. The five lazy files, always.
const lazyDir = path.join(publicDir, LAZY_DATASET_DIR);
fs.mkdirSync(lazyDir, { recursive: true });
const manifest = {};
for (const [key, file] of Object.entries(LAZY_DATASET_FILES)) {
  const source = fs.readFileSync(path.join(srcDir, file), 'utf8');
  const sandbox = { window: {}, console: { log() {} } };
  vm.runInNewContext(source, sandbox);
  const ds = sandbox.window.publicDatasetsData && sandbox.window.publicDatasetsData[key];
  if (!ds || !ds.tables) throw new Error(`${file} does not register publicDatasetsData.${key}`);
  const out = path.join(lazyDir, file);
  fs.writeFileSync(out, source);
  minify(out);
  const hash = crypto.createHash('md5').update(fs.readFileSync(out)).digest('hex').slice(0, 8);
  manifest[key] = { src: `/${LAZY_DATASET_DIR}/${file}?v=${hash}`, tables: Object.keys(ds.tables) };
  console.log(`  ✓ ${LAZY_DATASET_DIR}/${file} (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
}

// 2. data.js, in the shape the flag picks.
const lazy = lazySectorDataOn();
const { text: combined, included, missing } = combineDataFiles(
  (file) => {
    const filePath = path.join(srcDir, file);
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  },
  lazy ? { lazyFiles: new Set(Object.values(LAZY_DATASET_FILES)), manifest } : {},
);
included.forEach(file => console.log(`  ✓ ${file}`));
missing.forEach(file => console.warn(`  ✗ ${file} not found`));

// Write combined file
const outPath = path.join(publicDir, 'data.js');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, combined);

const sizeKB = (Buffer.byteLength(combined) / 1024).toFixed(1);
console.log(`\n  → data.js${lazy ? ' (lazySectorData: sector datasets on demand)' : ''}: ${sizeKB} KB`);

// Try to minify with terser
if (minify(outPath)) {
  const minSize = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`  → data.js minified: ${minSize} KB`);
} else {
  console.log('  → Minification skipped (terser not available)');
}
