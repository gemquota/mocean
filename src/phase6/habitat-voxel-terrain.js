import { classifyHabitatBiome } from './biomes.js';
import { buildDualContourSurface } from './dual-contouring.js';
import { createHabitatVoxelField } from './voxel-field.js';
import { seabedHeight } from '../schooling.js';

export function createHabitatVoxelTerrain(worldSize={x:41,y:15.5,z:31}){
 const halfX=worldSize.x*.5+4,halfZ=worldSize.z*.5+4;
 const minY=-8.9-worldSize.y*.42,maxY=-8.9+worldSize.y*.28;
 const field=createHabitatVoxelField(worldSize,seabedHeight);
 const nx=Math.max(82,Math.round(worldSize.x*2)),nz=Math.max(64,Math.round(worldSize.z*2.05)),ny=32;
 const mesh=buildDualContourSurface({
  min:[-halfX,minY,-halfZ],max:[halfX,maxY,halfZ],
  cells:[nx,ny,nz],sampleDistance:field
 });
 return {mesh,field,worldSize:{...worldSize},stats:{vertices:mesh.vertexCount,triangles:mesh.triangleCount,cells:mesh.cells}};
}

let terrainCache=null,projectionCache=null;
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function shade(normal,position){
 const up=clamp(normal[1],0,1),light=Math.max(0,normal[0]*-.28+normal[1]*.82+normal[2]*.49);
 const sediment=clamp((up-.68)*2.6,0,1),height=clamp((position[1]+11.5)/5,0,1);
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
 const base=palette.rock.map((v,i)=>v*(1-sediment)+palette.sand[i]*sediment);
 return 'rgb('+base.map((v,i)=>Math.round((v*(.68+light*.38)+palette.deep[i]*.12)*(0.92+height*.08))).join(',')+')';
}

/** Draw the volumetric seabed into the habitat's fixed-camera canvas. */
export function drawHabitatVoxelTerrain(ctx,project,width,height,zoom,worldSize,stream=null){
 if(stream){
  const workerState=stream.stats;
  if(workerState.failed>0&&workerState.pending===0){
   return drawHabitatVoxelTerrain(ctx,project,width,height,zoom,worldSize,null);
  }
  const streamed=stream.draw(ctx,project,width,height,zoom);
  if(streamed.visible>0)return streamed;
  // A temporary floor silhouette prevents a blank seabed while worker chunks
  // are being generated; it is replaced by the shared voxel surface as soon
  // as the first visible chunk arrives.
  const hx=worldSize.x*.5+4,hz=worldSize.z*.5+4;
  const corners=[project({x:-hx,y:-8.65,z:-hz}),project({x:hx,y:-8.65,z:-hz}),project({x:hx,y:-8.65,z:hz}),project({x:-hx,y:-8.65,z:hz})];
  ctx.beginPath();ctx.moveTo(corners[0].x,corners[0].y);
  for(let index=1;index<corners.length;index++)ctx.lineTo(corners[index].x,corners[index].y);
  ctx.closePath();ctx.fillStyle='#263d37';ctx.fill();
  return streamed;
 }
 const key=[worldSize.x,worldSize.y,worldSize.z,width,height,zoom].join(':');
 if(!terrainCache||terrainCache.worldSize.x!==worldSize.x||terrainCache.worldSize.y!==worldSize.y||terrainCache.worldSize.z!==worldSize.z){
  terrainCache=createHabitatVoxelTerrain(worldSize);projectionCache=null;
 }
 if(projectionCache?.key===key){ctx.drawImage(projectionCache.canvas,0,0,width,height);return terrainCache.stats;}
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width));canvas.height=Math.max(1,Math.round(height));
 const out=canvas.getContext('2d');out.clearRect(0,0,canvas.width,canvas.height);
 const {positions,normals,indices}=terrainCache.mesh,triangles=[];
 for(let i=0;i<indices.length;i+=3){
  const ia=indices[i],ib=indices[i+1],ic=indices[i+2],a=ia*3,b=ib*3,c=ic*3;
  const pa=[positions[a],positions[a+1],positions[a+2]],pb=[positions[b],positions[b+1],positions[b+2]],pc=[positions[c],positions[c+1],positions[c+2]];
  const sa=project({x:pa[0],y:pa[1],z:pa[2]}),sb=project({x:pb[0],y:pb[1],z:pb[2]}),sc=project({x:pc[0],y:pc[1],z:pc[2]});
  if(sa.depth<2.5&&sb.depth<2.5&&sc.depth<2.5)continue;
  const n=[(normals[a]+normals[b]+normals[c])/3,(normals[a+1]+normals[b+1]+normals[c+1])/3,(normals[a+2]+normals[b+2]+normals[c+2])/3];
  const centre=[(pa[0]+pb[0]+pc[0])/3,(pa[1]+pb[1]+pc[1])/3,(pa[2]+pb[2]+pc[2])/3];
  triangles.push({a:sa,b:sb,c:sc,depth:(sa.depth+sb.depth+sc.depth)/3,fill:shade(n,centre)});
 }
 triangles.sort((a,b)=>b.depth-a.depth);
 for(const tri of triangles){
  if([tri.a,tri.b,tri.c].some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))continue;
  out.beginPath();out.moveTo(tri.a.x,tri.a.y);out.lineTo(tri.b.x,tri.b.y);out.lineTo(tri.c.x,tri.c.y);out.closePath();
  out.fillStyle=tri.fill;out.fill();
 }
 projectionCache={key,canvas};
 ctx.drawImage(canvas,0,0,width,height);
 return terrainCache.stats;
}

export function invalidateHabitatVoxelProjection(){projectionCache=null;}
