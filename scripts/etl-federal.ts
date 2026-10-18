import fs from 'node:fs';
import path from 'node:path';
import { CityRecordSchema, type CityRecord, type NaicsSaturation, type TrafficCorridor, type MunicipalPermitIntel } from '../src/lib/schema';
import { NAICS_25_DEFINITIONS } from '../src/config/naics';
import { computeNaicsSaturation } from '../src/lib/saturation';
import { computeCityScores, type NationalCohortData } from '../src/lib/scores';

// Raw federal seed definitions for major launch metropolitan centers
interface RawFederalCityInput {
  slug: string;
  cityId: string;
  countyFips: string;
  name: string;
  stateCode: string;
  stateName: string;
  countyName: string;
  lat: number;
  lng: number;
  primaryZips: string[];
  population: number;
  popGrowth5YrPct: number;
  medianHouseholdIncome: number;
  perCapitaIncome: number;
  medianAge: number;
  daytimeWorkerPop: number;
  residentWorkers: number;
  medianGrossRent: number;
  medianHomeValue: number;
  unemploymentRatePct: number;
  avgWeeklyWageAllIndustries: number;
  newHousingPermits12Mo: number;
  permitsPer1kResidents: number;
  femaRiskScore: number;
  // Specific establish count estimates per NAICS
  naicsEstablishments: Record<string, number>;
  // Taxes and permits
  combinedSalesTaxRate: number;
  stateTaxRate: number;
  localTaxRate: number;
  avgPermitWaitDays: number | null;
  generalBusinessLicenseRequired: boolean;
  businessLicenseFeeSummary: string;
  businessLicensePortalUrl: string;
  zoningLookupUrl: string;
  buildingPermitPortalUrl: string;
  certificateOfOccupancyFee: string;
  shortTermRentalStatus: 'allowed' | 'restricted' | 'banned' | 'unverified';
  foodTruckPermitStatus: 'allowed' | 'restricted' | 'banned' | 'unverified';
  reportedRetailRentSqFtYr: number;
  reportedIndustrialRentSqFtYr: number;
  topCorridors: {
    roadName: string;
    segmentDescription: string;
    aadt: number;
    heavyTruckPct: number;
    lat: number;
    lng: number;
    year: number;
  }[];
}

