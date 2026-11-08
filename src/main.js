import { TAU, clamp, vec3 as V, add3 as add, scale3 as mul, dot3 as dot, cross3 as cross, length3 as mag, normalize3 as unit, quatFromEuler as quatEuler, quatRotate as rotate, angleDelta, perspectiveScale, distanceTreatment, habitatReturnGuidance } from './core/math.js';
import { stepDynamics } from './core/dynamics.js';
import { INITIAL_SPAWN_POSITION } from './core/spawn.js';
import { createGait, stepGait, deformPoint } from './core/body.js';
import { sampleHorizontalHeading, shouldMakeVerticalExcursion } from './core/intent.js';
import { createManeuver, sampleManeuver } from './core/maneuver.js';
const canvas=document.getElementById('creature'),ctx=canvas.getContext('2d',{alpha:false}),label=document.getElementById('behaviour');
let seed=433841;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const sim={p:V(INITIAL_SPAWN_POSITION.x,INITIAL_SPAWN_POSITION.y,INITIAL_SPAWN_POSITION.z),vel:V(.18,0,0),yaw:0,pitch:0,roll:0,orientation:quatEuler(0,0,0),wy:0,wp:0,wr:0,time:0,mode:'CRUISE',nextChoice:3,targetYaw:0,targetPitch:0,maneuver:null,maneuverStartedAt:0,gait:createGait()};
const camera={p:V(0,2.15,10),target:V(0,0,0),forward:V(),right:V(),up:V()};
camera.forward=unit(add(camera.target,mul(camera.p,-1)));camera.right=unit(cross(camera.forward,V(0,1,0)));camera.up=unit(cross(camera.right,camera.forward));
const labels={CRUISE:'CRUISING',EXPLORE:'EXPLORING',TURN:'TURNING',DART:'DARTING',GLIDE:'GLIDING',RECOVER:'RECOVERING'};
function chooseBehaviour(){
 const r=random();sim.mode=r<.35?'CRUISE':r<.60?'EXPLORE':r<.78?'TURN':r<.85?'DART':r<.94?'GLIDE':'RECOVER';
 const duration={CRUISE:4+random()*5,EXPLORE:3.5+random()*2.5,TURN:2.8+random()*2.2,DART:1.4+random()*.5,GLIDE:2.8+random()*2,RECOVER:2.5+random()*2};
 sim.nextChoice=sim.time+duration[sim.mode];

 let endYaw=sim.yaw;
 if(sim.mode==='TURN'||sim.mode==='EXPLORE')endYaw=sampleHorizontalHeading(random);
 if(sim.mode==='DART')endYaw=sim.yaw+(random()-.5)*.65;

 // Most trajectories stay level. A minority arc above or below the cruising plane.
 let endPitch=0;
 const verticalExcursion=(sim.mode==='EXPLORE'&&shouldMakeVerticalExcursion(random))||(sim.mode==='TURN'&&random()<.12);
 if(verticalExcursion){
  const direction=random()<.5?-1:1;
  const steep=random()<.12;
  endPitch=direction*(steep?0.88+random()*.24:0.24+random()*.48);
 }
 const curve=(random()-.5)*1.25;
 const speedPeak=sim.mode==='DART'?1.42:sim.mode==='GLIDE'?.96:1.12+random()*.18;
 const startDirection=rotate(sim.orientation,V(1,0,0));
 const endDirection=V(Math.cos(endPitch)*Math.cos(endYaw),Math.sin(endPitch),-Math.cos(endPitch)*Math.sin(endYaw));
 sim.maneuver=createManeuver({
  start:V(sim.p.x,sim.p.y,sim.p.z),startDirection,endDirection,
  distance:2.6+random()*2.1,duration:duration[sim.mode],curve,speedPeak
 });
 sim.maneuverStartedAt=sim.time;
 sim.targetYaw=endYaw;sim.targetPitch=endPitch;
 label.textContent=labels[sim.mode];
}
function simulate(dt){
 sim.time+=dt;if(sim.time>=sim.nextChoice)chooseBehaviour();
 const sampled=sim.maneuver?sampleManeuver(sim.maneuver,sim.time-sim.maneuverStartedAt):null;
 const lookAhead=add(sampled.position,mul(sampled.tangent,.85));
 const desiredDirection=unit(add(lookAhead,mul(sim.p,-1)));
 const intentYaw=Math.atan2(-desiredDirection.z,desiredDirection.x);
 const intentPitch=Math.atan2(desiredDirection.y,Math.hypot(desiredDirection.x,desiredDirection.z));
 const returnGuidance=habitatReturnGuidance(sim.p,V(6.4,3.5,5.2));
 const guidedYaw=intentYaw+angleDelta(intentYaw,returnGuidance.yaw)*returnGuidance.weight;
 const guidedPitch=intentPitch*(1-returnGuidance.weight)+returnGuidance.pitch*returnGuidance.weight;
 const yawError=angleDelta(sim.yaw,guidedYaw);
 const turn=clamp(yawError*1.7,-1,1);
 const pitch=clamp((guidedPitch-sim.pitch)*.9,-.32,.32);
 const gait=stepGait(sim.gait,sim.mode,mag(sim.vel),turn,dt);
 stepDynamics(sim,{thrust:gait.thrust*(sampled?.speed??1)+returnGuidance.thrust,turn:gait.steering,pitch,finDrag:gait.finDrag,rollMoment:gait.rollMoment,yawMoment:gait.yawMoment},dt);
 // The path is an intent curve; momentum, drag and attitude inertia determine the actual trajectory.
}
function updateCamera(){ /* Fixed side-on habitat camera: the fish moves, never the viewpoint. */ }
function project(world,w,h){
 const rel=add(world,mul(camera.p,-1)),x=dot(rel,camera.right),y=dot(rel,camera.up),z=dot(rel,camera.forward),f=Math.min(w,h)*1.34,d=Math.max(.3,z),scale=perspectiveScale(f,z);
 return{x:w*.5+x*scale,y:h*.51-y*scale,z,scale};
}
const orientation=()=>sim.orientation;
function deform(p){return deformPoint(p,sim.gait);}
function worldPoint(local){return add(sim.p,rotate(orientation(),deform(local)));}
function projectLocal(local,w,h){return project(worldPoint(local),w,h);}
function makeBodyMesh(){
 const vertices=[],faces=[],rings=24,sides=16;
 for(let i=0;i<=rings;i++){const t=i/rings,x=.98-2.65*t,profile=Math.pow(Math.max(0,Math.sin(Math.PI*t)),.68),ry=.43*profile*(1.08-.22*t),rz=.35*profile*(1.06-.2*t);
  for(let j=0;j<sides;j++){const a=j/sides*TAU;vertices.push(V(x,Math.cos(a)*ry,Math.sin(a)*rz));}}
 for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=(i+1)*sides+(j+1)%sides,d=(i+1)*sides+j;faces.push([a,b,c],[a,c,d]);}
 return{vertices,faces};
}
const mesh=makeBodyMesh(),palette=['#174b5b','#286f79','#469d98','#78c7ad','#c0ead0'];
function faceColour(points){
 const n=unit(cross(add(points[1],mul(points[0],-1)),add(points[2],mul(points[0],-1)))),light=clamp(.48+dot(n,unit(V(-.35,.82,.48)))*.5,.08,1);
 return palette[light>.78?4:light>.57?3:light>.34?2:light>.18?1:0];
}
function drawPolygon(points,color,w,h,outline=null){
 const p=points.map(v=>projectLocal(v,w,h));if(p.some(v=>v.z<.15))return;
 ctx.beginPath();p.forEach((v,i)=>{const x=Math.round(v.x/3.2)*3.2,y=Math.round(v.y/3.2)*3.2;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
 ctx.closePath();ctx.fillStyle=color;ctx.fill();if(outline){ctx.strokeStyle=outline;ctx.lineWidth=1.2;ctx.stroke();}
}
function drawFish(w,h){
 const centre=project(sim.p,w,h),reference=project(V(0,0,0),w,h);
 const treatment=distanceTreatment(centre.scale/reference.scale);
 ctx.save();ctx.globalAlpha=treatment.opacity;ctx.filter=treatment.blur>0?'blur('+treatment.blur.toFixed(2)+'px)':'none';
 const beat=Math.sin(sim.gait.phase),sweep=Math.sin(sim.gait.phase+.7);
 // Fins are drawn behind the body. Their spread changes with steering and gliding.
 const finSpreadL=sim.gait.leftFin??.18,finSpreadR=sim.gait.rightFin??.18;
 drawPolygon([V(-.22,-.16,.27),V(-.62+sim.gait.rightFinAngle*.22,-.46,.62+finSpreadR*.42),V(.02,-.3,.48),V(.18,-.12,.29)],'#286e7b',w,h,'#174e5c');
 drawPolygon([V(-.22,-.16,-.27),V(-.62+sim.gait.leftFinAngle*.22,-.46,-.62-finSpreadL*.42),V(.02,-.3,-.48),V(.18,-.12,-.29)],'#367f83',w,h,'#174e5c');
 // Split caudal lobes flex around the peduncle and trail the travelling wave.
 const tailLoad=sim.gait.tailLoad??.4;
 drawPolygon([V(-1.48,.02,0),V(-2.12,.5+tailLoad*.08,0),V(-1.82,.04,0),V(-2.12,-.48-tailLoad*.08,0)],'#388d8e',w,h,'#174e5c');
 // Dorsal and anal fins provide passive directional stability.
 drawPolygon([V(-.55,.3,0),V(-.82,.58+tailLoad*.04,0),V(-.12,.32,0)],'#4ca99c',w,h);
 drawPolygon([V(-.58,-.29,0),V(-.82,-.48,0),V(-.12,-.29,0)],'#347e85',w,h);

 const deformed=mesh.vertices.map(deform);
 const faces=mesh.faces.map(face=>({face,depth:face.reduce((s,i)=>s+project(add(sim.p,rotate(orientation(),deformed[i])),w,h).z,0)/3})).sort((a,b)=>b.depth-a.depth);
 for(const{face}of faces){const points=face.map(i=>deformed[i]),p=points.map(v=>project(add(sim.p,rotate(orientation(),v)),w,h));if(p.some(v=>v.z<.15))continue;
  ctx.beginPath();p.forEach((v,i)=>{const x=Math.round(v.x/3.2)*3.2,y=Math.round(v.y/3.2)*3.2;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.fillStyle=faceColour(points);ctx.fill();}
 const eye=projectLocal(V(.72,.13,.2),w,h);
 if(eye.z>.15){ctx.beginPath();ctx.arc(eye.x,eye.y,Math.max(2.2,eye.scale*.028),0,TAU);ctx.fillStyle='#f3f0d8';ctx.fill();ctx.beginPath();ctx.arc(eye.x+eye.scale*.008,eye.y,Math.max(1.2,eye.scale*.012),0,TAU);ctx.fillStyle='#10252c';ctx.fill();}
 const g1=projectLocal(V(.43,.22,.33),w,h),g2=projectLocal(V(.3,-.2,.34),w,h);
 ctx.beginPath();ctx.moveTo(g1.x,g1.y);ctx.quadraticCurveTo((g1.x+g2.x)/2+4,(g1.y+g2.y)/2,g2.x,g2.y);ctx.strokeStyle='rgba(15,64,73,.72)';ctx.lineWidth=1.5;ctx.stroke();
 ctx.restore();
}
const particles=Array.from({length:110},()=>({x:(random()-.5)*22,y:(random()-.5)*12,z:(random()-.5)*16,r:.5+random()*1.5,phase:random()*TAU}));
function drawEnvironment(w,h){
 const gradient=ctx.createRadialGradient(w*.5,h*.46,10,w*.5,h*.5,Math.max(w,h)*.76);
 gradient.addColorStop(0,'#17414a');gradient.addColorStop(.48,'#0c2933');gradient.addColorStop(1,'#04121a');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
 ctx.save();ctx.globalAlpha=.07;const shaft=ctx.createLinearGradient(w*.62,0,w*.42,h);
 shaft.addColorStop(0,'rgba(166,235,211,0)');shaft.addColorStop(.5,'rgba(166,235,211,.55)');shaft.addColorStop(1,'rgba(166,235,211,0)');
 ctx.fillStyle=shaft;ctx.beginPath();ctx.moveTo(w*.42,0);ctx.lineTo(w*.7,0);ctx.lineTo(w*.58,h);ctx.lineTo(w*.25,h);ctx.closePath();ctx.fill();ctx.restore();
 for(const p of particles){const drift=V(p.x+Math.sin(sim.time*.12+p.phase)*.16+sim.p.x*.06,p.y+Math.sin(sim.time*.18+p.phase)*.12,p.z+sim.p.z*.05),q=project(drift,w,h);if(q.z<.4)continue;
  const alpha=clamp(1.2/q.z,.08,.34);ctx.fillStyle='rgba(190,231,216,'+alpha+')';ctx.beginPath();ctx.arc(q.x,q.y,Math.max(.45,p.r*q.scale*.006),0,TAU);ctx.fill();}
}
function render(){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),width=Math.max(1,Math.round(rect.width*dpr)),height=Math.max(1,Math.round(rect.height*dpr));
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 ctx.setTransform(dpr,0,0,dpr,0,0);drawEnvironment(rect.width,rect.height);drawFish(rect.width,rect.height);
}
let previous=performance.now(),accumulator=0;
function frame(now){const elapsed=Math.min(.05,(now-previous)/1000);previous=now;accumulator+=elapsed;const dt=1/120;let steps=0;
 while(accumulator>=dt&&steps++<8){simulate(dt);accumulator-=dt;}
 updateCamera();render();requestAnimationFrame(frame);
}
chooseBehaviour();requestAnimationFrame(frame);
