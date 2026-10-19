import { z } from 'zod';
import { buildFacts } from './facts';
import { CITY_V2_SLUGS } from '../data/city-v2';

export const intents = ['overview', 'business', 'moving-to', 'visit'] as const;
export type Intent = typeof intents[number];
export const intentLabels: Record<Intent, string> = { overview: 'Overview', business: 'Business', 'moving-to': 'Moving', visit: 'Visit' };
export function cityRoute(slug: string, intent: Intent = 'overview') {
  if (!CITY_V2_SLUGS.some(s => s === slug) || !intents.includes(intent)) throw new Error('Unregistered pilot route');
  return `/${slug}/${intent === 'overview' ? '' : `${intent}/`}`;
}
export const finite = z.number().finite();
// Validate blank text without normalizing/repairing record identifiers or labels.
const text = (min = 1) => z.string().min(min).refine(s => s.trim().length >= min, 'Nonblank record text required');
const provenance = z.object({ sourceName: text(3), sourceUrl: z.string().url().startsWith('https://'), datasetVintage: text(1), verifiedAt: text(10), evidenceQuote: z.string().optional() });
const identity = z.object({ slug: z.string(), name: text(1), stateName: text(1), stateCode: z.string().regex(/^[a-z]{2}$/) });
const demographicSchema = z.object({ medianHouseholdIncome: finite.positive(), perCapitaIncome: finite.positive(), medianAge: finite.positive(), provenance });
const housingSchema = z.object({ medianHomeValue: finite.positive(), medianGrossRent: finite.positive(), medianRealEstateTaxPaid: finite.nonnegative(), effectivePropertyTaxRatePct: finite.nonnegative(), source: text(5), sourceUrl: z.string().url() });
const climateSchema = z.object({ peakSummerHighF: finite, winterLowF: finite, annualRainfallInches: finite.nonnegative(), sourceName: text(5), sourceUrl: z.string().url() });
const waterSchema = z.object({ pwsid: text(1), providerName: text(1), populationServed: finite.int().nonnegative(), sourceType: text(1), source: text(5), sourceUrl: z.string().url(), retrieved: text(10) });
const hospitalRowSchema = z.object({ name: text(1), address: text(1), type: text(1), cmsFacilityId: z.string().regex(/^\d{6}$/) });
const emergencySchema = z.object({ erHospitals: z.array(z.unknown()), erHospitalsSource: text(5), sourceNote: text(5) });
const airportSchema = z.object({ name: text(1), iata: z.string().regex(/^[A-Z]{3}$/), distanceMiles: finite.nonnegative(), source: text(5), sourceUrl: z.string().url(), cityCenterMethod: text(1), retrieved: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
const populationSchema = z.object({ population: finite.int().nonnegative(), popChange2020to2023Pct: finite, populationProvenance: z.object({ sourceName: text(5), sourceUrl: z.string().url(), datasetVintage: text(1), referenceDate: text(1), changeBasis: text(1) }) });
const taxSchema = z.object({ stateTaxRate: finite.min(0).max(.115), localTaxRate: finite.min(0).max(.115), combinedSalesTaxRate: finite.min(0).max(.115), provenance });
const industrySchema = z.object({ naicsCode: z.string().regex(/^\d{6}$/), label: text(1), establishments: finite.int().nonnegative(), per10kResidents: finite.nonnegative(), usAvgPer10k: finite.nonnegative(), provenance });
const envelopeSchema = identity.extend({ demographics: z.unknown().optional(), housingAndTaxes: z.unknown().optional(), climateNormals: z.unknown().optional(), waterUtility: z.unknown().optional(), permitsAndTax: z.unknown().optional(), industries: z.array(z.unknown()).optional(), executiveTravel: z.object({ emergency: z.unknown().optional(), primaryAirport: z.unknown().optional() }).optional() });
export interface SourceNote { name: string; url?: string; asOf: string; checked?: string; path: string; }
export interface Metric { label: string; value: number; format: 'money' | 'number' | 'percent' | 'temperature' | 'inches'; path: string; detail: string; source: SourceNote; }
export interface SourcedQuestion { q: string; a: string; source: SourceNote; paths: string[]; }
export const number = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 3 });
export const money = (n: number) => `$${number(n)}`;
export const percent = (n: number) => `${(n * 100).toFixed(2)}%`;
export function formatMetric(m: Metric) {
  return m.format === 'money' ? money(m.value) : m.format === 'percent' ? `${m.value.toFixed(2)}%` : m.format === 'temperature' ? `${number(m.value)}°F` : m.format === 'inches' ? `${number(m.value)} in` : number(m.value);
}
function accepted<T>(schema: z.ZodType<T>, value: unknown): T | undefined { const r = schema.safeParse(value); return r.success ? r.data : undefined; }
const datedSource = (s: string) => s.match(/retrieved (\d{4}-\d{2}-\d{2})/i)?.[1];
function source(p: z.infer<typeof provenance>, path: string): SourceNote { return { name: p.sourceName, url: p.sourceUrl, asOf: p.datasetVintage, checked: p.verifiedAt, path }; }