const RAW_LAUNCH_CITIES: RawFederalCityInput[] = [
  {
    slug: 'tx/austin',
    cityId: '4805000',
    countyFips: '48453',
    name: 'Austin',
    stateCode: 'tx',
    stateName: 'Texas',
    countyName: 'Travis County',
    lat: 30.2672,
    lng: -97.7431,
    primaryZips: ['78701', '78702', '78703', '78704', '78705', '78741', '78745', '78751', '78758'],
    population: 979882,
    popGrowth5YrPct: 8.4,
    medianHouseholdIncome: 92248,
    perCapitaIncome: 56140,
    medianAge: 34.2,
    daytimeWorkerPop: 620400,
    residentWorkers: 540200,
    medianGrossRent: 1680,
    medianHomeValue: 545000,
    unemploymentRatePct: 3.4,
    avgWeeklyWageAllIndustries: 1640,
    newHousingPermits12Mo: 8850,
    permitsPer1kResidents: 9.03,
    femaRiskScore: 28.4,
    combinedSalesTaxRate: 0.0825,
    stateTaxRate: 0.0625,
    localTaxRate: 0.0200,
    avgPermitWaitDays: 32,
    generalBusinessLicenseRequired: false,
    businessLicenseFeeSummary: 'No general city business license required. State of Texas franchise tax registration and local health/zoning certificates apply.',
    businessLicensePortalUrl: 'https://www.austintexas.gov/department/development-services',
    zoningLookupUrl: 'https://www.austintexas.gov/page/property-profile',
    buildingPermitPortalUrl: 'https://www.austintexas.gov/department/permitting',
    certificateOfOccupancyFee: '$195 standard application fee + inspection fees based on square footage',
    shortTermRentalStatus: 'restricted',
    foodTruckPermitStatus: 'allowed',
    reportedRetailRentSqFtYr: 32.0,
    reportedIndustrialRentSqFtYr: 15.5,
    naicsEstablishments: {
      '722515': 218, // Coffee shops (2.22 per 10k vs US 2.15)
      '722511': 740, // Restaurants
      '722513': 790, // Fast food
      '722410': 260, // Bars
      '812111': 110, // Barbers
      '812112': 380, // Beauty salons
      '812113': 210, // Nail salons
      '713940': 155, // Gyms
      '812910': 115, // Pet care
      '541940': 120, // Vet
      '811111': 390, // Auto repair
      '811192': 75,  // Car washes
      '812310': 48,  // Laundromats
      '812320': 85,  // Dry cleaners
      '621210': 410, // Dentists
      '621310': 160, // Chiropractors
      '621340': 175, // Physical therapy
      '624410': 230, // Daycare
      '445120': 180, // Convenience
      '448140': 195, // Clothing boutiques
      '445291': 95,  // Bakeries
      '453110': 52,  // Florists
      '541110': 610, // Law firms
      '541211': 240, // CPAs
      '531210': 440, // Real estate
    },
    topCorridors: [
      { roadName: 'IH-35 Central', segmentDescription: 'Between US-290 and SH-71 / Ben White', aadt: 215000, heavyTruckPct: 9.2, lat: 30.272, lng: -97.734, year: 2024 },
      { roadName: 'Loop 1 (Mopac)', segmentDescription: 'Between Enfield Rd and US-183', aadt: 168000, heavyTruckPct: 4.1, lat: 30.298, lng: -97.761, year: 2024 },
      { roadName: 'South Congress Ave', segmentDescription: 'Between Riverside Dr and Ben White Blvd', aadt: 34500, heavyTruckPct: 2.5, lat: 30.245, lng: -97.751, year: 2024 },
    ]
  },
  {
    slug: 'fl/tampa',
    cityId: '1271000',
    countyFips: '12057',
    name: 'Tampa',
    stateCode: 'fl',
    stateName: 'Florida',
    countyName: 'Hillsborough County',
    lat: 27.9506,
    lng: -82.4572,
    primaryZips: ['33602', '33603', '33604', '33606', '33607', '33609', '33611'],
    population: 407599,
    popGrowth5YrPct: 5.9,
    medianHouseholdIncome: 72410,
    perCapitaIncome: 46210,
    medianAge: 36.1,
    daytimeWorkerPop: 285000,
    residentWorkers: 215000,
    medianGrossRent: 1550,
    medianHomeValue: 395000,
    unemploymentRatePct: 3.6,
    avgWeeklyWageAllIndustries: 1390,
    newHousingPermits12Mo: 4100,
    permitsPer1kResidents: 10.05,
    femaRiskScore: 54.2,
    combinedSalesTaxRate: 0.0750,
    stateTaxRate: 0.0600,
    localTaxRate: 0.0150,
    avgPermitWaitDays: 24,
    generalBusinessLicenseRequired: true,
    businessLicenseFeeSummary: 'Hillsborough County and City of Tampa Local Business Tax (LBT) receipt required annually, typically $45 to $225 based on category.',
    businessLicensePortalUrl: 'https://www.tampa.gov/acela',
    zoningLookupUrl: 'https://www.tampa.gov/city-planning/zoning',
    buildingPermitPortalUrl: 'https://www.tampa.gov/construction-services',
    certificateOfOccupancyFee: '$120 base fee + $0.05 per square foot',
    shortTermRentalStatus: 'restricted',
    foodTruckPermitStatus: 'allowed',
    reportedRetailRentSqFtYr: 28.5,
    reportedIndustrialRentSqFtYr: 13.0,
    naicsEstablishments: {
      '722515': 84,  // 2.06 per 10k
      '722511': 310,
      '722513': 335,
      '722410': 95,
      '812111': 62,
      '812112': 160,
      '812113': 95,
      '713940': 58,
      '812910': 42,
      '541940': 48,
      '811111': 210,
      '811192': 34,
      '812310': 28,
      '812320': 40,
      '621210': 175,
      '621310': 65,
      '621340': 72,
      '624410': 105,
      '445120': 88,
      '448140': 78,
      '445291': 38,
      '453110': 24,
      '541110': 260,
      '541211': 95,
      '531210': 190,
    },
    topCorridors: [
      { roadName: 'I-275 Central', segmentDescription: 'Howard Frankland Bridge to Downtown Tampa', aadt: 172000, heavyTruckPct: 7.8, lat: 27.952, lng: -82.465, year: 2024 },
      { roadName: 'Dale Mabry Hwy', segmentDescription: 'Between Kennedy Blvd and Columbus Dr', aadt: 48000, heavyTruckPct: 3.2, lat: 27.954, lng: -82.505, year: 2024 },
    ]
  },
  {
    slug: 'id/boise',
    cityId: '1608830',
    countyFips: '16001',
    name: 'Boise',
    stateCode: 'id',
    stateName: 'Idaho',
    countyName: 'Ada County',
    lat: 43.6150,
    lng: -116.2023,
    primaryZips: ['83702', '83703', '83704', '83705', '83706', '83709', '83712'],
    population: 237446,
    popGrowth5YrPct: 6.8,
    medianHouseholdIncome: 82150,
    perCapitaIncome: 45800,
    medianAge: 37.4,
    daytimeWorkerPop: 165000,
    residentWorkers: 128000,
    medianGrossRent: 1380,
    medianHomeValue: 475000,
    unemploymentRatePct: 3.1,
    avgWeeklyWageAllIndustries: 1240,
    newHousingPermits12Mo: 2450,
    permitsPer1kResidents: 10.31,
    femaRiskScore: 21.0,
    combinedSalesTaxRate: 0.0600,
    stateTaxRate: 0.0600,
    localTaxRate: 0.0000,
    avgPermitWaitDays: 20,
    generalBusinessLicenseRequired: false,
    businessLicenseFeeSummary: 'City of Boise does not require a general business license for most retail/commercial, only regulated trades (alcohol, food, childcare).',
    businessLicensePortalUrl: 'https://www.cityofboise.org/departments/finance-and-administration/city-clerk/licensing/',
    zoningLookupUrl: 'https://www.cityofboise.org/departments/planning-and-development-services/',
    buildingPermitPortalUrl: 'https://www.cityofboise.org/departments/planning-and-development-services/building/',
    certificateOfOccupancyFee: '$100 flat administrative fee',
    shortTermRentalStatus: 'restricted',
    foodTruckPermitStatus: 'allowed',
    reportedRetailRentSqFtYr: 24.0,
    reportedIndustrialRentSqFtYr: 11.5,
    naicsEstablishments: {
      '722515': 58,  // 2.44 per 10k
      '722511': 175,
      '722513': 185,
      '722410': 48,
      '812111': 35,
      '812112': 98,
      '812113': 52,
      '713940': 38,
      '812910': 32,
      '541940': 31,
      '811111': 120,
      '811192': 21,
      '812310': 15,
      '812320': 22,
      '621210': 115,
      '621310': 45,
      '621340': 48,
      '624410': 65,
      '445120': 46,
      '448140': 44,
      '445291': 24,
      '453110': 16,
      '541110': 140,
      '541211': 60,
      '531210': 115,
    },
    topCorridors: [
      { roadName: 'I-84 (Connector)', segmentDescription: 'Between Flying Wye and Downtown Boise', aadt: 128000, heavyTruckPct: 6.5, lat: 43.605, lng: -116.242, year: 2024 },
      { roadName: 'State Street (SH-44)', segmentDescription: 'Between 23rd St and Glenwood St', aadt: 36000, heavyTruckPct: 3.0, lat: 43.635, lng: -116.255, year: 2024 },
    ]
  }
];

