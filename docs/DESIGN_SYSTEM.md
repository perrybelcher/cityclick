# CityClick reference design system

## 1. Non-negotiable rules

1. Read `COMPONENT_CONTRACTS.md` before choosing components; then follow `PAGE_RECIPES.md` in order.
2. Render only the validated `CityView` returned by `src/lib/city-v2.ts`. Never add a city-specific default or literal to a reusable component, stylesheet, chart helper, or calculator. Record identity belongs in the record; route/asset registration belongs in `src/data/city-v2.ts`.
3. Missing value, invalid number, missing provenance, or ambiguous geography means HIDE the whole affected block, including heading, chart, source disclosure and anchor link. Never print zero, “TBD,” a neighbor's number, or a remembered value as a replacement.
4. STOP if a proposed fact does not have an explicit contract. Add it to GAPS for the data owner. Do not widen a source's coverage merely because it appears nearby in the JSON.
5. Keep preview pages `noindex, follow` and out of the sitemap until the separate evidence/rights release gate passes. A successful build is not publication approval.
6. No paid APIs, downloaded/generated imagery, webfonts, client frameworks, or chart libraries are required by this template.

## 2. Stylesheet order and scope

`CityPage.astro` imports `city.css` (existing structural foundation) and then `city-r2.css` (reference tokens and design overrides). Keep this order. Neither is a legacy sitewide stylesheet. Do not copy isolated overrides onto another page. Use the shared `CityPage` shell.

### Color tokens

| Token | Value | Use | Never use for |
|---|---|---|---|
| `--canvas` | `#f8f5ef` | Warm page background | Text |
| `--surface` | `#ffffff` | Cards, input fields, nav, table | Decorative city claims |
| `--ink` | `#172e43` | Navy headings, dark strip, primary button, national center line | Clinical priority |
| `--muted` | `#495c69` | Body definitions, captions, dates | Making evidence visually disappear |
| `--action` | `#195d84` | Links and disclosure controls | Data categories |
| `--accent` | `#ad482b` | Warm brand accent, eyebrow text, top rule, focus, summer endpoint | Good/bad business ratings |
| `--warm` | `#f4e5d8` | Decision section and worksheet band | A warning of danger |
| `--band` | `#eaf0f0` | Climate and geography context | Fake geographic boundaries |
| `--viz-above` | `#086d75` | Density above national reference | “Opportunity,” demand, profitability |
| `--viz-below` | `#6551a0` | Density below national reference, winter/rain graphics | “Failure,” “underserved,” clinical meaning |
| `--evidence` | `#08656b` | Supporting evidence accents inherited by foundational elements | Certification badges |
| `--line` | `#cbd5d9` | Dividers and card borders | Text |
| `--error` | `#a62626` | Input validation only | A city risk score |

Dark strips use white numbers and `#dee6eb` supporting text. Do not put muted dark text on navy. Charts always have labels, directional words, and exact numbers; color alone never conveys a result.

### Typography

Root: 17px, line-height 1.6. System UI stack only; headings use local Georgia/Times New Roman/serif.

| Role | Token / CSS | Rule |
|---|---|---|
| Dates, bylines, eyebrow, chart secondary labels | `--text-xs: .765rem` | Approximately 13px; never reduce below 12px |
| Sources, explanatory text, labels | `--text-sm: .875rem` | Approximately 15px; use readable contrast |
| Body, trade table | `--text-base: 1rem` | 17px; full table remains readable |
| Card title | `--text-lg: 1.125rem` | Maintain hierarchy below section heading |
| Page title | `clamp(2.35rem,4.3vw,3.7rem)` | One h1; derived identity, no city literal |
| Section title | `clamp(1.85rem,3vw,2.65rem)` | h2; sentence case |
| Large stats | `clamp(1.9rem,3vw,2.6rem)` | Tabular figures; no re-rounding in components |
| Break-even daily result | `3.8rem` | Only after valid explicit user inputs |

Use `formatMetric`, `number`, and `percent`; do not introduce an abbreviated “K/M” display or unit conversion. Percent-valued population change is already a percent; sales tax is a fraction. Confusing them is a release blocker.

### Spacing, surfaces, breakpoints

| Token | Pixels | Use |
|---|---|---|
| `--s1`, `--s2`, `--s3`, `--s4` | 4, 8, 12, 16 | Internal gaps, controls, compact spacing |
| `--s6`, `--s8` | 24, 32 | Card and band padding |
| `--s12`, `--s16`, `--s20` | 48, 64, 80 | Section rhythm, not arbitrary spacer blocks |
| `--radius` | 16 | Main cards / bands; controls use smaller radii |
| `--shadow` | `0 5px 22px #172e430a` | Subtle surface depth only |

