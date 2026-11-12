import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveModelEntry } from '../src/phase6/creature-model-bank.js';

const catalogues = {
  animated: { species: [{ id: 'parrot_fish', file: 'parrot_fish.glb', name: 'Parrot Fish' }] },
  static: { species: [{ id: '5878', file: '5878.glb', name: 'Manta Ray' }] },
  polyfish: { id: 'polyfish-rigged', file: 'fish_rigged.glb', name: 'PolyFish' }
};

test('model bank resolves only exact reviewed species assets', () => {
  assert.equal(resolveModelEntry('parrotfish', catalogues).file, 'parrot_fish.glb');
  assert.equal(resolveModelEntry('manta', catalogues).file, '5878.glb');
  assert.equal(resolveModelEntry('fish', catalogues).file, 'fish_rigged.glb');
  assert.equal(resolveModelEntry('crab', catalogues), null);
});

test('model bank refuses to substitute a similarly named but absent asset', () => {
  assert.equal(resolveModelEntry('grouper', { ...catalogues, animated: { species: [] } }), null);
});
