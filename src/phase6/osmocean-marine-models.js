/**
 * Quaternius and PolyFish animated marine models for the Schooling habitat.
 * Simulation position, heading and behaviour remain owned by schooling.js.
 * Quaternius models use embedded swim clips; the rigged PolyFish dolphin uses
 * Osmocean's adapted procedural swim shader because its GLB contains no clips.
 */
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { applySwimMaterial, updateSwimUniforms } from './polyfish-swim-material.js';
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
    const visual=cloneSkeleton(gltf.scene);
    visual.traverse(node=>{
      if((node.isMesh||node.isSkinnedMesh)&&node.material){
        node.material=Array.isArray(node.material)
          ?node.material.map(material=>material.clone())
          :node.material.clone();
      }
    });
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

    const animations=Array.isArray(gltf.animations)?gltf.animations:[];
    let mixer=null,swimData=null,phase=0;
    if(animations.length){
      mixer=new this.THREE.AnimationMixer(visual);
      const clip=animations.find(item=>/swim|idle|move/i.test(item.name))??animations[0];
      mixer.clipAction(clip).play();
    }else if(species==='dolphin'){
      swimData=applySwimMaterial(visual,'dolphin');
    }else{
      throw new Error('Marine model has neither embedded clips nor a supported procedural swim rig: '+modelId);
    }
    return {
      species,modelId,visual,mixer,swimData,
      animations:animations.map(clip=>clip.name),
      animationMode:mixer?'baked-clips':'procedural-swim',
      update(dt){
        const step=Math.max(0,Math.min(dt,.05));
        if(mixer)mixer.update(step);
        if(swimData){
          phase+=step*swimData.config.idleSpeed;
          updateSwimUniforms(swimData,phase,1,false);
        }
      },
      dispose(){mixer?.stopAllAction();}
    };
  }
  dispose(){this.cache.clear();}
}
