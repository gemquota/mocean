import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const renderer = readFileSync(new URL('../src/phase6/instanced-marine-school-renderer.js', import.meta.url), 'utf8');
const swim = readFileSync(new URL('../src/phase6/polyfish-swim-material.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../schooling.html', import.meta.url), 'utf8');

test('marine school batches share model geometry through InstancedMesh', () => {
  assert.match(renderer, /new this\.THREE\.InstancedMesh\(geometry, material, this\.capacity\)/);
  assert.match(renderer, /const gltf = await this\.load\(mapping\.id\)/);
  assert.match(renderer, /this\.batches\.set\(species, batch\)/);
  assert.match(renderer, /geometry\.clone\(\)/);
  assert.doesNotMatch(renderer, /createInstance\(fish/);
});

test('each instance carries its own travelling-wave phase and amplitude on the GPU', () => {
  assert.match(renderer, /new this\.THREE\.InstancedBufferAttribute\(phaseArray, 1\)/);
  assert.match(renderer, /new this\.THREE\.InstancedBufferAttribute\(amplitudeArray, 1\)/);
  assert.match(renderer, /phaseArray\[i\] = fish\._marinePhase/);
  assert.match(renderer, /amplitudeArray\[i\] = 1 \/ Math\.max\(0\.1, bodyScale\)/);
  assert.match(swim, /attribute float aSwimPhase/);
  assert.match(swim, /attribute float aSwimAmplitude/);
  assert.match(swim, /uAmplitude \* aSwimAmplitude \* amp/);
});

test('procedural animation advances independently of visibility', () => {
  assert.match(renderer, /export function advanceMarineAnimation\(fish, dt\)/);
  assert.match(html, /for\(const fish of school\.fish\)if\(advanceMarineAnimation\)advanceMarineAnimation\(fish,dt\)/);
});

test('habitat population and GPU batch capacity both support 1000 creatures', () => {
  assert.match(html, /id="population" type="range" min="10" max="1000"/);
  assert.match(html, /MAX_INSTANCED_MARINE_ENTITIES=1000/);
  assert.match(renderer, /capacity = 1000/);
  assert.doesNotMatch(html, /72 MODEL BUDGET/);
});
