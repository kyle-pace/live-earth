// Checks the Meteosat helpers: the map-service address, and the formulas that turn the flat
// map back into the round planet the satellite sees.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISK_EXTENT, MAX_SCAN, reprojectDisk, scanToLonLat, sourceSize, wmsUrl } from '../src/lib/eumetsat.ts';

test('the address asks for one GeoColour scan, in lat,lon order', () => {
  const url = new URL(wmsUrl({ south: 34, west: -25, north: 72, east: 45 }, 600, 541, new Date('2026-11-15T07:00:00Z')));
  assert.equal(url.origin + url.pathname, 'https://view.eumetsat.int/geoserver/ows');
  assert.equal(url.searchParams.get('layers'), 'mtg_fd:rgb_geocolour');
  assert.equal(url.searchParams.get('bbox'), '34,-25,72,45');
  assert.equal(url.searchParams.get('width'), '600');
  assert.equal(url.searchParams.get('height'), '541');
  assert.equal(url.searchParams.get('time'), '2026-11-15T07:00:00Z');
});

test('the center of the disk is the point under the satellite', () => {
  const p = scanToLonLat(0, 0)!;
  assert.ok(Math.abs(p.lon) < 1e-9 && Math.abs(p.lat) < 1e-9);
});

test('scan angles map to the right places on Earth', () => {
  const east = scanToLonLat(0.05, 0)!;
  assert.ok(Math.abs(east.lon - 16.4) < 0.2, `lon ${east.lon}`);
  assert.ok(Math.abs(east.lat) < 1e-9);
  const north = scanToLonLat(0, 0.05)!;
  assert.ok(Math.abs(north.lat - 16.5) < 0.2, `lat ${north.lat}`);
});

test('looking past the edge of the Earth finds space', () => {
  assert.equal(scanToLonLat(MAX_SCAN * 1.01, 0), null);
  assert.equal(scanToLonLat(0, MAX_SCAN * 1.01), null);
});

test('the flat map asked for is about 1.5 times the disk, at the map’s shape', () => {
  const [w, h] = sourceSize(1200);
  assert.ok(w >= 1700 && w <= 1900, `w ${w}`);
  const ratio = (DISK_EXTENT.north - DISK_EXTENT.south) / (DISK_EXTENT.east - DISK_EXTENT.west);
  assert.ok(Math.abs(h / w - ratio) < 0.01);
});

test('redrawing a plain map gives a round planet on black', () => {
  const [w, h] = sourceSize(100);
  const data = new Uint8ClampedArray(w * h * 4).fill(200);
  const out = reprojectDisk({ width: w, height: h, data }, 100);
  const px = (x: number, y: number) => out.data[(y * 100 + x) * 4];
  assert.equal(out.width, 100);
  assert.ok(px(50, 50) > 150, 'center is Earth');
  assert.equal(px(2, 2), 0, 'corner is space');
  assert.equal(out.data[3], 255, 'space is opaque');
});
