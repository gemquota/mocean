/**
 * Procedural voxel-creature renderer.
 *
 * Creature volumes are authored as signed-distance primitives, voxelized on a
 * compact species-specific lattice, then greedily meshed into instanced GPU
 * geometry. The simulation remains authoritative: instance transforms follow
 * fish.p/fish.forward and the existing travelling-wave state deforms the mesh.
 * No downloaded creature meshes, sprites, or Canvas creature fallbacks.
 */
import { applySwimMaterial, SWIM_CONFIGS } from './polyfish-swim-material.js';

const MODEL_LENGTH = 0.78;
const SPECIES_GROUPS = Object.freeze({
  fish: ['fish','schoolFish','clownfish','parrotfish','blueTang','angelfish','butterflyfish','grouper','moorishIdol'],
  predator: ['barracuda','marlin','tuna','shark','whaleShark','wobbegong'],
  cetacean: ['orca','spermWhale','dolphin'],
  ray: ['manta','stingray'],
  eel: ['eel','sandEel'],
  crustacean: ['crab','lobster','mantis'],
  jelly: ['jellyfish'],
  turtle: ['turtle'],
  seal: ['seal'],
  starfish: ['starfish'],
  seahorse: ['seahorse'],
  seaDragon: ['seaDragon'],
  mola: ['mola'],
  angler: ['anglerfish']
});
const PROFILE_BY_SPECIES = Object.freeze(Object.fromEntries(
  Object.entries(SPECIES_GROUPS).flatMap(([profile,species])=>species.map(name=>[name,profile]))
));
export const PROCEDURAL_VOXEL_SPECIES = Object.freeze(Object.keys(PROFILE_BY_SPECIES));
export const VOXEL_PROFILE_BY_SPECIES = PROFILE_BY_SPECIES;
export const VOXEL_MODEL_BY_SPECIES = Object.freeze(Object.fromEntries(PROCEDURAL_VOXEL_SPECIES.map(name=>[name,name])));
export const VOXEL_ORIENTATION_BY_SPECIES = Object.freeze(Object.fromEntries(
  PROCEDURAL_VOXEL_SPECIES.map(name=>[name,['jellyfish','seahorse','seaDragon'].includes(name)?'vertical':'horizontal'])
));
export function filterToProceduralVoxelSpecies(mix={}) {
  return Object.fromEntries(PROCEDURAL_VOXEL_SPECIES.filter(name=>Number(mix[name])>0).map(name=>[name,Number(mix[name])]));
}

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const minSdf=(...values)=>Math.min(...values);
function ellipsoid(x,y,z,cx,cy,cz,rx,ry,rz) {
  const q=Math.sqrt(((x-cx)/rx)**2+((y-cy)/ry)**2+((z-cz)/rz)**2);
  return (q-1)*Math.min(rx,ry,rz);
}
function capsule(x,y,z,a,b,r) {
  const ab=b.map((v,i)=>v-a[i]),ap=[x-a[0],y-a[1],z-a[2]];
  const h=clamp((ap[0]*ab[0]+ap[1]*ab[1]+ap[2]*ab[2])/(ab[0]**2+ab[1]**2+ab[2]**2||1),0,1);
  return Math.hypot(ap[0]-ab[0]*h,ap[1]-ab[1]*h,ap[2]-ab[2]*h)-r;
}
function creatureDistance(profile,x,y,z) {
  if(profile==='ray') return minSdf(
    ellipsoid(x,y,z,0,0,0,.48,.075,.34),
    ellipsoid(x,y,z,-.27,-.005,.12,.25,.045,.20),
    ellipsoid(x,y,z,.27,-.005,.12,.25,.045,.20),
    capsule(x,y,z,[0,0,-.22],[0,-.01,-.69],.025)
  );
  if(profile==='jelly') return minSdf(
    ellipsoid(x,y,z,0,.19,0,.29,.25,.29),
    ellipsoid(x,y,z,0,.32,0,.24,.13,.24),
    capsule(x,y,z,[-.14,.02,-.12],[-.18,-.54,-.18],.025),
    capsule(x,y,z,[-.045,.02,-.05],[-.02,-.62,-.04],.022),
    capsule(x,y,z,[.06,.02,.05],[.11,-.57,.1],.024),
    capsule(x,y,z,[.17,.02,.12],[.2,-.48,.18],.02)
  );
  if(profile==='crustacean') {
    const legs=[];
    for(const side of [-1,1]) for(const z0 of [-.2,0,.2]) {
      legs.push(capsule(x,y,z,[side*.12,-.07,z0],[side*.43,-.22,z0+(z0<0?-.12:.12)],.035));
    }
    return minSdf(ellipsoid(x,y,z,0,.02,0,.25,.15,.29),
      ellipsoid(x,y,z,-.29,.08,.28,.12,.10,.13),
      ellipsoid(x,y,z,.29,.08,.28,.12,.10,.13),
      capsule(x,y,z,[-.12,.04,.19],[-.36,.12,.38],.075),
      capsule(x,y,z,[.12,.04,.19],[.36,.12,.38],.075),...legs);
  }
  if(profile==='starfish') {
    const arms=[];
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;arms.push(capsule(x,y,z,[Math.cos(a)*.055,0,Math.sin(a)*.055],[Math.cos(a)*.48,0,Math.sin(a)*.48],.075));}
    return minSdf(ellipsoid(x,y,z,0,0,0,.17,.075,.17),...arms);
  }
  if(profile==='turtle') return minSdf(
    ellipsoid(x,y,z,0,.035,-.02,.29,.18,.34),
    ellipsoid(x,y,z,0,.015,.38,.105,.10,.16),
    capsule(x,y,z,[-.12,-.02,.2],[-.43,-.06,.39],.09),
    capsule(x,y,z,[.12,-.02,.2],[.43,-.06,.39],.09),
    capsule(x,y,z,[-.12,-.02,-.2],[-.36,-.06,-.4],.075),
    capsule(x,y,z,[.12,-.02,-.2],[.36,-.06,-.4],.075)
  );
  if(profile==='eel') {
    const segments=[];
    for(let i=0;i<7;i++){const t=i/6,z0=-.48+t*.9,x0=Math.sin(t*Math.PI)*.045,r=.115*(1-.72*t);segments.push(capsule(x,y,z,[x0,0,z0],[Math.sin((t+.16)*Math.PI)*.045,0,z0+.16],r));}
    return minSdf(...segments);
  }
  if(profile==='seahorse') return minSdf(
    ellipsoid(x,y,z,0,-.04,0,.14,.25,.15),
    ellipsoid(x,y,z,0,.24,.02,.105,.14,.11),
    ellipsoid(x,y,z,0,.34,.13,.045,.06,.14),
    capsule(x,y,z,[0,-.2,-.02],[.10,-.43,-.10],.055),
    capsule(x,y,z,[.10,-.43,-.10],[.02,-.48,-.22],.045),
    ellipsoid(x,y,z,.12,.02,-.04,.10,.15,.055)
  );
  if(profile==='seaDragon') return minSdf(
    ellipsoid(x,y,z,0,0,0,.105,.42,.10),
    ellipsoid(x,y,z,0,.42,.02,.09,.12,.09),
    ellipsoid(x,y,z,.16,.2,0,.13,.08,.10),
    ellipsoid(x,y,z,-.16,-.12,0,.13,.08,.10),
    ellipsoid(x,y,z,.15,-.32,-.02,.12,.07,.09)
  );
  if(profile==='seal') return minSdf(
    ellipsoid(x,y,z,0,0,0,.22,.19,.47),
    ellipsoid(x,y,z,0,.06,.42,.16,.15,.18),
    capsule(x,y,z,[-.1,-.04,-.28],[-.26,-.12,-.58],.07),
    capsule(x,y,z,[.1,-.04,-.28],[.26,-.12,-.58],.07)
  );
  if(profile==='mola') return minSdf(
    ellipsoid(x,y,z,0,0,0,.28,.34,.16),
    ellipsoid(x,y,z,0,.02,-.18,.22,.26,.09),
    ellipsoid(x,y,z,0,.0,.26,.055,.30,.07),
    ellipsoid(x,y,z,0,.0,-.37,.05,.25,.06)
  );
  if(profile==='angler') return minSdf(
    ellipsoid(x,y,z,0,0,.04,.27,.22,.36),
    ellipsoid(x,y,z,0,.015,.35,.19,.15,.19),
    capsule(x,y,z,[0,.17,.13],[.02,.43,.02],.025),
    ellipsoid(x,y,z,.02,.45,.0,.055,.05,.055),
    ellipsoid(x,y,z,0,-.19,-.02,.14,.045,.12)
  );
  if(profile==='cetacean') return minSdf(
    ellipsoid(x,y,z,0,0,.015,.235,.20,.47),
    ellipsoid(x,y,z,0,.015,.37,.17,.13,.19),
    capsule(x,y,z,[0,0,-.34],[0,0,-.56],.075),
    ellipsoid(x,y,z,-.13,-.07,-.02,.17,.055,.12),
    ellipsoid(x,y,z,.13,-.07,-.02,.17,.055,.12)
  );
  if(profile==='predator') return minSdf(
    ellipsoid(x,y,z,0,0,.015,.165,.135,.43),
    ellipsoid(x,y,z,0,-.005,.34,.125,.105,.19),
    capsule(x,y,z,[0,0,-.31],[0,0,-.53],.038),
    ellipsoid(x,y,z,0,.11,-.55,.03,.14,.14),
    ellipsoid(x,y,z,0,-.11,-.55,.03,.14,.14),
    ellipsoid(x,y,z,0,.15,-.03,.045,.10,.17),
    ellipsoid(x,y,z,-.16,-.045,.04,.12,.025,.15),
    ellipsoid(x,y,z,.16,-.045,.04,.12,.025,.15)
  );
  // Fusiform reef fish: blunt head, tapering peduncle and forked tail.
  const body=ellipsoid(x,y,z,0,0,.015,.205,.17,.405);
  const peduncle=capsule(x,y,z,[0,0,-.28],[0,0,-.52],.052);
  const tail=minSdf(ellipsoid(x,y,z,0,.105,-.55,.035,.13,.13),ellipsoid(x,y,z,0,-.105,-.55,.035,.13,.13));
  const dorsal=ellipsoid(x,y,z,0,.19,-.015,.055,.115,.16);
  const pectoral=minSdf(ellipsoid(x,y,z,-.20,-.055,.03,.14,.035,.16),ellipsoid(x,y,z,.20,-.055,.03,.14,.035,.16));
  const extra=profile==='fish'?minSdf(dorsal,pectoral):minSdf(dorsal,pectoral);
  return minSdf(body,peduncle,tail,extra);
}

