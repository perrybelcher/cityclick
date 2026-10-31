export interface CertifiedFlagshipMeta {
  slug: string;
  file: string;
  name: string;
  state: string;
  stateCode: string;
  image: string;
  tagline: string;
  appeal: string;
  defaultCompareSlug: string;
}

/**
 * Single source of truth for all primary-source certified, indexable CityClick flagship guides.
 * Every city in this list must pass:
 *   1. scripts/rebuild_verified_cities.py (Census ACS + SUB-EST + Gazetteer + ZBP)
 *   2. scripts/enrich_flagship_plus.py (Open-Meteo, USGS 3DEP, EPA SDWIS, OurAirports, CMS ER, College Scorecard, NREL EV, NPS, Ticketmaster, sales-tax.json)
 *   3. audit/recompute.py (raw-Census + state sales-tax match)
 *   4. scripts/qa.ts (Master Quality Gate)
 */
export const CERTIFIED_FLAGSHIPS: CertifiedFlagshipMeta[] = [
  {
    slug: 'tx/austin',
    file: 'tx/austin/index.html',
    name: 'Austin',
    state: 'Texas',
    stateCode: 'TX',
    image: '/images/austin-skyline.jpg',
    tagline: 'Texas Capital',
    appeal: 'Census demographics, housing costs, Open-Meteo climate, CMS emergency hospitals, colleges, EV charging, and sales-tax data for Austin, Texas.',
    defaultCompareSlug: 'tn-nashville',
  },
  {
    slug: 'tn/nashville',
    file: 'tn/nashville/index.html',
    name: 'Nashville',
    state: 'Tennessee',
    stateCode: 'TN',
    image: '/images/nashville-hero.jpg',
    tagline: 'Middle Tennessee',
    appeal: 'Primary-sourced population, housing, elevation, airport, CMS hospital, university, and NAICS trade density guide for Nashville, Tennessee.',
    defaultCompareSlug: 'tx-austin',
  },
  {
    slug: 'ar/hot-springs',
    file: 'ar/hot-springs/index.html',
    name: 'Hot Springs',
    state: 'Arkansas',
    stateCode: 'AR',
    image: '/images/hot-springs-hero.jpg',
    tagline: 'National Park City',
    appeal: 'Verified Census housing, Hot Springs National Park access, municipal water, CMS hospitals, and retail sales-tax guide for Hot Springs, Arkansas.',
    defaultCompareSlug: 'ar-hot-springs-village',
  },
  {
    slug: 'ar/hot-springs-village',
    file: 'ar/hot-springs-village/index.html',
    name: 'Hot Springs Village',
    state: 'Arkansas',
    stateCode: 'AR',
    image: '/images/hsv-hero.jpg',
    tagline: 'Ouachita Foothills',
    appeal: 'Census ACS demographics, housing values, Ouachita foothills elevation, and Garland County infrastructure guide for Hot Springs Village, Arkansas.',
    defaultCompareSlug: 'ar-hot-springs',
  },
  {
    slug: 'id/boise',
    file: 'id/boise/index.html',
    name: 'Boise',
    state: 'Idaho',
    stateCode: 'ID',
    image: '/images/boise-hero.jpg',
    tagline: 'Mountain West',
    appeal: 'Primary-sourced demographics, Boise Airport distance, USGS elevation, universities, and small-business trade counts for Boise, Idaho.',
    defaultCompareSlug: 'ut-salt-lake-city',
  },
  {
    slug: 'fl/tampa',
    file: 'fl/tampa/index.html',
    name: 'Tampa',
    state: 'Florida',
    stateCode: 'FL',
    image: '/images/tampa-hero.jpg',
    tagline: 'Gulf Coast',
    appeal: 'Verified Census housing, Tampa International Airport distance, Gulf Coast climate averages, and NAICS trade density for Tampa, Florida.',
    defaultCompareSlug: 'fl-orlando',
  },
  {
    slug: 'az/scottsdale',
    file: 'az/scottsdale/index.html',
    name: 'Scottsdale',
    state: 'Arizona',
    stateCode: 'AZ',
    image: '/images/scottsdale-hero.jpg',
    tagline: 'Sonoran Desert',
    appeal: 'Census income and home values, Sonoran Desert climate and elevation, CMS hospitals, and retail tax breakdown for Scottsdale, Arizona.',
    defaultCompareSlug: 'az-phoenix',
  },
  {
    slug: 'tx/dallas',
    file: 'tx/dallas/index.html',
    name: 'Dallas',
    state: 'Texas',
    stateCode: 'TX',
    image: '/images/dallas-hero.jpg',
    tagline: 'North Texas',
    appeal: 'Primary-sourced Census housing, DFW airport distance, CMS emergency hospitals, universities, EV stations, and NAICS trade density for Dallas, Texas.',
    defaultCompareSlug: 'tx-houston',
  },
  {
    slug: 'tx/houston',
    file: 'tx/houston/index.html',
    name: 'Houston',
    state: 'Texas',
    stateCode: 'TX',
    image: '/images/houston-hero.jpg',
    tagline: 'Texas Gulf Coast',
    appeal: 'Verified Census population, housing costs, Bush Intercontinental distance, CMS emergency hospitals, colleges, and trade counts for Houston, Texas.',
    defaultCompareSlug: 'tx-dallas',
  },
  {
    slug: 'tx/san-antonio',
    file: 'tx/san-antonio/index.html',
    name: 'San Antonio',
    state: 'Texas',
    stateCode: 'TX',
    image: '/images/san-antonio-hero.jpg',
    tagline: 'South Central Texas',
    appeal: 'Primary-sourced Census housing, San Antonio Missions NPS sites, water utility, CMS hospitals, and small-business trade density for San Antonio, Texas.',
    defaultCompareSlug: 'tx-austin',
  },
  {
    slug: 'az/phoenix',
    file: 'az/phoenix/index.html',
    name: 'Phoenix',
    state: 'Arizona',
    stateCode: 'AZ',
    image: '/images/phoenix-hero.jpg',
    tagline: 'Valley of the Sun',
    appeal: 'Census demographics, housing and property tax metrics, Sky Harbor distance, Sonoran Desert climate, and NAICS trade density for Phoenix, Arizona.',
    defaultCompareSlug: 'az-scottsdale',
  },
  {
    slug: 'nc/charlotte',
    file: 'nc/charlotte/index.html',
    name: 'Charlotte',
    state: 'North Carolina',
    stateCode: 'NC',
    image: '/images/charlotte-hero.jpg',
    tagline: 'Carolina Piedmont',
    appeal: 'Verified Census housing, CLT airport distance, Mecklenburg sales-tax breakdown, universities, and small-business trade counts for Charlotte, North Carolina.',
    defaultCompareSlug: 'nc-raleigh',
  },
  {
    slug: 'nc/raleigh',
    file: 'nc/raleigh/index.html',
    name: 'Raleigh',
    state: 'North Carolina',
    stateCode: 'NC',
    image: '/images/raleigh-hero.jpg',
    tagline: 'Research Triangle',
    appeal: 'Primary-sourced Census demographics, RDU airport distance, College Scorecard institutions, EV charging, and trade density for Raleigh, North Carolina.',
    defaultCompareSlug: 'nc-charlotte',
  },
  {
    slug: 'fl/orlando',
    file: 'fl/orlando/index.html',
    name: 'Orlando',
    state: 'Florida',
    stateCode: 'FL',
    image: '/images/orlando-hero.jpg',
    tagline: 'Central Florida',
    appeal: 'Census housing and rent figures, MCO airport distance, Orange County sales tax, universities, and NAICS trade density for Orlando, Florida.',
    defaultCompareSlug: 'fl-tampa',
  },
  {
    slug: 'fl/miami',
    file: 'fl/miami/index.html',
    name: 'Miami',
    state: 'Florida',
    stateCode: 'FL',
    image: '/images/miami-hero.jpg',
    tagline: 'South Florida',
    appeal: 'Verified Census demographics, housing costs, MIA airport distance, Biscayne and Everglades NPS sites, and trade counts for Miami, Florida.',
    defaultCompareSlug: 'fl-tampa',
  },
  {
    slug: 'fl/jacksonville',
    file: 'fl/jacksonville/index.html',
    name: 'Jacksonville',
    state: 'Florida',
    stateCode: 'FL',
    image: '/images/jacksonville-hero.jpg',
    tagline: 'First Coast',
    appeal: 'Primary-sourced Census housing, JAX airport distance, Timucuan Preserve NPS access, CMS hospitals, and NAICS trade density for Jacksonville, Florida.',
    defaultCompareSlug: 'fl-orlando',
  },
  {
    slug: 'co/denver',
    file: 'co/denver/index.html',
    name: 'Denver',
    state: 'Colorado',
    stateCode: 'CO',
    image: '/images/denver-hero.jpg',
    tagline: 'Front Range',
    appeal: 'Census housing and income data, Mile High USGS elevation, DEN airport distance, CMS emergency hospitals, and trade density for Denver, Colorado.',
    defaultCompareSlug: 'ut-salt-lake-city',
  },
  {
    slug: 'nv/las-vegas',
    file: 'nv/las-vegas/index.html',
    name: 'Las Vegas',
    state: 'Nevada',
    stateCode: 'NV',
    image: '/images/las-vegas-hero.jpg',
    tagline: 'Mojave Basin',
    appeal: 'Verified Census housing, Harry Reid Airport distance, Mojave climate normals, Lake Mead NPS access, and NAICS trade counts for Las Vegas, Nevada.',
    defaultCompareSlug: 'az-phoenix',
  },
  {
    slug: 'ut/salt-lake-city',
    file: 'ut/salt-lake-city/index.html',
    name: 'Salt Lake City',
    state: 'Utah',
    stateCode: 'UT',
    image: '/images/salt-lake-city-hero.jpg',
    tagline: 'Wasatch Front',
    appeal: 'Primary-sourced Census demographics, Wasatch elevation, SLC airport distance, universities, EV infrastructure, and trade density for Salt Lake City, Utah.',
    defaultCompareSlug: 'co-denver',
  },
  {
    slug: 'ga/atlanta',
    file: 'ga/atlanta/index.html',
    name: 'Atlanta',
    state: 'Georgia',
    stateCode: 'GA',
    image: '/images/atlanta-hero.jpg',
    tagline: 'Georgia Capital',
    appeal: 'Verified Census housing, ATL airport distance, Martin Luther King Jr. and Chattahoochee NPS sites, universities, and trade density for Atlanta, Georgia.',
    defaultCompareSlug: 'nc-charlotte',
  },
  {
    slug: 'ok/oklahoma-city',
    file: 'ok/oklahoma-city/index.html',
    name: 'Oklahoma City',
    state: 'Oklahoma',
    stateCode: 'OK',
    image: '/images/oklahoma-city-hero.jpg',
    tagline: 'Central Plains',
    appeal: 'Primary-sourced Census housing, Will Rogers Airport distance, Oklahoma City National Memorial NPS site, CMS hospitals, and trade counts for Oklahoma City.',
    defaultCompareSlug: 'tx-dallas',
  },
  {
    slug: 'ar/little-rock',
    file: 'ar/little-rock/index.html',
    name: 'Little Rock',
    state: 'Arkansas',
    stateCode: 'AR',
    image: '/images/little-rock-hero.jpg',
    tagline: 'Arkansas Capital',
    appeal: 'Verified Census demographics, Clinton National Airport distance, Central High School NPS site, CMS hospitals, and trade density for Little Rock, Arkansas.',
    defaultCompareSlug: 'ar-hot-springs',
  },
  {
    slug: 'ar/fayetteville',
    file: 'ar/fayetteville/index.html',
    name: 'Fayetteville',
    state: 'Arkansas',
    stateCode: 'AR',
    image: '/images/fayetteville-hero.jpg',
    tagline: 'Ozark Highlands',
    appeal: 'Primary-sourced Census housing, Ozark elevation, University of Arkansas enrollment, XNA airport distance, and NAICS trade counts for Fayetteville, Arkansas.',
    defaultCompareSlug: 'ar-bentonville',
  },
  {
    slug: 'ar/bentonville',
    file: 'ar/bentonville/index.html',
    name: 'Bentonville',
    state: 'Arkansas',
    stateCode: 'AR',
    image: '/images/bentonville-hero.jpg',
    tagline: 'Northwest Arkansas',
    appeal: 'Verified Census population growth, housing values, XNA airport distance, Pea Ridge NPS access, and small-business trade density for Bentonville, Arkansas.',
    defaultCompareSlug: 'ar-fayetteville',
  },
  {
    slug: 'al/huntsville',
    file: 'al/huntsville/index.html',
    name: 'Huntsville',
    state: 'Alabama',
    stateCode: 'AL',
    image: '/images/huntsville-hero.jpg',
    tagline: 'Tennessee Valley',
    appeal: 'Primary-sourced Census demographics, housing and property tax metrics, HSV airport distance, universities, and trade density for Huntsville, Alabama.',
    defaultCompareSlug: 'tn-nashville',
  },
];

export const CERTIFIED_FLAGSHIP_SLUGS: string[] = CERTIFIED_FLAGSHIPS.map((f) => f.slug);

export const CERTIFIED_FLAGSHIP_SET: Set<string> = new Set(CERTIFIED_FLAGSHIP_SLUGS);

export const HERO_IMAGES_BY_SLUG: Record<string, string> = Object.fromEntries(
  CERTIFIED_FLAGSHIPS.map((f) => [f.slug, f.image])
);

export const DEFAULT_COMPARE_BY_SLUG: Record<string, string> = Object.fromEntries(
  CERTIFIED_FLAGSHIPS.map((f) => [f.slug, f.defaultCompareSlug])
);

export const TOTAL_CATALOG_CITIES = 1501;
export const UNVERIFIED_REVIEW_COUNT = TOTAL_CATALOG_CITIES - CERTIFIED_FLAGSHIPS.length;
