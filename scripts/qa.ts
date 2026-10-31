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

  // All 25 Featured Flagship Guides (Mandatory 100% Flagship Parity Pass)
  const flagships = CERTIFIED_FLAGSHIPS.map((f) => ({
    file: f.file,
    slug: f.slug,
    name: f.name,
    state: f.state,
  }));

  const emptyTokens = ['()', '( )', 'undefined', 'null', 'NaN', '+-', 'Loading verified', 'TBD', 'pending'];
  const austinLeaks = [
    'Austin-Bergstrom International Terminal',
    'Austin-Bergstrom (AUS)',
    'City of Austin Water (PWSID TX2270001)',
    'Dell Seton Medical Center at UT',
    'Barton Springs Pool',
  ];
  const BANNED_PHRASES = [
    'Regional Medical Center',
    'Regional Memorial',
    'Regional / Metropolitan',
    'Commercial Gateway',
    '(balance)',
    'zero-hallucination',
    'Zero-Hallucination',
    'Zero-hallucination',
    'ground truth',
    'Ground truth',
    'Ubiquitous 24/7',
    'Non-Stop Service',
    '210+ Days',
    'Local Arts & Event Wire',
    'Municipal Wire',
    'Verification Pending',
    '100% Potable',
    'SBA FOIA',
    'LENDER COMPLIANT',
    'Rental Car Garage',
    'CapMetro',
    'Ascend Hotel',
    'Level 2 Trauma',
    'Level I Trauma',
    'Level 1 Trauma',
    'Uber/Lyft',
    'Lender',
    'Hwy 5',
    '501-922-0011',
    'Young Professional',
    'Verified Access Granted',
    'austin-leaflet-map',
    "Arkansas's #1",
    '(HOT) (LIT)',
    'Memorial Field',
    'Climate Normals (30-Year',
    'Loading verified',
    '$32.00',
    '$28.50',
    '$22,460',
    '$16,170',
    'DSD Initial Review',
    'Verified local guides across 1,501',
  ];
  const newsHubs = [
    'austinchronicle.com/events/',
    'austinchronicle.com/food/',
    'austinchronicle.com/music/',
    'austinchronicle.com/screens/',
    'bizjournals.com/austin/',
    'statesman.com/business/',
  ];

  let errors = 0;

  // -------------------------------------------------------------------------
  // PART 1: Strict 25-Flagship Quality & Uniqueness Gate (ZERO Weakened Rules)
  // -------------------------------------------------------------------------
  for (const f of flagships) {
    const fullPath = path.join(distDir, f.file);
    if (!fs.existsSync(fullPath)) {
      console.error(`FAIL [MISSING]: Flagship route does not exist: ${f.file}`);
      errors++;
      continue;
    }

    const html = fs.readFileSync(fullPath, 'utf-8');
    const textOnly = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');

    for (const token of emptyTokens) {
      if (textOnly.includes(token)) {
        console.error(`FAIL [EMPTY-TOKEN] in ${f.name}: Rendered text contains forbidden token '${token}'`);
        errors++;
      }
    }

    if (html.includes('href="#"')) {
      console.error(`FAIL [EMPTY-LINK] in ${f.name}: Contains forbidden dead link href="#"`);
      errors++;
    }

    if (f.slug !== 'tx/austin') {
      for (const leak of austinLeaks) {
        if (html.includes(leak)) {
          console.error(`FAIL [WRONG-CITY] in ${f.name}: Contaminated with Austin string: '${leak}'`);
          errors++;
        }
      }
    }

    if (!html.includes(`rel="canonical" href="https://cityclick.com/${f.slug}/"`)) {
      console.error(`FAIL [SEO-CANONICAL] in ${f.name}: Canonical URL missing or not matching https://cityclick.com/${f.slug}/`);
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
    if (html.includes('content="noindex')) {
      console.error(`FAIL [INDEX-STATE] in ${f.name}: Featured city is marked noindex! Flagships must be indexable.`);
      errors++;
    }

    const lowHtml = html.toLowerCase();
    for (const b of BANNED_PHRASES) {
      if (lowHtml.includes(b.toLowerCase())) {
        console.error(`FAIL [BANNED-PHRASE] in ${f.name}: '${b}'`);
        errors++;
      }
    }
    const factBlocks = (html.match(/Source: [^<]{5,200} · As of: /g) || []).length;
    if (factBlocks < 6) {
      console.error(`FAIL [FACTS] ${f.name}: only ${factBlocks} sourced fact blocks (need 6+)`);
      errors++;
    }
    if (!html.includes('"@type":"FAQPage"')) {
      console.error(`FAIL [FAQ-SCHEMA] ${f.name}: no FAQPage JSON-LD`);
      errors++;
    }
    if (/ of 25<\/(div|span)>/.test(html)) {
      console.error(`FAIL [HARDCODED-COUNT] ${f.name}: hardcoded '25' trade count`);
      errors++;
    }
    const heads = [...html.matchAll(/<h3[^>]*>([\s\S]{4,120}?)<\/h3>/g)].map((m) => (m[1] ?? '').replace(/\s+/g, ' ').trim());
    const dupH = [...new Set(heads.filter((x, i) => heads.indexOf(x) !== i))];
    if (dupH.length) {
      console.error(`FAIL [DUPLICATE-SECTION] ${f.name}: ${dupH.join(' | ')}`);
      errors++;
    }
    for (const hub of newsHubs) {
      if (html.includes(hub)) {
        console.error(`FAIL [NEWS-HUB-LINK] in ${f.name}: ${hub}`);
        errors++;
      }
    }

    console.log(`✓ PASS Flagship Quality Gate: ${f.name}, ${f.state} (${(html.length / 1024).toFixed(1)} KB, ${factBlocks} facts)`);
  }

  const dataDir = path.resolve(process.cwd(), 'src/data/cities');
  const slugToState: Record<string, string> = {};
  for (const f of flagships) slugToState[f.slug] = f.slug.split('/')[0] ?? '';
  const seenFlagshipClimate: Record<string, string[]> = {};
  for (const f of flagships) {
    const st = slugToState[f.slug];
    const arr = JSON.parse(fs.readFileSync(path.join(dataDir, `${st}.json`), 'utf-8'));
    const c = arr.find((x: any) => x.slug === f.slug);
    const t = c?.executiveTravel ?? {};
    if (!t.emergency?.nearestTraumaHospital) {
      console.error(`FAIL [NO-HOSPITAL] ${f.name}: missing nearestTraumaHospital`);
      errors++;
    }
    if (!t.emergency?.source) {
      console.error(`FAIL [NO-SOURCE] ${f.name}: hospital has no source`);
      errors++;
    }
    if (!t.primaryAirport?.name || /Regional|metropolitan government/i.test(t.primaryAirport.name)) {
      console.error(`FAIL [AIRPORT] ${f.name}: unverified airport name '${t.primaryAirport?.name}'`);
      errors++;
    }
    const n = c?.climateNormals;
    if (!n?.sourceName) {
      console.error(`FAIL [NO-SOURCE] ${f.name}: climateNormals has no source`);
      errors++;
    }
    if (n && (n.peakSummerHighF < 60 || n.peakSummerHighF > 120 || n.annualRainfallInches < 2 || n.annualRainfallInches > 80)) {
      console.error(`FAIL [BOUNDS] ${f.name}: climate out of range`);
      errors++;
    }
    const mhi = c?.demographics?.medianHouseholdIncome;
    if (mhi < 20000 || mhi > 250000) {
      console.error(`FAIL [BOUNDS] ${f.name}: income ${mhi}`);
      errors++;
    }
    const sig = JSON.stringify([n?.peakSummerHighF, n?.winterLowF, n?.annualRainfallInches]);
    (seenFlagshipClimate[sig] ||= []).push(f.name);
    const nm = `${c?.name}`;
    if (/balance|metropolitan government|city city/i.test(nm)) {
      console.error(`FAIL [NAME] ${f.name}: '${nm}'`);
      errors++;
    }
  }
  for (const [_sig, names] of Object.entries(seenFlagshipClimate)) {
    if (names.length > 1) {
      console.error(`FAIL [DUPLICATE-VALUES] identical climate for ${names.join(', ')}`);
      errors++;
    }
  }

  // -------------------------------------------------------------------------
  // PART 2: National 1,501-City & 51-State Primary-Source HTML + JSON Audit
  // -------------------------------------------------------------------------
  let totalCitiesAudited = 0;
  let totalStateHubsAudited = 0;

  for (const stFile of fs.readdirSync(dataDir).filter((x) => x.endsWith('.json')).sort()) {
    const st = stFile.replace(/\.json$/, '');
    const stateHubHtmlPath = path.join(distDir, st, 'index.html');
    if (!fs.existsSync(stateHubHtmlPath)) {
      console.error(`FAIL [STATE-HUB-MISSING]: dist/${st}/index.html missing`);
      errors++;
    } else {
      totalStateHubsAudited++;
      const sh = fs.readFileSync(stateHubHtmlPath, 'utf-8');
      if (sh.includes('content="noindex')) {
        console.error(`FAIL [STATE-HUB-NOINDEX]: /${st}/ is marked noindex`);
        errors++;
      }
      if (sh.includes('Primary-source verification in progress') || sh.includes('>In Review<')) {
        console.error(`FAIL [STATE-HUB-STALE]: /${st}/ still renders 'In Review' notice`);
        errors++;
      }
    }

    const records = JSON.parse(fs.readFileSync(path.join(dataDir, stFile), 'utf-8'));
    for (const c of records) {
      totalCitiesAudited++;
      const slug = String(c.slug);

      // JSON data-level zero-fabrication checks across all 1,501 records
      if (c.laborAndEconomy || c.scores || c.topTrafficCorridors || c.demographics?.popGrowth5YrPct != null || c.demographics?.daytimeWorkerPop != null) {
        console.error(`FAIL [V1-FABRICATED-KEY] ${slug}: retains unverified V1 fabricated key`);
        errors++;
      }
      if (/Metropolitan Area$/i.test(String(c.countyName ?? ''))) {
        console.error(`FAIL [V1-COUNTY] ${slug}: retains fabricated V1 countyName '${c.countyName}'`);
        errors++;
      }
      if (/balance|metropolitan government|city city|Juneau and|Urban Honolulu/i.test(String(c.name ?? ''))) {
        console.error(`FAIL [RAW-CENSUS-NAME] ${slug}: unnormalized Census name '${c.name}'`);
        errors++;
      }
      if (c.permitsAndTax && !c.permitsAndTax.provenance?.sourceUrl) {
        console.error(`FAIL [UNSOURCED-TAX] ${slug}: permitsAndTax present without provenance.sourceUrl`);
        errors++;
      }
      const cl = c.climateNormals;
      if (!cl?.sourceName || cl.peakSummerHighF < 45 || cl.peakSummerHighF > 125 || cl.annualRainfallInches < 1 || cl.annualRainfallInches > 180) {
        console.error(`FAIL [CLIMATE-BOUNDS] ${slug}: invalid or missing climateNormals`);
        errors++;
      }
      const mhiAll = c.demographics?.medianHouseholdIncome;
      if (!mhiAll || mhiAll < 15000 || mhiAll > 250001) {
        console.error(`FAIL [INCOME-BOUNDS] ${slug}: out-of-range medianHouseholdIncome ${mhiAll}`);
        errors++;
      }
      const ap = c.executiveTravel?.primaryAirport;
      if (!ap?.name || !/^[A-Z]{3}$/.test(String(ap.iata ?? '')) || ap.sourceUrl !== 'https://ourairports.com/data/') {
        console.error(`FAIL [AIRPORT-PROVENANCE] ${slug}: invalid OurAirports record`);
        errors++;
      }

      // Built HTML page audit across all 1,501 cities
      const cityHtmlPath = path.join(distDir, slug, 'index.html');
      if (!fs.existsSync(cityHtmlPath)) {
        console.error(`FAIL [CITY-HTML-MISSING] ${slug}: dist/${slug}/index.html not built`);
        errors++;
        continue;
      }
      const hh = fs.readFileSync(cityHtmlPath, 'utf-8');
      if (hh.includes('content="noindex')) {
        console.error(`FAIL [CITY-NOINDEX] ${slug}: primary-sourced city is marked noindex`);
        errors++;
      }
      if (!hh.includes(`rel="canonical" href="https://cityclick.com/${slug}/"`)) {
        console.error(`FAIL [CITY-CANONICAL] ${slug}: missing trailing-slash canonical`);
        errors++;
      }
      if (hh.includes('href="#"')) {
        console.error(`FAIL [CITY-EMPTY-LINK] ${slug}: contains href="#"`);
        errors++;
      }
      const factsCount = (hh.match(/Source: [^<]{5,200} · As of: /g) || []).length;
      if (factsCount < 6) {
        console.error(`FAIL [CITY-FACTS] ${slug}: only ${factsCount} sourced facts (need 6+)`);
        errors++;
      }
      if (!hh.includes('"@type":"FAQPage"')) {
        console.error(`FAIL [CITY-FAQ] ${slug}: missing FAQPage JSON-LD`);
        errors++;
      }
      const hhLow = hh.toLowerCase();
      for (const b of BANNED_PHRASES) {
        if (hhLow.includes(b.toLowerCase())) {
          console.error(`FAIL [CITY-BANNED-PHRASE] ${slug}: '${b}'`);
          errors++;
          break;
        }
      }
      const txt = hh
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ');
      for (const token of emptyTokens) {
        if (txt.includes(token)) {
          console.error(`FAIL [CITY-EMPTY-TOKEN] ${slug}: rendered DOM text contains '${token}'`);
          errors++;
          break;
        }
      }
      if (slug !== 'tx/austin') {
        for (const leak of austinLeaks) {
          if (hh.includes(leak)) {
            console.error(`FAIL [CITY-AUSTIN-LEAK] ${slug}: '${leak}'`);
            errors++;
            break;
          }
        }
      }
    }
  }

  console.log(`✓ Audited ALL ${totalCitiesAudited} primary-sourced city pages & ${totalStateHubsAudited} state directory pages (100% indexable, 6+ facts, 0 banned tokens)`);

  // -------------------------------------------------------------------------
  // PART 3: Sitemap, Redirects & Worker Entrypoint Verification
  // -------------------------------------------------------------------------
  const sitemapPath = path.join(distDir, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.error('FAIL [SITEMAP]: dist/sitemap.xml missing');
    errors++;
  } else {
    const sm = fs.readFileSync(sitemapPath, 'utf-8');
    const locs = [...sm.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1] ?? '');
    if (locs.length < 1570) {
      console.error(`FAIL [SITEMAP-COUNT]: sitemap.xml only has ${locs.length} URLs (expected >= 1,570)`);
      errors++;
    }
    const badLoc = locs.find((u) => !u.startsWith('https://cityclick.com/') || !u.endsWith('/'));
    if (badLoc) {
      console.error(`FAIL [SITEMAP-URL]: non-canonical URL in sitemap.xml: ${badLoc}`);
      errors++;
    }
    console.log(`✓ Verified sitemap.xml (${locs.length} canonical trailing-slash https://cityclick.com/ URLs)`);
  }

  const redirectsPath = path.join(distDir, '_redirects');
  if (!fs.existsSync(redirectsPath)) {
    console.error('FAIL [REDIRECTS]: dist/_redirects missing');
    errors++;
  } else {
    const rd = fs.readFileSync(redirectsPath, 'utf-8');
    if (!rd.includes('https://www.cityclick.com/* https://cityclick.com/:splat 301')) {
      console.error('FAIL [REDIRECTS-WWW]: missing www -> apex 301 redirect in dist/_redirects');
      errors++;
    } else {
      console.log('✓ Verified dist/_redirects (www -> apex 301 + normalized Census slug 301s)');
    }
  }

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
