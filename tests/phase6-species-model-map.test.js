import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpeciesModel, SPECIES_MODEL_MAP, SPECIES_WITHOUT_REVIEWED_MODEL } from '../src/phase6/species-model-map.js';

test('reviewed species mappings point only to real Osmocean catalogue entries', () => {
  assert.equal(getSpeciesModel('parrotfish').id, 'parrot_fish');
  assert.equal(getSpeciesModel('manta').id, '5878');
  assert.equal(getSpeciesModel('jellyfish').id, '5889');
  assert.equal(getSpeciesModel('mola').id, 'sunfish');
  assert.equal(getSpeciesModel('eel'), null);
  assert.equal(Object.keys(SPECIES_MODEL_MAP).length, 16);
});

test('species without matching assets are explicit rather than silently substituted', () => {
  assert.ok(SPECIES_WITHOUT_REVIEWED_MODEL.includes('crab'));
  assert.ok(SPECIES_WITHOUT_REVIEWED_MODEL.includes('wobbegong'));
  assert.ok(SPECIES_WITHOUT_REVIEWED_MODEL.includes('dolphin'));
});
