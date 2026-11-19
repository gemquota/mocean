import test from 'node:test';
import assert from 'node:assert/strict';
import { planetaryMapElevation } from '../src/phase6/planetary-map-renderer.js';

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
