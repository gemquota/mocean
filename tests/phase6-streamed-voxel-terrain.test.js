import test from 'node:test';
import assert from 'node:assert/strict';
import { selectTerrainChunks, TERRAIN_CHUNK_SIZE } from '../src/phase6/streamed-voxel-terrain.js';

test('stream selection is deterministic and uses world-space chunk coordinates', () => {
  const a = selectTerrainChunks({ x: 0, z: 0 });
  const b = selectTerrainChunks({ x: 0, z: 0 });
  assert.deepEqual(a, b);
  assert.ok(a.some(chunk => chunk.key === '0,0'));
  assert.ok(a.some(chunk => chunk.key === '-1,0'));
  assert.ok(a.every(chunk => Number.isInteger(chunk.x) && Number.isInteger(chunk.z)));
});

test('stream selection follows negative coordinates without truncation errors', () => {
  const chunks = selectTerrainChunks({ x: -0.1, z: -32.1, radius: 1, prefetchRadius: 2 });
  assert.ok(chunks.some(chunk => chunk.key === '-1,-2'));
  assert.ok(chunks.some(chunk => chunk.key === '-2,-2'));
});

test('forward prediction prioritises chunks in the direction of travel', () => {
  const chunks = selectTerrainChunks({ x: 0, z: 0, forwardX: 1, forwardZ: 0, radius: 1, prefetchRadius: 2 });
  const east = chunks.findIndex(chunk => chunk.key === '1,0');
  const west = chunks.findIndex(chunk => chunk.key === '-1,0');
  assert.ok(east < west);
});

test('chunk selection keeps a visible radius plus a prefetch ring', () => {
  const chunks = selectTerrainChunks({ x: 0, z: 0, radius: 1, prefetchRadius: 2 });
  assert.ok(chunks.some(chunk => chunk.key === '0,0' && chunk.visible));
  assert.ok(chunks.some(chunk => chunk.key === '2,0' && !chunk.visible));
  assert.ok(chunks.every(chunk => chunk.distance <= 2.25));
  assert.equal(TERRAIN_CHUNK_SIZE, 32);
});

test('invalid chunk radii are rejected', () => {
  assert.throws(() => selectTerrainChunks({ radius: 3, prefetchRadius: 2 }), RangeError);
  assert.throws(() => selectTerrainChunks({ chunkSize: 0 }), RangeError);
});
