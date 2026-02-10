// Bundle all data JS files into one file + minify
const fs = require('fs');
const path = require('path');

const dataFiles = [
  'config.js',
  'datasets.js',
  'challenges.js',
  'exercises.js',
  'lessons.js',
  'daily-challenges.js',
  'mock-interviews.js',
  'thirty-day-challenge.js',
  'curriculum.js',
  'thirty-day-complete-1.js',
  'thirty-day-complete-2.js',
];

let combined = '// SQL Quest - Bundled Data Files\n';
for (const file of dataFiles) {
  const filePath = path.join(__dirname, '..', 'src', 'data', file);
  if (fs.existsSync(filePath)) {
    combined += `\n// === ${file} ===\n`;
    combined += fs.readFileSync(filePath, 'utf8');
    combined += '\n';
    console.log(`  ✓ ${file}`);
  } else {
    console.warn(`  ✗ ${file} not found`);
  }
}

// Write combined file
const outPath = path.join(__dirname, '..', 'public', 'data.js');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, combined);

const sizeKB = (Buffer.byteLength(combined) / 1024).toFixed(1);
console.log(`\n  → data.js: ${sizeKB} KB`);

// Try to minify with terser
try {
  const { execSync } = require('child_process');
  execSync(`npx terser ${outPath} -c -m -o ${outPath}`, { stdio: 'pipe' });
  const minSize = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`  → data.js minified: ${minSize} KB`);
} catch (e) {
  console.log('  → Minification skipped (terser not available)');
}
