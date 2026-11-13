import test from 'node:test';
import assert from 'node:assert/strict';
import { createHabitatVoxelTerrainStream } from '../src/phase6/habitat-terrain-stream.js';

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
    assert.ok(jobs.every(job=>job.cellSize===0.8&&job.minY===-14.4&&job.maxY===-5.6));
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
    const context={drawImage(...args){draws.push(args);}};
    const project=point=>({x:50+point.x,y:50+point.z,depth:20,size:2});
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
    const project=point=>({x:50+point.x,y:50+point.z,depth:20,size:2});
    const first=stream.draw(context,project,100,100,1);
    const second=stream.draw(context,project,100,100,1);
    assert.equal(first.visible,2);
    assert.equal(second.visible,3);
    // A zoom invalidates all three projected tiles, but the two-tile refresh
    // budget must not make the third previously visible chunk disappear.
    const zoomed=stream.draw(context,project,100,100,1.5);
    assert.equal(zoomed.visible,3);
    assert.ok(transforms.includes('save'));
    assert.ok(transforms.includes('restore'));
    assert.ok(transforms.some(entry=>Array.isArray(entry)&&entry[0]==='scale'&&entry[1]===1.5));
    stream.dispose();
  });
});
