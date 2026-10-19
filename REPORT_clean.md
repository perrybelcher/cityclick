# Clean unsourced text from live-look pages (grok)

Worktree: /opt/data/home/software/cityclick/.worktrees/live-clean
Branch: austin-live-clean
Did not deploy. Did not call paid APIs. Did not edit src/data/cities/*.json, scripts/qa.ts, or audit/*.

Look kept: dark hero, stat pills, "What brings you to" three-card selector, photo gallery, video, sticky sidebar, dark/colored containers. Text and data blocks only.

## Removed (block by block)

1. Districts to Explore (Austin and Hot Springs Village) and Top Cultural & Culinary Scouting Districts (Tampa), plus the dead `{false ? ...}` leftovers and both Curated Iconic Stays blocks. Those prose claims had no source field.

2. Hardcoded map pins for hotels, districts, schools, trauma centers, and invented civic centers. Badges and notes removed from the popup renderer. Popups now show name + category + address only. Airport pin is kept only when primaryAirport has coordinates. Austin's record has a source and 8.9 miles but no lat/lng, so the Austin map has zero pins. Did not invent coordinates.

3. Invented executiveTravel fallback (12.0 miles, fake climate, Uber/Lyft rideshare, FAA provenance). Airport, climate, elevation, and sales-tax tiles now render only when the record has the field. Topography subtitle reads terrainElevation.topographyClass (Austin: "Balcones Escarpment / Texas Hill Country"). No "Balconies".

4. Healthcare, Safety & School Systems card, including Primary Trauma Facility, nearestTraumaHospital, school copy, and the word Safety in that heading. Cities with erHospitals (Austin only, 10 CMS rows) show "Hospitals with emergency departments in {city} (CMS)" with name, address, type, and the erHospitalsSource line. Other cities: hospital card hidden. FAQ no longer emits the unconfirmed Dell Seton nearest-hospital sentence.

5. Invented drainage-basin line and the homestead / 0% income-tax fallback sentence. Water card retitled from "Water Safety & Emergency 911" to "Water system" and only renders when waterUtility exists.

6. Sidebar visitor card claims: safety, top stays, Curated Stays, Practical Logistics hours/fees, rideshare. Reworded to airport distance, climate, CMS emergency-department list, and water system, each line only if that field exists. Button and card design kept.

7. Moving sidebar school / voter / homestead / electric-grid claims. Now prints median home, median rent, and water provider when those fields exist.

8. Fake Local Partners (Permit Expeditors, Tenant Advisors). Business sidebar no longer claims a 6-page dossier, NNN model, tax refunds, or power plugs.

9. Lease breakeven calculator block. It printed unsourced defaults (1,400 sqft, $8.50 ticket, 28% COGS, $1,200 overhead, $6.50 NNN, $16.50/hr, 120 hours, 18% burden). No verified rent/ticket/labor field exists. Trade picker remains and only swaps Census establishment counts.

10. index.astro marketing claims not on the record (live-music capital, 11 lakes, 9 golf courses, 0% income tax, world-class resorts, trauma centers, curated stays, commercial asking rents, SBA lender data, 2,704 ft). Cards now name the city without those claims. Counts logic untouched. Homepage "6 verified / 1,495 more" matches the 1,501-row manifest.

11. Footer "1,501 American communities" claim removed (Layout.astro). "U.S. median is about 39" removed.

## Changed

- Airport distance label is "straight line from city center". Austin pill shows 8.9 Miles.
- Rent tile label is "Median gross rent (ACS)", not "2-Bed Mkt / Market Asking Rent".
- facts.ts airport fact requires primaryAirport.source. Hospital fact uses erHospitals only.

## Verify

- npm run build exit 0 (last run after the final text edits).
- npm run qa exit 0. Master Quality Gate PASSED with 0 errors. Six flagships pass. Crawl shield on all 1,495 non-flagship pages. qa.ts not edited.

## Austin numbers vs tx.json (dist/tx/austin/index.html, scripts stripped)

Traced to the Austin record:

- 979,882 population; 980K and 979.9K are that figure rounded. +1.9% pop change. $91,461 income. $59,427 per capita. 34.5 median age.
- $512,700 median home ($513K rounded). $1,655 median gross rent. $7,801 median real estate tax. 1.52% effective rate. B25077 / B25103 are the ACS table ids named in housingAndTaxes.source.
- 95°F July high, 42°F January low, 48.7 inches. 2015-2024 and retrieved 2026-10-18 are in climateNormals.sourceName.
- 487 ft is Math.round(487.1). 487.1 ft and 148.5 m are terrainElevation. Topography class string matches the field exactly.
- 8.9 miles, AUS, Austin Bergstrom International Airport.
- 8.25% combined, 6.25% state, 2.00% local.
- Water: PWSID TX2270001, 1,115,323 people served. "Oct 2026" matches waterUtility.retrieved 2026-10-18.
- CMS list: 10 hospitals, addresses and types copied from erHospitals. "2026-10-19" is inside erHospitalsSource. The word "trauma" appears only inside that source sentence ("No trauma level, ranking or nearest-facility claim").
- Industries: 20 trades on the record (not 25). 0 underserved, 17 saturated, 3 balanced. Establishment counts, per-10k, national benchmarks, and saturation indexes match tx.json (coffee 380 / 3.28 / 2.12 / 155). "80%" and "120%" are the page's own status-threshold labels, same wording as before, not a city statistic.
- 911 is the only emergency number shown, and only next to the sourced water sentence.

Not a city fact, and not a claim about Austin:

- Video duration 5:49 and "4K" are the existing video chrome, not a city statistic.
- "100% Free" is the print-button label, not a water-potability claim.
- Homepage "6 verified city guides · 1,495 more in review" equals the 1,501-row manifest. Counts logic was not touched.

Cannot trace, and therefore removed before the final build: U.S. median age 39; footer 1,501-communities sentence; calculator defaults.

## Still unsourced (left on purpose or unsure)

- Photo captions and video titles (Lady Bird Lake, Barton Springs, South Congress, "Capital City") are labels on the gallery the owner asked to keep. They are not sourced fields. Unsure whether captions count as claims. Left them so the look did not change.
- Gallery credit line "Wikimedia Commons & USGS" is not a field on the record.
- "Open-Meteo" and "USGS 3DEP" tile badges are source names, not numbers. Climate source on the record is Open-Meteo. Elevation source is not a field on terrainElevation; the USGS badge was already on the tile.
- Trade status words (saturated / balanced / underserved) and the 80% / 120% threshold sentences are template rules applied to sourced counts.
- nearestTraumaHospital is still on the Austin JSON record and is explicitly contradicted by sourceNote. It is no longer rendered. JSON was not edited, per the task.
- About, methodology, 404, and the lease-calculator tool still contain older marketing sentences (NNN, school zones, "1,501 published"). Task named index.astro and the city page, plus rendered hits of a specific word list. Those pages were not redesigned.
- Schema comments in src/lib/schema.ts still mention Rideshare / CapMetro / Level 1. Comments only, not rendered.
- Airport FAQ source string in facts.ts still says "Google Places API" even for Austin, whose record source is OurAirports. Wording, not a number. Did not invent a new source string.
