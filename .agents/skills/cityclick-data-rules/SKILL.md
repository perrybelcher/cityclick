---
name: cityclick-data-rules
description: >-
  Enforces CityClick's Zero-Hallucination data pipeline, federal source verification,
  provenance requirements, place-name normalization, and plausibility bounds. Activate
  whenever adding, enriching, auditing, or modifying city JSON data in src/data/cities/,
  sources/sales-tax.json, or scripts/enrich_city.py and scripts/rebuild_verified_cities.py.
---

# CityClick Data Pipeline & Ingestion Rules (`cityclick-data-rules`)

## 1. Prime Directive
- **A blank is better than a wrong number.** Never invent, estimate, round up, default, or carry over a value from another city (especially Austin).
- **Missing required field** (`population`, `medianHouseholdIncome`, `medianHomeValue`, `medianGrossRent`, `name`, `stateCode`): City fails QA and must remain `<meta name="robots" content="noindex, follow">` and excluded from `sitemap.xml`.
- **Missing optional field**: Hide the component block completely. Never render `—`, `()`, `undefined`, `null`, `N/A`, `pending`, `loading`, or `TBD`.

## 2. Approved Primary Data Sources (Zero Google Places)
Do **not** call Google Places (daily quota exhausted) and do **not** run `scripts/build_national_fleet.py` (fabricates numbers). Use only these deterministic primary sources:

1. **Demographics, Housing & Property Tax Proxy**:
   - US Census Bureau ACS 2023 5-Year Summary File (`B01003` population fallback, `B19013` median household income, `B19301` per-capita income, `B01002` median age, `B25077` median home value, `B25064` median gross rent, `B25103` median real estate tax paid; effective rate = `B25103 / B25077`).
   - US Census Population Estimates (`sub-est2023` / `popest.csv` `SUMLEV=162`) for April 2020 to July 2023 population & `%` change where available. Note: unincorporated CDPs (like Hot Springs Village) are not in `SUMLEV=162`—omit `popChange2020to2023Pct` and hide the change badge rather than rendering `—`.
2. **Small-Business Trade Density**:
   - US Census ZIP Code Business Patterns 2022 (`zbp22detail.zip`) paired with ACS 2023 ZCTA population (`860Z200US{zip}`) for same-universe per-10k density vs. national ZBP benchmark. Always disclose that density is ZIP-area aggregated, not strict municipal limits.
3. **Climate Averages**:
   - Open-Meteo Historical Weather API (ERA5 reanalysis, 2015–2024 daily averages: July daily max, January daily min, mean annual precipitation inches).
4. **Terrain & Elevation**:
   - USGS 3D Elevation Program (3DEP Point Query Service) at the Census Gazetteer internal point.
5. **Municipal Drinking Water**:
   - U.S. EPA Safe Drinking Water Information System (SDWIS Envirofacts) active Community Water System (`CWS`, activity `A`), storing `pwsid`, `providerName`, `populationServed`, `sourceType`, `sourceUrl`, and `retrieved` date. If ambiguous, require explicit `--pwsid` human confirmation.
6. **Airports**:
   - OurAirports (`scheduled_service == "yes"`), storing official airport `name`, `iata`, `lat`, `lng`, `distanceMiles` (straight-line Haversine distance from the U.S. Census Gazetteer internal point), `source`, `sourceUrl`, and `retrieved` date. Never invent drive times, transit routes, or rideshare availability.
7. **Hospitals with Emergency Departments**:
   - CMS Care Compare Hospital General Information (`xubh-q36u`), filtering `emergency_services == "Yes"`. Render the full list of CMS ER hospitals (`erHospitals` + `erHospitalsSource`). **Never** claim trauma levels, rankings, "primary", "best", or "nearest".
8. **Sales Tax**:
   - Primary state revenue/comptroller documentation recorded in `sources/sales-tax.json` with exact `state`, `local`, `source`, `url`, and `asOf` date. Never copy a state default.

## 3. Place-Name Normalization & Plausibility Bounds
- Strip legal Census suffixes cleanly:
  - `"Oklahoma City city"` -> `"Oklahoma City"` (never `"Oklahoma"`)
  - `"Boise City city"` -> `"Boise"`
  - `"Nashville-Davidson metropolitan government (balance)"` -> `"Nashville"`
- Halt and audit if any metric falls outside plausibility bounds (`RULEBOOK.md` Rule 6):
  - Median Household Income: `$20,000 – $250,000`
  - Combined Sales Tax Rate: `0.00% – 11.50%`
  - Effective Property Tax Rate: `0.20% – 4.00%`
  - Annual Precipitation: `2.0 – 80.0 inches`
  - Avg Summer High: `60°F – 120°F`
  - Elevation: `-300 ft – 11,000 ft`
  - Population Change: `-30.0% – +60.0%` (never `+-`)
