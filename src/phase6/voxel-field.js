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
  let solid=y-floorAt(x,z);
  solid=smoothMin(solid,ellipsoid(x,y,z,-13*sx,-8.15,-5*sz,6.1*sx,2.1,4.8*sz),1.15);
  solid=smoothMin(solid,ellipsoid(x,y,z,1*sx,-8.05,7*sz,7*sx,2.25,5*sz),1.25);
  solid=smoothMin(solid,ellipsoid(x,y,z,15*sx,-8.35,-7*sz,4.8*sx,1.8,5.2*sz),.95);
  solid=smoothMin(solid,ellipsoid(x,y,z,-2*sx,-8.25,-13*sz,5.2*sx,1.9,3*sz),.9);
  const caveA=capsule(x,y,z,[-19*sx,-9.05,-5*sz],[-8*sx,-9.25,-5*sz],1.35);
  const caveB=capsule(x,y,z,[2*sx,-9.25,7*sz],[14*sx,-9.35,7*sz],1.25);
  const chamber=ellipsoid(x,y,z,-4*sx,-9.5,1*sz,2.15*sx,1.65,2.25*sz);
  return Math.max(solid,-Math.min(caveA,caveB,chamber));
 };
}

export function resolveVoxelTerrainContact(agent,field,{clearance=null,step=.075}={}){
 if(typeof field!=='function')return false;
 const grounded=['crab','lobster','mantis','starfish','stingray','wobbegong'].includes(agent.species);
 const radius=clearance??(grounded ? 0.055 : Math.min(.42,.085+(agent.bodyScale??1)*.085));
 const d=field(agent.p.x,agent.p.y,agent.p.z);
 if(!Number.isFinite(d)||d>=radius)return false;
 const h=step,dx=field(agent.p.x+h,agent.p.y,agent.p.z)-field(agent.p.x-h,agent.p.y,agent.p.z),dy=field(agent.p.x,agent.p.y+h,agent.p.z)-field(agent.p.x,agent.p.y-h,agent.p.z),dz=field(agent.p.x,agent.p.y,agent.p.z+h)-field(agent.p.x,agent.p.y,agent.p.z-h);
 const magnitude=Math.hypot(dx,dy,dz)||1,nx=dx/magnitude,ny=dy/magnitude,nz=dz/magnitude,penetration=radius-d;
 agent.p.x+=nx*penetration;agent.p.y+=ny*penetration;agent.p.z+=nz*penetration;
 const vn=agent.v.x*nx+agent.v.y*ny+agent.v.z*nz;
 if(vn<0){agent.v.x-=nx*vn;agent.v.y-=ny*vn;agent.v.z-=nz*vn;}
 agent.terrainContact=true;
 return true;
}
