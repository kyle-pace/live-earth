// The Worker's entry point: Astro's own request handler, plus a scheduled job that runs at
// :36 past every hour (see "triggers" in wrangler.jsonc). The job asks EUMETView for the scan
// that just became free to use, in every size the page asks for, and keeps each one in
// Workers KV for 14 hours, so visitors get Meteosat pictures straight from Cloudflare
// instead of waiting while EUMETView draws them. About 20 pictures an hour, well inside
// KV's free 1,000 writes a day.
import { handle } from '@astrojs/cloudflare/handler';
import { SATELLITES } from './lib/views';
import { DISK_EXTENT, KEEP_SECONDS, LAYER, cacheKey, relayUrl, sourceSize, upstreamFor, type PictureStore } from './lib/eumetsat';

interface Env {
  PICTURES?: PictureStore;
}

/** Every EUMETView address the page might ask for, for one scan. */
export function warmList(hour: Date, now: number): string[] {
  const urls: string[] = [];
  for (const s of SATELLITES.filter((x) => x.source === 'eumetsat')) {
    const layer = s.layer ?? LAYER;
    const disk = s.diskExtent ?? DISK_EXTENT;
    for (const v of s.views) {
      for (const [w, h] of v.sizes) {
        const relay =
          v.shape === 'disk' ? relayUrl(disk, ...sourceSize(w, disk), hour, layer) : v.extent && relayUrl(v.extent, w, h, hour, layer);
        if (!relay) continue;
        const target = upstreamFor(new URL(relay, 'https://kylepace.dev').searchParams, now);
        if (target) urls.push(target);
      }
    }
  }
  return urls;
}

async function keep(env: Env, now: Date) {
  if (!env.PICTURES) return;
  const hour = new Date(Math.floor((now.getTime() - 35 * 60_000) / 3_600_000) * 3_600_000);
  const urls = warmList(hour, now.getTime());
  let kept = 0;
  // Three at a time, so EUMETView isn't asked for everything at once.
  for (let i = 0; i < urls.length; i += 3) {
    const results = await Promise.allSettled(
      urls.slice(i, i + 3).map(async (u) => {
        const key = cacheKey(u);
        if (await env.PICTURES!.get(key, 'stream').then((s) => (s?.cancel(), !!s))) return;
        const res = await fetch(u, {
          headers: { 'user-agent': 'kylepace.dev Live Earth (https://kylepace.dev/live-earth/about/)' },
        });
        if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) {
          await res.body?.cancel();
          throw new Error(`EUMETView said ${res.status} for ${key}`);
        }
        await env.PICTURES!.put(key, res.body!, { expirationTtl: KEEP_SECONDS });
        kept++;
      }),
    );
    for (const r of results) if (r.status === 'rejected') console.error(r.reason);
  }
  console.log(`Kept ${kept} of ${urls.length} Meteosat pictures for ${hour.toISOString()}`);
}

export default {
  fetch: handle,
  scheduled(_controller: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
    ctx.waitUntil(keep(env, new Date()));
  },
};
