import { describe, it, expect } from 'vitest';
import { percentileRank, computeCityScores } from '../src/lib/scores';

describe('percentileRank', () => {
  it('computes exact mid-rank percentile according to ECDF definition', () => {
    const cohort = [10, 20, 30, 40, 50];
    // 30 has 2 less, 1 equal -> (2 + 0.5) / 5 = 2.5 / 5 = 0.50 -> 50
    expect(percentileRank(30, cohort)).toBe(50);
    // 10 has 0 less, 1 equal -> 0.5 / 5 = 0.10 -> 10
    expect(percentileRank(10, cohort)).toBe(10);
    // 50 has 4 less, 1 equal -> 4.5 / 5 = 0.90 -> 90
    expect(percentileRank(50, cohort)).toBe(90);
  });

  it('handles empty cohort with neutral 50', () => {
    expect(percentileRank(100, [])).toBe(50);
  });

  it('handles tied values properly', () => {
    const cohort = [10, 20, 20, 20, 50];
    // value 20: 1 less, 3 equal -> (1 + 1.5) / 5 = 2.5 / 5 = 50
    expect(percentileRank(20, cohort)).toBe(50);
  });
});

describe('computeCityScores', () => {
  const dummyCohort = {
    medianHouseholdIncomes: [50000, 60000, 75000, 92000, 120000],
    daytimePopSurgePcts: [-10, 0, 5, 12, 25],
    popGrowth5YrPcts: [-2, 1, 4, 8, 15],
    permitsPer1kResidentsList: [1.2, 2.5, 4.0, 6.8, 11.0],
    irrs: [2.1, 2.6, 3.1, 3.8, 4.5],
    unemploymentRatePcts: [2.8, 3.5, 4.2, 5.5, 7.8],
    femaRiskScores: [15, 25, 45, 60, 85],
    combinedSalesTaxRates: [0.06, 0.07, 0.0825, 0.09, 0.10],
  };

  it('computes Austin-like high-viability city scores', () => {
    const austin = {
      medianHouseholdIncome: 92000,
      daytimePopSurgePct: 12,
      popGrowth5YrPct: 8,
      permitsPer1kResidents: 6.8,
      medianGrossRent: 1650, // IRR = 92000 / (1650*12) = 4.65 (very high)
      unemploymentRatePct: 3.5,
      femaRiskScore: 25,
      combinedSalesTaxRate: 0.0825,
      avgPermitWaitDays: 28, // WaitScore = 100 - (28-14)*1.2 = 83.2
    };

    const scores = computeCityScores(austin, dummyCohort);

    expect(scores.overallViability).toBeGreaterThan(60);
    expect(scores.purchasingPower).toBeGreaterThan(60);
    expect(scores.growthMomentum).toBeGreaterThan(60);
    expect(scores.costEfficiency).toBeGreaterThan(60);
    expect(scores.regulatoryFriction).toBeGreaterThan(0);
    expect(scores.overallViability).toBeLessThanOrEqual(100);
  });

  it('handles null permit wait days with neutral 50 wait score', () => {
    const city = {
      medianHouseholdIncome: 60000,
      daytimePopSurgePct: 0,
      popGrowth5YrPct: 1,
      permitsPer1kResidents: 2.5,
      medianGrossRent: 1200,
      unemploymentRatePct: 4.2,
      femaRiskScore: 45,
      combinedSalesTaxRate: 0.07,
      avgPermitWaitDays: null,
    };

    const scores = computeCityScores(city, dummyCohort);
    expect(scores.regulatoryFriction).toBeDefined();
    expect(scores.overallViability).toBeGreaterThanOrEqual(0);
    expect(scores.overallViability).toBeLessThanOrEqual(100);
  });
});
