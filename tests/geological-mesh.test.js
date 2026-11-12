import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeologicalField } from '../src/phase6/geological-field.js';
import { buildDualContourSurface } from '../src/phase6/dual-contouring.js';

test('geological field extracts a finite indexed 3D surface', () => {
  const field=createGeologicalField({seed:91,ridgeCount:2,ravineCount:2,caveCount:2});
  const mesh=buildDualContourSurface({
    min:[-18,-20,-15],max:[18,2,15],cells:[36,22,30],
    sampleDistance:(x,y,z)=>field.sampleDistance(x,y,z)
  });
  assert.ok(mesh.vertexCount>100);
  assert.ok(mesh.triangleCount>100);
  assert.equal(mesh.positions.length,mesh.vertexCount*3);
  assert.equal(mesh.normals.length,mesh.vertexCount*3);
  assert.equal(mesh.indices.length,mesh.triangleCount*3);
  assert.ok(mesh.indices.every(index=>index<mesh.vertexCount));
  assert.ok(mesh.positions.every(Number.isFinite));
  assert.ok(mesh.normals.every(Number.isFinite));
});

test('extracted geology contains surfaces above and below the macro seabed', () => {
  const field=createGeologicalField({seed:12,ridgeCount:2,ravineCount:1,caveCount:2});
  const mesh=buildDualContourSurface({
    min:[-20,-22,-16],max:[20,3,16],cells:[40,25,32],
    sampleDistance:(x,y,z)=>field.sampleDistance(x,y,z)
  });
  let minY=Infinity,maxY=-Infinity;
  for(let i=1;i<mesh.positions.length;i+=3) {
    minY=Math.min(minY,mesh.positions[i]);
    maxY=Math.max(maxY,mesh.positions[i]);
  }
  assert.ok(maxY>-10,'ridge and seabed surfaces reach above deep cave region');
  assert.ok(minY<-14,'ravines and cave interiors contribute deeper surfaces');
});

test('column sampling matches point sampling across cave and seabed heights', () => {
  const field=createGeologicalField({seed:6102026});
  for(const [x,z] of [[-31,-12],[0,0],[22,17]]) {
    const column=field.sampleDistanceColumn(x,z);
    for(const y of [-20,-16,-12,-8,-2]) {
      assert.ok(Math.abs(column(y)-field.sampleDistance(x,y,z))<1e-9);
    }
  }
});

test('dual contour extraction accepts an equivalent reusable column sampler', () => {
  const field=createGeologicalField({seed:91,ridgeCount:1,ravineCount:1,caveCount:1});
  const options={min:[-12,-18,-10],max:[12,1,10],cells:[24,19,20]};
  const pointMesh=buildDualContourSurface({...options,sampleDistance:(x,y,z)=>field.sampleDistance(x,y,z)});
  const columnMesh=buildDualContourSurface({...options,
    sampleDistance:(x,y,z)=>field.sampleDistance(x,y,z),
    sampleColumn:(x,z)=>field.sampleDistanceColumn(x,z)
  });
  assert.deepEqual(columnMesh.positions,pointMesh.positions);
  assert.deepEqual(columnMesh.normals,pointMesh.normals);
  assert.deepEqual(columnMesh.indices,pointMesh.indices);
});
