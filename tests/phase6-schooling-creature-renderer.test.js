import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMATED_MODEL_SPECIES, filterToAnimatedSpecies } from '../src/phase6/animated-species-filter.js';

test('only species with naturalistic models and procedural swimming remain eligible', () => {
  assert.deepEqual(ANIMATED_MODEL_SPECIES, ['barracuda','marlin','tuna','shark','whaleShark','mola','manta','stingray','orca','spermWhale','dolphin','jellyfish','turtle']);
});

test('unsupported species are suppressed and supported weights renormalise', () => {
  const result = filterToAnimatedSpecies({ tuna: 20, barracuda: 20, marlin: 10, clownfish: 50, orca: 0 });
  assert.equal(result.clownfish,0);
  assert.equal(result.tuna+result.barracuda+result.marlin,100);
});

test('empty supported population falls back to the first reviewed naturalistic species', () => {
  const result = filterToAnimatedSpecies({ tuna: 0, barracuda: 0, clownfish: 100 });
  assert.equal(result.barracuda,100);
  assert.equal(result.tuna,0);
  assert.equal(result.clownfish,0);
});
