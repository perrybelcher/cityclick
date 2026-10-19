import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { buildCityView } from '../src/lib/city-v2';
import { tradeChartRows, factGroups } from '../src/lib/city-charts';
const record = JSON.parse(readFileSync('src/data/cities/tx.json', 'utf8')).find((c: {slug:string}) => c.slug === 'tx/austin');
function missing(path: string) { const c = structuredClone(record); const keys = path.split('.'); const last = keys.pop()!; delete keys.reduce((v,k) => v[k], c)[last]; return c; }
describe('round two fail-closed record contracts', () => {
  for (const key of ['name','iata','distanceMiles','source','sourceUrl','cityCenterMethod','retrieved']) {
    it(`hides airport without ${key}`, () => expect(buildCityView(missing(`executiveTravel.primaryAirport.${key}`)).airport).toBeUndefined());
  }
  for (const key of ['sourceName','sourceUrl','datasetVintage','referenceDate','changeBasis']) {
    it(`hides population without ${key}`, () => expect(buildCityView(missing(`demographics.populationProvenance.${key}`)).population).toEqual([]));
  }
  for (const key of ['population','popChange2020to2023Pct']) {
    it(`hides population pair without ${key}`, () => expect(buildCityView(missing(`demographics.${key}`)).population).toEqual([]));
  }
  for (const key of ['erHospitals','erHospitalsSource','sourceNote']) {
    it(`hides CMS directory without ${key}`, () => expect(buildCityView(missing(`executiveTravel.emergency.${key}`)).hospitals).toBeUndefined());
  }
  for (const key of ['name','address','type','cmsFacilityId']) {
    it(`omits a CMS row without ${key} and preserves original indexes`, () => {
      const view = buildCityView(missing(`executiveTravel.emergency.erHospitals.0.${key}`));
      expect(view.hospitals!.rows).toHaveLength(record.executiveTravel.emergency.erHospitals.length - 1);
      expect(view.hospitals!.rows[0]!.index).toBe(1);
    });
  }
  it('rejects invalid dates, malformed identifiers and non-finite new numbers', () => {
    for (const val of [NaN,Infinity,-1]) {
      const c = structuredClone(record); c.executiveTravel.primaryAirport.distanceMiles = val;
      expect(buildCityView(c).airport).toBeUndefined();
    }
    const c = structuredClone(record); c.executiveTravel.primaryAirport.iata = 'aus'; c.executiveTravel.emergency.erHospitalsSource = 'CMS without retrieval date';
    expect(buildCityView(c).airport).toBeUndefined(); expect(buildCityView(c).hospitals).toBeUndefined();
  });
  it('never reuses ACS provenance for population or obsolete hospital data for CMS', () => {
    const c = missing('demographics.populationProvenance'); c.executiveTravel.emergency.erHospitals = [];
    const v = buildCityView(c); expect(v.population).toEqual([]); expect(v.stats).toHaveLength(3); expect(v.hospitals).toBeUndefined();
    expect(JSON.stringify(v)).not.toContain(record.executiveTravel.emergency.nearestTraumaHospital);
  });
  it('allows explicit record zero and negative change without manufacturing fallbacks', () => {
    const c = structuredClone(record); c.demographics.popChange2020to2023Pct = -1; c.executiveTravel.primaryAirport.distanceMiles = 0;
    const v = buildCityView(c); expect(v.population[1]!.value).toBe(-1); expect(v.airport!.distanceMiles).toBe(0);
  });
  it('has no city literals or obsolete hospital fields in reusable components', () => {
    for (const file of readdirSync('src/components/city').filter(f => f.endsWith('.astro'))) {
      const text = readFileSync(`src/components/city/${file}`, 'utf8');
      expect(text, file).not.toMatch(/Austin|Bergstrom|Dell Seton|979882|nearestTraumaHospital|hospitalAddress/);
    }
  });
});
describe('chart geometry and question grouping', () => {
  it('sorts relative density and uses one centered shared scale without changing record values', () => {
    const v = buildCityView(record); const rows = tradeChartRows(v.industries);
    expect(rows).toHaveLength(v.industries.length);
    let previous = Infinity;
    for (const r of rows) {
      const delta = r.per10kResidents/r.usAvgPer10k-1;
      expect(delta).toBeLessThanOrEqual(previous); previous = delta;
      expect(r.left).toBeGreaterThanOrEqual(4); expect(r.left+r.width).toBeLessThanOrEqual(96);
      expect(r.per10kResidents).toBe(record.industries[r.index].per10kResidents);
      expect(r.usAvgPer10k).toBe(record.industries[r.index].usAvgPer10k);
      if (delta < 0) expect(r.left+r.width).toBeCloseTo(50);
      if (delta > 0) expect(r.left).toBe(50);
    }
  });
  it('omits undefined relative comparisons but preserves their table row; handles equal references', () => {
    const v = buildCityView(record); const row = v.industries[0]!;
    expect(tradeChartRows([{...row,usAvgPer10k:0}])).toEqual([]);
    expect(tradeChartRows([{...row,per10kResidents:row.usAvgPer10k}])[0]).toMatchObject({left:50,width:0,direction:'equal'});
    expect(tradeChartRows([])).toEqual([]);
  });
  it('assigns every supported question to exactly one of three themes', () => {
    const v = buildCityView(record); expect(factGroups).toHaveLength(3);
    for (const f of v.keyFacts) expect(factGroups.filter(g => f.paths.some(p => g.prefixes.some(k => p.startsWith(k))))).toHaveLength(1);
  });
});
