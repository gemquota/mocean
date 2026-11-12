/**
 * Natural-colour, smooth-shaded marine GLBs from 3DAssets.dev.
 * These source models are static posed studies, not rigged animation clips.
 * Each is flattened into model-local geometry and given species-appropriate
 * procedural vertex deformation (body waves, vertical tail strokes, ray wings,
 * or jellyfish bell pulses). Simulation position and behaviour stay in schooling.js.
 * Source models are CC0 1.0; see docs/licenses/3DASSETS-CC0-LICENSE.txt.
 */
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { applySwimMaterial, updateSwimUniforms } from './polyfish-swim-material.js';
import { SPECIES_MODEL_MAP } from './species-model-map.js';

export const MARINE_MODEL_BY_SPECIES = Object.freeze(Object.fromEntries(
  Object.entries(SPECIES_MODEL_MAP).map(([species, mapping]) => [species, mapping.id])
));
export const MARINE_MODEL_VARIANTS_BY_SPECIES = Object.freeze(Object.fromEntries(
  Object.entries(SPECIES_MODEL_MAP).map(([species, mapping]) => [species, Object.freeze([mapping.id])])
));
export const MARINE_MODEL_IDS = Object.freeze([...new Set(Object.values(MARINE_MODEL_VARIANTS_BY_SPECIES).flat())]);
export const MARINE_MODEL_ORIENTATION = Object.freeze(Object.fromEntries(
  Object.entries(SPECIES_MODEL_MAP).map(([species, mapping]) => [species, mapping.orientation ?? 'horizontal'])
));

function promoteQuantizedAttributes(THREE, geometry) {
  for (const name of ['position','normal','tangent']) {
    const attribute=geometry.getAttribute(name);
    if(!attribute || attribute.array instanceof Float32Array) continue;
    const itemSize=attribute.itemSize;
    const values=new Float32Array(attribute.count*itemSize);
    for(let index=0;index<attribute.count;index++){
      values[index*itemSize]=attribute.getX(index);
      if(itemSize>1) values[index*itemSize+1]=attribute.getY(index);
      if(itemSize>2) values[index*itemSize+2]=attribute.getZ(index);
      if(itemSize>3) values[index*itemSize+3]=attribute.getW(index);
    }
    geometry.setAttribute(name,new THREE.BufferAttribute(values,itemSize,false));
  }
}

function flattenStaticModel(THREE, source) {
  source.updateMatrixWorld(true);
  const inverseRoot = new THREE.Matrix4().copy(source.matrixWorld).invert();
  const flat = new THREE.Group();
  flat.name = source.name || 'NaturalisticMarineModel';
  source.traverse(node => {
    if (!node.isMesh || !node.geometry) return;
    const geometry = node.geometry.clone();
    promoteQuantizedAttributes(THREE,geometry);
    const relative = new THREE.Matrix4().multiplyMatrices(inverseRoot, node.matrixWorld);
    geometry.applyMatrix4(relative);
    geometry.computeBoundingBox();
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    const materials = Array.isArray(node.material)
      ? node.material.map(material => material.clone())
      : node.material?.clone();
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.name = node.name;
    mesh.castShadow = node.castShadow;
    mesh.receiveShadow = node.receiveShadow;
    mesh.renderOrder = node.renderOrder;
    flat.add(mesh);
  });
  flat.updateMatrixWorld(true);
  return flat;
}

export class OsmoceanMarineModels {
  constructor(THREE,{baseUrl='./assets/models/osmocean/naturalistic/',loader=new GLTFLoader()}={}) {
    this.THREE=THREE;
    this.baseUrl=baseUrl.endsWith('/')?baseUrl:baseUrl+'/';
    this.loader=loader;
    this.cache=new Map();
  }
  async load(modelId) {
    if(!MARINE_MODEL_IDS.includes(modelId)) throw new RangeError('Unknown naturalistic marine model: '+modelId);
    if(!this.cache.has(modelId)) this.cache.set(modelId,this.loader.loadAsync(this.baseUrl+modelId+'.glb'));
    return this.cache.get(modelId);
  }
  async createInstance(species,{targetLength=1.2,modelId:requestedModelId=null}={}) {
    const mapping=SPECIES_MODEL_MAP[species];
    const modelId=requestedModelId??mapping?.id;
    if(!modelId) return null;
    if(!MARINE_MODEL_VARIANTS_BY_SPECIES[species]?.includes(modelId)) {
      throw new RangeError('Model '+modelId+' is not mapped to '+species);
    }
    const gltf=await this.load(modelId);
    const source=cloneSkeleton(gltf.scene);
    const visual=flattenStaticModel(this.THREE,source);
    if(!visual.children.length) throw new Error('Naturalistic marine GLB contains no mesh geometry: '+modelId);

    // All selected source models use +Z as their forward axis. Convert that to
    // the simulation's local +X heading once, before the root follows the boid.
    visual.rotation.y=Math.PI/2;
    visual.updateMatrixWorld(true);
    const bounds=new this.THREE.Box3().setFromObject(visual);
    const extent=bounds.getSize(new this.THREE.Vector3());
    const scale=targetLength/Math.max(extent.x,extent.y,extent.z,.001);
    visual.scale.setScalar(scale);
    visual.updateMatrixWorld(true);
    const scaledBounds=new this.THREE.Box3().setFromObject(visual);
    visual.position.sub(scaledBounds.getCenter(new this.THREE.Vector3()));

    const motion=mapping.motion;
    const swimData=motion==='pulse'?null:applySwimMaterial(visual,motion);
    let phase=0,pulsePhase=0;
    return {
      species,modelId,visual,mixer:null,swimData,animations:[],
      animationMode:'procedural-'+motion,
      update(dt){
        const step=Math.max(0,Math.min(dt,.05));
        if(swimData){
          phase+=step*swimData.config.idleSpeed;
          updateSwimUniforms(swimData,phase,1,false);
        }
        if(motion==='pulse'){
          pulsePhase+=step*1.7;
          visual.scale.y=visual.scale.x*(1+0.035*Math.sin(pulsePhase));
        }
      },
      dispose(){}
    };
  }
  dispose(){this.cache.clear();}
}
