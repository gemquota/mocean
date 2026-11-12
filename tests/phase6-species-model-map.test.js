import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpeciesModel, SPECIES_MODEL_MAP, SPECIES_WITHOUT_REVIEWED_MODEL } from '../src/phase6/species-model-map.js';

test('every enabled species maps to a matching animated marine GLB', () => {
  assert.equal(getSpeciesModel('fish').id, 'blue_goldfish');
  assert.equal(getSpeciesModel('schoolFish').id, 'tetra');
  assert.equal(getSpeciesModel('clownfish').id, 'clownfish');
  assert.equal(getSpeciesModel('parrotfish').id, 'parrot_fish');
  assert.equal(getSpeciesModel('blueTang').id, 'blue_tang');
  assert.equal(getSpeciesModel('butterflyfish').id, 'butterfly_fish');
  assert.equal(getSpeciesModel('grouper').id, 'coral_grouper');
  assert.equal(getSpeciesModel('moorishIdol').id, 'moorish_idol');
  assert.equal(getSpeciesModel('tuna').id, 'tuna');
  assert.equal(getSpeciesModel('shark').id, 'shark');
  assert.equal(getSpeciesModel('mola').id, 'sunfish');
  assert.equal(getSpeciesModel('dolphin').id, 'dolphin_rigged');
  assert.equal(getSpeciesModel('jellyfish').id, 'jellyfish');
  assert.equal(getSpeciesModel('seal').id, 'seal');
  assert.equal(getSpeciesModel('spermWhale').id, 'whale');
  assert.equal(Object.keys(SPECIES_MODEL_MAP).length, 15);
});

test('species without an appropriate animated model remain explicitly disabled', () => {
  for (const species of ['crab','lobster','mantis','eel','manta','stingray','orca','starfish','turtle','sandEel','angelfish','barracuda','wobbegong','marlin','whaleShark']) {
    assert.equal(getSpeciesModel(species), null, species + ' must not be silently mapped to an unrelated model');
    assert.ok(SPECIES_WITHOUT_REVIEWED_MODEL.includes(species));
  }
  assert.equal(SPECIES_WITHOUT_REVIEWED_MODEL.length, 15);
});
