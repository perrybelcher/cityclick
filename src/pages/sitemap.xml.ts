export const prerender = true;

import type { APIRoute } from 'astro';
import { CERTIFIED_FLAGSHIPS } from '../config/flagships';

export const GET: APIRoute = async () => {
  const today = '2026-10-31';

  const flagshipRoutes = CERTIFIED_FLAGSHIPS.map((f) => ({
    loc: `https://cityclick.com/${f.slug}/`,
    priority: '0.9',
    changefreq: 'weekly',
    lastmod: today,
  }));

  // Certified indexable routes (Crawl Shield excludes all unverified cities)
  const certifiedRoutes = [
    { loc: 'https://cityclick.com/', priority: '1.0', changefreq: 'daily', lastmod: today },

    // All Certified Flagship City Guides
    ...flagshipRoutes,

    // Verified Compare Showdowns
    { loc: 'https://cityclick.com/compare/tx-austin-vs-tn-nashville/', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { loc: 'https://cityclick.com/compare/tx-austin-vs-tx-dallas/', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { loc: 'https://cityclick.com/compare/tx-dallas-vs-tx-houston/', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { loc: 'https://cityclick.com/compare/tx-austin-vs-fl-tampa/', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { loc: 'https://cityclick.com/compare/fl-tampa-vs-fl-orlando/', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { loc: 'https://cityclick.com/compare/fl-miami-vs-fl-orlando/', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { loc: 'https://cityclick.com/compare/nc-charlotte-vs-nc-raleigh/', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { loc: 'https://cityclick.com/compare/az-phoenix-vs-az-scottsdale/', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { loc: 'https://cityclick.com/compare/co-denver-vs-ut-salt-lake-city/', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { loc: 'https://cityclick.com/compare/id-boise-vs-az-scottsdale/', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { loc: 'https://cityclick.com/compare/ar-hot-springs-vs-ar-hot-springs-village/', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { loc: 'https://cityclick.com/compare/ar-fayetteville-vs-ar-bentonville/', priority: '0.8', changefreq: 'monthly', lastmod: today },

    // Tools & Developer Platforms
    { loc: 'https://cityclick.com/tools/lease-calculator/', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { loc: 'https://cityclick.com/developers/', priority: '0.7', changefreq: 'monthly', lastmod: today },
    { loc: 'https://cityclick.com/partners/join/', priority: '0.6', changefreq: 'monthly', lastmod: today },

    // Institutional Standards
    { loc: 'https://cityclick.com/about/', priority: '0.5', changefreq: 'monthly', lastmod: today },
    { loc: 'https://cityclick.com/methodology/', priority: '0.5', changefreq: 'monthly', lastmod: today },
    { loc: 'https://cityclick.com/privacy/', priority: '0.3', changefreq: 'yearly', lastmod: today },
    { loc: 'https://cityclick.com/terms/', priority: '0.3', changefreq: 'yearly', lastmod: today },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${certifiedRoutes
  .map(
    (r) => `  <url>
    <loc>${r.loc}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
