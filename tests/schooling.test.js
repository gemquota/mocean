import test from 'node:test';
import assert from 'node:assert/strict';
import { createGait, stepGait } from '../src/core/body.js';
import { createSchool, stepSchool, SCHOOLING_DEFAULT_COUNT, SCHOOLING_FISH_SCALE, SCHOOLING_COLLISION, SCHOOLING_EEL_COLLISION, SCHOOLING_CRAB_COLLISION, SCHOOLING_LOBSTER_COLLISION, SCHOOLING_MANTIS_COLLISION, SCHOOLING_MANTA_COLLISION, SCHOOLING_STINGRAY_COLLISION, SCHOOLING_SHARK_COLLISION, SCHOOLING_WHALE_SHARK_COLLISION, SCHOOLING_SHOAL_COLLISION, SCHOOLING_STARFISH_COLLISION, SCHOOLING_DOLPHIN_COLLISION, SCHOOLING_LIMITS, SCHOOLING_SPECIES_PERCENTAGES, SCHOOLING_SPECIES_VOLUME, SCHOOLING_SPECIES_ADULT_MASS_KG, SCHOOLING_SPECIES_ECOLOGY, SCHOOLING_SPECIES_BALANCE, seabedHeight } from '../src/schooling.js';

test('mixed-species habitat creates 150 independent agents by default', () => {
  const school = createSchool();
  const sizeSample = createSchool(5000, 73421).fish;
  assert.equal(school.fish.length, SCHOOLING_DEFAULT_COUNT);
  assert.equal(school.fish.length, 150);
  assert.ok(school.fish.every(f => f.p !== f.v && Number.isFinite(f.phase)));
  assert.ok(school.fish.some(f => f.species === 'eel'));
  assert.ok(school.fish.some(f => f.species === 'fish'));
  const sizedFish = sizeSample.filter(f => f.species === 'fish');
  assert.ok(sizedFish.every(f => f.bodyScale >= 0.58 && f.bodyScale <= 1.5));
  assert.ok(new Set(sizedFish.map(f => f.bodyScale)).size > 20, 'fish should have a continuous range of body sizes');
  assert.ok(school.fish.filter(f => f.species === 'crab').length <= 10, 'crabs should remain a small part of the habitat');
  assert.ok(sizeSample.some(f => f.species === 'mantis'), 'mantis shrimp should be present');
  assert.ok(sizeSample.some(f => f.species === 'manta'), 'manta rays should be present');
  assert.ok(sizeSample.some(f => f.species === 'stingray'), 'stingrays should be present');
  assert.ok(sizeSample.some(f => f.species === 'shark'), 'sharks should be present');
  assert.ok(sizeSample.some(f => f.species === 'whaleShark'), 'whale sharks should be present');
  assert.ok(sizeSample.some(f => f.species === 'schoolFish'), 'dedicated schooling fish should be present');
  assert.ok(sizeSample.some(f => f.species === 'starfish'), 'starfish should be present');
  assert.ok(sizeSample.some(f => f.species === 'dolphin'), 'dolphins should be present');
  assert.ok(sizeSample.some(f => f.species === 'turtle'), 'turtles should be present');
  assert.ok(sizeSample.some(f => f.species === 'jellyfish'), 'jellyfish should be present');
  assert.ok(sizeSample.some(f => f.species === 'sandEel'), 'sand eels should be present');
  assert.ok(sizeSample.some(f => f.species === 'lobster'));
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
  school.fish.forEach(agent => { agent.species = 'fish'; agent.bodyScale = 0.9; agent.schoolAffinity = 0; agent.feedingCooldown = 10; });
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
  assert.ok(school.fish.every(f => Math.hypot(f.v.x, f.v.y, f.v.z) <= 2.6 + 1e-9));
  assert.ok(metrics.averageNeighbours > 0);
});