1. Container: maximum 1200px; base width `calc(100% - 48px)`; mobile `calc(100% - 32px)`.
2. Above 1000px: the first intent nav is CSS sticky at 12px with z-index 10. Bottom nav is never sticky. No scroll JavaScript.
3. At/below 1000px: worksheet cards stack, premises/staffing fields may use two columns; navy strip is two columns.
4. At/below 700px: single-column content/cards, two-column intent nav, unrotated hero, stacked chart labels over bars. No full-page horizontal overflow.
5. Every interactive target is at least 44px high; number inputs and primary controls are at least 48px. A checkbox uses its large associated label as the target.
6. Trade table may scroll inside its labeled, keyboard-focusable region. Never hide essential columns or shrink the text to fit.
7. All sources and dates are at least 12px. Per-section `Sources` disclosures reduce visual noise; date labels remain visible when those disclosures are closed.

## 3. Chart rules — implement mechanically

### Trade density

1. Pass validated `city.industries` to `TradeTable`. Keep original array indexes for provenance even after sorting.
2. The full table includes every valid row. The plot excludes rows with a nonpositive national reference, because relative difference is undefined. Do not replace that reference; retain the row in the table.
3. Compute `delta = per10kResidents / usAvgPer10k - 1` for eligible rows. Sort descending by delta; ties by label.
4. Compute `extent = max(abs(delta))` across eligible rows. Place the national reference at 50% of every track. `offset = extent ? delta/extent*46 : 0`; `left = 50 + min(0,offset)`; `width = abs(offset)`.
5. Those computed values control CSS geometry ONLY. Do not display a derived score, percentage, rank, or new benchmark. Printed values are exactly the two record densities via `number()`.
6. Left/purple means below the row's reference; right/teal means above. Text states the direction. Equal values show the center mark. This is not a good/bad classification.
7. Each row has a plain-text alternative: trade name, ZIP-area density, national density, direction. Decorative tracks are `aria-hidden`. The figure caption explains the scale and boundary.
8. Keep the full semantic table in a native `details`, initially closed. Caption, row/column headers, wide industry column (46%), sticky header, zebra rows and tabular numerals are mandatory.
9. Keep every row's full source and denominator evidence in the section Sources disclosure. Dates remain outside it. Do not substitute city population for ZCTA population.
10. STOP if the evidence quote lacks `ZCTA population`; the adapter rejects that row. This is a legacy contract, not permission to manufacture a missing denominator.

### Climate

1. Require all three validated climate metrics and their dated source. Otherwise hide the whole graphic.
2. Plot the low and high as SVG circles on one degree scale. Domain is `[min(0,low,high), max(0,low,high)]`; coordinates run from 24 to 576. The all-equal domain uses a nonzero geometry divisor, never a substituted displayed value.
3. Print only the stored July high, January low and annual rainfall. Colors match the HTML labels. The temperature SVG has an accessible description with both exact temperatures.
4. Explain that the endpoints describe different months, not a daily range. Rain is a separate metric with an explicitly unscaled decorative droplet. Never compare inches to Fahrenheit on one quantitative scale.
5. Source remains the recorded historical reanalysis; never relabel it as station normals or a current forecast.

### Overview strip

Population, change, median household income and median gross rent are textual stats, not a proportional area chart. Keep population's PEP source separate from income/rent's ACS source. Hide absent metrics; do not fill the slot from another field.

## 4. Component catalogue

All components live under `src/components/city/`. Full props and HIDE conditions are in `COMPONENT_CONTRACTS.md`.

| Component | Visual responsibility |
|---|---|
| `CityPage` | Page shell, metadata, hero, ordered sections, scope/footer |
| `IntentNav` | Four ordinary route links; optional desktop sticky mode |
| `LegacyIntent` | Existing query/hash migration only; no visual layer |
| `StatStrip` | Responsive metric collection, optional navy strip, common sources |
| `Stat` | One exact metric, definition and visible date |
| `Airport` | IATA identity card, straight-line distance and method |
| `TradeTable` | Sorted centered CSS chart, accessible full table and evidence |
| `Climate` | Data-dependent inline SVG endpoints and separate rainfall total |
| `FactTable` | Housing definition/value table and section sources |
| `Services` | Optional water record and unranked CMS hospital list |
| `TaxBlock` | Combined/state/local sourced fractions as percentages |
| `LeaseWorksheet` | Premises / Staffing / Pricing & costs cards and results |
| `KeyFacts` | Three themed native disclosures; first nonempty group open |
| `Sources` | Visible as-of line plus section source disclosure |
| `SourceNote` | Exact source label, vintage/date, checked date and optional link |
| `Card` | Presentation wrapper; caller must gate it on valid content |

## 5. Interaction and release checklist

1. All factual content, charts, disclosures and links work without JavaScript. Only calculation and legacy URL migration need scripts.
2. The calculator starts blank, with tax confirmation unchecked and results hidden. No rent benchmarks or presets, including placeholder examples.
3. On invalid submission, show field-specific errors, `aria-invalid`, linked descriptions, focus the first invalid input, and keep results hidden. Clear stale results on input/change/reset.
4. Publish no live-domain change from this worktree. Run build, unit tests and the browser/source audit; capture desktop/mobile and expanded/result states.
5. STOP if a screenshot has unreadable text, overflow, wrong source context, or a misleading scale. Automated geometry/axe checks do not replace a human visual review.
