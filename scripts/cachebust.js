// Append content-hash query strings to app.js and data.js in app.html
// so browsers always fetch the latest version after a deploy.
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

const publicDir = path.join(import.meta.dirname, '..', 'public');

function fileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
}

const appHash = fileHash(path.join(publicDir, 'app.js'));
const dataHash = fileHash(path.join(publicDir, 'data.js'));
const cssHash = fileHash(path.join(publicDir, 'styles.css'));

const htmlFile = path.join(publicDir, 'app.html');
let html = fs.readFileSync(htmlFile, 'utf8');

// Replace script/link references with cache-busted versions
html = html.replace(/src="app\.js(\?v=[a-f0-9]+)?"/g, `src="app.js?v=${appHash}"`);
html = html.replace(/src="data\.js(\?v=[a-f0-9]+)?"/g, `src="data.js?v=${dataHash}"`);
html = html.replace(/href="styles\.css(\?v=[a-f0-9]+)?"/g, `href="styles.css?v=${cssHash}"`);

fs.writeFileSync(htmlFile, html);
console.log(`  ✓ Cache bust: app.js?v=${appHash} data.js?v=${dataHash} styles.css?v=${cssHash}`);
