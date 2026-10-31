---
name: cityclick-page-qa
description: >-
  Runs CityClick's rendered HTML Quality Gate, cross-surface consistency checks,
  TypeScript checks, and visual inspection across Perry's test cities (Austin TX,
  Nashville TN, Hot Springs AR / Hot Springs Village AR) and flagship cities.
  Activate before completing any UI, template, or data change.
---

# CityClick Rendered HTML Quality Gate (`cityclick-page-qa`)

## 1. Mandatory Pre-Completion Verification Sequence
Every code or data change must run and pass:

```bash
npm test
npm run build
npm run qa
```

*(Note: Also run `npm run check` and `npm run audit:provenance` when repairing TypeScript or Zod schema alignment—see `docs/PROJECT_BRIEFING_AND_AUDIT.md` for known baseline issues.)*

## 2. Perry's Core Test Cities & Benchmark Flagships
Always verify changes across **Perry's 3 primary test markets** plus the remaining certified flagships:
1. **Austin, TX** (`/tx/austin/`) — Tier-1 high-growth metro reference
2. **Nashville, TN** (`/tn/nashville/`) — Consolidated metro government (`Nashville-Davidson`) test case
3. **Hot Springs, AR** (`/ar/hot-springs/`) & **Hot Springs Village, AR** (`/ar/hot-springs-village/`) — Mid-sized resort municipality vs. unincorporated gated CDP test case
4. **Boise, ID** (`/id/boise/`), **Tampa, FL** (`/fl/tampa/`), **Scottsdale, AZ** (`/az/scottsdale/`) — Remaining certified indexable flagships

## 3. Ten Rendered-DOM Quality Checks
Evaluate the actual built HTML in `dist/{state}/{city}/index.html` (with `<script>` and `<style>` stripped):

1. **Zero Wrong-City Leaks**: Non-Austin pages must contain zero Austin proper nouns, coordinates (`30.2672, -97.7431`), airports (`AUS`), water PWSIDs (`TX2270001`), hospitals, or PDF links (`tx-austin-feasibility-dossier.pdf`).
2. **Zero Empty/Placeholder Tokens**: Zero instances of `()`, `( )`, `undefined`, `null`, `NaN`, `+-`, `—` (empty value dash), `TBD`, `pending`, `N/A`, `Loading...`, or `href="#"`.
3. **Cross-Surface Metric Parity**: Population, pop change, median household income, median home value, median gross rent, effective property tax rate, combined sales tax rate, and trade saturation statuses must match identically across:
   - `/{state}/{city}/` (Hero pills, 4-fact strips, pillar cards, Key Facts & FAQ, sidebar)
   - `src/data/index-manifest.json` (Homepage, State Directory, Compare page, `/api/v1/cities/{state}/{city}`)
   - Downloadable/printable reports
4. **Component Completeness & Graceful Hiding**: Missing fields hide the entire card/tile cleanly without breaking grid alignment or leaving dead map layers (`0 places mapped` without pins).
5. **Interactive Controls Parity**:
   - Visiting / Moving / Business tab switching updates the main panel, 4-fact strip, right sidebar, and map layer together.
   - Selecting a NAICS trade updates **both** the main establishment density card and the top Doing Business 4-fact strip.
   - Calculators clear stale results on invalid/zero inputs and match initial render on recalculation.
6. **Visual Verification**: Inspect live pages on `http://localhost:4321` at desktop (`1440px`) and mobile (`390px`) widths before declaring work done.
