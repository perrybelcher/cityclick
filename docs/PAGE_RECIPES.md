# Page recipes — ordered assembly, no improvisation

## 1. Read this before any page work

1. Read `DESIGN_SYSTEM.md` and `COMPONENT_CONTRACTS.md`. Do not copy one screenshot and replace its city name.
2. Select exactly one record by its registered slug. STOP if none or more than one matches. Call `buildCityView` once; do not merge records or carry values from a previous city.
3. Use `CityPage city={city} intent={intent}`. Do not fork a city-specific component. Never add a city-specific default or literal to shared code.
4. Record fields listed below are relative to that selected record. The source suffix tables are exact paths, not permission to use a nearby field with a similar name.
5. Required means the shell cannot be assembled without it. Optional means the ENTIRE data section disappears when its validated block is absent. An optional section is not permission to invent replacement content.
6. Missing any required field within a data block makes the whole block unavailable, except individual trade/CMS rows can be omitted as documented. No “TBD” cards, zero defaults, sourced-looking filler, or repeated numbers.
7. Keep all current preview routes noindexed and excluded from the sitemap. Do not deploy from this task. New city onboarding must explicitly register its route and existing approved local assets outside reusable components.

## 2. Exact provenance paths reused in the tables

Whenever a row below names a provenance key, ALL these paths are required; do not shorten the source contract.

| Key | Exact source paths |
|---|---|
| ACS | `demographics.provenance.sourceName`, `demographics.provenance.sourceUrl`, `demographics.provenance.datasetVintage`, `demographics.provenance.verifiedAt` |
| PEP | `demographics.populationProvenance.sourceName`, `demographics.populationProvenance.sourceUrl`, `demographics.populationProvenance.datasetVintage`, `demographics.populationProvenance.referenceDate`, `demographics.populationProvenance.changeBasis` |
| Housing | `housingAndTaxes.source`, `housingAndTaxes.sourceUrl`; source must carry `ACS YYYY 5-yr` |
| Climate | `climateNormals.sourceName`, `climateNormals.sourceUrl`; name must carry `YYYY-YYYY average` AND `retrieved YYYY-MM-DD` |
| Tax | `permitsAndTax.provenance.sourceName`, `permitsAndTax.provenance.sourceUrl`, `permitsAndTax.provenance.datasetVintage`, `permitsAndTax.provenance.verifiedAt` |
| Trade(i) | `industries[i].provenance.sourceName`, `industries[i].provenance.sourceUrl`, `industries[i].provenance.datasetVintage`, `industries[i].provenance.verifiedAt`, `industries[i].provenance.evidenceQuote` containing `ZCTA population` |
| Airport | `executiveTravel.primaryAirport.source`, `executiveTravel.primaryAirport.sourceUrl`, `executiveTravel.primaryAirport.cityCenterMethod`, `executiveTravel.primaryAirport.retrieved` |
| CMS | `executiveTravel.emergency.erHospitalsSource` containing retrieval date; `executiveTravel.emergency.sourceNote` editorial warning (gate only; not displayed) |
| Water | `waterUtility.source`, `waterUtility.sourceUrl`, `waterUtility.retrieved` |

## 3. Common shell — all four types

Assemble in this exact order around the page-specific middle sections below.

| Order | Section / component | Exact inputs | Required? | What hides / STOP condition |
|---|---|---|---|---|
| A | Metadata / CityPage | `slug`, `name`, `stateName`, `stateCode`; intent; route/site configuration | Required | STOP on invalid identity/unregistered route or title >=60 characters. Do not guess a shorter city name. |
| B | Site header, breadcrumb, slim preview label / CityPage | Same identity; site imprint constant | Required | No data-dependent filler; label remains honest and neutral. |
| C | Hero / CityPage | `name`, `stateName`, `stateCode`; `CITY_V2_MEDIA[slug]` local paths/dimensions | Identity required, media optional | Missing media removes figure, photo caption and image metadata; no remote or neighbor-city substitute. Photo credit is “Photo: project file — license review pending” while rights remain unresolved. |
| D | Intent navigation / IntentNav | `slug`, current intent, `sticky=true` | Required | STOP on invalid route. CSS-only sticky desktop; no sticky footer or mobile overlay. |
| E | Page-specific middle sections | See ordered tables below | Optional data blocks | Remove each unavailable block AND its jump link. |
| F | Key facts / KeyFacts | Supported adapter-generated questions; field map in section 8 | Optional | Empty themes disappear. All questions absent removes whole section and FAQPage schema. First nonempty theme opens. |
| G | Scope and limitations / CityPage | Generic methodology disclosure, no new city facts | Required | Never manufacture a date or numerical claim here. |
| H | Bottom navigation / IntentNav | `slug`, intent, default nonsticky mode | Required | Same route policy as D. |
| I | Footer / CityPage | Configured publisher identity | Required | No fake author credentials or certification. |
| J | Legacy URL enhancement / LegacyIntent | `slug` | Overview only | Omit on other intents. Client migration is not an HTTP redirect. |

