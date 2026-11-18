/**
 * Lightweight procedural toy-ocean planet for the outer navigation tier.
 * Drawn into the existing 2D presentation canvas; it is an overview layer,
 * not a second world simulation or a replacement for local voxel terrain.
 */
const TAU = Math.PI * 2;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
function surface(lon,lat){
  const broad=Math.sin(lon*2.1+Math.sin(lat*3.2))*Math.cos(lat*2.8);
  const ridge=Math.sin(lon*5.3+lat*2.4)*Math.cos(lat*6.1);
  const basin=Math.cos(lon*1.3-lat*2.7)*Math.sin(lat*4.4);
  return broad*.52+ridge*.19+basin*.29;
}
/** Render a lit, rotating spherical ocean world with deterministic bathymetry. */
export function drawPlanetaryGlobe(ctx,width,height,{yaw=0,pitch=0,focusLongitude=0,focusLatitude=0,opacity=1,time=0}={}){
  if(!ctx||!Number.isFinite(width)||!Number.isFinite(height)||opacity<=.001)return;
  const cx=width*.5,cy=height*.49,r=Math.min(width,height)*.335;
  ctx.save();ctx.globalAlpha*=clamp(opacity,0,1);
  const space=ctx.createRadialGradient(cx,cy-r*.25,0,cx,cy,Math.max(width,height)*.72);
  space.addColorStop(0,'#102c3d');space.addColorStop(.58,'#071a29');space.addColorStop(1,'#020811');
  ctx.fillStyle=space;ctx.fillRect(0,0,width,height);
  // Sparse deterministic stars, stable between frames.
  for(let i=0;i<95;i++){
    const x=((i*127.1+31.7)%997)/997*width,y=((i*311.7+17.3)%991)/991*height;
    const a=.16+((i*37)%7)*.035;
    ctx.globalAlpha=opacity*a;ctx.fillStyle='#c8e8ee';ctx.fillRect(x,y, i%13===0?1.7:1, i%13===0?1.7:1);
  }
  ctx.globalAlpha=opacity;
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.clip();
  const ocean=ctx.createRadialGradient(cx-r*.36,cy-r*.48,r*.04,cx,cy,r*1.12);
  ocean.addColorStop(0,'#2a7d91');ocean.addColorStop(.45,'#14536c');ocean.addColorStop(.82,'#092d47');ocean.addColorStop(1,'#020d20');
  ctx.fillStyle=ocean;ctx.fillRect(cx-r,cy-r,r*2,r*2);
  const cp=Math.cos(pitch),sp=Math.sin(pitch),cyaw=Math.cos(yaw),syaw=Math.sin(yaw);
  const clampedLat=clamp(focusLatitude,-Math.PI/2,Math.PI/2),clampedLon=focusLongitude;
  const up={x:Math.cos(clampedLat)*Math.sin(clampedLon),y:Math.sin(clampedLat),z:Math.cos(clampedLat)*Math.cos(clampedLon)};
  const east={x:Math.cos(clampedLon),y:0,z:-Math.sin(clampedLon)};
  const north={x:-Math.sin(clampedLat)*Math.sin(clampedLon),y:Math.cos(clampedLat),z:-Math.sin(clampedLat)*Math.cos(clampedLon)};
  const projectGeo=(lon,lat)=>{
    const v={x:Math.cos(lat)*Math.sin(lon),y:Math.sin(lat),z:Math.cos(lat)*Math.cos(lon)};
    const x=v.x*east.x+v.y*east.y+v.z*east.z,y=v.x*north.x+v.y*north.y+v.z*north.z,z=v.x*up.x+v.y*up.y+v.z*up.z;
    const rx=x*cyaw+z*syaw,rz=z*cyaw-x*syaw,ry=y*cp-rz*sp,front=y*sp+rz*cp;
    return {x:rx,y:ry,front};
  };
  // Keep the selected local habitat coordinate at the globe's forward pole.
  for(let lat=-1.48;lat<=1.49;lat+=.105){
    for(let lon=-Math.PI;lon<Math.PI;lon+=.105){
      const p=projectGeo(lon,lat),front=p.front;if(front<=0)continue;
      const relief=surface(lon,lat),land=relief>.47,px=cx+p.x*r,py=cy-p.y*r;
      const size=Math.max(.7,r*.012*(.45+front*.55)),shade=clamp(.72+front*.25+relief*.12,0,1);
      ctx.globalAlpha=opacity*(.48+front*.45);ctx.fillStyle=land?(shade>.88?'#b2aa82':'#668b78'):(shade>.86?'#28738a':'#10445f');
      ctx.beginPath();ctx.ellipse(px,py,size*1.35,size,0,0,TAU);ctx.fill();
    }
  }
  ctx.globalAlpha=opacity*.17;ctx.strokeStyle='#a9d9df';ctx.lineWidth=Math.max(.55,r*.0025);
  for(let lat=-1.2;lat<=1.21;lat+=.4){
    ctx.beginPath();for(let i=0;i<=100;i++){const lon=-Math.PI+i/100*TAU,p=projectGeo(lon,lat);if(p.front>0){const px=cx+p.x*r,py=cy-p.y*r;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}}ctx.stroke();
  }
  ctx.globalAlpha=opacity*.9;ctx.strokeStyle='rgba(218,246,235,.82)';ctx.lineWidth=Math.max(1,r*.006);
  ctx.beginPath();ctx.arc(cx,cy,Math.max(3,r*.022),0,TAU);ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,Math.max(1.2,r*.006),0,TAU);ctx.fillStyle='#e0f4d9';ctx.fill();
  ctx.restore();
  const limb=ctx.createRadialGradient(cx-r*.12,cy-r*.18,r*.68,cx,cy,r*1.04);
  limb.addColorStop(0,'rgba(80,184,205,0)');limb.addColorStop(.82,'rgba(80,184,205,.03)');limb.addColorStop(.96,'rgba(105,207,224,.34)');limb.addColorStop(1,'rgba(74,159,207,.08)');
  ctx.fillStyle=limb;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fill();
  ctx.restore();
}