test('fifteen species have distinct collision envelopes and benthic species spawn on the seabed', () => {
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
  assert.ok(SCHOOLING_SHARK_COLLISION.halfLength > SCHOOLING_STINGRAY_COLLISION.halfLength);
  assert.ok(SCHOOLING_WHALE_SHARK_COLLISION.halfLength > SCHOOLING_SHARK_COLLISION.halfLength);
  assert.ok(SCHOOLING_WHALE_SHARK_COLLISION.radius > SCHOOLING_SHARK_COLLISION.radius);
  assert.ok(SCHOOLING_SHOAL_COLLISION.halfLength > SCHOOLING_COLLISION.halfLength);
  assert.ok(SCHOOLING_SHOAL_COLLISION.radius < SCHOOLING_COLLISION.radius);
  assert.ok(SCHOOLING_STARFISH_COLLISION.radius > SCHOOLING_CRAB_COLLISION.radius);
  assert.ok(SCHOOLING_DOLPHIN_COLLISION.halfLength > SCHOOLING_STINGRAY_COLLISION.halfLength);
  const school = createSchool(150, 73421);
  const eels = school.fish.filter(agent => agent.species === 'eel');
  assert.ok(eels.length >= 1 && eels.length <= 5, 'equal-volume prevalence should keep larger eels uncommon but represented');
  for (const species of ['crab','lobster','mantis','starfish','sandEel']) {
    const ground = school.fish.filter(agent => agent.species === species);
    assert.ok(ground.every(agent => (species === 'sandEel' ? Math.abs(agent.p.y - seabedHeight(agent.p.x,agent.p.z) - .06)<1e-8 : school.terrainField(agent.p.x,agent.p.y,agent.p.z)>=.04) && agent.v.y === 0));
  }
});