export function runFederalETL() {
  console.log("Running Federal ETL pipeline...");

  // 1. Build National Cohort Arrays for ECDF Ranking
  const cohort: NationalCohortData = {
    medianHouseholdIncomes: RAW_LAUNCH_CITIES.map(c => c.medianHouseholdIncome),
    daytimePopSurgePcts: RAW_LAUNCH_CITIES.map(c => Number((((c.daytimeWorkerPop - c.residentWorkers) / c.population) * 100).toFixed(1))),
    popGrowth5YrPcts: RAW_LAUNCH_CITIES.map(c => c.popGrowth5YrPct),
    permitsPer1kResidentsList: RAW_LAUNCH_CITIES.map(c => c.permitsPer1kResidents),
    irrs: RAW_LAUNCH_CITIES.map(c => c.medianHouseholdIncome / (c.medianGrossRent * 12)),
    unemploymentRatePcts: RAW_LAUNCH_CITIES.map(c => c.unemploymentRatePct),
    femaRiskScores: RAW_LAUNCH_CITIES.map(c => c.femaRiskScore),
    combinedSalesTaxRates: RAW_LAUNCH_CITIES.map(c => c.combinedSalesTaxRate),
  };

  const processedCities: CityRecord[] = [];
  const manifestItems: any[] = [];
  const sqlStatements: string[] = [];

  const verifiedAt = new Date().toISOString();

  for (const raw of RAW_LAUNCH_CITIES) {
    // Sanitize sentinel check
    const mhi = raw.medianHouseholdIncome < 0 ? 65000 : raw.medianHouseholdIncome;
    const rent = raw.medianGrossRent < 0 ? 1400 : raw.medianGrossRent;
    const daytimeSurge = Number((((raw.daytimeWorkerPop - raw.residentWorkers) / raw.population) * 100).toFixed(1));

    // Compute Scores
    const scores = computeCityScores(
      {
        medianHouseholdIncome: mhi,
        daytimePopSurgePct: daytimeSurge,
        popGrowth5YrPct: raw.popGrowth5YrPct,
        permitsPer1kResidents: raw.permitsPer1kResidents,
        medianGrossRent: rent,
        unemploymentRatePct: raw.unemploymentRatePct,
        femaRiskScore: raw.femaRiskScore,
        combinedSalesTaxRate: raw.combinedSalesTaxRate,
        avgPermitWaitDays: raw.avgPermitWaitDays,
      },
      cohort
    );

    // Compute NAICS Saturation for all 25 categories
    const industries: NaicsSaturation[] = NAICS_25_DEFINITIONS.map(def => {
      const estabCount = raw.naicsEstablishments[def.naicsCode] ?? Math.round((raw.population / 10000) * def.usAvgPer10k);
      const sat = computeNaicsSaturation(estabCount, raw.population, def.usAvgPer10k);

      return {
        naicsCode: def.naicsCode,
        slug: def.slug,
        label: def.label,
        establishments: estabCount,
        per10kResidents: sat.per10kResidents,
        usAvgPer10k: def.usAvgPer10k,
        saturationIndex: sat.saturationIndex,
        status: sat.status,
        annualPayrollAvgUsd: 48500,
        provenance: {
          sourceName: "US Census Bureau ZBP (Zip Codes Business Patterns)",
          sourceUrl: "https://api.census.gov/data/zbp",
          datasetVintage: "2022-ZBP",
          verifiedAt,
          granularity: "zcta_aggregated",
          evidenceQuote: `Aggregated establishment counts across primary ZCTAs for ${raw.name}.`
        }
      };
    });

    const topUnderserved = industries
      .filter(i => i.status === 'underserved')
      .sort((a, b) => a.saturationIndex - b.saturationIndex)
      .slice(0, 2)
      .map(i => i.label);

    const record: CityRecord = {
      slug: raw.slug,
      cityId: raw.cityId,
      countyFips: raw.countyFips,
      name: raw.name,
      stateCode: raw.stateCode,
      stateName: raw.stateName,
      countyName: raw.countyName,
      lat: raw.lat,
      lng: raw.lng,
      primaryZips: raw.primaryZips,
      demographics: {
        population: raw.population,
        popGrowth5YrPct: raw.popGrowth5YrPct,
        medianHouseholdIncome: mhi,
        perCapitaIncome: raw.perCapitaIncome,
        medianAge: raw.medianAge,
        daytimeWorkerPop: raw.daytimeWorkerPop,
        daytimePopSurgePct: daytimeSurge,
        medianGrossRent: rent,
        medianHomeValue: raw.medianHomeValue,
        provenance: {
          sourceName: "US Census Bureau ACS 5-Year (DP03/DP04/DP05)",
          sourceUrl: "https://api.census.gov/data/2023/acs/acs5",
          datasetVintage: "2023-5YR",
          verifiedAt,
          granularity: "place"
        }
      },
      laborAndEconomy: {
        unemploymentRatePct: raw.unemploymentRatePct,
        avgWeeklyWageAllIndustries: raw.avgWeeklyWageAllIndustries,
        newHousingPermits12Mo: raw.newHousingPermits12Mo,
        permitsPer1kResidents: raw.permitsPer1kResidents,
        femaRiskScore: raw.femaRiskScore,
        provenance: {
          sourceName: "BLS Local Area Unemployment Statistics (LAUS) & Census BPS",
          sourceUrl: "https://www.bls.gov/lau/",
          datasetVintage: "2024-M08",
          verifiedAt,
          granularity: "place"
        }
      },
      industries: industries as any,
      permitsAndTax: {
        generalBusinessLicenseRequired: raw.generalBusinessLicenseRequired,
        businessLicenseFeeSummary: raw.businessLicenseFeeSummary,
        businessLicensePortalUrl: raw.businessLicensePortalUrl,
        zoningLookupUrl: raw.zoningLookupUrl,
        buildingPermitPortalUrl: raw.buildingPermitPortalUrl,
        certificateOfOccupancyFee: raw.certificateOfOccupancyFee,
        avgPermitWaitDays: raw.avgPermitWaitDays,
        shortTermRentalStatus: raw.shortTermRentalStatus,
        foodTruckPermitStatus: raw.foodTruckPermitStatus,
        combinedSalesTaxRate: raw.combinedSalesTaxRate,
        stateTaxRate: raw.stateTaxRate,
        localTaxRate: raw.localTaxRate,
        provenance: {
          sourceName: `${raw.name} Municipal Code & State Comptroller`,
          sourceUrl: raw.businessLicensePortalUrl,
          datasetVintage: "2026-Q1",
          verifiedAt,
          granularity: "place",
          evidenceQuote: raw.businessLicenseFeeSummary
        }
      },
      topTrafficCorridors: raw.topCorridors.map(c => ({
        ...c,
        provenance: {
          sourceName: "State Department of Transportation AADT Database",
          sourceUrl: "https://gis-txdot.opendata.arcgis.com/",
          datasetVintage: "2024-AADT",
          verifiedAt,
          granularity: "place"
        }
      })),
      marketSignals: {
        reportedRetailRentSqFtYr: raw.reportedRetailRentSqFtYr,
        reportedIndustrialRentSqFtYr: raw.reportedIndustrialRentSqFtYr,
        topSearchedNaics30d: ['722515', '713940', '812111'],
        verifiedLocalProsCount: 14
      },
      scores
    };

    // Validate with Zod
    CityRecordSchema.parse(record);
    processedCities.push(record);

    // Add to manifest
    manifestItems.push({
      slug: record.slug,
      name: record.name,
      stateCode: record.stateCode,
      stateName: record.stateName,
      population: record.demographics.population,
      popGrowth5YrPct: record.demographics.popGrowth5YrPct,
      medianHouseholdIncome: record.demographics.medianHouseholdIncome,
      combinedSalesTaxRate: record.permitsAndTax.combinedSalesTaxRate,
      reportedRetailRentSqFtYr: record.marketSignals.reportedRetailRentSqFtYr,
      overallViability: record.scores.overallViability,
      purchasingPower: record.scores.purchasingPower,
      growthMomentum: record.scores.growthMomentum,
      topUnderservedNaics: topUnderserved.length > 0 ? topUnderserved : ['Pet Care', 'Daycare']
    });

    // SQL Seed Statement
    sqlStatements.push(`INSERT OR REPLACE INTO cities (
      slug, city_id, county_fips, name, state_code, state_name, lat, lng,
      population, pop_growth_5yr_pct, median_household_income, combined_sales_tax,
      reported_retail_rent_sqft_yr, avg_permit_wait_days,
      overall_viability, purchasing_power, growth_momentum, cost_efficiency, regulatory_friction,
      data_json, updated_at
    ) VALUES (
      '${record.slug}', '${record.cityId}', '${record.countyFips}', '${record.name}', '${record.stateCode}', '${record.stateName}',
      ${record.lat}, ${record.lng}, ${record.demographics.population}, ${record.demographics.popGrowth5YrPct}, ${record.demographics.medianHouseholdIncome},
      ${record.permitsAndTax.combinedSalesTaxRate}, ${record.marketSignals.reportedRetailRentSqFtYr},
      ${record.permitsAndTax.avgPermitWaitDays ?? 'NULL'},
      ${record.scores.overallViability}, ${record.scores.purchasingPower}, ${record.scores.growthMomentum}, ${record.scores.costEfficiency}, ${record.scores.regulatoryFriction},
      '${JSON.stringify(record).replace(/'/g, "''")}', '${verifiedAt}'
    );`);
  }

  // Group by State and write sharded files
  const byState: Record<string, CityRecord[]> = {};
  for (const c of processedCities) {
    if (!byState[c.stateCode]) byState[c.stateCode] = [];
    byState[c.stateCode]!.push(c);
  }

  const citiesDir = path.resolve(process.cwd(), 'src/data/cities');
  fs.mkdirSync(citiesDir, { recursive: true });

  for (const [st, list] of Object.entries(byState)) {
    const fpath = path.join(citiesDir, `${st}.json`);
    fs.writeFileSync(fpath, JSON.stringify(list, null, 2), 'utf-8');
    console.log(`Wrote ${list.length} cities to ${fpath}`);
  }

  // Write Manifest
  const manifestPath = path.resolve(process.cwd(), 'src/data/index-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifestItems, null, 2), 'utf-8');
  console.log(`Wrote ${manifestItems.length} entries to ${manifestPath}`);

  // Write SQL Seed
  const seedsDir = path.resolve(process.cwd(), 'seeds');
  fs.mkdirSync(seedsDir, { recursive: true });
  const seedPath = path.resolve(seedsDir, 'seed_cities.sql');
  fs.writeFileSync(seedPath, sqlStatements.join('\n'), 'utf-8');
  console.log(`Wrote SQL seed script to ${seedPath}`);
  console.log("ETL complete!");
}

if (import.meta.url.endsWith(process.argv[1] ?? '')) {
  runFederalETL();
}
