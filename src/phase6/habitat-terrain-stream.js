/**
 * Worker-backed voxel terrain for the live Canvas habitat.
 *
 * The worker samples the same signed-distance field as creature contact. This
 * module only schedules chunks and rasterises completed triangles into cached
 * screen-space tiles; it never mutates simulation state.
 */
import { selectTerrainChunks } from './streamed-voxel-terrain.js';
import { classifyHabitatBiome } from './biomes.js';

const TERRAIN_SEED = 6102026;
const CELL_SIZE = 0.5;
const MIN_Y = -14.2;
const MAX_Y = -5.2;

function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

function terrainColour(normal,position){
  const up=clamp(normal[1],0,1);
  const light=Math.max(0,normal[0]*-.28+normal[1]*.82+normal[2]*.49);
  const sediment=clamp((up-.68)*2.6,0,1);
  const height=clamp((position[1]+11.5)/5,0,1);
  const biome=classifyHabitatBiome(position[0],position[2],{y:position[1],normalY:up});
  const palettes={
    'coral-reef':{rock:[58,75,64],sand:[139,126,94],deep:[27,43,40]},
    'kelp-forest':{rock:[48,75,57],sand:[111,128,82],deep:[19,39,35]},
    'seagrass-meadow':{rock:[78,82,65],sand:[153,140,105],deep:[39,49,39]},
    'sponge-garden':{rock:[43,64,66],sand:[104,119,105],deep:[17,34,43]},
    'rocky-ravine':{rock:[48,62,69],sand:[93,106,108],deep:[16,29,38]},
    'open-sand':{rock:[70,75,67],sand:[145,137,108],deep:[31,43,39]}
  };
  const palette=palettes[biome]??palettes['open-sand'];
  const base=palette.rock.map((value,index)=>value*(1-sediment)+palette.sand[index]*sediment);
  return 'rgb('+base.map((value,index)=>Math.round((value*(.68+light*.38)+palette.deep[index]*.12)*(.92+height*.08))).join(',')+')';
}

