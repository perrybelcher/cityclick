import { z } from 'zod';

export const DataGranularitySchema = z.enum([
  'place',            // Exact Census Place / Municipal boundary
  'zcta_aggregated',  // Aggregated across city's primary ZCTAs (used for ZBP NAICS)
  'county_fallback',  // County-level metric where Place data is suppressed (<25k pop)
  'state_baseline'    // State-level statutory baseline
]);

export const ProvenanceSchema = z.object({
  sourceName: z.string().min(3),       // e.g., "US Census ACS 5-Year (Table B19013)"
  sourceUrl: z.string().url(),         // Direct API endpoint or official .gov URL
  datasetVintage: z.string().min(4),   // e.g., "2024-5YR", "2026-Q2"
  verifiedAt: z.string().datetime(),   // ISO-8601 UTC timestamp
  granularity: DataGranularitySchema,
  evidenceQuote: z.string().max(280).optional() // Mandatory for Layer 2 Agent Scrapes
});

export const NaicsSaturationSchema = z.object({
  naicsCode: z.string().regex(/^\d{5,6}$/), // e.g., "722515" (Coffee & Snack Shops)
  slug: z.string(),                         // e.g., "coffee-shops"
  label: z.string(),                        // e.g., "Coffee & Snack Shops"
  establishments: z.number().int().nonnegative(),
  per10kResidents: z.number().nonnegative(),
  usAvgPer10k: z.number().positive(),
  saturationIndex: z.number().int().nonnegative(), // 100 = US benchmark
  status: z.enum(['underserved', 'balanced', 'saturated']),
  annualPayrollAvgUsd: z.number().nonnegative().nullable(),
  provenance: ProvenanceSchema
});

