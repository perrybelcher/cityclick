// Run after npm run build. Browser-only dependencies live in the ignored local
// .qa-tools folder; see REPORT_austin.md for reproducible setup/preview commands.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from '../.qa-tools/node_modules/playwright/index.mjs';

const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4387';
const out = path.resolve('qa-artifacts');
fs.mkdirSync(out, { recursive: true });
const c = JSON.parse(fs.readFileSync('src/data/cities/tx.json', 'utf8')).find(c => c.slug === 'tx/austin');
const get = p => p.split('.').reduce((v, k) => v?.[k], c);
const num = n => n.toLocaleString('en-US', { maximumFractionDigits: 3 });
const format = (n, f) => f === 'text' ? n : f === 'money' ? '$' + num(n) : f === 'percent' ? n.toFixed(2) + '%' : f === 'fraction-percent' ? (n * 100).toFixed(2) + '%' : f === 'temperature' ? num(n) + '°F' : f === 'inches' ? num(n) + ' in' : num(n);
const sourceFor = p => p.startsWith('industries.') ? `industries.${p.split('.')[1]}.provenance` : p.startsWith('demographics.') ? 'demographics.provenance' : p.startsWith('housingAndTaxes.') ? 'housingAndTaxes.source' : p.startsWith('climateNormals.') ? 'climateNormals.sourceName' : p.startsWith('waterUtility.') ? 'waterUtility.source' : p.startsWith('permitsAndTax.') ? 'permitsAndTax.provenance' : p.startsWith('executiveTravel.emergency.') ? 'executiveTravel.emergency.source' : null;
const numericTokens = s => String(s).match(/\d[\d,]*(?:\.\d+)?/g) || [];
// Independent numeric inventory: explicit source-covered fields only. The raw
// record's unsourced airport/population/elevation are deliberately excluded.
const fields = [
  ...['medianHouseholdIncome','perCapitaIncome','medianAge'].map(k => `demographics.${k}`),
  ...['medianHomeValue','medianGrossRent','medianRealEstateTaxPaid','effectivePropertyTaxRatePct'].map(k => `housingAndTaxes.${k}`),
  ...['peakSummerHighF','winterLowF','annualRainfallInches'].map(k => `climateNormals.${k}`),
  ...['pwsid','populationServed'].map(k => `waterUtility.${k}`),
  'executiveTravel.emergency.hospitalAddress',
  ...c.industries.flatMap((_,i) => ['naicsCode','establishments','per10kResidents','usAvgPer10k'].map(k => `industries.${i}.${k}`)),
];
const inventory = new Map();
function inventoryAdd(text, field) { for (const token of numericTokens(text)) { const key = token.replaceAll(',', ''); if (!inventory.has(key)) inventory.set(key, new Set()); inventory.get(key).add(field); } }
for (const field of fields) { assert.ok(sourceFor(field) && get(sourceFor(field)), field); inventoryAdd(get(field), field); }
for (const field of ['stateTaxRate','localTaxRate','combinedSalesTaxRate']) inventoryAdd(format(get('permitsAndTax.'+field), 'fraction-percent'), 'permitsAndTax.'+field);
for (const field of ['demographics.provenance','housingAndTaxes.source','climateNormals.sourceName','waterUtility.source','waterUtility.retrieved','executiveTravel.emergency.source','permitsAndTax.provenance', ...c.industries.map((_,i) => `industries.${i}.provenance`)]) inventoryAdd(JSON.stringify(get(field)), field);
const routes = [
  { path: '/tx/austin/', title: 'Austin, TX: Moving and Business Guide', h1: 'Austin, Texas: a guide to your next move' },
  { path: '/tx/austin/business/', title: 'Starting a Business in Austin, TX', h1: 'Starting or expanding a business in Austin' },
  { path: '/tx/austin/moving-to/', title: 'Moving to Austin, TX: Housing and Taxes', h1: 'Moving to Austin, Texas' },
  { path: '/tx/austin/visit/', title: 'Austin, TX: Things to Do and Visitor Guide', h1: 'Visiting Austin, Texas' },
];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext();
await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
const page = await context.newPage();
const jsErrors = [];
const accessibility = [];
page.on('pageerror', error => jsErrors.push(error.message));
const descriptions = new Set();
const ledger = [];
try {
  for (const r of routes) {
    const response = await page.goto(base + r.path, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200, r.path);
    assert.equal(await page.title(), r.title);
    assert.ok(r.title.length < 60);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('h1').innerText(), r.h1);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://cityclick.com' + r.path);
    assert.equal(await page.locator('meta[name=robots]').getAttribute('content'), 'noindex, follow');
    assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'), 'https://cityclick.com/images/austin-skyline.jpg');
    const description = await page.locator('meta[name=description]').getAttribute('content');
    assert.ok(description && !descriptions.has(description)); descriptions.add(description);
    const values = await page.locator('[data-value-path]').evaluateAll(els => els.map(el => ({ path: el.dataset.valuePath, format: el.dataset.format, text: el.textContent.trim() })));
    for (const value of values) {
      assert.ok(get(sourceFor(value.path)), `Missing source for ${value.path}`);
      assert.equal(value.text, format(get(value.path), value.format), `${r.path}: ${value.path}`);
    }
    const fullText = await page.locator('body').evaluate(el => { const copy = el.cloneNode(true); copy.querySelectorAll('script,style').forEach(n => n.remove()); const walk = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT); const texts = []; while (walk.nextNode()) texts.push(walk.currentNode.textContent); return texts.join(' '); });
    for (const token of numericTokens(fullText)) assert.ok(inventory.has(token.replaceAll(',', '')), `Unbound rendered number ${token} on ${r.path}`);
    for (const bad of ['979,882', '8.5 miles', 'Austin-Bergstrom', 'Barton Springs', 'The Driskill', 'undefined', 'NaN', 'TBD', 'saturated', 'underserved']) assert.ok(!fullText.includes(bad), `Unsupported text: ${bad}`);
    const graph = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent())['@graph'];
    assert.ok(graph.some(g => g['@type'] === 'WebPage' && g.url === 'https://cityclick.com' + r.path));
    assert.ok(graph.some(g => g['@type'] === 'BreadcrumbList'));
    const faq = graph.find(g => g['@type'] === 'FAQPage');
    const answers = await page.locator('[data-answer]').allTextContents();
    assert.deepEqual(faq.mainEntity.map(e => e.acceptedAnswer.text), answers);
    const sources = await page.locator('[data-source-path]').evaluateAll(els => els.map(el => el.dataset.sourcePath));
    for (const source of sources) assert.ok(get(source), source);
    const links = await page.locator('a[href]').evaluateAll(els => els.map(el => el.getAttribute('href')));
    for (const sibling of routes) assert.ok(links.includes(sibling.path));
    for (const href of new Set(links.filter(h => h.startsWith('/')))) {
      assert.ok(href.endsWith('/'), href);
      const response = await page.request.get(base + href, { maxRedirects: 0 });
      assert.equal(response.status(), 200, `Internal link: ${href}`);
    }
    for (const href of links.filter(h => h.startsWith('#'))) assert.equal(await page.locator(href).count(), 1, href);
    assert.ok(await page.locator('.hero-photo img').evaluate(img => img.complete && img.naturalWidth > 0));
    const ids = await page.locator('[id]').evaluateAll(els => els.map(el => el.id)); assert.equal(new Set(ids).size, ids.length);
    const name = r.path.split('/').filter(Boolean).slice(2).join('-') || 'overview';
    fs.writeFileSync(path.join(out, `${name}.txt`), fullText.replace(/\s+/g, ' ').trim().replace(/(.{1,110})(?:\s|$)/g, '$1\n') + '\n');
    for (const width of [360,390,1440]) {
      await page.setViewportSize({ width, height: 950 });
      const dimensions = await page.evaluate(() => ({ body: document.documentElement.scrollWidth, viewport: innerWidth }));
      assert.ok(dimensions.body <= dimensions.viewport, `Horizontal page overflow: ${r.path} @ ${width}`);
      await page.screenshot({ path: path.join(out, `${name}-${width}.png`), fullPage: true });
    }
    await page.addScriptTag({ path: '.qa-tools/node_modules/axe-core/axe.min.js' });
    const axe = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } }));
    accessibility.push({ route: r.path, violations: axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })) });
    assert.deepEqual(accessibility.at(-1).violations, [], `Accessibility: ${r.path}`);
    const html = fs.readFileSync(path.join('dist', r.path, 'index.html'));
    const row = { route: r.path, titleLength: r.title.length, descriptionLength: description.length, exactValuesChecked: values.length, numericTokensChecked: numericTokens(fullText).length, sourceNotes: sources.length, htmlGzipBytes: gzipSync(html).length };
    assert.ok(row.htmlGzipBytes < 80000); ledger.push(row);
    console.log('PASS page:', JSON.stringify(row));
  }
  await page.goto(base + '/tx/austin/business/');
  assert.ok(await page.locator('#lease-result').isHidden());
  for (const input of await page.locator('#lease-form input[type=number]').all()) assert.equal(await input.inputValue(), '');
  assert.equal(await page.locator('#confirm-tax').isChecked(), false);
  await page.getByRole('button', { name: 'Calculate my scenario' }).click();
  assert.ok(await page.locator('#lease-result').isHidden());
  const fixture = { area:'1200',rent:'24',nnn:'6',wage:'20',hours:'100',burden:'15',overhead:'1000',ticket:'20',cogs:'30',days:'26' };
  for (const [field,value] of Object.entries(fixture)) await page.locator(`#quote-${field}`).fill(value);
  await page.locator('#confirm-tax').check();
  await page.getByRole('button', { name: 'Calculate my scenario' }).click();
  assert.equal(await page.locator('#result-daily').innerText(), '42');
  assert.equal(await page.locator('#result-fixed').innerText(), '$13,966.67');
  assert.equal(await page.locator('#result-revenue').innerText(), '$19,952.38');
  await page.locator('#quote-rent').fill('36'); assert.ok(await page.locator('#lease-result').isHidden());
  await page.getByRole('button', { name: 'Calculate my scenario' }).click();
  assert.equal(await page.locator('#result-daily').innerText(), '46');
  await page.locator('#quote-cogs').fill('100'); assert.ok(await page.locator('#lease-result').isHidden());
  await page.getByRole('button', { name: 'Calculate my scenario' }).click(); assert.ok(await page.locator('#lease-result').isHidden());
  await page.getByRole('button', { name: 'Clear all inputs' }).click();
  for (const input of await page.locator('#lease-form input[type=number]').all()) assert.equal(await input.inputValue(), '');
  console.log('PASS calculator: blank start, missing input, golden fixture, changed rent, invalid margin, reset; no stale outputs');
  for (const [alias, intent] of Object.entries({ business:'business',biz:'business',moving:'moving-to',live:'moving-to',visit:'visit',visiting:'visit',travel:'visit' })) {
    for (const suffix of [`?tab=${alias}&utm_source=test`, `#${alias}`]) {
      await page.goto(base + '/tx/austin/' + suffix);
      await page.waitForURL(url => url.pathname === `/tx/austin/${intent}/`);
      if (suffix.startsWith('?')) assert.equal(new URL(page.url()).searchParams.get('utm_source'), 'test');
    }
  }
  await page.goto(base + '/tx/austin/#key-facts'); assert.equal(new URL(page.url()).hash, '#key-facts');
  await page.goto(base + '/tx/austin/?tab=unknown'); assert.equal(new URL(page.url()).pathname, '/tx/austin/');
  console.log('PASS legacy migration: all query/hash aliases, tracking preservation, ordinary fragments and unknown tabs');
  assert.deepEqual(jsErrors, []);
  const noJS = await browser.newContext({ javaScriptEnabled:false });
  for (const r of routes) { const p = await noJS.newPage(); await p.goto(base + r.path); assert.equal(await p.locator('h1').innerText(),r.h1); assert.ok(await p.locator('[data-value-path]').count() > 0); await p.close(); }
  await noJS.close(); console.log('PASS JavaScript-off: factual content and navigation on all four routes');
  const sitemap = fs.readFileSync('dist/sitemap.xml','utf8');
  for (const r of routes) assert.ok(!sitemap.includes(`<loc>https://cityclick.com${r.path}</loc>`));
  console.log('PASS noindex/sitemap consistency');
  fs.writeFileSync(path.join(out,'austin-v2-results.json'), JSON.stringify({ status:'PASS', ledger, accessibility, browserErrors:jsErrors, numericInventory:Object.fromEntries([...inventory].map(([k,v])=>[k,[...v]])), screenshots:'360px, 390px and 1440px for each route; captured, not human-reviewed' },null,2));
  console.log('Austin V2 browser + source audit PASSED');
} finally { await browser.close(); }
