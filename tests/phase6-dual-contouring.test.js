import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeabedDensityField, sampleDensityGradient } from '../src/phase6/voxel-field.js';
import { buildDualContourMesh } from '../src/phase6/dual-contouring.js';

test('seabed density is deterministic and separates rock from water', () => {
  const a = createSeabedDensityField({ seed: 42 });
  const b = createSeabedDensityField({ seed: 42 });
  assert.equal(a(0, -14, 0), b(0, -14, 0));
  assert.ok(a(0, -14, 0) < 0, 'deep point is solid');
  assert.ok(a(0, 3, 0) > 0, 'water column is empty');
  assert.throws(() => a(NaN, 0, 0), /finite/);
});

test('subtractive tunnel cuts through otherwise solid seabed', () => {
  const density = createSeabedDensityField();
  assert.ok(density(4.5, -10.45, 0) > 0, 'tunnel centre is water');
  assert.ok(density(4.5, -13, 0) < 0, 'rock remains below tunnel');
  assert.ok(density(13, -10.45, 0) < 0, 'terrain outside the tunnel remains solid');
  assert.ok(density(-7.5, -5, 1.5) < 0, 'arch crown is solid');
  assert.ok(density(-7.5, -8.45, 1.5) > 0, 'arch aperture remains open');
});

test('density gradients are finite and normalised', () => {
  const density = createSeabedDensityField();
  const normal = sampleDensityGradient(density, 0, -8.6, 0);
  assert.ok([normal.x, normal.y, normal.z].every(Number.isFinite));
  assert.ok(Math.abs(Math.hypot(normal.x, normal.y, normal.z) - 1) < 1e-8);
});

test('dual contouring extracts a finite indexed sphere surface', () => {
  const sphere = (x, y, z) => Math.hypot(x, y, z) - 1.25;
  const mesh = buildDualContourMesh({
    sample: sphere,
    origin: { x: -2, y: -2, z: -2 },
    cells: { x: 16, y: 16, z: 16 },
    cellSize: 0.25
  });
  assert.ok(mesh.vertexCount > 0);
  assert.ok(mesh.triangleCount > 0);
  assert.equal(mesh.positions.length, mesh.normals.length);
  assert.ok([...mesh.positions, ...mesh.normals].every(Number.isFinite));
  assert.ok([...mesh.indices].every(index => index < mesh.vertexCount));
  assert.ok(mesh.bounds.minX < -1 && mesh.bounds.maxX > 1);
});

test('dual contouring rejects non-finite density samples', () => {
  assert.throws(() => buildDualContourMesh({
    sample: () => NaN,
    origin: { x: -2, y: -2, z: -2 },
    cells: { x: 4, y: 4, z: 4 },
    cellSize: 1
  }), /finite values/);
});

test('dual contouring returns an empty mesh for an all-water volume', () => {
  const mesh = buildDualContourMesh({
    sample: () => 1,
    origin: { x: -2, y: -2, z: -2 },
    cells: { x: 4, y: 4, z: 4 },
    cellSize: 1
  });
  assert.equal(mesh.vertexCount, 0);
  assert.equal(mesh.triangleCount, 0);
});

test('dual contouring rejects invalid dimensions and oversized grids', () => {
  assert.throws(() => buildDualContourMesh({ sample: () => 1, cells: { x: 1, y: 2, z: 2 } }), /Invalid/);
  assert.throws(() => buildDualContourMesh({ sample: () => 1, cells: { x: 200, y: 200, z: 200 } }), /safety limit/);
});
