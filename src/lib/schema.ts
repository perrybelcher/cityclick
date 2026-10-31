import { z } from 'zod';

export const DataGranularitySchema = z.enum([
  'place',            // Exact Census Place / Municipal boundary
  'zcta_aggregated',  // Aggregated across city's primary ZCTAs (used for ZBP NAICS)
  'zip_aggregated',   // Alias used by rebuild_verified_cities.py for ZBP ZIP aggregation
  'county_fallback',  // County-level metric where Place data is suppressed (<25k pop)
  'state_baseline',   // State-level statutory baseline
]);

export const ProvenanceSchema = z.object({
  sourceName: z.string().min(3),
  sourceUrl: z.string().url(),
  datasetVintage: z.string().min(4),
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/),
  granularity: DataGranularitySchema,
  evidenceQuote: z.string().max(600).optional(),
});

export const NaicsSaturationSchema = z.object({
  naicsCode: z.string().regex(/^\d{5,6}$/),
  slug: z.string(),
  label: z.string(),
  category: z.string().optional(),
  establishments: z.number().int().nonnegative(),
  per10kResidents: z.number().nonnegative(),
  usAvgPer10k: z.number().positive(),
  saturationIndex: z.number().int().nonnegative(),
  status: z.enum(['underserved', 'balanced', 'saturated']),
  smallSample: z.boolean().optional(),
  annualPayrollAvgUsd: z.number().nonnegative().nullable().optional(),
  provenance: ProvenanceSchema,
});

