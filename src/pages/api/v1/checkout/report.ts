export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { email, citySlug } = body;

    if (!email || !citySlug) {
      return new Response(JSON.stringify({ error: 'Email and citySlug are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // In local dev/Workers runtime, return mocked Stripe session / success response
    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'Feasibility dossier order initialized',
        downloadUrl: `https://cityclick.com/reports/${citySlug.replace('/', '-')}-feasibility-dossier.pdf`,
        orderId: `ord_${Date.now()}`,
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
