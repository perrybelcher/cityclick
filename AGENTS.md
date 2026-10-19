# CityClick — rules for any AI tool or person editing this repo

Read this before changing anything. (Claude Code reads CLAUDE.md, Gemini/Antigravity read GEMINI.md; both point here.)

## Prime directive
A blank is better than a wrong number. Never invent, estimate, round up, default, or copy a value from another city.
If a value has no source in the city record, hide that block completely. No "—", no "pending", no placeholder.

## Three kinds of content
1. VERIFIED: numbers, rates, named facilities. Must come from a field in `src/data/cities/*.json` that has a source and an as-of date. The template reads the field. Never retype a number in a template.
2. EDITORIAL: photos, video, orientation text written by a person. Fine to show, but never state a price, hours, ranking, safety claim or "best/nearest/top" in it.
3. BANNED: invented numbers, invented firms or services, rankings, "trauma level", safety scores, permit wait times, rents presented as market data, anything copied from another city.

## Hard rules
- Components and templates contain zero city names and zero fallbacks. No Austin defaults on other cities.
- Do not use `scripts/build_national_fleet.py`. It fabricates numbers. The ~1,495 non-flagship cities are noindex because their data is unverified.
- Only six cities are indexable: Austin, Hot Springs Village, Boise, Tampa, Scottsdale, Nashville. Everything else stays `noindex, follow` and out of the sitemap.
- Data pipeline: `scripts/rebuild_verified_cities.py` (Census), `scripts/enrich_city.py` (climate, water, airport, hospital, tax), `sources/sales-tax.json`. Check numbers with `python3 audit/recompute.py` and `npm run qa`.
- Do not use Google Places (quota exhausted). Use federal sources: Census, EPA SDWIS, CMS Care Compare, OurAirports, Open-Meteo.
- Hospitals: list CMS hospitals with emergency services. Never say trauma level, nearest, primary or best.
- Do not redesign the look without the owner. The live Austin page look is the approved design. Change words and data blocks, not layout.
- Done means: build passes, `npm run qa` passes, and you looked at screenshots of the real page at desktop and phone width.

## Where things are
- Page template: `src/pages/[state]/[city].astro`. Homepage: `src/pages/index.astro`. Facts/FAQ: `src/lib/facts.ts`.
- City data: `src/data/cities/*.json`. Replication notes: `docs/REPLICATION_PLAYBOOK.md`.
- Deploy is by the server operator (Sophia), not from a local machine.
