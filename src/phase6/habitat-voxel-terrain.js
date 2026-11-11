import { buildDualContourSurface } from './dual-contouring.js';
import { createHabitatVoxelField } from './voxel-field.js';
import { seabedHeight } from '../schooling.js';

/** Draw the true volumetric seabed into the habitat's existing fixed-camera canvas. */
export function drawHabitatVoxelTerrain(ctx,project,width,height,zoom,worldSize){
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
 out.lineJoin='round';
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