export function createHabitatVoxelTerrainStream({
  worldSize={x:100,y:100,z:100},workerCount=2,chunkSize=32,radius=2,
  prefetchRadius=3,maxChunks=49,onUpdate=()=>{}
}={}){
  if(!worldSize||![worldSize.x,worldSize.y,worldSize.z].every(value=>Number.isFinite(value)&&value>0)){
    throw new RangeError('worldSize must contain positive finite XYZ dimensions.');
  }
  if(!Number.isInteger(workerCount)||workerCount<1||workerCount>4)throw new RangeError('workerCount must be between one and four.');
  if(!Number.isInteger(chunkSize)||chunkSize<8||!Number.isInteger(radius)||radius<0||
    !Number.isInteger(prefetchRadius)||prefetchRadius<radius||!Number.isInteger(maxChunks)||maxChunks<1){
    throw new RangeError('Invalid habitat terrain chunk dimensions or radii.');
  }
  const workers=[],chunks=new Map(),queue=[];
  let sequence=0,disposed=false,lastFocus={x:NaN,z:NaN};
  const size={...worldSize};

  function stats(){
    const visible=[...chunks.values()].filter(item=>item.visible&&item.mesh);
    return {
      loaded:[...chunks.values()].filter(item=>item.mesh).length,
      pending:workers.some(slot=>!slot.failed)?queue.length+workers.filter(slot=>slot.busy).length:0,
      visible:visible.length,
      triangles:visible.reduce((sum,item)=>sum+(item.mesh?.triangleCount??0),0),
      failed:[...chunks.values()].filter(item=>item.error).length,
      focus:{...lastFocus}
    };
  }
  function report(){onUpdate(stats());}
  function dispatch(){
    if(disposed)return;
    for(const slot of workers){
      if(slot.busy||slot.failed||!queue.length)continue;
      const job=queue.shift(),item=chunks.get(job.key);
      if(!item||item.token!==job.token)continue;
      slot.busy=true;slot.key=job.key;
      try{slot.worker.postMessage({
        type:'generate-chunk',key:job.key,token:job.token,
        chunkX:job.x,chunkZ:job.z,chunkSize,seed:TERRAIN_SEED,
        worldSize:size,minY:MIN_Y,maxY:MAX_Y,cellSize:CELL_SIZE,
        includeStreamRocks:false
      });}catch(error){slot.busy=false;slot.failed=true;item.error=String(error?.message??error);slot.key=null;}
    }
    report();
  }
  function handleMessage(slot,event){
    slot.busy=false;
    const message=event.data??{},item=chunks.get(message.key);
    if(item&&item.token===message.token&&message.type==='complete'){
      item.mesh=message.mesh;item.projection=null;item.error=null;
    }else if(item&&item.token===message.token&&message.type==='error'){
      item.error=message.message||'Habitat terrain worker failed';
    }
    slot.key=null;dispatch();
  }
  for(let index=0;index<workerCount;index++){
    const worker=new Worker(new URL('./streamed-voxel-worker.js',import.meta.url),{type:'module'});
    const slot={worker,busy:false,failed:false,key:null};
    worker.addEventListener('message',event=>handleMessage(slot,event));
    worker.addEventListener('error',event=>{
      slot.busy=false;slot.failed=true;
      const item=slot.key?chunks.get(slot.key):null;
      if(item)item.error=event.message||'Habitat terrain worker failed';
      slot.key=null;dispatch();
    });
    workers.push(slot);
  }

  function update({x=0,z=0,forwardX=0,forwardZ=0}={}){
    if(disposed)return;
    const desired=selectTerrainChunks({x,z,forwardX,forwardZ,chunkSize,radius,prefetchRadius});
    const keep=new Set(desired.map(item=>item.key));
    for(const [key] of chunks)if(!keep.has(key))chunks.delete(key);
    const byKey=new Map(desired.map(item=>[item.key,item]));
    for(let index=queue.length-1;index>=0;index--){
      const request=byKey.get(queue[index].key);
      if(!request)queue.splice(index,1);
      else{queue[index].priority=request.priority;queue[index].visible=request.visible;}
    }
    for(const request of desired){
      let item=chunks.get(request.key);
      if(item){item.visible=request.visible;continue;}
      item={token:++sequence,visible:request.visible,mesh:null,projection:null,error:null};
      chunks.set(request.key,item);queue.push({...request,token:item.token});
    }
    queue.sort((a,b)=>a.priority-b.priority);
    while(chunks.size>maxChunks){
      const candidate=[...chunks.entries()].find(([key])=>!keep.has(key));
      if(!candidate)break;
      chunks.delete(candidate[0]);
    }
    lastFocus={x,z};dispatch();
  }

  function rasterise(item,project,width,height,zoom){
    const key=[width,height,zoom].join(':');
    if(item.projection?.key===key)return item.projection;
    const {positions,normals,indices}=item.mesh;
    const projected=new Array(positions.length/3);
    for(let index=0;index<projected.length;index++){
      const offset=index*3;
      projected[index]=project({x:positions[offset],y:positions[offset+1],z:positions[offset+2]});
    }
    const triangles=[];
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,depthTotal=0;
    for(let index=0;index<indices.length;index+=3){
      const ia=indices[index],ib=indices[index+1],ic=indices[index+2];
      const a=projected[ia],b=projected[ib],c=projected[ic];
      if(!a||!b||!c||a.depth<2.5&&b.depth<2.5&&c.depth<2.5)continue;
      if(![a.x,a.y,b.x,b.y,c.x,c.y].every(Number.isFinite))continue;
      const pa=ia*3,pb=ib*3,pc=ic*3;
      const normal=[
        (normals[pa]+normals[pb]+normals[pc])/3,
        (normals[pa+1]+normals[pb+1]+normals[pc+1])/3,
        (normals[pa+2]+normals[pb+2]+normals[pc+2])/3
      ];
      const centre=[
        (positions[pa]+positions[pb]+positions[pc])/3,
        (positions[pa+1]+positions[pb+1]+positions[pc+1])/3,
        (positions[pa+2]+positions[pb+2]+positions[pc+2])/3
      ];
      const depth=(a.depth+b.depth+c.depth)/3;
      triangles.push({a,b,c,depth,fill:terrainColour(normal,centre)});depthTotal+=depth;
      minX=Math.min(minX,a.x,b.x,c.x);maxX=Math.max(maxX,a.x,b.x,c.x);
      minY=Math.min(minY,a.y,b.y,c.y);maxY=Math.max(maxY,a.y,b.y,c.y);
    }
    if(!triangles.length){item.projection={key,canvas:null,left:0,top:0};return item.projection;}
    const left=Math.max(0,Math.floor(minX)),top=Math.max(0,Math.floor(minY));
    const right=Math.min(width,Math.ceil(maxX)),bottom=Math.min(height,Math.ceil(maxY));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,right-left);canvas.height=Math.max(1,bottom-top);
    const context=canvas.getContext('2d');
    triangles.sort((a,b)=>b.depth-a.depth);
    for(const triangle of triangles){
      context.beginPath();
      context.moveTo(triangle.a.x-left,triangle.a.y-top);
      context.lineTo(triangle.b.x-left,triangle.b.y-top);
      context.lineTo(triangle.c.x-left,triangle.c.y-top);
      context.closePath();context.fillStyle=triangle.fill;context.fill();
    }
    item.projection={key,canvas,left,top,depth:depthTotal/triangles.length};
    return item.projection;
  }

  function draw(context,project,width,height,zoom=1){
    let rendered=0,triangles=0;
    const drawables=[];
    for(const item of chunks.values()){
      if(!item.visible||!item.mesh)continue;
      const raster=rasterise(item,project,width,height,zoom);
      if(!raster.canvas)continue;
      drawables.push(raster);triangles+=item.mesh.triangleCount;
    }
    drawables.sort((a,b)=>b.depth-a.depth);
    for(const raster of drawables){
      context.drawImage(raster.canvas,raster.left,raster.top);
      rendered++;
    }
    return {...stats(),visible:rendered,triangles};
  }

  function dispose(){
    if(disposed)return;
    disposed=true;
    for(const slot of workers)slot.worker.terminate();
    workers.length=0;chunks.clear();queue.length=0;
  }

  update({x:0,z:0,forwardX:0,forwardZ:-1});
  return Object.freeze({update,draw,dispose,get stats(){return stats();}});
}
