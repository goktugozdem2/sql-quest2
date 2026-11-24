// Ordered source data files that are concatenated into /data.js.
// Keep feature flags and config first so later files can read them.
export const dataFiles = [
  'feature-flags.js',
  'config.js',
  'datasets.js',
  'challenges.js',
  'challenge-companies.js',
  'exercises.js',
  'lessons.js',
  'daily-challenges-new.js',
  'mock-interviews.js',
  'thirty-day-challenge.js',
  'curriculum.js',
  'thirty-day-complete-1.js',
  'thirty-day-complete-2.js',
  'skill-tracks.js',
  'goals.js',
  'sectors.js',
  'sector-tags.js',
  'finans-data.js',
  'finans-fraud-data.js',
  'neobank-data.js',
  'gayrimenkul-data.js',
  'uretim-data.js',
  'sector-challenges.js',
  // After every bank file: appends the Debug items only when
  // features.debugQuestions is true (it reads the flag set above).
  'debug-challenges.js',
];

// The text of data.js, before minification. `read(file)` returns a source
// file's text or null when it is missing. With `lazyFiles` (a Set) and a
// `manifest`, those files are left out and the manifest is written once, in
// the place of the first of them (scripts/bundle-data.js, flag
// lazySectorData). Without them this is the bundle exactly as it was before
// the flag existed — tests/lazy-datasets.test.js pins that byte for byte.
export function combineDataFiles(read, { lazyFiles = null, manifest = null } = {}) {
  let combined = '// SQL Quest - Bundled Data Files\n';
  const included = [];
  const missing = [];
  let manifestWritten = false;
  for (const file of dataFiles) {
    if (lazyFiles && lazyFiles.has(file)) {
      if (!manifestWritten) {
        combined += `\n// === lazy-datasets manifest ===\n`;
        combined += `window.LAZY_DATASETS = ${JSON.stringify(manifest || {})};\n`;
        manifestWritten = true;
      }
      continue;
    }
    const text = read(file);
    if (text == null) { missing.push(file); continue; }
    combined += `\n// === ${file} ===\n`;
    combined += text;
    combined += '\n';
    included.push(file);
  }
  return { text: combined, included, missing };
}
