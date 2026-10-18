export const prerender = false;

import type { APIRoute } from 'astro';
import { getCityBySlug } from '../../../../../data/catalog';

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
    const found = getCityBySlug(targetSlug);

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
          cityId: found.cityId,
          countyFips: found.countyFips,
          name: found.name,
          state: found.stateName,
          stateCode: found.stateCode,
          population: found.demographics.population,
          medianHouseholdIncome: found.demographics.medianHouseholdIncome,
          popGrowth5YrPct: found.demographics.popGrowth5YrPct,
          viabilityScores: found.scores,
          askingRentSqFtYr: found.marketSignals.reportedRetailRentSqFtYr,
          permitAvgWaitDays: found.permitsAndTax.avgPermitWaitDays,
          combinedSalesTax: found.permitsAndTax.combinedSalesTaxRate,
          industries: found.industries.map((i) => ({
            naicsCode: i.naicsCode,
            label: i.label,
            establishments: i.establishments,
            saturationIndex: i.saturationIndex,
            status: i.status,
          })),
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
