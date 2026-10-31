# CityClick — Master Project Briefing, Audit & Next-Moves Roadmap

**Repository:** `github.com/perrybelcher/cityclick` (`austin-live-clean` @ `bccf2d2`)  
**Workspace:** `/Users/perry/Documents/cityclick` (Antigravity Project: **CityClick**)  
**Audit Date:** 2026-10-30  

---

## 1. Product Mission, North Star & Test Markets

### North Star Goal
Build **the best local city guide in the world** across three real-world decision modes:
1. **Visiting** — Airport transit, climate & elevation, drinking water quality, verified emergency-department hospitals, interactive city map, and local orientation.
2. **Moving / Living** — Population & post-2020 growth, median household income, poverty rate, housing value, median gross rent, homeowner rate, county & ZIP breakdown, and cost-of-living comparison.
3. **Starting a Business** — Combined state + local retail sales tax, NAICS establishment counts & per-10k density vs. U.S. benchmarks from Census County/ZIP Business Patterns, interactive commercial lease break-even calculator, and city-to-city market comparisons.

### Core Historical Failure Modes We Are Eliminating
1. **Made-up / fabricated data:** Earlier V1 fleet builds (`scripts/build_national_fleet.py`) invented NNN commercial lease rates, permit wait days, school zones, hospital/airport names (`"{City} Regional Memorial Hospital"`), and fake Empirical Bayes scores.
2. **Incomplete listings where primary data exists:** Even after the `austin-live-clean` purge removed fabricated fields from the 6 flagship JSONs, 5 of the 6 flagships are still missing federal blocks (hospitals, airport `.source` + coordinates, elevation) that Austin already renders.
3. **Inconsistency across cities and surfaces:** City pages, state hub pages, comparison pages, downloadable PDF dossiers, and methodology/developer docs must never contradict one another or silently fall back to Austin defaults.

### Primary Test Markets (Perry's Standard Benchmark Triad)
Whenever testing features, data pipelines, UI changes, or QA gates, always verify across Perry's three benchmark markets:

