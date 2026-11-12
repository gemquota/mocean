import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMATED_MODEL_SPECIES, filterToAnimatedSpecies } from '../src/phase6/animated-species-filter.js';
import { SCHOOLING_SPECIES_PERCENTAGES } from '../src/schooling.js';

test('animated species list is derived from the exact model map', () => {
  assert.equal(ANIMATED_MODEL_SPECIES.length, 12);
  assert.deepEqual(new Set(ANIMATED_MODEL_SPECIES), new Set([
    'fish','schoolFish','clownfish','parrotfish','blueTang','butterflyfish',
    'grouper','moorishIdol','tuna','shark','mola','dolphin'
  ]));
});

test('initial population shares exclude every species without a reviewed animated model', () => {
  const filtered = filterToAnimatedSpecies(SCHOOLING_SPECIES_PERCENTAGES);
  const total = Object.values(filtered).reduce((sum, value) => sum + value, 0);
  assert.ok(Math.abs(total - 100) < 1e-9);
  for (const [species, value] of Object.entries(filtered)) {
    if (ANIMATED_MODEL_SPECIES.includes(species)) assert.ok(value > 0, species + ' should receive a population share');
    else assert.equal(value, 0, species + ' must remain disabled');
  }
});

test('population-share filtering renormalizes only supported species after edits', () => {
  const filtered = filterToAnimatedSpecies({ fish: 25, schoolFish: 25, dolphin: 50, eel: 100, crab: 100 });
  assert.equal(filtered.fish, 25);
  assert.equal(filtered.schoolFish, 25);
  assert.equal(filtered.dolphin, 50);
  assert.equal(filtered.eel, 0);
  assert.equal(filtered.crab, 0);
});
