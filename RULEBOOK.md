# CityClick Operational Rulebook & Quality Doctrine
**Version:** 1.0.0 · **Effective Date:** October 18, 2026  
**Governing Standard:** Agency Master Quality Gate · Zero-Hallucination Law  
**Applicability:** Mandatory for all AI agents, developers, and data pipelines touching `cityclick.com`.

---

## 1. The Prime Directive
> **A blank is better than a wrong number.**  
> Never invent, estimate, default, or carry over a value from another city. If a required value is missing, the page fails the quality gate and is automatically marked with `<meta name="robots" content="noindex, follow">`. It never receives a placeholder.

---

## 2. Core Operational Scope: The Three Benchmark Flagships
Until directed otherwise by Perry, all fleet-wide programmatic expansion is frozen. 100% of engineering, research, and design effort is dedicated to perfecting the **Three Benchmark Models**:
1. **Austin, Texas (`/tx/austin/`)** — *The High-Growth Tier-1 Tech Metropolis*
2. **Hot Springs Village, Arkansas (`/ar/hot-springs-village/`)** — *The Gated Recreational Lake & Golf Community*
3. **Boise, Idaho (`/id/boise/`)** — *The Mountain West Mid-Sized Boomtown*

**The Crawl Shield:** Every other city page across the 1,501-city catalog is explicitly rendered with `<meta name="robots" content="noindex, follow">` and excluded from the public XML sitemap until it independently passes the complete Quality Gate.

---

## 3. Data Pipeline & Ingestion Rules (`cityclick-data-rules`)

### Rule 1: No Fabrication, No Fallbacks
* Never fill a missing metric with a default, estimate, national average, neighboring city value, or template sample.
* **Required field missing:** Raise an error. The city fails QA and is noindexed.
* **Optional field missing:** Completely hide the component block. Never render empty parentheses `()`, `undefined`, `null`, `N/A`, `pending`, `loading`, or `TBD`.

### Rule 2: Zero Proper Nouns in Templates
* Templates, layout components, and default props must contain **zero hardcoded proper nouns**.
* No city names, airport names/codes, hospital names, school district names, hotel names, or street names may exist as fallback literals in Astro/React/Vue components.
* All proper nouns must be injected strictly from that specific city’s verified data record.

### Rule 3: Single Source of Truth per Metric
* Each metric (population, 5-year growth, median income, base retail rent, property tax rate, sales tax rate, sunny days, elevation, median home price) is computed and stored once in `src/data/cities/{state}.json`.
* Every module across the entire platform (hero header, snapshot cards, deep content tabs, compare showdowns, PDF export templates, and API endpoints) must read that exact same stored field. No module may recompute or override its own copy.

### Rule 4: Mandatory Provenance on Every Number
Every public metric must be anchored to an audited provenance object:
```json
{
  "value": 8.25,
  "unit": "percent",
  "source_name": "Texas Comptroller of Public Accounts",
  "source_dataset": "Municipal Sales & Use Tax Rates",
  "vintage": "2026-Q1",
  "retrieved_at": "2026-10-18T12:00:00Z",
  "method_note": "6.25% State + 1.00% City of Austin + 1.00% CapMetro Transit"
}
```
Any metric lacking provenance cannot be displayed with a "Verified" badge.

### Rule 5: Place-Name Normalization
* Standard: `census_name` -> `display_name` -> `slug` -> `aliases`.
* Strip legal Census suffixes properly:
  - `"Oklahoma City city"` -> `"Oklahoma City"`, NOT `"Oklahoma"`.
  - `"Midwest City city"` -> `"Midwest City"`, NOT `"Midwest"`.
  - Consolidated municipal governments: `"Nashville-Davidson metropolitan government (balance)"` -> `"Nashville"`.
* Slugs are derived strictly from the clean display name. Any legacy or modified slug must receive a permanent 301 redirect.

### Rule 6: Mathematical Plausibility Bounds
Any ingested value outside these bounds halts the build and triggers an audit alert (never silently clamp):
* **Median Household Income:** $20,000 – $250,000
* **Combined Sales Tax Rate:** 0.00% – 11.50%
* **Effective Property Tax Rate:** 0.20% – 4.00%
* **Annual Precipitation:** 2.0 – 80.0 inches
* **Average Summer High:** 60°F – 120°F
* **Elevation Above Sea Level:** −300 ft to 11,000 ft
* **5-Year Population Growth:** −30.0% to +60.0% (Sign must be formatted cleanly; never `+-`)