const PALETTES = Object.freeze({
  fish:[.12,.43,.47],predator:[.28,.39,.43],cetacean:[.18,.30,.34],ray:[.28,.38,.39],eel:[.20,.43,.40],
  crustacean:[.72,.36,.20],jelly:[.47,.65,.72],turtle:[.30,.43,.30],seal:[.45,.48,.43],
  starfish:[.77,.39,.22],seahorse:[.69,.57,.32],seaDragon:[.43,.57,.39],mola:[.35,.51,.53],angler:[.30,.31,.38]
});
const GRID = Object.freeze({x:22,y:16,z:34});
const BOUNDS = Object.freeze({min:[-.58,-.48,-.74],max:[.58,.48,.62]});
const indexOf=(x,y,z,nx,ny)=>(z*ny+y)*nx+x;
function voxelColour(profile,x,y,z) {
  const base=PALETTES[profile]??PALETTES.fish;
  const top=clamp((y-BOUNDS.min[1])/(BOUNDS.max[1]-BOUNDS.min[1]),0,1);
  const head=clamp((z-BOUNDS.min[2])/(BOUNDS.max[2]-BOUNDS.min[2]),0,1);
  const band=(top>.72?1.16:top<.2?.72:1)*(head>.82?1.08:1);
  return clamp(Math.round((base[0]*band)*3)+1,1,3);
}
const FACE_TINT = Object.freeze({1:.72,2:1,3:1.18});