// This intentionally narrow adapter accepts the actual legacy source contracts.
// It is NOT the proposed full V2 data migration or an independent certification.
// Each optional block fails closed; source strings never authorize unrelated fields.
export function buildCityView(input: unknown) {
  const raw = envelopeSchema.parse(input);
  cityRoute(raw.slug);
  const d = accepted(demographicSchema, raw.demographics);
  const h = accepted(housingSchema, raw.housingAndTaxes);
  const cl = accepted(climateSchema, raw.climateNormals);
  const w = accepted(waterSchema, raw.waterUtility);
  const emergency = accepted(emergencySchema, raw.executiveTravel?.emergency);
  const hospitalDate = emergency && datedSource(emergency.erHospitalsSource);
  const hospitalRows = (emergency?.erHospitals ?? []).flatMap((item, index) => {
    const row = accepted(hospitalRowSchema, item);
    return row ? [{ ...row, index }] : [];
  });
  // sourceNote is an editorial exclusion warning, NOT a supported hospital entry.
  // Never project the obsolete single-hospital fields into any visible or schema data.
  const hospitals = emergency && hospitalDate && hospitalRows.length ? { rows: hospitalRows,
    sourceNote: { name: emergency.erHospitalsSource, asOf: `Retrieved ${hospitalDate}`, path: 'executiveTravel.emergency.erHospitalsSource' } satisfies SourceNote } : undefined;
  const a = accepted(airportSchema, raw.executiveTravel?.primaryAirport);
  const airport = a ? { ...a, sourceNote: { name: a.source, url: a.sourceUrl, asOf: `Retrieved ${a.retrieved}`, path: 'executiveTravel.primaryAirport.source' } satisfies SourceNote } : undefined;
  const pop = accepted(populationSchema, raw.demographics);
  const population: Metric[] = pop ? [
    { label: 'City population', value: pop.population, format: 'number', path: 'demographics.population', detail: `Reference date: ${pop.populationProvenance.referenceDate}. City estimate, not the ZIP-area denominator.`, source: { name: pop.populationProvenance.sourceName, url: pop.populationProvenance.sourceUrl, asOf: `${pop.populationProvenance.datasetVintage} · ${pop.populationProvenance.referenceDate}`, path: 'demographics.populationProvenance' } },
    { label: 'Population change since 2020', value: pop.popChange2020to2023Pct, format: 'percent', path: 'demographics.popChange2020to2023Pct', detail: `From ${pop.populationProvenance.changeBasis} to ${pop.populationProvenance.referenceDate}.`, source: { name: pop.populationProvenance.sourceName, url: pop.populationProvenance.sourceUrl, asOf: `${pop.populationProvenance.datasetVintage} · ${pop.populationProvenance.referenceDate}`, path: 'demographics.populationProvenance' } },
  ] : [];
  const t = accepted(taxSchema, raw.permitsAndTax);
  const tax = t && Math.abs(t.stateTaxRate + t.localTaxRate - t.combinedSalesTaxRate) < 1e-9 ? { ...t, sourceNote: source(t.provenance, 'permitsAndTax.provenance') } : undefined;
  const housingYear = h?.source.match(/ACS (\d{4}) 5-yr/);
  const housingSource = h && housingYear ? { name: h.source, url: h.sourceUrl, asOf: `ACS ${housingYear[1]} 5-yr`, path: 'housingAndTaxes.source' } satisfies SourceNote : undefined;
  const climatePeriod = cl?.sourceName.match(/(\d{4}-\d{4}) average/);
  const climateDate = cl && datedSource(cl.sourceName);
  const climateSource = cl && climatePeriod && climateDate ? { name: cl.sourceName, url: cl.sourceUrl, asOf: `${climatePeriod[1]} average`, checked: climateDate, path: 'climateNormals.sourceName' } satisfies SourceNote : undefined;
  const water = w ? { ...w, sourceNote: { name: w.source, url: w.sourceUrl, asOf: `Retrieved ${w.retrieved}`, path: 'waterUtility.source' } satisfies SourceNote } : undefined;
  const stats: Metric[] = [];
  if (d) {
    const s = source(d.provenance, 'demographics.provenance');
    stats.push({ label: 'Median household income', value: d.medianHouseholdIncome, format: 'money', path: 'demographics.medianHouseholdIncome', detail: 'Household income estimate; not an individual salary.', source: s },
      { label: 'Per-capita income', value: d.perCapitaIncome, format: 'money', path: 'demographics.perCapitaIncome', detail: 'Income per person in the survey population.', source: s },
      { label: 'Median age', value: d.medianAge, format: 'number', path: 'demographics.medianAge', detail: 'Years; a city-level survey estimate.', source: s });
  }
  const housing: Metric[] = h && housingSource ? [
    { label: 'Median owner-occupied home value', value: h.medianHomeValue, format: 'money', path: 'housingAndTaxes.medianHomeValue', detail: 'Owner-reported value, not a current sale or asking price.', source: housingSource },
    { label: 'Median gross rent', value: h.medianGrossRent, format: 'money', path: 'housingAndTaxes.medianGrossRent', detail: 'Per month, renter-occupied units paying cash rent. Not a bedroom-specific asking rent.', source: housingSource },
    { label: 'Median real-estate taxes paid', value: h.medianRealEstateTaxPaid, format: 'money', path: 'housingAndTaxes.medianRealEstateTaxPaid', detail: 'Annual taxes paid for owner-occupied housing units; not a parcel quote.', source: housingSource },
    { label: 'Census-based property-tax proxy', value: h.effectivePropertyTaxRatePct, format: 'percent', path: 'housingAndTaxes.effectivePropertyTaxRatePct', detail: 'Ratio of median taxes paid to median home value. Not a statutory rate, median effective rate or estimate of your bill.', source: housingSource },
  ] : [];
  const climate: Metric[] = cl && climateSource ? [
    { label: 'Average July daily high', value: cl.peakSummerHighF, format: 'temperature', path: 'climateNormals.peakSummerHighF', detail: 'Historical reanalysis average.', source: climateSource },
    { label: 'Average January daily low', value: cl.winterLowF, format: 'temperature', path: 'climateNormals.winterLowF', detail: 'Historical reanalysis average.', source: climateSource },
    { label: 'Annual precipitation', value: cl.annualRainfallInches, format: 'inches', path: 'climateNormals.annualRainfallInches', detail: 'Historical average, not a forecast.', source: climateSource },
  ] : [];
  const industries = (raw.industries ?? []).flatMap((item, index) => {
    const row = accepted(industrySchema, item);
    // The denominator is retained in the legacy evidence quote, not a city total.
    if (!row?.provenance.evidenceQuote || !/ZCTA population/.test(row.provenance.evidenceQuote)) return [];
    return [{ ...row, index, sourceNote: source(row.provenance, `industries.${index}.provenance`) }];
  });
  // Reuse the existing Key Facts builder, but pass only supported fields. Its
  // population, airport, inferred tax/trauma and opportunity prose is not reused.
  const keyFacts: SourcedQuestion[] = [];
  const generated = buildFacts({ name: raw.name, stateName: raw.stateName, stateCode: raw.stateCode,
    demographics: d ? { medianHouseholdIncome: d.medianHouseholdIncome, perCapitaIncome: d.perCapitaIncome } : {},
    housingAndTaxes: h && housingSource ? { medianHomeValue: h.medianHomeValue, medianGrossRent: h.medianGrossRent } : {},
    climateNormals: cl && climateSource ? cl : undefined,
  });
  for (const f of generated) {
    if (d && f.q.startsWith('What is the median household income')) keyFacts.push({ q: f.q, a: f.a, source: source(d.provenance, 'demographics.provenance'), paths: ['demographics.medianHouseholdIncome', 'demographics.perCapitaIncome'] });
    if (h && housingSource && f.q.startsWith('How much do homes')) keyFacts.push({ q: f.q, a: f.a, source: housingSource, paths: ['housingAndTaxes.medianHomeValue', 'housingAndTaxes.medianGrossRent'] });
    if (cl && climateSource && f.q.startsWith('What is the climate')) keyFacts.push({ q: f.q, a: f.a, source: climateSource, paths: climate.map(x => x.path) });
  }
  if (h && housingSource) keyFacts.push({ q: 'What does the property-tax proxy measure?', a: `Median annual real-estate taxes paid are ${money(h.medianRealEstateTaxPaid)}. The stored ratio to median home value is ${h.effectivePropertyTaxRatePct.toFixed(2)}%. This Census-based proxy is not an assessor’s rate or a prediction of your bill.`, source: housingSource, paths: ['housingAndTaxes.medianRealEstateTaxPaid', 'housingAndTaxes.effectivePropertyTaxRatePct'] });
  if (tax) keyFacts.push({ q: 'What sales-tax figures are in the source table?', a: `The named jurisdiction in the source table has a ${percent(tax.combinedSalesTaxRate)} combined rate: ${percent(tax.stateTaxRate)} state and ${percent(tax.localTaxRate)} local. Confirm applicability to your address and transaction. This is not evidence of a uniform rate across all postal addresses.`, source: tax.sourceNote, paths: ['permitsAndTax.combinedSalesTaxRate', 'permitsAndTax.stateTaxRate', 'permitsAndTax.localTaxRate'] });
  if (pop) keyFacts.unshift({ q: 'What population estimate is on record?', a: `${number(pop.population)} people as of ${pop.populationProvenance.referenceDate}; ${pop.popChange2020to2023Pct.toFixed(2)}% change from ${pop.populationProvenance.changeBasis}. This is the Population Estimates Program, not the ACS survey or a postal-area count.`, source: population[0]!.source, paths: ['demographics.population', 'demographics.popChange2020to2023Pct'] });
  if (airport) keyFacts.push({ q: 'What does the airport distance measure?', a: `${airport.name} (${airport.iata}) is ${number(airport.distanceMiles)} miles in a straight line from the city center. Method: ${airport.cityCenterMethod}. This is not a road distance or travel time.`, source: airport.sourceNote, paths: ['executiveTravel.primaryAirport.distanceMiles'] });
  if (water) keyFacts.push({ q: 'Which water system is listed?', a: `${water.providerName}, system ID ${water.pwsid}, is listed as a ${water.sourceType} system serving ${number(water.populationServed)} people. The service population is not the city population. Confirm service for your address; this listing is not a water-quality assessment.`, source: water.sourceNote, paths: ['waterUtility.pwsid', 'waterUtility.populationServed'] });
  if (hospitals) keyFacts.push({ q: 'What does the emergency-department directory cover?', a: 'CMS lists these hospitals with emergency services. The directory preserves record order; it does not establish current availability or suitability. Confirm services directly with the provider.', source: hospitals.sourceNote, paths: ['executiveTravel.emergency.erHospitals'] });
  if (industries.length) keyFacts.push({ q: 'How should I read trade density?', a: 'ZIP-area employer establishments are compared with each trade’s national density. The postal-area boundary is not the city limit. This comparison does not establish demand, capacity or profitability.', source: industries[0]!.sourceNote, paths: ['industries.'] });
  return { ...identity.parse(raw), stats, population, housing, climate, hospitals, airport, water, tax, industries, keyFacts };
}
export type CityView = ReturnType<typeof buildCityView>;
export function pageCopy(city: CityView, intent: Intent) {
  const n = city.name, st = city.stateCode.toUpperCase(), state = city.stateName;
  const pages = {
    overview: { title: `${n}, ${st}: Moving and Business Guide`, h1: `${n}, ${state}: a guide to your next move`, lead: 'A clearer starting point. Separate the city-wide context from the questions only your address and your own quotes can answer.', description: `Explore ${n}, ${state} with sourced housing and income data, ZIP-area business density, taxes and a quote-based lease calculator.` },
    business: { title: `Starting a Business in ${n}, ${st}`, h1: `Starting or expanding a business in ${n}`, lead: 'Read the market context. Check the tax jurisdiction. Then put your actual lease quote to work—not a made-up market rent.', description: `Research a business in ${n}, ${state}: ZIP-area employer density, sourced sales-tax context and a blank calculator for your own lease quote.` },
    'moving-to': { title: `Moving to ${n}, ${st}: Housing and Taxes`, h1: `Moving to ${n}, ${state}`, lead: 'Start with the housing definitions, not the headline price. Use historical estimates as context—not a budget for your next address.', description: `Moving to ${n}, ${state}? Review sourced housing, income, a Census-based property-tax proxy, historical climate, water-system and hospital data.` },
    visit: { title: `${n}, ${st}: Things to Do and Visitor Guide`, h1: `Visiting ${n}, ${state}`, lead: 'A compact practical brief for a scouting visit: airport context, historical climate and a sourced emergency-department directory. No invented stops or travel times.', description: `Plan a scouting visit to ${n}, ${state} with sourced airport, climate and emergency-department records, plus links to moving and business research.` },
  };
  return pages[intent];
}
