export function percentileRank(value: number, cohort: readonly number[]): number {
  if (cohort.length === 0) return 50;
  
  let lessCount = 0;
  let equalCount = 0;
  
  for (let i = 0; i < cohort.length; i++) {
    const v = cohort[i]!;
    if (v < value) {
      lessCount++;
    } else if (v === value) {
      equalCount++;
    }
  }
  
  const rank = (100 * (lessCount + 0.5 * equalCount)) / cohort.length;
  return Math.max(0, Math.min(100, Math.round(rank)));
}

export interface CityMetricInputs {
  medianHouseholdIncome: number;
  daytimePopSurgePct: number;
  popGrowth5YrPct: number;
  permitsPer1kResidents: number;
  medianGrossRent: number;
  unemploymentRatePct: number;
  femaRiskScore: number;
  combinedSalesTaxRate: number;
  avgPermitWaitDays: number | null;
}

export interface NationalCohortData {
  medianHouseholdIncomes: readonly number[];
  daytimePopSurgePcts: readonly number[];
  popGrowth5YrPcts: readonly number[];
  permitsPer1kResidentsList: readonly number[];
  irrs: readonly number[]; // Income-to-rent ratios
  unemploymentRatePcts: readonly number[];
  femaRiskScores: readonly number[];
  combinedSalesTaxRates: readonly number[];
}

export interface CityScoresOutput {
  overallViability: number;
  purchasingPower: number;
  growthMomentum: number;
  costEfficiency: number;
  regulatoryFriction: number;
}

export function computeCityScores(
  city: CityMetricInputs,
  cohort: NationalCohortData
): CityScoresOutput {
  // 1. Purchasing Power (25%)
  const incomeRank = percentileRank(city.medianHouseholdIncome, cohort.medianHouseholdIncomes);
  const daytimeRank = percentileRank(city.daytimePopSurgePct, cohort.daytimePopSurgePcts);
  const purchasingPower = Math.max(0, Math.min(100, Math.round(0.70 * incomeRank + 0.30 * daytimeRank)));

  // 2. Growth Momentum (30%)
  const growthRank = percentileRank(city.popGrowth5YrPct, cohort.popGrowth5YrPcts);
  const permitsRank = percentileRank(city.permitsPer1kResidents, cohort.permitsPer1kResidentsList);
  const growthMomentum = Math.max(0, Math.min(100, Math.round(0.55 * growthRank + 0.45 * permitsRank)));

  // 3. Cost Efficiency (25%)
  const cityIrr = city.medianGrossRent > 0 ? city.medianHouseholdIncome / (city.medianGrossRent * 12) : 2.5;
  const irrRank = percentileRank(cityIrr, cohort.irrs);
  const unempRank = percentileRank(city.unemploymentRatePct, cohort.unemploymentRatePcts);
  const femaRank = percentileRank(city.femaRiskScore, cohort.femaRiskScores);
  const costEfficiency = Math.max(
    0,
    Math.min(
      100,
      Math.round(0.50 * irrRank + 0.30 * (100 - unempRank) + 0.20 * (100 - femaRank))
    )
  );

  // 4. Regulatory Friction (20%, 100 = most business friendly)
  const taxRank = percentileRank(city.combinedSalesTaxRate, cohort.combinedSalesTaxRates);
  const taxScore = 100 - taxRank;
  
  let waitScore = 50; // Neutral prior
  if (city.avgPermitWaitDays !== null && city.avgPermitWaitDays > 0) {
    waitScore = Math.max(0, Math.min(100, Math.round(100 - (city.avgPermitWaitDays - 14) * 1.2)));
  }
  const regulatoryFriction = Math.max(0, Math.min(100, Math.round(0.65 * taxScore + 0.35 * waitScore)));

  // 5. Overall Viability (0-100)
  const overallViability = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        0.25 * purchasingPower +
        0.30 * growthMomentum +
        0.25 * costEfficiency +
        0.20 * regulatoryFriction
      )
    )
  );

  return {
    overallViability,
    purchasingPower,
    growthMomentum,
    costEfficiency,
    regulatoryFriction,
  };
}
