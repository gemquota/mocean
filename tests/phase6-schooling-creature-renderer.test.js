import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMATED_MODEL_SPECIES, filterToAnimatedSpecies } from '../src/phase6/animated-species-filter.js';

test('only species with rigged or procedural animated models remain eligible', () => {
  assert.deepEqual(ANIMATED_MODEL_SPECIES, ['fish', 'schoolFish', 'clownfish', 'parrotfish', 'blueTang', 'butterflyfish', 'grouper', 'moorishIdol', 'tuna', 'shark', 'mola', 'dolphin', 'jellyfish', 'seal', 'spermWhale']);
});

test('unsupported and static-only species are suppressed and supported weights renormalise', () => {
  const result = filterToAnimatedSpecies({ fish: 20, schoolFish: 20, parrotfish: 10, manta: 50, orca: 0 });
  assert.equal(result.manta, 0);
  assert.equal(result.orca, 0);
  assert.equal(result.fish + result.schoolFish + result.parrotfish, 100);
});

test('empty supported population falls back to regular fish', () => {
  const result = filterToAnimatedSpecies({ fish: 0, schoolFish: 0, manta: 100 });
  assert.equal(result.fish, 100);
  assert.equal(result.schoolFish, 0);
  assert.equal(result.manta, 0);
});
