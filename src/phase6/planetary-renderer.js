/**
 * Procedural planetary overview with the active voxel habitat patch draped
 * onto the same geographic frame used by local terrain streaming.
 *
 * Global geography is sampled as 3D noise on the unit sphere. Near the active
 * geographic anchor, the overview instead samples the exact local seabed field
 * through the navigation tangent map, then smoothly returns to the global
 * spherical field. The global field has no longitude seam or polar singularity.
 */
import { terrainColour } from './habitat-terrain-stream.js';
import { seabedHeight } from './seabed-height.js';

const TAU=Math.PI*2;
const PLANETARY_RADIUS=250;
const LOCAL_FIELD_RADIUS=.45;
const LOCAL_FIELD_BLEND_END=.8;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smoothstep=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const fade=t=>t*t*t*(t*(t*6-15)+10);
const hash3=(x,y,z)=>{
  let h=(Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(z,2147483647))|0;
  h=Math.imul(h^(h>>>13),1274126177);
  return ((h^(h>>>16))>>>0)/4294967295;
};
function valueNoise3(x,y,z){
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
  const fx=fade(x-ix),fy=fade(y-iy),fz=fade(z-iz);
  const a=hash3(ix,iy,iz),b=hash3(ix+1,iy,iz),c=hash3(ix,iy+1,iz),d=hash3(ix+1,iy+1,iz);
  const e=hash3(ix,iy,iz+1),f=hash3(ix+1,iy,iz+1),g=hash3(ix,iy+1,iz+1),h=hash3(ix+1,iy+1,iz+1);
  const mix=(p,q,t)=>p+(q-p)*t;
  return mix(mix(mix(a,b,fx),mix(c,d,fx),fy),mix(mix(e,f,fx),mix(g,h,fx),fy),fz);
}

/** Stable [0,1] spherical elevation field; periodic across every longitude. */
export function planetarySurfaceElevation(lon,lat){
  if(!Number.isFinite(lon)||!Number.isFinite(lat))throw new RangeError('Planet coordinates must be finite.');
  const c=Math.cos(lat),x=c*Math.sin(lon),y=Math.sin(lat),z=c*Math.cos(lon);
  // Warp the spherical domain before sampling so coastlines do not read as
  // concentric blobs. Sampling XYZ on the unit sphere keeps the field closed.
  const warpX=(valueNoise3(x*1.35+31,y*1.35-12,z*1.35+7)-.5)*.82;
  const warpY=(valueNoise3(x*1.35-19,y*1.35+23,z*1.35-5)-.5)*.82;
  const warpZ=(valueNoise3(x*1.35+4,y*1.35+8,z*1.35+29)-.5)*.82;
  const px=x+warpX,py=y+warpY,pz=z+warpZ;
  const broad=valueNoise3(px*2.15+11,py*2.15-7,pz*2.15+3);
  const regional=valueNoise3(px*5.1-4,py*5.1+9,pz*5.1+13);
  const coastal=valueNoise3(px*12.4+17,py*12.4+2,pz*12.4-8);
  // Ridged multifractal detail forms elongated mountain systems rather than
  // isolated high-frequency speckle. It only lifts established continental
  // interiors and regional uplands.
  const ridgeNoise=valueNoise3(px*8.6-13,py*8.6+17,pz*8.6+6);
  const ridges=1-Math.abs(2*ridgeNoise-1);
  const mountainMask=smoothstep(.53,.69,broad)*(.35+.65*smoothstep(.47,.72,regional));
  const globalElevation=clamp(broad*.76+regional*.19+coastal*.05+ridges*.14*mountainMask,0,1);

  // The overview and the streamed habitat share one bathymetric field around
  // the geographic anchor. Convert the spherical point through the same
  // logarithmic tangent mapping used by planetary navigation, then sample the
  // exact seabed function used by voxel workers and creature contact.
  const angularDistance=Math.acos(clamp(z,-1,1));
  if(angularDistance>=LOCAL_FIELD_BLEND_END)return globalElevation;
  const sine=Math.sin(angularDistance);
  const east=angularDistance<1e-10?0:PLANETARY_RADIUS*angularDistance*x/sine;
  const north=angularDistance<1e-10?0:PLANETARY_RADIUS*angularDistance*y/sine;
  const localHeight=seabedHeight(east,north);
  const localElevation=clamp(.42+(localHeight+8.65)*.012,.36,.48);
  const localWeight=1-smoothstep(LOCAL_FIELD_RADIUS,LOCAL_FIELD_BLEND_END,angularDistance);
  return globalElevation+(localElevation-globalElevation)*localWeight;
}

