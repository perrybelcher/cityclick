import fs from 'node:fs';
import path from 'node:path';

export function runQA(): boolean {
  console.log("=== Running CityClick Build & Deterministic QA Gate ===");

  const distDir = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    console.error("FAIL: dist directory does not exist! Run npm run build first.");
    return false;
  }

  const requiredStaticPages = [
    'index.html',
    'tx/austin/index.html',
    'fl/tampa/index.html',
    'id/boise/index.html',
    'tools/lease-calculator/index.html',
    'developers/index.html',
  ];

  let errors = 0;

  // 1. Verify required pages exist
  for (const p of requiredStaticPages) {
    const fullPath = path.join(distDir, p);
    if (!fs.existsSync(fullPath)) {
      console.error(`FAIL: Missing static page: ${p}`);
      errors++;
      continue;
    }

    const html = fs.readFileSync(fullPath, 'utf-8');

    // 2. Validate essential SEO & structural tags
    if (!html.includes('<!doctype html>') && !html.includes('<!DOCTYPE html>')) {
      console.error(`FAIL: ${p} missing <!doctype html>`);
      errors++;
    }
    if (!html.includes('<title>')) {
      console.error(`FAIL: ${p} missing <title> tag`);
      errors++;
    }
    if (!html.includes('name="description"')) {
      console.error(`FAIL: ${p} missing meta description`);
      errors++;
    }
    if (!html.includes('rel="canonical"')) {
      console.error(`FAIL: ${p} missing rel="canonical" link`);
      errors++;
    }

    // Specific page content checks
    if (p === 'tx/austin/index.html') {
      if (!html.includes('Austin, Texas')) {
        console.error("FAIL: Austin page missing headline 'Austin, Texas'");
        errors++;
      }
      if (!html.includes('Viability Score')) {
        console.error("FAIL: Austin page missing 'Viability Score'");
        errors++;
      }
      if (!html.includes('Coffee &amp; Snack Shops') && !html.includes('Coffee & Snack Shops')) {
        console.error("FAIL: Austin page missing Coffee & Snack Shops NAICS card");
        errors++;
      }
    }

    console.log(`✓ Verified ${p} (${(html.length / 1024).toFixed(1)} KB)`);
  }

  // 3. Verify Edge Worker entrypoint
  const workerPath = path.join(distDir, '_worker.js/index.js');
  if (!fs.existsSync(workerPath)) {
    console.error("FAIL: Edge Worker entrypoint missing at dist/_worker.js/index.js");
    errors++;
  } else {
    const workerSize = fs.statSync(workerPath).size;
    console.log(`✓ Verified Cloudflare Worker bundle (${(workerSize / 1024).toFixed(1)} KB)`);
  }

  if (errors === 0) {
    console.log("=================================================");
    console.log("✓ DETERMINISTIC QA GATE PASSED: ZERO DEFECTS FOUND");
    console.log("=================================================");
    return true;
  } else {
    console.error(`✗ DETERMINISTIC QA GATE FAILED: ${errors} errors found.`);
    return false;
  }
}

if (import.meta.url.endsWith(process.argv[1] ?? '')) {
  const ok = runQA();
  process.exit(ok ? 0 : 1);
}
