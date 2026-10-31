import type { CityRecord } from './schema';
import { buildFacts } from './facts';

export interface SeoGraphOptions {
  city: CityRecord;
  canonicalUrl: string;
}

export function generateSeoGraph({ city, canonicalUrl }: SeoGraphOptions) {
  const cleanCanonical = canonicalUrl.endsWith('/') ? canonicalUrl : `${canonicalUrl}/`;
  const travel = city.executiveTravel;
  const sourcedAirport = travel?.primaryAirport?.source ? travel.primaryAirport : null;

  const faqs = buildFacts(city).map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: `${f.a} Source: ${f.source} (${f.asOf}).` },
  }));

  const measuredVars = [
    'Resident Population',
    'Median Household Income',
    'Median Home Value',
    'Median Gross Rent',
    'Effective Property Tax Rate',
  ];
  if (city.demographics.popChange2020to2023Pct != null) {
    measuredVars.push('Population Change 2020-2023');
  }
  if (city.industries.length > 0) {
    measuredVars.push('NAICS Establishment Densities');
  }
  if (city.permitsAndTax?.combinedSalesTaxRate != null && city.permitsAndTax?.provenance) {
    measuredVars.push('Combined Sales Tax Rate');
  }

  const attractions: Record<string, unknown>[] = [];
  if (sourcedAirport?.name) {
    attractions.push({
      '@type': 'Airport',
      name: sourcedAirport.name,
      ...(sourcedAirport.iata ? { iataCode: sourcedAirport.iata } : {}),
      ...(sourcedAirport.lat != null && sourcedAirport.lng != null
        ? {
            geo: {
              '@type': 'GeoCoordinates',
              latitude: sourcedAirport.lat,
              longitude: sourcedAirport.lng,
            },
          }
        : {}),
    });
  }
  if (city.nationalParks?.parks?.length) {
    for (const pk of city.nationalParks.parks.slice(0, 3)) {
      attractions.push({
        '@type': 'Park',
        name: pk.fullName,
        url: pk.url,
      });
    }
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      // 1. City / Place
      {
        '@type': 'City',
        '@id': `${cleanCanonical}#city`,
        name: city.name,
        containedInPlace: {
          '@type': 'AdministrativeArea',
          name: city.stateName,
          identifier: city.stateCode.toUpperCase(),
        },
        ...(city.lat != null && city.lng != null
          ? {
              geo: {
                '@type': 'GeoCoordinates',
                latitude: city.lat,
                longitude: city.lng,
              },
            }
          : {}),
        identifier: city.cityId,
        sameAs: `https://data.census.gov/profile?g=160XX00US${city.cityId}`,
        description: `Primary-sourced demographic, housing, climate, utility, and small-business trade density guide for ${city.name}, ${city.stateName}.`,
      },
      // 2. Verified Federal Dataset
      {
        '@type': 'Dataset',
        '@id': `${cleanCanonical}#dataset`,
        name: `${city.name}, ${city.stateCode.toUpperCase()} Municipal & Small-Business Trade Dataset (2026)`,
        description: `Sourced U.S. Census ACS 5-Year, Population Estimates, and ZIP Code Business Patterns dataset for ${city.name}, ${city.stateName}.`,
        url: cleanCanonical,
        license: 'https://creativecommons.org/licenses/by/4.0/',
        creator: [
          {
            '@type': 'Organization',
            name: 'U.S. Census Bureau',
            url: 'https://www.census.gov/',
          },
          {
            '@type': 'Organization',
            name: 'CityClick',
            url: 'https://cityclick.com/',
          },
        ],
        temporalCoverage: '2022/2026',
        spatialCoverage: `${city.name}, ${city.stateName}`,
        variableMeasured: measuredVars,
        distribution: {
          '@type': 'DataDownload',
          encodingFormat: 'application/json',
          contentUrl: `https://cityclick.com/api/v1/cities/${city.slug}`,
        },
      },
      // 3. Tourist Destination
      {
        '@type': 'TouristDestination',
        '@id': `${cleanCanonical}#travel`,
        name: `${city.name}, ${city.stateName}`,
        description: `Visitor logistics, airport distance, climate averages, and municipal water guide for ${city.name}, ${city.stateName}.`,
        ...(city.lat != null && city.lng != null
          ? {
              geo: {
                '@type': 'GeoCoordinates',
                latitude: city.lat,
                longitude: city.lng,
              },
            }
          : {}),
        ...(attractions.length > 0 ? { includesAttraction: attractions } : {}),
      },
      // 4. BreadcrumbList
      {
        '@type': 'BreadcrumbList',
        '@id': `${cleanCanonical}#breadcrumbs`,
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
            item: `https://cityclick.com/${city.stateCode}/`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: city.name,
            item: cleanCanonical,
          },
        ],
      },
      // 5. Voice & LLM Speakable Specification matching actual DOM selectors
      {
        '@type': 'WebPage',
        '@id': `${cleanCanonical}#webpage`,
        url: cleanCanonical,
        name: `${city.name}, ${city.stateCode.toUpperCase()} Cost of Living, Taxes and Business Guide`,
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['h1', '#key-facts'],
        },
      },
      // 6. Comprehensive FAQPage
      {
        '@type': 'FAQPage',
        '@id': `${cleanCanonical}#faq`,
        mainEntity: faqs,
      },
    ],
  };
}
