import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeologicalField } from '../src/phase6/geological-field.js';

test('geological field is deterministic and describes connected formations', () => {
  const a=createGeologicalField({seed:42}),b=createGeologicalField({seed:42});
  for(const [x,z] of [[0,0],[12.5,-8],[-31,19],[42,-27]]) {
    assert.equal(a.sampleHeight(x,z),b.sampleHeight(x,z));
    assert.ok(Number.isFinite(a.sampleDistance(x,-10,z)));
  }
  const layout=a.describe();
  assert.equal(layout.ridges.length,3); assert.equal(layout.ravines.length,2); assert.equal(layout.caves.length,3);
  assert.ok(layout.ridges.every(f=>f.points.length>=2));
  assert.ok(layout.ravines.every(f=>f.points.length>=2));
  assert.ok(layout.caves.every(f=>f.points.length>=2));
  assert.ok(layout.caves.every(f=>f.branches.length>0&&f.branches[0][0]===f.points[5]),
    'branch passages share an exact junction with their main tunnel');
});
test('macro relief has meaningful range and cave paths carve water space', () => {
  const field=createGeologicalField({seed:7}),heights=[];
  for(let z=-32;z<=32;z+=2) for(let x=-44;x<=44;x+=2) heights.push(field.sampleHeight(x,z));
  assert.ok(Math.max(...heights)-Math.min(...heights)>4);
  const cave=field.describe().caves[0],p=cave.points[3];
  assert.ok(field.sampleDistance(p.x,p.y,p.z)>0,'tunnel centre is water');
});
test('field uses positive water and negative solid sign convention', () => {
  const field=createGeologicalField({ridgeCount:0,ravineCount:0,caveCount:0,baseDepth:-12});
  assert.ok(field.sampleDistance(0,5,0)>0);
  assert.ok(field.sampleDistance(0,-20,0)<0);
});
test('seed, feature budgets and query coordinates are validated', () => {
  assert.throws(()=>createGeologicalField({seed:1.5}),TypeError);
  assert.throws(()=>createGeologicalField({ridgeCount:13}),RangeError);
  assert.throws(()=>createGeologicalField({bounds:{minX:1,maxX:1,minZ:0,maxZ:2}}),RangeError);
  const field=createGeologicalField({ridgeCount:0,ravineCount:0,caveCount:0});
  assert.throws(()=>field.sampleHeight(NaN,0),TypeError);
  assert.throws(()=>field.sampleDistance(0,Infinity,0),TypeError);
});

test('ravines form connected tributary networks rather than parallel isolated cuts', () => {
  const field=createGeologicalField({seed:314,ravineCount:3});
  const {ravines}=field.describe();
  assert.ok(ravines.every(r=>r.branches.length===1));
  for(const ravine of ravines) {
    const branch=ravine.branches[0],junction=ravine.points[ravine.junctionIndex];
    assert.equal(branch[0].x,junction.x);
    assert.equal(branch[0].z,junction.z);
    assert.ok(branch.length>=4);
    assert.ok(branch.at(-1).x>field.describe().bounds.minX);
    assert.ok(branch.at(-1).x<field.describe().bounds.maxX);
  }
  const junction=ravines[0].branches[0][0];
  const control=createGeologicalField({seed:314,ravineCount:0});
  assert.ok(field.sampleHeight(junction.x,junction.z)<control.sampleHeight(junction.x,junction.z)-2,
    'ravine network measurably lowers the terrain at its connected junction');
});
