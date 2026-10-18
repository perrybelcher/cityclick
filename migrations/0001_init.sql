-- migrations/0001_init.sql
PRAGMA foreign_keys = ON;

-- 1. Runtime City Cache for Fast Edge API & Dynamic Comparisons
CREATE TABLE IF NOT EXISTS cities (
  slug TEXT PRIMARY KEY,
  city_id TEXT NOT NULL UNIQUE,
  county_fips TEXT,
  state_code TEXT NOT NULL,
  state_name TEXT,
  name TEXT NOT NULL,
  lat REAL,
  lng REAL,
  population INTEGER NOT NULL,
  pop_growth_5yr_pct REAL NOT NULL,
  median_household_income INTEGER NOT NULL,
  combined_sales_tax REAL NOT NULL,
  reported_retail_rent_sqft_yr REAL,
  avg_permit_wait_days INTEGER,
  overall_viability INTEGER NOT NULL,
  purchasing_power INTEGER NOT NULL,
  growth_momentum INTEGER NOT NULL,
  cost_efficiency INTEGER NOT NULL,
  regulatory_friction INTEGER NOT NULL,
  data_json TEXT NOT NULL, -- Full serialized CityRecord JSON
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_cities_screener ON cities(overall_viability DESC, population DESC);
CREATE INDEX IF NOT EXISTS idx_cities_state ON cities(state_code, population DESC);

-- 2. Proprietary User Exhaust (Calculator & NAICS Lookup Telemetry)
CREATE TABLE IF NOT EXISTS calculator_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  city_slug TEXT NOT NULL,
  zip_code TEXT,
  naics_code TEXT NOT NULL,
  input_sqft INTEGER NOT NULL CHECK (input_sqft BETWEEN 100 AND 250000),
  input_rent_sqft REAL NOT NULL CHECK (input_rent_sqft BETWEEN 2.0 AND 500.0),
  input_avg_ticket REAL NOT NULL CHECK (input_avg_ticket BETWEEN 1.0 AND 25000.0),
  computed_daily_customers INTEGER NOT NULL,
  ip_hash TEXT NOT NULL -- Salted SHA-256 of client IP for deduplication (zero PII)
);

CREATE INDEX IF NOT EXISTS idx_exhaust_city_date ON calculator_events(city_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exhaust_naics_date ON calculator_events(naics_code, created_at DESC);

-- 3. Crowdsourced Ground Truth (Permit Wait Times & Commercial Lease Rates)
CREATE TABLE IF NOT EXISTS local_contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  city_slug TEXT NOT NULL,
  contributor_role TEXT NOT NULL CHECK (contributor_role IN ('broker', 'expeditor', 'attorney', 'owner')),
  reported_permit_wait_days INTEGER CHECK (reported_permit_wait_days BETWEEN 1 AND 730),
  reported_retail_rent_sqft REAL CHECK (reported_retail_rent_sqft BETWEEN 5.0 AND 400.0),
  reported_industrial_rent_sqft REAL CHECK (reported_industrial_rent_sqft BETWEEN 3.0 AND 150.0),
  notes TEXT CHECK (length(notes) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  ip_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contrib_city_status ON local_contributions(city_slug, status);

-- 4. Voluntary B2B Partner Directory
CREATE TABLE IF NOT EXISTS local_partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  city_slug TEXT NOT NULL,
  company_name TEXT NOT NULL CHECK (length(company_name) BETWEEN 2 AND 120),
  category TEXT NOT NULL CHECK (category IN ('permit_expeditor', 'commercial_broker', 'zoning_attorney', 'cpa')),
  website TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'featured_pro')),
  stripe_subscription_id TEXT,
  approved INTEGER NOT NULL DEFAULT 0 CHECK (approved IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_partners_city_approved ON local_partners(city_slug, approved, tier DESC);

-- 5. Leads & Pro API Waitlist
CREATE TABLE IF NOT EXISTS leads_and_waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  email TEXT NOT NULL,
  city_slug TEXT NOT NULL,
  naics_interest TEXT,
  source TEXT NOT NULL CHECK (source IN ('sba_pdf', 'pro_api', 'partner_claim')),
  UNIQUE(email, city_slug, source)
);

-- 6. Metered API Keys (Phase 3 Ready)
CREATE TABLE IF NOT EXISTS api_keys (
  key_hash TEXT PRIMARY KEY, -- SHA-256 hash of `cc_live_...`
  key_prefix TEXT NOT NULL,  -- First 12 chars for identification
  owner_email TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'pro')),
  daily_quota INTEGER NOT NULL,
  monthly_quota INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
