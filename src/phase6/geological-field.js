/**
 * Feature-driven geological field prototype.
 * Positive distance is water; negative is solid. Isolated from the live habitat.
 */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mix = (a, b, t) => a + (b - a) * t;
function randomFrom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
function distance2(x, z, a, b) {
  const dx=b.x-a.x, dz=b.z-a.z, l=dx*dx+dz*dz||1;
  const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/l,0,1);
  return Math.hypot(x-a.x-dx*t,z-a.z-dz*t);
}
function distance3(p,a,b) {
  const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,l=dx*dx+dy*dy+dz*dz||1;
  const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/l,0,1);
  return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t,p.z-a.z-dz*t);
}
function makePath(random,bounds,count,yAt,lateral=0) {
  const points=[],start=bounds.minX+2,end=bounds.maxX-2;
  const centre=(bounds.minZ+bounds.maxZ)*.5,span=bounds.maxZ-bounds.minZ,phase=random()*Math.PI*2;
  for(let i=0;i<=count;i++){
    const t=i/count,x=mix(start,end,t);
    const z=centre+Math.sin(t*Math.PI*2+phase)*span*.19
      +Math.sin(t*Math.PI*5+phase*.7)*span*.045+lateral;
    points.push(Object.freeze({x,y:yAt(t,x,z),z}));
  }
  return Object.freeze(points);
}
export function createGeologicalField({
  seed=6102026,bounds={minX:-48,maxX:48,minZ:-36,maxZ:36},
  baseDepth=-13,ridgeCount=3,ravineCount=2,caveCount=3
}={}) {
  if(!Number.isInteger(seed)||!Number.isFinite(baseDepth)) throw new TypeError('seed must be an integer and baseDepth finite');
  if(!bounds||![bounds.minX,bounds.maxX,bounds.minZ,bounds.maxZ].every(Number.isFinite)
    ||bounds.maxX<=bounds.minX||bounds.maxZ<=bounds.minZ) throw new RangeError('Invalid geological bounds');
  for(const [name,count] of Object.entries({ridgeCount,ravineCount,caveCount}))
    if(!Number.isInteger(count)||count<0||count>12) throw new RangeError(name+' must be between 0 and 12');
  const random=randomFrom(seed),span=bounds.maxZ-bounds.minZ;
  const ridges=Array.from({length:ridgeCount},(_,i)=>Object.freeze({
    id:'ridge-'+i,
    points:makePath(random,bounds,10,()=>0,(i-(ridgeCount-1)*.5)*span*.19),
    width:4.8+random()*2.8,height:3.2+random()*2.6
  }));
  const ravines=Array.from({length:ravineCount},(_,i)=>Object.freeze({
    id:'ravine-'+i,
    points:makePath(random,bounds,12,()=>0,(i-(ravineCount-1)*.5)*span*.22),
    width:2.8+random()*2.2,depth:3.5+random()*2.8
  }));
  const caves=Array.from({length:caveCount},(_,i)=>{
    // Extend the cave centre-lines beyond the study bounds so passages have
    // genuine cut-through mouths rather than sealed spherical end caps.
    const caveBounds={...bounds,minX:bounds.minX-10,maxX:bounds.maxX+10};
    const points=makePath(random,caveBounds,10,t=>baseDepth+3.5-Math.sin(t*Math.PI)*4,
      (i-(caveCount-1)*.5)*span*.16);
    const junction=points[5],direction=i%2===0?1:-1;
    const branchEndZ=clamp(junction.z+direction*7,bounds.minZ+3,bounds.maxZ-3);
    const branch=Object.freeze([
      junction,
      Object.freeze({x:junction.x+2.5,y:junction.y-.25,z:mix(junction.z,branchEndZ,.35)}),
      Object.freeze({x:junction.x+5.5,y:junction.y-.65,z:mix(junction.z,branchEndZ,.72)}),
      Object.freeze({x:junction.x+8,y:junction.y-1,z:branchEndZ})
    ]);
    return Object.freeze({id:'cave-'+i,points,branches:Object.freeze([branch]),radius:1.25+random()*.7,
      chamber:Object.freeze({x:junction.x,y:junction.y,z:junction.z,radius:2.8+random()*1.2})});
  });
  const pathDistance=(x,z,points)=>{
    let d=Infinity;
    for(let i=1;i<points.length;i++) d=Math.min(d,distance2(x,z,points[i-1],points[i]));
    return d;
  };
  function sampleHeight(x,z) {
    if(!Number.isFinite(x)||!Number.isFinite(z)) throw new TypeError('Terrain coordinates must be finite');
    const broad=.9*Math.sin(x*.052+z*.031)*Math.cos(z*.047-x*.026);
    const rolling=.38*Math.sin(x*.17+z*.11)*Math.cos(z*.13-x*.09);
    let height=baseDepth+broad+rolling;
    for(const ridge of ridges){
      const d=pathDistance(x,z,ridge.points);
      const shoulder=Math.exp(-.5*(d/ridge.width)**2);
      const broken=.68+.32*Math.sin(x*.21+z*.14+ridge.width)**2;
      height+=ridge.height*shoulder*broken;
    }
    for(const ravine of ravines){
      const d=pathDistance(x,z,ravine.points);
      height-=ravine.depth*Math.exp(-.5*(d/ravine.width)**2);
      height+=.48*Math.exp(-.5*((d-ravine.width*1.7)/(ravine.width*.55))**2);
    }
    return height;
  }
  function sampleDistance(x,y,z) {
    if(![x,y,z].every(Number.isFinite)) throw new TypeError('Distance query coordinates must be finite');
    const surface=sampleHeight(x,z),eps=.12;
    const dx=(sampleHeight(x+eps,z)-sampleHeight(x-eps,z))/(2*eps);
    const dz=(sampleHeight(x,z+eps)-sampleHeight(x,z-eps))/(2*eps);
    let distance=(y-surface)/Math.sqrt(1+dx*dx+dz*dz);
    for(const cave of caves){
      let tunnel=Infinity;
      for(let i=1;i<cave.points.length;i++)
        tunnel=Math.min(tunnel,distance3({x,y,z},cave.points[i-1],cave.points[i])-cave.radius);
      for(const branch of cave.branches||[]) for(let i=1;i<branch.length;i++)
        tunnel=Math.min(tunnel,distance3({x,y,z},branch[i-1],branch[i])-cave.radius*.82);
      const c=cave.chamber;
      const chamber=Math.hypot(x-c.x,y-c.y,z-c.z)-c.radius;
      distance=Math.max(distance,-Math.min(tunnel,chamber));
    }
    return distance;
  }
  function describe(){return Object.freeze({seed:seed>>>0,bounds:Object.freeze({...bounds}),ridges,ravines,caves});}
  return Object.freeze({sampleHeight,sampleDistance,describe});
}
