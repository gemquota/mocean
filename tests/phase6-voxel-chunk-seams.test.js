import test from 'node:test';
import assert from 'node:assert/strict';

const previousSelf=globalThis.self;
globalThis.self={addEventListener(){}};
const {buildVoxelTerrainChunk}=await import('../src/phase6/streamed-voxel-worker.js?seam-regression');
if(previousSelf===undefined)delete globalThis.self;else globalThis.self=previousSelf;

function edgeSet(mesh){
  const edges=new Set(),positions=mesh.positions,indices=mesh.indices;
  const point=index=>{
    const offset=index*3;
    return [positions[offset],positions[offset+1],positions[offset+2]]
      .map(value=>Math.round(value*1000)/1000).join(',');
  };
  for(let index=0;index<indices.length;index+=3){
    for(const [a,b] of [[indices[index],indices[index+1]],[indices[index+1],indices[index+2]],[indices[index+2],indices[index]]]){
      const pa=point(a),pb=point(b);
      edges.add(pa<pb?pa+'|'+pb:pb+'|'+pa);
    }
  }
  return edges;
}

function pointKey(mesh,index){
  const offset=index*3;
  return [mesh.positions[offset],mesh.positions[offset+1],mesh.positions[offset+2]]
    .map(value=>Math.round(value*1000)/1000).join(',');
}

function seamEdgeIncidence(meshes){
  const incidence=new Map();
  for(const mesh of meshes){
    const {positions,indices}=mesh;
    for(let index=0;index<indices.length;index+=3){
      const triangle=[indices[index],indices[index+1],indices[index+2]];
      for(const [a,b] of [[triangle[0],triangle[1]],[triangle[1],triangle[2]],[triangle[2],triangle[0]]]){
        const ax=positions[a*3],ay=positions[a*3+1],az=positions[a*3+2];
        const bx=positions[b*3],by=positions[b*3+1],bz=positions[b*3+2];
        const midpointX=(ax+bx)*.5,midpointY=(ay+by)*.5,midpointZ=(az+bz)*.5;
        // Inspect only the interior seam band. Exclude the outer chunk halo,
        // top/bottom extraction limits and z-side boundaries.
        if(midpointX<31||midpointX>33||midpointY<-13.2||midpointY>-6.2||midpointZ<2||midpointZ>30)continue;
        const pa=pointKey(mesh,a),pb=pointKey(mesh,b),key=pa<pb?pa+'|'+pb:pb+'|'+pa;
        incidence.set(key,(incidence.get(key)||0)+1);
      }
    }
  }
  return incidence;
}

const options={
  chunkSize:32,seed:6102026,worldSize:{x:100,y:100,z:100},
  minY:-14.2,maxY:-5.2,cellSize:1,includeStreamRocks:false
};

test('adjacent streamed voxel chunks share identical boundary edges',()=>{
  const left=buildVoxelTerrainChunk({...options,chunkX:0,chunkZ:0});
  const right=buildVoxelTerrainChunk({...options,chunkX:1,chunkZ:0});
  const leftEdges=edgeSet(left),rightEdges=edgeSet(right);
  const shared=[...leftEdges].filter(edge=>rightEdges.has(edge));
  assert.ok(left.triangleCount>1000&&right.triangleCount>1000);
  assert.ok(shared.length>=30,'two-cell halo and global jitter should preserve the shared chunk seam');
});

test('combined adjacent chunks have two incident faces on every interior seam edge',()=>{
  const left=buildVoxelTerrainChunk({...options,chunkX:0,chunkZ:0});
  const right=buildVoxelTerrainChunk({...options,chunkX:1,chunkZ:0});
  const incidence=seamEdgeIncidence([left,right]);
  assert.ok(incidence.size>=20,'the seam band must contain a useful number of mesh edges');
  const open=[...incidence].filter(([,count])=>count!==2);
  assert.deepEqual(open,[],'interior seam edges must have exactly two incident triangles');
});
