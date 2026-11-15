import test from 'node:test';
import assert from 'node:assert/strict';

const previousSelf = globalThis.self;
globalThis.self = { addEventListener() {} };
const { buildVoxelTerrainChunk } = await import('../src/phase6/streamed-voxel-worker.js?progressive-lod');
if (previousSelf === undefined) delete globalThis.self;
else globalThis.self = previousSelf;

const base = {
  seed: 6102026,
  chunkX: 0,
  chunkZ: 0,
  chunkSize: 32,
  worldSize: { x: 100, y: 100, z: 100 },
  minY: -17.6,
  maxY: -4.8,
  includeStreamRocks: false
};

test('ocean, geology and ecology terrain LODs sample the same chunk at progressively finer resolution', () => {
  const ocean = buildVoxelTerrainChunk({ ...base, cellSize: 3.2 });
  const geology = buildVoxelTerrainChunk({ ...base, cellSize: 1.6 });
  const ecology = buildVoxelTerrainChunk({ ...base, cellSize: 0.8 });

  for (const mesh of [ocean, geology, ecology]) {
    assert.ok(mesh.vertexCount > 0);
    assert.ok(mesh.triangleCount > 0);
    assert.equal(mesh.positions.length, mesh.normals.length);
    assert.equal(mesh.indices.length % 3, 0);
  }
  assert.ok(ocean.triangleCount < geology.triangleCount);
  assert.ok(geology.triangleCount < ecology.triangleCount);
});

test('terrain LODs preserve identical world-space feature coordinates', () => {
  const coarse = buildVoxelTerrainChunk({ ...base, cellSize: 3.2 });
  const fine = buildVoxelTerrainChunk({ ...base, cellSize: 0.8 });
  const bounds = mesh => {
    const xs = [], ys = [], zs = [];
    for (let i = 0; i < mesh.positions.length; i += 3) {
      xs.push(mesh.positions[i]); ys.push(mesh.positions[i + 1]); zs.push(mesh.positions[i + 2]);
    }
    return {
      minX: Math.min(...xs), maxX: Math.max(...xs),
      minY: Math.min(...ys), maxY: Math.max(...ys),
      minZ: Math.min(...zs), maxZ: Math.max(...zs)
    };
  };
  const a = bounds(coarse), b = bounds(fine);
  for (const key of Object.keys(a)) assert.ok(Math.abs(a[key] - b[key]) < 1.6, key + ' should remain spatially stable across LODs');
});
