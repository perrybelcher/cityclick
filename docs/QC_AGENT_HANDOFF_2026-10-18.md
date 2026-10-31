# CityClick functional QC — agent handoff
**Audit date:** 18 October 2026. Fresh HTTP evidence captured 17:01–17:03 UTC; browser interactions checked through 17:08 UTC.

## Verdict
Search is incomplete, state browsing fails on the sampled destinations, and several shared city components still use Austin-specific destinations or records. Some controls show success without performing the promised action. Calculator and report values disagree.

Repair discovery, city identity, and false-success behavior before extending these templates to more cities. This is a public functional review; it is not a complete production, mobile, security, or accessibility certification.

## Scope and test flow
| Step | Test | Result |
|---|---|---|
| 1 | Homepage search: Boston, Austin comma TX, Austin comma MN | Partial. Austin, TX opens Austin; the other tested queries return an unchanged homepage. |
| 2 | Follow Texas breadcrumb; fetch Florida, Idaho and Arkansas directory links | Fail. All four sampled state destinations return the homepage. |
| 3 | Reload Austin; use Save city and reload | Fail. Success alert appears; no saved-state implementation is present in the current handler. |
| 4 | Play Austin tour; switch Visiting, Moving and Doing Business panels | Panels work. Video displays “Video unavailable.” |
| 5 | Move Austin overhead slider up one step and back to its original value | Fail. Identical inputs produce different initial and recalculated outputs. |
| 6 | Open Boise, choose Doing Business, inspect map and a pin, then Compare | Fail. Map shows Austin, the pin is Houndstooth Coffee at 401 Congress Ave, and Compare opens Austin versus Tampa. |
| 7 | Set standalone calculator ticket to zero | Fail. Previous positive breakeven results remain with no invalid-input state. |
| 8 | Inspect public form handlers, PDF, API, comparison, templates, links and assets | Multiple source-confirmed failures below. No production form was submitted. |

HTTP review covered Austin, Tampa, Boise, Hot Springs Village, Moscow ID and Shoreview MN templates, Boston's direct destination, four state routes, shared tools, API, report and sitemap. The sitemap contains 1,501 city routes. This review did not load all those city pages.

## Repair priorities

**P0:** repair before further template rollout. **P1:** repair in the next functional pass. **P2:** presentation and accessibility follow-up. Priorities express product impact, not a security severity rating.