const SURFACE_CELLS=(()=>{
  const cells=[],step=.065;
  for(let lat=-Math.PI/2;lat<Math.PI/2;lat+=step){
    for(let lon=-Math.PI;lon<Math.PI;lon+=step){
      const midLon=lon+step*.5,midLat=Math.min(Math.PI/2,lat+step*.5);
      const c=Math.cos(midLat);
      cells.push({
        corners:[[lon,lat],[lon+step,lat],[lon+step,Math.min(Math.PI/2,lat+step)],[lon,Math.min(Math.PI/2,lat+step)]],
        x:c*Math.sin(midLon),y:Math.sin(midLat),z:c*Math.cos(midLon),
        elevation:planetarySurfaceElevation(midLon,midLat),
        moisture:valueNoise3(c*Math.sin(midLon)*3.4+21,Math.sin(midLat)*3.4-5,c*Math.cos(midLon)*3.4+2)
      });
    }
  }
  return cells;
})();
const CLOUD_CELLS=(()=>{
  const cells=[],step=.12;
  for(let lat=-1.48;lat<1.49;lat+=step){
    for(let lon=-Math.PI;lon<Math.PI;lon+=step){
      const midLon=lon+step*.5,midLat=lat+step*.5,c=Math.cos(midLat);
      cells.push({corners:[[lon,lat],[lon+step,lat],[lon+step,lat+step],[lon,lat+step]],x:c*Math.sin(midLon),y:Math.sin(midLat),z:c*Math.cos(midLon)});
    }
  }
  return cells;
})();

function makeProjection({yaw,pitch,focusLongitude,focusLatitude}){
  const cp=Math.cos(pitch),sp=Math.sin(pitch),cyaw=Math.cos(yaw),syaw=Math.sin(yaw);
  const clampedLat=clamp(focusLatitude,-Math.PI/2,Math.PI/2),clampedLon=focusLongitude;
  const up={x:Math.cos(clampedLat)*Math.sin(clampedLon),y:Math.sin(clampedLat),z:Math.cos(clampedLat)*Math.cos(clampedLon)};
  const east={x:Math.cos(clampedLon),y:0,z:-Math.sin(clampedLon)};
  const north={x:-Math.sin(clampedLat)*Math.sin(clampedLon),y:Math.cos(clampedLat),z:-Math.sin(clampedLat)*Math.cos(clampedLon)};
  return vector=>{
    const x=vector.x*east.x+vector.y*east.y+vector.z*east.z;
    const y=vector.x*north.x+vector.y*north.y+vector.z*north.z;
    const z=vector.x*up.x+vector.y*up.y+vector.z*up.z;
    const rx=x*cyaw+z*syaw,rz=z*cyaw-x*syaw,ry=y*cp-rz*sp;
    return{x:rx,y:ry,front:y*sp+rz*cp};
  };
}
function polygon(ctx,corners,project,cx,cy,r){
  const points=corners.map(([lon,lat])=>project({x:Math.cos(lat)*Math.sin(lon),y:Math.sin(lat),z:Math.cos(lat)*Math.cos(lon)}));
  if(points.every(point=>point.front<=0))return null;
  ctx.beginPath();
  points.forEach((point,index)=>index?ctx.lineTo(cx+point.x*r,cy-point.y*r):ctx.moveTo(cx+point.x*r,cy-point.y*r));
  ctx.closePath();
  return points;
}

