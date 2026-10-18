# CityClick (cityclick.com) — Master Product & Architecture Blueprint

**Domain:** `cityclick.com`  
**Owner:** Perry Belcher  
**Managing Partner & Operator:** Sophia  
**Engineering & Architecture:** Woz (Lead Software Architect), Builder, Developer  
**Brand & Creative:** Draper (Brand & Packaging Architect), Clark (Copy Chief)  
**Technical QA & Infrastructure:** QA Tech, Webmaster  
**Date:** October 2026  
**Status:** ARCHITECTURE & INCEPTION APPROVED — DISPATCHING SPRINT 1  

---

## 1. Executive Summary & Strategic Positioning

### The Category Wedge
`cityclick.com` is a premier, category-defining exact-match digital asset. In the local search and emergency service ecosystem, consumer intent is immediate, high-friction, and mobile-dominant:
- When a pipe bursts, a roof leaks, an AC dies in 100°F Texas heat, or a tree falls on a driveway, consumers do not browse social media or read long blogs. They search, click, and call within 90 seconds.
- Existing directory giants (Yelp, Angi, Thumbtack, YellowPages) suffer from bloated UI, pay-to-play review scandals, aggressive contractor spam, and high latency.
- Google Local Services Ads (LSA) and Pay-Per-Click (PPC) costs have skyrocketed ($80–$250+ per click for emergency water damage or commercial roofing).

**CityClick's Core Thesis:**  
CityClick bridges high-intent local homeowners directly to top-tier, vetted local contractors via an ultra-fast, zero-friction, mobile-optimized programmatic platform. By capturing exact-match organic search and hyper-targeted paid traffic, CityClick monetizes through dynamic pay-per-call arbitrage, high-ticket verified lead routing, and recurring local business spotlight subscriptions.

---

## 2. Core Monetization Engine & Revenue Streams

CityClick operates on a **hybrid 3-tier monetization architecture** designed for instant cash-flow velocity and long-term enterprise equity:

### Tier 1: Real-Time Pay-Per-Call (PPC) Telephony Network (Immediate Primary Cash Flow)
* **Mechanic:** Programmatic local landing pages feature dynamic tracking phone numbers linked to an intelligent IVR routing engine.
* **Call Qualification Standard:** Inbound call connected, geo-matched by caller ID / area code, IVR filter passed (press 1 for emergency / residential), and duration > 90 seconds.
* **Payout Range:** $45.00 to $185.00 per qualified call depending on vertical margin.
* **Routing Network:** Integration with Ringba, Twilio, and direct buyer buyer-endpoints (e.g., Service Direct, Aragon, Networx, or direct local contractors).

### Tier 2: Instant Dual-Dispatch Web & SMS Leads (Secondary Real-Time Yield)
* **Mechanic:** 2-step micro-forms embedded on every city/service page ("Check Immediate Availability & Upfront Pricing").
* **Distribution Logic:**
  * **Exclusive Lead:** Dispatched instantly to 1 contracted local pro at $60–$120/lead.
  * **Semi-Exclusive (2-pro cap):** Sold to 2 local contractors at $35–$50/lead each ($70–$100 total yield).
* **Delivery Engine:** Instant SMS via Twilio + webhook push to contractor CRM (GoHighLevel / Zapier / Email webhook) with customer contact masked until claimed.