### QC-01 — P0 — Search omits most published cities
**Evidence:** The current homepage script contains a hardcoded list of 24 cities; the current sitemap contains 1,501 city routes. Boston is published at [its own page](https://cityclick.com/ma/boston/), but searching Boston lands at [the query URL](https://cityclick.com/?search=Boston), which returns byte-identical homepage content. Browser testing reproduced the empty result experience. The script writes the search query into the URL but has no implementation to render its results.

**Further source-derived cases:** Austin TX without a comma has no match; Austin, TX submits correctly but has no suggestion; TX offers multiple suggestions yet submission selects Austin. These additional cases were evaluated from the current matching code, not all exercised in the browser.

**Agent instruction:** Search the full published city registry. Use one normalization routine for suggestions and submission. Preserve the query, support city/state variants, show a results list for ambiguous names, and show an explicit no-match state.

**Pass test:** Boston appears and opens the Boston page. Austin TX and Austin, TX return consistent candidates. A state-only query never silently chooses the first city. Every published city ID is represented in search. Query URLs survive refresh with the same result state.

Source: [Homepage](https://cityclick.com/).

### QC-02 — P0 — State directories lead back to the homepage
**Evidence:** [Texas](https://cityclick.com/tx), [Florida](https://cityclick.com/fl), [Idaho](https://cityclick.com/id) and [Arkansas](https://cityclick.com/ar) returned HTTP 200 and the exact homepage body. The Texas breadcrumb was tested in the browser. Four destinations were checked; the remaining state links need regression coverage.

**Agent instruction:** Implement a genuine state directory using the published registry.

**Pass test:** Each of the 51 displayed state/DC links has an appropriate heading, title, canonical URL and city inventory. Texas contains Texas cities. Check both direct loading and navigation from the homepage.

### QC-03 — P1 — Unknown paths pretend to be valid pages
**Evidence:** A fresh unique nonexistent path returned HTTP 200 and the same homepage. This can conceal bad links from status-only checks.

**Agent instruction:** Return HTTP 404 for an unknown page, with useful city-search navigation.

**Pass test:** A new nonexistent URL returns 404, and no valid published city route falls into that handler.

### QC-04 — P0 — Other cities show Austin's business map
**Evidence:** Current Tampa, Boise, Moscow and Shoreview map markup centers on 30.2672, -97.7431 and selects the Austin venue array. On [Boise](https://cityclick.com/id/boise/), the rendered map visibly labels Austin. Clicking a pin opens Houndstooth Coffee, 401 Congress Ave.

The Austin page claims 218 shops are mapped but exposes 12 pins. Boise claims 51 mapped shops and exposes the same 12 Austin pins. Census establishment totals and geocoded map inventory are different measures.

**Agent instruction:** Bind the map center, venue coordinates, names and inventory to the selected city ID. Render a clear empty state when local venues are unavailable. Separate total establishments from available map records.

**Pass test:** Every marker belongs to the stated geography, with the intended treatment of nearby places made explicit. The rendered marker count matches the map inventory label. Boise contains no default Austin records.

### QC-05 — P0 — Other cities download Austin's dossier
**Evidence:** Current report form handlers on Tampa, Boise, Hot Springs Village, Moscow and Shoreview all open [the Austin PDF](https://cityclick.com/reports/tx-austin-feasibility-dossier.pdf). Their surrounding copy promises a report for the current city. This was established from served handlers; those production forms were not submitted.

**Agent instruction:** Resolve a report through the current city record. Show report unavailability when the correct file does not exist.

**Pass test:** City page ID, report URL, PDF title, location-specific content and data version agree. A missing report never falls back to Austin.

### QC-06 — P0 — Forms report receipt without sending the request
**Evidence:** The [API request](https://cityclick.com/developers/) handler prevents submission and displays a key-provisioning success alert. The [partner application](https://cityclick.com/partners/join/) does the same with an application-submitted message and a review promise. No request or persistence call accompanies either served handler.

**Agent instruction:** Send the request to the intended service. Show receipt only after durable acknowledgment. If these workflows are unfinished, present their actual availability.

**Pass test:** In staging, one submission produces one retrievable record. A failed request shows an error, preserves user input, and never displays success. Do not test this by inserting fake production applications.

### QC-07 — P1 — Save city is an alert-only control
**Evidence:** Clicking Save city on [Austin](https://cityclick.com/tx/austin/) displayed a saved-to-shortlist alert. The current handler contains only that alert. Reloading did not produce a visible saved state.

**Agent instruction:** Define local or account persistence, display saved status, and provide a saved-city list plus removal.

**Pass test:** Save, reload, navigate away and return; the documented saved state survives. Remove reverses it. Storage failure never claims a save.

### QC-08 — P1 — The report email field collects no email
**Evidence:** The Austin report handler prevents submission and opens a public PDF; it does not transmit the entered email. The PDF is a real accessible file.

**Agent instruction:** For the present free-resource strategy, make this a direct download. If collection becomes intentional, implement a clearly described opt-in and durable record.

**Pass test:** A direct download needs no email. A later collection flow must accurately disclose and perform the intended action.

### QC-09 — P1 — Report shortcut has no matching target
**Evidence:** The shared header links to /tx/austin#report, but Austin's current HTML contains neither an ID nor a named anchor called report.

**Agent instruction:** Link to an existing report component and use the current city where the navigation promises that city's report.

**Pass test:** The shortcut brings the report into view from another page and from a fresh page load. Its destination does not depend on a missing fragment.

### QC-10 — P1 — Compare drops the city being viewed
**Evidence:** Boise, Hot Springs Village, Moscow and Shoreview all link to [Austin versus Tampa](https://cityclick.com/compare/tx-austin-vs-fl-tampa). Clicking Compare on Boise reproduced that route.

**Agent instruction:** Start a comparison with the current city selected and let the visitor choose another.

**Pass test:** Clicking Compare on Boise produces a result containing Boise. Direct links encode the chosen cities and survive refresh.

### QC-11 — P1 — Austin video cannot play
**Evidence:** The current Austin tour displays “Video unavailable” in the YouTube player. Its thumbnail URL returned HTTP 404. Boise and Hot Springs Village thumbnail checks succeeded; that is not a playback test for those two videos.

**Agent instruction:** Replace the broken video reference with a verified, embeddable video. Provide a useful fallback when playback fails. Validate the video's actual subject and any displayed title or duration.

**Pass test:** Preview loads, activation plays the expected Austin video, and an unavailable video receives an accurate fallback.

### QC-12 — P1 — News links do not reach the promised stories
**Evidence:** Tampa, Boise, Moscow and Shoreview each have four headline links with href="#", which open the city page again. Austin's nine headline links lead to publisher homepages or category pages; Hot Springs Village's eight lead to broad organization or event/governance pages. This does not establish that the described events are false; it establishes that the displayed links do not provide their specific evidence.

**Agent instruction:** Require an exact source URL, publication date, event date where applicable, and city association before publishing a news card. Display unavailable coverage when no verified item is present.

**Pass test:** Every headline opens its supporting article or primary notice. No live news item uses an empty fragment. Source records support the title and date.

### QC-13 — P1 — Consultation and property buttons open provider signup
**Evidence:** Request Consult and View Available Spaces on all six sampled templates link to the provider application page.

**Agent instruction:** Route each action to the task named by the button.

**Pass test:** A visitor can request the displayed service or view the stated inventory without entering provider enrollment.

### QC-14 — P0 — Calculator results change with identical inputs
**Evidence:** On Austin, the initial default calculation differs from the result after changing monthly overhead from $1,200 to $1,250 and back to $1,200.

| Output | First render | Same inputs after recalculation |
|---|---:|---:|
| Daily customers | 94 | 93 |
| Monthly net revenue | $22,460 | $22,015 |
| Monthly fixed costs | $16,170 | $15,851 |

The script registers input listeners without running the initial calculation. The present 1,400-square-foot scenario produces exact fixed expenses of $15,850.801147.

The standalone tool defaults to 1,500 square feet. Its $22,460 initial revenue rounds to $22,461 through its own formula. Different floor-area scenarios are legitimate when stated clearly; they must not be mixed.

On Boise, the visible base-rent label says $40.80, but the range input's exposed value is 41. Check numeric step precision and alignment of input values with displayed labels.

**Agent instruction:** Use one calculation function for initial render, interaction, API scenarios and PDF export. Preserve decimal input precision.

**Pass test:** Moving any input away and back yields the initial result. Matching scenarios produce matching outputs across every surface. Run the test with fractional rents.

### QC-15 — P1 — Invalid calculator inputs leave valid-looking answers
**Evidence:** Setting Average Gross Ticket to 0 in the [standalone calculator](https://cityclick.com/tools/lease-calculator/) leaves 94 customers and $22,460 revenue displayed. The source updates results only when contribution margin is positive and has no invalid-result branch. A 100% COGS input has the same source-level problem.

The tools describe customers per operating day but divide by 30.4375 calendar days without an operating-days control.

**Agent instruction:** Validate inputs, clear stale outputs, and show an input error or no-finite-breakeven state as appropriate. Add opening days or label the calendar-day assumption.

**Pass test:** Zero ticket, blank input, negative costs and COGS at or above 100% cannot retain a prior valid result. Valid input restores calculation. Opening-day changes affect per-open-day volume correctly.

### QC-16 — P0 — PDF totals and scores disagree internally
**Evidence:** The currently served Austin PDF contains these unresolved inconsistencies:

- Expense rows sum to $15,850.80; the printed total is $16,170.80, exactly $320 higher.
- Printed expense percentages sum to 98.0%, despite a 100.0% total.
- Its component scores and weights produce 67.3; the cover displays 52 without a stated further transformation.
- Its headline calculation approximates the 1,500-square-foot scenario but describes 1,400 square feet.

**Agent instruction:** Generate report calculations from the shared scenario. Recompute totals, percentages and scores; document any score transformation.

**Pass test:** Every printed total equals its rows within the stated rounding tolerance. Weights and components reproduce the displayed score. Exported inputs match the exported scenario.

### QC-17 — P0 — City facts and opportunity labels disagree across outputs
**Evidence:**

| Austin surface | Household income | Five-year growth | Score |
|---|---:|---:|---:|
| City page | $86,500 | 8.4% | 68 |
| Actual API | $86,500 | 1.5% | 68 |
| Comparison | $86,500 | 1.5% | 68 |
| Developer example | $86,500 | 8.4% | 68 |
| PDF | $92,248 | 8.4% | 52 |

The homepage and API label pet care and child day care as underserved. Austin's detailed industry table labels pet care saturated and child day care balanced.

**Agent instruction:** Build all outputs from one versioned record and industry-status computation. Include geography, period, source, units and methodology with each metric. Different vintages must be explicit.

**Pass test:** A snapshot comparison of page, homepage card, API, comparison and report produces identical values and industry classifications for the same city, period and metric definition. This test establishes consistency, not independent factual truth.

Sources: [Austin](https://cityclick.com/tx/austin/), [homepage](https://cityclick.com/), [API](https://cityclick.com/api/v1/cities/tx/austin), [comparison](https://cityclick.com/compare/tx-austin-vs-fl-tampa), [developer example](https://cityclick.com/developers/), [PDF](https://cityclick.com/reports/tx-austin-feasibility-dossier.pdf).

### QC-18 — P2 — Field formatting and accessible names need repair
**Evidence:** Featured homepage cards label URL slugs such as tx/austin as FIPS. Negative growth renders with a double sign, such as +-0.3%. Austin's five range inputs lack a linked label, wrapping label, aria-label or aria-labelledby in current HTML. Its map exposes 12 unnamed marker buttons.

**Agent instruction:** Separate city slug, display name and numeric geography identifier. Format signed numbers once. Programmatically associate each input with its visible label and each marker with its venue.

**Pass test:** FIPS fields use the intended geography identifier. Negative growth has one minus sign. Accessibility-tree names identify every calculator input and map marker. Follow with keyboard and screen-reader testing; this review does not certify full accessibility.

## What currently works

- Homepage is compact: 51,186 raw HTML bytes and six featured cards.
- Tested city pages load with their city heading; Boston's direct page exists.
- Austin's Visiting, Moving and Doing Business panels switch successfully.
- Map tiles load and a pin opens, but the non-Austin geography fails.
- Calculator controls respond after interaction, subject to the defects above.
- A real PDF and JSON endpoint are available.
- API and comparison agree on Austin's income, score and asking rent in this snapshot.
- Shared styles and checked Leaflet assets load. Checked Austin skyline and Hot Springs Village image assets returned successfully.

These are scoped passes, not an assertion that every component or city is complete.

## Assignment sequence for agents

| Owner | First assignment | Required evidence |
|---|---|---|
| Routing and search agent | QC-01, QC-02, QC-03, QC-09, QC-10 | Search cases, 51 directory checks, actual 404, correct city retained |
| City-template agent | QC-04, QC-05, QC-12, QC-13 | Non-Austin screenshots; map, report and source city IDs |
| Workflow agent | QC-06, QC-07, QC-08 | Staging request records; failure states; persistence test |
| Data and calculator agent | QC-14, QC-15, QC-16, QC-17 | Shared-scenario calculations, invalid-input cases, output parity |
| Media and accessibility agent | QC-11, QC-18 | Working playback; accessible names; keyboard checks |

## Release rule

Every city-specific component must validate the same selected city ID: heading, map center, venues, report, API, comparison and source records. A missing record must produce a clear unavailable state.

A functional QC test must inspect the resulting content or saved state. An HTTP 200 response, clickable button or success alert alone is insufficient.

Run regression checks on Austin, Boise, Tampa, Hot Springs Village, at least one smaller municipality and a deliberately missing city. Validate the complete search index and every state link independently of that page sample.

## Limits

This review used a desktop cloud browser and fresh public HTTP/source inspection. No real partner applications, API requests, email subscriptions or leads were submitted. No production code was changed. Backend records, mobile layout, real-device playback variation, full keyboard/screen-reader behavior and all 1,501 city pages remain outside the tested scope. Site revisions after these capture times may change individual results.