Within each optional section: heading → exact values/graphic/table → visible as-of → common Sources disclosure. The worksheet has its specific form layout. Do not add a source paragraph beneath every card.

## 4. Overview recipe

Route intent: `overview`; current entry point is `src/pages/tx/austin/index.astro`. The literal route selection belongs there, NOT in reusable components.

| Middle order | Section → component | Exact numeric/identity record paths | Source contract | Required vs optional / HIDE |
|---|---|---|---|---|
| E1 | City snapshot → StatStrip (`strip=true`) → Stat | `demographics.population`, `demographics.popChange2020to2023Pct`; `demographics.medianHouseholdIncome`; `housingAndTaxes.medianGrossRent` | PEP for first pair; ACS for income; Housing for rent | Optional. Missing PEP removes both population slots. Income requires entire ACS stats block; rent requires entire housing block. Remove absent metrics without substitution. No metrics = no snapshot heading/strip. |
| E2 | Arrival context → Airport | `executiveTravel.primaryAirport.name`, `.iata`, `.distanceMiles` | Airport | Optional. Missing any required airport value/source/method/retrieval removes full card and section. Show straight-line distance from city center and exact method. |
| E3 | Decision pathways → CityPage ordinary links | `slug`; UI copy only | None, no factual values | Required navigation, not a data claim. Links to Business, Moving, Visit; do not add unsourced itinerary/rent/demand facts to link descriptions. |

Important dependencies for E1:

1. ACS stats require `demographics.medianHouseholdIncome`, `demographics.perCapitaIncome`, `demographics.medianAge` and ACS provenance together, even though only income is shown here.
2. Housing requires `housingAndTaxes.medianHomeValue`, `housingAndTaxes.medianGrossRent`, `housingAndTaxes.medianRealEstateTaxPaid`, `housingAndTaxes.effectivePropertyTaxRatePct` and Housing provenance together, even though only rent is shown here.
3. Preserve PEP reference date/change basis; do not call population an ACS survey estimate or confuse it with the trade denominator.

## 5. Business recipe

Route intent: `business`; route entry `src/pages/[state]/[city]/business.astro` selects registered pilot records.

| Middle order | Section → component | Exact record paths | Source contract | Required vs optional / HIDE |
|---|---|---|---|---|
| E1 | In-this-guide navigation → CityPage | Availability of `industries` and `permitsAndTax` accepted blocks | Inherit target block's gate | Optional. No trades AND no tax means no jump nav. Trade link only when valid rows. Worksheet and tax links only with valid tax. |
| E2 | Resident income context → StatStrip → Stat | `demographics.medianHouseholdIncome`, `demographics.perCapitaIncome`; validator also requires `demographics.medianAge` | ACS | Optional; all-or-nothing ACS stats block. No city population substituted for any value or denominator. |
| E3 | ZIP-area density → TradeTable | Each `industries[i].label`, `.naicsCode`, `.establishments`, `.per10kResidents`, `.usAvgPer10k` | Trade(i) | Optional. Drop incomplete rows; none valid = no section. National reference zero = row remains table-only. No valid ratios = no plot. Keep all valid table rows in native disclosure. |
| E4 | Test your lease quote → LeaseWorksheet | `permitsAndTax.combinedSalesTaxRate`; validator also requires `.stateTaxRate`, `.localTaxRate` and component consistency | Tax | Optional. No valid tax = no worksheet. All financial input fields BLANK; confirmation UNCHECKED. User inputs are not record data. |
| E5 | Sales-tax context → TaxBlock | `permitsAndTax.combinedSalesTaxRate`, `.stateTaxRate`, `.localTaxRate` | Tax | Optional; hide entirely on failure. Display fractions as percentages; applicability must be confirmed separately. |

E3 mechanics:

