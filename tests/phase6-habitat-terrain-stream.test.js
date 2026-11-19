import test from 'node:test';
import assert from 'node:assert/strict';
import { createHabitatVoxelTerrainStream, terrainColour, terrainDetailForCellSize } from '../src/phase6/habitat-terrain-stream.js';

class FakeWorker {
  static instances=[];
  constructor(){this.listeners={};this.messages=[];this.terminated=false;FakeWorker.instances.push(this);}
  addEventListener(type,callback){this.listeners[type]=callback;}
  postMessage(message){this.messages.push(message);}
  terminate(){this.terminated=true;}
}

function withBrowserGlobals(run){
  const previousWorker=globalThis.Worker,previousDocument=globalThis.document;
  globalThis.Worker=FakeWorker;
  globalThis.document={createElement(){
    return {width:0,height:0,getContext(){return {
      beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){}
    };}};
  }};
  try{return run();}finally{
    if(previousWorker===undefined)delete globalThis.Worker;else globalThis.Worker=previousWorker;
    if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
    FakeWorker.instances=[];
  }
}

test('live habitat terrain workers use the shared voxel field and a bounded visible/prefetch set',()=>{
  withBrowserGlobals(()=>{
    const stream=createHabitatVoxelTerrainStream({worldSize:{x:100,y:100,z:100},workerCount:2});
    assert.equal(FakeWorker.instances.length,2);
    const jobs=FakeWorker.instances.flatMap(worker=>worker.messages);
    assert.equal(jobs.length,2);
    assert.ok(jobs.every(job=>job.type==='generate-chunk'));
    assert.ok(jobs.every(job=>job.includeStreamRocks===false));
    assert.ok(jobs.every(job=>job.cellSize===0.8&&job.minY===-17.6&&job.maxY===-4.8));
    assert.ok(jobs.every(job=>job.worldSize.x===100&&job.worldSize.y===100&&job.worldSize.z===100));
    assert.ok(stream.stats.pending>0);
    stream.dispose();
    assert.ok(FakeWorker.instances.every(worker=>worker.terminated));
  });
});

test('completed visible terrain chunks are projected and cached for the Canvas habitat',()=>{
  withBrowserGlobals(()=>{
    const stream=createHabitatVoxelTerrainStream({workerCount:1});
    const worker=FakeWorker.instances[0],job=worker.messages[0];
    worker.listeners.message({data:{
      type:'complete',key:job.key,token:job.token,
      mesh:{
        positions:new Float32Array([0,-8,0,1,-8,0,0,-8,1]),
        normals:new Float32Array([0,1,0,0,1,0,0,1,0]),
        indices:new Uint32Array([0,1,2]),vertexCount:3,triangleCount:1
      }
    }});
    const draws=[];
    const context={drawImage(...args){draws.push(args);},save(){},restore(){},translate(){},scale(){}};
    let projectedVertices=0;
    const project=(point,projectionZoom)=>{projectedVertices++;assert.equal(projectionZoom,1);return {x:50+point.x,y:50+point.z,depth:20,size:2};};
    const first=stream.draw(context,project,100,100,1);
    const second=stream.draw(context,project,100,100,1);
    assert.equal(first.visible,1);
    assert.equal(first.triangles,1);
    assert.equal(second.visible,1);
    assert.equal(draws.length,2);
    stream.dispose();
  });
});

