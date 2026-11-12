import test from 'node:test';
import assert from 'node:assert/strict';
import { HABITAT_BIOMES, classifyHabitatBiome } from '../src/phase6/biomes.js';

test('habitat defines distinct coral, kelp, seagrass, sponge and rocky biomes', () => {
  assert.deepEqual(HABITAT_BIOMES.map(biome => biome.id), [
    'coral-reef', 'kelp-forest', 'seagrass-meadow', 'sponge-garden', 'rocky-ravine'
  ]);
  assert.equal(classifyHabitatBiome(-17, -13), 'coral-reef');
  assert.equal(classifyHabitatBiome(-29, -21), 'kelp-forest');
  assert.equal(classifyHabitatBiome(28, 21), 'seagrass-meadow');
  assert.equal(classifyHabitatBiome(15, -8), 'sponge-garden');
  assert.equal(classifyHabitatBiome(0, 0, { normalY: 0.2 }), 'rocky-ravine');
});

test('biome classification handles depth, boundaries and invalid coordinates deterministically', () => {
  assert.equal(classifyHabitatBiome(0, 0, { y: -11 }), 'sponge-garden');
  assert.equal(classifyHabitatBiome(80, 80), 'seagrass-meadow');
  assert.equal(classifyHabitatBiome(NaN, 0), 'open-sand');
  assert.equal(classifyHabitatBiome(-17, -13), classifyHabitatBiome(-17, -13));
});
