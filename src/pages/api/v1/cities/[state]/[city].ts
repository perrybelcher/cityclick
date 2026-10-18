export const prerender = false;

import type { APIRoute } from 'astro';
import manifest from '../../../../../data/index-manifest.json';

export const GET: APIRoute = async ({ params }) => {
  const { state, city } = params;

  if (!state || !city) {
    return new Response(JSON.stringify({ error: 'Missing state or city parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const targetSlug = `${state.toLowerCase()}/${city.toLowerCase()}`;
    const found = manifest.find((c: any) => c.slug === targetSlug);

    if (!found) {
      return new Response(JSON.stringify({ error: `City ${city} not found in state ${state}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        data: {
          slug: found.slug,
          name: found.name,
          state: found.stateName,
          stateCode: found.stateCode,
          placeFips: found.slug === 'tx/austin' ? '4805000' : found.slug === 'fl/tampa' ? '1271000' : found.slug === 'id/boise' ? '1608830' : null,
          population: found.population,
          medianHouseholdIncome: found.medianHouseholdIncome,
          popGrowth5YrPct: found.popGrowth5YrPct,
          viabilityScore: found.overallViability,
          askingRentSqFtYr: found.reportedRetailRentSqFtYr,
          combinedSalesTax: found.combinedSalesTaxRate,
          avgPermitWaitDays: 32,
          timeZone: found.timeZone,
          topUnderservedTrades: found.topUnderservedNaics,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Internal server error', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
