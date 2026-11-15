// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// This lab lives at kylepace.dev/live-earth/. It's its own Worker, mounted on that path by
// the routes in wrangler.jsonc; the hub (kyle-pace/kylepace.dev) serves everything else
// on the domain, including the favicon, robots.txt and the privacy page.
// Everything this site serves sits under /live-earth/: pages in src/pages/live-earth/,
// public files in public/live-earth/, and built assets at /live-earth/_astro/. (Astro's
// `base` option isn't used: with the Cloudflare adapter it serves files from the wrong
// folder.)
export default defineConfig({
  site: 'https://kylepace.dev',
  build: { assets: 'live-earth/_astro' },
  session: false,
  adapter: cloudflare({ imageService: 'compile' }),
});
