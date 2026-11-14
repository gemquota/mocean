import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANIMATED_MODEL_SPECIES, filterToAnimatedSpecies } from '../src/phase6/animated-species-filter.js';

test('only species with naturalistic models and procedural swimming remain eligible', () => {
  assert.deepEqual(ANIMATED_MODEL_SPECIES, ['barracuda','marlin','tuna','shark','whaleShark','mola','manta','stingray','orca','spermWhale','dolphin','jellyfish','turtle','seahorse','seaDragon','anglerfish']);
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

test('model-only habitat never draws a 2D fallback for any creature', () => {
  const html = readFileSync(new URL('../schooling.html', import.meta.url), 'utf8');
  const drawFish = html.match(/function drawFish\(fish\)\{([\s\S]*?)\n\}/);
  assert.ok(drawFish, 'creature draw dispatcher exists');
  assert.match(drawFish[1], /^\s*\/\/ All creatures are drawn by the Three\.js model layer\.[\s\S]*?\n return;/);
  assert.equal(drawFish[1].trimStart().split('\n').at(-1), '}', 'Canvas dispatcher must not regain a reachable fallback path');
});