| Benchmark Market | Route(s) | Current Status on `austin-live-clean` |
|---|---|---|
| **1. Austin, TX** | `/tx/austin/` | **Gold-standard reference flagship** (`index, follow`) — most complete dataset (Census + Open-Meteo + EPA SDWIS + USGS 3DEP + OurAirports + 10 CMS ER hospitals + TX Comptroller tax). |
| **2. Nashville, TN** | `/tn/nashville/` | **Certified flagship** (`index, follow`), **incomplete parity** — missing USGS elevation (`terrainElevation`), missing CMS `erHospitals` (0 hospitals rendered), airport cites Google Places API without coordinates (0 map pins), no video showcase. |
| **3. Hot Springs, AR** *(+ Hot Springs Village, AR)* | `/ar/hot-springs/` & `/ar/hot-springs-village/` | **Critical split:** `/ar/hot-springs-village/` (pop 16,509 gated CDP) is one of the 6 indexable flagships, while `/ar/hot-springs/` (City of Hot Springs, AR, pop 37,994 — Perry's actual third test city) is **still an unverified, fabricated `noindex` fleet record** (`"Hot Springs Regional / Metropolitan Airport"`, `"Hot Springs Regional Memorial Hospital"`, 25/25 trades marked `"balanced"`, 7 empty `—` dashes). Meanwhile `/ar/hot-springs-village/` is missing airport `.source` (airport hidden), missing CMS `erHospitals`, renders `—` dashes on `popChange2020to2023Pct`, and only shows 2 of 25 industries. |

### Complete Set of 6 Certified Indexable Flagships (`scripts/qa.ts`)
1. `tx/austin` — Austin, TX (`GEOID 4805000`)
2. `tn/nashville` — Nashville, TN (`GEOID 4752006`)
3. `ar/hot-springs-village` — Hot Springs Village, AR (`GEOID 0533460`)
4. `id/boise` — Boise, ID (`GEOID 1608830`)
5. `fl/tampa` — Tampa, FL (`GEOID 1271000`)
6. `az/scottsdale` — Scottsdale, AZ (`GEOID 0465000`)

*(All other ~1,495 `src/content/cities/**/*.json` files carry `<meta name="robots" content="noindex, nofollow">` and are omitted from `sitemap.xml` until individually rebuilt from primary sources.)*

---

## 2. Build, Test & Log Health Snapshot (`bccf2d2`)

| Command / Check | Result | Details |
|---|---|---|
| `npm test` (`vitest run`) | **PASS** (0 errors) | 3 test files, 12 tests passing (`breakeven.test.ts`, `facts.test.ts`, `seo.test.ts`). |
| `npm run build` (`astro build`) | **PASS** (exit 0) | Static + Cloudflare SSR worker bundle compiles cleanly to `dist/`. |
| `npm run qa` (`tsx scripts/qa.ts`) | **PASS** (0 errors) | All 6 flagship pages pass current DOM/JSON checks; 1,495 non-flagship pages verified `noindex, nofollow` and absent from `dist/client/sitemap.xml`. |
| `npm run check` (`astro check`) | **FAIL** (**55 TS errors**) | Type mismatches across `src/pages/[state]/[city].astro`, `src/pages/compare/[cityA]-vs-[cityB].astro`, `scripts/qa.ts`, `tests/breakeven.test.ts`, etc. because templates/types still reference purged V1 fields or loosely typed JSON objects. |
| `npm run audit:provenance` | **FAIL** (**1,468 errors**) | `src/lib/schema.ts` still enforces the legacy V1 Zod schema (expecting 25 industries, `commercialRealEstate`, `regulatoryFriction`, etc.) rather than the cleaned `RULEBOOK.md` schema. |
| `python3 audit/recompute.py` | **FAIL locally** | `data/census` is a symlink to `/opt/data/home/software/cityclick/data/census` (remote Linux server path). Six Python scripts (`scripts/enrich_city.py`, `audit/recompute_extra.py`, `scripts/generate_austin_dossier_html.py`, `scripts/generate-feasibility-pdf.py`, `scripts/research_agent.py`, `scripts/build_national_fleet.py`) hardcode `/opt/data/...` paths. |
| `git status` after `npm install` | **Tracked symlink quirk** | Commit `bccf2d2` tracked `node_modules` as a `120000` symlink; `.gitignore` only lists `node_modules/` (with trailing slash), so `npm install` causes `D node_modules` locally until `git rm --cached node_modules` + `node_modules` in `.gitignore` is committed. |

---

## 3. Side-by-Side Test City & Flagship Audit Matrix

| Feature / Data Block | `tx/austin` (Flagship) | `tn/nashville` (Flagship) | `ar/hot-springs-village` (Flagship) | `ar/hot-springs` (Unverified Test City) | `id/boise`, `fl/tampa`, `az/scottsdale` (Flagships) |
|---|---|---|---|---|---|
| **Indexability** | `index, follow` | `index, follow` | `index, follow` | `noindex, nofollow` (V1 fleet) | `index, follow` |
| **County Name (`countyName`)** | `"Travis County"` | `"Davidson County"` | `"Garland & Saline Counties"` | `"Garland County"` | Boise: `"Ada County"`; **Tampa: `"Tampa Metropolitan Area"` (WRONG — Hillsborough County)**; **Scottsdale: `"Scottsdale Metropolitan Area"` (WRONG — Maricopa County)** |
| **Pop Change 2020→2023** | `+2.0%` | `+0.4%` | **`undefined` → renders literal `—` in 2 places + Compare page!** | `+1.1%` (unverified fleet) | Rendered (`+0.8%`, `+4.9%`, `+1.2%`) |
| **Airport Tile & Getting Here Card** | **Rendered** (`AUS`, OurAirports + Gazetteer `.source`) | **Rendered** (`BNA`, **still cites Google Places API!**) | **HIDDEN!** (`LIT` exists in JSON, lacks `.source`) | Fabricated `"Hot Springs Regional / Metropolitan Airport"` | **Boise (`BOI`) & Tampa (`TPA`) HIDDEN** (lack `.source`); Scottsdale (`PHX`) cites Google Places API |
| **Interactive Map Pins** | **0 places mapped** (`lat`/`lng` not saved to `primaryAirport`) | **0 places mapped** | **0 places mapped** | **0 places mapped** | **0 places mapped on all 3** |
| **CMS ER Hospitals (`erHospitals`)** | **10 hospitals rendered** | **0 (MISSING — section completely absent)** | **0 (MISSING — section completely absent)** | Fabricated `"Hot Springs Regional Memorial Hospital"` | **0 on all 3 (MISSING)** |
| **USGS Elevation (`terrainElevation`)** | `502 ft` | **MISSING** (Visiting strip has 3 tiles instead of 4) | `787 ft` | **MISSING** | Boise: `2,700 ft`; Tampa: `36 ft`; **Scottsdale: MISSING** |
| **EPA Water + Open-Meteo Climate** | Present | Present | Present | **MISSING** (renders `—` dashes) | Present on all 3 |
| **NAICS Industries Count** | 25 trades | 25 trades | **Only 2 trades!** (`expected < 10` filter drops 23 trades incl. Coffee Shops `722515`) | 25 fabricated `"balanced"` trades | 24–25 trades |
| **Curated Video (`VERIFIED_VIDEOS`)** | 1 video | **None** | 1 video | **None** | Boise: 1 video; **Tampa & Scottsdale: None** |

### Specific Code-Level Bugs Found on City & Compare Templates
1. **Airport Visibility Gate (`src/pages/[state]/[city].astro:134` & `src/lib/facts.ts:56`):**
   - `const sourcedAirport = travel?.primaryAirport?.source ? travel.primaryAirport : null;` hides the airport tile, Getting Here card, and airport FAQ on `ar/hot-springs-village`, `id/boise`, and `fl/tampa` solely because `primaryAirport.source` wasn't populated from OurAirports + Census Gazetteer.
2. **Zero Map Pins Everywhere (`src/pages/[state]/[city].astro:157-168` & `scripts/enrich_city.py`):**
   - `enrich_city.py` (`do_airport`) reads `latitude_deg` and `longitude_deg` from OurAirports to compute Haversine distance, **but never writes `lat` and `lng` into `primaryAirport`**. Consequently, every city map says `"0 places mapped · Click any pin"`.
3. **Empty `—` Dashes Violating `AGENTS.md` Prime Directive (`[city].astro:402, 679` & `compare/[cityA]-vs-[cityB].astro:79`):**
   - Because Census Vintage 2023 `SUB-EST2023` (`SUMLEV=162`) only covers incorporated places and not CDPs like Hot Springs Village, `popChange2020to2023Pct` is `null`/`undefined`, rendering literal `—` dashes instead of omitting the growth badge cleanly.
4. **Trade Selector JS Desync & False `"Empirical Bayes"` Label (`[city].astro:430, 1558-1635`):**
   - `applyTrade()` updates `#active-trade-*` in the lower density card and dead `#hero-trade-label`, **but never updates `#strip-trade-count`, `#strip-trade-label`, `#strip-trade-saturation`, or `#strip-trade-status`** in the Doing Business 4-fact strip at the top of the tab.
   - Line 430 labels the Saturation Index `"Empirical Bayes"`, whereas `scripts/rebuild_verified_cities.py:72` computes an unshrunk direct density ratio (`round(p10 / usd * 100)`).
   - Line 49 (`const defaultTrade = industries.find(i => i.naics === '722515') || industries[0]`) will crash the build if a smaller town has `0` trades passing `expected >= 10`.
5. **Hardcoded Time Zones & Missing Interactive Picker on Compare (`compare/[cityA]-vs-[cityB].astro:117, 120`):**
   - Falls back to `'CT'` for `cityA` and `'ET'` for `cityB` when `iana` is absent, and city pages hardcode `vs-tx-austin` (or `vs-fl-tampa` on Austin) with no dropdown to pick a second city (`QC-10`).

---

## 4. Supporting Pages, SEO/AEO & Downloadable Asset Audit

1. **Contradictory Austin Feasibility PDF & Print HTML (`public/reports/tx-austin-feasibility-dossier.pdf` & `austin_dossier_print.html` — `QC-16`):**
   - Linked directly from Austin's Business sidebar, yet still displays purged V1 fabricated data (`\$32.00/sqft` NNN rent, `\$22,460` required monthly revenue, stale `\$92,248` MHI vs. live `\$91,461`, SBA claims, and internal math contradictions).
2. **Stale Claims on Static Docs & Machine-Readable Endpoints:**
   - `src/pages/about.astro`, `src/pages/methodology.astro`, `src/pages/404.astro`, `src/pages/developers.astro`, `public/llms.txt`, `public/llms-full.txt`, and `public/openapi.json` still claim `"1,501 Published City Guides"`, NNN commercial lease benchmarks, public school zones, permit wait days, FRED unemployment, Empirical Bayes shrinkage, and stale Austin metrics (`\$92,248` MHI, `8.4%` growth, viability score `52`).
3. **State Hub Pages (`src/pages/[state]/index.astro`):**
   - Currently indexable (`index, follow` default in `Layout.astro`), advertises `"{N} verified city guides"` / `"Indexed Cities"` while linking to unverified `noindex` fleet pages, renders `'N/A'` fallbacks (lines 104, 108), and omits trailing slashes on city links (`href="/${state}/${slug}"` causing 308 redirects).
4. **JSON-LD & Speakable Bugs (`src/lib/seo.ts`):**
   - Line 91 invents `` `${city.name} Airport` `` when `primaryAirport` is null.
   - Line 40 constructs broken `data.census.gov/profile/...` URLs in `sameAs`.
   - Lines 130–132 emit `SpeakableSpecification` CSS selectors (`#aeo-b2b-capsule`, `#aeo-travel-capsule`, `#key-demographics-summary`) that do not exist in the rendered DOM.
5. **Interactive Forms & Lease Calculator (`QC-06`, `QC-08`):**
   - Forms on `developers.astro`, `partners/join.astro`, `index.astro` (`#follow-city-form`), and `[city].astro` (`Subscribe to Event Alerts`, `#dossier-lead-form`) are client-only `alert()` stubs with no backend persistence.
   - `src/pages/tools/lease-calculator.astro` pre-fills Austin defaults (`\$32.00` rent, `8.25%` sales tax) and shows stale initial output text (`\$22,460` / `94`) before JS hydration.

---

## 5. Prioritized Next-Moves Execution Roadmap

### Move 1 — Flagship & Test-City Federal Data Parity (Zero Paid Quotas)
1. **Fix `scripts/enrich_city.py` (`do_airport`) & run across all 6 flagships:**
   - Populate `primaryAirport` solely from **OurAirports + Census 2023 Gazetteer** (removing legacy Google Places citations on Nashville & Scottsdale), **save `lat` and `lng`** on `primaryAirport`, and write full `.source` attribution so **Boise (`BOI`), Tampa (`TPA`), and Hot Springs Village (`LIT`) regain their Airport tiles/cards** and **all 6 city maps render verified airport pins**.
2. **Fetch CMS Care Compare `erHospitals` for the remaining 5 flagships (`tn/nashville`, `ar/hot-springs-village`, `id/boise`, `fl/tampa`, `az/scottsdale`):**
   - Pull Emergency Services = `"Yes"` hospitals from CMS dataset `xubh-q36u` and geocode via **Census Geocoder** (`geocoding.geo.census.gov`, free federal API) so hospital pins also populate the Living/Visiting maps. *(For Hot Springs Village CDP, transparently note nearest Garland County / Hot Springs ER facilities with exact Haversine distance if 0 acute-care hospitals sit inside the gated CDP boundary.)*
3. **Populate USGS 3DEP `terrainElevation` on `tn/nashville` and `az/scottsdale`** so all 6 flagships render complete 4-tile Visiting strips.
4. **Fix `countyName`** on `fl/tampa` (`"Hillsborough County"`), `az/scottsdale` (`"Maricopa County"`), and `ok/oklahoma-city` (`"Oklahoma County"`).
5. **Onboard & certify `ar/hot-springs` (City of Hot Springs, AR — `GEOID 0533400`):**
   - Generalize `scripts/rebuild_verified_cities.py` to accept any 7-digit Census Place `GEOID`, add verified Hot Springs, AR sales tax (`6.50%` AR state + Garland County + City of Hot Springs local rate from Arkansas DFA official lookup table) to `sources/sales-tax.json`, run full federal enrichment (`enrich_city.py`), verify against `npm run qa`, and promote `ar/hot-springs` to certified flagship #7 so all three of Perry's primary test cities (`Austin, TX`, `Nashville, TN`, `Hot Springs, AR`) are 100% live and verified.

### Move 2 — Template, Map & Interactive Truthfulness Fixes (`[city].astro`, `compare`, `seo.ts`)
1. Omit the population-change pill/subtext cleanly whenever `popChange2020to2023Pct == null` (eliminating literal `—` dashes on CDPs like Hot Springs Village and on Compare pages).
2. Relax or clearly tier the small-city NAICS filter in `rebuild_verified_cities.py` (showing verified ZBP counts even when `expected < 10`, with a transparent small-market sample note instead of dropping 23 of 25 trades) and guard `defaultTrade` when `industries.length === 0`.
3. Update `applyTrade()` in `[city].astro` so switching trades updates `#strip-trade-count`, `#strip-trade-label`, `#strip-trade-saturation`, and `#strip-trade-status` in sync with the main card, and rename `"Empirical Bayes"` to `"vs. US Density"`.
4. Fix `compare/[cityA]-vs-[cityB].astro` hardcoded `'CT'`/`'ET'` time zone fallbacks and add an interactive city-vs-city picker (`QC-10`).
5. Fix `src/lib/seo.ts` (`Airport` fallback invention, broken `data.census.gov` `sameAs` URL, and non-existent `SpeakableSpecification` CSS selectors) and enforce trailing slashes on all internal links.

### Move 3 — Supporting Pages, Austin PDF Dossier & Form Honesty
1. Regenerate `public/reports/tx-austin-feasibility-dossier.pdf` and `austin_dossier_print.html` directly from `src/content/cities/tx/austin.json` (or remove fabricated rent/SBA figures) so the downloadable PDF matches the live Austin page 1-for-1 (`QC-16`).
2. Scrub stale V1 claims (`1,501 verified cities`, NNN rent, school zones, permit days, FRED, Empirical Bayes, `$92,248` MHI) from `about.astro`, `methodology.astro`, `404.astro`, `developers.astro`, `public/llms.txt`, `public/llms-full.txt`, and `public/openapi.json`.
3. Add `noindex, follow` (or filter strictly to certified flagships) on `src/pages/[state]/index.astro`, remove `'N/A'` strings, and add trailing slashes to city links.
4. Wire lead/partner/developer forms to a real Cloudflare D1 / Resend endpoint or clearly label them before submission (`QC-06`, `QC-08`), and make `tools/lease-calculator.astro` city-agnostic on initial load.

### Move 4 — Pipeline, Schema & Typecheck Hardening
1. Rewrite `src/lib/schema.ts` to match the cleaned `RULEBOOK.md` data contract so `npm run audit:provenance` passes with 0 errors across all certified cities.
2. Resolve all **55 TypeScript errors** in `npm run check` (`npx astro check`) and add `npm run check` to the CI/QA workflow.
3. Replace hardcoded `/opt/data/home/software/cityclick/...` paths in `scripts/` and `audit/` with `Path(__file__).resolve().parents[1]` (or `CITYCLICK_CENSUS_DIR` env override) so scripts work seamlessly on both macOS local dev and the Linux build server.
4. Untrack the accidental `node_modules` symlink (`git rm --cached node_modules`) and add `node_modules` (without trailing slash) to `.gitignore`.
