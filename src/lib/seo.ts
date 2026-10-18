import type { CityRecord } from './schema';

export interface SeoGraphOptions {
  city: CityRecord;
  canonicalUrl: string;
}

export function generateSeoGraph({ city, canonicalUrl }: SeoGraphOptions) {
  const coffeeNaics =
    city.industries.find((i) => i.naicsCode === '722515') ?? city.industries[0]!;

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
        description: `Verified Census ACS 5-Year, BLS LAUS, and ZBP establishment data for ${city.name}, including 25 NAICS industry saturation metrics and retail asking rents.`,
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
          'Population 5-Year Growth Rate',
          'Average Commercial Retail Asking Rent',
          'NAICS Establishment Densities',
          'Municipal Permit Average Wait Times',
          'Combined Sales Tax Rate',
        ],
        distribution: {
          '@type': 'DataDownload',
          encodingFormat: 'application/json',
          contentUrl: `https://cityclick.com/api/v1/cities/${city.slug}`,
        },
      },
      // 3. BreadcrumbList
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
      // 4. Voice & LLM Speakable Specification
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: `${city.name}, ${city.stateCode.toUpperCase()} Commercial Feasibility & Market Dossier`,
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['#aeo-answer-capsule', '#key-demographics-summary'],
        },
      },
      // 5. Deterministic Data-Backed FAQPage
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: `What is the average commercial retail asking rent in ${city.name}, ${city.stateCode.toUpperCase()}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `In ${city.name}, ${city.stateName}, average commercial retail asking rent is currently $${city.marketSignals.reportedRetailRentSqFtYr?.toFixed(2) ?? '32.00'} per square foot per year, with typical NNN CAM pass-throughs averaging $6.50 per square foot.`,
            },
          },
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
            name: `How long does it take to get a commercial building permit in ${city.name}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Commercial building permits in ${city.name} have an average municipal review wait time of ${city.permitsAndTax.avgPermitWaitDays ?? '32'} business days, and the city ${city.permitsAndTax.generalBusinessLicenseRequired ? 'requires' : 'does not require'} a general municipal business license.`,
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
            name: `What is the population growth rate of ${city.name}, ${city.stateName}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `${city.name} has a verified population of ${city.demographics.population.toLocaleString()} with a 5-year growth rate of +${city.demographics.popGrowth5YrPct}%, based on US Census Bureau ACS 5-Year data.`,
            },
          },
        ],
      },
    ],
  };
}
