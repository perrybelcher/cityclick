// Builds plain-sentence, sourced facts from a city record. Only fields that exist are emitted.
// The same list feeds the visible "Key facts" section AND the FAQPage JSON-LD, so they always match.
import type { CityRecord } from './schema';

export interface Fact { q: string; a: string; source: string; asOf: string; }

const pct = (n: number, d = 2) => `${Number((n * 100).toFixed(3)).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: 3 })}%`;
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export function buildFacts(city: CityRecord): Fact[] {
  const out: Fact[] = [];
  const d: any = city.demographics ?? {};
  const h: any = (city as any).housingAndTaxes ?? {};
  const p: any = city.permitsAndTax ?? {};
  const n = city.name;
  const ACS = { source: 'U.S. Census Bureau, American Community Survey 5-Year Estimates', asOf: '2019–2023 (ACS 2023 5-year)' };

  if (d.population) {
    let a = `${n}, ${city.stateName} had an estimated population of ${d.population.toLocaleString('en-US')} in July 2023.`;
    if (d.popChange2020to2023Pct != null) a += ` That is a change of ${d.popChange2020to2023Pct > 0 ? '+' : ''}${d.popChange2020to2023Pct}% from the April 2020 Census base.`;
    out.push({ q: `What is the population of ${n}, ${city.stateCode.toUpperCase()}?`, a, source: 'U.S. Census Bureau Population Estimates (sub-county, Vintage 2023)', asOf: 'July 1, 2023' });
  }
  if (d.medianHouseholdIncome) {
    let a = `The median household income in ${n} is ${usd(d.medianHouseholdIncome)}.`;
    if (d.perCapitaIncome) a += ` Per-capita income is ${usd(d.perCapitaIncome)}.`;
    out.push({ q: `What is the median household income in ${n}?`, a, ...ACS });
  }
  if (h.medianHomeValue) {
    let a = `The median home value in ${n} is ${usd(h.medianHomeValue)} (owner-occupied units).`;
    if (h.medianGrossRent) a += ` Median gross rent is ${usd(h.medianGrossRent)} per month.`;
    out.push({ q: `How much do homes and rent cost in ${n}?`, a, ...ACS });
  }
  if (h.effectivePropertyTaxRatePct != null && h.medianRealEstateTaxPaid) {
    out.push({
      q: `What is the property tax rate in ${n}?`,
      a: `Homeowners in ${n} pay a median of ${usd(h.medianRealEstateTaxPaid)} per year in real estate taxes. Divided by the median home value, that is an effective rate of ${h.effectivePropertyTaxRatePct.toFixed(2)}%. This is a Census-based estimate, not an assessor's rate.`,
      ...ACS,
    });
  }
  if (p.combinedSalesTaxRate != null && p.stateTaxRate != null) {
    out.push({
      q: `What is the sales tax rate in ${n}, ${city.stateName}?`,
      a: `The combined sales tax rate in ${n} is ${pct(p.combinedSalesTaxRate)}: ${pct(p.stateTaxRate)} state plus ${pct(p.localTaxRate ?? 0)} local. Rates can vary by location within a metro area.`,
      source: p.provenance?.sourceName ?? 'State revenue department', asOf: p.provenance?.datasetVintage ?? '2026',
    });
  }
  const cl: any = (city as any).climateNormals;
  if (cl?.peakSummerHighF != null) {
    out.push({
      q: `What is the climate like in ${n}?`,
      a: `${n} averages a July daily high of ${cl.peakSummerHighF}°F and a January daily low of ${cl.winterLowF}°F, with about ${cl.annualRainfallInches} inches of precipitation per year.`,
      source: cl.sourceName ?? 'Open-Meteo Historical Weather API', asOf: '2015–2024 average',
    });
  }
  const tr: any = city.executiveTravel;
  if (tr?.primaryAirport?.name && tr.primaryAirport.source) {
    let a = `The primary commercial airport for ${n} is ${tr.primaryAirport.name}${tr.primaryAirport.iata ? ` (${tr.primaryAirport.iata})` : ''}`;
    if (tr.primaryAirport.distanceMiles != null) a += `, about ${tr.primaryAirport.distanceMiles} miles in a straight line from the city center`;
    out.push({ q: `Which airport serves ${n}?`, a: a + '.', source: 'Google Places API; straight-line distance computed from coordinates', asOf: 'October 2026' });
  }
  const erList: Array<{ name: string; address: string; type: string }> = tr?.emergency?.erHospitals ?? [];
  if (erList.length) {
    out.push({
      q: `Which hospitals in ${n} list emergency services?`,
      a: `${erList.map((h) => `${h.name}, ${h.address} (${h.type})`).join('; ')}. This is a CMS listing of hospitals with emergency services. It is not a trauma ranking and not a nearest-facility claim.`,
      source: tr.emergency.erHospitalsSource ?? 'CMS Care Compare',
      asOf: 'Retrieved 2026-10-19',
    });
  }
  const w: any = (city as any).waterUtility;
  if (w?.pwsid) {
    out.push({ q: `Who provides tap water in ${n}?`, a: `${w.providerName} (EPA water system ID ${w.pwsid}) supplies ${n} and serves about ${Number(w.populationServed).toLocaleString('en-US')} people from ${w.sourceType}. Ask the utility for its annual water quality report.`, source: w.source, asOf: 'Retrieved October 2026' });
  }
  const ind = city.industries ?? [];
  if (ind.length) {
    const und = ind.filter((i: any) => i.status === 'underserved').sort((a: any, b: any) => a.saturationIndex - b.saturationIndex).slice(0, 3);
    const sat = ind.filter((i: any) => i.status === 'saturated').length;
    if (und.length) {
      out.push({
        q: `Which businesses are underserved in ${n}?`,
        a: `Across ${ind.length} small-business categories with enough national data in the ZIP codes assigned to ${n}, ${und.map((i: any) => `${i.label} (${i.per10kResidents} per 10,000 residents vs. ${i.usAvgPer10k} nationally)`).join('; ')} sit furthest below the national density. ${sat} of ${ind.length} categories are above 120% of national density. Density uses ZIP-code areas, not exact city limits.`,
        source: 'U.S. Census Bureau ZIP Code Business Patterns 2022; ACS 2023 ZCTA population', asOf: '2022 establishments, 2023 population',
      });
    }
  }
  return out;
}
