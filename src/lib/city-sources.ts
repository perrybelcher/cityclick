import type { SourceNote } from './city-v2';

// Presentation only. Raw provenance and identifiers remain unchanged in CityView.
// Never infer a missing vintage from a retrieval date.
export function readableDate(value: string) {
  const iso = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (!iso) return undefined;
  const date = new Date(`${iso[0]}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso[0]) return undefined;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}
export function formatSource(s: SourceNote) {
  let name = s.name, period = '', tag = '';
  const acs = `${s.asOf} ${s.name}`.match(/ACS[- ](\d{4})[- ]5(?:YR|-yr)/i);
  const retrieval = readableDate(s.checked || '') || readableDate(s.asOf) || readableDate(s.name);
  if (acs) {
    const end = Number(acs[1]);
    period = `ACS 5-year, ${end - 4}–${end}`;
    tag = `ACS ${end - 4}–${end}`;
    name = s.path === 'housingAndTaxes.source' ? 'U.S. Census Bureau · Housing tables' : 'U.S. Census Bureau · Income estimates';
  } else if (s.path === 'demographics.populationProvenance') {
    const reference = s.asOf.split(' · ').at(-1)!;
    name = 'U.S. Census Bureau · Population Estimates Program';
    period = `Census PEP, ${reference}`;
    tag = reference;
  } else if (s.path.startsWith('industries.')) {
    name = s.name.replace(/\s+\d{4}$/, '');
    const year = s.asOf.match(/^ZBP-(\d{4})$/)?.[1];
    if (year) period = `Business patterns, ${year}`;
    tag = period;
  } else if (s.path === 'climateNormals.sourceName') {
    name = s.name.split(',')[0]!;
    const range = s.asOf.match(/(\d{4})-(\d{4})/);
    if (range) period = `Historical average, ${range[1]}–${range[2]}`;
    tag = period;
  } else if (s.path === 'permitsAndTax.provenance') {
    period = /^\d{4}$/.test(s.asOf) ? `Rate table, ${s.asOf}` : s.asOf;
    tag = period;
  } else if (s.path === 'executiveTravel.emergency.erHospitalsSource') {
    name = s.name.split(' (federal)')[0]!;
  }
  const dates = [period, retrieval ? `Retrieved ${retrieval}` : ''].filter(Boolean);
  return { name, dates, tag: tag || (retrieval ? `Retrieved ${retrieval}` : ''), url: s.url, path: s.path };
}