### Tier 3: "CityClick Certified" Verified Pro Monthly Subscriptions (Recurring SaaS / Directory Revenue)
* **Mechanic:** Local service providers claim and brand their local listing in their home city.
* **Pricing Tiers:**
  * **Verified Local Pro:** $99/mo (Includes verified badge, do-follow local citation, direct backlink, phone click-to-call forwarding, review display).
  * **City Category Spotlight (Exclusive 1 per city/vertical):** $297/mo (Pinned #1 position on `cityclick.com/[state]/[city]/[vertical]`, featured hero badge, zero rival phone numbers on their profile page).

---

## 3. High-Value Target Verticals (Launch Phase 1 & 2)

CityClick focuses strictly on **high-ticket, non-deferrable emergency and capital-improvement services** where contractor customer acquisition cost (CAC) tolerances are massive ($300–$1,200+ CAC):

| Vertical | Average Job Value | Typical Call Payout (90s+) | Web Lead Payout | Seasonality / Intent Driver |
| :--- | :--- | :--- | :--- | :--- |
| **Emergency Water & Flood Restoration** | $3,500 – $12,000 | $125 – $195 | $85 – $140 | Year-round / Storm surge / Pipe bursts |
| **Roofing (Replacement & Repair)** | $8,000 – $22,000 | $85 – $165 | $65 – $110 | Hail, wind, age, insurance claims |
| **HVAC (AC / Furnace Install & Repair)**| $4,500 – $14,000 | $65 – $135 | $45 – $80 | Summer peak (Texas/Sunbelt) & Winter freeze |
| **Emergency Plumbing & Trenchless Sewer**| $800 – $7,500 | $55 – $115 | $40 – $75 | High frequency, 24/7 emergency dispatch |
| **Tree Removal & Storm Damage Clean-Up** | $1,500 – $6,000 | $50 – $95 | $35 – $65 | Severe weather, hazardous limb removal |
| **Epoxy Garage Floors & Concrete Coating**| $2,500 – $8,500 | $45 – $90 | $35 – $60 | Discretionary home value upgrade |
| **Foundation Repair (Texas Wedge)** | $4,000 – $18,000 | $90 – $170 | $70 – $120 | Permian / DFW / Central TX soil settling |

---

## 4. Technical System Architecture

### 4.1 System Overview
CityClick is built as an ultra-lean, high-concurrency JAMstack web application backed by an event-driven telephony and lead dispatch microservice.

```
                      [ User / Browser / Mobile ]
                                   │
                                   ▼
                       [ Cloudflare CDN & WAF ]
                                   │
                  ┌────────────────┴────────────────┐
                  ▼                                 ▼
       [ Programmatic Edge SSG ]           [ Dynamic API Gateway ]
        Next.js / Astro Static Pages        FastAPI / Node.js Engine
        - /texas/dallas/roofing             - Dynamic Number Insertion (DNI)
        - /texas/houston/plumbing           - Form Post & Validation
        - /florida/miami/hvac               - Twilio / Ringba Webhooks
                  │                                 │
                  ▼                                 ▼
       [ Pre-rendered Cache ]              [ SQLite / PostgreSQL ]
       (50k+ Static City Hubs)             - Contractor Registry
                                           - Routing Rules & Bids
                                           - Call & Lead Logs
                                                    │
                                     ┌──────────────┴──────────────┐
                                     ▼                             ▼
                              [ Telephony Engine ]       [ Lead Dispatch ]
                              Twilio / Ringba SIP         Twilio SMS / Webhooks
                              - Whisper Prompts           - Contractor GHL CRM
                              - Duration Tracking         - Instant Contractor Alert
                              - Call Recordings           - Buyer Ping/Post Ping
```

### 4.2 Key Architectural Modules
1. **Programmatic Local SEO Engine (Page Factory):**
   * Pre-renders clean, structured static pages for 500 top US metropolitan cities across 7 launch verticals (3,500 core landing hubs at launch, expandable to 50,000+ zip-level pages).
   * Schema.org markup: `LocalBusiness`, `EmergencyService`, `AggregateRating`, `FAQPage`, and `BreadcrumbList` for zero-click SERP dominance and answer-engine/AI indexing (ChatGPT Search, Perplexity, Google SGE).
   * Sub-100ms Time-To-First-Byte (TTFB) on Cloudflare edge CDN.

2. **Dynamic Number Insertion (DNI) & Telephony Engine:**
   * JavaScript snippet loads asynchronously, detects visitor location / campaign UTM tags, and swaps the displayed phone number with a vertical/city-specific tracking pool.
   * SIP trunk integration handles real-time caller geo-lookup, Whisper tone ("This is a qualified CityClick emergency lead"), and transfers immediately to the designated local pro or buyer exchange.

3. **Multi-Recipient Lead Dispatch Engine:**
   * Captures customer intent, address/zip, and phone number via a 2-step conversational micro-form.
   * Runs phone validation (carrier lookup / SMS OTP verification when fraud probability is detected).
   * Dispatches via webhook JSON payload to contractor endpoints (GoHighLevel, email, SMS).

4. **Self-Service Contractor Claiming & Onboarding:**
   * Portal allowing local contractors to search their business, claim their listing, enter billing info (Stripe), set daily call caps, and configure their receiving phone numbers.

---

## 5. Rollout Phasing & Milestone Roadmap

### Phase 1: Texas Proof-of-Concept & Core Engine (Weeks 1–3)
* Focus on Perry's home territory and high-margin Texas metros: Dallas-Fort Worth, Houston, Austin, San Antonio, Midland/Odessa.
* Deploy core 5 verticals: Roofing, HVAC, Plumbing, Water Damage, Foundation Repair.
* Validate live call routing via Twilio/Ringba test numbers.
* Deploy production-ready staging environment on `187.124.240.31`.

### Phase 2: National Expansion — Top 100 Metros (Weeks 4–8)
* Programmatic generation of top 100 US metropolitan markets (100 cities x 7 verticals = 700 high-intent hubs).
* Direct buyer integration with pay-per-call networks for 100% fill rate on unassigned territories.
* Rollout of contractor outreach and "Claim Your Spot" cold-email/SMS campaigns.

### Phase 3: Automated Marketplace & Recurring Subscriptions (Month 3+)
* Self-serve contractor dashboard with Stripe billing integration for $99–$297/mo recurring subscriptions.
* AI-assisted intake operator for after-hours inbound inquiries.
