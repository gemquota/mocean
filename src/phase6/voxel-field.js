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
const smoothMin=(a,b,k)=>{
 const h=clamp(.5+.5*(b-a)/k,0,1);
 return b*(1-h)+a*h-k*h*(1-h);
};

/** Shared signed-distance field used by both mesh extraction and creature contact. */
export function createHabitatVoxelField(worldSize={x:41,y:15.5,z:31},floorAt=(x,z)=>-8.65){
 const sx=worldSize.x/41,sz=worldSize.z/31;
 return (x,y,z)=>{
  const base=y-floorAt(x,z);
  // No geological solid reaches above this conservative ceiling. Most fish
  // swim higher, so their collision query can avoid all rock/cave SDF work.
  if(y>-5.2)return base;
  let solid=base;
  const cx1=-13*sx,cz1=-5*sz;
  if(Math.abs(x-cx1)<7.6*sx&&Math.abs(y+8.15)<3.6&&Math.abs(z-cz1)<6.3*sz)solid=smoothMin(solid,ellipsoid(x,y,z,cx1,-8.15,cz1,6.1*sx,2.1,4.8*sz),1.15);
  const cx2=1*sx,cz2=7*sz;
  if(Math.abs(x-cx2)<8.5*sx&&Math.abs(y+8.05)<3.6&&Math.abs(z-cz2)<6.5*sz)solid=smoothMin(solid,ellipsoid(x,y,z,cx2,-8.05,cz2,7*sx,2.25,5*sz),1.25);
  const cx3=15*sx,cz3=-7*sz;
  if(Math.abs(x-cx3)<6.1*sx&&Math.abs(y+8.35)<3.1&&Math.abs(z-cz3)<6.5*sz)solid=smoothMin(solid,ellipsoid(x,y,z,cx3,-8.35,cz3,4.8*sx,1.8,5.2*sz),.95);
  const cx4=-2*sx,cz4=-13*sz;
  if(Math.abs(x-cx4)<6.4*sx&&Math.abs(y+8.25)<3.1&&Math.abs(z-cz4)<4.2*sz)solid=smoothMin(solid,ellipsoid(x,y,z,cx4,-8.25,cz4,5.2*sx,1.9,3*sz),.9);
  let cave=Infinity;
  if(x>-21*sx&&x<-6*sx&&Math.abs(y+9.15)<1.9&&Math.abs(z+5*sz)<2.0)cave=Math.min(cave,capsule(x,y,z,[-19*sx,-9.05,-5*sz],[-8*sx,-9.25,-5*sz],1.35));
  if(x>0&&x<16*sx&&Math.abs(y+9.3)<1.8&&Math.abs(z-7*sz)<1.9)cave=Math.min(cave,capsule(x,y,z,[2*sx,-9.25,7*sz],[14*sx,-9.35,7*sz],1.25));
  if(Math.abs(x+4*sx)<3.0*sx&&Math.abs(y+9.5)<2.5&&Math.abs(z-1*sz)<3.1*sz)cave=Math.min(cave,ellipsoid(x,y,z,-4*sx,-9.5,1*sz,2.15*sx,1.65,2.25*sz));
  return cave===Infinity?solid:Math.max(solid,-cave);
 }
}

export function resolveVoxelTerrainContact(agent,field,{clearance=null,step=.075}={}){
 if(typeof field!=='function')return false;
 const grounded=['crab','lobster','mantis','starfish','stingray','wobbegong'].includes(agent.species);
 const radius=clearance??(grounded ? 0.055 : Math.min(.42,.085+(agent.bodyScale??1)*.085));
 let contact=false,nx=0,ny=1,nz=0;
 // Smooth unions are distance-like but not exact SDFs at blend regions. Iterate
 // projection so a deep initial overlap cannot leave the animal inside a ledge.
 for(let iteration=0;iteration<4;iteration++){
  const d=field(agent.p.x,agent.p.y,agent.p.z);
  if(!Number.isFinite(d)||d>=radius)break;
  const h=step;
  const dx=field(agent.p.x+h,agent.p.y,agent.p.z)-field(agent.p.x-h,agent.p.y,agent.p.z);
  const dy=field(agent.p.x,agent.p.y+h,agent.p.z)-field(agent.p.x,agent.p.y-h,agent.p.z);
  const dz=field(agent.p.x,agent.p.y,agent.p.z+h)-field(agent.p.x,agent.p.y,agent.p.z-h);
  const magnitude=Math.hypot(dx,dy,dz);
  if(magnitude>1e-7){nx=dx/magnitude;ny=dy/magnitude;nz=dz/magnitude;}
  const penetration=Math.min(2.5,radius-d);
  agent.p.x+=nx*penetration;agent.p.y+=ny*penetration;agent.p.z+=nz*penetration;
  contact=true;
 }
 if(contact){
  const vn=agent.v.x*nx+agent.v.y*ny+agent.v.z*nz;
  if(vn<0){agent.v.x-=nx*vn;agent.v.y-=ny*vn;agent.v.z-=nz*vn;}
  agent.terrainContact=true;
 }
 return contact;
}

/** Find the nearest upward-facing voxel surface beneath/around a grounded agent. */
export function sampleVoxelSurfaceHeight(x,z,referenceY,field,{clearance=.055,range=5,spacing=.25}={}){
 if(typeof field!=='function'||!Number.isFinite(referenceY))return null;
 let previousY=referenceY-range,previous=field(x,previousY,z)-clearance,best=null,bestDistance=Infinity;
 for(let y=previousY+spacing;y<=referenceY+range+spacing*.5;y+=spacing){
  const currentY=Math.min(y,referenceY+range),current=field(x,currentY,z)-clearance;
  // Solid-to-air while moving upward is the walkable top surface. The opposite
  // crossing is an overhang underside and must not become the seabed.
  if(previous<=0&&current>0){
   let low=previousY,high=currentY;
   for(let i=0;i<7;i++){const mid=(low+high)*.5;if(field(x,mid,z)<=clearance)low=mid;else high=mid;}
   const surface=(low+high)*.5,distance=Math.abs(surface-referenceY);
   if(distance<bestDistance){best=surface;bestDistance=distance;}
  }
  previousY=currentY;previous=current;
  if(currentY>=referenceY+range)break;
 }
 return best;
}