test('species aggression scales active pursuit steering', () => {
  const passive = createSchool(2, 91), assertive = createSchool(2, 91);
  for (const school of [passive, assertive]) {
    const [predator, prey] = school.fish;
    predator.species = 'shark'; predator.p = {x:0,y:0,z:0}; predator.v = {x:0.4,y:0,z:0}; predator.forward = {x:1,y:0,z:0}; predator.feedingCooldown = 0;
    prey.species = 'fish'; prey.p = {x:2,y:0,z:0}; prey.v = {x:0.2,y:0,z:0}; prey.forward = {x:1,y:0,z:0}; prey.feedingCooldown = 10;
  }
  passive.fish[0].aggression = 0;
  assertive.fish[0].aggression = 2;
  stepSchool(passive, 1 / 60);
  stepSchool(assertive, 1 / 60);
  assert.ok(assertive.fish[0].v.x > passive.fish[0].v.x, 'higher aggression should produce stronger pursuit acceleration');
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

test('sharks pursue and consume small fish while whale sharks remain filter-feeding cruisers', () => {
  const school = createSchool(2, 81);
  const [shark, prey] = school.fish;
  shark.species = 'shark'; shark.bodyScale = 1.8; shark.p = {x:0,y:0,z:0}; shark.v = {x:0.8,y:0,z:0}; shark.forward = {x:1,y:0,z:0}; shark.feedingCooldown = 0;
  prey.species = 'fish'; prey.bodyScale = 0.72; prey.p = {x:0.2,y:0,z:0}; prey.v = {x:0.2,y:0,z:0}; prey.forward = {x:1,y:0,z:0};
  stepSchool(school,1/60);
  assert.equal(school.fish.length,1,'a shark should capture a small fish at close range');
  assert.equal(school.metrics.eaten,1);
  const whaleSchool=createSchool(2,82), [whale,fish]=whaleSchool.fish;
  whale.species='whaleShark'; whale.bodyScale=2.8; whale.p={x:0,y:0,z:0}; whale.v={x:.7,y:0,z:0}; whale.forward={x:1,y:0,z:0};
  fish.species='fish'; fish.bodyScale=.6; fish.p={x:.15,y:0,z:0}; fish.v={x:.2,y:0,z:0};
  for(let i=0;i<60;i++)stepSchool(whaleSchool,1/60);
  assert.equal(whaleSchool.fish.length,2,'whale sharks must not prey on fish');
  assert.ok(whale.planktonFiltered>0,'whale sharks should accumulate filter-feeding activity');
  assert.ok(Math.hypot(whale.v.x,whale.v.y,whale.v.z)<=.93);
});

test('dedicated schooling fish are one quarter scale and form persistent, separate schools', () => {
  const school=createSchool(500,73421), regular=school.fish.filter(f=>f.species==='fish'), shoal=school.fish.filter(f=>f.species==='schoolFish');
  assert.ok(shoal.length > regular.length * 5, 'quarter-scale shoaling fish should be much more numerous under the blended prevalence');
  assert.ok(shoal.every(f=>f.bodyScale>=0.145 && f.bodyScale<=0.375));
  assert.ok(shoal.every(f=>f.schoolAffinity>=2.4));
  assert.ok(new Set(shoal.map(f=>f.socialGroupId)).size>=5);
  for(let i=0;i<600;i++)stepSchool(school,1/60);
  const groups=new Map();for(const f of shoal){const key=f.socialGroupId;let group=groups.get(key);if(!group){group=[];groups.set(key,group);}group.push(f);}
  for(const group of groups.values())if(group.length>2){
    const cx=group.reduce((s,f)=>s+f.p.x,0)/group.length,cy=group.reduce((s,f)=>s+f.p.y,0)/group.length,cz=group.reduce((s,f)=>s+f.p.z,0)/group.length;
    const meanDistance=group.reduce((s,f)=>s+Math.hypot(f.p.x-cx,f.p.y-cy,f.p.z-cz),0)/group.length;
    assert.ok(meanDistance<4.8,'members should remain cohesive around their school centroid');
  }
});

test('starfish remain benthic and dolphins travel in social pods', () => {
  const school=createSchool(1000,73421),stars=school.fish.filter(f=>f.species==='starfish'),dolphins=school.fish.filter(f=>f.species==='dolphin');
  assert.ok(stars.length>20 && stars.every(f=>school.terrainField(f.p.x,f.p.y,f.p.z)>=.04));
  assert.ok(dolphins.length>=1 && dolphins.every(f=>f.socialGroupId>=0));
  const before=dolphins.map(f=>({...f.p}));for(let i=0;i<240;i++)stepSchool(school,1/60);
  assert.ok(stars.every(f=>school.terrainField(f.p.x,f.p.y,f.p.z)>=.04 && Math.hypot(f.v.x,f.v.z)<=.080001 && f.v.y===0));
  assert.ok(dolphins.every(f=>Math.hypot(f.v.x,f.v.y,f.v.z)<=2.21));
  assert.ok(dolphins.some((f,i)=>Math.hypot(f.p.x-before[i].x,f.p.y-before[i].y,f.p.z-before[i].z)>1));
});

test('small fish have stronger schooling affinity than large fish', () => {
  const school=createSchool(5000,73421), fish=school.fish.filter(f=>f.species==='fish');
  const small=fish.filter(f=>f.bodyScale<0.8), large=fish.filter(f=>f.bodyScale>1.3);
  assert.ok(small.length>0 && large.length>0);
  assert.ok(small.every(f=>f.schoolAffinity>0.9));
  assert.ok(large.every(f=>f.schoolAffinity<0.8));
});

test('moray eels receive individual 2x to 5x length scaling and matching collision envelopes', () => {
  const school = createSchool(500, 73421, { speciesPercentages: { eel: 1 } });
  const eels = school.fish.filter(agent => agent.species === 'eel');
  assert.ok(eels.length >= 1);
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
  assert.ok(ground.every(agent => school.terrainField(agent.p.x,agent.p.y,agent.p.z)>=.04 && agent.v.y === 0));
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
  school.fish.forEach(agent => { agent.species = 'fish'; agent.bodyScale = 0.9; agent.forward = { x: 1, y: 0, z: 0 }; });
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
    Number.isFinite(f.p.x) && Number.isFinite(f.p.y) && Number.isFinite(f.p.z) &&
    Math.abs(f.p.x) <= SCHOOLING_LIMITS.x && Math.abs(f.p.y) <= SCHOOLING_LIMITS.y && Math.abs(f.p.z) <= SCHOOLING_LIMITS.z
  ));
});

test('1000-fish school remains finite with spatially bounded neighbour work', () => {
  const school = createSchool(1000, 1001, { speciesPercentages: { fish: 1 } });
  let metrics;
  for (let i = 0; i < 120; i++) metrics = stepSchool(school, 1 / 60);
  assert.ok(school.fish.every(f =>
    [f.p.x, f.p.y, f.p.z, f.v.x, f.v.y, f.v.z, f.forward.x, f.forward.y, f.forward.z].every(Number.isFinite)
  ));
  assert.ok(metrics.candidateChecks < 1000 * 1000, 'spatial hash should avoid all-pairs neighbour checks');
  assert.ok(metrics.averageSpeed > 0.5);
});


