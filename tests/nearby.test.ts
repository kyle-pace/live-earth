// Checks that a place gets the satellite and region a person would pick by hand, and that
// the place search finds what people type.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SATELLITES } from '../src/lib/views.ts';
import { bestView, contains, regionPlaces, searchPlaces, viewAngle, type Place } from '../src/lib/nearby.ts';

const pick = (lat: number, lon: number, wide = false) => {
  const p = bestView(SATELLITES, lat, lon, wide);
  return p ? `${p.sat.id}/${p.view.id}` : null;
};

test('places get the closest satellite’s smallest region around them', () => {
  assert.equal(pick(47.61, -122.33), 'west/pnw'); // Seattle: GOES West sees it less slanted
  assert.equal(pick(40.71, -74.01), 'east/ne'); // New York
  assert.equal(pick(21.31, -157.86), 'west/hi'); // Honolulu
  assert.equal(pick(61.22, -149.9), 'west/cak'); // Anchorage
  assert.equal(pick(-34.6, -58.38), 'east/ssa'); // Buenos Aires
  assert.equal(pick(51.51, -0.13), 'meteosat/europe'); // London
  assert.equal(pick(64.15, -21.94), 'meteosat/europe'); // Reykjavik: too edge-on for GOES East
  assert.equal(pick(30.04, 31.24), 'indian/middle-east'); // Cairo
  assert.equal(pick(28.61, 77.21), 'indian/india'); // Delhi
  assert.equal(pick(35.68, 139.69), 'himawari/japan'); // Tokyo
  assert.equal(pick(-33.87, 151.21), 'himawari/australia'); // Sydney
});

test('regions that cross the date line still contain their places', () => {
  assert.ok(contains([30, 160, 62, -140], 45, 179));
  assert.ok(contains([30, 160, 62, -140], 45, -170));
  assert.ok(!contains([30, 160, 62, -140], 45, 150));
  assert.equal(pick(45, 179), 'west/np'); // mid North Pacific
});

test('a guessed place gets a wider region', () => {
  assert.equal(pick(34.05, -118.24, true), 'west/us'); // Pacific time's main city: the whole western U.S.
  assert.equal(pick(40.71, -74.01, true), 'east/us');
  assert.equal(pick(35.68, 139.69, true), 'himawari/east-asia');
});

test('the poles and the far side of nowhere get no picture', () => {
  assert.equal(pick(89, 0), null);
  assert.ok(viewAngle(0, 0, 0) === 0 && Math.round(viewAngle(0, 90, 0)) === 90);
});

const places: Place[] = [...regionPlaces(SATELLITES), ...JSON.parse(readFileSync(new URL('../src/data/places.json', import.meta.url), 'utf8'))];

test('the search finds cities, countries, states and regions', () => {
  assert.equal(searchPlaces(places, 'seattle')[0][0], 'Seattle, Washington');
  assert.equal(searchPlaces(places, 'São Paulo')[0][0].split(',')[0], 'São Paulo');
  assert.equal(searchPlaces(places, 'sao paulo')[0][0].split(',')[0], 'São Paulo');
  assert.ok(searchPlaces(places, 'japan').some((p) => p[0] === 'Japan'));
  assert.ok(searchPlaces(places, 'washington').some((p) => p[0] === 'Washington, United States'));
  assert.ok(searchPlaces(places, 'gulf').some((p) => p[0] === 'Gulf of Mexico'));
  assert.deepEqual(searchPlaces(places, '   '), []);
  assert.deepEqual(searchPlaces(places, 'zzzzqx'), []);
});