export const TrafficCorridorSchema = z.object({
  roadName: z.string().min(2),
  segmentDescription: z.string(),
  aadt: z.number().int().positive(),        // Annual Average Daily Traffic
  heavyTruckPct: z.number().min(0).max(100).nullable(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  year: z.number().int().min(2020).max(2030),
  provenance: ProvenanceSchema
});

export const MunicipalPermitIntelSchema = z.object({
  generalBusinessLicenseRequired: z.boolean().nullable(),
  businessLicenseFeeSummary: z.string().nullable(),
  businessLicensePortalUrl: z.string().url().nullable(),
  zoningLookupUrl: z.string().url().nullable(),
  buildingPermitPortalUrl: z.string().url().nullable(),
  certificateOfOccupancyFee: z.string().nullable(),
  avgPermitWaitDays: z.number().int().positive().max(730).nullable(),
  shortTermRentalStatus: z.enum(['allowed', 'restricted', 'banned', 'unverified']),
  foodTruckPermitStatus: z.enum(['allowed', 'restricted', 'banned', 'unverified']),
  combinedSalesTaxRate: z.number().min(0).max(0.15), // e.g., 0.0825 for 8.25%
  stateTaxRate: z.number().min(0).max(0.12),
  localTaxRate: z.number().min(0).max(0.10),
  provenance: ProvenanceSchema
});

export const ExecutiveTravelIntelSchema = z.object({
  timeZone: z.string(),                     // e.g., "America/Chicago (Central Time: UTC-6 / CDT UTC-5)"
  timeZoneAbbr: z.string(),                 // e.g., "CT"
  utcOffset: z.string(),                    // e.g., "-06:00"
  primaryAirport: z.object({
    name: z.string(),                       // e.g., "Austin-Bergstrom International Airport"
    iata: z.string().length(3),             // e.g., "AUS"
    distanceMiles: z.number().positive(),
    transitToDowntown: z.string()           // e.g., "20 min via Rideshare / CapMetro Route 20 ($1.25)"
  }),
  powerPlugs: z.object({
    types: z.array(z.string()),             // ['Type A (2-pin)', 'Type B (3-pin standard grounded)']
    voltage: z.string(),                    // "120V"
    frequency: z.string(),                  // "60Hz"
    adapterAdvice: z.string()               // e.g., "Visitors from UK, EU, AU, and Asia require a step-up voltage adapter or Type A/B plug converter."
  }),
  currency: z.object({
    code: z.string(),                       // "USD"
    symbol: z.string(),                     // "$"
    name: z.string(),                       // "United States Dollar"
    tippingCustoms: z.string(),             // e.g., "18–20% standard in restaurants and bars. $2–$5/bag for bellhops. 15–20% for taxis/rideshares."
    paymentMethods: z.string()              // e.g., "Apple Pay, Google Pay, and contactless chip cards universally accepted. Cashless venues common."
  }),
  climate: z.object({
    summerHighF: z.number(),                // e.g., 97
    winterLowF: z.number(),                 // e.g., 42
    annualRainfallInches: z.number(),       // e.g., 35.5
    bestVisitMonths: z.string(),            // e.g., "October–November and March–May for mild outdoor scouting temperatures"
    weatherSummary: z.string()
  }),
  emergency: z.object({
    emergencyDispatch: z.string(),          // "911"
    nonEmergencyPolice: z.string(),         // "311 or (512) 974-2000"
    nearestTraumaHospital: z.string(),      // "Dell Seton Medical Center at UT (Level 1 Trauma Center)"
    hospitalAddress: z.string()
  }),
  visitorLogistics: z.object({
    tapWaterPotability: z.string(),         // "100% Safe municipal drinking water conforming to EPA standards."
    salesTaxRefundPolicy: z.string(),       // e.g., "Texas TaxFree Shopping allows foreign visitors to claim sales tax refunds at AUS airport booths for qualifying purchases."
    rideshareAvailability: z.string()       // "Ubiquitous (Uber, Lyft, and local taxi fleets operational 24/7)"
  }),
  provenance: ProvenanceSchema
});

export const CityRecordSchema = z.object({
  slug: z.string().regex(/^[a-z]{2}\/[a-z0-9-]+$/), // e.g., "tx/austin"
  cityId: z.string().regex(/^\d{7}$/),              // 7-digit State+Place FIPS e.g., "4805000"
  countyFips: z.string().regex(/^\d{5}$/),          // 5-digit State+County FIPS e.g., "48453"
  name: z.string().min(1),
  stateCode: z.string().length(2),
  stateName: z.string().min(3),
  countyName: z.string().min(3),
  lat: z.number().min(17).max(72),                  // US bounds
  lng: z.number().min(-180).max(-64),
  primaryZips: z.array(z.string().regex(/^\d{5}$/)).min(1),
  demographics: z.object({
    population: z.number().int().positive(),
    popGrowth5YrPct: z.number().min(-50).max(200),
    medianHouseholdIncome: z.number().int().positive(),
    perCapitaIncome: z.number().int().positive(),
    medianAge: z.number().min(15).max(85),
    daytimeWorkerPop: z.number().int().nonnegative(),
    daytimePopSurgePct: z.number().min(-80).max(500),
    medianGrossRent: z.number().int().positive(),
    medianHomeValue: z.number().int().positive(),
    provenance: ProvenanceSchema
  }),
  laborAndEconomy: z.object({
    unemploymentRatePct: z.number().min(0).max(40),
    avgWeeklyWageAllIndustries: z.number().positive(),
    newHousingPermits12Mo: z.number().int().nonnegative(),
    permitsPer1kResidents: z.number().nonnegative(),
    femaRiskScore: z.number().min(0).max(100),
    provenance: ProvenanceSchema
  }),
  industries: z.array(NaicsSaturationSchema).length(25),
  permitsAndTax: MunicipalPermitIntelSchema,
  topTrafficCorridors: z.array(TrafficCorridorSchema),
  marketSignals: z.object({
    reportedRetailRentSqFtYr: z.number().positive().nullable(),
    reportedIndustrialRentSqFtYr: z.number().positive().nullable(),
    topSearchedNaics30d: z.array(z.string()),
    verifiedLocalProsCount: z.number().int().nonnegative()
  }),
  scores: z.object({
    overallViability: z.number().int().min(0).max(100),
    purchasingPower: z.number().int().min(0).max(100),
    growthMomentum: z.number().int().min(0).max(100),
    costEfficiency: z.number().int().min(0).max(100),
    regulatoryFriction: z.number().int().min(0).max(100)
  }),
  executiveTravel: ExecutiveTravelIntelSchema.optional()
});

export const BreakevenInputSchema = z.object({
  sqft: z.number().positive(),
  baseRentPerSqFtYr: z.number().nonnegative(),
  nnnCamPerSqFtYr: z.number().nonnegative().default(6.50),
  hourlyWage: z.number().positive(),
  staffHoursPerWeek: z.number().nonnegative(),
  payrollTaxAndBenefitsLoadPct: z.number().min(0).max(1).default(0.18),
  otherMonthlyFixedOverhead: z.number().nonnegative().default(1200),
  avgGrossTicket: z.number().positive(),
  cogsPct: z.number().min(0).max(0.999),
  combinedSalesTaxRate: z.number().min(0).max(0.15)
});

export const BreakevenOutputSchema = z.object({
  monthlyOccupancyCost: z.number().nonnegative(),
  monthlyLaborCost: z.number().nonnegative(),
  monthlyFixedCost: z.number().nonnegative(),
  netTicketExTax: z.number().positive(),
  contributionMarginPerCustomer: z.number().positive(),
  monthlyCustomersNeeded: z.number().int().nonnegative(),
  dailyCustomersNeeded: z.number().int().nonnegative(),
  monthlyBreakEvenNetRevenue: z.number().nonnegative(),
  dailyBreakEvenGrossReceipts: z.number().nonnegative(),
  annualRevenuePerSqFtNeeded: z.number().nonnegative()
});

export type DataGranularity = z.infer<typeof DataGranularitySchema>;
export type Provenance = z.infer<typeof ProvenanceSchema>;
export type NaicsSaturation = z.infer<typeof NaicsSaturationSchema>;
export type TrafficCorridor = z.infer<typeof TrafficCorridorSchema>;
export type MunicipalPermitIntel = z.infer<typeof MunicipalPermitIntelSchema>;
export type ExecutiveTravelIntel = z.infer<typeof ExecutiveTravelIntelSchema>;
export type CityRecord = z.infer<typeof CityRecordSchema>;
export type BreakevenInput = z.infer<typeof BreakevenInputSchema>;
export type BreakevenOutput = z.infer<typeof BreakevenOutputSchema>;
