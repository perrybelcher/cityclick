# Component contracts — fail closed

## 1. How to read this file

1. Paths below are relative to ONE selected object in `src/data/cities/tx.json`, not relative to the JSON array. The route chooses that record and calls `buildCityView(record)` once.
2. `i` always means the original `industries` array index; `j` always means the original `erHospitals` index. Sorting must not rewrite indexes or provenance paths.
3. Never add a city-specific default or literal. Never import raw city JSON in a reusable component. Never use `|| default`, `?? benchmark`, a sibling city, or cached previous values to fill a fact.
4. `undefined`, null, blank required strings, non-finite numbers, and invalid identifiers are NOT data. The adapter accepts only explicitly validated blocks. A valid recorded zero may be displayed only where the schema permits it.
5. HIDE means no wrapper, heading, empty card, chart, source label, dangling anchor, FAQ answer, or schema answer for that block. Do not render an apology placeholder.
6. STOP before broadening this matrix. Only the data owner can supply new data/provenance. Register gaps; do not edit city records as part of template work.

## 2. Validated block contracts

These definitions are normative for every component below. A group is all-or-nothing unless row-level omission is explicitly specified. The adapter is intentionally narrow, not independent certification of the upstream dataset.

| Block / CityView property | Exact record paths required | Validation / HIDE rule |
|---|---|---|
| Identity | `slug`, `name`, `stateName`, `stateCode` | Nonempty names, lowercase two-letter state code, registered pilot slug. STOP page generation if invalid; never guess identity. |
| ACS stats / `stats` | `demographics.medianHouseholdIncome`, `.perCapitaIncome`, `.medianAge`; `demographics.provenance.sourceName`, `.sourceUrl`, `.datasetVintage`, `.verifiedAt` | All three finite positive numbers and provenance required. HTTPS source URL. If any fail, `stats=[]`. ACS provenance does NOT authorize population. |
| PEP population / `population` | `demographics.population`, `.popChange2020to2023Pct`; `demographics.populationProvenance.sourceName`, `.sourceUrl`, `.datasetVintage`, `.referenceDate`, `.changeBasis` | Population nonnegative integer; change finite (negative allowed); all provenance required. Missing one hides BOTH population metrics and their FAQ. The source label is copied exactly, not changed to ACS. |
| Housing / `housing` | `housingAndTaxes.medianHomeValue`, `.medianGrossRent`, `.medianRealEstateTaxPaid`, `.effectivePropertyTaxRatePct`, `.source`, `.sourceUrl` | Value/rent finite positive; taxes/proxy nonnegative. Source must include `ACS YYYY 5-yr`; as-of comes from that match. Any missing/invalid member hides whole housing group and related FAQ. Never read duplicated housing values from `demographics`. |
| Climate / `climate` | `climateNormals.peakSummerHighF`, `.winterLowF`, `.annualRainfallInches`, `.sourceName`, `.sourceUrl` | Temperatures finite, rain nonnegative. Source must contain `YYYY-YYYY average` and `retrieved YYYY-MM-DD`. Any missing member hides all climate metrics/graphic/FAQ. Do not use `executiveTravel.climate` as fallback. |
| Water / `water` | `waterUtility.pwsid`, `.providerName`, `.populationServed`, `.sourceType`, `.source`, `.sourceUrl`, `.retrieved` | All required; population nonnegative integer. Retrieval string supplies as-of; no invented reporting vintage. Hide entire water block on failure. Do not call service population city population. |
| Airport / `airport` | `executiveTravel.primaryAirport.name`, `.iata`, `.distanceMiles`, `.source`, `.sourceUrl`, `.cityCenterMethod`, `.retrieved` | IATA exactly three uppercase letters; distance finite nonnegative; retrieval `YYYY-MM-DD`; all fields required. Hide whole airport card/FAQ on failure. Never use `transitToDowntown` or calculate driving time. |
| CMS directory / `hospitals` | `executiveTravel.emergency.erHospitals`, `.erHospitalsSource`, `.sourceNote`; per row `erHospitals[j].name`, `.address`, `.type`, `.cmsFacilityId` | Source must contain `retrieved YYYY-MM-DD`; editorial sourceNote must exist. Each row needs nonempty identity/address/type and an exactly six-digit STRING facility ID. Drop invalid row, preserving original index. Empty valid rows or missing group fields hides directory. No numeric ID conversion. |
| Tax / `tax` | `permitsAndTax.stateTaxRate`, `.localTaxRate`, `.combinedSalesTaxRate`; `.provenance.sourceName`, `.sourceUrl`, `.datasetVintage`, `.verifiedAt` | Each fraction finite between 0 and .115; component sum must equal combined within 1e-9. Any missing field hides tax cards AND worksheet AND tax FAQ. Never infer missing local tax by subtraction. |
| Trades / `industries` | `industries[i].label`, `.naicsCode`, `.establishments`, `.per10kResidents`, `.usAvgPer10k`; `.provenance.sourceName`, `.sourceUrl`, `.datasetVintage`, `.verifiedAt`, `.evidenceQuote` | NAICS is exactly six digits; establishments nonnegative integer; both densities finite nonnegative. Required provenance plus evidence containing `ZCTA population`. Drop invalid row. Empty rows hides entire section. `status` and `saturationIndex` are never projected. |

