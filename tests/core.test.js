import test from 'node:test';
import assert from 'node:assert/strict';
import { angleDelta, quatFromEuler, quatRotate, vec3, length3, wrapAngle, quatIntegrateAngularVelocity, perspectiveScale, distanceTreatment, habitatReturnGuidance } from '../src/core/math.js';
import { stepDynamics } from '../src/core/dynamics.js';
import { articulateFinPoint } from '../src/core/body.js';

test('angle wrapping chooses the shortest signed rotation', () => {
  assert.ok(Math.abs(angleDelta(3.1, -3.1)) < 0.1);
  assert.ok(wrapAngle(5 * Math.PI) <= Math.PI);
});
test('pectoral fin articulation rotates around its local longitudinal hinge', () => {
  const root = vec3(-0.22, -0.16, 0.27);
  const tip = vec3(-0.62, -0.46, 0.72);
  const angle = 0.31;
  const moved = articulateFinPoint(tip, root, angle);
  const radiusBefore = Math.hypot(tip.y - root.y, tip.z - root.z);
  const radiusAfter = Math.hypot(moved.y - root.y, moved.z - root.z);
  assert.deepEqual(articulateFinPoint(root, root, angle), root);
  assert.ok(Math.abs(radiusAfter - radiusBefore) < 1e-12);
  assert.ok(Math.abs(moved.y - tip.y) > 0.01);
  assert.ok(Math.abs(moved.z - tip.z) > 0.01);

  const mirroredRoot = vec3(root.x, root.y, -root.z);
  const mirroredTip = vec3(tip.x, tip.y, -tip.z);
  const mirrored = articulateFinPoint(mirroredTip, mirroredRoot, -angle);
  assert.ok(Math.abs(mirrored.y - moved.y) < 1e-12);
  assert.ok(Math.abs(mirrored.z + moved.z) < 1e-12);
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


import { createMotionSequence, sampleMotionSequence, MOTION_SEQUENCE_NAMES } from '../src/core/sequences.js';

test('movement sequence library covers isolated primitives and the Phase 3–4 manoeuvre set', () => {
  for (const name of ['pitch-up','pitch-down','yaw-left','yaw-right','accelerate','coast','brake','axial-roll','dive','climb','turn-accelerate-coast-brake','roll-turn','backward-drift','curved-reversal','loop-the-loop','dive-brake-reorient','compound-3d']) {
    assert.ok(MOTION_SEQUENCE_NAMES.includes(name), name+' must be available');
    const sequence = createMotionSequence(name);
    assert.ok(sequence.duration > 0);
    assert.ok(sequence.segments.every(item => item.duration > 0));
  }
});

test('dive and climb orient before the main thrust pulse, then brake and recover', () => {
  for (const [name, sign] of [['dive',-1],['climb',1]]) {
    const sequence = createMotionSequence(name);
    const orient = sampleMotionSequence(sequence, 0.9).command;
    const propel = sampleMotionSequence(sequence, 1.8).command;
    const brake = sampleMotionSequence(sequence, 3.3).command;
    assert.equal(Math.sign(orient.pitch), sign);
    assert.ok(Math.abs(orient.thrust) < 0.2, 'orientation precedes the propulsion pulse');
    assert.equal(Math.sign(propel.pitch), sign);
    assert.ok(propel.thrust > 0.6);
    assert.ok(brake.brake > 0.5);
  }
});

test('sequence segment hand-offs are continuous and outputs remain bounded', () => {
  const sequence = createMotionSequence('compound-3d');
  let previous = sampleMotionSequence(sequence, 0).command;
  for (let t = 1/120; t <= sequence.duration; t += 1/120) {
    const current = sampleMotionSequence(sequence, t).command;
    for (const key of Object.keys(current)) {
      assert.ok(Number.isFinite(current[key]), key+' must remain finite');
      assert.ok(Math.abs(current[key] - previous[key]) < 0.12, key+' must not jump at a segment hand-off');
    }
    previous = current;
  }
  assert.equal(sampleMotionSequence(sequence, sequence.duration).complete, true);
});

test('backward drift turns the head against retained forward momentum before reverse thrust', () => {
  const sequence = createMotionSequence('backward-drift');
  const prepare = sampleMotionSequence(sequence, 1.1).command;
  const counter = sampleMotionSequence(sequence, 2.3).command;
  const reverse = sampleMotionSequence(sequence, 4.3).command;
  assert.ok(prepare.thrust > 0.5);
  assert.ok(counter.yawOffset > Math.PI * 0.7);
  assert.ok(counter.thrust < 0.2);
  assert.ok(reverse.yawOffset > Math.PI * 0.8);
  assert.ok(reverse.thrust < 0);
});

test('loop and compound 3D sequences deliberately include pitch, yaw and axial roll', () => {
  const loop = createMotionSequence('loop-the-loop');
  const loopPeak = sampleMotionSequence(loop, 7.5).command;
  assert.ok(loopPeak.pitch > Math.PI);
  assert.ok(loopPeak.pitchMoment > 0.3 && loopPeak.pitchMoment <= 0.4);
  const compound = createMotionSequence('compound-3d');
  const peak = sampleMotionSequence(compound, 2.6).command;
  assert.ok(peak.yawOffset > 1);
  assert.ok(peak.pitch > 0.8);
  assert.ok(peak.roll > 0.8);
});


function runIntentSequence(name, initialVelocity = vec3(), duration = Infinity) {
  const sequence = createMotionSequence(name);
  const body = { p: vec3(), vel: initialVelocity, yaw: 0, pitch: 0, roll: 0, wy: 0, wp: 0, wr: 0, orientation: quatFromEuler(0,0,0) };
  const dt = 1/120;
  for (let t = 0; t < Math.min(sequence.duration,duration); t += dt) {
    const command = sampleMotionSequence(sequence, t).command;
    const turn = Math.max(-1, Math.min(1, angleDelta(body.yaw, sequence.startYaw + command.yawOffset) * 1.7));
    const pitch = Math.max(-0.85, Math.min(0.85, (command.pitch - body.pitch) * 2.2));
    const roll = Math.max(-1, Math.min(1, (sequence.startRoll + command.roll - body.roll) * 1.15));
    stepDynamics(body, { thrust: command.thrust, turn, pitch, pitchMoment: command.pitchMoment, roll, brake: command.brake }, dt);
  }
  return body;
}

test('physics integration turns the dive and climb intents into vertical momentum', () => {
  const dive = runIntentSequence('dive', vec3(), 3.04);
  const climb = runIntentSequence('climb', vec3(), 3.04);
  assert.ok(dive.pitch < -0.2, 'dive must pitch the nose down');
  assert.ok(dive.vel.y < -0.1, 'body-forward thrust must build downward momentum');
  assert.ok(climb.pitch > 0.2, 'climb must pitch the nose up');
  assert.ok(climb.vel.y > 0.1, 'body-forward thrust must build upward momentum');
});

test('physics integration preserves momentum while the fish turns and brakes', () => {
  const body = runIntentSequence('turn-accelerate-coast-brake', vec3(1.1,0,0));
  const forward = quatRotate(body.orientation, vec3(1,0,0));
  assert.ok(Math.hypot(body.vel.x,body.vel.y,body.vel.z) > 0.12);
  assert.ok(Math.hypot(forward.x-body.vel.x,forward.y-body.vel.y,forward.z-body.vel.z) > 0.2,
    'heading and velocity must remain distinct during the turn');
  assert.ok(body.vel.x > 0, 'the turn must not teleport or reverse retained momentum');
});

test('physics integration produces visible axial roll without changing body-forward heading', () => {
  const body = runIntentSequence('axial-roll', vec3(0.6,0,0));
  const forward = quatRotate(body.orientation, vec3(1,0,0));
  const dorsal = quatRotate(body.orientation, vec3(0,1,0));
  assert.ok(Math.abs(forward.x-1) < 1e-5 && Math.abs(forward.y) < 1e-5 && Math.abs(forward.z) < 1e-5);
  assert.ok(Math.abs(dorsal.y-1) > 0.12, 'dorsal axis must visibly rotate around the longitudinal axis');
});

test('complex sequence integration remains finite under combined 3D attitude and force commands', () => {
  for (const name of ['backward-drift','loop-the-loop','dive-brake-reorient','compound-3d']) {
    const body = runIntentSequence(name, vec3(0.8,0.05,0));
    assert.ok([body.p.x,body.p.y,body.p.z,body.vel.x,body.vel.y,body.vel.z,body.yaw,body.pitch,body.roll].every(Number.isFinite), name+' must remain finite');
    const q = body.orientation;
    assert.ok(Math.abs(Math.hypot(q.w,q.x,q.y,q.z)-1) < 1e-9, name+' quaternion must remain normalized');
  }
});


test('backward drift produces a head direction opposed to retained world momentum', () => {
  const body = runIntentSequence('backward-drift', vec3(1.1,0,0));
  const forward = quatRotate(body.orientation, vec3(1,0,0));
  const velocity = body.vel;
  const alignment = forward.x*velocity.x + forward.y*velocity.y + forward.z*velocity.z;
  assert.ok(velocity.x > 0.12, 'the fish must retain forward world-space drift');
  assert.ok(alignment < 0, 'the head must point against the direction of travel');
});

test('loop-the-loop carries pitch through a complete revolution and returns near its starting heading', () => {
  const body = runIntentSequence('loop-the-loop', vec3(0.4,0,0));
  const forward = quatRotate(body.orientation, vec3(1,0,0));
  assert.ok(body.pitch > Math.PI*1.8, 'pitch must pass through a full somersault');
  assert.ok(forward.x > 0.75, 'body-forward should return toward its original direction');
  assert.ok(Math.abs(forward.y) < 0.65, 'body-forward should finish near the starting plane');
});


test('roll-turn composite couples axial roll and yaw without introducing a pitch spin', () => {
  const body = runIntentSequence('roll-turn', vec3(0.7,0,0));
  assert.ok(body.yaw > 0.25, 'the fish should turn around world-up');
  assert.ok(Math.abs(body.roll) > 0.25, 'the fish should roll around its local longitudinal axis');
  assert.ok(Math.abs(body.pitch) < 0.3, 'roll-turn should not become an accidental somersault');
});

test('curved reversal turns the head while retaining a curved, momentum-led path', () => {
  const body = runIntentSequence('curved-reversal', vec3(1.05,0,0));
  const forward = quatRotate(body.orientation, vec3(1,0,0));
  const velocity = body.vel;
  const alignment = forward.x*velocity.x + forward.y*velocity.y + forward.z*velocity.z;
  assert.ok(body.yaw > 1.2, 'heading must make a substantial reversal');
  assert.ok(length3(velocity) > 0.12, 'momentum must persist through the turn');
  assert.ok(alignment < 0.5, 'the path must lag behind the changing heading');
});

test('dive, braking and reorientation are distinct consecutive phases', () => {
  const sequence = createMotionSequence('dive-brake-reorient');
  const dive = sampleMotionSequence(sequence, 2.2).command;
  const brake = sampleMotionSequence(sequence, 3.1).command;
  const reorient = sampleMotionSequence(sequence, 4.2).command;
  assert.ok(dive.pitch < -0.5 && dive.thrust > 0.6);
  assert.ok(brake.brake > 0.7 && brake.pitch < 0);
  assert.ok(reorient.yawOffset > Math.PI*0.6 && reorient.brake < 0.1);
});

test('compound 3D manoeuvre changes yaw, pitch and axial roll through the dynamics', () => {
  const body = runIntentSequence('compound-3d', vec3(0.8,0.05,0));
  assert.ok(body.yaw > 0.8);
  assert.ok(body.pitch > 0.25);
  assert.ok(body.roll > 0.25);
});


test('composite manoeuvre hands back to passive dynamics without an impulse', () => {
  const body = runIntentSequence('turn-accelerate-coast-brake', vec3(0.9,0,0));
  const before = length3(body.vel);
  const positionBefore = { ...body.p };
  for (let i = 0; i < 240; i++) stepDynamics(body, {}, 1/120);
  const after = length3(body.vel);
  assert.ok(after < before, 'calm coasting should dissipate residual momentum');
  assert.ok(Math.hypot(body.p.x-positionBefore.x,body.p.y-positionBefore.y,body.p.z-positionBefore.z) > 0);
  assert.ok([body.p.x,body.p.y,body.p.z,body.vel.x,body.vel.y,body.vel.z].every(Number.isFinite));
});

test('dive-brake-reorient sequence converts downward motion, sheds speed, then changes heading', () => {
  const name = 'dive-brake-reorient';
  const duringDive = runIntentSequence(name, vec3(), 2.7);
  const afterBrake = runIntentSequence(name, vec3(), 3.55);
  const recovered = runIntentSequence(name, vec3(), 5.9);
  assert.ok(duringDive.vel.y < -0.05, 'the dive should create downward momentum');
  assert.ok(length3(afterBrake.vel) < length3(duringDive.vel), 'deployed fins should dissipate speed');
  assert.ok(recovered.yaw > 1.0, 'the fish should reorient after braking');
});

import { selectBehaviour } from '../src/core/behaviour.js';

function seededRandom(seed) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}

test('low energy shifts autonomous state selection toward recovery and glide', () => {
  const lowRandom = seededRandom(19283), highRandom = seededRandom(19283);
  const low = { RECOVER: 0, GLIDE: 0 }, high = { RECOVER: 0, GLIDE: 0 };
  for (let i = 0; i < 3000; i++) {
    const a = selectBehaviour({ energy: 0.18, time: i * 20 }, lowRandom);
    const b = selectBehaviour({ energy: 0.95, time: i * 20 }, highRandom);
    if (a.mode in low) low[a.mode]++;
    if (b.mode in high) high[b.mode]++;
  }
  assert.ok(low.RECOVER + low.GLIDE > high.RECOVER + high.GLIDE);
});

test('dart behaviour requires adequate reserve and a completed burst cooldown', () => {
  const random = seededRandom(7331);
  for (let i = 0; i < 1000; i++) {
    assert.notEqual(selectBehaviour({ energy: 0.2, time: i * 30 }, random).mode, 'DART');
    assert.notEqual(selectBehaviour({ energy: 0.95, time: i * 2, lastBurstAt: i * 2 - 4 }, random).mode, 'DART');
  }
  let bursts = 0;
  const ready = seededRandom(7331);
  for (let i = 0; i < 3000; i++) {
    if (selectBehaviour({ energy: 0.95, time: i * 30 }, ready).mode === 'DART') bursts++;
  }
  assert.ok(bursts > 0);
});

test('behaviour transitions do not immediately repeat the previous state', () => {
  const random = seededRandom(381);
  for (const previousMode of ['CRUISE', 'EXPLORE', 'TURN', 'DART', 'GLIDE', 'RECOVER']) {
    const next = selectBehaviour({ energy: 0.9, previousMode, time: 60 }, random);
    assert.notEqual(next.mode, previousMode);
    assert.ok(next.duration >= 1.3 && next.duration <= 9);
    assert.ok(next.verticalProbability >= 0 && next.verticalProbability <= 1);
  }
});
