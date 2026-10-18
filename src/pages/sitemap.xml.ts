export const prerender = true;

import type { APIRoute } from 'astro';
import { ALL_CITIES } from '../data/catalog';

export const GET: APIRoute = async () => {
  const staticUrls = [
    'https://cityclick.com/',
    'https://cityclick.com/tools/lease-calculator',
    'https://cityclick.com/developers',
  ];

  const cityUrls = ALL_CITIES.map((c) => `https://cityclick.com/${c.slug}`);

  const allUrls = [...staticUrls, ...cityUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (url) => `  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url === 'https://cityclick.com/' ? '1.0' : '0.8'}</priority>
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
