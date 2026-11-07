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

import { createGait, stepGait, deformPoint } from '../src/core/body.js';

test('body undulation is minimal near the head and amplified at the tail', () => {
  const gait = createGait();
  gait.phase = Math.PI / 2;
  gait.amplitude = 0.3;
  const head = deformPoint(vec3(0.9, 0, 0), gait);
  const tail = deformPoint(vec3(-1.15, 0, 0), gait);
  assert.ok(Math.abs(tail.z) > Math.abs(head.z) + 0.025);
});
test('tail oscillation generates bounded forward propulsion', () => {
  const gait = createGait();
  let output;
  for (let i = 0; i < 120; i++) output = stepGait(gait, 'CRUISE', 0.5, 0, 1 / 120);
  assert.ok(output.thrust > 0);
  assert.ok(output.thrust <= 1.15);
  assert.ok(gait.frequency > 0);
});
test('burst swimming spends energy and recovery restores it', () => {
  const gait = createGait();
  for (let i = 0; i < 120; i++) stepGait(gait, 'DART', 0.5, 0, 1 / 120);
  const afterBurst = gait.energy;
  for (let i = 0; i < 120; i++) stepGait(gait, 'RECOVER', 0.2, 0, 1 / 120);
  assert.ok(afterBurst < 1);
  assert.ok(gait.energy > afterBurst);
});

test('flexible spine reorients the body cross-section without losing its finite shape', () => {
  const gait = createGait();
  gait.phase = Math.PI * 0.35;
  gait.amplitude = 0.32;
  const centre = deformPoint(vec3(-1.1, 0, 0), gait);
  const upper = deformPoint(vec3(-1.1, 0.2, 0), gait);
  const lateral = deformPoint(vec3(-1.1, 0, 0.2), gait);
  assert.ok(Number.isFinite(centre.x) && Number.isFinite(centre.z));
  assert.ok(Math.abs(upper.y - centre.y - 0.2) < 1e-9);
  assert.ok(Math.hypot(lateral.x - centre.x, lateral.z - centre.z) > 0.19);
});
test('pectoral fins deploy asymmetrically during a turn and retract in cruise', () => {
  const gait = createGait();
  for (let i = 0; i < 120; i++) stepGait(gait, 'TURN', 1, 0.8, 1 / 120);
  assert.ok(gait.leftFin > gait.rightFin);
  for (let i = 0; i < 240; i++) stepGait(gait, 'CRUISE', 0.5, 0, 1 / 120);
  assert.ok(gait.leftFin < 0.3 && gait.rightFin < 0.3);
});
test('fin drag and roll moments remain bounded and affect rotational dynamics', () => {
  const body = { p: vec3(), vel: vec3(1,0,0), yaw: 0, pitch: 0, roll: 0, wy: 0, wp: 0, wr: 0 };
  stepDynamics(body, { thrust: 0, turn: 0, pitch: 0, finDrag: 0.08, rollMoment: 0.2 }, 1 / 60);
  assert.ok(body.wr > 0);
  assert.ok(length3(body.vel) < 1);
});

test('distributed spine remains smooth and bounded during sustained swimming', () => {
  const gait = createGait();
  for (let i = 0; i < 1200; i++) stepGait(gait, 'CRUISE', 0.7, 0.1, 1 / 120);
  const ys = gait.spine.map(node => node.y);
  assert.ok(ys.every(Number.isFinite));
  assert.ok(Math.max(...ys.map(Math.abs)) <= 0.62);
  const slopes = ys.slice(1).map((y, i) => y - ys[i]);
  assert.ok(slopes.every(Number.isFinite));
  assert.ok(Math.max(...slopes.map(Math.abs)) < 0.2);
});
test('tail reaction thrust falls as forward slip increases', () => {
  const base = createGait();
  for (let i = 0; i < 300; i++) stepGait(base, 'CRUISE', 0.5, 0, 1 / 120);
  const slow = structuredClone(base), fast = structuredClone(base);
  const a = stepGait(slow, 'CRUISE', 0.1, 0, 1 / 120);
  const b = stepGait(fast, 'CRUISE', 2.4, 0, 1 / 120);
  assert.ok(a.thrust > b.thrust);
});
test('pectoral fin stroke and differential steering remain finite', () => {
  const gait = createGait();
  let output;
  for (let i = 0; i < 240; i++) output = stepGait(gait, 'TURN', 1.1, -0.7, 1 / 120);
  assert.ok(Number.isFinite(gait.leftFinAngle));
  assert.ok(Number.isFinite(gait.rightFinAngle));
  assert.ok(output.yawMoment < 0);
  assert.ok(Math.abs(output.finDrag) < 0.2);
});
