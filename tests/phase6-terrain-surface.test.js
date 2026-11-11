import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { seabedRelief, sampleSeabedHeight, buildSeabedGrid } from '../src/phase6/terrain-surface.js';

test('multi-scale relief is deterministic, finite and non-flat', () => {
  const a = seabedRelief(12.5, -8.25);
  assert.equal(a, seabedRelief(12.5, -8.25));
  assert.ok(Number.isFinite(a));
  const samples = [];
  for (let z = -24; z <= 24; z += 3) {
    for (let x = -36; x <= 36; x += 3) samples.push(seabedRelief(x, z));
  }
  assert.ok(Math.max(...samples) - Math.min(...samples) > 2.5);
});

test('surface height composes relief on the supplied base floor', () => {
  assert.equal(sampleSeabedHeight(0, 0, () => -10), -10 + seabedRelief(0, 0));
  assert.throws(() => sampleSeabedHeight(0, 0, () => NaN), TypeError);
  assert.throws(() => sampleSeabedHeight(0, 0, null), TypeError);
});

test('heightfield has coherent indexed topology, finite attributes and exact bounds', () => {
  const grid = buildSeabedGrid({
    width: 20, depth: 12, segmentsX: 12, segmentsZ: 8,
    floorAt: () => -10
  });
  assert.equal(grid.vertexCount, 13 * 9);
  assert.equal(grid.positions.length, grid.vertexCount * 3);
  assert.equal(grid.colours.length, grid.vertexCount * 3);
  assert.equal(grid.uvs.length, grid.vertexCount * 2);
  assert.equal(grid.indices.length, 12 * 8 * 6);
  assert.equal(grid.triangleCount, 12 * 8 * 2);
  assert.deepEqual({
    minX: grid.bounds.minX, maxX: grid.bounds.maxX,
    minZ: grid.bounds.minZ, maxZ: grid.bounds.maxZ
  }, { minX: -10, maxX: 10, minZ: -6, maxZ: 6 });
  assert.ok(grid.bounds.maxY > grid.bounds.minY);
  for (const array of [grid.positions, grid.colours, grid.uvs]) {
    for (const value of array) assert.ok(Number.isFinite(value));
  }
  for (const index of grid.indices) assert.ok(index < grid.vertexCount);
});

test('heightfield rejects invalid geometry budgets and missing floor function', () => {
  assert.throws(() => buildSeabedGrid({ floorAt: () => -10, segmentsX: 1 }), RangeError);
  assert.throws(() => buildSeabedGrid({ floorAt: () => -10, width: 0 }), RangeError);
  assert.throws(() => buildSeabedGrid({ floorAt: null }), RangeError);
});


test('terrain study browser module parses before deployment', () => {
  const html = readFileSync(new URL('../phase6-spike.html', import.meta.url), 'utf8');
  const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  assert.ok(match, 'module script exists');
  const withoutImports = match[1].replace(/^import .*;\s*$/gm, '');
  assert.doesNotThrow(() => new vm.Script(withoutImports, { filename: 'phase6-spike.html' }));
});
