// Where the sun is overhead right now, to within about a degree: enough to say which
// satellite is looking at daylight. Uses the standard low-precision solar position
// formulas (the same ones the U.S. Naval Observatory publishes for almanac use).

const rad = Math.PI / 180;

/** Longitude (−180 to 180, east positive) and latitude where the sun is straight overhead. */
export function subsolarPoint(date: Date): { lon: number; lat: number } {
  const days = date.getTime() / 86_400_000 - 10957.5; // days since J2000 (2000-01-01 12:00 UTC)
  const meanLon = (280.46 + 0.9856474 * days) % 360;
  const anomaly = ((357.528 + 0.9856003 * days) % 360) * rad;
  const eclipticLon = (meanLon + 1.915 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly)) * rad;
  const obliquity = (23.439 - 0.0000004 * days) * rad;
  const ra = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLon), Math.cos(eclipticLon));
  const dec = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLon));
  const gmst = (18.697374558 + 24.06570982441908 * days) % 24; // hours
  let lon = (ra / rad - gmst * 15) % 360;
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;
  return { lon, lat: dec / rad };
}

/** Degrees between two longitudes, 0 to 180. */
export function lonDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** How a geostationary satellite at `satLon` sees the planet right now, in words. */
export function lightingFor(satLon: number, date: Date): 'Mostly daylight' | 'Day and night' | 'Mostly night' {
  const d = lonDistance(satLon, subsolarPoint(date).lon);
  if (d < 55) return 'Mostly daylight';
  if (d > 125) return 'Mostly night';
  return 'Day and night';
}

/** Longitude written the way a map would: 137.2°W, 0°, 15.5°E. */
export function formatLon(lon: number): string {
  const v = Math.round(Math.abs(lon) * 10) / 10;
  if (v === 0) return '0°';
  return `${v}°${lon < 0 ? 'W' : 'E'}`;
}

/** How high the sun is over a place, in degrees: 0 at sunrise and sunset, below -6 once
 * it's properly dark. Uses the same low-precision sun position as above. */
export function sunElevation(lat: number, lon: number, date: Date): number {
  const sun = subsolarPoint(date);
  const r = Math.PI / 180;
  const cosZenith =
    Math.sin(lat * r) * Math.sin(sun.lat * r) + Math.cos(lat * r) * Math.cos(sun.lat * r) * Math.cos((lon - sun.lon) * r);
  return 90 - Math.acos(Math.max(-1, Math.min(1, cosZenith))) / r;
}
