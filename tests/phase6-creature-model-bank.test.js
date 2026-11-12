import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveModelEntry } from '../src/phase6/creature-model-bank.js';

const catalogue={models:[
  {species:'manta',assetId:'5878',file:'manta_ray.glb'},
  {species:'turtle',assetId:'39340',file:'loggerhead_turtle.glb'}
]};

test('model bank resolves only exact naturalistic species assets',()=>{
  assert.equal(resolveModelEntry('manta',catalogue).file,'manta_ray.glb');
  assert.equal(resolveModelEntry('turtle',catalogue).file,'loggerhead_turtle.glb');
  assert.equal(resolveModelEntry('fish',catalogue),null);
  assert.equal(resolveModelEntry('clownfish',catalogue),null);
});

test('model bank refuses similarly named assets with the wrong source ID or file',()=>{
  assert.equal(resolveModelEntry('manta',{models:[{species:'manta',assetId:'5877',file:'manta_ray.glb'}]}),null);
  assert.equal(resolveModelEntry('manta',{models:[{species:'manta',assetId:'5878',file:'stingray.glb'}]}),null);
});
