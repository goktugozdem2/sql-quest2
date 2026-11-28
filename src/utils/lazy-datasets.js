// The five sector datasets, loaded on demand (flag `lazySectorData`,
// 2026-11-24).
//
// Why: public/data.js is ~658 KB gzipped and every /app visit loads it. The
// five sector datasets are ~366 KB of that (gzip of the source files), and
// only a sector challenge, the Revolut set and mock (finans_neobank), the
// Capital One mock and the trap pages' mock links (finans_fraud), the
// first-run sector preview and a ticket on one of them ever read them.
// Mobile first-solve was 3.2% against desktop 20.1% (AN, 11-24).
//
// The shape is chosen AT BUILD TIME from the flag (scripts/bundle-data.js):
//   off — data.js is byte-for-byte what it was; no manifest; nothing here
//         ever loads anything (every dataset is already present).
//   on  — data.js leaves the five out and carries `window.LAZY_DATASETS`
//         { key: { src, tables } }; each file is public/data/<file>?v=<hash>.
// The runtime keys on the manifest, never on the flag: a URL override cannot
// change which bytes data.js holds.
//
// Pure half: no window, no DOM unless handed one. app.jsx wraps it; the
// guards are tests/lazy-datasets.test.js.

// dataset key → source file in src/data/ (and the lazy file's name in
// public/data/). The build reads this; so does the source guard.
export const LAZY_DATASET_FILES = {
  finans_banking: 'finans-data.js',
  finans_fraud: 'finans-fraud-data.js',
  finans_neobank: 'neobank-data.js',
  gayrimenkul_nyc: 'gayrimenkul-data.js',
  uretim_industrial: 'uretim-data.js',
};

// Where the lazy files are served from.
export const LAZY_DATASET_DIR = 'data';

// The loader. `manifest` is window.LAZY_DATASETS (or null), `getDatasets()`
// returns the live window.publicDatasetsData object, `loadScript(src)`
// returns a promise that settles when the script ran or failed,
// `onLoaded(key)` runs once per dataset that arrived (the app converts its
// icon there).
//
// ensureDataset(key):
//   - present already (or not lazy at all) → resolves at once, loads nothing;
//   - in flight → the SAME promise (once-only: one <script> per dataset);
//   - the script ran but did not register the dataset, or failed → rejects,
//     and the next call tries again (a failure is never cached).
export function createDatasetLoader({ manifest, getDatasets, loadScript, onLoaded } = {}) {
  const inflight = new Map();
  const isLazy = (key) => !!(manifest && key && Object.prototype.hasOwnProperty.call(manifest, key));
  const isPresent = (key) => {
    const all = getDatasets ? getDatasets() : null;
    return !!(all && key && all[key]);
  };
  const needsLoad = (key) => isLazy(key) && !isPresent(key);

  function ensureDataset(key) {
    if (!needsLoad(key)) return Promise.resolve(key);
    if (inflight.has(key)) return inflight.get(key);
    const promise = Promise.resolve()
      .then(() => loadScript(manifest[key].src))
      .then(() => {
        if (!isPresent(key)) throw new Error(`Dataset ${key} did not load`);
        if (onLoaded) onLoaded(key);
        inflight.delete(key);
        return key;
      }, (err) => {
        throw err instanceof Error ? err : new Error(`Dataset ${key} failed to load`);
      })
      .catch((err) => {
        inflight.delete(key);
        throw err;
      });
    inflight.set(key, promise);
    return promise;
  }

  function ensureDatasets(keys) {
    const unique = [...new Set((keys || []).filter(Boolean))];
    return Promise.all(unique.map(ensureDataset));
  }

  return {
    ensureDataset,
    ensureDatasets,
    isLazy,
    needsLoad,
    inFlight: () => [...inflight.keys()],
  };
}

// The lazy dataset keys a challenge (or mock question, or ticket — anything
// with `dataset` and optional `tables`) needs that are not present yet: its
// own dataset, plus a lazy dataset that is the only provider of a listed
// table. Mirrors challengeTablePlan's rule (src/utils/challenge-datasets.js)
// without needing the absent data: the manifest carries each lazy dataset's
// table names.
export function missingLazyKeys(item, datasets, manifest) {
  if (!item || !manifest) return [];
  const out = [];
  const own = item.dataset;
  const present = (key) => !!(datasets && datasets[key]);
  const lazyMissing = (key) => !!(manifest[key]) && !present(key);
  if (own && lazyMissing(own)) out.push(own);
  const hasTable = (key, table) => {
    if (present(key)) return !!(datasets[key].tables && Object.prototype.hasOwnProperty.call(datasets[key].tables, table));
    return !!(manifest[key] && (manifest[key].tables || []).includes(table));
  };
  // Registry order, as challengeTablePlan walks it: the present datasets in
  // their key order, then the lazy ones in manifest order. A table the own
  // dataset has is never borrowed.
  const keys = [...Object.keys(datasets || {}), ...Object.keys(manifest).filter(k => !present(k))];
  for (const table of (item.tables || [])) {
    if (own && hasTable(own, table)) continue;
    const provider = keys.find(k => k !== own && hasTable(k, table));
    if (provider && lazyMissing(provider) && !out.includes(provider)) out.push(provider);
  }
  return out;
}

// The DOM half of loadScript: one <script> tag, resolved on load, rejected
// on error. A failed tag is removed so a retry injects a fresh one.
export function injectScript(doc, src) {
  return new Promise((resolve, reject) => {
    const el = doc.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve(src);
    el.onerror = () => {
      try { el.remove(); } catch (_) { /* ignore */ }
      reject(new Error(`Could not load ${src}`));
    };
    doc.head.appendChild(el);
  });
}