1. Label as ZIP-area employer density. The source's postal ZIP set and statistical ZIP resident denominator are not city limits.
2. Sort the chart by relative difference, not a field named `status`, `saturationIndex`, or an invented opportunity score.
3. Print both stored densities with a centered national reference and directional words. Retain establishments/NAICS in the table.
4. Never recalculate a denominator from `demographics.population`. The recorded evidence quotes carry the ZCTA population and boundary.
5. Keep source/date and complete denominator evidence. No universal national number copied across trades.

E4 mechanics:

1. Premises: `area`, `rent`, `nnn`; Staffing: `wage`, `hours`, `burden`; Pricing & costs: `overhead`, `ticket`, `cogs`, `days`.
2. These are user-authored inputs, not JSON field paths. No hidden defaults or suggested rent values. Explicit zero is allowed only for fields whose validation permits it.
3. Bind the tax fraction from the accepted record and require explicit checkbox confirmation of applicability and tax-inclusive ticket.
4. Validate every field inline. No results when any field or confirmation is missing. A changed input clears all previous results immediately.
5. Results emphasize transactions per open day, monthly net revenue and fixed costs, with plain-language break-even explanation and no demand guarantee.

## 6. Moving recipe

Route intent: `moving-to`; route entry `src/pages/[state]/[city]/moving-to.astro`.

| Middle order | Section → component | Exact record paths | Source contract | Required vs optional / HIDE |
|---|---|---|---|---|
| E1 | In-this-guide navigation → CityPage | Availability of accepted housing, climate, water, CMS blocks | Inherit target gates | Optional. No available target = no nav; omit each unavailable target's link. |
| E2 | Housing values, rents and taxes → FactTable | `housingAndTaxes.medianHomeValue`, `.medianGrossRent`, `.medianRealEstateTaxPaid`, `.effectivePropertyTaxRatePct` | Housing | Optional, all-or-nothing. No housing source/numeric member = no heading/table/sources. Do not substitute duplicated `demographics` housing fields. |
| E3 | Income and age → StatStrip → Stat | `demographics.medianHouseholdIncome`, `.perCapitaIncome`, `.medianAge` | ACS | Optional, all-or-nothing stats group. |
| E4 | Climate → Climate | `climateNormals.peakSummerHighF`, `.winterLowF`, `.annualRainfallInches` | Climate | Optional, all-or-nothing. Shared-degree SVG endpoints and separate annual precipitation. No forecast, station-normal relabeling or travel-date claim. |
| E5 | Services → Services (`includeWater=true`) | Water: `waterUtility.providerName`, `.pwsid`, `.sourceType`, `.populationServed`; CMS rows: `executiveTravel.emergency.erHospitals[j].name`, `.address`, `.type`, `.cmsFacilityId` | Water and CMS independently | Optional. Missing water hides only water card. Missing CMS group or zero valid rows hides directory. Both unavailable = no services section or jump link. |

Housing definitions are content requirements, not decorative text: owner-reported home value is not a current listing; gross rent is not a bedroom-specific asking rent; ratio of median taxes paid to median home value is not a statutory rate or expected parcel bill.

For E5, display the sourced CMS LIST in record order with retrieval date. Never display `executiveTravel.emergency.nearestTraumaHospital`, `.hospitalAddress` or `.source`. The separate `sourceNote` warns against the prior single-hospital listing; it is not a list item or medical recommendation.

## 7. Visit recipe

Route intent: `visit`; route entry `src/pages/[state]/[city]/visit.astro`.

| Middle order | Section → component | Exact record paths | Source contract | Required vs optional / HIDE |
|---|---|---|---|---|
| E1 | Arrival context → Airport | `executiveTravel.primaryAirport.name`, `.iata`, `.distanceMiles` | Airport (including `.cityCenterMethod` and `.retrieved`) | Optional. Any missing contract field removes all airport content. No “minutes downtown,” taxi price or road-mileage calculation. |
| E2 | Climate → Climate | `climateNormals.peakSummerHighF`, `.winterLowF`, `.annualRainfallInches` | Climate | Optional. Missing any metric/source/date removes graphic/heading. |
| E3 | Services → Services (`includeWater=false`) | `executiveTravel.emergency.erHospitals[j].name`, `.address`, `.type`, `.cmsFacilityId` | CMS | Optional. Invalid rows omitted; no valid list/source/retrieval = no section. Water card not part of this intent even if its record exists. |

Directory title is assembled from `city.name`: “Hospitals with emergency departments in {city.name} (CMS)”. Do not use nearest, primary, trauma-designation, rankings or suitability language as a claim. The exact stored CMS source includes its own limitations; preserve that source text.