/** Deterministic greedy surface mesher. Interior voxel faces are never emitted. */
export function buildVoxelCreatureGeometry(species,{resolution=GRID}={}) {
  const profile=PROFILE_BY_SPECIES[species];
  if(!profile) throw new RangeError('Unsupported procedural voxel species: '+species);
  const nx=Math.max(4,Math.floor(resolution.x)),ny=Math.max(4,Math.floor(resolution.y)),nz=Math.max(4,Math.floor(resolution.z));
  const step=BOUNDS.max.map((v,i)=>(v-BOUNDS.min[i])/[nx,ny,nz][i]);
  const cells=new Uint8Array(nx*ny*nz);let voxelCount=0;
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const px=BOUNDS.min[0]+(x+.5)*step[0],py=BOUNDS.min[1]+(y+.5)*step[1],pz=BOUNDS.min[2]+(z+.5)*step[2];
    if(creatureDistance(profile,px,py,pz)<=0){cells[indexOf(x,y,z,nx,ny)]=voxelColour(profile,px,py,pz);voxelCount++;}
  }
  const positions=[],normals=[],colours=[],indices=[];let faceCount=0;
  const dims=[nx,ny,nz],coord=(axis,slice,u,v)=>{const c=[0,0,0];c[axis]=slice;c[(axis+1)%3]=u;c[(axis+2)%3]=v;return c;};
  for(let axis=0;axis<3;axis++){
    const uAxis=(axis+1)%3,vAxis=(axis+2)%3,du=dims[uAxis],dv=dims[vAxis];
    for(let slice=-1;slice<dims[axis];slice++){
      const mask=new Int16Array(du*dv);
      for(let v=0;v<dv;v++)for(let u=0;u<du;u++){
        const aCoord=coord(axis,slice,u,v),bCoord=coord(axis,slice+1,u,v);
        const a=slice>=0?cells[indexOf(...aCoord,nx,ny)]:0;
        const b=slice+1<dims[axis]?cells[indexOf(...bCoord,nx,ny)]:0;
        if(Boolean(a)!==Boolean(b))mask[v*du+u]=a? a:-b;
      }
      for(let v=0;v<dv;v++)for(let u=0;u<du;){
        const value=mask[v*du+u];if(!value){u++;continue;}
        let width=1;while(u+width<du&&mask[v*du+u+width]===value)width++;
        let height=1,extend=true;
        while(v+height<dv&&extend){for(let k=0;k<width;k++)if(mask[(v+height)*du+u+k]!==value){extend=false;break;}if(extend)height++;}
        const sign=value>0?1:-1,plane=slice+1;
        const point=(uu,vv)=>{const c=coord(axis,plane,uu,vv);return c.map((n,i)=>BOUNDS.min[i]+n*step[i]);};
        let corners=[point(u,v),point(u+width,v),point(u+width,v+height),point(u,v+height)];
        if(sign<0)corners=[corners[0],corners[3],corners[2],corners[1]];
        const baseIndex=positions.length/3;
        for(const p of corners)positions.push(...p);
        const normal=[0,0,0];normal[axis]=sign;
        for(let k=0;k<4;k++)normals.push(...normal);
        const cell=coord(axis,sign>0?slice:slice+1,u,v);
        const shade=FACE_TINT[cells[indexOf(...cell,nx,ny)]||-value]??1;
        const base=PALETTES[profile]??PALETTES.fish;
        const light=clamp(shade*(axis===1?(sign>0?1.18:.68):.92),.35,1.35);
        const rgb=base.map(c=>clamp(c*light,0,1));
        for(let k=0;k<4;k++)colours.push(...rgb);
        indices.push(baseIndex,baseIndex+1,baseIndex+2,baseIndex,baseIndex+2,baseIndex+3);
        faceCount++;u+=width;
      }
    }
  }
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),colors:new Float32Array(colours),indices:new Uint32Array(indices),voxelCount,faceCount,profile,bounds:BOUNDS};
}

