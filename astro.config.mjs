import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://cityclick.com',
  trailingSlash: 'ignore',
  output: 'static',
  adapter: cloudflare({
    imageService: 'cloudflare',
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});