test('visible chunk rasterisation is spread across frames to avoid a large main-thread burst',()=>{
  withBrowserGlobals(()=>{
    const stream=createHabitatVoxelTerrainStream({workerCount:3});
    const jobs=FakeWorker.instances.map(worker=>worker.messages[0]);
    const mesh={
      positions:new Float32Array([0,-8,0,1,-8,0,0,-8,1]),
      normals:new Float32Array([0,1,0,0,1,0,0,1,0]),
      indices:new Uint32Array([0,1,2]),vertexCount:3,triangleCount:1
    };
    for(let index=0;index<jobs.length;index++){
      const job=jobs[index];
      FakeWorker.instances[index].listeners.message({data:{type:'complete',key:job.key,token:job.token,mesh}});
    }
    const transforms=[];
    const context={drawImage(){},save(){transforms.push('save');},restore(){transforms.push('restore');},translate(x,y){transforms.push(['translate',x,y]);},scale(x,y){transforms.push(['scale',x,y]);}};
    let projectedVertices=0;
    const project=(point,projectionZoom)=>{projectedVertices++;assert.equal(projectionZoom,1);return {x:50+point.x,y:50+point.z,depth:20,size:2};};
    const first=stream.draw(context,project,100,100,1);
    const second=stream.draw(context,project,100,100,1);
    assert.equal(first.visible,2);
    assert.equal(second.visible,3);
    // Zoom must reuse all cached base-projection tiles without re-projecting vertices.
    const projectedAtRest=projectedVertices;
    const zoomed=stream.draw(context,project,100,100,1.5);
    assert.equal(zoomed.visible,3);
    assert.equal(projectedVertices,projectedAtRest,'zoom must reuse the world-aligned terrain projection cache');
    assert.ok(transforms.includes('save'));
    assert.ok(transforms.includes('restore'));
    assert.ok(transforms.some(entry=>Array.isArray(entry)&&entry[0]==='scale'&&entry[1]===1.5));
    // The camera's projected vertical centre is 52% of viewport height.
    // Fallback tiles must scale around the same point to avoid visible drift.
    assert.ok(transforms.some(entry=>Array.isArray(entry)&&entry[0]==='translate'&&entry[1]===50&&entry[2]===52));
    stream.dispose();
  });
});

test('completed terrain chunks attach as native world-space Three.js meshes',()=>{
  withBrowserGlobals(()=>{
    const stream=createHabitatVoxelTerrainStream({workerCount:1});
    const worker=FakeWorker.instances[0],job=worker.messages[0];
    const positions=new Float32Array([12,-8,-7,13,-8,-7,12,-8,-6]);
    const normals=new Float32Array([0,1,0,0,1,0,0,1,0]);
    const indices=new Uint32Array([0,1,2]);
    worker.listeners.message({data:{type:'complete',key:job.key,token:job.token,mesh:{positions,normals,indices,vertexCount:3,triangleCount:1}}});
    class Attribute{constructor(array,itemSize){this.array=array;this.itemSize=itemSize;}}
    class Geometry{
      constructor(){this.attributes={};this.disposed=false;}
      setAttribute(name,value){this.attributes[name]=value;}
      setIndex(value){this.index=value;}
      computeBoundingSphere(){}
      dispose(){this.disposed=true;}
    }
    class Colour{
      constructor(){this.r=0;this.g=0;this.b=0;}
      setStyle(value){const match=/rgb\((\d+),(\d+),(\d+)\)/.exec(value);this.r=Number(match?.[1]??0)/255;this.g=Number(match?.[2]??0)/255;this.b=Number(match?.[3]??0)/255;return this;}
    }
    class Material{constructor(options){Object.assign(this,options);this.opacity=1;this.disposed=false;}dispose(){this.disposed=true;}}
    class Mesh{constructor(geometry,material){this.geometry=geometry;this.material=material;}}
    const THREE={BufferGeometry:Geometry,BufferAttribute:Attribute,Color:Colour,MeshStandardMaterial:Material,Mesh};
    const scene={children:[],add(mesh){this.children.push(mesh);},remove(mesh){this.children=this.children.filter(item=>item!==mesh);}};
    assert.equal(stream.getVisibleMeshes().length,1,'planetary overview can consume the same visible chunk mesh');
    assert.equal(stream.attachRenderer(THREE,scene),true);
    assert.equal(scene.children.length,1);
    const object=scene.children[0];
    assert.equal(object.geometry.attributes.position.array,positions,'terrain vertices remain in the shared habitat coordinate frame');
    assert.equal(object.geometry.attributes.normal.array,normals);
    assert.equal(object.geometry.index.array,indices);
    assert.equal(object.material.vertexColors,true);
    stream.setOpacity(.45);
    assert.equal(object.material.opacity,.45);
    const draws=[];
    const stats=stream.draw({drawImage(...args){draws.push(args);}},()=>{throw new Error('Canvas projection must not run when native rendering is attached');},100,100,1);
    assert.equal(stats.visible,1);
    assert.equal(draws.length,0);
    const attachedMaterial=object.material;
    assert.equal(stream.detachRenderer(),true);
    assert.equal(scene.children.length,0);
    assert.equal(object.geometry.disposed,true);
    assert.equal(attachedMaterial.disposed,true);
    const fallbackDraws=[];
    const fallback=stream.draw({drawImage(...args){fallbackDraws.push(args);},save(){},restore(){},translate(){},scale(){}},
      point=>({x:50+point.x,y:50+point.z,depth:20,size:2}),100,100,1);
    assert.equal(fallback.visible,1,'detaching WebGL restores the Canvas fallback');
    assert.equal(fallbackDraws.length,1);
    stream.dispose();
  });
});

