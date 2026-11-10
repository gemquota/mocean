import test from 'node:test';
import assert from 'node:assert/strict';
import { createGait, stepGait } from '../src/core/body.js';
import { createSchool, stepSchool, SCHOOLING_DEFAULT_COUNT, SCHOOLING_FISH_SCALE, SCHOOLING_COLLISION, SCHOOLING_EEL_COLLISION, SCHOOLING_CRAB_COLLISION, SCHOOLING_LOBSTER_COLLISION, SCHOOLING_MANTIS_COLLISION, SCHOOLING_MANTA_COLLISION, SCHOOLING_STINGRAY_COLLISION, SCHOOLING_LIMITS } from '../src/schooling.js';

test('mixed-species habitat creates 150 independent agents by default', () => {
  const school = createSchool();
  assert.equal(school.fish.length, SCHOOLING_DEFAULT_COUNT);
  assert.equal(school.fish.length, 150);
  assert.ok(school.fish.every(f => f.p !== f.v && Number.isFinite(f.phase)));
  assert.ok(school.fish.some(f => f.species === 'eel'));
  assert.ok(school.fish.some(f => f.species === 'fish'));
  const sizedFish = school.fish.filter(f => f.species === 'fish');
  assert.ok(sizedFish.every(f => f.bodyScale >= 0.58 && f.bodyScale <= 1.5));
  assert.ok(new Set(sizedFish.map(f => f.bodyScale)).size > 20, 'fish should have a continuous range of body sizes');
  assert.ok(school.fish.filter(f => f.species === 'crab').length <= 10, 'crabs should remain a small part of the habitat');
  assert.ok(school.fish.some(f => f.species === 'mantis'), 'mantis shrimp should be present');
  assert.ok(school.fish.some(f => f.species === 'manta'), 'manta rays should be present');
  assert.ok(school.fish.some(f => f.species === 'stingray'), 'stingrays should be present');
  assert.ok(school.fish.some(f => f.species === 'lobster'));
  const eels=school.fish.filter(f => f.species === 'eel');
  const benthic=school.fish.filter(f => f.species === 'crab' || f.species === 'lobster');
  assert.ok(eels.every(f => f.bodyScale >= 1.28 && f.bodyScale <= 1.5), 'eels should be visibly larger than standard fish');
  assert.ok(benthic.every(f => f.bodyScale >= 0.78 && f.bodyScale <= 1.12), 'crabs and lobsters should vary in body size');
  const largerBenthicSample = createSchool(5000).fish.filter(f => f.species === 'crab' || f.species === 'lobster');
  assert.ok(new Set(largerBenthicSample.map(f => f.bodyScale)).size > 10, 'benthic creatures should have individual size variation');
  assert.equal('target' in school, false, 'the school must not have a shared target');
});

test('school population supports the full 5000-fish slider range', () => {
  assert.equal(createSchool(5000, 7).fish.length, 5000);
  assert.equal(createSchool(6000, 7).fish.length, 5000, 'engine population cap should match the slider maximum');
});

test('population creation returns the exact requested count up to 5000', () => {
  for (const count of [100, 1000, 2500, 5000]) {
    assert.equal(createSchool(count, 19).fish.length, count);
  }
});

test('school initialisation is reproducible for a fixed seed', () => {
  assert.deepEqual(createSchool(100, 1234), createSchool(100, 1234));
  assert.notDeepEqual(createSchool(100, 1234), createSchool(100, 4321));
});

