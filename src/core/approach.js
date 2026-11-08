import { clamp, add3, scale3, normalize3, length3 } from './math.js';
const lerp=(a,b,t)=>a+(b-a)*t;
const smoothstep=t=>t*t*(3-2*t);
function pointAt(path,t){
 const depth=smoothstep(clamp(t/path.depthEndT,0,1));
 return {x:lerp(path.start.x,path.target.x,t),y:lerp(path.start.y,path.target.y,t),z:lerp(path.start.z,path.target.z,depth)};
}
/** Steering-only path: depth converges by halfway along path progress, then stays level. */
export function createDepthApproach(start,target,samples=480){
 const path={start:{...start},target:{...target},samples:[],length:0,depthEndT:.5};
 let previous=pointAt(path,0);path.samples.push({t:0,distance:0,position:previous});
 for(let i=1;i<=samples;i++){const t=i/samples,p=pointAt(path,t);path.length+=length3(add3(p,scale3(previous,-1)));path.samples.push({t,distance:path.length,position:p});previous=p;}
 path.length=Math.max(path.length,1e-8);return path;
}
export function sampleDepthApproach(path,progress){
 const t=clamp(progress,0,1),position=pointAt(path,t);
 const u=clamp(t/path.depthEndT,0,1);
 const depthSlope=t<path.depthEndT?6*u*(1-u)/path.depthEndT:0;
 const tangent=normalize3({x:path.target.x-path.start.x,y:path.target.y-path.start.y,z:(path.target.z-path.start.z)*depthSlope});
 return {position,tangent,progress:t,parameter:t};
}
/** Find the closest remaining path sample; progress is geometric path fraction, never time. */
export function nearestDepthApproachProgress(path,point,minimumProgress=0){
 const first=Math.max(0,Math.floor(clamp(minimumProgress,0,1)*(path.samples.length-1)));
 let best=first,bestD=Infinity;
 for(let i=first;i<path.samples.length;i++){const d=add3(path.samples[i].position,scale3(point,-1)),d2=d.x*d.x+d.y*d.y+d.z*d.z;if(d2<bestD){bestD=d2;best=i;}}
 return path.samples[best].t;
}
