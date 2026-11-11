import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTerrainFloor,
  generateTerrainFeatures,
  isInsideArchPassage,
  terrainFeatureBounds
} from '../src/phase6/terrain.js';

test('terrain feature layout is deterministic for a fixed seed', () => {
  const options = {
    seed: 42, rockCount: 18, archCount: 4, shelfCount: 6, crevasseCount: 3,
    floorAt: (x, z) => -9 + Math.sin(x * .1) * .2 + Math.cos(z * .1) * .1
  };
  assert.deepEqual(generateTerrainFeatures(options), generateTerrainFeatures(options));
});

test('rocks, arches, shelves and channels stay inside configured bounds', () => {
  const bounds = { minX: -40, maxX: 40, minZ: -28, maxZ: 28 };
  const features = generateTerrainFeatures({
    seed: 77, bounds, rockCount: 100, archCount: 12, shelfCount: 20, crevasseCount: 12
  });
  for (const rock of features.rocks) {
    assert.ok(rock.x - rock.radius >= bounds.minX);
    assert.ok(rock.x + rock.radius <= bounds.maxX);
    assert.ok(rock.z - rock.depth >= bounds.minZ);
    assert.ok(rock.z + rock.depth <= bounds.maxZ);
    assert.ok(rock.radius > 0 && rock.height > 0 && rock.depth > 0);
  }
  for (const arch of features.arches) {
    assert.ok(arch.x - arch.radius - 1 >= bounds.minX);
    assert.ok(arch.x + arch.radius + 1 <= bounds.maxX);
    assert.ok(arch.z - arch.radius - 1 >= bounds.minZ);
    assert.ok(arch.z + arch.radius + 1 <= bounds.maxZ);
    assert.ok(arch.tube > 0 && arch.depth > 0);
  }
  for (const shelf of features.shelves) {
    const ex = Math.abs(Math.cos(shelf.rotation)) * shelf.width / 2
      + Math.abs(Math.sin(shelf.rotation)) * shelf.depth / 2;
    const ez = Math.abs(Math.sin(shelf.rotation)) * shelf.width / 2
      + Math.abs(Math.cos(shelf.rotation)) * shelf.depth / 2;
    assert.ok(shelf.x - ex >= bounds.minX);
    assert.ok(shelf.x + ex <= bounds.maxX);
    assert.ok(shelf.z - ez >= bounds.minZ);
    assert.ok(shelf.z + ez <= bounds.maxZ);
    assert.ok(shelf.width > 0 && shelf.height > 0 && shelf.depth > 0);
  }
  for (const channel of features.crevasses) {
    const ex = Math.abs(Math.cos(channel.rotation)) * channel.length / 2
      + Math.abs(Math.sin(channel.rotation)) * channel.width / 2;
    const ez = Math.abs(Math.sin(channel.rotation)) * channel.length / 2
      + Math.abs(Math.cos(channel.rotation)) * channel.width / 2;
    assert.ok(channel.x - ex >= bounds.minX);
    assert.ok(channel.x + ex <= bounds.maxX);
    assert.ok(channel.z - ez >= bounds.minZ);
    assert.ok(channel.z + ez <= bounds.maxZ);
    assert.ok(channel.depth > 0 && channel.length > channel.width);
  }
});

test('terrain generator rejects invalid counts and bounds', () => {
  assert.throws(() => generateTerrainFeatures({ rockCount: -1 }), RangeError);
  assert.throws(() => generateTerrainFeatures({ archCount: 1.5 }), RangeError);
  assert.throws(() => generateTerrainFeatures({ shelfCount: -1 }), RangeError);
  assert.throws(() => generateTerrainFeatures({ crevasseCount: 0.5 }), RangeError);
  assert.throws(() => generateTerrainFeatures({
    bounds: { minX: 2, maxX: 2, minZ: -1, maxZ: 1 }
  }), RangeError);
});

test('channel floor profile has a depressed centre and fades smoothly at its ends', () => {
  const features = {
    crevasses: [{
      id: 'channel-a', x: 0, z: 0, length: 20, width: 4, depth: 2, rotation: 0
    }]
  };
  const floor = createTerrainFloor(() => -10, features);
  assert.ok(Math.abs(floor(0, 0) - (-12)) < 1e-8);
  assert.ok(floor(0, 2) > floor(0, 0));
  assert.ok(floor(10, 0) > floor(9, 0));
  assert.ok(Math.abs(floor(10, 0) - (-10)) < 1e-8);
  assert.ok(Math.abs(floor(0, 30) - (-10)) < 1e-8);
});

test('channel floor follows channel rotation', () => {
  const features = {
    crevasses: [{
      id: 'channel-b', x: 0, z: 0, length: 20, width: 4, depth: 1.5, rotation: Math.PI / 2
    }]
  };
  const floor = createTerrainFloor(() => -8, features);
  assert.ok(floor(0, 0) < floor(5, 0));
  assert.ok(Math.abs(floor(0, 5) - (-9.5)) < 1e-8);
});

test('arch passage query distinguishes clear aperture from solid arch material', () => {
  const arch = { x: 0, z: 0, radius: 4, tube: .8, depth: 3 };
  assert.equal(isInsideArchPassage(0, 0, arch), true);
  assert.equal(isInsideArchPassage(3.8, 0, arch), false);
  assert.equal(isInsideArchPassage(0, 1.4, arch), true);
  assert.equal(isInsideArchPassage(0, 1.6, arch), false);
  assert.equal(isInsideArchPassage(0, 0, arch, 3), false);
});

test('terrain feature bounds include rock, arch, shelf and channel extents', () => {
  const features = {
    rocks: [{ x: 0, z: 0, radius: 2, depth: 1 }],
    arches: [],
    shelves: [{ x: 8, z: 0, width: 4, height: 1, depth: 2, rotation: 0 }],
    crevasses: [{ x: -8, z: 0, length: 6, width: 2, rotation: 0 }]
  };
  assert.deepEqual(terrainFeatureBounds(features), {
    minX: -11, maxX: 10, minZ: -2, maxZ: 2
  });
  assert.equal(terrainFeatureBounds({ rocks: [], arches: [], shelves: [], crevasses: [] }), null);
});
