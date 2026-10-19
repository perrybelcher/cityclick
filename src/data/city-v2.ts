// Pilot route/asset configuration, not a second store of city facts.
export const CITY_V2_SLUGS = ['tx/austin'] as const;
export const CITY_V2_SITE = {
  name: 'CityClick', origin: 'https://cityclick.com', imprint: 'CityClick Research Desk / Team Perry Agency',
};
export const CITY_V2_MEDIA: Record<string, { src: string; heroSrc: string; srcset: string; width: number; height: number }> = {
  'tx/austin': { src: '/images/austin-skyline.jpg', heroSrc: '/images/austin-skyline-v2-1200.webp', srcset: '/images/austin-skyline-v2-640.webp 640w, /images/austin-skyline-v2-1200.webp 1200w', width: 1200, height: 750 },
};
// Existing local photograph requested for this pilot. Rights/subject audit remains
// a release gap: no invented photographer, license, location caption or badge.
export const CITY_V2_INDEXABLE = false;
