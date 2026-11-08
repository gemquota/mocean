import { clamp, add3, scale3, normalize3, length3 } from './math.js';
const lerp=(a,b,t)=>a+(b-a)*t;
const smoothstep=t=>t*t*(3-2*t);
function pointAt(path,t){
 const depth=smoothstep(clamp(t/path.depthEndT,0,1));
 return {x:lerp(path.start.x,path.target.x,t),y:lerp(path.start.y,path.target.y,t),z:lerp(path.start.z,path.target.z,depth)};
}
function buildPath(start,target,samples,depthEndT){
 const path={start:{...start},target:{...target},samples:[],length:0,depthEndT};
 let previous=pointAt(path,0);path.samples.push({t:0,distance:0,position:previous});
 for(let i=1;i<=samples;i++){const t=i/samples,p=pointAt(path,t);path.length+=length3(add3(p,scale3(previous,-1)));path.samples.push({t,distance:path.length,position:p});previous=p;}
 path.length=Math.max(path.length,1e-8);return path;
}
function distanceAtParameter(path,t){
 const scaled=clamp(t,0,1)*(path.samples.length-1),index=Math.floor(scaled),fraction=scaled-index;
 const a=path.samples[index],b=path.samples[Math.min(index+1,path.samples.length-1)];
 return lerp(a.distance,b.distance,fraction);
}
/** Steering-only path: depth converges at half arc length, then stays level. */
export function createDepthApproach(start,target,samples=240){
 const horizontal=Math.hypot(target.x-start.x,target.y-start.y);
 let depthEndT=.5;
 if(horizontal>1e-6&&Math.abs(target.z-start.z)>1e-6){
  let low=.005,high=.995;
  for(let i=0;i<26;i++){
   const mid=(low+high)*.5,path=buildPath(start,target,samples,mid);
   const first=distanceAtParameter(path,mid);
   if(first>path.length*.5)high=mid;else low=mid;
  }
  depthEndT=(low+high)*.5;
 }
 return buildPath(start,target,samples,depthEndT);
}
function parameterAt(path,progress){
 const distance=clamp(progress,0,1)*path.length;let low=0,high=path.samples.length-1;
 while(low<high){const mid=(low+high)>>1;if(path.samples[mid].distance<distance)low=mid+1;else high=mid;}
 const upper=path.samples[low],lower=path.samples[Math.max(0,low-1)],span=upper.distance-lower.distance;
 return lerp(lower.t,upper.t,span>1e-10?(distance-lower.distance)/span:0);
}
export function sampleDepthApproach(path,progress){
 const t=parameterAt(path,progress),position=pointAt(path,t);
 const before=pointAt(path,Math.max(0,t-.002)),after=pointAt(path,Math.min(1,t+.002));
 return {position,tangent:normalize3(add3(after,scale3(before,-1))),progress:clamp(progress,0,1),parameter:t};
}
export function nearestDepthApproachProgress(path,point,minimumProgress=0){
 const first=Math.max(0,Math.floor(clamp(minimumProgress,0,1)*(path.samples.length-1)));
 let best=first,bestD=Infinity;
 for(let i=first;i<path.samples.length;i++){const d=add3(path.samples[i].position,scale3(point,-1)),d2=d.x*d.x+d.y*d.y+d.z*d.z;if(d2<bestD){bestD=d2;best=i;}}
 return path.samples[best].distance/path.length;
}
