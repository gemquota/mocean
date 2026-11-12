/**
 * Quaternius and PolyFish animated marine models for the Schooling habitat.
 * Simulation position, heading and behaviour remain owned by schooling.js.
 */
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { SPECIES_MODEL_MAP } from './species-model-map.js';

export const MARINE_MODEL_BY_SPECIES = Object.freeze(Object.fromEntries(
  Object.entries(SPECIES_MODEL_MAP).map(([species, mapping]) => [species, mapping.id])
));
export const MARINE_MODEL_IDS = Object.freeze([...new Set(Object.values(MARINE_MODEL_BY_SPECIES))]);

export class OsmoceanMarineModels {
  constructor(THREE,{baseUrl='./assets/models/osmocean/species/',loader=new GLTFLoader()}={}) {
    this.THREE=THREE;
    this.baseUrl=baseUrl.endsWith('/')?baseUrl:baseUrl+'/';
    this.loader=loader;
    this.cache=new Map();
  }
  async load(modelId) {
    if(!MARINE_MODEL_IDS.includes(modelId)) throw new RangeError('Unknown marine model: '+modelId);
    if(!this.cache.has(modelId)) this.cache.set(modelId,this.loader.loadAsync(this.baseUrl+modelId+'.glb'));
    return this.cache.get(modelId);
  }
  async createInstance(species,{targetLength=1.2}={}) {
    const modelId=MARINE_MODEL_BY_SPECIES[species];
    if(!modelId) return null;
    const gltf=await this.load(modelId);
    if(!Array.isArray(gltf.animations)||!gltf.animations.length) {
      throw new Error('Animated marine model has no embedded animation clips: '+modelId);
    }
    const visual=cloneSkeleton(gltf.scene);
    visual.updateMatrixWorld(true);
    const bounds=new this.THREE.Box3().setFromObject(visual);
    const size=bounds.getSize(new this.THREE.Vector3());
    const axis=size.x>=size.z&&size.x>=size.y?'x':size.z>=size.y?'z':'y';
    if(axis==='z') visual.rotation.y=Math.PI/2;
    else if(axis==='y') visual.rotation.z=-Math.PI/2;
    visual.updateMatrixWorld(true);
    const oriented=new this.THREE.Box3().setFromObject(visual);
    const extent=oriented.getSize(new this.THREE.Vector3());
    visual.scale.setScalar(targetLength/Math.max(extent.x,extent.y,extent.z,.001));
    visual.updateMatrixWorld(true);
    const scaled=new this.THREE.Box3().setFromObject(visual);
    visual.position.sub(scaled.getCenter(new this.THREE.Vector3()));
    const mixer=new this.THREE.AnimationMixer(visual);
    const clip=gltf.animations.find(item=>/swim|idle|move/i.test(item.name))??gltf.animations[0];
    mixer.clipAction(clip).play();
    return {
      species,modelId,visual,mixer,animations:gltf.animations.map(clip=>clip.name),
      update(dt){mixer.update(Math.max(0,Math.min(dt,.05)));},
      dispose(){mixer.stopAllAction();}
    };
  }
  dispose(){this.cache.clear();}
}
