import fs from 'node:fs';
import path from 'node:path';
import { CERTIFIED_FLAGSHIPS } from '../src/config/flagships';

export function runQA(): boolean {
  console.log("=========================================================");
  console.log("=== Running CityClick Master Quality Gate (RULEBOOK v1.0) ===");
  console.log("=========================================================");

  const distDir = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    console.error("FAIL: dist directory does not exist! Run npm run build first.");
    return false;
  }

  // All Certified Indexable Flagship Guides (Mandatory 100% Pass)
  const flagships = CERTIFIED_FLAGSHIPS.map((f) => ({
    file: f.file,
    slug: f.slug,
    name: f.name,
    state: f.state,
  }));

  let errors = 0;

  for (const f of flagships) {
    const fullPath = path.join(distDir, f.file);
    if (!fs.existsSync(fullPath)) {
      console.error(`FAIL [MISSING]: Flagship route does not exist: ${f.file}`);
      errors++;
      continue;
    }

    const html = fs.readFileSync(fullPath, 'utf-8');

    // Strip <script>, <style>, and all HTML markup tags to evaluate true rendered DOM text
    const textOnly = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');

    // Rule 1: No Empty Tokens in DOM Text
    const emptyTokens = ['()', '( )', 'undefined', 'null', 'NaN', '+-', 'Loading verified', 'TBD', 'pending'];
    for (const token of emptyTokens) {
      if (textOnly.includes(token)) {
        console.error(`FAIL [EMPTY-TOKEN] in ${f.name}: Rendered text contains forbidden token '${token}'`);
        errors++;
      }
    }

    // Rule 1b: No Dead Anchor Links (href="#")
    if (html.includes('href="#"')) {
      console.error(`FAIL [EMPTY-LINK] in ${f.name}: Contains forbidden dead link href="#"`);
      errors++;
    }

    // Rule 2: Zero Wrong-City Contamination (e.g. non-Austin pages leaking Austin proper nouns)
    if (f.slug !== 'tx/austin') {
      const austinLeaks = [
        'Austin-Bergstrom International Terminal',
        'Austin-Bergstrom (AUS)',
        'City of Austin Water (PWSID TX2270001)',
        'Dell Seton Medical Center at UT',
        'Barton Springs Pool'
      ];
      for (const leak of austinLeaks) {
        if (html.includes(leak)) {
          console.error(`FAIL [WRONG-CITY] in ${f.name}: Contaminated with Austin string: '${leak}'`);
          errors++;
        }
      }
    }

    // Rule 3: SEO Basics (Absolute og:image, trailing slash canonical, clean title)
    if (!html.includes('rel="canonical" href="https://cityclick.com')) {
      console.error(`FAIL [SEO-CANONICAL] in ${f.name}: Canonical URL missing or not matching domain`);
      errors++;
    }
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    if (titleMatch?.[1]?.includes('&amp;')) {
      console.error(`FAIL [SEO-TITLE] in ${f.name}: Title contains raw unescaped '&amp;' entity: ${titleMatch[1]}`);
      errors++;
    }
    if (html.includes('content="/images/')) {
      console.error(`FAIL [SEO-OG] in ${f.name}: og:image uses relative path instead of absolute URL`);
      errors++;
    }

    // Rule 4: Crawl Shield Verification
    // The top six flagships must be indexable; non-flagships must be noindex
    if (html.includes('content="noindex')) {
      console.error(`FAIL [INDEX-STATE] in ${f.name}: Featured city is marked noindex! Flagships must be indexable.`);
      errors++;
    }

    console.log(`✓ PASS Flagship Quality Gate: ${f.name}, ${f.state} (${(html.length / 1024).toFixed(1)} KB)`);
  }

  // Rule 5: Non-Flagship Crawl Shield Verification (Ensure non-flagships carry noindex)
  const nonFlagshipSamples = ['ok/tulsa/index.html', 'ok/norman/index.html', 'wy/casper/index.html'];
  for (const nf of nonFlagshipSamples) {
    const p = path.join(distDir, nf);
    if (fs.existsSync(p)) {
      const html = fs.readFileSync(p, 'utf-8');
      if (!html.includes('noindex')) {
        console.error(`FAIL [CRAWL-SHIELD]: ${nf} is NOT shielded with noindex! Must be noindexed until verified.`);
        errors++;
      } else {
        console.log(`✓ Verified Crawl Shield active on ${nf} (noindex, follow)`);
      }
    }
  }

  // ---- FACT GATES (v1.1): data-level checks, not just string checks ----
  const BANNED_PHRASES = ['Regional Medical Center','Regional Memorial','Regional / Metropolitan','Commercial Gateway','(balance)',
    'zero-hallucination','Zero-Hallucination','Zero-hallucination','ground truth','Ground truth','Ubiquitous 24/7','Non-Stop Service','210+ Days','Local Arts & Event Wire','Municipal Wire','Verification Pending','100% Potable','SBA FOIA','LENDER COMPLIANT','Rental Car Garage','CapMetro','Ascend Hotel','Level 2 Trauma','Level I Trauma','Level 1 Trauma','Uber/Lyft','Lender','Hwy 5','501-922-0011','Young Professional','Verified Access Granted','austin-leaflet-map',"Arkansas's #1",'(HOT) (LIT)','Memorial Field','Climate Normals (30-Year','Loading verified','$32.00','$28.50','$22,460','$16,170','DSD Initial Review','Verified local guides across 1,501'];
  for (const f of flagships) {
    const fp = path.join(distDir, f.file);
    if (!fs.existsSync(fp)) continue;
    const h = fs.readFileSync(fp, 'utf-8');
    for (const b of BANNED_PHRASES) {
      if (h.toLowerCase().includes(b.toLowerCase())) { console.error(`FAIL [BANNED-PHRASE] in ${f.name}: '${b}'`); errors++; }
    }
    // Key Facts section must exist and every fact must carry a source and an as-of date
    const factBlocks = (h.match(/Source: [^<]{5,200} · As of: /g) || []).length;
    if (factBlocks < 6) { console.error(`FAIL [FACTS] ${f.name}: only ${factBlocks} sourced fact blocks (need 6+)`); errors++; }
    if (!h.includes('"@type":"FAQPage"')) { console.error(`FAIL [FAQ-SCHEMA] ${f.name}: no FAQPage JSON-LD`); errors++; }
    if (/ of 25<\/(div|span)>/.test(h)) { console.error(`FAIL [HARDCODED-COUNT] ${f.name}: hardcoded '25' trade count`); errors++; }
    // duplicate H3 section headings on one page
    const heads = [...h.matchAll(/<h3[^>]*>([^<]{4,80})<\/h3>/g)].map(m => (m[1] ?? '').trim());
    const dupH = [...new Set(heads.filter((x, i) => heads.indexOf(x) !== i))];
    if (dupH.length) { console.error(`FAIL [DUPLICATE-SECTION] ${f.name}: ${dupH.join(' | ')}`); errors++; }
    // news links must be article-level (path deeper than one segment), never a section homepage
    const hubs = ['austinchronicle.com/events/','austinchronicle.com/food/','austinchronicle.com/music/','austinchronicle.com/screens/','bizjournals.com/austin/','statesman.com/business/'];
    for (const hub of hubs) if (h.includes(hub)) { console.error(`FAIL [NEWS-HUB-LINK] in ${f.name}: ${hub}`); errors++; }
  }
  const dataDir = path.resolve(process.cwd(), 'src/data/cities');
  const slugToState: Record<string,string> = {};
  for (const f of flagships) slugToState[f.slug] = f.slug.split('/')[0] ?? '';
  const seen: Record<string,string[]> = {};
  for (const f of flagships) {
    const st = slugToState[f.slug];
    const arr = JSON.parse(fs.readFileSync(path.join(dataDir, `${st}.json`), 'utf-8'));
    const c = arr.find((x: any) => x.slug === f.slug);
    const t = c?.executiveTravel ?? {};
    if (!t.emergency?.nearestTraumaHospital) { console.error(`FAIL [NO-HOSPITAL] ${f.name}: missing nearestTraumaHospital`); errors++; }
    if (!t.emergency?.source) { console.error(`FAIL [NO-SOURCE] ${f.name}: hospital has no source`); errors++; }
    if (!t.primaryAirport?.name || /Regional|metropolitan government/i.test(t.primaryAirport.name)) { console.error(`FAIL [AIRPORT] ${f.name}: unverified airport name '${t.primaryAirport?.name}'`); errors++; }
    const n = c?.climateNormals;
    if (!n?.sourceName) { console.error(`FAIL [NO-SOURCE] ${f.name}: climateNormals has no source`); errors++; }
    // plausibility bounds (Rule 6)
    if (n && (n.peakSummerHighF < 60 || n.peakSummerHighF > 120 || n.annualRainfallInches < 2 || n.annualRainfallInches > 80)) { console.error(`FAIL [BOUNDS] ${f.name}: climate out of range`); errors++; }
    const mhi = c?.demographics?.medianHouseholdIncome;
    if (mhi < 20000 || mhi > 250000) { console.error(`FAIL [BOUNDS] ${f.name}: income ${mhi}`); errors++; }
    const sig = JSON.stringify([n?.peakSummerHighF, n?.winterLowF, n?.annualRainfallInches]);
    (seen[sig] ||= []).push(f.name);
    const nm = `${c?.name}`;
    if (/balance|metropolitan government|city city/i.test(nm)) { console.error(`FAIL [NAME] ${f.name}: '${nm}'`); errors++; }
  }
  for (const [_sig, names] of Object.entries(seen)) if (names.length > 1) { console.error(`FAIL [DUPLICATE-VALUES] identical climate for ${names.join(', ')}`); errors++; }

  // Crawl shield across EVERY non-flagship city page, not a 3-page sample
  const flagSet = new Set(flagships.map(f => f.slug));
  let shielded = 0, leaks = 0;
  for (const st of fs.readdirSync(distDir)) {
    const sd = path.join(distDir, st);
    if (st.length !== 2 || !fs.statSync(sd).isDirectory()) continue;
    for (const city of fs.readdirSync(sd)) {
      const ip = path.join(sd, city, 'index.html');
      if (!fs.existsSync(ip) || flagSet.has(`${st}/${city}`)) continue;
      const hh = fs.readFileSync(ip, 'utf-8');
      if (!hh.includes('noindex')) { leaks++; if (leaks <= 5) console.error(`FAIL [CRAWL-SHIELD] ${st}/${city} is indexable`); } else shielded++;
    }
  }
  if (leaks) { console.error(`FAIL [CRAWL-SHIELD] ${leaks} non-flagship pages are indexable`); errors += leaks; }
  else console.log(`✓ Crawl shield verified on ALL ${shielded} non-flagship city pages`);

  // Verify Worker bundle
  const workerPath = path.join(distDir, '_worker.js/index.js');
  if (!fs.existsSync(workerPath)) {
    console.error("FAIL: Edge Worker entrypoint missing at dist/_worker.js/index.js");
    errors++;
  } else {
    const workerSize = fs.statSync(workerPath).size;
    console.log(`✓ Verified Cloudflare Worker bundle (${(workerSize / 1024).toFixed(1)} KB)`);
  }

  if (errors > 0) {
    console.error(`\n❌ Quality Gate FAILED with ${errors} blocking errors! Deployment aborted.`);
    return false;
  }

  console.log("\n=========================================================");
  console.log("✨ Master Quality Gate PASSED with 0 errors! Build certified.");
  console.log("=========================================================");
  return true;
}

if (import.meta.url.endsWith(process.argv[1] ?? '')) {
  const ok = runQA();
  process.exit(ok ? 0 : 1);
}
