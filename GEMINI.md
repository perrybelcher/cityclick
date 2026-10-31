# CityClick — Antigravity / Gemini Workspace Rules

You are working inside the **CityClick** project (`/Users/perry/Documents/cityclick`, branch `austin-live-clean`).
Before editing any data, template, script, or SEO surface, read and strictly obey:
1. [`AGENTS.md`](./AGENTS.md) — Prime Directive, banned scripts/APIs, design lock, and QA gate.
2. [`RULEBOOK.md`](./RULEBOOK.md) — Approved federal/state data sources, methodology, and replication workflow.
3. [`docs/PROJECT_BRIEFING_AND_AUDIT.md`](./docs/PROJECT_BRIEFING_AND_AUDIT.md) — Complete site audit, test-city comparison matrix, known bugs, and prioritized Next-Moves roadmap.
4. [`docs/QC_AGENT_HANDOFF_2026-10-18.md`](./docs/QC_AGENT_HANDOFF_2026-10-18.md) — QC-01 through QC-18 audit checklist.

---

## 1. Mission & Primary Test Cities
- **North Star Goal:** Build **the best local city guide in the world** for **visiting**, **moving to**, or **starting a business in** a city — zero fabricated numbers, complete coverage wherever primary public data exists, and strict consistency across every page, API, and PDF.
- **Perry's Primary Test Triad:** Always verify changes across:
  1. **Austin, TX** (`/tx/austin/` — reference flagship)
  2. **Nashville, TN** (`/tn/nashville/` — certified flagship)
  3. **Hot Springs, AR** (`/ar/hot-springs/` — certified flagship #7) & **Hot Springs Village, AR** (`/ar/hot-springs-village/` — certified CDP flagship)
- **Current 25 Indexable Flagships (`src/config/flagships.ts` / `scripts/qa.ts`):** `tx/austin`, `tn/nashville`, `ar/hot-springs`, `ar/hot-springs-village`, `id/boise`, `fl/tampa`, `az/scottsdale`, `tx/dallas`, `tx/houston`, `tx/san-antonio`, `az/phoenix`, `nc/charlotte`, `nc/raleigh`, `fl/orlando`, `fl/miami`, `fl/jacksonville`, `co/denver`, `nv/las-vegas`, `ut/salt-lake-city`, `ga/atlanta`, `ok/oklahoma-city`, `ar/little-rock`, `ar/fayetteville`, `ar/bentonville`, `al/huntsville`. All other ~1,476 cities MUST remain `noindex, follow` and excluded from `sitemap.xml` until rebuilt from primary sources and added to `CERTIFIED_FLAGSHIPS`.

---

## 2. Non-Negotiable Data, Design & Security Guardrails
1. **Prime Directive (Zero Fabrication / Zero Placeholders):**
   - A hidden block is always better than a guessed number or placeholder.
   - **NEVER** render `"—"`, `"N/A"`, `"TBD"`, `"pending"`, `"coming soon"`, or silent Austin fallback defaults (`$32/sqft`, `8.25%` tax, `'CT'`/`'ET'`) when a city lacks a field — omit the UI block cleanly.
   - Every rendered fact MUST carry primary-source provenance (`source`, `vintage`, `url` / `dataset`).
2. **Approved Zero-Quota Primary Data Sources Only:**
   - **Demographics, Housing & Income:** Census ACS 5-Year + Census `SUB-EST` Population Estimates + Census 2023 Gazetteer.
   - **Business Establishments:** Census County Business Patterns (CBP) & ZIP Codes Business Patterns (ZBP).
   - **Sales Tax:** Official State Department of Revenue / Comptroller rate tables stored in `sources/sales-tax.json`.
   - **Climate, Elevation, Water, Airports, Hospitals:** Open-Meteo Archive (`1991–2020`), USGS 3DEP EPQS, EPA SDWIS, OurAirports CSV + Gazetteer Haversine, CMS Care Compare (`xubh-q36u`, Emergency Services = `"Yes"`).
   - **BANNED:** Never run `scripts/build_national_fleet.py`. Never call Google Places API or paid quota APIs without Perry's explicit written approval.
3. **Design Lock & Quality Gate:**
   - Do **not** alter the approved Austin page visual design/layout without Perry's explicit sign-off; fix missing data blocks, broken interactivity, and factual accuracy within the locked design.
   - Never weaken thresholds in `scripts/qa.ts` to make a failing check pass. Always run `npm test && npm run build && npm run qa` before declaring work complete.
4. **Account & Deployment Boundaries:**
   - **Cloudflare:** Strictly `perrybelcher@gmail.com` personal account ONLY — **NEVER** access or touch `Hawk Group Media`.
   - **Production Deploys:** Sophia handles production server deployments; commit/push clean verified branches unless Perry explicitly instructs otherwise.
   - **Graphics:** Always use Runware (`runware-graphics` skill), never `fal.ai`.

---

## 3. Workspace Skills (`.agents/skills/`)
Activate these project skills whenever relevant:
- **`cityclick-data-rules`** (`.agents/skills/cityclick-data-rules/SKILL.md`) — Primary federal/state data sourcing, schema provenance, and enrichment rules.
- **`cityclick-page-qa`** (`.agents/skills/cityclick-page-qa/SKILL.md`) — Pre-commit build, test, DOM placeholder check, and test-city parity checklist.
- **`cityclick-seo-standards`** (`.agents/skills/cityclick-seo-standards/SKILL.md`) — Crawl shield (`noindex` fleet vs. `index` flagships), trailing-slash canonicals, JSON-LD truthfulness, and `llms.txt` standards.
