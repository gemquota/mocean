import test from 'node:test';
import assert from 'node:assert/strict';
import { geographicToMap, mapToGeographic, panPlanetMap, wrapUnit } from '../src/phase6/planetary-map.js';

test('planet map coordinates wrap in both directions', () => {
  assert.equal(wrapUnit(1), 0);
  assert.equal(wrapUnit(-0.25), 0.75);
  assert.equal(wrapUnit(2.25), 0.25);
});

test('geographic and map conversion preserve longitude and latitude', () => {
  for (const [longitude, latitude] of [[0, 0], [1.2, -0.7], [-Math.PI + 0.01, 1.1]]) {
    const map = geographicToMap(longitude, latitude);
    const geographic = mapToGeographic(map.u, map.v);
    assert.ok(Math.abs(geographic.longitude - longitude) < 1e-10);
    assert.ok(Math.abs(geographic.latitude - latitude) < 1e-10);
  }
});

test('map focus crosses each screen edge without reaching a hard boundary', () => {
  const focus = { u: 0.001, v: 0.999 };
  const moved = panPlanetMap(focus, 30, -30, 1200, 800, 1);
  assert.ok(moved.u > 0.95);
  assert.ok(moved.v < 0.06);
});

test('planet map panning scales inversely with zoom', () => {
  const focus = { u: 0.5, v: 0.5 };
  const far = panPlanetMap(focus, 100, 0, 1200, 800, 1);
  const near = panPlanetMap(focus, 100, 0, 1200, 800, 4);
  assert.ok(Math.abs(near.u - 0.5) < Math.abs(far.u - 0.5));
});
