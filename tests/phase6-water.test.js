import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateWaterParticles,
  waterColorAtDistance,
  waterTransmittance
} from '../src/phase6/water.js';

test('water transmittance is finite, bounded and decreases with distance', () => {
  const near = waterTransmittance(5);
  const far = waterTransmittance(40);
  for (const channel of ['red', 'green', 'blue']) {
    assert.ok(near[channel] > far[channel]);
    assert.ok(near[channel] <= 1 && near[channel] >= 0);
    assert.ok(far[channel] <= 1 && far[channel] >= 0);
  }
  assert.ok(far.red < far.green);
  assert.ok(far.green < far.blue);
});

test('water colour tends towards blue-green scattering with distance', () => {
  const near = waterColorAtDistance(0);
  const far = waterColorAtDistance(80);
  assert.ok(far.red < near.red);
  assert.ok(far.green < near.green);
  assert.ok(far.blue > near.blue);
  for (const value of Object.values(far)) assert.ok(value >= 0 && value <= 1);
});

test('water attenuation rejects invalid distances and coefficients', () => {
  assert.throws(() => waterTransmittance(-1), RangeError);
  assert.throws(() => waterTransmittance(Infinity), RangeError);
  assert.throws(() => waterTransmittance(1, { red: -1, green: 0.1, blue: 0.1 }), RangeError);
  assert.throws(() => waterColorAtDistance(1, { red: NaN, green: 0, blue: 0 }), TypeError);
});

test('suspended particle field is deterministic and bounded', () => {
  const options = {
    seed: 7, count: 180,
    bounds: { minX: -10, maxX: 10, minY: -3, maxY: 7, minZ: -5, maxZ: 5 }
  };
  const a = generateWaterParticles(options);
  const b = generateWaterParticles(options);
  assert.deepEqual(a, b);
  assert.equal(a.length, 180);
  for (const particle of a) {
    assert.ok(particle.x >= -10 && particle.x <= 10);
    assert.ok(particle.y >= -3 && particle.y <= 7);
    assert.ok(particle.z >= -5 && particle.z <= 5);
    assert.ok(particle.speed > 0 && particle.amplitude > 0 && particle.size > 0);
  }
});

test('particle generator validates count and bounds', () => {
  assert.throws(() => generateWaterParticles({ count: -1 }), RangeError);
  assert.throws(() => generateWaterParticles({
    bounds: { minX: 1, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 1 }
  }), RangeError);
});
