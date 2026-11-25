// Element tree → PNG, with satori + resvg directly (2026-11-25).
//
// WHY NOT @vercel/og ANY MORE
// ---------------------------
// The satori security fix (Dependabot alert 42: improper escaping, fixed in
// satori 0.33.5) only ships in @vercel/og 1.0.x, and @vercel/og 1.0.3's Node
// build cannot be imported from an ES module: it bundles harfbuzzjs's
// Emscripten loader, which calls `require("fs")` and reads `__dirname`, and
// neither exists in ESM. Every import throws `Dynamic require of "fs" is not
// supported` (upstream: vercel/satori#971, open). This repo is
// `"type": "module"`, so the og-card function would have 302'd to the static
// card on every request.
//
// @vercel/og's Node path was only ever: satori(element) → SVG → resvg-wasm
// (fitTo width) → PNG. This file is that path, with the same satori (0.33.5)
// and resvg-wasm (2.4.1) versions @vercel/og 1.0.3 pins. Imported directly,
// satori loads harfbuzzjs as a normal CommonJS dependency, where `require`
// and `__dirname` exist and hb.wasm sits next to it.
//
// The leading underscore keeps Vercel from deploying this file as its own
// function.
//
// `loadAdditionalAsset` is satori's hook for a glyph the given fonts lack.
// `loadFallbackAsset` is @vercel/og's default for it, kept for the profile
// card (a display_name is free text): an emoji is drawn from twemoji, any
// other script from a Noto Sans subset on Google Fonts. Without a hook,
// satori draws nothing for such a glyph and fetches nothing.
import fs from 'fs';
import { createRequire } from 'module';
import satori from 'satori';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

const require = createRequire(import.meta.url);

let resvgReady = null;
function initResvg() {
  if (!resvgReady) {
    resvgReady = initWasm(fs.readFileSync(require.resolve('@resvg/resvg-wasm/index_bg.wasm')));
  }
  return resvgReady;
}

// @vercel/og's script → Noto family map, for the dynamic fallback.
const NOTO = {
  'ja-JP': 'Noto+Sans+JP', 'ko-KR': 'Noto+Sans+KR', 'zh-CN': 'Noto+Sans+SC',
  'zh-TW': 'Noto+Sans+TC', 'zh-HK': 'Noto+Sans+HK', 'th-TH': 'Noto+Sans+Thai',
  'bn-IN': 'Noto+Sans+Bengali', 'ar-AR': 'Noto+Sans+Arabic', 'ta-IN': 'Noto+Sans+Tamil',
  'ml-IN': 'Noto+Sans+Malayalam', 'he-IL': 'Noto+Sans+Hebrew', 'te-IN': 'Noto+Sans+Telugu',
  devanagari: 'Noto+Sans+Devanagari', kannada: 'Noto+Sans+Kannada', math: 'Noto+Sans+Math',
  unknown: 'Noto+Sans',
};

function emojiCode(chars) {
  const s = chars.includes('\u200d') ? chars : chars.replace(/\ufe0f/g, '');
  return [...s].map((c) => c.codePointAt(0).toString(16)).join('-');
}

async function googleFont(family, text) {
  const css = await (await fetch(
    `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`,
    // An old Safari UA makes Google answer with TTF, which satori can read.
    { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1' } }
  )).text();
  const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
  if (!src) throw new Error('no TTF in the Google Fonts answer');
  const r = await fetch(src[1]);
  if (!r.ok) throw new Error(`font download ${r.status}`);
  return r.arrayBuffer();
}

const assetCache = new Map();
export async function loadFallbackAsset(code, text) {
  const key = `${code}\n${text}`;
  if (assetCache.has(key)) return assetCache.get(key);
  let asset = [];
  try {
    if (code === 'emoji') {
      const r = await fetch(`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${emojiCode(text)}.svg`);
      asset = `data:image/svg+xml;base64,${Buffer.from(await r.text()).toString('base64')}`;
    } else {
      const codes = code.split('|').filter((c) => NOTO[c]);
      asset = await Promise.all(codes.map(async (c) => ({
        name: `satori_${c}_fallback_${text}`,
        data: await googleFont(NOTO[c], text),
        weight: 400,
        style: 'normal',
        lang: c === 'unknown' ? undefined : c,
      })));
    }
  } catch (e) {
    console.error('og fallback asset failed for', code, e.message);
  }
  assetCache.set(key, asset);
  return asset;
}

export async function renderPng(element, { width, height, fonts, loadAdditionalAsset }) {
  const opts = { width, height, fonts };
  if (loadAdditionalAsset) opts.loadAdditionalAsset = loadAdditionalAsset;
  const [svg] = await Promise.all([satori(element, opts), initResvg()]);
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  const rendered = resvg.render();
  const png = Buffer.from(rendered.asPng());
  rendered.free();
  resvg.free();
  return png;
}
