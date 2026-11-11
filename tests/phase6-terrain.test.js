import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTerrainFeatures, isInsideArchPassage, terrainFeatureBounds } from '../src/phase6/terrain.js';

test('terrain feature layout is deterministic for a fixed seed', () => {
  const options={seed:42,rockCount:18,archCount:4,floorAt:(x,z)=>-9+Math.sin(x*.1)*.2+Math.cos(z*.1)*.1};
  assert.deepEqual(generateTerrainFeatures(options),generateTerrainFeatures(options));
});

test('terrain features remain within configured horizontal bounds', () => {
  const bounds={minX:-20,maxX:20,minZ:-12,maxZ:12};
  const features=generateTerrainFeatures({seed:77,bounds,rockCount:100,archCount:12});
  for(const item of features.rocks){
    assert.ok(item.x-item.radius>=bounds.minX);
    assert.ok(item.x+item.radius<=bounds.maxX);
    assert.ok(item.z-item.depth>=bounds.minZ);
    assert.ok(item.z+item.depth<=bounds.maxZ);
    assert.ok(item.radius>0&&item.height>0&&item.depth>0);
  }
  for(const item of features.arches){
    assert.ok(item.x-item.radius-1>=bounds.minX);
    assert.ok(item.x+item.radius+1<=bounds.maxX);
    assert.ok(item.z-item.radius-1>=bounds.minZ);
    assert.ok(item.z+item.radius+1<=bounds.maxZ);
    assert.ok(item.tube>0&&item.depth>0);
  }
});

test('terrain generator rejects invalid counts and bounds', () => {
  assert.throws(()=>generateTerrainFeatures({rockCount:-1}),RangeError);
  assert.throws(()=>generateTerrainFeatures({archCount:1.5}),RangeError);
  assert.throws(()=>generateTerrainFeatures({bounds:{minX:2,maxX:2,minZ:-1,maxZ:1}}),RangeError);
});

test('arch passage query distinguishes clear aperture from solid arch material', () => {
  const arch={x:0,z:0,radius:4,tube:.8,depth:3};
  assert.equal(isInsideArchPassage(0,0,arch),true);
  assert.equal(isInsideArchPassage(3.8,0,arch),false);
  assert.equal(isInsideArchPassage(0,1.4,arch),true);
  assert.equal(isInsideArchPassage(0,1.6,arch),false);
  assert.equal(isInsideArchPassage(0,0,arch,3),false);
});

test('terrain feature bounds include rock and arch extents', () => {
  const features={rocks:[{x:0,z:0,radius:2,depth:1}],arches:[]};
  assert.deepEqual(terrainFeatureBounds(features),{minX:-2,maxX:2,minZ:-1,maxZ:1});
  assert.equal(terrainFeatureBounds({rocks:[],arches:[]}),null);
});
