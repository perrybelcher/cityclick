import type { CityRecord } from '../lib/schema';

// Eagerly glob import all 51 state-sharded JSON files at build time
const stateFiles = import.meta.glob<{ default: CityRecord[] }>('./cities/*.json', {
  eager: true,
});

export const ALL_CITIES: CityRecord[] = Object.values(stateFiles).flatMap(
  (mod) => mod.default
);

export const CITIES_BY_SLUG = new Map<string, CityRecord>(
  ALL_CITIES.map((c) => [c.slug, c])
);

export function getCityBySlug(slug: string): CityRecord | undefined {
  return CITIES_BY_SLUG.get(slug);
}
