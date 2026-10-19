# Austin V2 implementation report

Status: working local implementation; NOT a production release and NOT an all-green completion of the original acceptance checklist.

Worktree: /opt/data/home/software/cityclick/.worktrees/astra-austin
Branch: astra/austin-v2
Baseline revision / branch before the requested commit:
29e656f28ff1fc836d6000c40a5419bda5db632f
astra/austin-v2

No deployment, paid API call, city-data edit, or other-city data change was performed. Application changes and local test tooling are inside the assigned worktree. This report is also copied to the explicitly requested scratch report path.

## Outcome and the blocking acceptance conflict

The four self-canonical Austin routes build and respond HTTP 200 in the local static preview:

- /tx/austin/
- /tx/austin/business/
- /tx/austin/moving-to/
- /tx/austin/visit/

All four are deliberately `noindex, follow`; the overview is removed from the sitemap. The record is not sufficient to satisfy the framework's complete release policy. The Prime Directive takes precedence over pretending the missing evidence exists.

`npm run build` exits 0. `npm test` exits 0 (20 tests). The browser/source/accessibility audit exits 0.

IMPORTANT: `npm run qa` against the NEW build exits 1 with exactly one blocking error: the old gate requires Austin to be indexable. I did not alter `scripts/qa.ts`, suppress its failure, or index an incomplete pilot to make it green. Therefore the requested full-build QA acceptance criterion is not met. This needs an explicit approved migration of the legacy indexing policy, or completion of the release evidence; not a fabricated QA pass.

The legacy baseline was built from `git archive HEAD` into an ignored directory INSIDE this worktree. `npm --prefix .qa-tools/legacy run build` and `npm --prefix .qa-tools/legacy run qa` both exited 0. The new build's other old flagship pages and all legacy crawl-shield checks also pass. A comparison of 1,502 comparable non-Austin two-segment route artifacts found zero differences after normalizing generated asset filenames. Baseline test tooling is disposable and is not part of the committed application.

## What each page shows

Overview:
- Data-driven identity, prescribed title/H1, breadcrumbs, sibling intent navigation.
- Sourced income, owner-occupied home value, gross rent and median age.
- Intent previews and sourced visible Key Facts/Q&A. The existing `buildFacts` builder is reused for supported income, housing and climate answers.
- Population is intentionally absent because its source label conflicts with the producing script's population series.

Business:
- Resident income context clearly separated from postal-area business context.
- The record's industry rows, explicitly labeled ZIP-area density, never city-limits competition or investment opportunity. Each expandable row includes its original evidence quote, establishment numerator, statistical-ZIP population denominator, source, date and classification code. A shared source note is visible below the table even while details are closed.
- A genuinely blank quote worksheet: area, rent quote, NNN, wage, hours, payroll burden, fixed overhead, tax-inclusive ticket, variable-cost percentage and operating days must all be entered. Tax comes only from the sourced Austin record and requires explicit applicability confirmation. No trade presets or rent benchmarks.
- Source-table sales-tax context with combined/state/local components and a jurisdiction warning. No permit timelines, lenders or commercial-rent claims.

Moving:
- Housing table, income and age, annual real-estate taxes paid, and an explicitly labeled Census-based property-tax proxy. The proxy is a ratio of medians, NOT a statutory rate, median effective rate or parcel-bill estimate.
- Historical climate, EPA water-system identity/system population and a hospital directory listing, all using only their record's source-bearing fields.

Visit:
- An intentionally short historical-climate and hospital brief.
- Airport and map blocks are omitted, not filled from the old template. The airport name/IATA/distance have no source in the Austin record. No visitor entity with sourced coordinates is present. Existing road-traffic coordinates are not relabeled as attractions.
- The framework's required visitor title pattern is used, but no invented things-to-do list, accommodation, itinerary, flight service or travel time is promised in the description or page body.

Every route has one H1, a unique description, an absolute trailing-slash canonical, an absolute og:image pointing at the existing local Austin photograph, WebPage + BreadcrumbList JSON-LD, and FAQPage using exactly the same visible Q&A answers. A stable place ID is shared across intents.

## Design and implementation

Warm canvas, navy ink, restrained evidence accent, system sans UI and system serif headlines; responsive cards, stat blocks, semantic tables, source notes, breadcrumbs and real navigation. No external fonts, tracking, social embeds, map requests, fake verified badges or fake lead forms.

The provided photograph remains the social image. Two WebP derivatives of the same unmodified scene reduce page-image transfer: 640x400 = 51,574 bytes; 1200x750 = 159,300 bytes. The original remains untouched. Explicit dimensions, responsive srcset/sizes and eager hero loading are used. No photographer or license is invented; the preview caption explicitly flags the outstanding publication-rights review.

