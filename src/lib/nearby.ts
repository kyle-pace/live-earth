// Picks the best satellite picture of a place. Used by the place search and to open near a
// first-time visitor (from their time zone, which the browser already knows; no location
// request, nothing sent anywhere).
//
// The best picture is the closest one: a region that contains the place, from the
// satellite that sees it most nearly straight down. Seattle is in GOES East's and GOES
// West's Pacific Northwest, but GOES West sits over the Pacific and sees it less slanted,
// so it wins. When no region contains the place, it's the whole Earth from that satellite.
import type { Satellite, View } from './views';

/** Past this angle from straight down, a satellite sees a place too edge-on to be useful. */
const MAX_ANGLE = 72;

/** How far a place is from the point under a satellite, in degrees of arc. 0 is straight
 * down; 81 is the edge of what it can see. */
export function viewAngle(lat: number, lon: number, satLon: number): number {
  const r = Math.PI / 180;
  const c = Math.cos(lat * r) * Math.cos((lon - satLon) * r);
  return Math.acos(Math.max(-1, Math.min(1, c))) / r;
}

/** Longitude difference east of `from`, in 0–360. */
const eastOf = (lon: number, from: number) => (((lon - from) % 360) + 360) % 360;

export function contains(bounds: [number, number, number, number], lat: number, lon: number): boolean {
  const [s, w, n, e] = bounds;
  if (lat < s || lat > n) return false;
  return eastOf(lon, w) <= eastOf(e, w);
}

function area(bounds: [number, number, number, number]): number {
  const [s, w, n, e] = bounds;
  return (n - s) * eastOf(e, w);
}

export interface Pick {
  sat: Satellite;
  view: View;
  /** Degrees from straight down, for saying how slanted the view is. */
  angle: number;
}

/** The best picture of a place, or null if no satellite sees it (the poles). `wide` picks the
 * largest region around the place instead of the smallest: right when the place is only a
 * guess, like a time zone's main city (Los Angeles for everyone on Pacific time). */
export function bestView(sats: Satellite[], lat: number, lon: number, wide = false): Pick | null {
  const ranked = sats
    .map((sat) => ({ sat, angle: viewAngle(lat, lon, sat.lon) }))
    .filter((x) => x.angle <= MAX_ANGLE)
    .sort((a, b) => a.angle - b.angle);
  if (!ranked.length) return null;

  // The best-placed satellite with a region around the place; its smallest such region.
  for (const { sat, angle } of ranked) {
    const regions = sat.views
      .filter((v) => v.bounds && contains(v.bounds, lat, lon))
      .sort((a, b) => (wide ? -1 : 1) * (area(a.bounds!) - area(b.bounds!)));
    if (regions.length) return { sat, view: regions[0], angle };
  }
  const { sat, angle } = ranked[0];
  return { sat, view: sat.views.find((v) => v.id === 'earth') ?? sat.views[0], angle };
}

// ---------- Place search ----------

/** [name, lat, lon, rank]: rank is population, so bigger places come first. */
export type Place = [string, number, number, number];

export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Places matching what's typed, best first: names that start with it, then names with a
 * word that starts with it; bigger places first within each. */
export function searchPlaces(places: Place[], query: string, limit = 8): Place[] {
  const q = fold(query);
  if (!q) return [];
  const starts: Place[] = [];
  const words: Place[] = [];
  for (const p of places) {
    const name = fold(p[0]);
    if (name.startsWith(q)) starts.push(p);
    else if (name.includes(` ${q}`)) words.push(p);
    if (starts.length >= limit) break;
  }
  return [...starts, ...words].slice(0, limit);
}

/** Region names count as places too ("Great Lakes", "Hawaii"), at their middle. */
export function regionPlaces(sats: Satellite[]): Place[] {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const s of sats) {
    for (const v of s.views) {
      if (!v.bounds || seen.has(v.label)) continue;
      seen.add(v.label);
      const [south, w, n, e] = v.bounds;
      const lon = w + eastOf(e, w) / 2;
      out.push([v.label, (south + n) / 2, lon > 180 ? lon - 360 : lon, 1e10]);
    }
  }
  return out;
}