### Rule 7: Default & Repetition Detection
Fail QA and block indexing if:
* Every industry trade in a city shares the identical saturation status.
* A trade density value matches the national benchmark exactly across all 25 categories.
* A lease breakeven calculation produces identical customer/revenue numbers to another city whose rent differs.
* More than 20 cities share an identical figure for a variable local metric.

### Rule 8: Curated Fact Verification
Hotels, districts, trauma centers, public schools, transit lines, and municipal fees must include a verified source URL and a `checked_at` verification timestamp. If unverified, the card does not render.

### Rule 9: External News & Dispatches
Render only news items with an article-level URL (never a section homepage), a verified publication date, and a confirmed HTTP 200 response. Never synthesize, hallucinate, or rewrite headlines.

---

## 4. The Rendered HTML Quality Gate (`cityclick-page-qa`)
The QA gate evaluates the **rendered HTML**, exactly as seen by users and AI search engines:

1. **`WRONG-CITY`:** The page text must not contain a city, airport, or hospital name belonging to another city (exemptions: explicit comparison targets).
2. **`EMPTY-TOKENS`:** Zero instances of `"()"`, `"( )"`, `"undefined"`, `"null"`, `"NaN"`, `"+-"`, `"Loading..."`, `"pending"`, `"TBD"`, or `href="#"`.
3. **`CONTRADICTION`:** The same metric label must not display different values across different modules or compare pages for that city.
4. **`PLAUSIBILITY`:** Zero values outside Rule 6 boundaries.
5. **`DEFAULTS`:** Zero frozen calculator outputs or uniform benchmark states.
6. **`NAME-SLUG`:** Title and H1 must match the clean normalization table. Slugs must not contain `"balance"` or `"city-city"`.
7. **`PROVENANCE`:** Any metric claiming verification must feature source and vintage.
8. **`BANNED-CLAIMS`:** The phrases *"zero-hallucination"*, *"100% verified"*, or *"ground truth"* are banned from any page that has not passed the full QA gate.
9. **`LINKS`:** Zero internal 404s; zero internal redirects (all links point directly to canonical trailing-slash URLs). External links must return HTTP 200.
10. **`SEO-BASICS`:** Meta titles under 60 characters; unique meta descriptions; absolute `og:image` URLs; zero raw HTML entities (`&amp;`) in titles; canonical URL matches rendered route.

---

## 5. SEO & Answer Engine Optimization (AEO) Standards (`cityclick-seo-standards`)

### URL Structure & Canonical Enforcement
* All URLs strictly end with a trailing slash (`/tx/austin/`).
* Structure:
  - Overview: `/{state}/{city}/`
  - Intent Subpages: `/{state}/{city}/visit/`, `/{state}/{city}/moving-to/`, `/{state}/{city}/business/`
  - Comparisons: `/compare/{cityA}-vs-{cityB}/`

### AEO Plain-Sentence Declarations
In addition to visual cards, each key metric must be stated in a clear, declarative sentence that LLMs can extract verbatim:
> *"Austin's combined sales tax rate is 8.25%, consisting of a 6.25% Texas state sales tax, a 1.00% City of Austin municipal tax, and a 1.00% Capital Metro transit tax (verified 2026-Q1)."*

### Structured Data (JSON-LD)
* `Place` / `City` schema on city guides.
* `BreadcrumbList` on all hierarchical routes.
* `FAQPage` schema on guides where real, sourced questions exist.
* `Organization` schema sitewide.

---

## 6. Decisions Reserved Exclusively for Perry
These high-level product decisions cannot be decided by AI agents:
1. **Primary Platform Positioning:** Business/site-selection first vs. Visitor first vs. 3-way balanced.
2. **Lead Magnet Gate:** Require an email address to download the 6-Page Institutional Feasibility Dossier (with 1-page cheat sheet free) vs. 100% ungated.
3. **E-E-A-T Authorship Attribution:** Naming Perry Belcher & key leadership on About/Methodology vs. corporate imprint.

---

## 7. Automated Build & CI Integration
* `npm run qa` executes `scripts/qa.ts` before every production deployment.
* If any indexable page violates a blocking check, the build aborts immediately.
* A nightly automated audit job crawls published URLs and alerts if any metric drifts or breaks.