### Source and metric format contracts

`SourceNote = {name, url?, asOf, checked?, path}` is derived only from the preceding table. `name` preserves the source string. `checked` is a retrieval/verification date, NOT a new vintage. CMS has no source URL in this record: omit the link; never manufacture it.

`Metric = {label, value, format, path, detail, source}`. Allowed formats: `money`, `number`, `percent`, `temperature`, `inches`. `percent` metrics are already percent-valued; `fraction-percent` HTML bindings are for tax only. Use existing format helpers. Do not silently rebase change periods.

Every printed factual value gets `data-value-path` with its exact record path and `data-format`. Every source has `data-source-path`. Explanatory prose is independently audited against the numeric inventory; adding a naked number is not an escape hatch.

## 3. Every component: props, fields, HIDE and accessibility

### 3.1 CityPage.astro

Props: `{city: CityView, intent: 'overview'|'business'|'moving-to'|'visit'}`.

- Fields: all validated blocks above as delegated by the page recipe; identity fields feed title/h1/breadcrumb/canonical/schema. `CITY_V2_MEDIA[city.slug]` supplies only local media paths/dimensions, not facts.
- HIDE: missing media removes the figure and OG image/ImageObject, leaving text-only hero. Missing data sections and their on-page links disappear. No overview strip when its selected metrics are empty. No empty business/moving jump nav.
- Required shell is not a data block: preview label, scope statement, decision navigation, footer remain. Invalid identity/registration or title >=60 characters is a STOP, not an invitation to shorten a city name.
- A11y: one h1; main landmark; skip link; labeled breadcrumbs; safe escaped JSON-LD. FAQ schema contains exactly the questions/answers in themed disclosure order. No schema-only facts.

### 3.2 IntentNav.astro

Props: `{slug: string, intent: Intent, sticky?: boolean}`; `sticky` defaults false as a presentation option, not factual data.

- Fields: `slug`; route labels are generic UI constants. `cityRoute` enforces registry.
- HIDE: no valid slug means STOP; never link to a guessed city. Shell navigation remains when optional facts disappear.
- A11y: nav label, ordinary anchors, `aria-current=page`; desktop sticky via CSS only. First nav can be sticky; footer nav cannot. Mobile targets >=44px.

### 3.3 LegacyIntent.astro

Props: `{slug: string}`. Fields: `slug`; registered routes only.

- HIDE/STOP: no valid slug means STOP; include only on Overview. No displayed data.
- A11y: factual content/navigation work without it. Maps existing business/biz, moving/live, visit/visiting/travel aliases; preserves unrelated query parameters. It is a client navigation enhancement, NOT an HTTP 301. Server redirect work remains a deployment gap.

### 3.4 Stat.astro

Props: `{metric?: Metric}`. Fields: one validated numeric path from `stats`, `population` or `housing` and that path's source contract above.

