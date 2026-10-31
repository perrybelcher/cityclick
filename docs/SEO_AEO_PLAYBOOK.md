# MilitaryTime.com — Complete SEO & AEO Playbook

This audit and optimization blueprint covers every route and template in the `militarytime` Astro 7 codebase (1,478 total routes across 12 page templates). It evaluates **what is already built well**, **what is holding back rankings and LLM/AI citations**, and **exact code-level changes** to maximize both traditional Search Engine Optimization (SEO) and Answer Engine Optimization (AEO — Google AI Overviews, ChatGPT Search, Perplexity, Claude, Siri/Alexa).

---

## 1. What the Codebase Already Does Right

Before changing anything, preserve these strong foundations already implemented in [`astro.config.ts`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/astro.config.ts), [`site.ts`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/config/site.ts), and [`Layout.astro`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/layouts/Layout.astro):

- **Scaled-Content Guardrail (`INDEX_POLICY = 'quarter-hours'`)**: Indexing only the 96 hour/quarter-hour pages (`0000`, `0015`, `0030`, `0045`...) while setting the 1,344 off-quarter minute pages (`0001`, `1731`, etc.) to `noindex, follow` and filtering them out of `@astrojs/sitemap` is smart. It protects the domain from Google's doorway/scaled-content spam classifier at launch while still allowing users and internal pager links to resolve every minute.
- **Zero-CLS Edge Static HTML**: Inline stylesheets (`inlineStylesheets: 'always'`), zero web fonts, and pre-sized `--:--:--` clock placeholders ensure 100/100 Core Web Vitals.
- **Misspelling Redirects**: `/zones/alpha` → `/zones/alfa`, `/zones/juliet` → `/zones/juliett`, `/zones/xray` → `/zones/x-ray` in [`astro.config.ts`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/astro.config.ts#L26-L30).

---

## 2. Site-Wide Technical SEO & AEO Upgrades

These changes apply globally across [`Layout.astro`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/layouts/Layout.astro), [`seo.ts`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/lib/seo.ts), and `public/`.

### 2.1 Add `/llms.txt` and `/llms-full.txt` for Answer Engines
AI crawlers and RAG pipelines (Perplexity, ChatGPT, Claude) look for `/llms.txt` or benefit from a dense markdown/plain-text summary of your canonical rules and API endpoints.
- **Action**: Add `public/llms.txt` documenting:
  1. The 4 canonical conversion rules and US military spoken rules (from `CLAUDE.md` 4.1–4.5).
  2. Direct link to the free unauthenticated JSON API (`GET https://militarytime.com/api/v1/convert?time=1730&zone=Z`) so AI agents and code-execution sandboxes use your API as a grounding tool.
  3. Canonical URLs for all 24 hour hubs, 26 military time zones, and vertical calculators.

### 2.2 Explicit AI Bot Allowlist in `public/robots.txt`
Currently [`public/robots.txt`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/public/robots.txt) has `Disallow: /api/`.
- **Problem**: Blocking `/api/` in `robots.txt` prevents AI search/browsing agents that obey `robots.txt` (`OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`) from calling `/api/v1/convert` when answering a live user query, while still not needing Googlebot to index JSON responses.
- **Fix**:
  - Keep `/api/` out of the XML sitemap (already done in `astro.config.ts`) and add `X-Robots-Tag: noindex` in the `/api/v1/convert` HTTP response headers instead of blocking `/api/v1/convert` in `robots.txt` (only disallow `/api/lead`).
  - Explicitly allow `OAI-SearchBot`, `GPTBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `Applebot-Extended`, and `Google-Extended`.

### 2.3 Crawl Budget Leak on `[time].astro` (Critical SEO Fix)
Look at [`src/pages/[time].astro`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/pages/%5Btime%5D.astro#L162-L174):
```astro
{minutesOfHour.map((x) => (
  <a class={`min-cell${x === m ? ' is-here' : ''}`} href={`/${toMilitary(x)}`}>...</a>
))}
```
- **Problem**: Every indexed quarter-hour page (96 pages) links to all 60 minutes of that hour, plus `prevMin` and `nextMin`. Even though the 1,344 non-quarter minute pages have `<meta name="robots" content="noindex, follow" />`, Googlebot still has to **crawl all 1,344 URLs** because every indexed page links to 56 `noindex` URLs! Furthermore, internal PageRank is diluted across 60 links per hour instead of flowing concentrated equity to the 96 indexed quarter-hour pages.
- **Fix**:
  - When `INDEX_POLICY === 'quarter-hours'`, render the 56 off-quarter cells in `.min-grid` either as static `<div>` elements (not `<a href>`) on indexed pages, OR keep only the 4 quarter-hour cells (`:00`, `:15`, `:30`, `:45`) as `<a href>` links while making the other 56 expandable or `rel="nofollow"` until `INDEX_POLICY` flips to `'all'`.
  - Add a **24-Hour Hub Grid** (`0000`, `0100`, … `2300`) at the bottom of every `[time].astro` page so the 24 main hour pages cross-link directly to one another.

### 2.4 Upgrade Schema.org Graph in `src/lib/seo.ts`
Currently [`src/lib/seo.ts`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/lib/seo.ts) emits disconnected JSON-LD blocks (`BreadcrumbList`, `FAQPage`, `WebApplication`).
- **AEO Upgrade**:
  1. **`Organization` + `WebSite` schema** on `/` with `SearchAction` (`https://militarytime.com/{search_term_string}` or `?q=`).
  2. **`SpeakableSpecification` schema** on `/[time]` and `/how-to-read-military-time` targeting the `.tp-read` and `<dl class="kv">` selectors so Google Assistant / Siri / voice engines know which exact DOM nodes contain the spoken pronunciation answer.
  3. **`HowTo` / `TechArticle` schema** on `/how-to-read-military-time` and `/aviation-zulu` (for decoding METAR/TAF).

---

## 3. Page-by-Page SEO & AEO Blueprint

Below is the exact strategy for every route template in `src/pages/`.

---

### Page 1: Homepage (`/`) — [`src/pages/index.astro`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/pages/index.astro)

- **Target Search Intents**: `military time`, `military time converter`, `what time is it in military time`, `24 hour clock converter`, `current military time`.
- **Current Title / H1**:
  - `<title>`: `Military Time Converter — Live 24-Hour Clock & Zulu Time`
  - `<h1>`: `What time is it in military time?`
- **What to Improve (SEO)**:
  - **Keyword gap in H1 & Hero copy**: The #1 highest-volume head term is **"military time"** and **"military time converter"** (plus **"military time chart"**). Having the H1 be only a question (`What time is it in military time?`) weakens exact-match relevance for `military time converter`.
  - **Recommended `<title>`**: `Military Time Converter & Chart — Live 24-Hour Clock & Zulu Time`
  - **Recommended `<h1>`**: `Military Time Converter & Live 24-Hour Clock` (keep `What time is it in military time right now?` as a visually prominent subheading or `aria-label` above the live readout).
  - **Quick-Reference Table in Static HTML**: Currently `<HourGrid />` renders only `0000 12 AM`, `0100 1 AM`... without the spoken form (`zero hundred hours`, `thirteen hundred hours`) or `00:00` 24-hour colon notation. Adding a compact 2-column AM/PM conversion table with **12-Hour | Military Time | Spoken Form** directly in the homepage HTML allows Google to pull a **Featured Snippet Table** directly from `/`.
- **What to Improve (AEO)**:
  - Add a 40-word **"Direct Answer Definition Block"** right under the converter (`<p class="aeo-summary">`):
    > *"Military time is a 24-hour timekeeping system where the day runs from 0000 (midnight) to 2359 (11:59 PM) without AM or PM. Morning hours use a leading zero (8:00 AM = 0800), noon is 1200, and afternoon/evening hours add 12 to the 12-hour clock (5:30 PM = 1730)."*
  - Answer engines extract self-contained 40–55 word definition paragraphs at the top of authority pages verbatim.

---

### Page 2: Time Pages (`/[time]` — 96 Indexed + 1,344 Minute Pages) — [`src/pages/[time].astro`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/pages/%5Btime%5D.astro)

- **Target Search Intents**: `1730 military time`, `what time is 1730`, `17:30 in normal time`, `what is 5:30 pm in military time`, `how to say 1730 in military time`, `0000 military time`, `2000 military time`.
- **Current Title / H1**:
  - `<title>`: `1730 Military Time Is 5:30 PM — How to Say It | MilitaryTime`
  - `<h1>`: `1730 in military time is 5:30 PM`
- **What to Improve (SEO)**:
  1. **Capture the Colon Query (`17:30`) and Reverse Query (`5:30 PM in military time`)**:
     - Millions of searches use a colon (`what time is 17:30`, `14:00 to est`, `21:00 time`) or search in reverse (`5:30 pm in military time`).
     - **Upgrade `<title>`**:
       `{t.mil} Military Time (${t.mil.slice(0,2)}:${t.mil.slice(2)}) Is ${t.twelve} — Meaning & How to Say It`
     - **Upgrade First Paragraph (Answer Paragraph)**: Currently there is no prose paragraph in `.tp-hero` — it jumps straight from `<h1>` to `<div class="tp-read">` and `<dl class="kv">`. Add a crisp prose lead sentence right below `<h1>`:
       > **`{t.mil}` in military time (or `{hh}:{mm}` on a 24-hour clock) is `{twelveLabel}` in regular 12-hour time.** To say `{t.mil}` out loud in US military format, say **"{t.spoken}"** (or **"{t.radio}"** on the radio).
  2. **Differentiate Indexed Quarter-Hour Pages from Off-Quarter Pages**:
     - If you ever want to expand beyond 96 pages without triggering thin/duplicate content filters, give the **24 on-the-hour pages (`0000`, `0100` … `2300`)** richer unique context:
       - Common real-world benchmarks for that hour (e.g. `0600` = standard military reveille & hospital morning med pass; `0700` = standard 12-hour day shift handoff; `1200` = noon / change of watch; `1700` = end of business day / retreat; `1800` = evening watch; `1900` = night shift handoff; `2200` = lights out / taps; `0000` = midnight / start of new calendar day vs `2400`).
  3. **Canonical vs Noindex on the 1,344 Off-Quarter Minute Pages**:
     - Right now, `/1731` has `<link rel="canonical" href="https://militarytime.com/1731" />` AND `<meta name="robots" content="noindex, follow" />`. That's valid, and the visible banner linking to the nearest quarter-hour (`Looking for the closest quarter hour? See 1730`) is great UX.
- **What to Improve (AEO)**:
  - **Step-by-step math formula in HTML**: AI answer engines love explicit step-by-step math for "How to convert 1730 to regular time":
    - Step 1: Split `1730` into hours (`17`) and minutes (`30`).
    - Step 2: Because `17` is greater than `12`, subtract `12` (`17 − 12 = 5`) and use `PM`.
    - Step 3: Combine with minutes → **`5:30 PM`**.
  - Right now `howTo` is buried inside the first `<details class="faq">` item. Surface that 1-line conversion math in the main body (`<dl class="kv">` under `<dt>How to convert</dt>`) so it's always visible without expanding or scrolling.
  - Add **Central (`Sierra` UTC−6)** and **Mountain (`Tango` UTC−7)** rows to the US time zones table on `[time].astro` (lines 124–127 currently only list EDT, EST, and PST, omitting CST/CDT and MST/MDT!).

---

### Page 3: Military Time Chart (`/chart`) — [`src/pages/chart.astro`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/pages/chart.astro)

- **Target Search Intents**: `military time chart`, `printable military time chart`, `24 hour time chart`, `military time table`, `military time conversion chart pdf`.
- **Current State**: Only 42 lines of code! It has an `<h1>`, a 1-sentence lede, two buttons, and a 24×4 quarter-hour matrix table (`Regular | :00 | :15 | :30 | :45`).
- **What to Improve (SEO & AEO)**:
  1. **Add the Standard 2-Column 24-Hour Table First**:
     - When someone searches `military time chart`, Google's Featured Snippet and AI Overviews almost always extract a 24-row table with columns: **`12-Hour Time` | `Military Time` | `24-Hour Clock` | `How to Say It`**.
     - The current table has headers `Regular | :00 | :15 | :30 | :45` where the first column says `12 AM` (stripping `:00`). That matrix is great as a *secondary* table ("Quarter-Hour Reference Matrix"), but you should lead with a classic 24-row table showing `12:00 AM | 0000 | 00:00 | Zero hundred hours` through `11:00 PM | 2300 | 23:00 | Twenty-three hundred hours`.
  2. **Add `FAQPage` + `Table` Schema (`about: "Military Time Conversion Chart"`)**:
     - Currently `/chart` passes **no `jsonLd` at all**! Add 4–5 chart-specific FAQs (e.g., *"How do you read a military time chart?"*, *"What is 0000 vs 2400 on a military time chart?"*, *"Can I print this military time chart for nursing or basic training?"*).
  3. **Image SEO for Google Images**:
     - "military time chart" is one of the highest-traffic **Google Images** queries in this niche. Embed a crisp SVG or PNG preview of the printable chart (`<img src="/military-time-chart-preview.svg" alt="Printable 24-Hour Military Time Conversion Chart (0000 to 2359)" width="800" height="1035" loading="lazy" />`) + `ImageObject` JSON-LD so MilitaryTime.com ranks at the top of Google Image Search.

---

### Page 4: Military Time Zones Index (`/zones`) — [`src/pages/zones/index.astro`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/pages/zones/index.astro)

- **Target Search Intents**: `military time zones`, `military time zone chart`, `military time zone letters`, `nato time zones`, `alphabet time zones`.
- **Current State**: Very lean (34 lines) — just `<h1>`, a 3-sentence lede, the 26-row table (`Letter | Name | Offset | Time now`), and a 3-sentence footnote. No `jsonLd`, no H2 sections, no US/major civil timezone mapping table.
- **What to Improve (SEO & AEO)**:
  1. **Add Civil Time Zone Mapping Column (`Major Civil Zones / Examples`) to the Table**:
     - Searchers and LLMs frequently ask: *"What military time zone is EST / PST / CST / GMT?"*
     - Adding a 5th column to the `/zones` table showing civil equivalents (e.g. `Z → UTC / GMT`, `Q → EDT`, `R → EST / CDT`, `S → CST / MDT`, `T → MST / PDT`, `U → PST`, `A → CET`, `I → JST`) makes the table 10x more useful for Featured Snippets and AI citations.
  2. **Add H2 Sections & `FAQPage` JSON-LD**:
     - `<h2>How Military Time Zone Letters Work (East vs. West of Greenwich)</h2>` (explaining why `A–M` skipping `J` are `UTC+1` to `UTC+12`, `N–Y` are `UTC-1` to `UTC-12`, `Z` is `UTC+0`, and `J` is local time).
     - `<h2>US Time Zones in Military Time Letters (Standard vs. Daylight Saving)</h2>` (small 4-row table for Eastern, Central, Mountain, Pacific, Alaska, Hawaii).
     - Add `FAQPage` schema with top zone questions (*"Why is there no J in UTC offset time zones?"*, *"What letter is Eastern Time in the military?"*, *"How do you write date-time groups (DTG) with a zone letter?"*).

---

### Page 5: Individual Zone Pages (`/zones/[zone]` — 26 Pages) — [`src/pages/zones/[zone].astro`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/pages/zones/%5Bzone%5D.astro)

- **Target Search Intents**:
  - `/zones/zulu`: `zulu time`, `zulu time now`, `current zulu time`, `utc to zulu time`, `zulu time converter`.
  - `/zones/romeo`, `/zones/alfa`, `/zones/juliett`, etc.: `romeo time zone`, `what is juliett time`, `charlie time zone military`, `zulu to romeo time`.
- **What to Improve (SEO & AEO)**:
  1. **Special Upgrade for `/zones/zulu` (Your #2 Highest-Traffic Page After `/`)**:
     - "Zulu time" and "Zulu time now" have massive standalone search volume. Right now `/zones/zulu` shares the exact same minimal template as `/zones/oscar`!
     - On `/zones/zulu` (`isZ === true`), render a **24-Hour Zulu to US Time Zone Conversion Table** (`0000Z` to `2300Z` → `EDT (UTC-4)`, `EST/CDT (UTC-5)`, `CST/MDT (UTC-6)`, `MST/PDT (UTC-7)`, `PST (UTC-8)`). This single table captures `1800 zulu to est`, `1200z to cst`, `zulu time conversion chart`, etc.
     - Expand `/zones/zulu` FAQs to 5 questions (currently `isZ` actually gets *fewer* FAQs than other zones — only 2 FAQs! See line 35: `...(isZ ? [] : [...])`). Add: *"Is Zulu time the same as UTC and GMT?"*, *"How do you convert Zulu time to Eastern, Central, Mountain, and Pacific time?"*, and *"Why is UTC called Zulu time?"*.
  2. **24-Hour Conversion Table on Every Offset Zone Page (`A–Y`)**:
     - On `/zones/romeo`, `/zones/charlie`, etc., add a compact 24-hour conversion table (`0000Z–2300Z` ↔ `0000R–2300R` + 12-hour regular time) and list which major regions/cities match that UTC offset (`offset`). This turns each of the 26 zone pages from a 150-word stub into a genuinely comprehensive reference page.
  3. **Date-Time Group (DTG) Example**:
     - Military and aviation users search for how to write a DTG in that zone (e.g., `161730Z OCT 26` or `161230R OCT 26`). Including a 2-line DTG explanation on zone pages is high-signal entity coverage for LLMs.

---

### Page 6: Guide (`/how-to-read-military-time`) — [`src/pages/how-to-read-military-time.astro`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/pages/how-to-read-military-time.astro)

- **Target Search Intents**: `how to read military time`, `how to tell military time`, `how to say military time`, `military time rules`, `how does military time work`, `0000 vs 2400 military time`.
- **Current State**: Well-written plain-English article (66 lines) with 4 rules, a "How to say it out loud" table, "Common mistakes", and 2 FAQs.
- **What to Improve (SEO & AEO)**:
  1. **Article / HowTo Schema Metadata**:
     - It sets `ogType="article"`, which is great, but lacks `Article` (or `TechArticle`) JSON-LD with `headline`, `description`, `author`/`publisher` (`MilitaryTime.com`), and `SpeakableSpecification`.
  2. **Internal Links to Key Time Pages**:
     - In [`how-to-read-military-time.astro`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/pages/how-to-read-military-time.astro#L17-L47), times like `<span class="num">0800</span>`, `<span class="num">1730</span>`, `<span class="num">0000</span>`, `<span class="num">1200</span>`, `<span class="num">0930</span>`, `<span class="num">1145</span>`, `<span class="num">2115</span>` are plain `<span>` tags. Make the quarter-hour examples (`0000`, `0800`, `0815`, `0930`, `1145`, `1200`, `1730`, `1930`, `2115`) clickable `<a href="/1730">` links! That passes contextual editorial link equity from your main guide to your top time pages.
  3. **Add a "How to Write Military Date-Time Groups (DTG)" Section & Expand FAQs**:
     - Add 3 more high-volume FAQs: *"How do you subtract military time?"*, *"What is 12:00 AM and 12:00 PM in military time?"*, and *"Why do we say 'hundred hours' in military time?"*.

---

### Page 7: Nursing & Medical (`/nursing-medical`) — [`src/pages/nursing-medical.astro`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/pages/nursing-medical.astro)

- **Target Search Intents**: `military time for nurses`, `nursing military time chart`, `q6h military time schedule`, `q4h dosing schedule military time`, `hospital shift times in military time`.
- **Current State**: Strong interactive page with Dose Schedule calculator (`q1h–q24h`), Duration calculator, Hospital Shifts table, Charting tips, LeadForm, and 3 FAQs.
- **What to Improve (SEO & AEO)**:
  1. **Pre-render a Static "Common Medication Administration Schedules (q4h, q6h, q8h, q12h)" Table**:
     - Currently the calculator only shows `0600, 1200, 1800, 0000` in initial HTML. Adding a small static reference table of common hospital med pass schedules (`q4h`, `q6h`, `q8h`, `q12h` starting at `0600` or `0800`) lets nursing students and AI answer engines cite your page for queries like *"standard q6h military time schedule"* or *"q8h dosing times in military time"*.
  2. **Add `WebApplication` JSON-LD**:
     - Include `WebApplication` (`applicationCategory: "MedicalApplication"` or `"UtilitiesApplication"`, `name: "Nursing Dose Schedule & Shift Calculator"`) alongside `FAQPage`.

---

### Page 8: Aviation & Zulu (`/aviation-zulu`) — [`src/pages/aviation-zulu.astro`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/pages/aviation-zulu.astro)

- **Target Search Intents**: `zulu time aviation`, `metar time decoder`, `how to read metar time`, `taf validity time decoder`, `pilot eta calculator zulu`, `icao phonetic numbers`.
- **Current State**: Live Zulu/Local/UTC-date readout + 3 interactive decoders (METAR time group, TAF valid period, ETA in Zulu and local) + LeadForm + 3 FAQs.
- **What to Improve (SEO & AEO)**:
  1. **Static ICAO Radiotelephony Pronunciation Table (Digits 0–9)**:
     - Student pilots constantly search `icao number pronunciation` (`WUN, TOO, TREE, FOW-ER, FIFE, SIX, SEV-EN, AIT, NIN-ER, ZE-RO`). Your library already has this data in `src/lib/time.ts`! Rendering a 10-row static table on `/aviation-zulu` explaining *why* pilots say "FIFE" and "NIN-ER" (and when to read digit-by-digit vs. hundred hours) is an easy Featured Snippet win and directly aligns with `CLAUDE.md` 4.3.
  2. **Static Anatomy Diagram / Breakdown of a METAR & TAF Timestamp**:
     - Add a short visual breakdown (`16` = Day of month, `1730` = Time in UTC/Zulu, `Z` = Zulu indicator) in static HTML below the decoder so crawlers and LLMs have an explicit text explanation to quote.

---

### Page 9: Speed Drill (`/training-game`) — [`src/pages/training-game.astro`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/pages/training-game.astro)

- **Target Search Intents**: `military time practice`, `military time quiz`, `military time game`, `military time test`, `learn military time fast`.
- **Current State**: Interactive 60-second game + LeadForm. Almost zero crawlable text outside the game UI (`<h1>The 60-second drill</h1>` + 2 sentences).
- **What to Improve (SEO & AEO)**:
  1. **Keyword Alignment in `<h1>`**: Change `<h1>` from `The 60-second drill` to `Military Time Practice Quiz — The 60-Second Drill`.
  2. **Add Crawlable Content Below the Game (Zero Impact on Above-the-Fold UX)**:
     - Because the game stage is pure client-side JS, search engines see fewer than 80 words on `/training-game`.
     - Below the `<LeadForm />`, add:
       - `<h2>What This Military Time Quiz Tests</h2>` (12h→24h, 24h→12h, spoken military time, NATO phonetic time zone letters).
       - `<h2>4 Mental Math Shortcuts to Score 25+</h2>` (e.g., the "Subtract 2 from the second digit" trick: for `1730`, `7 − 2 = 5` → `5:30 PM`).
       - `FAQPage` + `WebApplication` (`GameApplication` / `EducationalApplication`) JSON-LD.

---

### Page 10: Free API Docs (`/api-docs`) — [`src/pages/api-docs.astro`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/pages/api-docs.astro)

- **Target Search Intents**: `military time conversion api`, `24 hour time api`, `zulu time converter api`, plus **LLM/Agent tool discovery**.
- **What to Improve (SEO & AEO)**:
  1. **Add OpenAPI 3.1 Spec (`/openapi.json`)**:
     - Publishing a static `public/openapi.json` and linking it via `<link rel="service-desc" href="/openapi.json" />` on `/api-docs` makes your API immediately consumable by custom GPTs, Claude MCP/tool builders, and developer directories.
  2. **Add `WebAPI` Schema.org JSON-LD**:
     - Emit `@type: "WebAPI"` with `documentation: "https://militarytime.com/api-docs"` and `termsOfService`.

---

### Page 11: Cheat Sheet (`/cheat-sheet`) & Gear (`/gear`)

- **`/cheat-sheet`** ([`src/pages/cheat-sheet.astro`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/pages/cheat-sheet.astro)):
  - Intentionally `noindex` per `CLAUDE.md` Section 5 so it doesn't cannibalize `/chart`.
  - **One SEO tweak**: Set its canonical tag to `path="/chart"` (or keep self-canonical with `noindex, follow`) so any external backlinks shared to `/cheat-sheet` consolidate authority to `/chart`.
- **`/gear`** ([`src/pages/gear.astro`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/pages/gear.astro)):
  - Correctly set to `noindex` while `gear.published === false` and excluded from navigation and sitemap. When `published: true` is flipped later, add `ItemList` schema for the curated watches/clocks.

---

### Page 12: Trust Pages (`/about` & `/privacy`) — E-E-A-T Signals

- **`/about`** ([`src/pages/about.astro`](file:///Users/perry/.gemini/antigravity/brain/3d9afd8e-ed55-4997-b510-9f5cbdcba33d/scratch/militarytime/militarytime/src/pages/about.astro)):
  - **Why it matters for AEO/SEO**: Google's Quality Rater Guidelines and AI grounding rankers check `/about` to verify authoritative standards.
  - **Upgrade**: Explicitly cite the authoritative standards your library implements:
    - **ICAO Annex 10 Volume II** ( Aeronautical Telecommunications radiotelephony pronunciation: `WUN, TOO, TREE, FOW-ER, FIFE, SIX, SEV-EN, AIT, NIN-ER, ZE-RO`).
    - **ACP 121 (Allied Communications Publication 121)** / **US Naval Observatory (USNO)** nautical/military time zone designations (`A–Z`).
    - **ISO 8601** 24-hour time representation.
    - **The Joint Commission (TJC) / ISMP** medical charting standards (4-digit 24-hour time, leading zeros, no AM/PM).
  - Citing these official standards by name on `/about` (and in `AboutPage` / `Organization` JSON-LD) dramatically boosts entity authority for both Google and LLMs.

---

## 4. Prioritized Implementation Checklist

If you want me to implement these directly into the codebase and repackage or update the project, here is the exact execution order that preserves **100% of `CLAUDE.md` rules and unit/QA tests**:

1. **Fix Crawl Budget & Internal Linking (`[time].astro`)**: Prevent the 96 indexed pages from leaking crawl budget to 1,344 `noindex` links, and add a 24-hour hub bar (`0000`–`2300`).
2. **Add AEO Direct-Answer Blocks & Expanded Tables (`/`, `/[time]`, `/chart`, `/zones`, `/zones/[zone]`)**:
   - Add CST (`Sierra`) and MST (`Tango`) to `/[time]` US zone tables.
   - Add the 24-hour Zulu-to-US conversion table on `/zones/zulu`.
   - Add the civil timezone mapping column on `/zones`.
   - Add the 24-row spoken + 24h conversion table on `/chart`.
3. **Add Crawlable Educational Copy to Interactive Tool Pages (`/training-game`, `/aviation-zulu`, `/nursing-medical`)**:
   - Mental math shortcuts on `/training-game`.
   - ICAO number pronunciation table on `/aviation-zulu`.
   - Static `q4h / q6h / q8h / q12h` schedule table on `/nursing-medical`.
4. **Upgrade Schema.org (`src/lib/seo.ts`) & AI Discovery (`public/llms.txt`, `public/openapi.json`, `public/robots.txt`)**:
   - Add `SpeakableSpecification`, `WebSite`, `Organization`, `WebAPI`, and `TechArticle` schemas.
   - Cite ICAO Annex 10, ACP 121, and Joint Commission standards on `/about`.
