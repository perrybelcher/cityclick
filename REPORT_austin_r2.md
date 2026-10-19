# Austin V2 — round 2 report

Worktree: /opt/data/home/software/cityclick/.worktrees/astra-austin
Branch: astra/austin-v2
Commit message: Austin V2 design round 2 (astra)

## Scope and outcome

Implemented the shared reference design upgrade, new sourced record blocks, mechanical documentation and stronger QA. No deployment, paid API calls, new/downloaded/generated imagery, or edits to scripts/qa.ts or src/data/cities/*.json.

The task document requested a report outside the worktree at /opt/data/cache/scratch/astra/REPORT_austin_r2.md, but the direct instruction limited work to this worktree. This report is intentionally at the worktree root instead; no external report file was written.

Required gates: npm run build EXIT 0; npm test EXIT 0; node scripts/qa-austin-v2.mjs EXIT 0. Real output is reproduced below. All four exact local routes returned HTTP 200, retained noindex/self-canonical metadata and passed accessibility/source audits. This is a local reference artifact, not an indexing or visual-publication approval.

## Review checklist — item by item

1. Identity and hierarchy: navy ink, warm rust accent, teal/purple data pair, warm decision/worksheet bands, pale climate band, navy Overview strip, subtle card shadows and a shared type scale. Local system fonts/Georgia only. Existing structural city.css is preserved, with a documented city-r2.css reference layer imported after it. No client framework or chart dependency added.
2. Data visualization: Business has sorted relative-density CSS bars centered on each trade’s own national value, exact density text alternatives and a collapsed full table. Geometry is computed only from stored density values; no demand scores or fabricated axis labels. Climate has data-dependent inline SVG temperature endpoints on a shared degree scale, exact July/January values and a separate unscaled rainfall icon/total. Overview has a clean sourced stat strip. Source/as-of context accompanies each graphic.
3. Trade table: industry column widened to 46%, readable type, sticky navy header, zebra rows, tabular numerals and labeled keyboard-focusable scroll region. Full original classifications/counts/densities remain available in a native disclosure.
4. Calculator: Premises / Staffing / Pricing & costs fieldset cards, strong primary action, large daily break-even result, revenue/fixed-cost results and a plain-English explanation. Field-specific errors, focus and aria-invalid are exercised. All financial inputs remain blank, no placeholders/presets/benchmarks; tax comes only from the accepted record and requires explicit confirmation. Exact arithmetic and clear-on-change/reset remain intact.
5. Sources: shared per-section Sources disclosures, exact source labels, visible as-of lines, readable source text and appropriately sized links. Dates are not hidden with source disclosures. CMS source has no fabricated link.
6. Key facts: three themed native details groups, first nonempty theme open. Full supported question pool is shared across intents and matches FAQ schema order. Missing groups disappear rather than receiving filler.
7. Preview and photo notices: slim neutral “Research preview · Not for indexing” label; caption exactly “Photo: project file — license review pending”. Honest noindex state retained.
8. Navigation and mobile: CSS-only desktop sticky intent nav, nonsticky bottom nav, stacked mobile layouts, no page overflow at 360/390/1440px, >=44px visible interaction targets. Full-table horizontal scrolling is isolated inside its own region.
9. Imagery: reused only the existing local skyline assets. No photo API, downloads or generation. Missing media now removes the image block and image metadata rather than breaking the page or borrowing another city’s photo.

## New record blocks

- Overview and Visit: airport name/IATA, exact recorded straight-line distance, city-center method, source and retrieval date. No driving or transit-time claim.
- Population/change: exact Population Estimates Program label, vintage, reference date and change basis; no ACS fallback. Population metrics are in the Overview strip and supported FAQs; negative change and explicit zero behavior are tested.
- Moving and Visit: complete valid CMS emergency-department list, in record order, with names, addresses, types, STRING facility IDs, source and retrieval date. No ranking or medical-routing claim. Obsolete single-hospital fields are never projected or rendered; the editorial sourceNote is treated as an exclusion warning, not a hospital entry.
- Missing/invalid required fields fail closed. Additional tests cover every new required contract field, malformed IDs, blank strings, empty records, chart zero-reference/equal-value behavior and absence of city literals in reusable components.

## Documentation

- docs/DESIGN_SYSTEM.md: exact semantic tokens and usage rules, type/spacing/breakpoints, chart algorithms, component catalogue and release checklist.
- docs/COMPONENT_CONTRACTS.md: props, exact record/source field paths, all-or-nothing vs row-level omission, HIDE/STOP rules and a11y for every Astro component in the city folder.
- docs/PAGE_RECIPES.md: ordered common shell plus Overview/Business/Moving/Visit tables, exact fields/provenance, required vs optional sections, disappearance behavior and reproducible QA steps.
- A mechanical catalogue check found all 16 Astro components documented; none missing.

## Files changed

- REPORT_austin_r2.md
- docs/COMPONENT_CONTRACTS.md
- docs/DESIGN_SYSTEM.md
- docs/PAGE_RECIPES.md
- scripts/qa-austin-v2.mjs
- src/components/city/Airport.astro
- src/components/city/CityPage.astro
- src/components/city/Climate.astro
- src/components/city/FactTable.astro
- src/components/city/IntentNav.astro
- src/components/city/KeyFacts.astro
- src/components/city/LeaseWorksheet.astro
- src/components/city/Services.astro
- src/components/city/SourceNote.astro
- src/components/city/Sources.astro
- src/components/city/Stat.astro
- src/components/city/StatStrip.astro
- src/components/city/TaxBlock.astro
- src/components/city/TradeTable.astro
- src/components/city/city-r2.css
- src/lib/city-charts.ts
- src/lib/city-v2.ts
- tests/city-r2.test.ts
- tests/city-render.test.ts
- tests/city-v2.test.ts

## Real verification output

### npm run build — exit 0 (final output tail)

```text
01:13:12 ▶ src/pages/privacy.astro
01:13:12   └─ /privacy/index.html (+1ms)
01:13:12 λ src/pages/sitemap.xml.ts
01:13:12   └─ /sitemap.xml (+3ms)
01:13:12 ▶ src/pages/terms.astro
01:13:12   └─ /terms/index.html (+1ms)
01:13:12 ▶ src/pages/tools/lease-calculator.astro
01:13:12   └─ /tools/lease-calculator/index.html (+2ms)
01:13:12 ▶ src/pages/tx/austin/index.astro
01:13:12   └─ /tx/austin/index.html (+8ms)
01:13:12 ✓ Completed in 8.29s.

01:13:12 [build] Rearranging server assets...
01:13:12 [build] Server built in 13.29s
01:13:12 [build] Complete!
```

### npm test — exit 0

```text
npm notice run cityclick@1.0.0 test
npm notice run vitest run

 RUN  v3.2.7 /opt/data/home/software/cityclick/.worktrees/astra-austin

 ✓ tests/saturation.test.ts (5 tests) 7ms
 ✓ tests/breakeven.test.ts (2 tests) 8ms
 ✓ tests/scores.test.ts (5 tests) 6ms
 ✓ tests/city-render.test.ts (2 tests) 55ms
 ✓ tests/city-v2.test.ts (8 tests) 74ms
 ✓ tests/city-r2.test.ts (28 tests) 117ms

 Test Files  6 passed (6)
      Tests  50 passed (50)
   Start at  01:13:42
   Duration  670ms (transform 604ms, setup 0ms, collect 1.05s, tests 267ms, environment 2ms, prepare 632ms)
```

### node scripts/qa-austin-v2.mjs — exit 0

```text
PASS page: {"route":"/tx/austin/","titleLength":37,"descriptionLength":128,"exactValuesChecked":8,"numericTokensChecked":151,"sourceNotes":11,"htmlGzipBytes":5572}
PASS page: {"route":"/tx/austin/business/","titleLength":33,"descriptionLength":139,"exactValuesChecked":126,"numericTokensChecked":446,"sourceNotes":30,"htmlGzipBytes":12514}
PASS page: {"route":"/tx/austin/moving-to/","titleLength":39,"descriptionLength":143,"exactValuesChecked":52,"numericTokensChecked":208,"sourceNotes":12,"htmlGzipBytes":6587}
PASS page: {"route":"/tx/austin/visit/","titleLength":42,"descriptionLength":146,"exactValuesChecked":47,"numericTokensChecked":166,"sourceNotes":10,"htmlGzipBytes":5911}
PASS calculator: blank start, missing input, golden fixture, changed rent, invalid margin, reset; no stale outputs
PASS legacy migration: all query/hash aliases, tracking preservation, ordinary fragments and unknown tabs
PASS JavaScript-off: factual content and navigation on all four routes
PASS noindex/sitemap consistency
Austin V2 browser + source audit PASSED
```

The final ledger checks 233 exact value bindings and 971 rendered numeric tokens across the four pages, including text inside disclosures. All numbers in factual text must bind to the source-covered tx.json inventory; calculator outputs are independently tested user-input scenarios, not added city facts. Each route has zero reported axe violations and the browser error list is empty.

Additional checks: git diff --check exited 0. Protected files have no diff. npm run check was run additionally and EXITED 1 with 435 errors, 0 warnings, 13 hints across 59 files. Error locations are in untouched scripts/qa.ts, src/pages/[state]/[city].astro, src/pages/compare/[cityA]-vs-[cityB].astro and tests/breakeven.test.ts. No changed city component/helper/test diagnostics were reported. The required build is successful; the repository-wide typecheck is NOT claimed successful.

Real run logs and audit manifest (local ignored evidence):

- qa-artifacts/build-r2.log
- qa-artifacts/test-r2.log
- qa-artifacts/browser-r2.log
- qa-artifacts/check-r2.log
- qa-artifacts/austin-v2-results.json

## Captured screenshots

All paths below are relative to this worktree and are real PNGs from the final browser run. Standard screenshots are initial blank-calculator/closed-source states. “calculated” screenshots contain explicitly entered fictional QA fixtures, NOT prefilled city assumptions. “expanded” opens source/FAQ/full-table disclosures.

- qa-artifacts/business-1440-calculated.png (1440 × 8082)
- qa-artifacts/business-1440-expanded.png (1440 × 12481)
- qa-artifacts/business-1440.png (1440 × 7682)
- qa-artifacts/business-360.png (360 × 12444)
- qa-artifacts/business-390-calculated.png (390 × 12794)
- qa-artifacts/business-390.png (390 × 11922)
- qa-artifacts/moving-to-1440.png (1440 × 6876)
- qa-artifacts/moving-to-360.png (360 × 10961)
- qa-artifacts/moving-to-390.png (390 × 10602)
- qa-artifacts/overview-1440.png (1440 × 4693)
- qa-artifacts/overview-360.png (360 × 7392)
- qa-artifacts/overview-390.png (390 × 7036)
- qa-artifacts/visit-1440.png (1440 × 5252)
- qa-artifacts/visit-360.png (360 × 8553)
- qa-artifacts/visit-390.png (390 × 8280)

Screenshots were captured and checked for viewport overflow, controls, chart geometry and accessibility programmatically. This CLI session did not provide an image-viewing tool, so no human/visual-model screenshot sign-off is claimed. Open the images for the final visual review before shipping.

## GAPS / data-owner needs

1. Existing skyline publication rights/subject verification remain unresolved. No new photos are required for this implementation. Additional rights-cleared city/neighborhood imagery would be a future enhancement, not something to invent or download in this task.
2. CMS source is a supplied string with retrieval date but no dedicated source URL/dataset release field. The list is rendered from that source exactly; no invented CMS link. A structured CMS source URL/vintage would improve auditability when supplied by the data owner.
3. Airport provenance gives a source/method/retrieval date but no coordinate pair in the accepted block; this implementation does not independently recompute or certify the supplied distance. Do not substitute road mileage.
4. Historical housing/income/climate sources are not current-price or forecast guarantees. No additional current rent, traffic, elevation, hotel, attraction, transit or medical-designation blocks are authorized. They remain omitted.
5. Indexing and photo-rights clearance are still required; noindex stays in place. Static legacy-tab migration is not an HTTP 301; deployment-side redirect handling remains outside this task.
6. Repository-wide typecheck failures in untouched legacy files need separate ownership. Protected scripts/qa.ts was not edited to hide those failures.
7. Human visual review of the captured screenshots is still required before publication. Automated axe/geometry checks are not represented as an eyeball review.

## Uncertainties / deliberate limits

- Shared components are generic and data-driven; the route registry still intentionally limits the pilot. Register additional cities through configuration/data ownership, not literals in components.
- Source adapters preserve the narrow legacy contracts: missing any metric within a grouped source block can hide the whole group. This is intentional fail-closed behavior, documented for replication.
- The raw CMS editorial warning contains rejected historical hospital language; it is required as context but deliberately not printed as a directory entry or medical claim.
- Relative-density chart lengths describe comparative density only. They do not show unmet demand or profitability; zero national reference remains table-only.
- CSS is layered over the existing structural sheet rather than replacing unrelated styles. Import order is part of the documented design contract.

## Preview / reproduction commands

From /opt/data/home/software/cityclick/.worktrees/astra-austin:

```sh
npm run build
npm test
python -m http.server 4387 --bind 127.0.0.1 --directory dist
# In a separate terminal, same worktree:
node scripts/qa-austin-v2.mjs
```

If the local QA dependencies/browser are missing, follow docs/PAGE_RECIPES.md section 9. Browser binaries and runtime scratch are local to .qa-tools. Preview server is loopback only, not deployed or publicly exposed.

Local preview paths while the server is running:

- http://127.0.0.1:4387/tx/austin/
- http://127.0.0.1:4387/tx/austin/business/
- http://127.0.0.1:4387/tx/austin/moving-to/
- http://127.0.0.1:4387/tx/austin/visit/