- HIDE: absent metric produces no article. Callers must pass adapter-created metrics, not hand-built placeholders. Source required by `Metric`.
- A11y: labeled article with h3, exact formatted value, definition and visible date. Do not rely on font size or color alone. No individual source paragraph; parent provides common Sources.

### 3.5 StatStrip.astro

Props: `{metrics: Metric[], strip?: boolean}`. Fields: same paths as child metrics. `strip=true` is the navy Overview presentation, not a data default.

- HIDE: empty array produces no collection or sources. Remove absent metrics, do not change the meaning of the remaining slots.
- A11y: each child has its own label; source date visible; one deduplicated source disclosure for the group. CSS preserves reading order.

### 3.6 Sources.astro

Props: `{sources: SourceNote[]}` and optional default slot for evidence quotes. Fields: source paths in the block table; trade slot uses `industries[i].provenance.evidenceQuote`.

- HIDE: filter entries missing name, asOf or path; zero valid sources renders nothing, including slot. No fallback source. Deduplicate by exact source path, not name.
- A11y: native details/summary named “Sources”; dates visible outside closed details; source text >=12px. Use this once per data section, not under every card.

### 3.7 SourceNote.astro

Props: `{source: SourceNote}`. Fields: source name/url/vintage/retrieval paths from table.

- HIDE: missing name/asOf/path produces no paragraph. Missing URL hides only the link; missing checked date hides only that optional label. Do not create a URL from a guessed publisher domain.
- A11y: readable source line, named link, ordinary keyboard navigation. This primitive belongs inside Sources.

### 3.8 Airport.astro

Props: `{airport?: CityView['airport']}`. Fields: every `executiveTravel.primaryAirport` contract field.

- HIDE: absent accepted airport removes the whole section, title, IATA card, distance, method and sources.
- A11y: labeled section; name/IATA/distance/method bound to exact paths; miles stated in ordinary text. Always say straight-line from city center, not road mileage or travel time. Visible retrieval date plus exact source disclosure.

### 3.9 TradeTable.astro

Props: `{city: CityView}`. Fields: every valid `industries[i]` contract field; original indexes remain intact.

- HIDE: no valid rows removes entire section. Zero national reference removes that row only from relative chart, NOT full table. No plot if none are eligible. No use of city population, `status`, or `saturationIndex`.
- A11y: semantic figure/caption; HTML text alternative per row; decorative bars hidden from accessibility tree; native full-table disclosure; table caption, scope headers and focusable scroll region. Center line is each trade's national reference; sorting is relative difference. Full provenance/evidence is disclosed per section.

### 3.10 Climate.astro

Props: `{metrics: Metric[]}`. Fields: exactly `climateNormals.peakSummerHighF`, `.winterLowF`, `.annualRainfallInches` plus climate source contract.

- HIDE: if any of those three metrics is absent, no graphic or section. Internal geometry origins/divisors do not supply missing metric values.
- A11y: exact values in HTML; SVG temperature description repeats both labels/values; rain icon aria-hidden and explicitly unscaled; source/as-of outside graphic. No weather forecast.

### 3.11 FactTable.astro

Props: `{metrics: Metric[], caption: string}`. Fields: the four `housingAndTaxes` numeric paths plus housing source contract.

- HIDE: no metrics removes table AND sources. Caller gates the parent heading/section too.
- A11y: caption, scope=row/col, labeled focusable scroll region, visible definitions and dates. Property-tax ratio is not a statutory rate; rent is not an asking-price quote.

### 3.12 Services.astro

Props: `{city: CityView, includeWater?: boolean}`. Fields: full CMS directory contract; full water contract only when includeWater=true.

- HIDE: water and hospitals independently optional. Neither valid means hide section. Invalid hospital row is absent with no placeholder. Heading derives city name from `city.name`. Keep record order; no sorting by quality, distance, or recommendations.
- A11y: CMS list uses ul/li, h4 names under directory h3; exact addresses/types/STRING IDs preserved. Visible retrieval line and exact CMS source in Sources. No nearest/primary/trauma claims.
- IMPORTANT: `executiveTravel.emergency.sourceNote` is an editorial exclusion warning. Require it in the adapter, but do NOT print it or turn the named rejected facility into a list row. Never project `executiveTravel.emergency.nearestTraumaHospital`, `.hospitalAddress`, or `.source` anywhere, including schema. Do not replace CMS rows with the older Google Places listing.

