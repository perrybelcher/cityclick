// Same occupancy / labor / net-ticket / contribution logic as the legacy
// page's recalculate(), with NO financial defaults. Exact rational arithmetic
// avoids rounding before transaction ceilings. Annualization is now 52/12;
// open days are supplied by the visitor, not the old fixed monthly calendar.
type Q = { n: bigint; d: bigint };
const q = (n: bigint, d = 1n): Q => ({ n, d });
const add = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d);
const mul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
const div = (a: Q, b: Q) => { if (b.n <= 0n) throw new Error('A divisor must be positive.'); return q(a.n * b.d, a.d * b.n); };
const ceil = (a: Q) => (a.n + a.d - 1n) / a.d;
const one = q(1n), hundred = q(100n);
function decimal(s: string): Q {
  if (!/^(?:0|[1-9]\d{0,8})(?:\.\d{1,6})?$/.test(s)) throw new Error('Enter every amount as a nonnegative decimal, with up to six decimal places.');
  const [a, b = ''] = s.split('.'); return q(BigInt(a + b), 10n ** BigInt(b.length));
}
function cash(a: Q) {
  const cents = (a.n * 100n * 2n + a.d) / (a.d * 2n);
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
}
export const quoteFields = ['area', 'rent', 'nnn', 'wage', 'hours', 'burden', 'overhead', 'ticket', 'cogs', 'days'] as const;
export type QuoteField = typeof quoteFields[number];
export type QuoteInputs = Record<QuoteField, string>;
export function calculateLeaseQuote(input: QuoteInputs, taxRate: string, confirmed: boolean) {
  if (!confirmed) throw new Error('Confirm the tax scenario before calculating.');
  const values = Object.fromEntries(quoteFields.map(k => [k, decimal(input[k])])) as Record<QuoteField, Q>;
  const tax = decimal(taxRate);
  if (tax.n * 1000n > 115n * tax.d) throw new Error('The sourced tax rate is outside the supported range.');
  if (values.area.n <= 0n || values.ticket.n <= 0n) throw new Error('Rentable area and the tax-inclusive ticket must be positive.');
  if (values.cogs.n >= 100n * values.cogs.d || values.burden.n > 100n * values.burden.d) throw new Error('Variable costs must be below one hundred percent; payroll burden cannot exceed one hundred percent.');
  if (!/^(?:[1-9]|[12]\d|3[01])$/.test(input.days)) throw new Error('Enter a whole number of open days within a calendar month.');
  const occupancy = div(mul(values.area, add(values.rent, values.nnn)), q(12n));
  const labor = mul(mul(mul(values.wage, values.hours), q(52n, 12n)), add(one, div(values.burden, hundred)));
  const fixed = add(add(occupancy, labor), values.overhead);
  const netTicket = div(values.ticket, add(one, tax));
  const margin = q(100n * values.cogs.d - values.cogs.n, 100n * values.cogs.d);
  const contribution = mul(netTicket, margin);
  const transactions = ceil(div(fixed, contribution));
  const days = BigInt(input.days);
  return { occupancy: cash(occupancy), labor: cash(labor), fixed: cash(fixed), revenue: cash(div(fixed, margin)), monthlyTransactions: transactions.toString(), dailyTransactions: ((transactions + days - 1n) / days).toString() };
}
