// Builds plain-sentence, sourced facts from a city record. Only fields that exist are emitted.
// The same list feeds the visible "Key facts" section AND the FAQPage JSON-LD, so they always match.
import type { CityRecord } from './schema';

export interface Fact {
  q: string;
  a: string;
  source: string;
  asOf: string;
}

const pct = (n: number, d = 2) =>
  `${Number((n * 100).toFixed(3)).toLocaleString('en-US', {
    minimumFractionDigits: d,
    maximumFractionDigits: 3,
  })}%`;
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export function buildFacts(city: CityRecord): Fact[] {
  const out: Fact[] = [];
  const d = city.demographics;
  const h = city.housingAndTaxes;
  const p = city.permitsAndTax;
  const n = city.name;
  const ACS = {
    source: 'U.S. Census Bureau, American Community Survey 5-Year Estimates',
    asOf: '2019–2023 (ACS 2023 5-year)',
  };

  if (d?.population) {
    const isPopEst = d.popChange2020to2023Pct != null;
    let a = isPopEst
      ? `${n}, ${city.stateName} had an estimated population of ${d.population.toLocaleString('en-US')} in July 2023.`
      : `${n}, ${city.stateName} had an ACS 5-year estimated population of ${d.population.toLocaleString('en-US')} (2019–2023).`;
    if (d.popChange2020to2023Pct != null) {
      a += ` That is a change of ${d.popChange2020to2023Pct > 0 ? '+' : ''}${d.popChange2020to2023Pct}% from the April 2020 Census base.`;
    }
    out.push({
      q: `What is the population of ${n}, ${city.stateCode.toUpperCase()}?`,
      a,
      source: isPopEst
        ? 'U.S. Census Bureau Population Estimates (sub-county, Vintage 2023)'
        : ACS.source,
      asOf: isPopEst ? 'July 1, 2023' : ACS.asOf,
    });
  }
  if (d?.medianHouseholdIncome) {
    let a = `The median household income in ${n} is ${usd(d.medianHouseholdIncome)}.`;
    if (d.perCapitaIncome) a += ` Per-capita income is ${usd(d.perCapitaIncome)}.`;
    out.push({ q: `What is the median household income in ${n}?`, a, ...ACS });
  }
  if (h?.medianHomeValue) {
    let a = `The median home value in ${n} is ${usd(h.medianHomeValue)} (owner-occupied units).`;
    if (h.medianGrossRent) a += ` Median gross rent is ${usd(h.medianGrossRent)} per month.`;
    out.push({ q: `How much do homes and rent cost in ${n}?`, a, ...ACS });
  }
  if (h?.effectivePropertyTaxRatePct != null && h.medianRealEstateTaxPaid) {
    out.push({
      q: `What is the property tax rate in ${n}?`,
      a: `Homeowners in ${n} pay a median of ${usd(h.medianRealEstateTaxPaid)} per year in real estate taxes. Divided by the median home value, that is an effective rate of ${h.effectivePropertyTaxRatePct.toFixed(2)}%. This is a Census-based estimate, not an assessor's rate.`,
      ...ACS,
    });
  }
  if (p?.combinedSalesTaxRate != null && p.stateTaxRate != null && p.provenance) {
    const parts: string[] = [`${pct(p.stateTaxRate)} state`];
    if (p.countyTaxRate != null || p.cityTaxRate != null || p.specialDistrictTaxRate != null) {
      if ((p.countyTaxRate ?? 0) > 0) parts.push(`${pct(p.countyTaxRate!)} county`);
      if ((p.cityTaxRate ?? 0) > 0) parts.push(`${pct(p.cityTaxRate!)} municipal`);
      if ((p.specialDistrictTaxRate ?? 0) > 0) parts.push(`${pct(p.specialDistrictTaxRate!)} special district`);
      if ((p.localTaxRate ?? 0) === 0) parts.push('0.00% local');
    } else {
      parts.push(`${pct(p.localTaxRate ?? 0)} local`);
    }
    out.push({
      q: `What is the sales tax rate in ${n}, ${city.stateName}?`,
      a: `The combined sales tax rate in ${n} is ${pct(p.combinedSalesTaxRate)} (${parts.join(' plus ')}). Rates can vary by taxing district within a metro area.`,
      source: p.provenance.sourceName ?? 'State revenue department',
      asOf: p.provenance.datasetVintage ?? '2026',
    });
  }
  const cl = city.climateNormals;
  if (cl?.peakSummerHighF != null) {
    let a = `${n} averages a July daily high of ${cl.peakSummerHighF}°F and a January daily low of ${cl.winterLowF}°F, with about ${cl.annualRainfallInches} inches of precipitation per year.`;
    if (city.terrainElevation?.elevationFeet != null) {
      a += ` City center elevation is ${city.terrainElevation.elevationFeet.toFixed(1)} feet (${city.terrainElevation.elevationMeters.toFixed(1)} meters) above sea level.`;
    }
    out.push({
      q: `What is the climate and elevation in ${n}?`,
      a,
      source: city.terrainElevation?.elevationFeet != null
        ? `${cl.sourceName ?? 'Open-Meteo Historical Weather API'}; USGS 3D Elevation Program (3DEP)`
        : cl.sourceName ?? 'Open-Meteo Historical Weather API',
      asOf: '2015–2024 climate average; USGS 3DEP DEM',
    });
  }
  const tr = city.executiveTravel;
  if (tr?.primaryAirport?.name && tr.primaryAirport.source) {
    let a = `The primary commercial airport serving ${n} is ${tr.primaryAirport.name}${tr.primaryAirport.iata ? ` (${tr.primaryAirport.iata})` : ''}`;
    if (tr.primaryAirport.distanceMiles != null) {
      a += `, about ${tr.primaryAirport.distanceMiles} miles in a straight line from the city center`;
    }
    out.push({
      q: `Which airport serves ${n}?`,
      a: a + '.',
      source: tr.primaryAirport.source,
      asOf: tr.primaryAirport.retrieved ? `Retrieved ${tr.primaryAirport.retrieved}` : '2026',
    });
  }
  const erList = tr?.emergency?.erHospitals ?? [];
  const erScope = tr?.emergency?.erHospitalsScope ?? n;
  if (erList.length) {
    out.push({
      q: `Which hospitals in ${erScope} list emergency services?`,
      a: `${erList.map((hosp) => `${hosp.name}, ${hosp.address} (${hosp.type})`).join('; ')}. This is a CMS listing of hospitals with emergency services. It is not a trauma ranking and not a nearest-facility claim.`,
      source: tr?.emergency?.erHospitalsSource ?? 'CMS Care Compare',
      asOf: 'Retrieved October 2026',
    });
  }
  const w = city.waterUtility;
  if (w?.pwsid) {
    out.push({
      q: `Who provides tap water in ${n}?`,
      a: `${w.providerName} (EPA water system ID ${w.pwsid}) supplies ${n} and serves about ${Number(w.populationServed).toLocaleString('en-US')} people from ${w.sourceType}. Ask the utility for its annual water quality report.`,
      source: w.source,
      asOf: w.retrieved ? `Retrieved ${w.retrieved}` : 'Retrieved October 2026',
    });
  }
  const edu = city.higherEducation;
  if (edu && edu.institutionCount > 0 && edu.institutions.length > 0) {
    const topSchools = edu.institutions
      .slice(0, 4)
      .map((s) => (s.studentSize ? `${s.name} (${s.studentSize.toLocaleString('en-US')} undergraduates)` : s.name))
      .join('; ');
    out.push({
      q: `Which colleges and universities are located in ${n}?`,
      a: `The U.S. Department of Education College Scorecard lists ${edu.institutionCount} degree- or certificate-granting institutions in ${n}, including ${topSchools}.`,
      source: edu.sourceName,
      asOf: `Retrieved ${edu.retrieved}`,
    });
  }
  const ev = city.evInfrastructure;
  if (ev && ev.totalStations > 0) {
    out.push({
      q: `How many public EV charging stations are in ${n}?`,
      a: `${n} has ${ev.totalStations.toLocaleString('en-US')} public electric-vehicle charging station locations with ${ev.dcFastPorts.toLocaleString('en-US')} DC fast-charging ports and ${ev.level2Ports.toLocaleString('en-US')} Level 2 ports.`,
      source: ev.sourceName,
      asOf: `Retrieved ${ev.retrieved}`,
    });
  }
  const parks = city.nationalParks;
  if (parks && parks.parks.length > 0) {
    const parkList = parks.parks
      .map((pk) => (pk.distanceMiles != null ? `${pk.fullName} (${pk.distanceMiles} miles from city center)` : pk.fullName))
      .join('; ');
    out.push({
      q: `Are there National Park Service sites near ${n}?`,
      a: `National Park Service units within 55 miles of ${n} include ${parkList}.`,
      source: parks.sourceName,
      asOf: `Retrieved ${parks.retrieved}`,
    });
  }
  const ind = city.industries ?? [];
  if (ind.length) {
    const und = ind
      .filter((i) => i.status === 'underserved')
      .sort((a, b) => a.saturationIndex - b.saturationIndex)
      .slice(0, 3);
    const sat = ind.filter((i) => i.status === 'saturated').length;
    if (und.length) {
      out.push({
        q: `Which businesses are underserved in ${n}?`,
        a: `Across ${ind.length} small-business categories with sufficient Census ZBP data in the ZIP codes assigned to ${n}, ${und.map((i) => `${i.label} (${i.per10kResidents} per 10,000 residents vs. ${i.usAvgPer10k} nationally)`).join('; ')} sit furthest below the national density. ${sat} of ${ind.length} categories are above 120% of national density. Density uses ZIP-code areas, not exact city limits.`,
        source: 'U.S. Census Bureau ZIP Code Business Patterns 2022; ACS 2023 ZCTA population',
        asOf: '2022 establishments, 2023 population',
      });
    }
  }
  return out;
}