No attraction list, hotel list, restaurant recommendation, invented itinerary, opening hours, transit time or travel-cost estimate is authorized by this recipe. Existing unrelated fields in the raw JSON do not automatically authorize new blocks.

## 8. Common KeyFacts mapping

Use the same supported question pool on all four pages. Native disclosures organize it; never hand-write city-specific FAQ answers. Keep DOM/schema order identical.

| Theme | Exact fact paths used by answers | Required source | HIDE |
|---|---|---|---|
| People & household economics | `demographics.population`, `demographics.popChange2020to2023Pct` | PEP, including reference/change dates | Omit population question when population pair invalid |
| Same theme | `demographics.medianHouseholdIncome`, `demographics.perCapitaIncome` | ACS; medianAge still required by group schema | Omit income question when ACS group invalid |
| Same theme | `housingAndTaxes.medianHomeValue`, `housingAndTaxes.medianGrossRent` | Housing | Omit housing question when housing group invalid |
| Same theme | `housingAndTaxes.medianRealEstateTaxPaid`, `housingAndTaxes.effectivePropertyTaxRatePct` | Housing | Omit property-tax question when housing group invalid |
| Business & tax context | `permitsAndTax.combinedSalesTaxRate`, `permitsAndTax.stateTaxRate`, `permitsAndTax.localTaxRate` | Tax | Omit tax question when tax invalid |
| Climate, travel & services | `climateNormals.peakSummerHighF`, `climateNormals.winterLowF`, `climateNormals.annualRainfallInches` | Climate | Omit climate question when climate invalid |
| Same theme | `executiveTravel.primaryAirport.name`, `.iata`, `.distanceMiles`, `.cityCenterMethod` | Airport | Omit airport question when airport invalid |
| Same theme | `waterUtility.providerName`, `.pwsid`, `.sourceType`, `.populationServed` | Water | Omit water question when water invalid |

A theme with no remaining questions disappears. Do not add unsourced filler to reach three themes. First remaining theme opens. Question sources/dates remain accessible, including when the source disclosure is closed.

## 9. Exact local verification workflow

Run from the worktree root. No deploy and no city-data edits.

1. `npm run build` must exit 0. Save real output, not a simulated summary.
2. `npm test` must exit 0. The suite covers every new required airport/population/CMS field, missing rows, invalid identifiers, chart geometry, original calculator invariants and generic components.
3. The local `.qa-tools` directory must contain Playwright and axe-core. If missing, install them locally: `npm install --prefix .qa-tools --no-save playwright axe-core` (no paid API).
4. Install the matching browser ONLY inside this worktree: `PLAYWRIGHT_BROWSERS_PATH="$PWD/.qa-tools/browsers" TMPDIR="$PWD/.qa-tools/tmp" node .qa-tools/node_modules/playwright/cli.js install chromium --only-shell` (create `.qa-tools/tmp` first if absent).
5. In a separate foreground terminal, serve the build locally: `python -m http.server 4387 --bind 127.0.0.1 --directory dist`. This is a local static preview, not a deployment.
6. Run `node scripts/qa-austin-v2.mjs`. It binds browser/temp storage to `.qa-tools`, forbids external browser requests, checks all four exact routes, and must exit 0. If you change the port, set `PREVIEW_URL` to that local origin.
7. Inspect `qa-artifacts/austin-v2-results.json`, real command logs and all screenshots. Expected standard screenshot names: `overview-1440.png`, `overview-390.png`, `business-1440.png`, `business-390.png`, `moving-to-1440.png`, `moving-to-390.png`, `visit-1440.png`, `visit-390.png`. Additional 360px and expanded/calculated states are useful regression evidence, not replacements.
8. Open the full table, Sources, FAQ groups; use keyboard; try blank input, unconfirmed tax, valid fictional calculator fixtures, changed rent, invalid margin and reset. Do not leave fictional fixture values in page defaults or screenshots labeled as initial state.
9. STOP if any number lacks an explicit record source or user-input formula. Do not weaken the audit inventory, change protected `scripts/qa.ts`, or add a broad whitelist.
10. Log unrelated repository-wide `npm run check` failures separately; never claim that command passed because the required build passed. Screenshot capture is not human visual approval.
11. Record gaps and uncertainties, then commit only intended source/docs/test changes on the assigned branch. Screenshots/logs in `qa-artifacts` are local ignored evidence unless explicitly added by the owner.
