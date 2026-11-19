import test from 'node:test';
import assert from 'node:assert/strict';
import { planetaryMapElevation } from '../src/phase6/planetary-map-renderer.js';
import { planetaryGlobalSurfaceElevation } from '../src/phase6/planetary-renderer.js';

test('planetary map elevation is continuous across both wrapped edges', () => {
  for (let value = 0; value <= 1; value += .071) {
    assert.ok(Math.abs(planetaryMapElevation(0, value) - planetaryMapElevation(1, value)) < 1e-12);
    assert.ok(Math.abs(planetaryMapElevation(value, 0) - planetaryMapElevation(value, 1)) < 1e-12);
  }
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

test('the flat atlas preserves spherical geography outside its seamless polar margins', () => {
  for (const latitude of [-1.2, -.8, -.3, 0, .4, .9, 1.2]) {
    for (const longitude of [-2.4, -1.1, 0, 1.3, 2.7]) {
      const u = longitude / (Math.PI * 2) + .5;
      const v = .5 - latitude / Math.PI;
      assert.ok(Math.abs(planetaryMapElevation(u, v) - planetaryGlobalSurfaceElevation(longitude, latitude)) < 1e-12);
    }
  }
  for (let u = 0; u <= 1; u += .13) {
    assert.ok(Math.abs(planetaryMapElevation(u, 0) - planetaryMapElevation(u, 1)) < 1e-12);
  }
});