The lease module reuses the legacy occupancy/labor/net-ticket/contribution algebra, removes all financial defaults, and uses exact BigInt rational arithmetic until display rounding and upward transaction rounding. The documented annualization convention is 52/12 rather than the legacy 4.3482 approximation; operating days are entered instead of the old fixed 30.4375. These are calculator conventions, not Austin facts. Fictional test inputs live only in tests, never in the initial UI.

Legacy ?tab= and hash aliases are client-migrated on the overview; known aliases, tracking-parameter preservation and ordinary-fragment preservation were browser-tested. This is NOT an HTTP 301. `LegacyIntent.astro` documents the required query-aware server/edge handler ahead of static assets. No path-only redirect rule was falsely presented as query-aware routing.

## Files created

- src/pages/tx/austin/index.astro — concrete Austin overview override.
- src/pages/[state]/[city]/business.astro
- src/pages/[state]/[city]/moving-to.astro
- src/pages/[state]/[city]/visit.astro
- src/data/city-v2.ts — pilot route, brand, image and indexing configuration; no duplicate metric store.
- src/lib/city-v2.ts — narrow validated legacy-record projection, fail-closed source-bearing blocks, formatters, route helper, page copy and sourced Q&A selection.
- src/lib/lease-quote.ts — blank-input exact-arithmetic scenario model.
- src/components/city/CityPage.astro — shared page shell and intent composition.
- src/components/city/Card.astro
- src/components/city/Stat.astro
- src/components/city/FactTable.astro
- src/components/city/SourceNote.astro
- src/components/city/IntentNav.astro
- src/components/city/LegacyIntent.astro
- src/components/city/KeyFacts.astro
- src/components/city/Climate.astro
- src/components/city/Services.astro
- src/components/city/TradeTable.astro
- src/components/city/TaxBlock.astro
- src/components/city/LeaseWorksheet.astro
- src/components/city/city.css — scoped design tokens and responsive system.
- public/images/austin-skyline-v2-640.webp
- public/images/austin-skyline-v2-1200.webp
- tests/city-v2.test.ts — source removal, identity/metadata, numeric rejection, calculator golden cases, invalid/blank inputs and explicit zero tests.
- scripts/qa-austin-v2.mjs — independent browser, rendered-number, source-path, metadata, navigation, JSON-LD, behavior and accessibility audit.
- REPORT_austin.md — this implementation/evidence report.

## Files changed

- src/pages/[state]/[city].astro — only imports the pilot slug manifest and excludes its overview from legacy generation; all other city markup/logic is retained.
- src/lib/facts.ts — replaces the overly broad input type with a structural FactsInput interface so source-filtered inputs can reuse the existing builder; legacy runtime output is unchanged.
- src/pages/sitemap.xml.ts — removes only the noindexed Austin overview entry; existing non-Austin entries are untouched.
- .gitignore — ignores the provided dependency/raw-data symlinks and local-only QA tools/artifacts so `git add -A` cannot accidentally commit them.

