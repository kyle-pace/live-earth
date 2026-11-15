// Checks the address and timing rules in src/lib/goes.ts against real NOAA file names
// (tests/fixtures/noaa-file-names.txt), plus the awkward cases. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SATELLITES } from '../src/lib/views.ts';
import { alignDown, candidates, imageUrl, lapseFrames, parseStamp, pickSize, stamp } from '../src/lib/goes.ts';
import { lightingFor, subsolarPoint } from '../src/lib/sun.ts';

const lines = readFileSync(new URL('./fixtures/noaa-file-names.txt', import.meta.url), 'utf8')
  .split('\n')
  .filter((l) => l && !l.startsWith('#'));

function find(satId: string, viewId: string) {
  const sat = SATELLITES.find((s) => s.id === satId)!;
  const view = sat.views.find((v) => v.id === viewId)!;
  return { sat, view };
}

test('builds the same file names NOAA publishes', () => {
  for (const line of lines) {
    const [satId, viewId, name] = line.split(' ');
    const { sat, view } = find(satId, viewId);
    const when = parseStamp(name.slice(0, 11));
    const [w0, h0] = name.match(/(\d+)x(\d+)\.jpg$/)!.slice(1).map(Number);
    const size = view.sizes.find(([w, h]) => w === w0 && h === h0);
    assert.ok(size, `${name}: size is listed`);
    assert.equal(imageUrl(sat, view, when, size).split('/').pop(), name);
  }
});

test('real scan times sit on each view’s schedule', () => {
  for (const line of lines) {
    const [satId, viewId, name] = line.split(' ');
    const { view } = find(satId, viewId);
    const when = parseStamp(name.slice(0, 11));
    assert.equal(alignDown(when, view).getTime(), when.getTime(), `${name} is on the ${view.cadence}-minute schedule`);
  }
});

test('stamp and parseStamp round-trip, including the last day of a leap year', () => {
  for (const iso of ['2026-11-15T09:00:00Z', '2028-12-31T23:59:00Z', '2027-01-01T00:00:00Z']) {
    const d = new Date(iso);
    assert.equal(parseStamp(stamp(d)).getTime(), d.getTime());
  }
  assert.equal(stamp(new Date('2028-12-31T23:59:00Z')), '20283662359');
});

test('looks for the newest scan first and steps back on the schedule', () => {
  const { view } = find('west', 'pnw'); // every 5 minutes at :01, :06, ...
  const list = candidates(new Date('2026-11-15T09:23:41Z'), view, 3);
  assert.deepEqual(list.map(stamp), ['20263190916', '20263190911', '20263190906']);
});

test('a time-lapse ends on the newest frame and stays under the frame limit', () => {
  const { view } = find('west', 'pnw');
  const latest = new Date('2026-11-15T09:16:00Z');
  const twelve = lapseFrames(latest, view, 12);
  assert.ok(twelve.length <= 73);
  assert.equal(twelve.at(-1)!.getTime(), latest.getTime());
  const three = lapseFrames(latest, view, 3);
  assert.equal(three.length, 36);
});

test('picks a big enough picture, within the detail level', () => {
  const { view } = find('east', 'earth');
  const wh = (s: number[]) => s.slice(0, 2);
  assert.deepEqual(wh(pickSize(view, 1200, 'standard')), [1808, 1808]);
  assert.deepEqual(wh(pickSize(view, 3000, 'standard')), [1808, 1808]);
  assert.deepEqual(wh(pickSize(view, 3000, 'high')), [5424, 5424]);
  assert.deepEqual(wh(pickSize(view, 200, 'standard')), [339, 339]);
});

test('a broken view (no sizes under the cap) still gets a picture', () => {
  const { view } = find('east', 'earth');
  const odd = { ...view, sizes: [[9000, 9000, 0, 0]] as [number, number, number, number][] };
  assert.deepEqual(pickSize(odd, 500, 'standard'), [9000, 9000, 0, 0]);
});

test('the sun is over the right side of the planet', () => {
  // Noon in Seattle-ish longitudes at about 20:00 UTC in November.
  const sun = subsolarPoint(new Date('2026-11-15T20:00:00Z'));
  assert.ok(sun.lon > -130 && sun.lon < -115, `subsolar longitude ${sun.lon}`);
  assert.ok(sun.lat < -17 && sun.lat > -20, `subsolar latitude ${sun.lat}`);
  assert.equal(lightingFor(-137.2, new Date('2026-11-15T21:00:00Z')), 'Mostly daylight');
  assert.equal(lightingFor(-75.2, new Date('2026-11-15T06:00:00Z')), 'Mostly night');
  assert.equal(lightingFor(-75.2, new Date('2026-11-15T09:00:00Z')), 'Day and night'); // dawn over the Atlantic
});

test('every trim leaves most of the picture and hides at least the caption bar', () => {
  for (const sat of SATELLITES) {
    for (const view of sat.views) {
      for (const [w, h, bottom, left] of view.sizes) {
        if (view.shape === 'disk') continue;
        assert.ok(bottom >= 0.02 && bottom < 0.25, `${sat.id}/${view.id} ${w}x${h} bottom ${bottom}`);
        assert.ok(left >= 0 && left < 0.2, `${sat.id}/${view.id} ${w}x${h} left ${left}`);
      }
    }
  }
});
