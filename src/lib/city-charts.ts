import type { CityView } from './city-v2';
// Geometry only: no invented display values, bins, benchmarks or demand scores.
// Compare each density with its own national reference on a shared relative scale.
export function tradeChartRows(rows: CityView['industries']) {
  const eligible = rows.filter(r => r.usAvgPer10k > 0);
  const delta = (r: typeof rows[number]) => r.per10kResidents / r.usAvgPer10k - 1;
  const extent = Math.max(...eligible.map(r => Math.abs(delta(r))), 0);
  return [...eligible].sort((a, b) => delta(b) - delta(a) || a.label.localeCompare(b.label)).map(r => {
    const offset = extent ? delta(r) / extent * 46 : 0;
    return { ...r, left: 50 + Math.min(0, offset), width: Math.abs(offset), direction: offset > 0 ? 'above' : offset < 0 ? 'below' : 'equal' };
  });
}
export const factGroups = [
  { title: 'People & household economics', prefixes: ['demographics.', 'housingAndTaxes.'] },
  { title: 'Business & tax context', prefixes: ['permitsAndTax.', 'industries.'] },
  { title: 'Climate, travel & services', prefixes: ['climateNormals.', 'executiveTravel.', 'waterUtility.'] },
];
