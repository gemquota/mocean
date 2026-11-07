import { TAU, clamp, mix, vec3 as V, add3 as add, scale3 as mul, dot3 as dot, length3 as mag, normalize3 as unit, quatFromEuler as quatEuler, quatRotate as rotate, angleDelta } from './core/math.js';
import { stepDynamics } from './core/dynamics.js';
let seed=433841;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const canvases=['pixel','hybrid','layered','voxel'].map(id=>document.getElementById(id)),ctxs=canvases.map(c=>c.getContext('2d'));
const ui=id=>document.getElementById(id);
const params={drive:1,agility:1,dart:.65,depth:1};
const sim={p:V(),vel:V(.15,0,0),yaw:0,pitch:0,roll:0,wy:0,wp:0,wr:0,phase:0,time:0,mode:'CRUISE',modeTime:0,nextChoice:2.5,targetYaw:0,targetPitch:0,targetDepth:0,impulse:0,auto:true,running:true,manual:V(),manualTurn:0};
const modes=['CRUISE','DRIFT','EXPLORE','DART','TURN','RECOVER'];
function chooseMode(){const r=random();sim.mode=r<.36?'CRUISE':r<.53?'DRIFT':r<.76?'EXPLORE':r<.84?'DART':r<.94?'TURN':'RECOVER';sim.modeTime=0;sim.nextChoice=sim.time+(sim.mode==='DART'?.45+random()*.65:1.8+random()*3.8);if(sim.mode==='DART')sim.impulse=1; if(sim.mode==='TURN'){sim.targetYaw+=(random()-.5)*2.4;sim.targetPitch+=(random()-.5)*.7;}}
function reset(){seed=Number(ui('seed').value)||433841;sim.p=V();sim.vel=V(.15,0,0);sim.yaw=sim.pitch=sim.roll=sim.wy=sim.wp=sim.wr=sim.phase=sim.time=sim.modeTime=0;sim.targetYaw=0;sim.targetPitch=0;sim.targetDepth=0;sim.mode='CRUISE';sim.nextChoice=1.5;sim.impulse=0;sim.manual=V();sim.manualTurn=0;chooseMode();}
function step(dt){
 sim.time+=dt;sim.phase+=dt*(2.6+mag(sim.vel)*1.7);sim.modeTime+=dt;
 if(sim.auto&&sim.time>=sim.nextChoice)chooseMode();
 const q=quatEuler(sim.yaw,sim.pitch,sim.roll),forward=rotate(q,V(1,0,0)),right=rotate(q,V(0,0,1)),up=rotate(q,V(0,1,0));
 let thrust=0,side=0,lift=0,turn=0,pitchCmd=0;
 if(sim.auto){
  const intensity=params.dart;
  const wanderYaw=Math.sin(sim.time*.37)*.25+Math.sin(sim.time*.13+1.4)*.18;
  const desiredYaw=sim.targetYaw+wanderYaw;
  turn=clamp(angleDelta(sim.yaw,desiredYaw)*1.7,-1,1);
  pitchCmd=clamp((sim.targetPitch+Math.sin(sim.time*.29)*.10-sim.pitch)*1.5,-.5,.5);
  switch(sim.mode){
   case 'CRUISE':thrust=.42;break;
   case 'DRIFT':thrust=.08;break;
   case 'EXPLORE':thrust=.32;side=Math.sin(sim.time*1.1)*.12;turn+=Math.sin(sim.time*.8)*.15;break;
   case 'DART':thrust=1.25*intensity+.25;break;
   case 'TURN':thrust=.22;turn=clamp(turn+Math.sign(Math.sin(sim.time*2.1))*.3,-1,1);break;
   case 'RECOVER':thrust=.12;break;
  }
  lift=clamp((sim.targetDepth-sim.p.y)*.08,-.22,.22)*params.depth;
 }
 if(mag(sim.manual)>.01){thrust+=sim.manual.x;side+=sim.manual.z;lift+=sim.manual.y;turn+=sim.manualTurn;sim.manual=mul(sim.manual,Math.exp(-dt*2.5));sim.manualTurn*=Math.exp(-dt*2.5);}
 stepDynamics(sim,{thrust,side,lift,turn,pitch:pitchCmd},{drive:params.drive,agility:params.agility},dt);
 sim.impulse=Math.max(0,sim.impulse-dt*1.6);
}
function project(p,w,h,scale=1){const depth=1+p.z*.055;return{x:w*.5+p.x*scale*depth,y:h*.52-p.y*scale*depth,z:p.z,scale:depth};}
function drawWater(c,w,h,t){c.clearRect(0,0,w,h);const g=c.createRadialGradient(w*.5,h*.5,5,w*.5,h*.5,w*.75);g.addColorStop(0,'#123b46');g.addColorStop(1,'#071a24');c.fillStyle=g;c.fillRect(0,0,w,h);c.strokeStyle='rgba(110,190,190,.08)';c.lineWidth=1;for(let i=0;i<5;i++){const y=h*(.16+i*.17)+Math.sin(t*.4+i)*4;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(w*.3,y-5,w*.7,y+5,w,y-2);c.stroke();}}
function localPoint(x,y,z){return rotate(quatEuler(sim.yaw,sim.pitch,sim.roll),V(x,y,z));}
function fishShape(c,w,h,style){
 const scale=Math.min(w/390,h/230)*1.2,center=project(sim.p,w,h,scale*13),s=center.scale;
 const beat=Math.sin(sim.phase)*(.16+Math.min(.25,mag(sim.vel)*.035)+sim.impulse*.22),tail=beat*30*s;
 const bodyLen=72*s,bodyH=25*s;
 const points=[[-bodyLen*.53,0],[-bodyLen*.35,-bodyH*.7],[bodyLen*.12,-bodyH],[bodyLen*.43,-bodyH*.48],[bodyLen*.56,0],[bodyLen*.43,bodyH*.48],[bodyLen*.12,bodyH],[-bodyLen*.35,bodyH*.7]];
 const angle=sim.yaw,ca=Math.cos(angle),sa=Math.sin(angle);
 const transform=(x,y)=>({x:center.x+x*ca-y*sa,y:center.y-x*sa-y*ca});
 const poly=(pts,fill,stroke='#173d47',lw=1)=>{c.beginPath();pts.forEach(([x,y],i)=>{const p=transform(x*s,y*s);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y)});c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lw*s;c.stroke();}};
 const body=points.map(([x,y])=>[x,y]);
 const tailPts=[[-bodyLen*.48,0],[-bodyLen*.82+tail,-bodyH*.82],[-bodyLen*.75+tail,0],[-bodyLen*.82+tail,bodyH*.82]];
 if(style==='pixel'){
  const unit=3*s;c.save();c.translate(center.x,center.y);c.rotate(-angle);c.translate(-center.x,-center.y);
  const drawBlocks=(pts,color,step)=>{const xs=pts.map(p=>p[0]*s),ys=pts.map(p=>p[1]*s);const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);c.fillStyle=color;for(let x=minX;x<maxX;x+=step)for(let y=minY;y<maxY;y+=step){if(pointIn(x,y,pts.map(p=>[p[0]*s,p[1]*s])))c.fillRect(center.x+x,center.y+y,step,step);}};
  drawBlocks(tailPts,'#65c8b2',unit);drawBlocks(body,'#8bdcc4',unit);c.fillStyle='#d1f4d9';c.fillRect(center.x+bodyLen*.24*s,center.y-bodyH*.45*s,unit*2,unit*2);c.fillStyle='#09232c';c.fillRect(center.x+bodyLen*.34*s,center.y-bodyH*.15*s,unit*2,unit*2);c.restore();return;
 }
 poly(tailPts,style==='voxel'?'#347e80':'#55a99d');
 poly([[-bodyLen*.12,-bodyH*.75],[bodyLen*.1,-bodyH*1.5],[bodyLen*.34,-bodyH*.58]],'#438f8d');
 poly([[-bodyLen*.12,bodyH*.7],[bodyLen*.13,bodyH*1.28],[bodyLen*.28,bodyH*.5]],'#397f83');
 poly(body,style==='hybrid'?'#86c8ad':'#72bba9', '#28545a',1.4);
 c.beginPath();const eye=transform(bodyLen*.34,-bodyH*.2);c.arc(eye.x,eye.y,2.5*s,0,TAU);c.fillStyle='#f0e8c8';c.fill();c.beginPath();c.arc(eye.x+.4*s,eye.y,1.2*s,0,TAU);c.fillStyle='#10242b';c.fill();
 if(style==='hybrid'){c.strokeStyle='rgba(222,245,213,.55)';c.lineWidth=1*s;for(let i=0;i<4;i++){const x=-bodyLen*.18+i*bodyLen*.12;c.beginPath();const a=transform(x,-bodyH*.65),b=transform(x+bodyLen*.05,bodyH*.62);c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}}
 if(style==='layered'){for(let i=0;i<3;i++){const a=transform(-bodyLen*.25+i*bodyLen*.15,-bodyH*.65),b=transform(-bodyLen*.2+i*bodyLen*.15,bodyH*.62);c.strokeStyle='rgba(210,245,229,.28)';c.lineWidth=2*s;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}}
 if(style==='voxel'){const p=transform(-bodyLen*.05,-bodyH*.4);c.fillStyle='#b1e5c9';c.fillRect(p.x,p.y,4*s,4*s);const p2=transform(bodyLen*.12,bodyH*.25);c.fillStyle='#4a8e8b';c.fillRect(p2.x,p2.y,5*s,5*s);}
}
function pointIn(x,y,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi+1e-9)+xi))inside=!inside;}return inside;}
function render(){canvases.forEach((canvas,i)=>{const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const c=ctxs[i];c.setTransform(dpr,0,0,dpr,0,0);const ww=rect.width,hh=rect.height;drawWater(c,ww,hh,sim.time);c.save();if(i===0){c.imageSmoothingEnabled=false;fishShape(c,ww,hh,'pixel');}else fishShape(c,ww,hh,['pixel','hybrid','layered','voxel'][i]);c.restore();if(i===2){c.fillStyle='rgba(133,213,199,.55)';c.font='9px monospace';c.fillText('DEPTH '+sim.p.z.toFixed(2),12,hh-13);}if(i===3){c.fillStyle='rgba(133,213,199,.55)';c.font='9px monospace';c.fillText('VOXEL PROXY / 3D POSE',12,hh-13);}});}
function telemetry(){ui('position').textContent=[sim.p.x,sim.p.y,sim.p.z].map(x=>x.toFixed(2)).join(' / ');ui('velocity').textContent=mag(sim.vel).toFixed(2)+' m/s';ui('heading').textContent=[sim.yaw,sim.pitch,sim.roll].map(x=>Math.round(x*180/Math.PI)+'°').join(' / ');ui('state').textContent=sim.mode;}
let last=performance.now(),acc=0;function frame(now){const elapsed=Math.min(.05,(now-last)/1000);last=now;if(sim.running){acc+=elapsed;const dt=1/120;let n=0;while(acc>=dt&&n++<8){step(dt);acc-=dt;}}render();telemetry();requestAnimationFrame(frame);}
function bindRange(id,key,out,suffix='×'){const el=ui(id);el.addEventListener('input',()=>{params[key]=Number(el.value);ui(out).textContent=Number(el.value).toFixed(2)+suffix;});}
bindRange('drive','drive','driveOut');bindRange('agility','agility','agilityOut');bindRange('dart','dart','dartOut','');bindRange('depth','depth','depthOut');
ui('seed').addEventListener('input',()=>ui('seedOut').textContent=ui('seed').value);
ui('reseed').addEventListener('click',reset);ui('reset').addEventListener('click',reset);
ui('running').addEventListener('change',e=>{sim.running=e.target.checked;ui('pause').textContent=sim.running?'Ⅱ PAUSE':'▶ RESUME';});
ui('pause').addEventListener('click',()=>{sim.running=!sim.running;ui('running').checked=sim.running;ui('pause').textContent=sim.running?'Ⅱ PAUSE':'▶ RESUME';});
ui('autonomy').addEventListener('change',e=>{sim.auto=e.target.checked;if(sim.auto)chooseMode();else sim.mode='MANUAL';});
document.querySelectorAll('[data-nudge]').forEach(b=>b.addEventListener('click',()=>{const m=b.dataset.nudge;if(m==='forward')sim.manual.x+=1.2;if(m==='reverse')sim.manual.x-=.35;if(m==='left')sim.manualTurn-=.8;if(m==='right')sim.manualTurn+=.8;if(m==='up')sim.manual.y+=.7;if(m==='down')sim.manual.y-=.7;}));
reset();requestAnimationFrame(frame);