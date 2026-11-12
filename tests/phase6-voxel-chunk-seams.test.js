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

test('adjacent streamed voxel chunks share identical boundary edges',()=>{
  const options={
    chunkSize:32,seed:6102026,worldSize:{x:100,y:100,z:100},
    minY:-14.2,maxY:-5.2,cellSize:1,includeStreamRocks:false
  };
  const left=buildVoxelTerrainChunk({...options,chunkX:0,chunkZ:0});
  const right=buildVoxelTerrainChunk({...options,chunkX:1,chunkZ:0});
  const leftEdges=edgeSet(left),rightEdges=edgeSet(right);
  const shared=[...leftEdges].filter(edge=>rightEdges.has(edge));
  assert.ok(left.triangleCount>1000&&right.triangleCount>1000);
  assert.ok(shared.length>=30,'two-cell halo and global jitter should preserve the shared chunk seam');
});
