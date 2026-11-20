import test from 'node:test';
import assert from 'node:assert/strict';
import { planetaryMapElevation } from '../src/phase6/planetary-map-renderer.js';
import { planetarySurfaceElevation } from '../src/phase6/planetary-renderer.js';

test('planetary map wraps longitude without wrapping the poles', () => {
  for (let value = 0; value <= 1; value += .071) {
    assert.ok(Math.abs(planetaryMapElevation(0, value) - planetaryMapElevation(1, value)) < 1e-12);
  }
  assert.equal(planetaryMapElevation(.37, -1), planetaryMapElevation(.37, 0));
  assert.equal(planetaryMapElevation(.37, 2), planetaryMapElevation(.37, 1));
});

test('planetary map contains varied ocean, shelf and land elevations', () => {
  let min = 1, max = 0, land = 0;
  for (let y = 0; y <= 32; y++) {
    for (let x = 0; x <= 64; x++) {
      const value = planetaryMapElevation(x / 64, y / 32);
      min = Math.min(min, value);
      max = Math.max(max, value);
      if (value > .555) land++;
    }
  }
  assert.ok(max - min > .2);
  assert.ok(land > 100 && land < 1800);
});

test('flat map samples the same spherical geography, including the true polar edges', () => {
  for (const latitude of [-Math.PI / 2, -1.2, -.8, -.3, 0, .4, .9, 1.2, Math.PI / 2]) {
    for (const longitude of [-2.4, -1.1, 0, 1.3, 2.7]) {
      const u = longitude / (Math.PI * 2) + .5;
      const v = .5 - latitude / Math.PI;
      assert.ok(Math.abs(planetaryMapElevation(u, v) - planetarySurfaceElevation(longitude, latitude)) < 1e-12);
    }
  }
});
