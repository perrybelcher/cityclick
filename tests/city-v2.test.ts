import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildCityView, cityRoute, intents, pageCopy } from '../src/lib/city-v2';
import { calculateLeaseQuote } from '../src/lib/lease-quote';
const record = JSON.parse(readFileSync('src/data/cities/tx.json', 'utf8')).find((c: { slug: string }) => c.slug === 'tx/austin');
const fixture = { area: '1200', rent: '24', nnn: '6', wage: '20', hours: '100', burden: '15', overhead: '1000', ticket: '20', cogs: '30', days: '26' };
describe('sourced pilot projection', () => {
  it('uses only the requested city and preserves stored figures', () => {
    const view = buildCityView(record);
    expect(view.name).toBe(record.name);
    expect(view.industries).toHaveLength(record.industries.length);
    expect(view.housing[0]!.value).toBe(record.housingAndTaxes.medianHomeValue);
    expect(view.climate[0]!.value).toBe(record.climateNormals.peakSummerHighF);
    expect(view.keyFacts.length).toBeGreaterThanOrEqual(6);
    expect(JSON.stringify(view)).not.toContain('979882'); // conflicted population provenance
    expect(JSON.stringify(view)).not.toContain('Austin-Bergstrom'); // no airport provenance
  });
  it('has self-canonical routes, unique descriptions and short decoded titles', () => {
    const v = buildCityView(record);
    const copies = intents.map(i => pageCopy(v, i));
    expect(new Set(copies.map(c => c.description)).size).toBe(intents.length);
    for (const i of intents) { expect(cityRoute(v.slug, i)).toMatch(/\/$/); expect(pageCopy(v, i).title.length).toBeLessThan(60); }
    expect(() => cityRoute('tx/houston')).toThrow();
  });
  it('omits blocks when their source or required numeric field is missing', () => {
    const c = structuredClone(record);
    delete c.demographics.provenance;
    delete c.housingAndTaxes.source;
    delete c.climateNormals.sourceName;
    delete c.waterUtility.sourceUrl;
    delete c.executiveTravel.emergency.source;
    delete c.permitsAndTax.localTaxRate;
    c.industries.forEach((i: { provenance?: unknown }) => delete i.provenance);
    const v = buildCityView(c);
    expect(v.stats).toEqual([]); expect(v.housing).toEqual([]); expect(v.climate).toEqual([]);
    expect(v.water).toBeUndefined(); expect(v.hospital).toBeUndefined(); expect(v.tax).toBeUndefined();
    expect(v.industries).toEqual([]); expect(v.keyFacts).toEqual([]);
  });
  it('blocks non-finite values and mismatched tax components', () => {
    const c = structuredClone(record); c.demographics.medianHouseholdIncome = Infinity; c.permitsAndTax.localTaxRate = .01;
    const v = buildCityView(c); expect(v.stats).toEqual([]); expect(v.tax).toBeUndefined();
  });
});
describe('blank quote worksheet / exact arithmetic', () => {
  it('matches independently specified fictional golden values', () => {
    expect(calculateLeaseQuote(fixture, '.0825'.replace(/^\./, '0.'), true)).toEqual({ occupancy: '3000.00', labor: '9966.67', fixed: '13966.67', revenue: '19952.38', monthlyTransactions: '1080', dailyTransactions: '42' });
  });
  it('responds to a larger rent quote without hidden presets', () => {
    const r = calculateLeaseQuote({ ...fixture, rent: '36' }, '0.0825', true);
    expect(r.occupancy).toBe('4200.00'); expect(r.fixed).toBe('15166.67'); expect(r.monthlyTransactions).toBe('1173'); expect(r.dailyTransactions).toBe('46');
  });
  it('requires an explicit quote, all assumptions and tax confirmation', () => {
    for (const key of Object.keys(fixture)) expect(() => calculateLeaseQuote({ ...fixture, [key]: '' }, '0.0825', true)).toThrow();
    expect(() => calculateLeaseQuote(fixture, '0.0825', false)).toThrow();
    for (const bad of ['NaN', 'Infinity', '-1', '1e9']) expect(() => calculateLeaseQuote({ ...fixture, rent: bad }, '0.0825', true)).toThrow();
    expect(() => calculateLeaseQuote({ ...fixture, ticket: '0' }, '0.0825', true)).toThrow();
    expect(() => calculateLeaseQuote({ ...fixture, cogs: '100' }, '0.0825', true)).toThrow();
    for (const days of ['0', '32', '1.5']) expect(() => calculateLeaseQuote({ ...fixture, days }, '0.0825', true)).toThrow();
    expect(() => calculateLeaseQuote(fixture, '0.12', true)).toThrow();
  });
  it('accepts explicitly confirmed zero costs and zero tax', () => {
    expect(calculateLeaseQuote({ ...fixture, rent: '12', nnn: '0', wage: '0', hours: '0', burden: '0', overhead: '0', ticket: '10', cogs: '0', days: '30' }, '0', true)).toMatchObject({ fixed: '1200.00', monthlyTransactions: '120', dailyTransactions: '4' });
    expect(calculateLeaseQuote({ ...fixture, rent: '0', nnn: '0', wage: '0', hours: '0', burden: '0', overhead: '0' }, '0', true).fixed).toBe('0.00');
  });
});
