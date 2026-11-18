import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROCEDURAL_VOXEL_SPECIES,
  VOXEL_PROFILE_BY_SPECIES,
  buildVoxelCreatureGeometry,
  filterToProceduralVoxelSpecies,
  advanceVoxelCreatureAnimation
} from '../src/phase6/procedural-voxel-creature-renderer.js';

test('every current schooling creature species has a procedural voxel profile',()=>{
  assert.equal(PROCEDURAL_VOXEL_SPECIES.length,33);
  for(const species of PROCEDURAL_VOXEL_SPECIES)assert.ok(VOXEL_PROFILE_BY_SPECIES[species],species);
});

test('voxel mesher emits deterministic exposed surfaces and no internal faces',()=>{
  const a=buildVoxelCreatureGeometry('clownfish'),b=buildVoxelCreatureGeometry('clownfish');
  assert.ok(a.voxelCount>100);
  assert.ok(a.faceCount>0);
  assert.ok(a.faceCount<a.voxelCount*6);
  assert.equal(a.indices.length,a.faceCount*6);
  assert.equal(a.positions.length,a.faceCount*12);
  assert.deepEqual(a.positions,b.positions);
  assert.deepEqual(a.normals,b.normals);
  assert.deepEqual(a.colors,b.colors);
});

test('distinct anatomical profiles generate distinct voxel volumes',()=>{
  const fish=buildVoxelCreatureGeometry('clownfish');
  const ray=buildVoxelCreatureGeometry('manta');
  const jelly=buildVoxelCreatureGeometry('jellyfish');
  const crab=buildVoxelCreatureGeometry('crab');
  assert.equal(ray.profile,'ray');
  assert.equal(jelly.profile,'jelly');
  assert.equal(crab.profile,'crustacean');
  assert.notEqual(fish.voxelCount,ray.voxelCount);
  assert.notEqual(fish.faceCount,jelly.faceCount);
  assert.notEqual(crab.faceCount,ray.faceCount);
});

test('species mix filtering includes procedural species and excludes unknown names',()=>{
  const mix=filterToProceduralVoxelSpecies({clownfish:40,manta:20,notARealFish:40,crab:0});
  assert.deepEqual(mix,{clownfish:40,manta:20});
});

test('animation phase advances continuously from existing fish identity',()=>{
  const fish={id:17,species:'clownfish'};
  advanceVoxelCreatureAnimation(fish,1/60);
  const first=fish._marinePhase;
  advanceVoxelCreatureAnimation(fish,1/60);
  assert.ok(fish._marinePhase>first);
  assert.ok(Number.isFinite(fish._marinePulsePhase));
});

test('renderer integration uses procedural voxels and never loads creature GLBs',async()=>{
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(new URL('../schooling.html',import.meta.url),'utf8');
  assert.match(source,/procedural-voxel-creature-renderer\.js/);
  assert.match(source,/new voxels\.ProceduralVoxelCreatureRenderer/);
  assert.match(source,/drawFish\(fish\)\{\s*\/\/ All creatures are drawn by the Three\.js model layer\.[\s\S]*?return;/);
  assert.doesNotMatch(source,/osmocean-marine-models\.js|instanced-marine-school-renderer\.js/);
});
