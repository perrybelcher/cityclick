# CityClick City Replication Playbook (v0.1, lean)

Audience: a cheaper model replicating the Austin reference to another city. Follow it literally. Austin is the ONLY reference.
Each step is marked **EXISTS** (a tool you can run today) or **TO BUILD** (does not exist yet: STOP and report, do not improvise).

## 0. Hard rules (any violation = STOP and report)
1. A blank is better than a wrong number. Never invent, estimate, default, or copy a value from another city (including Austin).
2. A fact renders only if its record field has a source and an as-of date. A missing field hides the WHOLE block (no "—", no "pending").
3. Never edit `scripts/qa.ts`, `audit/*.py`, or `sources/*.json` thresholds to make something pass. A failing check is information, not an obstacle.
4. Never deploy, never purge cache, never touch another city's data. Deployment is Sophia's job.
5. Components in `src/components/city/` contain zero city names. If you want to type a city name in a component, STOP.
6. Never call Google Places (daily quota is exhausted/limited). Use the federal sources named below.
7. When any step prints `STOP`, copy its output verbatim into your report and stop that city. Do not retry with guessed arguments.

## 1. Pick the city  (EXISTS: manual)
Input: city name + state. Resolve the official place in the Census Gazetteer file `data/census/2023_Gaz_place_national.txt` (inside the zip) to get GEOID (7 digits). If the name matches more than one place, STOP and ask. Do not choose by population.

## 2. Census facts  (TO BUILD: generalize)
`scripts/rebuild_verified_cities.py` currently has seven hardcoded cities. It computes population, income, home value, rent, age, property-tax proxy and trade density from `data/census/`. To onboard city N it must take the GEOID as an argument instead of the hardcoded `CITIES` dict. Until that is done: STOP with `HARNESS_NOT_READY` for new cities. Do not copy Austin's numbers.

## 3. Enrichment  (EXISTS)
Run from repo root. Dry run first, then `--write`. Exit 0 ok, 3 needs human confirmation, 4 verification failure.
```
python3 scripts/enrich_city.py <state>/<slug> --only climate            # automatic
python3 scripts/enrich_city.py <state>/<slug> --only water              # automatic only if unambiguous
python3 scripts/enrich_city.py <state>/<slug> --only hospital           # LISTS CMS ER hospitals; STOPs
python3 scripts/enrich_city.py <state>/<slug> --only airport --iata XXX # IATA chosen by the researcher
python3 scripts/enrich_city.py <state>/<slug> --only tax                # needs an entry in sources/sales-tax.json
python3 scripts/enrich_city.py <state>/<slug> --write                   # saves only if every selected part passed
```
- **Water**: if it prints `WATER_AMBIGUOUS` / `WATER_UNCONFIRMED`, a human confirms the right EPA PWSID and you pass `--pwsid`. Never pick one yourself.
- **Hospital**: do NOT pass a single "primary" hospital as truth. CMS only confirms name, address and that an emergency department exists. The page shows a LIST of ER hospitals with that exact wording. No "trauma", "nearest", "best", "level".
- **Airport**: researcher supplies the IATA of the primary commercial airport. The tool verifies scheduled service in OurAirports and computes straight-line distance from the Census Gazetteer center point. No drive times, no transit, no rideshare text.
- **Tax**: add `sources/sales-tax.json` entry WITH a primary-source URL and date. Combined = state + local, local = ONLY what the source lists. No entry => the tax block is hidden. Never copy a state default.

## 4. Things that stay OFF for every new city (no free sourced data)
Commercial rent, SBA lenders, permit wait times, schools and rankings, hotels, districts, attractions, transit routes, rideshare, news, safety/crime, "trauma level". If a page recipe asks for them, omit the block. Never fill from Austin.

## 5. Page build  (EXISTS after Austin round 2; see docs/PAGE_RECIPES.md, docs/COMPONENT_CONTRACTS.md, docs/DESIGN_SYSTEM.md on branch astra/austin-v2)
Four pages per city: Overview, Business, Moving, Visit. Use only the recipe sections whose fields exist. Optional blocks hide. Required fields (population, income, home value, rent, name, state) missing => the city stays `noindex` and is not in the sitemap.

## 6. Checks  (EXISTS)
```
npm run build            # must exit 0
npm test                 # must exit 0
python3 audit/recompute.py [--base <preview-or-live URL>]     # Census numbers vs source files (exit 1 on any mismatch)
python3 audit/recompute_extra.py                                # water/hospital/airport/tax/climate vs external sources
```
Known gaps in the checks: `recompute_extra.py` still uses Google Places for hospital/airport (quota exhausted) and must be moved to CMS + OurAirports before it can run. `recompute.py` has only seven hardcoded cities. Both TO BUILD for new cities.
Then the owner screenshots the page at 1440px and 390px. Nothing ships without a human looking at it.

## 7. Report (always)
Print: city, GEOID, each enrich part OK/STOP with the verbatim tool output, fields omitted, checks run with exit codes, and the list of GAPS. Never write "done" if any STOP is unresolved.

## 8. Wave plan (owner decides)
Austin (reference) -> Hot Springs Village -> Boise. Only after all three pass and the owner reviews, widen. No bulk runs.

## 9. Known risks to watch (from the audits)
Template carry-over of another city's names; empty tokens (`()`, `undefined`, `+-`); the same metric with two values on one page; labels hardcoded in templates ("Young Professional Core"); ZIP-based business density mislabeled as city competition (label it "ZIP-area density"); consolidated-government names (`Nashville-Davidson ... (balance)`); CDPs whose population series differs.
