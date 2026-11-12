import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES_MODEL_MAP, SPECIES_WITHOUT_REVIEWED_MODEL } from '../src/phase6/species-model-map.js';
import { ANIMATED_MODEL_SPECIES } from '../src/phase6/animated-species-filter.js';

test('seahorse and leafy seadragon use species-matched CC0 model assets', () => {
  assert.equal(SPECIES_MODEL_MAP.seahorse.id, 'lined_seahorse');
  assert.equal(SPECIES_MODEL_MAP.seahorse.assetId, '39345');
  assert.equal(SPECIES_MODEL_MAP.seaDragon.id, 'leafy_seadragon');
  assert.equal(SPECIES_MODEL_MAP.seaDragon.assetId, '39346');
  assert.ok(ANIMATED_MODEL_SPECIES.includes('seahorse'));
  assert.ok(ANIMATED_MODEL_SPECIES.includes('seaDragon'));
  assert.ok(!SPECIES_WITHOUT_REVIEWED_MODEL.includes('seahorse'));
  assert.ok(!SPECIES_WITHOUT_REVIEWED_MODEL.includes('seaDragon'));
  assert.equal(SPECIES_MODEL_MAP.anglerfish.assetId, '5890');
  assert.equal(SPECIES_MODEL_MAP.anglerfish.id, 'anglerfish');
  assert.ok(ANIMATED_MODEL_SPECIES.includes('anglerfish'));
});

test('the naturalistic model roster expands without duplicate species or model IDs', () => {
  assert.equal(ANIMATED_MODEL_SPECIES.length, 16);
  assert.equal(new Set(ANIMATED_MODEL_SPECIES).size, ANIMATED_MODEL_SPECIES.length);
  const ids=Object.values(SPECIES_MODEL_MAP).map(model=>model.id);
  assert.equal(new Set(ids).size, ids.length);
});
