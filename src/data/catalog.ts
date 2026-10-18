import tx from './cities/tx.json';
import fl from './cities/fl.json';
import id from './cities/id.json';
import type { CityRecord } from '../lib/schema';

export const ALL_CITIES: CityRecord[] = [
  ...(tx as CityRecord[]),
  ...(fl as CityRecord[]),
  ...(id as CityRecord[]),
];

export const CITIES_BY_SLUG = new Map<string, CityRecord>(
  ALL_CITIES.map((c) => [c.slug, c])
);

export function getCityBySlug(slug: string): CityRecord | undefined {
  return CITIES_BY_SLUG.get(slug);
}