export function advanceVoxelCreatureAnimation(fish,dt) {
  const profile=PROFILE_BY_SPECIES[fish.species];
  const motion=profile==='ray'?'wing-wave':(['jelly','crustacean','starfish'].includes(profile)?'pulse':
    profile==='cetacean'||profile==='seal'||profile==='turtle'?'vertical-body-wave':
    profile==='seahorse'||profile==='seaDragon'?'vertical-body-axis-wave':'body-wave');
  const config=SWIM_CONFIGS[motion]??SWIM_CONFIGS.fish,step=Math.min(Math.max(dt,0),.05);
  fish._marinePhase=(fish._marinePhase??(((fish.id*.61803398875)%1)*Math.PI*2))+step*(config.idleSpeed??2.8);
  fish._marinePulsePhase=(fish._marinePulsePhase??(((fish.id*.38196601125)%1)*Math.PI*2))+step*1.7;
}

export class ProceduralVoxelCreatureRenderer {
  constructor(THREE,{capacity=1000}={}) {
    this.THREE=THREE;this.capacity=Math.max(1,Math.floor(capacity));this.batches=new Map();this.geometryCache=new Map();
  }
  createGeometry(species) {
    if(this.geometryCache.has(species))return this.geometryCache.get(species);
    const data=buildVoxelCreatureGeometry(species),geometry=new this.THREE.BufferGeometry();
    geometry.setAttribute('position',new this.THREE.BufferAttribute(data.positions,3));
    geometry.setAttribute('normal',new this.THREE.BufferAttribute(data.normals,3));
    geometry.setAttribute('color',new this.THREE.BufferAttribute(data.colors,3));
    geometry.setIndex(new this.THREE.BufferAttribute(data.indices,1));geometry.computeBoundingBox();geometry.computeBoundingSphere();
    geometry.userData.voxelStats={voxels:data.voxelCount,faces:data.faceCount,profile:data.profile};
    this.geometryCache.set(species,geometry);return geometry;
  }
  async createBatch(species) {
    if(this.batches.has(species))return this.batches.get(species);
    const profile=PROFILE_BY_SPECIES[species];if(!profile)return null;
    const geometry=this.createGeometry(species),THREE=this.THREE;
    const phaseArray=new Float32Array(this.capacity),amplitudeArray=new Float32Array(this.capacity);
    const phaseAttribute=new THREE.InstancedBufferAttribute(phaseArray,1),amplitudeAttribute=new THREE.InstancedBufferAttribute(amplitudeArray,1);
    geometry.setAttribute('aSwimPhase',phaseAttribute);geometry.setAttribute('aSwimAmplitude',amplitudeAttribute);
    const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.78,metalness:.02});
    const mesh=new THREE.InstancedMesh(geometry,material,this.capacity);mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const group=new THREE.Group();group.add(mesh);
    const mapping={motion:profile==='ray'?'wing-wave':(['jelly','crustacean','starfish'].includes(profile)?'pulse':
      profile==='cetacean'||profile==='seal'||profile==='turtle'?'vertical-body-wave':
      profile==='seahorse'||profile==='seaDragon'?'vertical-body-axis-wave':'body-wave'),
      orientation:VOXEL_ORIENTATION_BY_SPECIES[species]};
    const swimData=mapping.motion==='pulse'?null:applySwimMaterial(group,mapping.motion,{instanced:true});
    if(swimData)swimData.uniforms.uAmplitude.value=(swimData.config.idleAmplitude??swimData.config.amplitude)/MODEL_LENGTH;
    const dummy=new THREE.Object3D(),forward=new THREE.Vector3(1,0,0),up=new THREE.Vector3(0,1,0),modelForwardRotation=new THREE.Quaternion().setFromAxisAngle(up,Math.PI/2),direction=new THREE.Vector3();
    const batch={
      species,profile,group,mesh,capacity:this.capacity,rendered:0,overflow:0,voxelCount:geometry.userData.voxelStats.voxels,faceCount:geometry.userData.voxelStats.faces,
      update(fishList) {
        const count=Math.min(fishList.length,this.capacity);this.rendered=count;this.overflow=Math.max(0,fishList.length-count);
        for(let i=0;i<count;i++){
          const fish=fishList[i],bodyScale=fish.bodyScale??1;
          phaseArray[i]=fish._marinePhase??0;amplitudeArray[i]=1/Math.max(.1,bodyScale);
          dummy.position.set(fish.p.x,fish.p.y,fish.p.z);
          if(mapping.orientation==='vertical')dummy.quaternion.setFromAxisAngle(up,Math.atan2(fish.forward.x,fish.forward.z));
          else{direction.set(fish.forward.x,fish.forward.y,fish.forward.z).normalize();dummy.quaternion.setFromUnitVectors(forward,direction);}
          dummy.quaternion.multiply(modelForwardRotation);
          const scale=MODEL_LENGTH*bodyScale,pulse=mapping.motion==='pulse'?1+.045*Math.sin(fish._marinePulsePhase??0):1;
          dummy.scale.set(scale,scale*pulse,scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
        }
        phaseAttribute.needsUpdate=true;amplitudeAttribute.needsUpdate=true;mesh.count=count;mesh.instanceMatrix.needsUpdate=true;
      },
      dispose(){group.remove(mesh);geometry.dispose();material.dispose();}
    };
    this.batches.set(species,batch);return batch;
  }
  dispose(){for(const batch of this.batches.values())batch.dispose();this.batches.clear();for(const geometry of this.geometryCache.values())geometry.dispose();this.geometryCache.clear();}
}
