import test from 'node:test';
import assert from 'node:assert/strict';
import { createSchool, stepSchool, SCHOOLING_DEFAULT_COUNT, SCHOOLING_FISH_SCALE, SCHOOLING_COLLISION, SCHOOLING_LIMITS } from '../src/schooling.js';

test('schooling experiment creates 1000 independent fish by default', () => {
  const school = createSchool();
  assert.equal(school.fish.length, SCHOOLING_DEFAULT_COUNT);
  assert.equal(school.fish.length, 1000);
  assert.ok(school.fish.every(f => f.p !== f.v && Number.isFinite(f.phase)));
  assert.equal('target' in school, false, 'the school must not have a shared target');
});

test('school initialisation is reproducible for a fixed seed', () => {
  assert.deepEqual(createSchool(100, 1234), createSchool(100, 1234));
  assert.notDeepEqual(createSchool(100, 1234), createSchool(100, 4321));
});

test('local separation pushes close neighbours apart', () => {
  const school = createSchool(2, 1);
  school.fish[0].p = { x: -0.25, y: 0, z: 0 };
  school.fish[1].p = { x: 0.25, y: 0, z: 0 };
  school.fish[0].v = { x: 1, y: 0, z: 0 };
  school.fish[1].v = { x: 1, y: 0, z: 0 };
  const before = school.fish[1].p.x - school.fish[0].p.x;
  for (let i = 0; i < 30; i++) stepSchool(school, 1 / 60);
  const after = school.fish[1].p.x - school.fish[0].p.x;
  assert.ok(after > before, 'separation should increase the gap between overlapping neighbours');
});

test('local alignment reduces heading disagreement between nearby fish', () => {
  const school = createSchool(2, 2);
  school.fish[0].p = { x: -1.1, y: 0, z: 0 };
  school.fish[1].p = { x: 1.1, y: 0, z: 0 };
  school.fish[0].v = { x: 1.2, y: 0, z: 0 };
  school.fish[1].v = { x: -1.2, y: 0, z: 0 };
  const initial = Math.hypot(
    school.fish[0].v.x - school.fish[1].v.x,
    school.fish[0].v.y - school.fish[1].v.y,
    school.fish[0].v.z - school.fish[1].v.z
  );
  for (let i = 0; i < 60; i++) stepSchool(school, 1 / 60);
  const final = Math.hypot(
    school.fish[0].v.x - school.fish[1].v.x,
    school.fish[0].v.y - school.fish[1].v.y,
    school.fish[0].v.z - school.fish[1].v.z
  );
  assert.ok(final < initial, 'neighbour velocity should become more aligned');
});

test('100-fish school remains finite and speed-bounded over sustained simulation', () => {
  const school = createSchool(100, 88);
  let metrics;
  for (let i = 0; i < 900; i++) metrics = stepSchool(school, 1 / 60);
  assert.ok(school.fish.every(f =>
    [f.p.x, f.p.y, f.p.z, f.v.x, f.v.y, f.v.z, f.phase].every(Number.isFinite)
  ));
  assert.ok(metrics.averageSpeed > 0.65, 'the school should retain a healthy cruising speed without forcing every fish to a hard minimum');
  assert.ok(school.fish.every(f => Math.hypot(f.v.x, f.v.y, f.v.z) <= 2.3 + 1e-9));
  assert.ok(metrics.averageNeighbours > 0);
});

test('schooling uses quarter-scale visual fish and a matching collision envelope', () => {
  assert.equal(SCHOOLING_FISH_SCALE, 0.25);
  assert.ok(SCHOOLING_COLLISION.halfLength > 0.18 && SCHOOLING_COLLISION.halfLength < 0.23);
  assert.ok(SCHOOLING_COLLISION.radius > 0.06 && SCHOOLING_COLLISION.radius < 0.09);
});

test('spatial hashing reduces neighbour candidate work below all-pairs scanning', () => {
  const school = createSchool(100, 91);
  const metrics = stepSchool(school, 1 / 60);
  assert.ok(metrics.candidateChecks < 100 * 100, 'local grid should avoid testing every possible pair');
  assert.ok(metrics.candidateChecks >= 100, 'each fish should at least see its own grid bucket');
});

test('overlapping fish capsules produce contact response instead of passing through', () => {
  const school = createSchool(2, 17);
  school.fish[0].p = { x: -0.16, y: 0, z: 0 };
  school.fish[1].p = { x: 0.16, y: 0, z: 0 };
  school.fish[0].v = { x: 1.1, y: 0, z: 0 };
  school.fish[1].v = { x: 1.1, y: 0, z: 0 };
  const metrics = stepSchool(school, 1 / 60);
  assert.ok(metrics.collisions > 0, 'overlapping oriented body capsules should register contact');
  assert.ok(school.fish.every(f => f.collisionCount > 0));
  assert.ok(school.fish.every(f => [f.p.x, f.p.y, f.p.z, f.v.x, f.v.y, f.v.z].every(Number.isFinite)));
  assert.ok(school.fish[1].p.x - school.fish[0].p.x > 0.32, 'contact correction should open the overlap');
});

test('schooling preserves smooth inertial speed changes without abrupt speed snapping', () => {
  const school = createSchool(1, 33);
  const before = { ...school.fish[0].v };
  stepSchool(school, 1 / 120);
  const after = school.fish[0].v;
  const delta = Math.hypot(after.x-before.x, after.y-before.y, after.z-before.z);
  assert.ok(delta < 0.03, 'a small fixed step should produce a small velocity change');
});

test('fish body heading turns at a bounded angular rate instead of snapping to velocity', () => {
  const school = createSchool(1, 45);
  const before = { ...school.fish[0].forward };
  school.fish[0].v = { x: -before.x, y: before.y, z: -before.z };
  stepSchool(school, 1 / 60);
  const after = school.fish[0].forward;
  const cosine = Math.max(-1, Math.min(1, before.x*after.x + before.y*after.y + before.z*after.z));
  assert.ok(Math.acos(cosine) <= 1.35/60 + 1e-6);
});


test('1000-fish experiment uses a five-times-larger habitat on every axis', () => {
  assert.deepEqual(SCHOOLING_LIMITS, { x: 41, y: 15.5, z: 31 });
  const school = createSchool();
  assert.equal(school.fish.length, 1000);
  assert.ok(school.fish.every(f =>
    Math.abs(f.p.x) <= 23.5 && Math.abs(f.p.y) <= 8 && Math.abs(f.p.z) <= 18
  ));
});

test('1000-fish school remains finite with spatially bounded neighbour work', () => {
  const school = createSchool(1000, 1001);
  let metrics;
  for (let i = 0; i < 120; i++) metrics = stepSchool(school, 1 / 60);
  assert.ok(school.fish.every(f =>
    [f.p.x, f.p.y, f.p.z, f.v.x, f.v.y, f.v.z, f.forward.x, f.forward.y, f.forward.z].every(Number.isFinite)
  ));
  assert.ok(metrics.candidateChecks < 1000 * 1000, 'spatial hash should avoid all-pairs neighbour checks');
  assert.ok(metrics.averageSpeed > 0.5);
});
