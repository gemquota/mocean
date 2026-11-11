import { buildDualContourSurface, smoothUnion } from './dual-contouring.js';
import { seabedHeight } from '../schooling.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ellipsoid=(x,y,z,cx,cy,cz,rx,ry,rz)=>{
 const k0=Math.hypot((x-cx)/rx,(y-cy)/ry,(z-cz)/rz);
 if(k0<1e-9)return -Math.min(rx,ry,rz);
 const k1=Math.hypot((x-cx)/(rx*rx),(y-cy)/(ry*ry),(z-cz)/(rz*rz));
 return k0*(k0-1)/k1;
};
const capsule=(x,y,z,a,b,r)=>{
 const pax=x-a[0],pay=y-a[1],paz=z-a[2],bax=b[0]-a[0],bay=b[1]-a[1],baz=b[2]-a[2];
 const h=clamp((pax*bax+pay*bay+paz*baz)/(bax*bax+bay*bay+baz*baz||1),0,1);
 return Math.hypot(pax-bax*h,pay-bay*h,paz-baz*h)-r;
};

export function createHabitatVoxelTerrain(worldSize={x:41,y:15.5,z:31}){
 const halfX=worldSize.x*.5+4,halfZ=worldSize.z*.5+4;
 const floorAt=seabedHeight;
 const minY=-8.9-worldSize.y*.42,maxY=-8.9+worldSize.y*.28;
 const field=(x,y,z)=>{
  let solid=y-floorAt(x,z);
  // Broad connected limestone masses create real ledges and overhanging shoulders.
  solid=smoothUnion(solid,ellipsoid(x,y,z,-13,-8.15,-5,6.1,2.1,4.8),1.15);
  solid=smoothUnion(solid,ellipsoid(x,y,z,1,-8.05,7,7.0,2.25,5.0),1.25);
  solid=smoothUnion(solid,ellipsoid(x,y,z,15,-8.35,-7,4.8,1.8,5.2),.95);
  solid=smoothUnion(solid,ellipsoid(x,y,z,-2,-8.25,-13,5.2,1.9,3.0),.9);
  // Subtract connected tunnels and chambers from the solid volume.
  const caveA=capsule(x,y,z,[-19,-9.05,-5],[-8,-9.25,-5],1.35);
  const caveB=capsule(x,y,z,[2,-9.25,7],[14,-9.35,7],1.25);
  const chamber=ellipsoid(x,y,z,-4,-9.5,1,2.15,1.65,2.25);
  const cave=Math.min(caveA,caveB,chamber);
  return Math.max(solid,-cave);
 };
 const nx=Math.max(64,Math.round(worldSize.x*1.6)),nz=Math.max(48,Math.round(worldSize.z*1.65)),ny=26;
 const mesh=buildDualContourSurface({
  min:[-halfX,minY,-halfZ],max:[halfX,maxY,halfZ],
  cells:[nx,ny,nz],sampleDistance:field
 });
 return {mesh,field,worldSize:{...worldSize},stats:{vertices:mesh.vertexCount,triangles:mesh.triangleCount,cells:mesh.cells}};
}

let terrainCache=null,projectionCache=null;
function shade(normal,position){
 const up=clamp(normal[1],0,1),light=Math.max(0,normal[0]*-.28+normal[1]*.82+normal[2]*.49);
 const sediment=clamp((up-.68)*2.6,0,1),height=clamp((position[1]+11.5)/5,0,1);
 const rock=[42,65,58],sand=[126,119,91],deep=[24,39,38];
 const base=rock.map((v,i)=>v*(1-sediment)+sand[i]*sediment);
 return 'rgb('+base.map((v,i)=>Math.round((v*(.68+light*.38)+deep[i]*.12)*(0.92+height*.08))).join(',')+')';
}

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
