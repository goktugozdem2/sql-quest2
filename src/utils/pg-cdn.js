// PGlite for PostgreSQL mode — the exact files, from jsDelivr, with
// Subresource Integrity (2026-11-22 spike).
//
// CLAUDE.md's CDN rule: an exact version at least two weeks old, a sha384 on
// every file. PGlite is not on cdnjs; jsDelivr serves the npm tarball's
// bytes, so each hash is the npm file's (openssl dgst -sha384 -binary <file>
// | openssl base64 -A over node_modules/@electric-sql/pglite/dist/<file>).
// 0.5.15 was published 2026-11-03; 0.5.16 (11-09) and 0.5.17 (11-19) were
// under two weeks old on 11-22. tests/postgres-mode.test.js recomputes every
// hash from the installed devDependency, which is pinned to the same version.
//
// Why index.cjs and not the ESM entry: the ESM build is ten chunks that
// import each other, and a dynamic import() cannot carry a hash for each.
// index.cjs is one file: fetched with `integrity`, evaluated, and it is
// handed the three binaries below (each fetched with its own hash) instead
// of fetching anything itself.
export const PGLITE_VERSION = '0.5.15';
export const PGLITE_BASE = `https://cdn.jsdelivr.net/npm/@electric-sql/pglite@${PGLITE_VERSION}/dist/`;
export const PGLITE_FILES = {
  js: { path: 'index.cjs', sha384: 'sha384-rFbi8Aa999CrzrxbcunJGSbMHr1GHDxlQw7BOuVUADF+WpDXtPX/TeSKUb29oam3', bytes: 521653, gzip: 144269 },
  wasm: { path: 'pglite.wasm', sha384: 'sha384-Ag/+X1MhzkscgOXvBjghhOI2fwTPV6NSHtYanyztK2Ap8DwpnufmIHQRYZLm5ldx', bytes: 9086480, gzip: 3245952 },
  initdb: { path: 'initdb.wasm', sha384: 'sha384-pE0WXio9o38OJarfHtMEnPe+DDil9I2iucSGJlcULaLA1ehgS+whwmxwi5dVZN38', bytes: 298788, gzip: 128991 },
  data: { path: 'pglite.data', sha384: 'sha384-E5I5XyxT+6FROf0Jltz5bNi07pvslvubzGyMlS0nn+sDwoZEoPRGC85YhlR61/Mt', bytes: 6242272, gzip: 1860995 },
};

// The engine bundle's URL ('/pg-mode.js', built by vite.pg-mode.config.js
// from src/pg-mode/entry.js) is NOT exported from here: app.jsx must import
// none of the engine (tests/postgres-mode.test.js), so its one string literal
// in loadPgBundle is the single source, pinned by that test.
