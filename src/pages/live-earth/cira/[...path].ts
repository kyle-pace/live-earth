// Relays Himawari tiles and scan times from CIRA's SLIDER to the viewer, from this lab's own
// address, so the browser can stitch tiles on a canvas (SLIDER sends no CORS headers). Only
// the two kinds of address in src/lib/cira.ts are relayed; anything else is a 404. Cloudflare
// caches each answer at the edge, so SLIDER sees one request per tile, not one per visitor.
import type { APIRoute } from 'astro';
import { upstreamFor } from '../../../lib/cira';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const target = upstreamFor(params.path ?? '');
  if (!target) return new Response('Not found', { status: 404 });

  const res = await fetch(target.url, {
    headers: { 'user-agent': 'kylepace.dev Live Earth (https://kylepace.dev/live-earth/about/)' },
    // Cloudflare's edge cache: tiles never change, the times list changes every 10 minutes.
    cf: { cacheEverything: true, cacheTtl: target.maxAge },
  } as RequestInit);

  if (!res.ok) return new Response('Not available', { status: res.status === 404 ? 404 : 502 });
  return new Response(res.body, {
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/octet-stream',
      'cache-control': `public, max-age=${target.maxAge}${target.maxAge > 3600 ? ', immutable' : ''}`,
    },
  });
};