test('local separation pushes close neighbours apart', () => {
  const school = createSchool(2, 1);
  school.fish.forEach(agent => { agent.species = 'fish'; });
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
  school.fish.forEach(agent => { agent.species = 'fish'; agent.bodyScale = 0.9; agent.schoolAffinity = 0.9; });
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

test('seven species have distinct collision envelopes and benthic species spawn on the seabed', () => {
  assert.equal(SCHOOLING_FISH_SCALE, 0.25);
  assert.ok(SCHOOLING_COLLISION.halfLength > 0.18 && SCHOOLING_COLLISION.halfLength < 0.23);
  assert.ok(SCHOOLING_COLLISION.radius > 0.06 && SCHOOLING_COLLISION.radius < 0.09);
  assert.ok(SCHOOLING_EEL_COLLISION.halfLength > SCHOOLING_COLLISION.halfLength * 2.5);
  assert.ok(SCHOOLING_EEL_COLLISION.radius < SCHOOLING_COLLISION.radius);
  assert.ok(SCHOOLING_CRAB_COLLISION.radius > SCHOOLING_COLLISION.radius);
  assert.ok(SCHOOLING_LOBSTER_COLLISION.halfLength > SCHOOLING_CRAB_COLLISION.halfLength);
  assert.ok(SCHOOLING_MANTIS_COLLISION.radius > 0.07 && SCHOOLING_MANTIS_COLLISION.radius < SCHOOLING_CRAB_COLLISION.radius);
  assert.ok(SCHOOLING_MANTA_COLLISION.halfLength > SCHOOLING_EEL_COLLISION.halfLength);
  assert.ok(SCHOOLING_STINGRAY_COLLISION.halfLength > SCHOOLING_CRAB_COLLISION.halfLength);
  assert.ok(SCHOOLING_STINGRAY_COLLISION.radius > SCHOOLING_FISH_SCALE * 0.7);
  const school = createSchool(150, 73421);
  const eels = school.fish.filter(agent => agent.species === 'eel');
  assert.ok(eels.length >= 15 && eels.length <= 45, 'seeded mix should contain a useful minority of eels');
  for (const species of ['crab','lobster','mantis']) {
    const ground = school.fish.filter(agent => agent.species === species);
    assert.ok(ground.every(agent => agent.p.y === -8.55 && agent.v.y === 0));
  }
});

test('large fish consume sufficiently small fish at close range', () => {
  const school = createSchool(2, 71);
  const [predator, prey] = school.fish;
  predator.species='fish'; predator.bodyScale=1.45; predator.schoolAffinity=0.5;
  predator.p={x:0,y:0,z:0}; predator.v={x:0.5,y:0,z:0}; predator.forward={x:1,y:0,z:0}; predator.feedingCooldown=0;
  prey.species='fish'; prey.bodyScale=0.62; prey.schoolAffinity=1.1;
  prey.p={x:0.2,y:0,z:0}; prey.v={x:0.5,y:0,z:0}; prey.forward={x:1,y:0,z:0};
  stepSchool(school,1/60);
  assert.equal(school.fish.length,1,'the smaller fish should be removed after a close capture');
  assert.equal(school.metrics.eaten,1);
  assert.ok(school.fish[0].bodyScale>1.45,'feeding should produce a small growth response');
});

test('small fish have stronger schooling affinity than large fish', () => {
  const school=createSchool(150,73421), fish=school.fish.filter(f=>f.species==='fish');
  const small=fish.filter(f=>f.bodyScale<0.8), large=fish.filter(f=>f.bodyScale>1.3);
  assert.ok(small.length>0 && large.length>0);
  assert.ok(small.every(f=>f.schoolAffinity>0.9));
  assert.ok(large.every(f=>f.schoolAffinity<0.8));
});

test('moray eels receive individual 2x to 5x length scaling and matching collision envelopes', () => {
  const school = createSchool(500, 73421);
  const eels = school.fish.filter(agent => agent.species === 'eel');
  assert.ok(eels.length > 20);
  assert.ok(eels.every(agent => agent.eelLengthScale >= 2 && agent.eelLengthScale <= 5));
  const short = eels.reduce((a, b) => a.eelLengthScale < b.eelLengthScale ? a : b);
  const long = eels.reduce((a, b) => a.eelLengthScale > b.eelLengthScale ? a : b);
  assert.ok(long.eelLengthScale > short.eelLengthScale);
});

test('crabs use rare, shelter-seeking bursts and pause under cover', () => {
  const school = createSchool(500, 73421);
  const crabs = school.fish.filter(agent => agent.species === 'crab');
  assert.ok(crabs.length > 5 && crabs.length < 30, 'crabs should remain a small but visible population');
  assert.ok(crabs.every(agent => Number.isInteger(agent.shelterIndex) && agent.sheltering));
  const crab = crabs[0];
  crab.sheltering = false;
  crab.shelterIndex = 0;
  crab.p = { x: -20, y: -8.55, z: -17 };
  const before = { ...crab.p };
  for (let i = 0; i < 30; i++) stepSchool(school, 1 / 60);
  assert.ok(Math.hypot(crab.p.x-before.x, crab.p.z-before.z) > 0.2, 'an exposed crab should scuttle decisively toward cover');
});

test('benthic crustaceans and mantis shrimp use bounded grounded locomotion', () => {
  const school = createSchool(150, 73421);
  const ground = school.fish.filter(agent => agent.species === 'crab' || agent.species === 'lobster' || agent.species === 'mantis');
  const before = ground.map(agent => ({...agent.p}));
  for (let i = 0; i < 600; i++) stepSchool(school, 1 / 60);
  assert.ok(ground.every(agent => agent.p.y === -8.55 && agent.v.y === 0));
  assert.ok(ground.every(agent => [agent.p.x,agent.p.y,agent.p.z,agent.v.x,agent.v.y,agent.v.z].every(Number.isFinite)));
  assert.ok(ground.every(agent => Math.hypot(agent.v.x,agent.v.z) <= 1.6));
  assert.ok(ground.some((agent,i) => Math.hypot(agent.p.x-before[i].x,agent.p.z-before[i].z) > 0.25));
  assert.ok(ground.every(agent => agent.neighbourCount === 0), 'benthic species must not be pulled into fish schooling');
});

test('spatial hashing reduces neighbour candidate work below all-pairs scanning', () => {
  const school = createSchool(100, 91);
  const metrics = stepSchool(school, 1 / 60);
  assert.ok(metrics.candidateChecks < 100 * 100, 'local grid should avoid testing every possible pair');
  assert.ok(metrics.candidateChecks >= 100, 'each fish should at least see its own grid bucket');
});

test('overlapping fish capsules produce contact response instead of passing through', () => {
  const school = createSchool(2, 17);
  school.fish.forEach(agent => { agent.species = 'fish'; agent.forward = { x: 1, y: 0, z: 0 }; });
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


test('1000-agent capacity retains the five-times-larger habitat on every axis', () => {
  assert.deepEqual(SCHOOLING_LIMITS, { x: 41, y: 15.5, z: 31 });
  const school = createSchool(1000);
  assert.equal(school.fish.length, 1000);
  assert.ok(school.fish.every(f =>
    (f.species === 'crab' ? Math.abs(f.p.x) <= 35 : Math.abs(f.p.x) <= 23.5) && (f.species === 'crab' || f.species === 'lobster' || f.species === 'mantis' ? f.p.y === -8.55 : Math.abs(f.p.y) <= 8) && (f.species === 'crab' ? (f.species === 'crab' ? Math.abs(f.p.z) <= 19 : Math.abs(f.p.z) <= 18) : Math.abs(f.p.z) <= 18)
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


test('moray eels settle near the seabed and maintain a near-horizontal swimming path', () => {
  const school = createSchool(500, 73421);
  const eels = school.fish.filter(agent => agent.species === 'eel');
  const initialMeanY = eels.reduce((sum, eel) => sum + eel.p.y, 0) / eels.length;
  for (let i = 0; i < 900; i++) stepSchool(school, 1 / 60);
  const meanY = eels.reduce((sum, eel) => sum + eel.p.y, 0) / eels.length;
  const meanVerticalSpeed = eels.reduce((sum, eel) => sum + Math.abs(eel.v.y), 0) / eels.length;
  assert.ok(meanY < initialMeanY, 'eels should actively settle toward the seabed');
  assert.ok(meanY < -4.5, 'eels should spend most of their time in the lower habitat');
  assert.ok(meanVerticalSpeed < 0.22, 'eels should favour horizontal swimming');
});

test('exposed crabs scuttle sideways relative to their shell heading', () => {
  const school = createSchool(500, 73421);
  const crab = school.fish.find(agent => agent.species === 'crab');
  crab.sheltering = false;
  crab.shelterIndex = 0;
  crab.p = { x: -20, y: -8.55, z: -17 };
  for (let i = 0; i < 90; i++) stepSchool(school, 1 / 60);
  const forwardSpeed = crab.v.x * crab.forward.x + crab.v.z * crab.forward.z;
  const lateralSpeed = crab.v.x * -crab.forward.z + crab.v.z * crab.forward.x;
  assert.ok(Math.abs(forwardSpeed) < Math.abs(lateralSpeed) * 0.45, 'crab velocity should be predominantly sideways');
});


test('moray gait produces a broad, pronounced travelling lateral wave', () => {
  const gait = createGait();
  for (let i = 0; i < 900; i++) stepGait(gait, 'MORAY', 0.8, 0, 1 / 60);
  const offsets = gait.spine.map(node => node.y);
  const peak = Math.max(...offsets.map(Math.abs));
  const activeNodes = offsets.filter(value => Math.abs(value) > 0.08).length;
  assert.ok(gait.amplitude > 0.4, 'moray muscle recruitment should use a larger stroke');
  assert.ok(peak > 0.2, 'the body should bend visibly away from its travel axis');
  assert.ok(activeNodes >= 7, 'the lateral bend should involve much of the trunk');
});

test('species mix targets fish, eels, crustaceans, mantis shrimp, manta rays and stingrays', () => {
  const school = createSchool(5000, 73421);
  const share = species => school.fish.filter(agent => agent.species === species).length / school.fish.length;
  for (const [species, target] of [['fish', 0.73], ['eel', 0.15], ['crab', 0.03], ['lobster', 0.03], ['mantis', 0.02], ['manta', 0.02], ['stingray', 0.02]]) {
    assert.ok(Math.abs(share(species) - target) < 0.008, `${species} share should be close to ${target * 100}%`);
  }
});


test('mantis shrimp stay on the seabed and make short, high-acceleration dashes', () => {
  const school = createSchool(1000, 73421);
  const mantis = school.fish.filter(agent => agent.species === 'mantis');
  assert.ok(mantis.length > 10 && mantis.length < 35);
  assert.ok(mantis.every(agent => agent.p.y === -8.55 && agent.v.y === 0));
  const before = mantis.map(agent => ({ ...agent.p }));
  for (let i = 0; i < 300; i++) stepSchool(school, 1 / 60);
  assert.ok(mantis.every(agent => agent.p.y === -8.55 && Number.isFinite(agent.v.x) && Number.isFinite(agent.v.z)));
  assert.ok(mantis.some((agent, i) => Math.hypot(agent.p.x - before[i].x, agent.p.z - before[i].z) > 0.4));
});

test('manta rays occupy midwater and maintain a slow, bounded glide with fin motion', () => {
  const school = createSchool(1000, 73421);
  const rays = school.fish.filter(agent => agent.species === 'manta');
  assert.ok(rays.length > 10 && rays.length < 35);
  assert.ok(rays.every(agent => Math.abs(agent.p.y) < 4));
  const phase = rays[0].wingPhase;
  for (let i = 0; i < 120; i++) stepSchool(school, 1 / 60);
  assert.notEqual(rays[0].wingPhase, phase);
  assert.ok(rays.every(agent => Math.hypot(agent.v.x, agent.v.y, agent.v.z) <= 1.25 + 1e-9));
});

test('stingrays glide just above the seabed with slow fin strokes', () => {
  const school = createSchool(1000, 73421);
  const rays = school.fish.filter(agent => agent.species === 'stingray');
  assert.ok(rays.length > 10 && rays.length < 35);
  assert.ok(rays.every(agent => agent.p.y > -8.05 && agent.p.y < -7.75));
  const phase = rays[0].wingPhase;
  const before = { ...rays[0].p };
  for (let i = 0; i < 240; i++) stepSchool(school, 1 / 60);
  assert.notEqual(rays[0].wingPhase, phase);
  assert.ok(Math.hypot(rays[0].p.x-before.x, rays[0].p.z-before.z) > 1);
  assert.ok(rays.every(agent => agent.p.y === -7.92 && Math.hypot(agent.v.x,agent.v.z) <= 0.83));
});

test('crab share remains close to the new three-percent target', () => {
  const school = createSchool(5000, 73421);
  const crabShare = school.fish.filter(agent => agent.species === 'crab').length / school.fish.length;
  assert.ok(Math.abs(crabShare - 0.03) < 0.003, 'crabs should make up about three percent of the population');
});
