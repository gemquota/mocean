import test from 'node:test';
import assert from 'node:assert/strict';
import { hasTerrainClearance, sampleSpatialTerrain } from '../src/phase6/spatial-query.js';

const floorAt = () => -10;
const arch = {
  id: 'arch-a', x: 0, z: 0, floor: -10,
  radius: 4, tube: 0.7, depth: 3, rotation: 0
};

test('spatial query reports signed distance above and below the seabed', () => {
  const above = sampleSpatialTerrain({ x: 12, y: -8, z: 12 }, { floorAt });
  const below = sampleSpatialTerrain({ x: 12, y: -12, z: 12 }, { floorAt });
  assert.equal(above.featureType, 'seabed');
  assert.ok(above.distance > 0);
  assert.ok(below.distance < 0);
  assert.ok(above.normal.y > 0.99);
});

test('arch passage remains open while the arch rib is solid', () => {
  const features = { rocks: [], arches: [arch] };
  const passage = sampleSpatialTerrain({ x: 0, y: -9.5, z: 0 }, { features, floorAt });
  const crown = sampleSpatialTerrain({ x: 0, y: -5.3, z: 0 }, { features, floorAt });
  assert.ok(passage.distance > 0);
  assert.equal(crown.featureType, 'arch');
  assert.ok(crown.distance < 0);
  assert.equal(hasTerrainClearance({ x: 0, y: -9.5, z: 0 }, 0.5, { features, floorAt }), true);
});

test('arch query respects finite depth and rotation', () => {
  const features = { rocks: [], arches: [{ ...arch, rotation: Math.PI / 3 }] };
  const inside = sampleSpatialTerrain({ x: 0, y: -9.5, z: 0 }, { features, floorAt });
  const outsideDepth = sampleSpatialTerrain({ x: -2.6, y: -6, z: 4 }, { features, floorAt });
  assert.ok(inside.distance > 0);
  assert.ok(outsideDepth.distance > 0);
});

test('ellipsoidal boulder contributes a solid obstacle and outward normal', () => {
  const features = {
    rocks: [{ id: 'rock-1', x: 0, y: -7, z: 0, radius: 2, height: 3, depth: 1.5 }],
    arches: []
  };
  const inside = sampleSpatialTerrain({ x: 0, y: -7, z: 0 }, { features, floorAt });
  const above = sampleSpatialTerrain({ x: 0, y: -3.5, z: 0 }, { features, floorAt });
  assert.equal(inside.featureId, 'rock-1');
  assert.equal(inside.featureType, 'rock');
  assert.ok(inside.distance < 0);
  assert.ok(above.distance > 0);
  assert.ok(above.normal.y > 0.95);
});

test('terrain query returns finite unit normals and validates inputs', () => {
  const result = sampleSpatialTerrain({ x: 1, y: -7, z: 2 }, { floorAt });
  assert.ok(Number.isFinite(result.distance));
  assert.ok(Math.abs(Math.hypot(result.normal.x, result.normal.y, result.normal.z) - 1) < 1e-9);
  assert.throws(() => sampleSpatialTerrain({ x: NaN, y: 0, z: 0 }), TypeError);
  assert.throws(() => sampleSpatialTerrain({ x: 0, y: 0, z: 0 }, { normalStep: 0 }), RangeError);
  assert.throws(() => hasTerrainClearance({ x: 0, y: 0, z: 0 }, -1), RangeError);
});
