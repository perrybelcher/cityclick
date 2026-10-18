import type { CityRecord } from './schema';
import { buildFacts } from './facts';

export interface SeoGraphOptions {
  city: CityRecord;
  canonicalUrl: string;
}

export function generateSeoGraph({ city, canonicalUrl }: SeoGraphOptions) {
  const coffeeNaics =
    city.industries.find((i) => i.naicsCode === '722515') ?? city.industries[0]!;

  const travel = city.executiveTravel;

  const faqs = buildFacts(city).map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: `${f.a} Source: ${f.source} (${f.asOf}).` },
  }));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      // 1. City / Place
      {
        '@type': 'City',
        '@id': `${canonicalUrl}#city`,
        name: city.name,
        containedInPlace: {
          '@type': 'AdministrativeArea',
          name: city.stateName,
          identifier: city.stateCode.toUpperCase(),
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: city.lat,
          longitude: city.lng,
        },
        identifier: city.cityId,
        sameAs: `https://data.census.gov/profile/${city.name}_city,_${city.stateName}?g=160XX00US${city.cityId}`,
        description: `Economic, demographic, and commercial feasibility profile for ${city.name}, ${city.stateName}.`,
      },
      // 2. Verified Federal Dataset
      {
        '@type': 'Dataset',
        '@id': `${canonicalUrl}#dataset`,
        name: `${city.name}, ${city.stateCode.toUpperCase()} Commercial Viability & NAICS Saturation Dataset (2026)`,
        description: `Verified Census ACS 5-Year, BLS LAUS, and ZBP establishment data for ${city.name}, including NAICS industry saturation metrics and Census housing statistics.`,
        url: canonicalUrl,
        license: 'https://creativecommons.org/licenses/by/4.0/',
        creator: [
          {
            '@type': 'Organization',
            name: 'US Census Bureau',
            url: 'https://www.census.gov',
          },
          {
            '@type': 'Organization',
            name: 'CityClick',
            url: 'https://cityclick.com',
          },
        ],
        temporalCoverage: '2023/2026',
        spatialCoverage: `${city.name}, ${city.stateName}`,
        variableMeasured: [
          'Median Household Income',
          'Population Change 2020-2023',
                    'NAICS Establishment Densities',
                    'Combined Sales Tax Rate',
                            ],
        distribution: {
          '@type': 'DataDownload',
          encodingFormat: 'application/json',
          contentUrl: `https://cityclick.com/api/v1/cities/${city.slug}`,
        },
      },
      // 3. Tourist Destination & Executive Travel Schema
      {
        '@type': 'TouristDestination',
        '@id': `${canonicalUrl}#travel`,
        name: `${city.name}, ${city.stateName}`,
        description: `Executive travel, time zone, electrical standards, and visitor logistics guide for ${city.name}, ${city.stateName}.`,
        geo: {
          '@type': 'GeoCoordinates',
          latitude: city.lat,
          longitude: city.lng,
        },
        includesAttraction: [
          {
            '@type': 'Airport',
            name: travel?.primaryAirport.name ?? `${city.name} Airport`,
            iataCode: travel?.primaryAirport.iata ?? undefined,
          },
        ],
      },
      // 4. BreadcrumbList
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumbs`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://cityclick.com/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: city.stateName,
            item: `https://cityclick.com/${city.stateCode}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: city.name,
            item: canonicalUrl,
          },
        ],
      },
      // 5. Voice & LLM Speakable Specification
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: `${city.name}, ${city.stateCode.toUpperCase()} Commercial Feasibility & Executive Travel Dossier`,
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: [
            '#aeo-b2b-capsule',
            '#aeo-travel-capsule',
            '#key-demographics-summary',
          ],
        },
      },
      // 6. Comprehensive FAQPage
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: faqs,
      },
    ],
  };
}
