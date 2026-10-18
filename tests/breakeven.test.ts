import { describe, it, expect } from 'vitest';
import { computeBreakeven } from '../src/lib/breakeven';

describe('computeBreakeven', () => {
  it('correctly calculates retail coffee shop underwriting metrics', () => {
    const input = {
      sqft: 1500,
      baseRentPerSqFtYr: 32.0,
      nnnCamPerSqFtYr: 6.5,
      hourlyWage: 16.5,
      staffHoursPerWeek: 120,
      payrollTaxAndBenefitsLoadPct: 0.18,
      otherMonthlyFixedOverhead: 1200,
      avgGrossTicket: 8.5,
      cogsPct: 0.28,
      combinedSalesTaxRate: 0.0825, // Austin 8.25%
    };

    const out = computeBreakeven(input);

    // 1. Monthly occupancy: 1500 * (32 + 6.5) / 12 = 1500 * 38.5 / 12 = 57750 / 12 = 4812.50
    expect(out.monthlyOccupancyCost).toBe(4812.50);

    // 2. Monthly labor: 16.50 * 120 * 4.3482 * 1.18 = 1980 * 4.3482 * 1.18 = 10159.10
    expect(out.monthlyLaborCost).toBeCloseTo(10159.10, 1);

    // 3. Monthly fixed cost: 4812.50 + 10159.10 + 1200 = 16171.60
    expect(out.monthlyFixedCost).toBeCloseTo(16171.60, 1);

    // 4. Net ticket ex-tax: 8.50 / 1.0825 = 7.852 -> 7.85
    expect(out.netTicketExTax).toBe(7.85);

    // 5. Contribution margin: 7.85 * (1 - 0.28) = 5.65
    expect(out.contributionMarginPerCustomer).toBe(5.65);

    // 6. Customers needed: ceil(16171.60 / 5.652) = ~2861
    expect(out.monthlyCustomersNeeded).toBeGreaterThan(2500);
    expect(out.dailyCustomersNeeded).toBe(Math.ceil(out.monthlyCustomersNeeded / 30.4375));

    // 7. Breakeven net revenue: 16171.60 / (1 - 0.28) = 22460.56
    expect(out.monthlyBreakEvenNetRevenue).toBeCloseTo(22460.56, 1);
  });

  it('validates edge cases and input constraints', () => {
    const valid = {
      sqft: 1000,
      baseRentPerSqFtYr: 20,
      hourlyWage: 15,
      staffHoursPerWeek: 40,
      avgGrossTicket: 10,
      cogsPct: 0.3,
      combinedSalesTaxRate: 0.05,
    };

    expect(() => computeBreakeven({ ...valid, sqft: 0 })).toThrow('Square footage must be positive');
    expect(() => computeBreakeven({ ...valid, hourlyWage: 0 })).toThrow('Hourly wage must be positive');
    expect(() => computeBreakeven({ ...valid, cogsPct: 1 })).toThrow('COGS percentage must be between 0 and 0.999');
    expect(() => computeBreakeven({ ...valid, combinedSalesTaxRate: 0.20 })).toThrow('Combined sales tax rate must be between 0 and 0.15');
  });
});
