// Building NOAA GOES image addresses and working out scan times. No network here: the
// viewer uses these to know which file to ask for, and tests/goes.test.ts checks them
// against real file names from NOAA's listings.
import type { Satellite, Size, View } from './views';

export const NOAA = 'https://cdn.star.nesdis.noaa.gov';

/** The folder a view's files live in: FD, CONUS, or SECTOR/<code>. */
export function folder(view: View): string {
  if (view.code === 'FD' || view.code === 'CONUS') return view.code;
  return `SECTOR/${view.code}`;
}

/** A scan time as NOAA writes it in file names: year, day of year, hour, minute, in UTC. */
export function stamp(date: Date): string {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const day = Math.floor((date.getTime() - start) / 86_400_000) + 1;
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${year}${pad(day, 3)}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`;
}

/** The reverse of stamp(): "20263190900" is 09:00 UTC on Nov 15, 2026. */
export function parseStamp(s: string): Date {
  const year = Number(s.slice(0, 4));
  const day = Number(s.slice(4, 7));
  const hour = Number(s.slice(7, 9));
  const minute = Number(s.slice(9, 11));
  return new Date(Date.UTC(year, 0, day, hour, minute));
}

/** The latest scan start at or before `date` for a view (scans start every `cadence`
 * minutes, at minutes ending in `offset`). */
export function alignDown(date: Date, view: View): Date {
  const minutes = Math.floor(date.getTime() / 60_000);
  const aligned = minutes - ((((minutes - view.offset) % view.cadence) + view.cadence) % view.cadence);
  return new Date(aligned * 60_000);
}

/** Address of one picture. */
export function imageUrl(sat: Satellite, view: View, when: Date, size: Size): string {
  return `${NOAA}/${sat.code}/ABI/${folder(view)}/GEOCOLOR/${stamp(when)}_${sat.code}-ABI-${view.code}-GEOCOLOR-${size[0]}x${size[1]}.jpg`;
}

/** The scan times to try, newest first, when looking for the latest picture. NOAA posts a
 * whole-Earth scan about 15 to 25 minutes after it starts, a regional one 5 to 10. */
export function candidates(now: Date, view: View, count = 8): Date[] {
  const first = alignDown(new Date(now.getTime() - 4 * 60_000), view);
  return Array.from({ length: count }, (_, i) => new Date(first.getTime() - i * view.cadence * 60_000));
}

/** The frames for a time-lapse ending at `latest`, oldest first, at most `max` of them. */
export function lapseFrames(latest: Date, view: View, hours: number, max = 72): Date[] {
  const total = Math.floor((hours * 60) / view.cadence);
  const step = view.cadence * Math.max(1, Math.ceil(total / max));
  const frames: Date[] = [];
  for (let t = latest.getTime() - hours * 3_600_000 + step * 60_000; t <= latest.getTime(); t += step * 60_000) {
    frames.push(new Date(t));
  }
  // Keep `latest` as the last frame even when the step doesn't land on it.
  if (frames.at(-1)?.getTime() !== latest.getTime()) frames.push(latest);
  return frames;
}

/** Picks an image size: the smallest that covers `needPx` across, but no wider than the
 * cap for the chosen detail level. Standard keeps pictures to a few megabytes; High allows
 * NOAA's big files (a whole-Earth picture is about 10 MB). */
export function pickSize(view: View, needPx: number, detail: 'standard' | 'high'): Size {
  const cap = detail === 'high' ? 5500 : 2500;
  const allowed = view.sizes.filter(([w]) => w <= cap);
  const list = allowed.length ? allowed : [view.sizes[0]];
  return list.find(([w]) => w >= needPx) ?? list[list.length - 1];
}

/** The size used for time-lapse frames: around 600 px, so a dozen hours stays near 25 MB. */
export function lapseSize(view: View): Size {
  return view.sizes.find(([w]) => w >= 600) ?? view.sizes[view.sizes.length - 1];
}