### 3.13 TaxBlock.astro

Props: `{city: CityView}`. Fields: the three `permitsAndTax` fractions and full provenance contract.

- HIDE: invalid/missing accepted tax means no section. No inferred missing component or assumed applicability.
- A11y: combined/state/local labels next to formatted values, source/as-of, explicit jurisdiction/transaction caveat. Numerical fraction converts to percent only for display.

### 3.14 LeaseWorksheet.astro

Props: `{tax: NonNullable<CityView['tax']>}`; parent must gate before invocation. Fields: `permitsAndTax.combinedSalesTaxRate` for model calculation and confirmation; validity also requires BOTH component rates and provenance through the tax block contract.

- HIDE: no valid tax means do not instantiate the form. Never supply a nominal tax fraction. Every financial input starts with no value or placeholder example; tax confirmation starts unchecked.
- User inputs (NOT city facts): area/rent/nnn, wage/hours/burden, overhead/ticket/cogs/days. Group legends: Premises, Staffing, Pricing & costs. Zero must be explicitly entered when appropriate.
- A11y: label/input associations, fieldsets/legends, required controls, per-field error IDs and aria-describedby, first invalid field focus, aria-invalid, live status/result. Checkbox uses a large associated label.
- Calculations: exact rational arithmetic in `lease-quote.ts`; occupancy annual-to-monthly; staffing annualized at fifty-two weeks/twelve months; tax-inclusive ticket divided by one plus the record fraction. No preset open days, rent, NNN, burden, margin or ticket. Cost percentages validated; finite decimal grammar; no exponent inputs.
- Results hidden until all fields pass and tax explicitly confirmed. Any input/change/reset clears numbers and explanation immediately. Output is the user's scenario, not a new sourced city fact; never write it back to JSON. No network submission or persistence.

### 3.15 KeyFacts.astro

Props: `{questions: SourcedQuestion[]}` where each item has `{q,a,source,paths}` generated by the adapter, not by a content model.

- Fields: population pair; household/per-capita incomes; home value/gross rent; property tax paid/proxy; climate trio; tax trio; airport distance/name/IATA/method; water system identity/population, with the same source contracts. No obsolete hospital question is generated.
- HIDE: no supported questions means no section. Themes with no supported questions disappear; first NONEMPTY group opens. Never add filler to force three groups on an incomplete city.
- Themes in order: People & household economics (`demographics.`, `housingAndTaxes.`); Business & tax context (`permitsAndTax.`, `industries.`); Climate, travel & services (`climateNormals.`, `executiveTravel.`, `waterUtility.`).
- A11y: native details, keyboard summary, h3 questions, plain answer text and dates. All current pilot pages have the same three groups; schema order equals DOM answer order. Closed details remain user-discoverable, not hidden schema spam.

### 3.16 Card.astro

Props: `{title?: string, class?: string}` plus default slot. No raw record fields; current caller is Services using the water block.

- HIDE: caller MUST validate/gate the whole Card. The presentation primitive cannot infer whether arbitrary slot content is factual; do not mount an empty Card or pass fallback text.
- A11y: article and optional h3; caller must keep heading nesting sensible. A style-class default is allowed; a factual default is not.

## 4. Changes require evidence

1. Add loss-of-field tests before expanding contracts. Preserve tests for removed/invalid source, missing number, zero, negative change, malformed identifier and zero national reference.
2. Keep `data-value-path`/`data-source-path` audit bindings. No inference from a successful rendered page alone.
3. Run `npm run build`, `npm test`, then `node scripts/qa-austin-v2.mjs` against the local built site. Do not edit `scripts/qa.ts` or city JSON.
4. STOP if QA fails. Fix the implementation or document a real upstream gap; never whitelist an unexplained printed number or delete a regression assertion.