No src/data/cities/*.json file changed, including tx.json.

## GAPS / deliberately omitted facts / release uncertainty

1. Airport provenance: the record contains the name, IATA and 8.5-mile value but no supporting source, dated evidence, coordinates or distance origin/method. The requested airport block therefore cannot honestly render. It is absent from HTML, FAQ and scripts. No airport pin was invented.
2. Population provenance: demographics.population is grouped under ACS provenance, but scripts/rebuild_verified_cities.py selects POPESTIMATE2023 for this incorporated place. No PEP field provenance is attached. Population and growth are omitted rather than mislabeled or silently repaired.
3. No sourced visitor attractions, hotels, districts, transit directions or visitor map pins. No copy/pins from the old template were transferred.
4. No sourced local zoning/occupancy/permit workflow, school lookup, parcel-tax workflow, employment snapshot or service-start workflow in the record. Their headings, forms and claims are not rendered.
5. Hospital evidence is only the record's dated directory-source string. There is no primary facility URL, current service verification, nearest-facility method or trauma authority evidence. Only the supplied identity/address are shown, with these limitations; no trauma level or nearest-hospital claim is made.
6. Water service geography/reporting vintage is not established by the supplied SDWIS snapshot. The population is labeled system population, and no universal service or water-safety claim is made.
7. Climate is the record's 2015–2024 reanalysis average, not NOAA normals or current weather. A commercial-use rights review/replacement and a full source-row audit remain necessary before production release.
8. Image subject/rights metadata is missing from the record. Existing task-specified photography is retained for local design review only, with a visible rights-review caveat and noindex. No independent rights certification is claimed.
9. Historical source URLs were not re-certified against upstream raw data in this implementation. The automated audit proves rendered values match explicit source-covered record fields; it does not prove the record's original research or geography is independently correct.
10. The task explicitly requests ZIP-area industry density and a Census-based property-tax proxy, while the full framework's later production data model instead prefers county-market density and excludes the ratio as an effective tax rate. This is a limited, clearly labeled legacy-data pilot, NOT the complete V2 data/schema/ETL migration.
11. No promised PDF, lead capture, partner referral, booking or email flow is added: their working source-complete artifacts/backends are outside this task.
12. HTTP query 301s remain a deployment/server integration requirement; only honest client migration is implemented and tested.
13. Screenshots were captured at all specified sizes and DOM/accessibility checks passed, but no human/vision screenshot review was available in this CLI. Do not treat automated layout checks as visual design approval.
14. Full `npm run check` is already broken in the baseline: both baseline and this worktree report 435 errors, principally in legacy files. No errors were reported in the new city components/modules after the targeted fixes. This is not a repository-wide typecheck pass.
15. The unmodified master QA's mandatory Austin indexability conflicts with the required noindex for missing release evidence. Its exit 1 is retained and reported, not bypassed.

## Real verification output

Final build command: `npm run build` — exit 0.
Relevant actual final output:

    00:34:26 ▶ src/pages/tx/austin/index.astro
    00:34:26   └─ /tx/austin/index.html (+5ms)
    00:34:26 ✓ Completed in 9.62s.
    00:34:26 [build] Rearranging server assets...
    00:34:26 [build] Server built in 13.97s
    00:34:26 [build] Complete!

Full log: qa-artifacts/build.log. The existing adapter emits node-built-in externalization warnings; they did not prevent the build. The local static preview does not claim to exercise dynamic edge routes.

Final unit command: `npm test` — exit 0.

npm notice run cityclick@1.0.0 test
npm notice run vitest run

 RUN  v3.2.7 /opt/data/home/software/cityclick/.worktrees/astra-austin

 ✓ tests/scores.test.ts (5 tests) 6ms
 ✓ tests/saturation.test.ts (5 tests) 8ms
 ✓ tests/breakeven.test.ts (2 tests) 7ms
 ✓ tests/city-v2.test.ts (8 tests) 71ms

 Test Files  4 passed (4)
      Tests  20 passed (20)
   Start at  00:34:27
   Duration  583ms (transform 389ms, setup 0ms, collect 524ms, tests 92ms, environment 1ms, prepare 355ms)


Final requested gate: `npm run qa` — exit 1, one blocking indexing-policy conflict. This is the exact output, including the legacy script's misleading unconditional per-page PASS line after its recorded failure:

npm notice run cityclick@1.0.0 qa
npm notice run tsx scripts/qa.ts
=========================================================
=== Running CityClick Master Quality Gate (RULEBOOK v1.0) ===
=========================================================
FAIL [INDEX-STATE] in Austin: Featured city is marked noindex! Flagships must be indexable.
✓ PASS Flagship Quality Gate: Austin, Texas (17.4 KB)
✓ PASS Flagship Quality Gate: Hot Springs Village, Arkansas (104.8 KB)
✓ PASS Flagship Quality Gate: Boise, Idaho (133.5 KB)
✓ PASS Flagship Quality Gate: Tampa, Florida (134.0 KB)
✓ PASS Flagship Quality Gate: Scottsdale, Arizona (133.1 KB)
✓ PASS Flagship Quality Gate: Nashville, Tennessee (133.1 KB)
✓ Verified Crawl Shield active on ok/oklahoma-city/index.html (noindex, follow)
✓ Verified Crawl Shield active on ok/tulsa/index.html (noindex, follow)
✓ Verified Crawl Shield active on wy/casper/index.html (noindex, follow)
✓ Crawl shield verified on ALL 1495 non-flagship city pages
✓ Verified Cloudflare Worker bundle (3.1 KB)

❌ Quality Gate FAILED with 1 blocking errors! Deployment aborted.

Separate old-template baseline gate: `npm --prefix .qa-tools/legacy run qa` — exit 0 at the time the disposable baseline was present:

npm notice run cityclick@1.0.0 qa
npm notice run tsx scripts/qa.ts
=========================================================
=== Running CityClick Master Quality Gate (RULEBOOK v1.0) ===
=========================================================
✓ PASS Flagship Quality Gate: Austin, Texas (136.7 KB)
✓ PASS Flagship Quality Gate: Hot Springs Village, Arkansas (104.8 KB)
✓ PASS Flagship Quality Gate: Boise, Idaho (133.5 KB)
✓ PASS Flagship Quality Gate: Tampa, Florida (134.0 KB)
✓ PASS Flagship Quality Gate: Scottsdale, Arizona (133.1 KB)
✓ PASS Flagship Quality Gate: Nashville, Tennessee (133.1 KB)
✓ Verified Crawl Shield active on ok/oklahoma-city/index.html (noindex, follow)
✓ Verified Crawl Shield active on ok/tulsa/index.html (noindex, follow)
✓ Verified Crawl Shield active on wy/casper/index.html (noindex, follow)
✓ Crawl shield verified on ALL 1495 non-flagship city pages
✓ Verified Cloudflare Worker bundle (2.6 KB)

=========================================================
✨ Master Quality Gate PASSED with 0 errors! Build certified.
=========================================================

Final browser command:
`PLAYWRIGHT_BROWSERS_PATH="$PWD/.qa-tools/browsers" TMPDIR="$PWD/.cache" node scripts/qa-austin-v2.mjs`
Exit 0. Exact output:

PASS page: {"route":"/tx/austin/","titleLength":37,"descriptionLength":128,"exactValuesChecked":4,"numericTokensChecked":101,"sourceNotes":11,"htmlGzipBytes":4885}
PASS page: {"route":"/tx/austin/business/","titleLength":33,"descriptionLength":139,"exactValuesChecked":86,"numericTokensChecked":329,"sourceNotes":27,"htmlGzipBytes":8875}
PASS page: {"route":"/tx/austin/moving-to/","titleLength":39,"descriptionLength":143,"exactValuesChecked":13,"numericTokensChecked":171,"sourceNotes":18,"htmlGzipBytes":4635}
PASS page: {"route":"/tx/austin/visit/","titleLength":42,"descriptionLength":146,"exactValuesChecked":4,"numericTokensChecked":66,"sourceNotes":6,"htmlGzipBytes":2942}
PASS calculator: blank start, missing input, golden fixture, changed rent, invalid margin, reset; no stale outputs
PASS legacy migration: all query/hash aliases, tracking preservation, ordinary fragments and unknown tabs
PASS JavaScript-off: factual content and navigation on all four routes
PASS noindex/sitemap consistency
Austin V2 browser + source audit PASSED

The browser audit additionally ran axe-core WCAG 2 A/AA + 2.1 AA checks on each route: zero detected violations on all four. It captured 360px/390px/1440px screenshots and checked for document-level horizontal overflow. It checked all visible bound values independently against tx.json, scanned every numeric text token against an explicit source-covered numeric inventory (not arbitrary values from other cities), matched FAQ answers to visible answers, and asserted the intentionally omitted numbers/names never leak into page text. User-entered scenario outputs are separately exercised as calculations, not claimed to be source facts in tx.json.

Evidence files, all in this worktree:
- qa-artifacts/verification-commands.json — actual final command exit codes.
- qa-artifacts/austin-v2-results.json — per-route counts, numeric field/source inventory and accessibility results.
- qa-artifacts/overview.txt, business.txt, moving-to.txt, visit.txt — rendered text including source-details text.
- qa-artifacts/overview-360.png (and -390/-1440); same sizes for business, moving-to, visit.
- qa-artifacts/build.log, tests.log, qa.log, browser.log, legacy-build.log, legacy-qa.log, check.log, legacy-check.log.

## Exact local preview and verification commands

From the assigned worktree:

    cd /opt/data/home/software/cityclick/.worktrees/astra-austin
    npm run build
    python -m http.server 4387 --bind 127.0.0.1 --directory "$PWD/dist"

Open these LOCAL URLs (not public deployment links):

    http://127.0.0.1:4387/tx/austin/
    http://127.0.0.1:4387/tx/austin/business/
    http://127.0.0.1:4387/tx/austin/moving-to/
    http://127.0.0.1:4387/tx/austin/visit/

The preview server started for this task is stopped at completion; run the command above to restart. Stop your preview with Ctrl-C. Port 4321 was already occupied by an unrelated process, which was not modified; this task used 4387.

For source development instead of a static-build preview:

    npm run dev -- --host 127.0.0.1 --port 4387

For reproducible browser tooling (ignored local directories; no application dependency changes):

    mkdir -p .cache
    npm_config_cache="$PWD/.cache/npm" npm install --prefix .qa-tools --no-package-lock --ignore-scripts playwright axe-core
    PLAYWRIGHT_BROWSERS_PATH="$PWD/.qa-tools/browsers" node .qa-tools/node_modules/playwright/cli.js install chromium
    npm test
    PLAYWRIGHT_BROWSERS_PATH="$PWD/.qa-tools/browsers" TMPDIR="$PWD/.cache" node scripts/qa-austin-v2.mjs
    npm run qa

The last command currently returns the documented index-state failure; it is not silently made optional.

Requested commit message: `Austin V2 pages (astra)` on `astra/austin-v2`. No remote push or deployment is included.
