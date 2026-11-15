// Meteosat pictures from EUMETSAT's public map service (EUMETView). It serves each satellite's
// picture as a flat latitude/longitude map: Meteosat-12's GeoColour from 0° and Meteosat-9's
// Natural Colour Enhanced from 45.5°E over the Indian Ocean. For the whole-Earth view the
// browser turns that map back into the round planet as the satellite sees it. Regions are
// shown as the flat map itself.
//
// Licence: EUMETSAT's data policy (Jan 2026) makes Meteosat image products, hourly scans and
// anything an hour or older "Core" data: free and unrestricted under CC BY 4.0, with the
// credit "Contains modified EUMETSAT Meteosat data <year>". The viewer only asks for
// on-the-hour scans, so every picture it shows is Core.

export const WMS = 'https://view.eumetsat.int/geoserver/ows';
export const LAYER = 'mtg_fd:rgb_geocolour';

/** The layer's own extent: the part of the flat map that Meteosat-12 can see. */
export const DISK_EXTENT = { south: -77.35, west: -81.28, north: 77.35, east: 81.28 };

export interface Extent {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** Address of a flat-map picture of `extent` at `width` × `height`, for the scan at `when`. */
export function wmsUrl(extent: Extent, width: number, height: number, when: Date, layer = LAYER): string {
  const p = new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers: layer,
    styles: '',
    crs: 'EPSG:4326',
    // WMS 1.3.0 with EPSG:4326 takes latitude first.
    bbox: [extent.south, extent.west, extent.north, extent.east].join(','),
    width: String(width),
    height: String(height),
    format: 'image/jpeg',
    // Night is empty in the Natural Colour layers; without this the map server paints it white.
    bgcolor: '0x000000',
    time: when.toISOString().replace('.000Z', 'Z'),
  });
  return `${WMS}?${p}`;
}

// ---------- Through this lab's relay ----------
//
// EUMETView draws each picture when it's asked for, which takes 1 to 15 seconds depending on
// size and how busy it is. So a scheduled job (src/worker.ts) asks for every size the page
// uses, once, as soon as each hourly scan may be used, and keeps them in Workers KV
// (Cloudflare's key-value store, free plan) for 14 hours, enough for a 12-hour time-lapse.
// The page asks this lab's own Worker (src/pages/live-earth/wms.ts), which answers from KV,
// or from EUMETView if it's something the job didn't keep. A side benefit: EUMETView never
// sees visitors.

export const LAYERS = [LAYER, 'msg_iodc:rgb_naturalenhncd'] as const;
export const RELAY = '/live-earth/wms';

/** The relay's address for a picture: the same request, as short query parameters. */
export function relayUrl(extent: Extent, width: number, height: number, when: Date, layer = LAYER): string {
  const p = new URLSearchParams({
    layer,
    bbox: [extent.south, extent.west, extent.north, extent.east].join(','),
    w: String(width),
    h: String(height),
    time: when.toISOString().replace('.000Z', 'Z'),
  });
  return `${RELAY}?${p}`;
}

/** The EUMETView address a relay request stands for, or null if the relay shouldn't pass it
 * on: an unknown layer, a strange area or size, or a scan that isn't free Core data yet
 * (on the hour, at least 35 minutes old, and no older than a week). */
export function upstreamFor(params: URLSearchParams, now = Date.now()): string | null {
  const layer = params.get('layer') ?? '';
  if (!(LAYERS as readonly string[]).includes(layer)) return null;
  const box = (params.get('bbox') ?? '').split(',').map(Number);
  if (box.length !== 4 || box.some((n) => !Number.isFinite(n))) return null;
  const [south, west, north, east] = box;
  if (south < -90 || north > 90 || south >= north || west < -180 || east > 180 || west >= east) return null;
  const w = Number(params.get('w'));
  const h = Number(params.get('h'));
  if (![w, h].every((n) => Number.isInteger(n) && n >= 16 && n <= 4096)) return null;
  const time = params.get('time') ?? '';
  const when = Date.parse(time);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/.test(time) || Number.isNaN(when)) return null;
  if (now - when < 35 * 60_000 || now - when > 7 * 86_400_000) return null;
  return wmsUrl({ south, west, north, east }, w, h, new Date(when), layer);
}

/** The KV key for a relay request: one per layer, area, size and scan. */
export function cacheKey(upstream: string): string {
  const u = new URL(upstream).searchParams;
  return ['wms', u.get('layers'), u.get('bbox'), `${u.get('width')}x${u.get('height')}`, u.get('time')].join('|');
}

