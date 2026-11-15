// Relays Meteosat pictures (src/lib/eumetsat.ts says why). Answers from the copies the
// hourly job keeps in Workers KV when it has one, and otherwise fetches from EUMETView with
// Cloudflare's cache in front. Only requests that upstreamFor allows are passed on.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { cacheKey, upstreamFor, type PictureStore } from '../../lib/eumetsat';

export const prerender = false;

const WEEK = 7 * 24 * 3600;
const headers = (type: string, source: string) => ({
  'content-type': type,
  'cache-control': `public, max-age=${WEEK}, immutable`,
  'x-live-earth': source,
});

export const GET: APIRoute = async ({ url }) => {
  const target = upstreamFor(url.searchParams);
  if (!target) return new Response('Not available', { status: 404 });

  const kept = await (env as { PICTURES?: PictureStore }).PICTURES?.get(cacheKey(target), 'stream');
  if (kept) return new Response(kept, { headers: headers('image/jpeg', 'kept') });

  const res = await fetch(target, {
    headers: { 'user-agent': 'kylepace.dev Live Earth (https://kylepace.dev/live-earth/about/)' },
    cf: { cacheEverything: true, cacheTtl: WEEK },
  } as RequestInit);
  const type = res.headers.get('content-type') ?? '';
  // EUMETView answers errors with a 200 and an XML message; only pass real pictures on.
  if (!res.ok || !type.startsWith('image/')) return new Response('Not available', { status: 502 });
  return new Response(res.body, { headers: headers(type, 'fetched') });
};
