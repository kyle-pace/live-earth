// Himawari pictures from CIRA's SLIDER (Colorado State University, with NOAA's RAMMB). CIRA
// turns each Himawari-9 full-disk scan into GeoColor and serves it as square map tiles: 688 px
// each, 1 tile across at zoom 0, 2 at zoom 1, up to 16 at zoom 4. A new scan every 10 minutes.
//
// SLIDER doesn't allow other sites to read its tiles from a script (no CORS), and stitching
// tiles on a canvas needs that. So the browser asks this lab's own Worker instead
// (src/pages/live-earth/cira/[...path].ts), which fetches the tile from SLIDER, caches it at
// Cloudflare and passes it on. Only the two kinds of address below are relayed.
//
// Use: Kyle approved using SLIDER for this personal lab on Nov 15, 2026, pending a word with
// CIRA about their terms. The underlying Himawari data is JMA's.

export const SLIDER = 'https://slider.cira.colostate.edu';
export const RELAY = '/live-earth/cira';
export const TILE = 688;
export const MAX_ZOOM = 4;

/** How much of the picture's width the Earth fills (radius ÷ width), measured from SLIDER's
 * tiles. NOAA's disks fill 0.4994; the viewer scales Himawari up to match so the same round
 * mask fits every satellite. */
export const FILL = 0.493;

/** 2026-11-15 03:00 UTC → "20261115030000" */
export function stamp(when: Date): string {
  return when.toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

export function parseStamp(s: string | number): Date {
  const t = String(s);
  return new Date(
    Date.UTC(+t.slice(0, 4), +t.slice(4, 6) - 1, +t.slice(6, 8), +t.slice(8, 10), +t.slice(10, 12), +t.slice(12, 14)),
  );
}

/** The newest scans in SLIDER's times list, newest first, skipping anything malformed or in
 * the future. A broken list gives an empty array rather than an error. */
export function parseTimes(data: unknown, now = Date.now(), keep = 4): Date[] {
  const list = (data as { timestamps_int?: unknown })?.timestamps_int;
  if (!Array.isArray(list)) return [];
  return list
    .filter((t) => /^\d{14}$/.test(String(t)))
    .map(parseStamp)
    .filter((d) => !Number.isNaN(d.getTime()) && d.getTime() <= now)
    .sort((a, b) => b.getTime() - a.getTime())
    .slice(0, keep);
}

export function timesUrl(): string {
  return `${RELAY}/times`;
}

export function tileUrl(when: Date, zoom: number, row: number, col: number): string {
  const p = (n: number) => String(n).padStart(3, '0');
  return `${RELAY}/tile/${stamp(when)}/${String(zoom).padStart(2, '0')}/${p(row)}_${p(col)}.png`;
}

/** Where on SLIDER a relay address points, or null if it isn't one the relay allows. Used by
 * the Worker, and tested on its own. */
export function upstreamFor(path: string): { url: string; maxAge: number } | null {
  if (path === 'times') {
    return { url: `${SLIDER}/data/json/himawari/full_disk/geocolor/latest_times.json`, maxAge: 60 };
  }
  const m = /^tile\/(\d{4})(\d{2})(\d{2})(\d{6})\/(\d{2})\/(\d{3})_(\d{3})\.png$/.exec(path);
  if (!m) return null;
  const [, y, mo, d, hms, z, r, c] = m;
  const zoom = Number(z);
  const n = 2 ** zoom;
  if (zoom > MAX_ZOOM || Number(r) >= n || Number(c) >= n) return null;
  const ts = `${y}${mo}${d}${hms}`;
  return {
    url: `${SLIDER}/data/imagery/${y}/${mo}/${d}/himawari---full_disk/geocolor/${ts}/${z}/${r}_${c}.png`,
    maxAge: 7 * 24 * 3600,
  };
}

/** A part of the full-disk picture, as fractions of its width and height: [left, top, right,
 * bottom]. The whole disk is [0, 0, 1, 1]. */
export type Box = [number, number, number, number];

/** Which zoom level gives a picture `width` px wide for this box. */
export function zoomFor(box: Box, width: number): number {
  const full = width / (box[2] - box[0]);
  return Math.max(0, Math.min(MAX_ZOOM, Math.round(Math.log2(full / TILE))));
}

/** The tiles a box needs at a zoom level, and where each one lands on a `width` × `height`
 * canvas. For the whole disk, `fit` scales the planet so it fills the picture like NOAA's. */
export function tilePlan(
  box: Box,
  zoom: number,
  width: number,
  height: number,
  fit = 1,
): { row: number; col: number; x: number; y: number; size: number }[] {
  const n = 2 ** zoom;
  const full = TILE * n; // the whole disk's width at this zoom, in tile pixels
  // Tile pixels → canvas pixels, scaling about the box's center.
  const sx = (width / ((box[2] - box[0]) * full)) * fit;
  const sy = (height / ((box[3] - box[1]) * full)) * fit;
  const cx = ((box[0] + box[2]) / 2) * full;
  const cy = ((box[1] + box[3]) / 2) * full;
  const plan = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const x = (col * TILE - cx) * sx + width / 2;
      const y = (row * TILE - cy) * sy + height / 2;
      const size = TILE * sx;
      if (x + size <= 0 || y + TILE * sy <= 0 || x >= width || y >= height) continue;
      plan.push({ row, col, x, y, size });
    }
  }
  return plan;
}
