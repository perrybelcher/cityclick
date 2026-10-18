# CityClick Technical Architecture & Engineering Specification

## 1. Stack Selection & Technology Decision Record

| Component | Choice | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15 (App Router) + TypeScript** | React Server Components (RSC) enable ultra-fast static pre-rendering (SSG/ISR) for thousands of city/vertical landing hubs while keeping zero client-side JavaScript bloat on content pages. |
| **Styling & UI** | **Tailwind CSS + Lucide Icons** | Utility-first, mobile-first responsive layout, sub-20KB compressed CSS bundle, instant visual clarity. |
| **Database** | **PostgreSQL (via Prisma ORM / raw SQL) / SQLite for local** | Relational integrity for cities, states, zip codes, service categories, contractor partners, call logs, and billing. |
| **Caching & Edge** | **Redis (Upstash / Local Redis) + Cloudflare** | Sub-10ms lookup for geo-IP routing and dynamic tracking phone allocation. |
| **Telephony Integration** | **Twilio Voice API / Ringba Webhooks** | Automated call routing, Whisper caller announcements, recording, call duration ping-backs. |
| **Forms & Messaging** | **Twilio SMS + GoHighLevel Webhooks** | Real-time lead alerts sent directly to contractor mobile phones within 3 seconds of customer form submission. |
| **Hosting & Staging** | **Docker Compose on Ubuntu Staging Node (`187.124.240.31`)** | Reproducible, isolated container setup reverse-proxied by Nginx with automated Let's Encrypt SSL. |

---

## 2. Programmatic URL Hierarchy & SEO Taxonomy

To dominate local search without triggering Google duplicate content penalties, CityClick uses a strict, localized entity-driven hierarchy:

```
cityclick.com/
├── /                              (National portal, city search, vertical finder)
├── /[state]/                      (State index: e.g., /texas, /florida)
├── /[state]/[city]/               (City master directory: e.g., /texas/dallas)
└── /[state]/[city]/[vertical]/    (High-intent conversion hub: e.g., /texas/dallas/roofing)
```

### URL Rules & Canonicalization:
1. All lowercase, hyphen-separated for multi-word cities (`/texas/fort-worth/water-restoration`).
2. Clean canonical tags pointing directly to the exact target path.
3. Geo-Coordinates (latitude, longitude, postal codes) embedded in `GeoCoordinates` schema for rich local entity graph ingestion.
4. Dynamic Local Injection: City name, county name, local landmarks, typical climate factors (e.g. freeze vulnerability, hail storms, hurricane season), and average local cost estimates dynamically synthesized into unique page copy.

---

## 3. Database Schema Design (Prisma / SQL)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model State {
  id        String   @id @default(uuid())
  code      String   @unique // e.g. "TX"
  name      String   // e.g. "Texas"
  slug      String   @unique // e.g. "texas"
  cities    City[]
  createdAt DateTime @default(now())
}

model City {
  id          String       @id @default(uuid())
  name        String       // e.g. "Dallas"
  slug        String       // e.g. "dallas"
  stateId     String
  state       State        @relation(fields: [stateId], references: [id])
  lat         Float
  lng         Float
  population  Int
  zipCodes    String[]     // e.g. ["75201", "75202", ...]
  listings    Listing[]
  callRoutes  CallRoute[]
  leads       Lead[]
  createdAt   DateTime     @default(now())

  @@unique([stateId, slug])
}

model Vertical {
  id          String       @id @default(uuid())
  name        String       // e.g. "Roofing"
  slug        String       @unique // e.g. "roofing"
  description String
  avgJobValue Float
  baseCallFee Float
  baseLeadFee Float
  listings    Listing[]
  callRoutes  CallRoute[]
  leads       Lead[]
}

model Contractor {
  id            String       @id @default(uuid())
  companyName   String
  contactName   String
  phone         String       // Receiving direct line
  email         String
  smsAlertPhone String       // Instant lead SMS
  tier          String       @default("PAY_PER_CALL") // PAY_PER_CALL | SUBSCRIBER | EXCLUSIVE
  verified      Boolean      @default(false)
  stripeCustId  String?
  active        Boolean      @default(true)
  listings      Listing[]
  callRoutes    CallRoute[]
  leads         Lead[]
  createdAt     DateTime     @default(now())
}

model Listing {
  id           String     @id @default(uuid())
  cityId       String
  city         City       @relation(fields: [cityId], references: [id])
  verticalId   String
  vertical     Vertical   @relation(fields: [verticalId], references: [id])
  contractorId String
  contractor   Contractor @relation(fields: [contractorId], references: [id])
  isFeatured   Boolean    @default(false)
  rankOrder    Int        @default(99)
  createdAt    DateTime   @default(now())

  @@unique([cityId, verticalId, contractorId])
}

model CallRoute {
  id              String      @id @default(uuid())
  cityId          String
  city            City        @relation(fields: [cityId], references: [id])
  verticalId      String
  vertical        Vertical    @relation(fields: [verticalId], references: [id])
  trackingNumber  String      @unique // Twilio/Ringba DID (e.g. +14695551234)
  contractorId    String?
  contractor      Contractor? @relation(fields: [contractorId], references: [id])
  buyerEndpoint   String?     // External buyer SIP/PSTN when no direct pro assigned
  minCallSeconds  Int         @default(90)
  payoutAmount    Float
  createdAt       DateTime    @default(now())
}

model Lead {
  id           String      @id @default(uuid())
  cityId       String
  city         City        @relation(fields: [cityId], references: [id])
  verticalId   String
  vertical     Vertical    @relation(fields: [verticalId], references: [id])
  contractorId String?
  contractor   Contractor? @relation(fields: [contractorId], references: [id])
  customerName String
  customerPhone String
  customerEmail String?
  serviceNeeded String
  isEmergency   Boolean    @default(false)
  streetAddress String?
  zipCode       String
  status        String     @default("DISPATCHED") // NEW | DISPATCHED | CLAIMED | REFUNDED
  rawUtmSource  String?
  createdAt     DateTime   @default(now())
}
```

---

## 4. Real-Time Telephony Call Flow

```
[ Inbound Call from Homeowner ]
              │
              ▼
    [ Twilio / Ringba DID ]
              │
              ▼
   [ CityClick IVR Webhook ]
              │
   - Whisper: "Press 1 for immediate emergency service, 2 for estimates"
   - Geo-Lookup: Match Caller ID area code or dialed tracking pool
              │
              ▼
     [ Routing Logic ]
   ┌──────────┴────────────────────────┐
   │                                   │
[ Assigned Local Pro Available ]   [ Fallback to Buyer Network Exchange ]
- Ring direct line                 - Route to Service Direct / Networx SIP
- Whisper pro: "CityClick Lead"    - Standard contract payout
- Bridge caller                    - Bridge caller
   │                                   │
   └──────────┬────────────────────────┘
              │
              ▼
   [ Call Completed Event ]
   - Duration check (e.g. > 90s)
   - If qualified: Log billable call & charge contractor card or record buyer receivable
   - Trigger optional post-call SMS rating to homeowner
```

---

## 5. Security, Fraud Prevention & Bot Mitigation

1. **TCPA & Consent Compliance:** Clear disclosure text above all submission forms with automated timestamp and IP logging.
2. **Phone Number Scrubbing:** Real-time lookup via Twilio Lookup API to verify mobile vs. VoIP/landline and reject burner numbers.
3. **Cloudflare Bot Management & Rate Limiting:** Form submissions throttled to maximum 3 submissions per IP per hour.