/** The bit of Workers KV this lab uses (the full type lives in @cloudflare/workers-types). */
export interface PictureStore {
  get(key: string, type: 'stream'): Promise<ReadableStream | null>;
  put(key: string, value: ReadableStream, options: { expirationTtl: number }): Promise<void>;
}

/** How long KV keeps a picture: 14 hours, enough for a 12-hour time-lapse. */
export const KEEP_SECONDS = 14 * 3600;

// ---------- The geostationary view ----------

const H = 42164.16; // satellite distance from Earth's center, km
const R_EQ = 6378.137; // equatorial radius, km
const R_POL = 6356.7523; // polar radius, km
const E2 = (R_EQ * R_EQ) / (R_POL * R_POL); // 1.006739501
const C = H * H - R_EQ * R_EQ; // 1737122264
/** How far from straight down, in radians, the Earth's edge is at the equator. */
export const MAX_SCAN = Math.asin(R_EQ / H);

/** Where a line of sight from the satellite meets the Earth: the standard CGMS formulas for
 * a geostationary scan. x is the angle east of straight down, y north, both in radians.
 * Returns null when the line misses the planet. */
export function scanToLonLat(x: number, y: number, subLon = 0): { lon: number; lat: number } | null {
  const cx = Math.cos(x);
  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const a = cy * cy + E2 * sy * sy;
  const d = (H * cx * cy) ** 2 - a * C;
  if (d < 0) return null;
  const sn = (H * cx * cy - Math.sqrt(d)) / a;
  const s1 = H - sn * cx * cy;
  const s2 = sn * Math.sin(x) * cy;
  const s3 = sn * sy;
  const sxy = Math.hypot(s1, s2);
  const lon = (Math.atan(s2 / s1) * 180) / Math.PI + subLon;
  const lat = (Math.atan((E2 * s3) / sxy) * 180) / Math.PI;
  return { lon, lat };
}

/** The share of the picture's width the planet takes, matching NOAA's whole-Earth pictures,
 * so both get the same round mask in the viewer. */
export const DISK_FILL = 0.4994;

/** RGBA pixels, the shape of a canvas ImageData (plain, so the tests can run outside a browser). */
export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** Turns a flat-map picture of DISK_EXTENT into the round planet, `size` pixels square.
 * Returns the RGBA pixels; space is black. Bilinear sampling. */
export function reprojectDisk(src: Pixels, size: number, extent: Extent = DISK_EXTENT, subLon = 0): Pixels {
  const out = { width: size, height: size, data: new Uint8ClampedArray(size * size * 4) };
  const o = out.data;
  const s = src.data;
  const sw = src.width;
  const sh = src.height;
  const lonSpan = extent.east - extent.west;
  const latSpan = extent.north - extent.south;
  const scale = MAX_SCAN / (DISK_FILL * size); // radians per output pixel
  for (let j = 0; j < size; j++) {
    const y = (size / 2 - j - 0.5) * scale; // north is up
    for (let i = 0; i < size; i++) {
      const k = (j * size + i) * 4;
      o[k + 3] = 255;
      const x = (i + 0.5 - size / 2) * scale;
      const p = scanToLonLat(x, y, subLon);
      if (!p) continue;
      const u = ((p.lon - extent.west) / lonSpan) * sw - 0.5;
      const v = ((extent.north - p.lat) / latSpan) * sh - 0.5;
      if (u < 0 || v < 0 || u > sw - 1 || v > sh - 1) continue;
      const u0 = Math.floor(u);
      const v0 = Math.floor(v);
      const fu = u - u0;
      const fv = v - v0;
      const u1 = Math.min(u0 + 1, sw - 1);
      const v1 = Math.min(v0 + 1, sh - 1);
      const a = (v0 * sw + u0) * 4;
      const b = (v0 * sw + u1) * 4;
      const c = (v1 * sw + u0) * 4;
      const d = (v1 * sw + u1) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const top = s[a + ch] * (1 - fu) + s[b + ch] * fu;
        const bottom = s[c + ch] * (1 - fu) + s[d + ch] * fu;
        o[k + ch] = top * (1 - fv) + bottom * fv;
      }
    }
  }
  return out;
}

/** How big a flat map to ask for, to fill a `size`-pixel round picture without blur. */
export function sourceSize(size: number, extent: Extent = DISK_EXTENT): [number, number] {
  const w = Math.round(size * 1.5);
  const h = Math.round((w * (extent.north - extent.south)) / (extent.east - extent.west));
  return [w, h];
}
