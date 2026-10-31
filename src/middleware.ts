import { defineMiddleware } from 'astro:middleware';
import { SLUG_MIGRATIONS } from './config/slugMigrations';

export const onRequest = defineMiddleware((context, next) => {
  if (context.isPrerendered) {
    return next();
  }

  const url = context.url;
  const host = url.hostname.toLowerCase();
  const isWww = host === 'www.cityclick.com';
  const isHttpProd = (host === 'cityclick.com' || isWww) && url.protocol === 'http:';

  let targetPath = url.pathname;

  // Check legacy V1 Census slug migrations for SSR routes (/api/v1/cities/:state/:city and /:state/:city)
  const trimmed = targetPath.replace(/^\/+|\/+$/g, '').toLowerCase();
  const redirectOrigin = host.endsWith('cityclick.com') ? 'https://cityclick.com' : url.origin;
  if (SLUG_MIGRATIONS[trimmed]) {
    targetPath = `/${SLUG_MIGRATIONS[trimmed]}/`;
    return context.redirect(`${redirectOrigin}${targetPath}${url.search}`, 301);
  }
  if (trimmed.startsWith('api/v1/cities/')) {
    const apiSlug = trimmed.slice('api/v1/cities/'.length);
    if (SLUG_MIGRATIONS[apiSlug]) {
      return context.redirect(`${redirectOrigin}/api/v1/cities/${SLUG_MIGRATIONS[apiSlug]}${url.search}`, 301);
    }
  }

  if (isWww || isHttpProd) {
    return context.redirect(`https://cityclick.com${targetPath}${url.search}`, 301);
  }

  return next();
});
