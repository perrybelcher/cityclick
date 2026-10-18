import type { BreakevenInput, BreakevenOutput } from './schema';

export const OPERATING_DAYS_PER_MONTH = 30.4375;
export const WEEKS_PER_MONTH = 4.3482;

export function computeBreakeven(input: BreakevenInput): BreakevenOutput {
  const {
    sqft,
    baseRentPerSqFtYr,
    nnnCamPerSqFtYr = 6.50,
    hourlyWage,
    staffHoursPerWeek,
    payrollTaxAndBenefitsLoadPct = 0.18,
    otherMonthlyFixedOverhead = 1200,
    avgGrossTicket,
    cogsPct,
    combinedSalesTaxRate,
  } = input;

  if (sqft <= 0) throw new Error('Square footage must be positive');
  if (baseRentPerSqFtYr < 0) throw new Error('Base rent cannot be negative');
  if (hourlyWage <= 0) throw new Error('Hourly wage must be positive');
  if (staffHoursPerWeek < 0) throw new Error('Staff hours cannot be negative');
  if (avgGrossTicket <= 0) throw new Error('Average gross ticket must be positive');
  if (cogsPct < 0 || cogsPct >= 1) throw new Error('COGS percentage must be between 0 and 0.999');
  if (combinedSalesTaxRate < 0 || combinedSalesTaxRate > 0.15) {
    throw new Error('Combined sales tax rate must be between 0 and 0.15');
  }

  // 1. Monthly Occupancy Cost
  const monthlyOccupancyCost = (sqft * (baseRentPerSqFtYr + nnnCamPerSqFtYr)) / 12;

  // 2. Monthly Labor Cost
  const monthlyLaborCost =
    hourlyWage * staffHoursPerWeek * WEEKS_PER_MONTH * (1 + payrollTaxAndBenefitsLoadPct);

  // 3. Total Monthly Fixed Cost
  const monthlyFixedCost = monthlyOccupancyCost + monthlyLaborCost + otherMonthlyFixedOverhead;

  // 4. Net Ticket (Excluding Sales Tax)
  const netTicketExTax = avgGrossTicket / (1 + combinedSalesTaxRate);

  // 5. Contribution Margin per Customer
  const contributionMarginPerCustomer = netTicketExTax * (1 - cogsPct);

  if (contributionMarginPerCustomer <= 0) {
    throw new Error('Contribution margin per customer must be positive');
  }

  // 6. Customers Needed
  const monthlyCustomersNeeded = Math.ceil(monthlyFixedCost / contributionMarginPerCustomer);
  const dailyCustomersNeeded = Math.ceil(monthlyCustomersNeeded / OPERATING_DAYS_PER_MONTH);

  // 7. Breakeven Net Revenue
  const monthlyBreakEvenNetRevenue = monthlyFixedCost / (1 - cogsPct);

  // 8. Daily Breakeven Gross Receipts (Including Sales Tax)
  const dailyBreakEvenGrossReceipts =
    (monthlyBreakEvenNetRevenue * (1 + combinedSalesTaxRate)) / OPERATING_DAYS_PER_MONTH;

  // 9. Annual Revenue Per SqFt Needed
  const annualRevenuePerSqFtNeeded = (monthlyBreakEvenNetRevenue * 12) / sqft;

  return {
    monthlyOccupancyCost: Number(monthlyOccupancyCost.toFixed(2)),
    monthlyLaborCost: Number(monthlyLaborCost.toFixed(2)),
    monthlyFixedCost: Number(monthlyFixedCost.toFixed(2)),
    netTicketExTax: Number(netTicketExTax.toFixed(2)),
    contributionMarginPerCustomer: Number(contributionMarginPerCustomer.toFixed(2)),
    monthlyCustomersNeeded,
    dailyCustomersNeeded,
    monthlyBreakEvenNetRevenue: Number(monthlyBreakEvenNetRevenue.toFixed(2)),
    dailyBreakEvenGrossReceipts: Number(dailyBreakEvenGrossReceipts.toFixed(2)),
    annualRevenuePerSqFtNeeded: Number(annualRevenuePerSqFtNeeded.toFixed(2)),
  };
}
