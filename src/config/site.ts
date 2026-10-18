export const SITE = {
  name: 'CityClick',
  legalName: 'CityClick, Inc.',
  url: 'https://cityclick.com',
  title: 'CityClick — Get to know your next city',
  description:
    'Plan a visit, find a place to live, or research your next business location across 1,501 verified US city guides.',
  ogImage: 'https://cityclick.com/images/og-cityclick.jpg',
  contactEmail: 'data@cityclick.com',
  affiliates: {
    registeredAgentUrl: 'https://www.northwestregisteredagent.com/?ref=cityclick',
    commercialInsuranceUrl: 'https://www.nextinsurance.com/?ref=cityclick',
    llcFilingUrl: 'https://www.bizee.com/?ref=cityclick',
  },
} as const;

export type IndexPolicy = 'top-500' | 'top-1500' | 'all';

/**
 * Crawl budget & indexation policy.
 * At launch, 'top-500' indexes the top 500 cities by population/GDP.
 * Other cities return 200 OK with noindex, follow until promoted.
 */
export const INDEX_POLICY: IndexPolicy = 'top-500';

export function isCityIndexed(populationRank: number): boolean {
  if (INDEX_POLICY === 'all') return true;
  if (INDEX_POLICY === 'top-1500') return populationRank <= 1500;
  return populationRank <= 500;
}
