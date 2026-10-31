---
name: cityclick-seo-standards
description: >-
  Enforces CityClick's SEO, Crawl Shield, trailing-slash canonical URLs, Answer Engine
  Optimization (AEO) plain-sentence facts, and Schema.org JSON-LD graph rules. Activate
  when editing routes, links, meta tags, sitemaps, facts.ts, seo.ts, or llms.txt.
---

# CityClick SEO & Answer Engine Optimization Standards (`cityclick-seo-standards`)

## 1. The Crawl Shield (Indexation Governance)
- **Certified Indexable Cities ONLY**: Only cities that have passed 100% primary-source verification and the Master Quality Gate (`scripts/qa.ts`) may emit `<meta name="robots" content="index, follow">` and appear in `src/pages/sitemap.xml.ts`.
- **Unverified Fleet Shield**: Every unverified city in the 1,501-city catalog must emit `<meta name="robots" content="noindex, follow">` and stay out of `sitemap.xml`.
- **Directory Honesty**: State directory pages (`/[state]/`), `about.astro`, `404.astro`, and `index.astro` must never claim unverified `noindex` cities are "verified" or "indexed".

## 2. Canonical URL & Internal Link Rules
- Every canonical URL and internal `<a href="...">` to a page route must end with a **trailing slash** (e.g., `/tx/austin/`, `/tn/nashville/`, `/ar/hot-springs-village/`, `/about/`, `/methodology/`, `/tools/lease-calculator/`, `/compare/tx-austin-vs-fl-tampa/`).
- Zero internal 404s and zero internal redirect hops.
- Legacy Census-suffix slugs (e.g., `/ok/oklahoma/`, `/tn/nashville-davidson-metropolitan-government-balance/`) must 301-redirect in `public/_redirects`.

## 3. Meta Tags & OpenGraph
- `<title>` under 60–65 characters where possible, unique per route, with zero raw HTML entities (`&amp;`).
- `og:image` and `twitter:image` must always be absolute `https://cityclick.com/...` URLs pointing to verified existing assets in `public/images/`.

## 4. AEO Plain-Sentence Declarations & JSON-LD (`src/lib/facts.ts` & `src/lib/seo.ts`)
- Every key metric on a city record is emitted once by `buildFacts(city)` in `src/lib/facts.ts` as a clear, declarative sentence with explicit `source` and `asOf` vintage.
- The visible **Key Facts & FAQ** section and the `FAQPage` JSON-LD schema read from the exact same `buildFacts(city)` array so visible text and structured data never drift.
- JSON-LD must never invent fallback entity names (e.g., do not emit `"name": "{City} Airport"` in `TouristDestination` unless a sourced airport exists on the record) and `SpeakableSpecification` selectors must match real DOM IDs present on the rendered page.