export const TrafficCorridorSchema = z.object({
  roadName: z.string().min(2),
  segmentDescription: z.string(),
  aadt: z.number().int().positive(),
  heavyTruckPct: z.number().min(0).max(100).nullable(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  year: z.number().int().min(2020).max(2030),
  provenance: ProvenanceSchema,
});

export const MunicipalPermitIntelSchema = z.object({
  generalBusinessLicenseRequired: z.boolean().nullable().optional(),
  businessLicenseFeeSummary: z.string().nullable().optional(),
  businessLicensePortalUrl: z.string().url().nullable().optional(),
  zoningLookupUrl: z.string().url().nullable().optional(),
  buildingPermitPortalUrl: z.string().url().nullable().optional(),
  certificateOfOccupancyFee: z.string().nullable().optional(),
  avgPermitWaitDays: z.number().int().positive().max(730).nullable().optional(),
  shortTermRentalStatus: z.enum(['allowed', 'restricted', 'banned', 'unverified']).optional(),
  foodTruckPermitStatus: z.enum(['allowed', 'restricted', 'banned', 'unverified']).optional(),
  combinedSalesTaxRate: z.number().min(0).max(0.15),
  stateTaxRate: z.number().min(0).max(0.12),
  localTaxRate: z.number().min(0).max(0.10),
  countyTaxRate: z.number().min(0).max(0.10).nullable().optional(),
  cityTaxRate: z.number().min(0).max(0.10).nullable().optional(),
  specialDistrictTaxRate: z.number().min(0).max(0.10).nullable().optional(),
  provenance: ProvenanceSchema.optional(),
});

export const ErHospitalItemSchema = z.object({
  name: z.string(),
  address: z.string(),
  type: z.string(),
  cmsFacilityId: z.string().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export const ExecutiveTravelIntelSchema = z.object({
  timeZone: z.string().optional(),
  timeZoneAbbr: z.string().optional(),
  utcOffset: z.string().optional(),
  primaryAirport: z
    .object({
      name: z.string(),
      iata: z.string().nullable().optional(),
      lat: z.number().nullable().optional(),
      lng: z.number().nullable().optional(),
      distanceMiles: z.number().nonnegative().nullable().optional(),
      transitToDowntown: z.string().nullable().optional(),
      source: z.string().optional(),
      sourceUrl: z.string().optional(),
      cityCenterMethod: z.string().optional(),
      retrieved: z.string().optional(),
    })
    .optional(),
  powerPlugs: z
    .object({
      types: z.array(z.string()),
      voltage: z.string(),
      frequency: z.string(),
      adapterAdvice: z.string(),
    })
    .optional(),
  currency: z
    .object({
      code: z.string(),
      symbol: z.string(),
      name: z.string(),
      tippingCustoms: z.string(),
      paymentMethods: z.string(),
    })
    .optional(),
  climate: z
    .object({
      summerHighF: z.number(),
      winterLowF: z.number(),
      annualRainfallInches: z.number(),
      bestVisitMonths: z.string().optional(),
      weatherSummary: z.string().optional(),
      summerHighBasis: z.string().optional(),
      winterLowBasis: z.string().optional(),
      source: z.string().optional(),
    })
    .optional(),
  emergency: z
    .object({
      emergencyDispatch: z.string().optional(),
      nonEmergencyPolice: z.string().optional(),
      nearestTraumaHospital: z.string().optional(),
      hospitalAddress: z.string().optional(),
      cmsFacilityId: z.string().optional(),
      emergencyServices: z.boolean().optional(),
      source: z.string().nullable().optional(),
      sourceNote: z.string().optional(),
      erHospitals: z.array(ErHospitalItemSchema).optional(),
      erHospitalsSource: z.string().nullable().optional(),
      erHospitalsScope: z.string().nullable().optional(),
    })
    .optional(),
  visitorLogistics: z
    .object({
      tapWaterPotability: z.string().optional(),
      salesTaxRefundPolicy: z.string().optional(),
      rideshareAvailability: z.string().optional(),
    })
    .optional(),
  provenance: ProvenanceSchema.optional(),
});

export const HousingAndTaxesSchema = z.object({
  medianHomeValue: z.number().nonnegative().nullable().optional(),
  medianGrossRent: z.number().nonnegative().nullable().optional(),
  medianRealEstateTaxPaid: z.number().nonnegative().nullable().optional(),
  effectivePropertyTaxRatePct: z.number().nonnegative().nullable().optional(),
  homesteadExemptionNote: z.string().nullable().optional(),
  countyName: z.string().nullable().optional(),
  source: z.string().optional(),
  sourceUrl: z.string().optional(),
});

export const ClimateNormalsSchema = z.object({
  peakSummerHighF: z.number(),
  winterLowF: z.number(),
  annualRainfallInches: z.number(),
  sourceName: z.string().optional(),
  sourceUrl: z.string().optional(),
});

export const TerrainElevationSchema = z.object({
  elevationFeet: z.number(),
  elevationMeters: z.number(),
  topographyClass: z.string(),
  sourceName: z.string().optional(),
  sourceUrl: z.string().optional(),
});

export const WaterUtilitySchema = z.object({
  pwsid: z.string(),
  providerName: z.string(),
  populationServed: z.number().nonnegative(),
  sourceType: z.string(),
  source: z.string(),
  sourceUrl: z.string().optional(),
  retrieved: z.string().optional(),
});

export const HigherEducationInstitutionSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string(),
  studentSize: z.number().nonnegative().nullable().optional(),
  ownership: z.string().nullable().optional(),
  schoolUrl: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export const HigherEducationSchema = z.object({
  institutionCount: z.number().int().nonnegative(),
  totalEnrollment: z.number().int().nonnegative().optional(),
  institutions: z.array(HigherEducationInstitutionSchema),
  sourceName: z.string(),
  sourceUrl: z.string(),
  retrieved: z.string(),
});

export const EvSampleStationSchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  network: z.string().nullable().optional(),
  dcFastPorts: z.number().int().nonnegative().optional(),
  level2Ports: z.number().int().nonnegative().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export const EvInfrastructureSchema = z.object({
  totalStations: z.number().int().nonnegative(),
  totalChargingPorts: z.number().int().nonnegative().optional(),
  dcFastPorts: z.number().int().nonnegative(),
  level2Ports: z.number().int().nonnegative(),
  sampleStations: z.array(EvSampleStationSchema).optional(),
  sourceName: z.string(),
  sourceUrl: z.string(),
  retrieved: z.string(),
});

export const NationalParkItemSchema = z.object({
  parkCode: z.string(),
  fullName: z.string(),
  designation: z.string().optional(),
  distanceMiles: z.number().nonnegative().optional(),
  description: z.string().optional(),
  url: z.string(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export const NationalParksSchema = z.object({
  parks: z.array(NationalParkItemSchema),
  sourceName: z.string(),
  sourceUrl: z.string(),
  retrieved: z.string(),
});

export const UpcomingEventItemSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  date: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  url: z.string(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export const UpcomingEventsSchema = z.object({
  totalMatchingEvents: z.number().int().nonnegative().optional(),
  events: z.array(UpcomingEventItemSchema),
  sourceName: z.string(),
  sourceUrl: z.string(),
  retrieved: z.string(),
});

export const CityRecordSchema = z.object({
  slug: z.string().regex(/^[a-z]{2}\/[a-z0-9-]+$/),
  cityId: z.string().regex(/^\d{5,7}$/),
  countyFips: z.string().regex(/^\d{5}$/),
  name: z.string().min(1),
  stateCode: z.string().length(2),
  stateName: z.string().min(3),
  countyName: z.string().min(3),
  lat: z.number().min(17).max(72).nullable(),
  lng: z.number().min(-180).max(-64).nullable(),
  primaryZips: z.array(z.string().regex(/^\d{5}$/)),
  demographics: z.object({
    population: z.number().int().positive(),
    popChange2020to2023Pct: z.number().min(-50).max(200).nullable().optional(),
    popChangeBasis: z.string().optional(),
    popGrowth5YrPct: z.number().min(-50).max(200).optional(),
    medianHouseholdIncome: z.number().int().positive(),
    perCapitaIncome: z.number().int().positive(),
    medianAge: z.number().min(10).max(95),
    daytimeWorkerPop: z.number().int().nonnegative().optional(),
    daytimePopSurgePct: z.number().min(-80).max(500).optional(),
    medianGrossRent: z.number().int().positive(),
    medianHomeValue: z.number().int().positive(),
    provenance: ProvenanceSchema,
  }),
  housingAndTaxes: HousingAndTaxesSchema.optional(),
  climateNormals: ClimateNormalsSchema.optional(),
  terrainElevation: TerrainElevationSchema.optional(),
  waterUtility: WaterUtilitySchema.optional(),
  higherEducation: HigherEducationSchema.optional(),
  evInfrastructure: EvInfrastructureSchema.optional(),
  nationalParks: NationalParksSchema.optional(),
  upcomingEvents: UpcomingEventsSchema.optional(),
  laborAndEconomy: z
    .object({
      unemploymentRatePct: z.number().min(0).max(40),
      avgWeeklyWageAllIndustries: z.number().positive(),
      newHousingPermits12Mo: z.number().int().nonnegative(),
      permitsPer1kResidents: z.number().nonnegative(),
      femaRiskScore: z.number().min(0).max(100),
      provenance: ProvenanceSchema,
    })
    .optional(),
  industries: z.array(NaicsSaturationSchema),
  permitsAndTax: MunicipalPermitIntelSchema,
  topTrafficCorridors: z.array(TrafficCorridorSchema).optional(),
  marketSignals: z
    .object({
      reportedRetailRentSqFtYr: z.number().positive().nullable().optional(),
      reportedIndustrialRentSqFtYr: z.number().positive().nullable().optional(),
      topSearchedNaics30d: z.array(z.string()).optional(),
      verifiedLocalProsCount: z.number().int().nonnegative().optional(),
    })
    .optional(),
  scores: z
    .object({
      overallViability: z.number().int().min(0).max(100),
      purchasingPower: z.number().int().min(0).max(100),
      growthMomentum: z.number().int().min(0).max(100),
      costEfficiency: z.number().int().min(0).max(100),
      regulatoryFriction: z.number().int().min(0).max(100),
    })
    .optional(),
  executiveTravel: ExecutiveTravelIntelSchema.optional(),
});

export const BreakevenInputSchema = z.object({
  sqft: z.number().positive(),
  baseRentPerSqFtYr: z.number().nonnegative(),
  nnnCamPerSqFtYr: z.number().nonnegative().default(6.5),
  hourlyWage: z.number().positive(),
  staffHoursPerWeek: z.number().nonnegative(),
  payrollTaxAndBenefitsLoadPct: z.number().min(0).max(1).default(0.18),
  otherMonthlyFixedOverhead: z.number().nonnegative().default(1200),
  avgGrossTicket: z.number().positive(),
  cogsPct: z.number().min(0).max(0.999),
  combinedSalesTaxRate: z.number().min(0).max(0.15),
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
  annualRevenuePerSqFtNeeded: z.number().nonnegative(),
});

export type DataGranularity = z.infer<typeof DataGranularitySchema>;
export type Provenance = z.infer<typeof ProvenanceSchema>;
export type NaicsSaturation = z.infer<typeof NaicsSaturationSchema>;
export type TrafficCorridor = z.infer<typeof TrafficCorridorSchema>;
export type MunicipalPermitIntel = z.infer<typeof MunicipalPermitIntelSchema>;
export type ExecutiveTravelIntel = z.infer<typeof ExecutiveTravelIntelSchema>;
export type CityRecord = z.infer<typeof CityRecordSchema>;
export type BreakevenInput = z.input<typeof BreakevenInputSchema>;
export type BreakevenOutput = z.infer<typeof BreakevenOutputSchema>;
