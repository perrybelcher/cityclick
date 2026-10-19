import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildCityView } from '../src/lib/city-v2';
const c = JSON.parse(readFileSync('src/data/cities/tx.json','utf8')).find((c: {slug:string}) => c.slug === 'tx/austin');
describe('blank strings are missing evidence, never a default', () => {
  it('rejects blank source names and labels across new blocks', () => {
    const r = structuredClone(c);
    r.demographics.populationProvenance.sourceName = '           ';
    r.executiveTravel.primaryAirport.name = '   ';
    r.executiveTravel.emergency.sourceNote = '            ';
    const view = buildCityView(r);
    expect(view.population).toEqual([]); expect(view.airport).toBeUndefined(); expect(view.hospitals).toBeUndefined();
  });
  it('returns no data blocks or generated questions for identity-only record', () => {
    const view = buildCityView({slug:c.slug,name:c.name,stateName:c.stateName,stateCode:c.stateCode});
    expect(view.stats).toEqual([]); expect(view.population).toEqual([]); expect(view.housing).toEqual([]); expect(view.climate).toEqual([]);
    expect(view.industries).toEqual([]); expect(view.keyFacts).toEqual([]);
    expect(view.water).toBeUndefined(); expect(view.airport).toBeUndefined(); expect(view.hospitals).toBeUndefined(); expect(view.tax).toBeUndefined();
  });
});
