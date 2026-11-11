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
 const edges=new Map();
 for(let i=0;i<mesh.indices.length;i+=3){
  const tri=[mesh.indices[i],mesh.indices[i+1],mesh.indices[i+2]];
  const a=tri[0]*3,b=tri[1]*3,c=tri[2]*3;
  const ux=mesh.positions[b]-mesh.positions[a],uy=mesh.positions[b+1]-mesh.positions[a+1],uz=mesh.positions[b+2]-mesh.positions[a+2];
  const vx=mesh.positions[c]-mesh.positions[a],vy=mesh.positions[c+1]-mesh.positions[a+1],vz=mesh.positions[c+2]-mesh.positions[a+2];
  const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  const normalX=mesh.normals[a]+mesh.normals[b]+mesh.normals[c],normalY=mesh.normals[a+1]+mesh.normals[b+1]+mesh.normals[c+1],normalZ=mesh.normals[a+2]+mesh.normals[b+2]+mesh.normals[c+2];
  assert.ok(nx*normalX+ny*normalY+nz*normalZ>0,'triangle winding must face outward');
  for(const [u,v] of [[tri[0],tri[1]],[tri[1],tri[2]],[tri[2],tri[0]]]){const key=u<v?u+':'+v:v+':'+u;edges.set(key,(edges.get(key)||0)+1);}
 }
 assert.ok([...edges.values()].every(count=>count===2),'closed sphere must be watertight');
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
