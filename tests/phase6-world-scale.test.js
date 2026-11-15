import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorldScaleController,
  normaliseWorldZoom,
  screenDragToHabitatPan
} from '../src/phase6/world-scale.js';

test('world zoom normalisation is independent of configured world size', () => {
  assert.equal(normaliseWorldZoom(2, 1), 2);
  assert.equal(normaliseWorldZoom(4, 2), 2);
  assert.equal(normaliseWorldZoom(.5, 1), 1);
  assert.throws(() => normaliseWorldZoom(1, 0), RangeError);
});

test('three world scales expose continuous detail blends and distinct terrain resolutions', () => {
  const scales = createWorldScaleController();
  const ocean = scales.update(1);
  assert.equal(ocean.level, 'ocean');
  assert.equal(ocean.terrainCellSize, 3.2);
  assert.equal(ocean.showLocalEcology, false);

  const geology = scales.update(2.2);
  assert.equal(geology.level, 'geology');
  assert.equal(geology.terrainCellSize, 1.6);
  assert.ok(geology.geologyBlend > 0.9);
  assert.ok(geology.ecologyBlend < 0.1);

  const ecology = scales.update(4.8);
  assert.equal(ecology.level, 'ecology');
  assert.equal(ecology.terrainCellSize, 0.8);
  assert.equal(ecology.showIndividualAnimals, true);
  assert.equal(ecology.ecologyBlend, 1);
});

test('scale transitions use hysteresis instead of oscillating at a zoom threshold', () => {
  const scales = createWorldScaleController();
  assert.equal(scales.update(2.06).level, 'geology');
  assert.equal(scales.update(1.9).level, 'geology');
  assert.equal(scales.update(1.77).level, 'ocean');
  assert.equal(scales.update(4.26).level, 'ecology');
  assert.equal(scales.update(3.9).level, 'ecology');
  assert.equal(scales.update(3.71).level, 'geology');
});

test('screen drag pans in the habitat plane and compensates for shallow view elevation', () => {
  const rightDrag = screenDragToHabitatPan({
    deltaX: 100, deltaY: 0, depth: 50, focalLength: 500,
    viewRight: { x: 1, z: 0 }, viewUp: { x: 0, z: .25 }
  });
  assert.ok(rightDrag.x < 0);
  assert.equal(rightDrag.z, 0);

  const verticalDrag = screenDragToHabitatPan({
    deltaX: 0, deltaY: 100, depth: 50, focalLength: 500,
    viewRight: { x: 1, z: 0 }, viewUp: { x: 0, z: .25 }
  });
  assert.ok(verticalDrag.z < 0);
  assert.ok(Math.abs(verticalDrag.z) > Math.abs(rightDrag.x) * 3.9);
});
