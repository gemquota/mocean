import test from 'node:test';
import assert from 'node:assert/strict';
import { createTerrainFloor } from '../src/phase6/terrain.js';
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

test('arch query respects finite depth and arbitrary horizontal rotation', () => {
  const features = { rocks: [], arches: [{ ...arch, rotation: Math.PI / 3 }] };
  const inside = sampleSpatialTerrain({ x: 0, y: -9.5, z: 0 }, { features, floorAt });
  const outsideDepth = sampleSpatialTerrain(
    { x: 1.9052558883, y: -5.3, z: 1.1 },
    { features, floorAt }
  );
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

test('raised shelf has a solid top and underside with open water beneath it', () => {
  const shelf = {
    id: 'shelf-a', x: 0, y: -6, z: 0,
    width: 8, height: 1, depth: 4, rotation: Math.PI / 4
  };
  const features = { rocks: [], arches: [], shelves: [shelf] };
  const below = sampleSpatialTerrain({ x: 0, y: -8, z: 0 }, { features, floorAt });
  const solid = sampleSpatialTerrain({ x: 0, y: -6, z: 0 }, { features, floorAt });
  const above = sampleSpatialTerrain({ x: 0, y: -4, z: 0 }, { features, floorAt });
  const topSurface = sampleSpatialTerrain({ x: 0, y: -5.5, z: 0 }, { features, floorAt });
  const underside = sampleSpatialTerrain({ x: 0, y: -6.5, z: 0 }, { features, floorAt });
  assert.ok(below.distance > 0);
  assert.equal(solid.featureId, 'shelf-a');
  assert.equal(solid.featureType, 'shelf');
  assert.ok(solid.distance < 0);
  assert.ok(above.distance > 0);
  assert.ok(topSurface.normal.y > 0.95);
  assert.ok(underside.normal.y < -0.95);
  assert.ok(hasTerrainClearance({ x: 0, y: -8, z: 0 }, 1, { features, floorAt }));
});

test('composed channel floor is the same surface used by spatial queries', () => {
  const features = {
    rocks: [], arches: [], shelves: [],
    crevasses: [{
      id: 'channel-a', x: 0, z: 0, length: 20, width: 4,
      depth: 2, rotation: 0
    }]
  };
  const channelFloor = createTerrainFloor(floorAt, features);
  const centre = sampleSpatialTerrain({ x: 0, y: -11, z: 0 }, {
    features, floorAt: channelFloor
  });
  const shoulder = sampleSpatialTerrain({ x: 0, y: -9, z: 2.5 }, {
    features, floorAt: channelFloor
  });
  assert.ok(centre.distance < 0);
  assert.ok(shoulder.distance > 0);
  assert.equal(centre.featureType, 'seabed');
});

test('surface normal follows a sloped seabed rather than assuming world-up', () => {
  const slopedFloor = (x) => -10 + x * 0.25;
  const sample = sampleSpatialTerrain({ x: 0, y: -9, z: 0 }, { floorAt: slopedFloor });
  assert.ok(sample.normal.x < -0.2);
  assert.ok(sample.normal.y > 0.95);
});

test('terrain query returns finite unit normals and validates inputs', () => {
  const result = sampleSpatialTerrain({ x: 1, y: -7, z: 2 }, { floorAt });
  assert.ok(Number.isFinite(result.distance));
  assert.ok(Math.abs(Math.hypot(result.normal.x, result.normal.y, result.normal.z) - 1) < 1e-9);
  assert.throws(() => sampleSpatialTerrain({ x: NaN, y: 0, z: 0 }), TypeError);
  assert.throws(() => sampleSpatialTerrain({ x: 0, y: 0, z: 0 }, { normalStep: 0 }), RangeError);
  assert.throws(() => hasTerrainClearance({ x: 0, y: 0, z: 0 }, -1), RangeError);
});
