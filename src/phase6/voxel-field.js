import { geologicalProvinceAt } from './seabed-height.js';
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
const TERRACE_BLOCKS=[
 // Eroded table-rock caps with visible overhangs and abrupt shoulders.
 [-22.5,-7.8,-9.0,3.8,1.15,2.25,-.38,.22],
 [21.5,-7.82,3.5,3.25,1.1,2.05,.52,.2],
 [2.5,-7.75,-17.2,3.4,1.05,1.85,-.18,.2]
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
 [8.2,-8.0,0.5,2.1,1.65,1.8,.7,3.4],
 [-23.0,-8.15,-13.4,2.7,1.75,2.2,-.62,4.0],
 [23.0,-8.25,-13.0,2.8,1.85,2.35,.44,4.1],
 [-23.5,-8.3,13.2,2.55,1.7,2.1,.28,3.9],
 [23.0,-8.35,10.2,2.65,1.8,2.25,-.36,4.0],
 [3.2,-8.3,-2.2,2.45,1.55,2.0,.68,4.2],
 [-3.0,-8.35,18.0,2.2,1.5,1.85,-.22,3.8]
];
const RAVINES=[
 // Deep, open-sided trenches cut into the reef, not shallow colour channels.
 [-6.8,-9.55,-7.0,2.15,3.25,12.5,.28],
 [11.5,-9.55,-2.0,1.9,3.2,11.5,-.52],
 [-17.0,-9.55,8.0,1.65,3.15,8.8,.08],
 // Two cross-cut channels connect the main ravines into a readable drainage system.
 [-22.0,-9.55,0.0,1.5,3.1,8.2,-.34],
 [4.0,-9.55,14.0,1.42,3.0,7.2,.62]
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


// Deterministic world-space cave complexes. Each 96 m geology cell owns one
// chamber, a surface throat and two galleries. Neighbouring cells are sampled
// as well, so tunnels remain continuous when a chunk boundary crosses them.
function geologyHash(x,z){
 let h=(Math.imul(x,374761393)+Math.imul(z,668265263)+0x51ed270b)|0;
 h=Math.imul(h^(h>>>13),1274126177);
 return (h^(h>>>16))>>>0;
}
function geologyRandom(x,z,salt){
 let h=geologyHash(x+salt*17,z-salt*31);
 return (h>>>0)/4294967295;
}
const geologyCaveSites=new Map();
function geologyCaveSite(gx,gz,floorAt){
 const key=gx+','+gz;
 let site=geologyCaveSites.get(key);
 if(site)return site;
 const span=96,cx=(gx+.22+geologyRandom(gx,gz,1)*.56)*span;
 const cz=(gz+.22+geologyRandom(gx,gz,2)*.56)*span;
 const floor=floorAt(cx,cz),depth=2.8+geologyRandom(gx,gz,3)*2.4;
 const chamberY=floor-depth,rx=5.2+geologyRandom(gx,gz,4)*3.8;
 const rz=4.6+geologyRandom(gx,gz,5)*3.6,angle=geologyRandom(gx,gz,6)*Math.PI*2;
 const cs=Math.cos(angle),sn=Math.sin(angle);
 const shaftX=cx+(geologyRandom(gx,gz,7)-.5)*rx*.8;
 const shaftZ=cz+(geologyRandom(gx,gz,8)-.5)*rz*.8;
 site={cx,cz,chamberY,rx,rz,cs,sn,shaftX,shaftZ,
  shaftTop:floorAt(shaftX,shaftZ)+1.1,shaftBottom:chamberY+.8,
  shaftRadius:.82+geologyRandom(gx,gz,9)*.28};
 geologyCaveSites.set(key,site);
 if(geologyCaveSites.size>512)geologyCaveSites.clear();
 return site;
}
function geologyCaveDistance(x,y,z,floorAt){
 const span=96,ix=Math.floor(x/span),iz=Math.floor(z/span);
 let cave=Infinity;
 for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
  const site=geologyCaveSite(ix+dx,iz+dz,floorAt);
  const {cx,cz,chamberY,rx,rz,cs,sn,shaftX,shaftZ,shaftTop,shaftBottom,shaftRadius}=site;
  if(Math.abs(x-cx)>rx+10||Math.abs(z-cz)>rz+10||y<chamberY-3||y>shaftTop+1)continue;
  const px=(x-cx)*cs-(z-cz)*sn,pz=(x-cx)*sn+(z-cz)*cs;
  const chamber=(Math.hypot(px/rx,(y-chamberY)/2.1,pz/rz)-1)*Math.min(rx,2.1,rz);
  cave=Math.min(cave,chamber);
  const shaftY=clamp(y,shaftBottom,shaftTop);
  const shaft=Math.hypot(x-shaftX,z-shaftZ,y-shaftY)-shaftRadius;
  cave=Math.min(cave,shaft);
  const galleryA=capsule3(x,y,z,
   [cx+cs*rx*.55,chamberY,cz+sn*rx*.55],
   [cx+cs*(rx+7),chamberY-1.1,cz+sn*(rx+7)],.92);
  const galleryB=capsule3(x,y,z,
   [cx-sn*rz*.55,chamberY,cz+cs*rz*.55],
   [cx-sn*(rz+6),chamberY+.65,cz+cs*(rz+6)],.78);
  cave=Math.min(cave,galleryA,galleryB);
 }
 return cave;
}
function capsule3(x,y,z,a,b,r){
 const pax=x-a[0],pay=y-a[1],paz=z-a[2],bax=b[0]-a[0],bay=b[1]-a[1],baz=b[2]-a[2];
 const h=clamp((pax*bax+pay*bay+paz*baz)/(bax*bax+bay*bay+baz*baz||1),0,1);
 return Math.hypot(pax-bax*h,pay-bay*h,paz-baz*h)-r;
}


