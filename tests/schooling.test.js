import test from 'node:test';
import assert from 'node:assert/strict';
import { createSchool, stepSchool, SCHOOLING_DEFAULT_COUNT } from '../src/schooling.js';

test('schooling experiment creates 100 independent fish by default', () => {
  const school = createSchool();
  assert.equal(school.fish.length, SCHOOLING_DEFAULT_COUNT);
  assert.equal(school.fish.length, 100);
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
  assert.ok(school.fish.every(f => Math.hypot(f.v.x, f.v.y, f.v.z) >= 0.8 - 1e-9));
  assert.ok(school.fish.every(f => Math.hypot(f.v.x, f.v.y, f.v.z) <= 2.3 + 1e-9));
  assert.ok(metrics.averageNeighbours > 0);
});
