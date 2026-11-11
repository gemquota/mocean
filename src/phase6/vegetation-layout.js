const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(x,z,seed)=>{let h=Math.imul(Math.floor((x+91.7)*127.1),374761393)^Math.imul(Math.floor((z+53.1)*269.9),668265263)^seed;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
const normalAt=(field,x,y,z)=>{
 const h=.22,dx=field(x+h,y,z)-field(x-h,y,z),dy=field(x,y+h,z)-field(x,y-h,z),dz=field(x,y,z+h)-field(x,y,z-h),m=Math.hypot(dx,dy,dz)||1;
 return {x:dx/m,y:dy/m,z:dz/m};
};
const projectToSurface=(field,point)=>{
 let {x,y,z}=point;
 for(let i=0;i<3;i++){
  const distance=field(x,y,z),normal=normalAt(field,x,y,z);
  if(!Number.isFinite(distance)||Math.abs(distance)<.004)break;
  const correction=clamp(distance,-.35,.35);
  x-=normal.x*correction;y-=normal.y*correction;z-=normal.z*correction;
 }
 return {x,y,z,normal:normalAt(field,x,y,z)};
};

/** Find the upper solid-to-water crossing and its outward surface normal. */
export function sampleTerrainTop(field,x,z,{minY=-14.2,maxY=-5.2,step=.34}={}){
 let previousY=minY,previous=field(x,previousY,z),best=null;
 for(let y=minY+step;y<=maxY+step*.5;y+=step){
  const currentY=Math.min(y,maxY),current=field(x,currentY,z);
  if(previous<=0&&current>0){
   let low=previousY,high=currentY;
   for(let i=0;i<7;i++){const mid=(low+high)*.5;if(field(x,mid,z)<=0)low=mid;else high=mid;}
   const surfaceY=(low+high)*.5,surface=projectToSurface(field,{x,y:surfaceY,z});
   if(surface.normal.y>0.2)best=surface;
  }
  previousY=currentY;previous=current;
  if(currentY>=maxY)break;
 }
 return best;
}

function sampleWallCrossing(field,start,end,y,fixed,axis){
 let previous=start,previousValue=field(axis==='x'?previous:fixed,y,axis==='x'?fixed:previous);
 const steps=Math.ceil((end-start)/.65);
 for(let i=1;i<=steps;i++){
  const current=start+(end-start)*i/steps;
  const value=field(axis==='x'?current:fixed,y,axis==='x'?fixed:current);
  if((previousValue<=0&&value>0)||(previousValue>0&&value<=0)){
   let low=previous,high=current;
   for(let n=0;n<6;n++){const mid=(low+high)*.5,probe=field(axis==='x'?mid:fixed,y,axis==='x'?fixed:mid);if(probe<=0)low=mid;else high=mid;}
   const coordinate=(low+high)*.5;
   const px=axis==='x'?coordinate:fixed,pz=axis==='x'?fixed:coordinate;
   const surface=projectToSurface(field,{x:px,y,z:pz});
   if(surface.normal.y>=-.12&&surface.normal.y<.68)return surface;
  }
  previous=current;previousValue=value;
 }
 return null;
}

/**
 * Build deterministic habitat vegetation niches from the actual voxel field:
 * flat sediment for seagrass, moderately sloped ledges for kelp, and exposed
 * vertical faces for attached macroalgae. The layout is static between rebuilds.
 */
export function createVegetationLayout(field,worldSize={x:41,z:31},seed=73421){
 const grass=[],kelp=[],walls=[],halfX=worldSize.x*.5,halfZ=worldSize.z*.5;
 const seen=new Set();
 for(let z=-halfZ+1.2;z<halfZ-1;z+=2.15){
  for(let x=-halfX+1.2;x<halfX-1;x+=2.15){
   const r=hash(x,z,seed),surface=sampleTerrainTop(field,x+(r-.5)*.36,z+(hash(z,x,seed+7)-.5)*.36);
   if(!surface||surface.y<-11.1||surface.y>-7.2)continue;
   if(surface.normal.y>.94&&r>.22&&grass.length<88)grass.push({...surface,id:grass.length});
   else if(surface.normal.y>.68&&surface.normal.y<.94&&r>.36&&kelp.length<48)kelp.push({...surface,id:kelp.length});
  }
 }
 const yLevels=[-11.1,-10.1,-9.1,-8.1,-7.2],step=1.9;
 for(const y of yLevels){
  for(let z=-halfZ+1;z<halfZ-1;z+=step){
   for(let x=-halfX+1;x<halfX-1;x+=step){
    if(hash(x+y,z,seed+19)<.42)continue;
    for(const axis of ['x','z']){
     const candidate=sampleWallCrossing(field,axis==='x'?x-.95:z-.95,axis==='x'?x+.95:z+.95,y,axis==='x'?z:x,axis);
     if(!candidate||candidate.normal.y<-.08||candidate.normal.y>=.68)continue;
     const key=[Math.round(candidate.x*1.25),Math.round(candidate.y*1.25),Math.round(candidate.z*1.25)].join(':');
     if(seen.has(key))continue;seen.add(key);
     walls.push({...candidate,id:walls.length});
     if(walls.length>=34)break;
    }
    if(walls.length>=34)break;
   }
   if(walls.length>=34)break;
  }
  if(walls.length>=34)break;
 }
 return {grass,kelp,walls};
}