test('planetary streaming can move beyond local habitat bounds while retaining a bounded chunk cache',()=>{
  withBrowserGlobals(()=>{
    const stream=createHabitatVoxelTerrainStream({
      worldSize:{x:100,y:100,z:100},workerCount:2,chunkSize:32,
      radius:1,prefetchRadius:1,maxChunks:9,unbounded:true,includeStreamRocks:true
    });
    stream.update({x:320,z:-320,forwardX:1,forwardZ:0});
    // Release the two origin jobs so the worker pool can dispatch the remote queue.
    for(const worker of FakeWorker.instances){
      const job=worker.messages[0];
      worker.listeners.message({data:{type:'complete',key:job.key,token:job.token,mesh:{
        positions:new Float32Array(0),normals:new Float32Array(0),indices:new Uint32Array(0),vertexCount:0,triangleCount:0
      }}});
    }
    const jobs=FakeWorker.instances.flatMap(worker=>worker.messages);
    assert.ok(jobs.some(job=>job.chunkX>=9&&job.chunkZ<=-9),'focus outside the original 100 m habitat must still request chunks');
    assert.ok(jobs.every(job=>job.includeStreamRocks===true),'planetary chunks receive deterministic per-chunk geology');
    assert.ok(stream.stats.pending<=11,'two in-flight obsolete worker jobs plus the nine-chunk replacement window are bounded');
    stream.dispose();
  });
});


test('geology and ecology LODs progressively reveal material detail on the same terrain field',()=>{
 const coarse=terrainDetailForCellSize(3.2),geology=terrainDetailForCellSize(1.6),ecology=terrainDetailForCellSize(.8);
 assert.equal(coarse,0);
 assert.equal(geology,.5);
 assert.equal(ecology,1);
 const normal=[0,1,0],position=[12,-8,7];
 const coarseColour=terrainColour(normal,position,coarse);
 const geologyColour=terrainColour(normal,position,geology);
 const ecologyColour=terrainColour(normal,position,ecology);
 assert.notEqual(coarseColour,geologyColour);
 assert.notEqual(geologyColour,ecologyColour);
 assert.notEqual(coarseColour,ecologyColour);
 assert.throws(()=>terrainDetailForCellSize(2),RangeError);
});

test('voxel terrain colour distinguishes sediment, exposed strata and steep rock faces',()=>{
 const sand=terrainColour([0,1,0],[12,-8,7]);
 const cliff=terrainColour([.92,.12,.36],[12,-8,7]);
 const upper=terrainColour([0,1,0],[12,-5,7]);
 assert.match(sand,/^rgb\(\d+,\d+,\d+\)$/);
 assert.match(cliff,/^rgb\(\d+,\d+,\d+\)$/);
 assert.match(upper,/^rgb\(\d+,\d+,\d+\)$/);
 assert.notEqual(sand,cliff,'steep faces should read darker and more mineral-rich');
 assert.notEqual(sand,upper,'vertical strata and height should change the surface palette');
 assert.equal(sand,terrainColour([0,1,0],[12,-8,7]),'colour remains deterministic');
});
