const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ellipsoid=(x,y,z,cx,cy,cz,rx,ry,rz)=>{
 const k0=Math.hypot((x-cx)/rx,(y-cy)/ry,(z-cz)/rz);
 if(k0<1e-9)return -Math.min(rx,ry,rz);
 const k1=Math.hypot((x-cx)/(rx*rx),(y-cy)/(ry*ry),(z-cz)/(rz*rz));
 return k0*(k0-1)/k1;
};
const rotatedEllipsoid=(x,y,z,cx,cy,cz,rx,ry,rz,angle)=>{
 const c=Math.cos(angle),s=Math.sin(angle),dx=x-cx,dz=z-cz;
 return ellipsoid(dx*c-dz*s,y-cy,dx*s+dz*c,0,0,0,rx,ry,rz);
};
const superellipsoid=(x,y,z,cx,cy,cz,rx,ry,rz,p=3.2)=>{
 const q=Math.pow(Math.abs((x-cx)/rx),p)+Math.pow(Math.abs((y-cy)/ry),p)+Math.pow(Math.abs((z-cz)/rz),p);
 return (Math.pow(q,1/p)-1)*Math.min(rx,ry,rz);
};
const rotatedSuperellipsoid=(x,y,z,cx,cy,cz,rx,ry,rz,angle,p=3.2)=>{
 const c=Math.cos(angle),s=Math.sin(angle),dx=x-cx,dz=z-cz;
 return superellipsoid(dx*c-dz*s,y-cy,dx*s+dz*c,0,0,0,rx,ry,rz,p);
};
const rotatedBox=(x,y,z,cx,cy,cz,hx,hy,hz,angle,bevel=.12)=>{
 const c=Math.cos(angle),s=Math.sin(angle),dx=x-cx,dz=z-cz;
 const qx=Math.abs(dx*c-dz*s)-hx+bevel,qy=Math.abs(y-cy)-hy+bevel,qz=Math.abs(dx*s+dz*c)-hz+bevel;
 return Math.hypot(Math.max(qx,0),Math.max(qy,0),Math.max(qz,0))+Math.min(Math.max(qx,qy,qz),0)-bevel;
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
const ROCKS=[
 // Rounded boulder clusters embedded into the reef rather than perched on top.
 [-12.8,-8.0,-12.1,2.35,1.45,2.0,-.28],[-16.0,-8.35,-10.5,1.45,1.05,1.3,.4],[-20.2,-8.45,-9.1,1.15,.9,1.0,0],
 [-7.2,-8.0,11.4,2.1,1.4,1.7,.55],[-4.9,-8.35,13.1,1.25,.95,1.15,-.2],[-9.4,-8.45,13.2,1.0,.8,1.0,.3],
 [12.4,-8.15,-12.8,2.5,1.65,2.0,.2],[15.1,-8.4,-10.8,1.45,1.0,1.25,-.5],[9.6,-8.5,-10.4,1.25,.9,1.05,.4],
 [20.2,-8.35,6.5,1.85,1.25,1.55,-.35],[22.0,-8.55,8.7,1.05,.8,.95,.2],
 [-25.0,-8.25,4.8,2.0,1.35,1.65,.35],[-22.8,-8.5,6.7,1.15,.9,1.0,-.3],
 [3.0,-8.35,-16.0,1.75,1.15,1.55,-.4],[5.1,-8.5,-14.2,1.0,.8,.95,.25],
 [28.0,-8.6,-8.5,1.45,1.0,1.2,.3],[-30.0,-8.55,-13.0,1.25,.85,1.05,-.2]
];
const SHELVES=[
 [-25,-7.55,-2.5,5.6,1.05,2.15,-.24],
 [4,-7.45,-6.5,5.2,1.15,2.0,.32],
 [25,-7.8,12.0,4.6,.95,2.2,-.42],
 [-5,-7.7,18.0,4.0,.9,1.7,.18]
];
const CAVE_TUNNELS=[
 [[-19,-9.05,-5],[-8,-9.25,-5],1.35],
 [[-14,-9.1,-5],[-14,-9.25,1.2],.92],
 [[-14,-9.25,1.2],[-8,-9.3,2.0],.82],
 [[2,-9.25,7],[14,-9.35,7],1.25],
 [[7,-9.25,7],[7,-9.0,12],.88],
 [[7,-9.0,12],[12,-9.05,14],.78],
 [[-4,-9.5,1],[-1,-9.35,4],.85],
 // Third cave: a stepped entrance, a central chamber and two side galleries.
 [[14.2,-8.8,-9.0],[16.8,-9.35,-9.0],.9],
 [[16.8,-9.35,-9.0],[18.7,-9.55,-6.5],.78],
 [[16.8,-9.35,-9.0],[14.1,-9.55,-11.7],.72],
 [[14.1,-9.55,-11.7],[11.8,-9.65,-10.4],.62],
 // Narrow connectors between the first two chambers and their entrances.
 [[-18.5,-8.65,-5.0],[-15.0,-9.45,-5.0],.92],
 [[4.8,-8.8,7.0],[7.7,-9.35,9.0],.82]
];
const ANGULAR_ROCKS=[
 [-17.5,-8.0,-14.2,2.8,1.9,2.5,-.38,3.5],
 [-10.5,-8.1,8.2,2.5,1.7,2.0,.22,3.8],
 [1.8,-8.0,-16.8,2.4,1.8,2.3,-.55,3.3],
 [15.6,-8.15,9.0,3.0,1.85,2.3,.42,3.6],
 [18.0,-8.35,-10.5,2.2,1.5,2.1,-.2,3.8],
 [-2.0,-8.2,17.0,2.3,1.55,2.4,.5,3.4],
 [-19.0,-8.3,10.8,2.0,1.45,2.0,-.3,3.7],
 [8.2,-8.0,0.5,2.1,1.65,1.8,.7,3.4]
];
const RAVINES=[
 // Deep, open-sided trenches cut into the reef, not shallow colour channels.
 [-6.8,-9.55,-7.0,2.15,3.25,12.5,.28],
 [11.5,-9.55,-2.0,1.9,3.2,11.5,-.52],
 [-17.0,-9.55,8.0,1.65,3.15,8.8,.08]
];
const CAVE_CHAMBERS=[
 [-13,-9.65,-5,2.25,1.55,2.35],
 [8,-9.55,9,2.55,1.72,2.45],
 [17,-9.65,-9,2.15,1.48,2.2]
];
const RIDGES=[
 // Long, broken reef spines with irregular shoulders and sloping flanks.
 [[-22,-8.25,-3],[-10,-7.95,-1.8],1.65],
 [[-3,-8.05,4],[10,-7.85,1.8],1.8],
 [[13,-8.2,-5],[25,-8.0,-1.5],1.45],
 [[-17,-8.4,14],[-5,-8.1,16],1.35],
 [[8,-8.3,15],[21,-8.15,13],1.55],
 [[-29,-8.35,-8],[-19,-8.1,-6],1.3]
];

/** Shared signed-distance field used by both mesh extraction and creature contact. */
export function createHabitatVoxelField(worldSize={x:41,y:15.5,z:31},floorAt=(x,z)=>-8.65){
 const sx=worldSize.x/41,sz=worldSize.z/31;
 const scaledPoint=(p)=>[p[0]*sx,p[1],p[2]*sz];
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

  // Broken ridge spines. Capsule unions form continuous rock ribs with rounded,
  // weathered shoulders and deliberately irregular heights.
  for(const ridge of RIDGES){
   const a=scaledPoint(ridge[0]),b=scaledPoint(ridge[1]),r=ridge[2];
   const midY=(a[1]+b[1])*.5;
   if(Math.abs(x-(a[0]+b[0])*.5)>Math.abs(b[0]-a[0])*.5+r+1.5||
      Math.abs(z-(a[2]+b[2])*.5)>Math.abs(b[2]-a[2])*.5+r+1.5||
      Math.abs(y-midY)>r+1.8)continue;
   solid=smoothMin(solid,capsule(x,y,z,a,b,r),.7);
  }

  // Irregular, rotated shelf slabs. Their undersides remain open water, while
  // the finite ellipsoid volumes give contact queries real overhang geometry.
  for(const [cx,cy,cz,rx,ry,rz,angle] of SHELVES){
   const dx=x-cx*sx,dz=z-cz*sz;
   if(Math.abs(dx)>rx*sx+1||Math.abs(dz)>rz*sz+1||Math.abs(y-cy)>ry+1.2)continue;
   solid=smoothMin(solid,rotatedEllipsoid(x,y,z,cx*sx,cy,cz*sz,rx*sx,ry,rz*sz,angle),.42);
  }

  // Faceted, blocky superellipsoid outcrops give the reef angular shoulders.
  for(const [rx0,cy,rz0,rx,ry,rz,angle,p] of ANGULAR_ROCKS){
   const cx=rx0*sx,cz=rz0*sz;
   if(Math.abs(x-cx)>rx*sx+1||Math.abs(z-cz)>rz*sz+1||Math.abs(y-cy)>ry+1)continue;
   solid=smoothMin(solid,rotatedSuperellipsoid(x,y,z,cx,cy,cz,rx*sx,ry,rz*sz,angle,p),.18);
  }

  // Embedded boulders and talus. Spatial bounds avoid evaluating every primitive
  // for every voxel sample.
  for(const [rockX,cy,rockZ,radiusX,radiusY,radiusZ,angle] of ROCKS){
   const cx=rockX*sx,cz=rockZ*sz;
   if(Math.abs(x-cx)>radiusX*sx+1||Math.abs(z-cz)>radiusZ*sz+1||Math.abs(y-cy)>radiusY+1)continue;
   solid=smoothMin(solid,rotatedEllipsoid(x,y,z,cx,cy,cz,radiusX*sx,radiusY,radiusZ*sz,angle),.38);
  }

  // Carve three deep ravines through the seabed volume. Their flat-ish floors,
  // abrupt shoulders and steep walls create distinct depth corridors.
  for(const [cx,cy,cz,hx,hy,hz,angle] of RAVINES){
   const px=cx*sx,pz=cz*sz;
   if(Math.abs(x-px)>hx*sx+1||Math.abs(z-pz)>hz*sz+1||Math.abs(y-cy)>hy+1)continue;
   const cut=rotatedBox(x,y,z,px,cy,pz,hx*sx,hy,hz*sz,angle,.16);
   solid=Math.max(solid,-cut);
  }

  // Fine geological breakup is supplied by the nested rock and ridge forms.
  // Keep the collision field smooth at contact scale so benthic gait is not
  // perturbed by decorative high-frequency surface noise.

  // A branched cave network: two main passages, side galleries and a chamber.
  // All voids are carved from the same rock field used for rendering/contact.
  let cave=Infinity;
  for(const [rawA,rawB,r] of CAVE_TUNNELS){
   const a=scaledPoint(rawA),b=scaledPoint(rawB);
   const mx=(a[0]+b[0])*.5,mz=(a[2]+b[2])*.5;
   if(Math.abs(x-mx)>Math.abs(b[0]-a[0])*.5+r+1||Math.abs(z-mz)>Math.abs(b[2]-a[2])*.5+r+1||Math.abs(y-(a[1]+b[1])*.5)>r+1)continue;
   cave=Math.min(cave,capsule(x,y,z,a,b,r));
  }
  if(Math.abs(x+4*sx)<3.2*sx&&Math.abs(y+9.5)<2.5&&Math.abs(z-1*sz)<3.2*sz)cave=Math.min(cave,ellipsoid(x,y,z,-4*sx,-9.5,1*sz,2.15*sx,1.65,2.25*sz));
  // Three enlarged chambers with multiple narrow connections. Each remains a
  // genuine void in the same solid field, so the roof and walls are meshed.
  for(const [cx,cy,cz,rx,ry,rz] of CAVE_CHAMBERS){
   const px=cx*sx,pz=cz*sz;
   if(Math.abs(x-px)>rx*sx+1||Math.abs(y-cy)>ry+1||Math.abs(z-pz)>rz*sz+1)continue;
   cave=Math.min(cave,ellipsoid(x,y,z,px,cy,pz,rx*sx,ry,rz*sz));
  }
  if(cave===Infinity)return solid;
  return Math.max(solid,-cave);
 }
}

export function resolveVoxelTerrainContact(agent,field,{clearance=null,step=.075}={}){
 if(typeof field!=='function')return false;
 const grounded=['crab','lobster','mantis','starfish','stingray','wobbegong'].includes(agent.species);
 const radius=clearance??(grounded ? 0.055 : Math.min(.42,.085+(agent.bodyScale??1)*.085));
 let contact=false,nx=0,ny=1,nz=0;
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

export function sampleVoxelSurfaceHeight(x,z,referenceY,field,{clearance=.055,range=5,spacing=.25}={}){
 if(typeof field!=='function'||!Number.isFinite(referenceY))return null;
 let previousY=referenceY-range,previous=field(x,previousY,z)-clearance,best=null,bestDistance=Infinity;
 for(let y=previousY+spacing;y<=referenceY+range+spacing*.5;y+=spacing){
  const currentY=Math.min(y,referenceY+range),current=field(x,currentY,z)-clearance;
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
