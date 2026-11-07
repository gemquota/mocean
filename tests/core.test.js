import test from 'node:test';
import assert from 'node:assert/strict';
import { angleDelta, quatFromEuler, quatRotate, vec3, length3, wrapAngle } from '../src/core/math.js';
import { stepDynamics } from '../src/core/dynamics.js';

test('angle wrapping chooses the shortest signed rotation', () => {
  assert.ok(Math.abs(angleDelta(3.1, -3.1)) < 0.1);
  assert.ok(wrapAngle(5 * Math.PI) <= Math.PI);
});
test('identity orientation preserves a vector', () => {
  const v = vec3(1, 2, 3);
  const out = quatRotate(quatFromEuler(0, 0, 0), v);
  assert.deepEqual(out, v);
});
test('yaw rotates body-forward thrust into world space', () => {
  const out = quatRotate(quatFromEuler(Math.PI / 2, 0, 0), vec3(1, 0, 0));
  assert.ok(Math.abs(out.y - 1) < 1e-10);
  assert.ok(Math.abs(out.x) < 1e-10);
});
test('dynamics preserves finite values and accelerates under forward thrust', () => {
  const body = { p: vec3(), vel: vec3(), yaw: 0, pitch: 0, roll: 0, wy: 0, wp: 0, wr: 0 };
  stepDynamics(body, { thrust: 1, side: 0, lift: 0, turn: 0, pitch: 0 }, 1 / 120);
  assert.ok(body.vel.x > 0);
  assert.ok(Number.isFinite(length3(body.vel)));
  assert.ok(Number.isFinite(body.p.x));
});
test('drag reduces speed when no thrust is applied', () => {
  const body = { p: vec3(), vel: vec3(2, 0, 0), yaw: 0, pitch: 0, roll: 0, wy: 0, wp: 0, wr: 0 };
  const before = length3(body.vel);
  stepDynamics(body, { thrust: 0, side: 0, lift: 0, turn: 0, pitch: 0 }, 1 / 60);
  assert.ok(length3(body.vel) < before);
});
