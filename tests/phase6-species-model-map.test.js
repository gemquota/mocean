import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpeciesModel, SPECIES_MODEL_MAP, SPECIES_WITHOUT_REVIEWED_MODEL } from '../src/phase6/species-model-map.js';

test('enabled species map only to species-exact naturalistic CC0 GLBs', () => {
  const expected = {
    barracuda: ['barracuda','5875'],
    marlin: ['blue_marlin','5873'],
    tuna: ['bluefin_tuna','5870'],
    shark: ['great_white_shark','5867'],
    whaleShark: ['whale_shark','5864'],
    mola: ['ocean_sunfish','5866'],
    manta: ['manta_ray','5878'],
    stingray: ['southern_stingray','5877'],
    orca: ['orca','5861'],
    spermWhale: ['sperm_whale','5860'],
    dolphin: ['bottlenose_dolphin','39330'],
    jellyfish: ['moon_jellyfish','5889'],
    turtle: ['loggerhead_turtle','39340']
  };
  assert.deepEqual(Object.keys(SPECIES_MODEL_MAP), Object.keys(expected));
  for (const [species,[id,assetId]] of Object.entries(expected)) {
    assert.equal(getSpeciesModel(species).id,id);
    assert.equal(getSpeciesModel(species).assetId,assetId);
    assert.equal(getSpeciesModel(species).collection,'naturalistic');
  }
  assert.equal(getSpeciesModel('turtle').motion,'wing-wave');
  assert.equal(Object.keys(SPECIES_MODEL_MAP).length,13);
});

test('species without an appropriate naturalistic model remain explicitly disabled', () => {
  for (const species of ['fish','schoolFish','clownfish','parrotfish','blueTang','angelfish','butterflyfish','grouper','moorishIdol','wobbegong','eel','crab','lobster','mantis','seal','starfish','sandEel']) {
    assert.equal(getSpeciesModel(species),null,species+' must not be silently mapped to an unrelated model');
    assert.ok(SPECIES_WITHOUT_REVIEWED_MODEL.includes(species));
  }
  assert.equal(SPECIES_WITHOUT_REVIEWED_MODEL.length,17);
});