test('moray eels settle near the seabed and maintain a near-horizontal swimming path', () => {
  const school = createSchool(500, 73421, { speciesPercentages: { eel: 1 } });
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
  const school = createSchool(1, 73421);
  const crab = school.fish[0];
  crab.species = 'crab'; crab.bodyScale = 1; crab.sheltering = false; crab.shelterIndex = 0;
  crab.p = { x: -20, y: -8.55, z: -17 }; crab.v = { x: 0, y: 0, z: 0 }; crab.forward = { x: 1, y: 0, z: 0 }; crab.groundPhase = 0;
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

test('species mix targets regular and dedicated schooling fish, eels, rays, sharks, reef fauna and new turtle species', () => {
  const school = createSchool(5000, 73421);
  const share = species => school.fish.filter(agent => agent.species === species).length / school.fish.length;
  for (const [species, target] of Object.entries(SCHOOLING_SPECIES_PERCENTAGES).map(([name, percentage]) => [name, percentage / 100])) {
    assert.ok(Math.abs(share(species) - target) < 0.008, `${species} share should be close to ${target * 100}%`);
  }
});


test('mantis shrimp stay on the seabed and make short, high-acceleration dashes', () => {
  const school = createSchool(1000, 73421, { speciesPercentages: { mantis: 100 } });
  const mantis = school.fish.filter(agent => agent.species === 'mantis');
  assert.equal(mantis.length, 1000);
  assert.ok(mantis.every(agent => school.terrainField(agent.p.x,agent.p.y,agent.p.z)>=.04 && agent.v.y === 0));
  const before = mantis.map(agent => ({ ...agent.p }));
  for (let i = 0; i < 300; i++) stepSchool(school, 1 / 60);
  assert.ok(mantis.every(agent => school.terrainField(agent.p.x,agent.p.y,agent.p.z)>=.04 && Number.isFinite(agent.v.x) && Number.isFinite(agent.v.z) && agent.v.y===0));
  assert.ok(mantis.some((agent, i) => Math.hypot(agent.p.x - before[i].x, agent.p.z - before[i].z) > 0.4));
});

test('manta rays occupy midwater and maintain a slow, bounded glide with fin motion', () => {
  const school = createSchool(1000, 73421, { speciesPercentages: { manta: 100 } });
  const rays = school.fish.filter(agent => agent.species === 'manta');
  assert.equal(rays.length, 1000);
  assert.ok(rays.every(agent => Math.abs(agent.p.y) < 4));
  const phase = rays[0].wingPhase;
  for (let i = 0; i < 120; i++) stepSchool(school, 1 / 60);
  assert.notEqual(rays[0].wingPhase, phase);
  assert.ok(rays.every(agent => Math.hypot(agent.v.x, agent.v.y, agent.v.z) <= 1.25 + 1e-9));
});

test('stingrays glide just above the seabed with slow fin strokes', () => {
  const school = createSchool(12, 73421, { speciesPercentages: { stingray: 100 } });
  const rays = school.fish.filter(agent => agent.species === 'stingray');
  assert.equal(rays.length, 12);
  assert.ok(rays.every(agent => agent.p.y > -8.05 && agent.p.y < -7.75));
  const phase = rays[0].wingPhase;
  const before = { ...rays[0].p };
  for (let i = 0; i < 240; i++) stepSchool(school, 1 / 60);
  assert.notEqual(rays[0].wingPhase, phase);
  assert.ok(Math.hypot(rays[0].p.x-before.x, rays[0].p.z-before.z) > 1);
  assert.ok(rays.every(agent => agent.p.y === -7.92 && Math.hypot(agent.v.x,agent.v.z) <= 1.25));
});

test('species proportions and world dimensions can be configured at creation',()=>{const mix={fish:50,eel:50};const habitat=createSchool(200,22,{speciesPercentages:mix,worldSize:{x:62,y:21,z:48}});assert.ok(habitat.fish.every(f=>f.species==='fish'||f.species==='eel'));assert.deepEqual(habitat.worldSize,{x:62,y:21,z:48});assert.deepEqual(habitat.speciesPercentages,mix);assert.ok(Math.abs(Object.values(SCHOOLING_SPECIES_PERCENTAGES).reduce((a,b)=>a+b,0)-100)<1e-9);});
test('sea turtles pursue jellyfish as prey while jellyfish drift independently',()=>{const habitat=createSchool(2,19,{speciesPercentages:{turtle:1,jellyfish:1}}),[turtle,jelly]=habitat.fish;turtle.species='turtle';turtle.p={x:0,y:0,z:0};turtle.v={x:.5,y:0,z:0};turtle.forward={x:1,y:0,z:0};turtle.feedingCooldown=0;jelly.species='jellyfish';jelly.p={x:.2,y:0,z:0};jelly.v={x:0,y:0,z:0};stepSchool(habitat,1/60);assert.equal(habitat.fish.length,1);assert.equal(habitat.metrics.eaten,1);});
test('sand eels periodically emerge vertically from variable-depth seabed',()=>{const habitat=createSchool(1000,73421,{speciesPercentages:{sandEel:100}}),eels=habitat.fish.filter(f=>f.species==='sandEel');assert.ok(eels.length>10);const initial=eels.map(f=>f.p.y);for(let i=0;i<900;i++)stepSchool(habitat,1/60);assert.ok(eels.some((f,i)=>f.p.y>initial[i]+.4));assert.ok(eels.every(f=>Number.isFinite(f.p.y)&&f.p.y>=seabedHeight(f.p.x,f.p.z)));assert.ok(eels.some(f=>f.planktonFiltered>0),'emerged sand eels should register filter-feeding activity');});

test('crab share remains close to the new three-percent target', () => {
  const school = createSchool(5000, 73421);
  const crabShare = school.fish.filter(agent => agent.species === 'crab').length / school.fish.length;
  assert.ok(Math.abs(crabShare - SCHOOLING_SPECIES_PERCENTAGES.crab / 100) < 0.003, 'crab prevalence should follow the equal-volume default');
});

test('mola mola are distinct slow midwater cruisers with a deep-bodied collision envelope', () => {
  const school = createSchool(1000, 73421);
  const mola = school.fish.filter(agent => agent.species === 'mola');
  assert.ok(mola.length >= 1 && mola.length <= 5, 'mola mola count should follow its large model volume');
  assert.ok(mola.every(agent => agent.bodyScale >= 1.42 && agent.bodyScale <= 1.7));
  const before = mola.map(agent => ({ ...agent.p }));
  for (let i = 0; i < 120; i++) stepSchool(school, 1 / 60);
  assert.ok(mola.every(agent => [agent.p.x,agent.p.y,agent.p.z,agent.v.x,agent.v.y,agent.v.z].every(Number.isFinite)));
  const meanSpeed = mola.reduce((sum,agent) => sum + Math.hypot(agent.v.x,agent.v.y,agent.v.z),0) / mola.length;
  assert.ok(meanSpeed < 0.85, 'mola mola should retain a slow cruising pace despite occasional collision impulses');
  assert.ok(mola.every(agent => Math.hypot(agent.v.x,agent.v.y,agent.v.z) < 1.5));
  assert.ok(mola.some((agent,i) => Math.hypot(agent.p.x-before[i].x,agent.p.y-before[i].y,agent.p.z-before[i].z) > 0.1));
});

test('orca pods, deep-diving sperm whales and surface-foraging seals have distinct stable movement', () => {
  const school = createSchool(500, 82317, { speciesPercentages: { orca: 1, spermWhale: 1, seal: 1 } });
  const orcas = school.fish.filter(agent => agent.species === 'orca');
  const spermWhales = school.fish.filter(agent => agent.species === 'spermWhale');
  const seals = school.fish.filter(agent => agent.species === 'seal');
  assert.ok(orcas.length >= 100 && orcas.length <= 170);
  assert.ok(spermWhales.length >= 100 && spermWhales.length <= 170);
  assert.ok(seals.length >= 100 && seals.length <= 170);
  assert.ok(orcas.every(agent => agent.bodyScale >= 2.05 && agent.bodyScale <= 2.4));
  assert.ok(spermWhales.every(agent => agent.bodyScale >= 3.05 && agent.bodyScale <= 3.6));
  const start = [...orcas,...spermWhales,...seals].map(agent=>({...agent.p}));
  for(let i=0;i<240;i++) stepSchool(school,1/60);
  for(const [index,agent] of [...orcas,...spermWhales,...seals].entries()) {
    assert.ok([agent.p.x,agent.p.y,agent.p.z,agent.v.x,agent.v.y,agent.v.z].every(Number.isFinite));
    assert.ok(Math.hypot(agent.p.x-start[index].x,agent.p.y-start[index].y,agent.p.z-start[index].z)>.1);
  }
});



test('default allocation retains at least one individual of every enabled species', () => {
  const school = createSchool(150, 73421);
  const counts = new Map();
  for (const agent of school.fish) counts.set(agent.species, (counts.get(agent.species) ?? 0) + 1);
  for (const species of Object.keys(SCHOOLING_SPECIES_VOLUME)) assert.ok(counts.get(species) >= 1, species + ' should remain represented');
  assert.equal(school.fish.length, 150);
});

test('species prevalence blends model volume, adult mass and ecological prevalence equally', () => {
  const species = Object.keys(SCHOOLING_SPECIES_VOLUME);
  assert.equal(species.length, 30);
  for (const key of species) {
    assert.ok(SCHOOLING_SPECIES_ADULT_MASS_KG[key] > 0);
    assert.ok(SCHOOLING_SPECIES_ECOLOGY[key] > 0);
    assert.ok(SCHOOLING_SPECIES_BALANCE[key] > 0);
  }
  const expected = species.map(key => 1 / SCHOOLING_SPECIES_BALANCE[key]);
  const total = expected.reduce((sum, value) => sum + value, 0);
  for (const key of species) assert.ok(Math.abs(SCHOOLING_SPECIES_PERCENTAGES[key] - expected[species.indexOf(key)] / total * 100) < 1e-10);
  assert.ok(Math.abs(Object.values(SCHOOLING_SPECIES_PERCENTAGES).reduce((sum, value) => sum + value, 0) - 100) < 1e-9);
});

test('live agents collide against the same voxel density field used by the seabed mesh',()=>{
 const school=createSchool(1,12345,{speciesPercentages:{fish:100},worldSize:{...SCHOOLING_LIMITS}});
 const fish=school.fish[0];
 assert.equal(typeof school.terrainField,'function');
 fish.p={x:16,y:-8.35,z:-7};fish.v={x:0,y:-.2,z:0};fish.forward={x:1,y:0,z:0};
 stepSchool(school,1/60);
 assert.equal(fish.terrainContact,true);
 assert.ok(school.terrainField(fish.p.x,fish.p.y,fish.p.z)>.02,'fish centre must be pushed out of solid rock');
 const previousField=school.terrainField;
 school.worldSize={x:60,y:20,z:45};
 stepSchool(school,1/60);
 assert.notEqual(school.terrainField,previousField,'terrain field must follow world dimension changes');
});


test('all species stay inside the inner 80 percent of the configured world on every axis', () => {
  const worldSize = { x: 80, y: 60, z: 100 };
  const edge = Object.fromEntries(Object.entries(worldSize).map(([axis, size]) => [axis, size * 0.4]));
  const school = createSchool(300, 73421, { worldSize });
  for (let i = 0; i < 900; i++) stepSchool(school, 1 / 60);
  assert.ok(school.fish.every(agent =>
    ['x', 'y', 'z'].every(axis => Math.abs(agent.p[axis]) <= edge[axis] + 1e-8)
  ), 'no creature centre may enter the outer ten-percent border on any face');

  const single = createSchool(1, 91, { speciesPercentages: { fish: 100 }, worldSize });
  const fish = single.fish[0];
  fish.p = { x: edge.x + 12, y: 0, z: 0 };
  fish.v = { x: 2, y: 0, z: 0 };
  stepSchool(single, 1 / 60);
  assert.ok(fish.p.x <= edge.x, 'an externally displaced fish must be pulled back inside the safe world');
  assert.ok(fish.v.x < 0, 'a fish hitting the boundary must receive an inward velocity response');
});
