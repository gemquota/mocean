import test from 'node:test';
import assert from 'node:assert/strict';
import { angleDelta, quatFromEuler, quatRotate, vec3, length3, wrapAngle, quatIntegrateAngularVelocity, perspectiveScale, distanceTreatment, habitatReturnGuidance } from '../src/core/math.js';
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
test('yaw rotates body-forward thrust around the world-up axis', () => {
  const out = quatRotate(quatFromEuler(Math.PI / 2, 0, 0), vec3(1, 0, 0));
  assert.ok(Math.abs(out.z + 1) < 1e-10);
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
  let headMax = 0, tailMax = 0;
  for (let i = 0; i < 1200; i++) {
    stepGait(gait, 'CRUISE', 0.5, 0, 1 / 120);
    headMax = Math.max(headMax, Math.abs(deformPoint(vec3(0.9, 0, 0), gait).z));
    tailMax = Math.max(tailMax, Math.abs(deformPoint(vec3(-1.15, 0, 0), gait).z));
  }
  assert.ok(tailMax > headMax + 0.025);
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
  assert.ok(a.slip < b.slip);
  assert.ok(a.thrust > 0 && b.thrust > 0);
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


test('sustained steering produces a visible whole-body turn', () => {
  const body = { p: vec3(), vel: vec3(1,0,0), yaw: 0, pitch: 0, roll: 0, wy: 0, wp: 0, wr: 0 };
  for (let i = 0; i < 240; i++) stepDynamics(body, { thrust: 0, turn: 1, pitch: 0 }, 1 / 120);
  assert.ok(body.yaw > 1.1, 'yaw should exceed a barely-visible twitch');
});

test('strong steering recruits a smooth bend through the rear spine', () => {
  const gait = createGait();
  for (let i = 0; i < 480; i++) stepGait(gait, 'TURN', 0.8, 1, 1 / 120);
  const head = deformPoint(vec3(0.8, 0, 0), gait);
  const rear = deformPoint(vec3(-1.45, 0, 0), gait);
  assert.ok(Math.abs(rear.z - head.z) > 0.18);
  assert.ok(gait.spine.every(node => Number.isFinite(node.y)));
});

test('caudal fin attachment points follow the same continuous spine deformation', () => {
  const gait = createGait();
  for (let i = 0; i < 360; i++) stepGait(gait, 'TURN', 0.7, -0.9, 1 / 120);
  const bodyEnd = deformPoint(vec3(-1.48, 0, 0), gait);
  const finRoot = deformPoint(vec3(-1.55, 0, 0), gait);
  assert.ok(Math.hypot(finRoot.x - bodyEnd.x, finRoot.z - bodyEnd.z) < 0.1);
});


test('quaternion attitude integration remains normalized through compound 3D rotation', () => {
  let q = quatFromEuler(0.4, -0.3, 0.2);
  for (let i = 0; i < 2400; i++) q = quatIntegrateAngularVelocity(q, vec3(0.7, -0.4, 1.1), 1 / 120);
  const norm = Math.hypot(q.w, q.x, q.y, q.z);
  assert.ok(Math.abs(norm - 1) < 1e-10);
  const forward = quatRotate(q, vec3(1, 0, 0));
  const up = quatRotate(q, vec3(0, 1, 0));
  assert.ok(Math.abs(length3(forward) - 1) < 1e-10);
  assert.ok(Math.abs(length3(up) - 1) < 1e-10);
  assert.ok(Math.abs(forward.x * up.x + forward.y * up.y + forward.z * up.z) < 1e-10);
});

test('world-vertical lift is independent of body pitch', () => {
  const a = { p: vec3(), vel: vec3(), yaw: 0, pitch: 0, roll: 0, wy: 0, wp: 0, wr: 0 };
  const b = { ...a, p: vec3(), vel: vec3(), orientation: quatFromEuler(0, Math.PI / 3, 0) };
  stepDynamics(a, { lift: 1 }, 1 / 120);
  stepDynamics(b, { lift: 1 }, 1 / 120);
  assert.ok(Math.abs(a.vel.y - b.vel.y) < 1e-12);
});

test('torque-only input changes attitude without directly creating translation', () => {
  const body = { p: vec3(), vel: vec3(), yaw: 0, pitch: 0, roll: 0, wy: 0, wp: 0, wr: 0 };
  stepDynamics(body, { turn: 1 }, 1 / 60);
  assert.ok(Math.abs(body.vel.x) < 1e-12);
  assert.ok(Math.abs(body.vel.y) < 1e-12);
  assert.ok(Math.abs(body.vel.z) < 1e-12);
  assert.ok(Math.abs(body.orientation.y) > 0);
});


test('body-forward thrust follows arbitrary attitude while lift remains world vertical', () => {
  const pitched = { p: vec3(), vel: vec3(), yaw: 0, pitch: -Math.PI / 4, roll: 0, wy: 0, wp: 0, wr: 0, orientation: quatFromEuler(0, -Math.PI / 4, 0) };
  stepDynamics(pitched, { thrust: 1 }, 1 / 120);
  assert.ok(pitched.vel.x > 0);
  assert.ok(pitched.vel.y < 0);

  const lateral = { p: vec3(), vel: vec3(), yaw: 0, pitch: 0, roll: 0, wy: 0, wp: 0, wr: 0 };
  stepDynamics(lateral, { side: 1 }, 1 / 120);
  assert.ok(lateral.vel.z > 0);

  const reverse = { p: vec3(), vel: vec3(), yaw: 0, pitch: 0, roll: 0, wy: 0, wp: 0, wr: 0 };
  stepDynamics(reverse, { thrust: -1 }, 1 / 120);
  assert.ok(reverse.vel.x < 0);
});


test('world-up yaw remains a world-axis rotation when the fish is pitched', () => {
  const pitched = quatFromEuler(0, Math.PI / 3, 0);
  const body = { p: vec3(), vel: vec3(), yaw: 0, pitch: 0, roll: 0, wy: 1, wp: 0, wr: 0, orientation: pitched };
  const dt = 1e-3;
  stepDynamics(body, {}, dt);
  const up = quatRotate(body.orientation, vec3(0, 1, 0));
  // A world-Y rotation preserves the world-Y component of every rotated vector.
  const originalUp = quatRotate(pitched, vec3(0, 1, 0));
  assert.ok(Math.abs(up.y - originalUp.y) < 1e-8);
});

test('perspective scale decreases in direct proportion to camera depth', () => {
  const near = perspectiveScale(800, 8);
  const far = perspectiveScale(800, 16);
  assert.equal(far, near / 2);
  assert.equal(perspectiveScale(800, 0), 800 / 0.3);
});

test('distance blur and fade remain absent until apparent size falls below one quarter', () => {
  assert.deepEqual(distanceTreatment(1), { blur: 0, opacity: 1 });
  assert.deepEqual(distanceTreatment(0.25), { blur: 0, opacity: 1 });
  const far = distanceTreatment(0.125);
  assert.ok(far.blur > 0 && far.blur <= 1.8);
  assert.ok(far.opacity < 1 && far.opacity >= 0.78);
  assert.deepEqual(distanceTreatment(0), { blur: 1.8, opacity: 0.78 });
});

test('habitat return guidance is inactive inside the soft boundary', () => {
  const guidance = habitatReturnGuidance(vec3(1, 0.5, -1), vec3(6.4, 3.5, 5.2));
  assert.equal(guidance.weight, 0);
  assert.equal(guidance.thrust, 0);
});

test('habitat return guidance points back toward the centre in horizontal and vertical axes', () => {
  const right = habitatReturnGuidance(vec3(8, 0, 0), vec3(6.4, 3.5, 5.2));
  assert.ok(right.weight > 0 && right.thrust > 0);
  assert.ok(Math.abs(Math.abs(right.yaw) - Math.PI) < 1e-9);
  const high = habitatReturnGuidance(vec3(0, 5, 0), vec3(6.4, 3.5, 5.2));
  assert.ok(high.pitch < 0);
  const low = habitatReturnGuidance(vec3(0, -5, 0), vec3(6.4, 3.5, 5.2));
  assert.ok(low.pitch > 0);
  const deep = habitatReturnGuidance(vec3(0, 0, -7), vec3(6.4, 3.5, 5.2));
  assert.ok(Math.abs(deep.yaw + Math.PI / 2) < 1e-9);
  assert.ok(deep.thrust > 0);
});

import { INITIAL_SPAWN_POSITION } from '../src/core/spawn.js';

test('initial spawn starts farther from the fixed camera with a comfortable framing margin', () => {
  const camera = vec3(0, 2.15, 10);
  const target = vec3();
  const forward = vec3(target.x-camera.x, target.y-camera.y, target.z-camera.z);
  const cameraLength = length3(forward);
  const unitForward = vec3(forward.x/cameraLength, forward.y/cameraLength, forward.z/cameraLength);
  const depthAtOrigin = cameraLength;
  const rel = vec3(INITIAL_SPAWN_POSITION.x-camera.x, INITIAL_SPAWN_POSITION.y-camera.y, INITIAL_SPAWN_POSITION.z-camera.z);
  const depthAtSpawn = rel.x*unitForward.x + rel.y*unitForward.y + rel.z*unitForward.z;
  assert.ok(depthAtSpawn > depthAtOrigin + 2.5, 'spawn should begin farther from the camera');
  assert.ok(perspectiveScale(1, depthAtSpawn) < perspectiveScale(1, depthAtOrigin) * 0.82,
    'initial apparent scale should be meaningfully smaller');
  const habitatRadius = Math.hypot(INITIAL_SPAWN_POSITION.x/6.4, INITIAL_SPAWN_POSITION.y/3.5, INITIAL_SPAWN_POSITION.z/5.2);
  assert.ok(habitatRadius < 0.88, 'spawn must remain inside the inactive region of the soft habitat boundary');
});

import { sampleHorizontalHeading, shouldMakeVerticalExcursion } from '../src/core/intent.js';

test('autonomous horizontal heading samples cover X and Z symmetrically', () => {
  let seed = 91357;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const quadrants = [0, 0, 0, 0];
  let meanX = 0, meanZ = 0;
  const count = 8000;
  for (let i = 0; i < count; i++) {
    const heading = sampleHorizontalHeading(random);
    assert.ok(heading >= -Math.PI && heading <= Math.PI);
    meanX += Math.cos(heading);
    meanZ += Math.sin(heading);
    quadrants[Math.min(3, Math.floor((heading + Math.PI) / (Math.PI / 2)))]++;
  }
  assert.ok(Math.abs(meanX / count) < 0.025);
  assert.ok(Math.abs(meanZ / count) < 0.025);
  for (const occupancy of quadrants) assert.ok(Math.abs(occupancy / count - 0.25) < 0.025);
});

test('vertical excursions are selected occasionally rather than continuously', () => {
  let seed = 27183;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  let excursions = 0;
  const count = 10000;
  for (let i = 0; i < count; i++) if (shouldMakeVerticalExcursion(random)) excursions++;
  assert.ok(excursions / count > 0.18 && excursions / count < 0.22);
});

import { createManeuver, sampleManeuver } from '../src/core/maneuver.js';

test('Bezier path starts and ends at its intended positions and headings', () => {
  const start = vec3(1, 0, -2), forward = vec3(1, 0, 0), finish = vec3(0.6, 0.5, -0.62);
  const path = createManeuver({ start, startDirection: forward, endDirection: finish, distance: 4, duration: 4, curve: 0.4 });
  const a = sampleManeuver(path, 0), b = sampleManeuver(path, 4);
  assert.ok(Math.hypot(a.position.x-start.x,a.position.y-start.y,a.position.z-start.z) < 1e-10);
  assert.ok(Math.hypot(a.tangent.x-forward.x,a.tangent.y-forward.y,a.tangent.z-forward.z) < 1e-10);
  assert.ok(Math.hypot(b.tangent.x-finish.x/length3(finish),b.tangent.y-finish.y/length3(finish),b.tangent.z-finish.z/length3(finish)) < 1e-10);
  assert.equal(b.complete, true);
});

test('spatial Bezier manoeuvre bends smoothly and changes propulsion effort gradually', () => {
  const path = createManeuver({ start: vec3(), startDirection: vec3(1,0,0), endDirection: vec3(0.7,0.25,-0.66), distance: 4, duration: 5, curve: -0.5, speedPeak: 1.3 });
  let previous = sampleManeuver(path, 0), peakSpeed = previous.speed, maxStep = 0;
  for (let i = 1; i <= 500; i++) {
    const current = sampleManeuver(path, i / 100);
    const positionStep = length3(vec3(current.position.x-previous.position.x,current.position.y-previous.position.y,current.position.z-previous.position.z));
    const tangentStep = length3(vec3(current.tangent.x-previous.tangent.x,current.tangent.y-previous.tangent.y,current.tangent.z-previous.tangent.z));
    assert.ok(positionStep < 0.06);
    assert.ok(tangentStep < 0.04);
    assert.ok(Math.abs(current.speed-previous.speed) < 0.02);
    maxStep = Math.max(maxStep, positionStep);
    peakSpeed = Math.max(peakSpeed, current.speed);
    previous = current;
  }
  assert.ok(peakSpeed > 1.25);
  assert.ok(maxStep > 0);
  assert.ok(sampleManeuver(path, 5).speed === 1);
});

test('Bezier paths support level, upward and downward trajectories', () => {
  const start = vec3();
  const level = sampleManeuver(createManeuver({ start, startDirection: vec3(1,0,0), endDirection: vec3(1,0,0), distance: 3, duration: 3 }), 3);
  const up = sampleManeuver(createManeuver({ start, startDirection: vec3(1,0,0), endDirection: vec3(0.7,0.7,0), distance: 3, duration: 3 }), 3);
  const down = sampleManeuver(createManeuver({ start, startDirection: vec3(1,0,0), endDirection: vec3(0.7,-0.7,0), distance: 3, duration: 3 }), 3);
  assert.ok(Math.abs(level.tangent.y) < 1e-10);
  assert.ok(up.tangent.y > 0.6);
  assert.ok(down.tangent.y < -0.6);
});


import { createFixedCamera, CAMERA_ELEVATION_DEGREES, CAMERA_DISTANCE } from '../src/core/camera.js';

test('fixed camera looks down into the habitat at a restrained 22-degree elevation', () => {
  const camera = createFixedCamera();
  const angle = Math.atan2(camera.p.y - camera.target.y, camera.p.z - camera.target.z) * 180 / Math.PI;
  assert.equal(CAMERA_ELEVATION_DEGREES, 22);
  assert.equal(CAMERA_DISTANCE, 13);
  assert.ok(Math.abs(angle - 22) < 1e-10);
  assert.ok(camera.forward.y < 0, 'camera viewing direction must point downward');
  assert.ok(Math.abs(length3(camera.forward) - 1) < 1e-10);
});

test('attitude dynamics produce clearly visible nose-up and nose-down pitch', () => {
  for (const direction of [1, -1]) {
    const body = { p: vec3(), vel: vec3(), yaw: 0, pitch: 0, roll: 0, wy: 0, wp: 0, wr: 0 };
    for (let i = 0; i < 360; i++) {
      stepDynamics(body, { pitch: direction * 0.85 }, 1 / 120);
    }
    const forward = quatRotate(body.orientation, vec3(1, 0, 0));
    assert.ok(direction * body.pitch > 0.45, 'pitch telemetry should show a deliberate vertical turn');
    assert.ok(direction * forward.y > 0.4, 'body-forward axis should visibly point up or down');
  }
});


test('vertical excursion frequency follows the configured manoeuvre probability', () => {
  let seed = 73191;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  let excursions = 0;
  const count = 10000;
  for (let i = 0; i < count; i++) if (shouldMakeVerticalExcursion(random, 0.35)) excursions++;
  assert.ok(excursions / count > 0.33 && excursions / count < 0.37);
});

test('straight swimming accelerates, coasts under drag, and actively brakes without reverse thrust', () => {
  const body = { p: vec3(), vel: vec3(), yaw: 0, pitch: 0, roll: 0, wy: 0, wp: 0, wr: 0 };
  const dt = 1 / 120;
  for (let i = 0; i < 240; i++) stepDynamics(body, { thrust: 0.8 }, dt);
  const accelerated = length3(body.vel);
  assert.ok(accelerated > 0.5);
  for (let i = 0; i < 240; i++) stepDynamics(body, {}, dt);
  const coasted = length3(body.vel);
  assert.ok(coasted > 0 && coasted < accelerated);
  for (let i = 0; i < 240; i++) stepDynamics(body, { brake: 1 }, dt);
  const braked = length3(body.vel);
  assert.ok(braked < coasted * 0.55);
  assert.ok(body.vel.x > 0, 'braking drag must not become reverse thrust');
});

test('braking input is bounded and cannot inject energy', () => {
  const low = { p: vec3(), vel: vec3(1, 0, 0), yaw: 0, pitch: 0, roll: 0, wy: 0, wp: 0, wr: 0 };
  const high = structuredClone(low);
  stepDynamics(low, { brake: 1 }, 1 / 60);
  stepDynamics(high, { brake: 8 }, 1 / 60);
  assert.ok(length3(high.vel) <= length3(low.vel) + 1e-12);
  assert.ok(length3(low.vel) < 1);
});


import { alternateVerticalDirection } from '../src/core/intent.js';

test('successive vertical manoeuvres alternate between dives and climbs', () => {
  let direction = 1;
  const sequence = [];
  for (let i = 0; i < 6; i++) {
    direction = alternateVerticalDirection(direction);
    sequence.push(direction);
  }
  assert.deepEqual(sequence, [-1, 1, -1, 1, -1, 1]);
});

test('braking intent deploys both pectoral fins symmetrically and returns bounded drag command', () => {
  const gait = createGait();
  let output;
  for (let i = 0; i < 180; i++) output = stepGait(gait, 'CRUISE', 1.2, 0, 1 / 120, 1);
  assert.ok(gait.brake > 0.99);
  assert.ok(Math.abs(gait.leftFin - gait.rightFin) < 1e-9);
  assert.ok(gait.leftFin > 0.65 && gait.rightFin > 0.65);
  assert.equal(output.brake, gait.brake);
  assert.ok(output.brake <= 1);
});

test('pitch primitive is bidirectional, bounded, and independent of translation and yaw', () => {
  const run = pitch => {
    const body = { p: vec3(), vel: vec3(), yaw: 0, pitch: 0, roll: 0, wy: 0, wp: 0, wr: 0 };
    for (let i = 0; i < 360; i++) stepDynamics(body, { pitch }, 1 / 120);
    return body;
  };
  const up = run(1), down = run(-1), excessive = run(9);
  assert.ok(up.wp > 0 && down.wp < 0);
  assert.ok(up.orientation.z > 0 && down.orientation.z < 0);
  assert.ok(Math.abs(up.vel.x) < 1e-12 && Math.abs(up.vel.y) < 1e-12 && Math.abs(up.vel.z) < 1e-12);
  assert.ok(Math.abs(up.wy) < 1e-12 && Math.abs(up.wr) < 1e-12);
  assert.ok(Math.abs(excessive.pitch - up.pitch) < 1e-10, 'pitch command must saturate at its defined bound');
});

test('yaw primitive has bounded angular drive even with excessive moment input', () => {
  const normal = { p: vec3(), vel: vec3(), yaw: 0, pitch: 0, roll: 0, wy: 0, wp: 0, wr: 0 };
  const excessive = structuredClone(normal);
  stepDynamics(normal, { turn: 1, yawMoment: 0.35 }, 1 / 120);
  stepDynamics(excessive, { turn: 1, yawMoment: 30 }, 1 / 120);
  assert.ok(Math.abs(excessive.wy - normal.wy) < 1e-12);
  assert.ok(Math.abs(excessive.wp) < 1e-12 && Math.abs(excessive.wr) < 1e-12);
  assert.ok(Math.abs(excessive.vel.x) < 1e-12 && Math.abs(excessive.vel.z) < 1e-12);
});

test('axial roll primitive rotates around local head-to-tail axis without pitch yaw or translation', () => {
  const body = { p: vec3(), vel: vec3(), yaw: 0, pitch: 0, roll: 0, wy: 0, wp: 0, wr: 0 };
  for (let i = 0; i < 360; i++) stepDynamics(body, { roll: 1 }, 1 / 120);
  const forward = quatRotate(body.orientation, vec3(1, 0, 0));
  const dorsal = quatRotate(body.orientation, vec3(0, 1, 0));
  assert.ok(body.wr > 0 && body.roll > 0);
  assert.ok(Math.abs(forward.x - 1) < 1e-6 && Math.abs(forward.y) < 1e-6 && Math.abs(forward.z) < 1e-6);
  assert.ok(Math.abs(dorsal.y) < 0.95, 'dorsal axis should rotate around the longitudinal axis');
  assert.ok(Math.abs(body.wy) < 1e-12 && Math.abs(body.wp) < 1e-12);
  assert.ok(Math.abs(body.vel.x) < 1e-12 && Math.abs(body.vel.y) < 1e-12 && Math.abs(body.vel.z) < 1e-12);
});

test('axial roll command saturates and auxiliary roll moment remains bounded', () => {
  const normal = { p: vec3(), vel: vec3(), yaw: 0, pitch: 0, roll: 0, wy: 0, wp: 0, wr: 0 };
  const excessive = structuredClone(normal);
  stepDynamics(normal, { roll: 1, rollMoment: 0.35 }, 1 / 120);
  stepDynamics(excessive, { roll: 9, rollMoment: 30 }, 1 / 120);
  assert.ok(Math.abs(excessive.wr - normal.wr) < 1e-12);
});


import { screenRay, intersectHorizontalPlane, projectToWorldFloor, projectedScreenY, worldZAtScreenY, TARGET_PLANE_Y, WORLD_FLOOR_Y } from '../src/core/navigation.js';

test('screen-centre ray follows the fixed camera forward axis', () => {
  const camera = createFixedCamera();
  const ray = screenRay(camera, 500, 306, 1000, 600);
  assert.ok(Math.abs(ray.x - camera.forward.x) < 1e-12);
  assert.ok(Math.abs(ray.y - camera.forward.y) < 1e-12);
  assert.ok(Math.abs(ray.z - camera.forward.z) < 1e-12);
});

test('tap selects a mid-water point and floor projection preserves world X/Z', () => {
  const camera = createFixedCamera();
  const ray = screenRay(camera, 620, 340, 1000, 600);
  const target = intersectHorizontalPlane(camera, ray, TARGET_PLANE_Y);
  const floor = projectToWorldFloor(target, WORLD_FLOOR_Y);
  assert.ok(target && floor);
  assert.equal(target.y, TARGET_PLANE_Y);
  assert.equal(floor.y, WORLD_FLOOR_Y);
  assert.equal(floor.x, target.x);
  assert.equal(floor.z, target.z);
  assert.ok(target.y - floor.y > 3);
});

test('two-finger floor drag moves the handle along world Z and tracks screen Y exactly', () => {
  const camera = createFixedCamera();
  const ray = screenRay(camera, 620, 340, 1000, 600);
  const target = intersectHorizontalPlane(camera, ray, TARGET_PLANE_Y);
  const floor = projectToWorldFloor(target);
  const startY = projectedScreenY(camera, floor, 600, 1000);
  const fartherZ = worldZAtScreenY(camera, floor, startY - 35, 1000, 600);
  const closerZ = worldZAtScreenY(camera, floor, startY + 35, 1000, 600);
  assert.ok(fartherZ < floor.z, 'dragging up moves the handle farther along -Z');
  assert.ok(closerZ > floor.z, 'dragging down moves the handle closer along +Z');
  assert.ok(Math.abs(projectedScreenY(camera, { ...floor, z: fartherZ }, 600, 1000) - (startY - 35)) < 1e-8);
  assert.ok(Math.abs(projectedScreenY(camera, { ...floor, z: closerZ }, 600, 1000) - (startY + 35)) < 1e-8);
});


import { createDepthApproach, sampleDepthApproach, nearestDepthApproachProgress } from '../src/core/approach.js';

test('depth approach reaches destination Z at half arc length and stays level', () => {
 const start=vec3(-3,-1,4),target=vec3(5,2,-4),path=createDepthApproach(start,target);
 const quarter=sampleDepthApproach(path,.25),half=sampleDepthApproach(path,.5),threeQuarter=sampleDepthApproach(path,.75);
 assert.ok(quarter.position.z<start.z&&quarter.position.z>target.z);
 assert.ok(Math.abs(half.position.z-target.z)<1e-8);
 assert.ok(Math.abs(threeQuarter.position.z-target.z)<1e-8);
 assert.ok(Math.abs(half.tangent.z)<1e-6&&Math.abs(threeQuarter.tangent.z)<1e-6);
});

test('depth approach is smooth and nearest-path progress is monotonic', () => {
 const path=createDepthApproach(vec3(0,0,5),vec3(8,2,-3));let previous=sampleDepthApproach(path,0),progress=0;
 for(let i=1;i<=500;i++){const current=sampleDepthApproach(path,i/500);
  assert.ok(length3(vec3(current.position.x-previous.position.x,current.position.y-previous.position.y,current.position.z-previous.position.z))<.06);
  assert.ok(length3(vec3(current.tangent.x-previous.tangent.x,current.tangent.y-previous.tangent.y,current.tangent.z-previous.tangent.z))<.05);
  const next=nearestDepthApproachProgress(path,current.position,progress);assert.ok(next+1e-12>=progress);progress=next;previous=current;
 }
 assert.ok(progress>.99);
});


import { createPursuitGuidance } from '../src/core/pursuit.js';

test('pursuit turns the nose toward a target in horizontal and vertical directions', () => {
  const horizontal = createPursuitGuidance(vec3(), vec3(), 0, 0, vec3(0, 0, -5));
  assert.ok(horizontal.turn > 0.99);
  const upward = createPursuitGuidance(vec3(), vec3(), 0, 0, vec3(4, 3, 0));
  assert.ok(upward.pitch > 0);
  assert.ok(upward.turn === 0);
});

test('pursuit builds propulsion demand smoothly with target distance', () => {
  const near = createPursuitGuidance(vec3(), vec3(), 0, 0, vec3(1, 0, 0));
  const middle = createPursuitGuidance(vec3(), vec3(), 0, 0, vec3(4, 0, 0));
  const far = createPursuitGuidance(vec3(), vec3(), 0, 0, vec3(9, 0, 0));
  assert.ok(near.thrustScale < middle.thrustScale && middle.thrustScale < far.thrustScale);
  assert.ok(far.thrustScale <= 1.85);
});

test('pursuit brakes as it reaches the target and identifies a low-speed hover', () => {
  const approaching = createPursuitGuidance(vec3(), vec3(1, 0, 0), 0, 0, vec3(.5, 0, 0));
  const settled = createPursuitGuidance(vec3(), vec3(.08, 0, 0), 0, 0, vec3(.1, 0, 0));
  assert.ok(approaching.brake > 0);
  assert.equal(settled.hovering, true);
  assert.ok(settled.brake > 0);
});
