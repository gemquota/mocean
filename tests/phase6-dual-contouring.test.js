import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDualContourSurface, sphereSdf, smoothUnion } from '../src/phase6/dual-contouring.js';

test('dual contouring extracts a finite closed sphere surface inside the grid',()=>{
 const mesh=buildDualContourSurface({min:[-2,-2,-2],max:[2,2,2],cells:[24,24,24],sampleDistance:(x,y,z)=>sphereSdf(x,y,z,0,0,0,1.25)});
 assert.ok(mesh.vertexCount>100);
 assert.ok(mesh.triangleCount>100);
 assert.equal(mesh.positions.length,mesh.normals.length);
 assert.ok([...mesh.positions,...mesh.normals].every(Number.isFinite));
 assert.ok([...mesh.indices].every(i=>i<mesh.vertexCount));
 assert.ok(mesh.positions.every((v,i)=>Math.abs(v)<=1.6));
});
test('dual contouring supports hollow caves and overhang-like density fields',()=>{
 const field=(x,y,z)=>smoothUnion(sphereSdf(x,y,z,0,-1,0,2),- (Math.hypot(x,z)-.48),.35);
 const mesh=buildDualContourSurface({min:[-3,-3,-3],max:[3,3,3],cells:[30,30,30],sampleDistance:field});
 assert.ok(mesh.vertexCount>0&&mesh.triangleCount>0);
});
test('dual contouring rejects invalid bounds, resolution and density samples',()=>{
 assert.throws(()=>buildDualContourSurface({cells:[1,2,2],sampleDistance:()=>1}),RangeError);
 assert.throws(()=>buildDualContourSurface({sampleDistance:()=>NaN}),/non-finite/);
 assert.throws(()=>buildDualContourSurface({sampleDistance:null}),TypeError);
});
