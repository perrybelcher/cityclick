export const prerender = true;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  // Certified indexable routes (Crawl Shield excludes all unverified cities)
  const certifiedRoutes = [
    { loc: 'https://cityclick.com/', priority: '1.0', changefreq: 'daily', lastmod: '2026-10-31' },

    // Top 7 Verified Benchmark City Guides
    { loc: 'https://cityclick.com/tx/austin/', priority: '0.9', changefreq: 'weekly', lastmod: '2026-10-31' },
    { loc: 'https://cityclick.com/tn/nashville/', priority: '0.9', changefreq: 'weekly', lastmod: '2026-10-31' },
    { loc: 'https://cityclick.com/ar/hot-springs/', priority: '0.9', changefreq: 'weekly', lastmod: '2026-10-31' },
    { loc: 'https://cityclick.com/ar/hot-springs-village/', priority: '0.9', changefreq: 'weekly', lastmod: '2026-10-31' },
    { loc: 'https://cityclick.com/id/boise/', priority: '0.9', changefreq: 'weekly', lastmod: '2026-10-31' },
    { loc: 'https://cityclick.com/fl/tampa/', priority: '0.9', changefreq: 'weekly', lastmod: '2026-10-31' },
    { loc: 'https://cityclick.com/az/scottsdale/', priority: '0.9', changefreq: 'weekly', lastmod: '2026-10-31' },

    // Verified Compare Showdowns
    { loc: 'https://cityclick.com/compare/tx-austin-vs-tn-nashville/', priority: '0.8', changefreq: 'monthly', lastmod: '2026-10-31' },
    { loc: 'https://cityclick.com/compare/tx-austin-vs-fl-tampa/', priority: '0.8', changefreq: 'monthly', lastmod: '2026-10-31' },
    { loc: 'https://cityclick.com/compare/id-boise-vs-az-scottsdale/', priority: '0.8', changefreq: 'monthly', lastmod: '2026-10-31' },
    { loc: 'https://cityclick.com/compare/ar-hot-springs-vs-ar-hot-springs-village/', priority: '0.8', changefreq: 'monthly', lastmod: '2026-10-31' },
    { loc: 'https://cityclick.com/compare/tx-austin-vs-ar-hot-springs-village/', priority: '0.8', changefreq: 'monthly', lastmod: '2026-10-31' },

    // Tools & Developer Platforms
    { loc: 'https://cityclick.com/tools/lease-calculator/', priority: '0.8', changefreq: 'monthly', lastmod: '2026-10-31' },
    { loc: 'https://cityclick.com/developers/', priority: '0.7', changefreq: 'monthly', lastmod: '2026-10-31' },
    { loc: 'https://cityclick.com/partners/join/', priority: '0.6', changefreq: 'monthly', lastmod: '2026-10-31' },

    // Institutional Standards
    { loc: 'https://cityclick.com/about/', priority: '0.5', changefreq: 'monthly', lastmod: '2026-10-31' },
    { loc: 'https://cityclick.com/methodology/', priority: '0.5', changefreq: 'monthly', lastmod: '2026-10-31' },
    { loc: 'https://cityclick.com/privacy/', priority: '0.3', changefreq: 'yearly', lastmod: '2026-10-31' },
    { loc: 'https://cityclick.com/terms/', priority: '0.3', changefreq: 'yearly', lastmod: '2026-10-31' },
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