const geologyFormationSites=new Map();
function geologyFormationSite(gx,gz,floorAt){
 const key=gx+','+gz;
 let site=geologyFormationSites.get(key);
 if(site)return site;
 const span=160,cx=(gx+.18+geologyRandom(gx,gz,21)*.64)*span;
 const cz=(gz+.18+geologyRandom(gx,gz,22)*.64)*span;
 const province=geologicalProvinceAt(cx,cz);
 site={cx,cz,province,floor:floorAt(cx,cz),
  scale:.75+geologyRandom(gx,gz,23)*.7,
  angle:geologyRandom(gx,gz,24)*Math.PI*2,
  spread:5+geologyRandom(gx,gz,25)*5};
 geologyFormationSites.set(key,site);
 if(geologyFormationSites.size>512)geologyFormationSites.clear();
 return site;
}
function geologyFormationDistance(x,y,z,floorAt){
 const span=160,ix=Math.floor(x/span),iz=Math.floor(z/span);
 let formation=Infinity;
 for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
  const site=geologyFormationSite(ix+dx,iz+dz,floorAt);
  const {cx,cz,province,floor,scale,angle,spread}=site;
  const localX=x-cx,localZ=z-cz;
  if(Math.abs(localX)>spread*4+4||Math.abs(localZ)>spread*4+4||y<floor-2||y>floor+10*scale)continue;
  if(province==='basalt-spires'){
   for(let i=0;i<3;i++){
    const a=angle+i*Math.PI*2/3,px=cx+Math.cos(a)*spread*1.15,pz=cz+Math.sin(a)*spread*1.15;
    const h=(5.5+geologyRandom(ix+dx,iz+dz,30+i)*4.5)*scale;
    const radius=(1.15+geologyRandom(ix+dx,iz+dz,34+i)*.8)*scale;
    const tapered=capsule3(x,y,z,[px,floor-.25,pz],[px+Math.cos(a)*.35,floor+h,pz+Math.sin(a)*.35],radius);
    formation=Math.min(formation,tapered);
   }
  }else if(province==='fractured-shelf'){
   const c=Math.cos(angle),s=Math.sin(angle),lx=localX*c-localZ*s,lz=localX*s+localZ*c;
   const slab=rotatedBox(x,y,z,cx,floor+1.1*scale,cz,spread*1.8*scale,.8*scale,spread*.82*scale,angle,.28);
   const cap=rotatedBox(x,y,z,cx+Math.cos(angle)*spread*.9,floor+2.15*scale,cz+Math.sin(angle)*spread*.9,spread*.8*scale,.42*scale,spread*.55*scale,angle+.12,.2);
   formation=Math.min(formation,slab,cap);
  }else if(province==='boulder-field'){
   for(let i=0;i<5;i++){
    const a=angle+i*2.3999632297,r=spread*(.35+(i%3)*.34);
    const bx=cx+Math.cos(a)*r,bz=cz+Math.sin(a)*r;
    const br=(1.25+geologyRandom(ix+dx,iz+dz,40+i)*1.7)*scale;
    formation=Math.min(formation,ellipsoid(x,y,z,bx,floor+br*.55,bz,br*1.2,br*.78,br));
   }
  }else if(province==='limestone-karst'){
   const a=angle,px=cx+Math.cos(a)*spread,pz=cz+Math.sin(a)*spread;
   const h=4.5*scale,r=1.5*scale;
   formation=Math.min(formation,capsule3(x,y,z,[px,floor-.2,pz],[px,floor+h,pz],r));
   const arch=capsule3(x,y,z,[px,floor+h*.68,pz],[cx,floor+h*.72,cz],.72*scale);
   formation=Math.min(formation,arch);
  }else{
   const a=angle,px=cx+Math.cos(a)*spread,pz=cz+Math.sin(a)*spread;
   formation=Math.min(formation,ellipsoid(x,y,z,cx,floor+1.25*scale,cz,spread*1.65*scale,1.25*scale,spread*.95*scale));
   formation=Math.min(formation,ellipsoid(x,y,z,px,floor+2.1*scale,pz,spread*.55*scale,1.9*scale,spread*.55*scale));
  }
 }
 return formation;
}

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

  // Stepped table-rock caps retain flat-ish tops and broken, undercut margins.
  for(const [cx,cy,cz,hx,hy,hz,angle,bevel] of TERRACE_BLOCKS){
   const px=cx*sx,pz=cz*sz;
   if(Math.abs(x-px)>hx*sx+1||Math.abs(z-pz)>hz*sz+1||Math.abs(y-cy)>hy+1)continue;
   solid=smoothMin(solid,rotatedBox(x,y,z,px,cy,pz,hx*sx,hy,hz*sz,angle,bevel),.18);
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

  // Beyond the authored starter region, deterministic cave complexes are
  // embedded in the shared global seabed. Their throats intersect the surface;
  // chambers and branching galleries are true SDF voids, not visual decals.
  if(Math.hypot(x,z)>65){
   const globalCave=geologyCaveDistance(x,y,z,floorAt);
   solid=Math.max(solid,-globalCave);
   // Region-specific formations are unions in the same SDF as the seabed:
   // basalt pinnacles, fractured ledges, boulder fields, karst arches and
   // eroded sedimentary outcrops therefore mesh and collide as real geometry.
   const formations=geologyFormationDistance(x,y,z,floorAt);
   if(formations!==Infinity)solid=smoothMin(solid,formations,.42);
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
