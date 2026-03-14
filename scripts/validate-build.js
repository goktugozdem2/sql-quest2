import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const publicDir = join(import.meta.dirname, '..', 'public');

const requiredFiles = ['app.js', 'data.js', 'styles.css', 'index.html'];
const MAX_APP_JS_SIZE_KB = 800;

let hasErrors = false;

// Check required files exist
for (const file of requiredFiles) {
  const filePath = join(publicDir, file);
  if (!existsSync(filePath)) {
    console.error(`MISSING: ${file} not found in public/`);
    hasErrors = true;
  } else {
    const stats = readFileSync(filePath);
    const sizeKB = Math.round(stats.length / 1024);
    console.log(`  OK: ${file} (${sizeKB} KB)`);
  }
}

// Check app.js size
const appJsPath = join(publicDir, 'app.js');
if (existsSync(appJsPath)) {
  const content = readFileSync(appJsPath);
  const sizeKB = Math.round(content.length / 1024);
  if (sizeKB > MAX_APP_JS_SIZE_KB) {
    console.warn(`WARNING: app.js is ${sizeKB} KB (threshold: ${MAX_APP_JS_SIZE_KB} KB)`);
  }

  // Basic JS validity check - ensure it starts with valid JS
  const text = content.toString('utf-8');
  if (text.includes('SyntaxError') || text.includes('Unexpected token')) {
    console.error('ERROR: app.js may contain syntax errors');
    hasErrors = true;
  }
}

// Check data.js has content
const dataJsPath = join(publicDir, 'data.js');
if (existsSync(dataJsPath)) {
  const content = readFileSync(dataJsPath, 'utf-8');
  if (content.length < 100) {
    console.error('ERROR: data.js appears to be empty or incomplete');
    hasErrors = true;
  }
  // Check that key data variables are present
  const expectedVars = ['challengesData', 'dailyChallengesData'];
  for (const v of expectedVars) {
    if (!content.includes(v)) {
      console.warn(`WARNING: data.js missing expected variable: ${v}`);
    }
  }
}

if (hasErrors) {
  console.error('\nBuild validation FAILED');
  process.exit(1);
} else {
  console.log('\nBuild validation PASSED');
}
