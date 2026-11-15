// Checks the Himawari helpers: which addresses the relay passes on to CIRA's SLIDER, and how
// tiles are laid out to make a picture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseStamp, parseTimes, stamp, tilePlan, tileUrl, upstreamFor, zoomFor, TILE } from '../src/lib/cira.ts';
import { SATELLITES } from '../src/lib/views.ts';

const when = new Date('2026-11-15T03:00:00Z');

test('scan times round-trip through SLIDER’s stamp format', () => {
  assert.equal(stamp(when), '20261115030000');
  assert.equal(parseStamp(20261115030000).getTime(), when.getTime());
});

test('a tile address maps to the matching SLIDER file', () => {
  const path = tileUrl(when, 2, 1, 3).replace('/live-earth/cira/', '');
  assert.equal(path, 'tile/20261115030000/02/001_003.png');
  assert.equal(
    upstreamFor(path)?.url,
    'https://slider.cira.colostate.edu/data/imagery/2026/11/15/himawari---full_disk/geocolor/20261115030000/02/001_003.png',
  );
  assert.equal(upstreamFor('times')?.maxAge, 60);
});

test('the relay refuses anything else', () => {
  for (const bad of [
    '',
    'tile/20261115030000/02/004_000.png', // row 4 doesn't exist at zoom 2
    'tile/20261115030000/05/000_000.png', // no zoom 5
    'tile/2026111503000/02/000_000.png',
    'tile/20261115030000/02/000_000.png/../../secret',
    '../data/json/goes-16/latest_times.json',
    'https://example.com/x.png',
  ]) {
    assert.equal(upstreamFor(bad), null, bad);
  }
});

test('the whole disk at zoom 1 is four tiles filling the canvas', () => {
  const plan = tilePlan([0, 0, 1, 1], 1, 1376, 1376);
  assert.equal(plan.length, 4);
  assert.deepEqual(
    plan.map((t) => [t.row, t.col, t.x, t.y, t.size]),
    [
      [0, 0, 0, 0, TILE],
      [0, 1, TILE, 0, TILE],
      [1, 0, 0, TILE, TILE],
      [1, 1, TILE, TILE, TILE],
    ],
  );
});

test('a region only fetches the tiles it covers', () => {
  const japan = SATELLITES.find((s) => s.id === 'himawari')!.views.find((v) => v.id === 'japan')!;
  for (const [w, h] of japan.sizes) {
    const zoom = zoomFor(japan.box!, w);
    const plan = tilePlan(japan.box!, zoom, w, h);
    assert.ok(plan.length > 0 && plan.length < 4 ** zoom / 4, `${w}: ${plan.length} tiles at zoom ${zoom}`);
    // The tiles cover the whole canvas.
    assert.ok(Math.min(...plan.map((t) => t.x)) <= 0 && Math.min(...plan.map((t) => t.y)) <= 0);
    assert.ok(Math.max(...plan.map((t) => t.x + t.size)) >= w && Math.max(...plan.map((t) => t.y + t.size)) >= h);
  }
});

test('every Himawari size maps to a real zoom level', () => {
  for (const v of SATELLITES.find((s) => s.id === 'himawari')!.views) {
    for (const [w] of v.sizes) {
      const z = zoomFor(v.box!, w);
      assert.ok(Math.abs((v.box![2] - v.box![0]) * TILE * 2 ** z - w) <= 1, `${v.id} ${w}`);
    }
  }
});

test('reads SLIDER’s real list of scan times, newest first', () => {
  const sample = JSON.parse(readFileSync(new URL('./fixtures/slider-latest-times.json', import.meta.url), 'utf8'));
  const newest = parseStamp(sample.timestamps_int[0]);
  const times = parseTimes(sample, newest.getTime() + 60_000);
  assert.equal(times.length, 4);
  assert.equal(times[0].getTime(), newest.getTime());
  assert.ok(times[0] > times[1] && times[1] > times[2]);
});

test('a broken or odd list of times gives nothing to try instead of an error', () => {
  assert.deepEqual(parseTimes(null), []);
  assert.deepEqual(parseTimes({ timestamps_int: 'soon' }), []);
  const now = Date.parse('2026-11-15T18:00:00Z');
  const times = parseTimes({ timestamps_int: ['nope', 20261115175000, 20261115185000, 123] }, now);
  assert.deepEqual(times.map((d) => d.toISOString()), ['2026-11-15T17:50:00.000Z']);
});