/** Render a lit rotating ocean globe and the live local voxel terrain patch. */
export function drawPlanetaryGlobe(ctx,width,height,{
  yaw=0,pitch=0,focusLongitude=0,focusLatitude=0,scale=1,opacity=1,time=0,
  terrainMeshes=[],planetaryFrame=null,surfaceForeshorten=1
}={}){
  if(!ctx||!Number.isFinite(width)||!Number.isFinite(height)||opacity<=.001)return;
  const cx=width*.5,cy=height*.49,r=Math.min(width,height)*.335*clamp(scale,.035,3.6);
  ctx.save();
  const space=ctx.createRadialGradient(cx,cy-r*.25,0,cx,cy,Math.max(width,height)*.72);
  space.addColorStop(0,'#102c3d');space.addColorStop(.58,'#071a29');space.addColorStop(1,'#020811');
  ctx.globalAlpha=opacity*smoothstep(.38,1,opacity);ctx.fillStyle=space;ctx.fillRect(0,0,width,height);
  for(let i=0;i<95;i++){
    const x=((i*127.1+31.7)%997)/997*width,y=((i*311.7+17.3)%991)/991*height;
    ctx.globalAlpha=opacity*(.12+((i*37)%7)*.025);ctx.fillStyle='#c8e8ee';ctx.fillRect(x,y,i%13===0?1.7:1,i%13===0?1.7:1);
  }
  ctx.globalAlpha=opacity;
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.clip();
  const project=makeProjection({yaw,pitch,focusLongitude,focusLatitude});
  const ocean=ctx.createRadialGradient(cx-r*.34,cy-r*.42,r*.03,cx,cy,r*1.14);
  ocean.addColorStop(0,'#287d91');ocean.addColorStop(.34,'#155b76');ocean.addColorStop(.72,'#0b3b59');ocean.addColorStop(1,'#031426');
  ctx.fillStyle=ocean;ctx.fillRect(cx-r,cy-r,r*2,r*2);

  // A fixed distant light gives the ocean and land a consistent day/night limb.
  const sun={x:-.48,y:.62,z:.62},sunLength=Math.hypot(sun.x,sun.y,sun.z);
  sun.x/=sunLength;sun.y/=sunLength;sun.z/=sunLength;
  const sunScreen=project(sun),sunX=cx+sunScreen.x*r,sunY=cy-sunScreen.y*r;
  const terminator=ctx.createLinearGradient(sunX-sunScreen.x*r,sunY+sunScreen.y*r,sunX+sunScreen.x*r,sunY-sunScreen.y*r);
  terminator.addColorStop(0,'rgba(0,0,0,.38)');terminator.addColorStop(.5,'rgba(0,0,0,.04)');terminator.addColorStop(1,'rgba(0,0,0,.30)');
  ctx.globalAlpha=opacity;ctx.fillStyle=terminator;ctx.fillRect(cx-r,cy-r,r*2,r*2);

  // Continental shelves, land and mountains are coloured by elevation,
  // latitude and a slowly varying moisture field.
  for(const cell of SURFACE_CELLS){
    const land=smoothstep(.535,.585,cell.elevation);
    const shelf=smoothstep(.47,.535,cell.elevation)*(1-land);
    const points=polygon(ctx,cell.corners,project,cx,cy,r);
    if(!points)continue;
    const front=points.reduce((sum,p)=>sum+Math.max(0,p.front),0)/4;
    if(land<=.008&&shelf<=.015){
      // Subtle abyssal colour bands reveal ocean basins and raised seafloor
      // without turning the overview into a noisy bathymetric heat map.
      const basinBand=Math.pow(Math.max(0,Math.sin(cell.elevation*88)),12);
      const depthTint=smoothstep(.28,.52,cell.elevation);
      ctx.globalAlpha=opacity*(.018+basinBand*.018+depthTint*.018)*front;
      ctx.fillStyle=cell.elevation<.28?'#061d32':'#0c3851';
      ctx.fill();
      continue;
    }
    const light=Math.max(0,cell.x*sun.x+cell.y*sun.y+cell.z*sun.z);
    const latitude=Math.abs(Math.asin(clamp(cell.y,-1,1)));
    let colour;
    if(land>.5){
      if(cell.elevation>.735||latitude>1.27)colour=cell.elevation>.79?'#e0e4d7':'#b8c6bb';
      else if(latitude>.55&&latitude<1.05)colour=cell.moisture<.48?'#a18f69':'#71876e';
      else colour=cell.moisture<.43?'#9c956d':cell.moisture>.62?'#477b68':'#668b70';
    }else colour='#b1a47d';
    const illumination=.48+light*.58;
    const base=land>.5?colour:'#b6a17a';
    ctx.globalAlpha=opacity*(land>.5?(.72+front*.18)*illumination:shelf*.36);
    ctx.fillStyle=base;
    ctx.fill();
    if(land>.5&&cell.elevation>.69){
      ctx.globalAlpha=opacity*land*(.12+light*.14);
      ctx.fillStyle='#f1eee0';ctx.fill();
    }
    ctx.globalAlpha=opacity*(.035+front*.045);
    ctx.fillStyle=light>.48?'#d7e8d4':'#071b29';ctx.fill();
  }

  // Broad, drifting cloud fields add scale and depth without hiding coastlines.
  const drift=time*.0018;
  for(const cell of CLOUD_CELLS){
    const cloud=valueNoise3(cell.x*5.6+drift*1.7,cell.y*5.6+drift*.25,cell.z*5.6-drift);
    const density=smoothstep(.665,.79,cloud);
    if(density<.025)continue;
    const points=polygon(ctx,cell.corners,project,cx,cy,r);
    if(!points)continue;
    const front=points.reduce((sum,p)=>sum+Math.max(0,p.front),0)/4;
    ctx.globalAlpha=opacity*density*front*.22;
    ctx.fillStyle='#e5f1ed';ctx.fill();
  }

  // The same streamed mesh is bent around the sphere before the hand-off.
  if(planetaryFrame&&terrainMeshes.length){
    const triangles=[];let totalTriangles=0,maxAngle=0;
    for(const mesh of terrainMeshes)totalTriangles+=Math.floor((mesh.indices?.length??0)/3);
    const stride=Math.max(1,Math.ceil(totalTriangles/3500));
    for(const mesh of terrainMeshes){
      const {positions,normals,indices}=mesh;
      if(!positions||!normals||!indices)continue;
      for(let index=0;index<indices.length;index+=3*stride){
        const points=[],normal=[0,0,0],position=[0,0,0];let front=0,angle=0,valid=true;
        for(let vertex=0;vertex<3;vertex++){
          const offset=indices[index+vertex]*3,x=positions[offset],y=positions[offset+1],z=positions[offset+2];
          const geographic=planetaryFrame.localToGeographic(x,-z);
          const projected=project({x:Math.cos(geographic.latitude)*Math.sin(geographic.longitude),y:Math.sin(geographic.latitude),z:Math.cos(geographic.latitude)*Math.cos(geographic.longitude)});
          if(projected.front<=.015){valid=false;break;}
          const unit={x:Math.cos(geographic.latitude)*Math.sin(geographic.longitude),y:Math.sin(geographic.latitude),z:Math.cos(geographic.latitude)*Math.cos(geographic.longitude)};
          const angularDistance=Math.acos(clamp(unit.x*Math.cos(focusLatitude)*Math.sin(focusLongitude)+unit.y*Math.sin(focusLatitude)+unit.z*Math.cos(focusLatitude)*Math.cos(focusLongitude),-1,1));
          angle+=angularDistance/3;maxAngle=Math.max(maxAngle,angularDistance);
          const radial=1+(y+8.65)/Math.max(1,planetaryFrame.radius);
          points.push({x:cx+projected.x*r*radial,y:cy-projected.y*r*clamp(surfaceForeshorten,.01,1)});
          front+=projected.front/3;
          for(let axis=0;axis<3;axis++){normal[axis]+=normals[offset+axis]/3;position[axis]+=[x,y,z][axis]/3;}
        }
        if(valid)triangles.push({points,front,angle,normal,position});
      }
    }
    triangles.sort((a,b)=>a.front-b.front);
    for(const triangle of triangles){
      const edgeFade=1-smoothstep(maxAngle*.66,maxAngle*.99,triangle.angle);
      if(edgeFade<=.005)continue;
      ctx.globalAlpha=opacity*edgeFade*(.76+triangle.front*.2);
      ctx.beginPath();triangle.points.forEach((point,index)=>index?ctx.lineTo(point.x,point.y):ctx.moveTo(point.x,point.y));
      ctx.closePath();ctx.fillStyle=terrainColour(triangle.normal,triangle.position);ctx.fill();
    }
  }

  // Fine reflected light on the ocean is tied to the projected sun direction.
  if(sunScreen.front>0){
    const glint=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,r*.52);
    glint.addColorStop(0,'rgba(199,239,225,.22)');glint.addColorStop(.22,'rgba(115,205,210,.08)');glint.addColorStop(1,'rgba(70,160,190,0)');
    ctx.globalAlpha=opacity;ctx.fillStyle=glint;ctx.fillRect(cx-r,cy-r,r*2,r*2);
  }

  // Very subtle graticule, mainly useful for communicating the spherical form.
  ctx.globalAlpha=opacity*.105;ctx.strokeStyle='#b5e0df';ctx.lineWidth=Math.max(.45,r*.0018);
  for(let lat=-1.2;lat<=1.21;lat+=.4){
    ctx.beginPath();let drawing=false;
    for(let i=0;i<=120;i++){
      const lon=-Math.PI+i/120*TAU,p=project({x:Math.cos(lat)*Math.sin(lon),y:Math.sin(lat),z:Math.cos(lat)*Math.cos(lon)});
      if(p.front>0){const px=cx+p.x*r,py=cy-p.y*r;if(!drawing){ctx.moveTo(px,py);drawing=true;}else ctx.lineTo(px,py);}else drawing=false;
    }
    ctx.stroke();
  }
  ctx.restore();

  // Atmospheric rim and soft scattering sit outside the clipped sphere.
  const halo=ctx.createRadialGradient(cx,cy,r*.88,cx,cy,r*1.12);
  halo.addColorStop(0,'rgba(74,174,203,0)');halo.addColorStop(.72,'rgba(74,174,203,0)');halo.addColorStop(.88,'rgba(89,196,218,.12)');halo.addColorStop(1,'rgba(75,159,207,0)');
  ctx.globalAlpha=opacity;ctx.fillStyle=halo;ctx.beginPath();ctx.arc(cx,cy,r*1.12,0,TAU);ctx.fill();
  ctx.globalAlpha=opacity*.72;ctx.strokeStyle='rgba(184,231,231,.7)';ctx.lineWidth=Math.max(1,r*.004);
  ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.stroke();
  ctx.restore();
}
