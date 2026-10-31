export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const rawSlug = typeof body?.citySlug === 'string' ? body.citySlug.trim() : '';
    const citySlug = rawSlug.replace(/^\/+|\/+$/g, '').toLowerCase();

    if (!citySlug || !/^[a-z]{2}\/[a-z0-9-]+$/.test(citySlug)) {
      return new Response(JSON.stringify({ error: 'Valid citySlug (e.g. "tx/austin") is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isAustin = citySlug === 'tx/austin';

    return new Response(
      JSON.stringify({
        status: 'success',
        freePublicResource: true,
        pdfAvailable: isAustin,
        message: isAustin
          ? 'Austin primary-source dossier PDF is available directly as a free public resource.'
          : 'CityClick guides are free public resources; open the city guide URL directly.',
        downloadUrl: isAustin
          ? 'https://cityclick.com/reports/tx-austin-feasibility-dossier.pdf'
          : `https://cityclick.com/${citySlug}/`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Invalid payload', details: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
