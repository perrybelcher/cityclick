import type { CityRecord } from './schema';

export interface SeoGraphOptions {
  city: CityRecord;
  canonicalUrl: string;
}

export function generateSeoGraph({ city, canonicalUrl }: SeoGraphOptions) {
  const coffeeNaics =
    city.industries.find((i) => i.naicsCode === '722515') ?? city.industries[0]!;

  const travel = city.executiveTravel;

  const faqs = [
    {
      '@type': 'Question',
      name: `How many coffee shops operate in ${city.name}, and is the market oversaturated?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `According to Census ZBP data, ${city.name} has ${coffeeNaics.establishments} active coffee and snack shops (NAICS 722515), representing a density of ${coffeeNaics.per10kResidents} per 10,000 residents. The market has an Empirical Bayes saturation index of ${coffeeNaics.saturationIndex}/100 and is classified as ${coffeeNaics.status}.`,
      },
    },
    {
      '@type': 'Question',
      name: `What is the combined sales tax rate in ${city.name}, ${city.stateName}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `The combined sales tax rate in ${city.name} is ${(city.permitsAndTax.combinedSalesTaxRate * 100).toFixed(2)}%, comprised of a ${(city.permitsAndTax.stateTaxRate * 100).toFixed(2)}% state tax and a ${(city.permitsAndTax.localTaxRate * 100).toFixed(2)}% local municipal/county tax.`,
      },
    },
    {
      '@type': 'Question',
      name: `What power plug, voltage, and electrical frequency are used in ${city.name}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `In ${city.name}, ${city.stateName}, electrical outlets utilize standard US Type A (2-pin) and Type B (3-pin grounded) plugs running at 120 Volts at 60Hz. International travelers from the UK, EU, Australia, or Asia require a plug adapter and dual-voltage or step-down converter.`,
      },
    },
    {
      '@type': 'Question',
      name: `What is the time zone, primary airport, and tipping custom in ${city.name}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${city.name} operates in the ${travel?.timeZone ?? 'US Central Time'} zone. The primary commercial airport is ${travel?.primaryAirport.name ?? `${city.name} Airport`} (${travel?.primaryAirport.iata ?? 'AUS'}). Tipping in restaurants and bars follows standard US customs of 18% to 20%, with contactless chip payments universally accepted.`,
      },
    },
  ];

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
        description: `Verified Census ACS 5-Year, BLS LAUS, and ZBP establishment data for ${city.name}, including 25 NAICS industry saturation metrics and Census housing statistics.`,
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
          'Average Commercial Retail Asking Rent',
          'NAICS Establishment Densities',
          'Municipal Permit Average Wait Times',
          'Combined Sales Tax Rate',
          'Time Zone & UTC Offset',
          'Electrical Plug Standard',
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
            iataCode: travel?.primaryAirport.iata ?? 'AUS',
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
