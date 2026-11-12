import { applySwimMaterial, updateSwimUniforms } from './polyfish-swim-material.js';
import { getCreatureReviewModel } from './species-model-map.js';

export function resolveModelEntry(species, catalogues) {
  const mapping = getCreatureReviewModel(species);
  if (!mapping || !catalogues) return null;
  if (mapping.collection === 'animated') {
    const item = catalogues.animated?.species?.find(entry => entry.id === mapping.id);
    return item ? { ...item, collection: 'animated', folder: 'animated', mapping } : null;
  }
  if (mapping.collection === 'static') {
    const item = catalogues.static?.species?.find(entry => String(entry.id) === mapping.id);
    return item ? { ...item, collection: 'static', folder: 'static', mapping } : null;
  }
  if (mapping.collection === 'polyfish' && catalogues.polyfish?.id === mapping.id) {
    return { ...catalogues.polyfish, collection: 'polyfish', folder: 'polyfish', mapping };
  }
  return null;
}

/**
 * Loads reviewed Osmocean assets once and creates skeleton-safe visual instances.
 * It never owns creature position, velocity, attitude or behaviour.
 */
export class CreatureModelBank {
  constructor({
    THREE,
    loader,
    cloneSkeleton,
    baseUrl = './assets/models/osmocean',
    fetchImpl = globalThis.fetch
  } = {}) {
    if (!THREE?.Group || !THREE?.AnimationMixer || !THREE?.Box3) {
      throw new TypeError('A compatible Three.js namespace is required.');
    }
    if (!loader?.loadAsync || typeof cloneSkeleton !== 'function' || typeof fetchImpl !== 'function') {
      throw new TypeError('A GLTF loader, skeleton-safe clone function and fetch implementation are required.');
    }
    this.THREE = THREE;
    this.loader = loader;
    this.cloneSkeleton = cloneSkeleton;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetchImpl = fetchImpl;
    this.catalogues = null;
    this.templates = new Map();
  }

  async loadCatalogues() {
    const load = async folder => {
      const response = await this.fetchImpl(this.baseUrl + '/' + folder + '/catalog.json');
      if (!response.ok) throw new Error('Could not load ' + folder + ' model catalogue: ' + response.status);
      return response.json();
    };
    const results = await Promise.allSettled([
      load('animated'), load('static'), load('polyfish')
    ]);
    this.catalogueWarnings = results.map((result, index) =>
      result.status === 'rejected' ? ['animated', 'static', 'polyfish'][index] + ': ' + result.reason.message : null
    ).filter(Boolean);
    this.catalogues = {
      animated: results[0].status === 'fulfilled' ? results[0].value : { species: [] },
      static: results[1].status === 'fulfilled' ? results[1].value : { species: [] },
      polyfish: results[2].status === 'fulfilled' ? results[2].value : null
    };
    return this.catalogues;
  }

  resolve(species) {
    return resolveModelEntry(species, this.catalogues);
  }

  async templateFor(species) {
    if (!this.catalogues) await this.loadCatalogues();
    const entry = this.resolve(species);
    if (!entry) return null;
    const key = entry.collection + ':' + entry.id;
    if (!this.templates.has(key)) {
      const url = this.baseUrl + '/' + entry.folder + '/' + entry.file;
      const promise = this.loader.loadAsync(url).then(gltf => ({
        scene: gltf.scene,
        animations: Array.isArray(gltf.animations) ? gltf.animations : [],
        entry
      })).catch(error => {
        this.templates.delete(key);
        throw error;
      });
      this.templates.set(key, promise);
    }
    return this.templates.get(key);
  }

  async createInstance(species, { targetLength = null, phase = 0 } = {}) {
    if (targetLength !== null && (!(targetLength > 0) || !Number.isFinite(targetLength))) {
      throw new RangeError('targetLength must be positive and finite when supplied.');
    }
    const template = await this.templateFor(species);
    if (!template) return null;
    const desiredLength = targetLength ?? template.entry.mapping?.scale ?? 1;
    const THREE = this.THREE;
    const root = new THREE.Group();
    root.name = 'Creature model / ' + species;
    const visual = this.cloneSkeleton(template.scene);
    visual.traverse(node => {
      if ((node.isMesh || node.isSkinnedMesh) && node.material) {
        node.material = Array.isArray(node.material)
          ? node.material.map(material => material.clone())
          : node.material.clone();
      }
    });
    visual.rotation.y = Math.PI / 2; // glTF +Z forward -> Mocean local +X forward.
    visual.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(visual);
    const size = bounds.getSize(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z, 1e-6);
    visual.scale.setScalar(desiredLength / longest);
    visual.updateMatrixWorld(true);
    const scaledBounds = new THREE.Box3().setFromObject(visual);
    visual.position.sub(scaledBounds.getCenter(new THREE.Vector3()));
    root.add(visual);

    const visualPose = {
      position: visual.position.clone(),
      quaternion: visual.quaternion.clone(),
      scale: visual.scale.clone()
    };
    let mixer = null;
    let swimData = null;
    let clip = null;
    if (template.animations.length) {
      const sourceClip = template.animations.find(item => /swim|idle|move/i.test(item.name)) ?? template.animations[0];
      clip = sourceClip.clone();
      // A GLTF scene-root transform is presentation/root motion, not locomotion.
      // Remove only tracks bound directly to the scene root; keep skeletal fin/body tracks.
      clip.tracks = clip.tracks.filter(track => {
        try {
          const binding = THREE.PropertyBinding.parseTrackName(track.name);
          const rootTarget = !binding.nodeName || binding.nodeName === visual.name;
          return !(rootTarget && ['position', 'quaternion', 'rotation'].includes(binding.propertyName));
        } catch {
          return true;
        }
      });
      if (clip.tracks.length) {
        mixer = new THREE.AnimationMixer(visual);
        mixer.clipAction(clip).play();
      } else clip = null;
    } else if (template.entry.collection === 'polyfish') {
      swimData = applySwimMaterial(visual, 'fish');
      updateSwimUniforms(swimData, phase, 1, false);
    }

    return {
      species, root, visual, mixer, swimData, clip,
      asset: template.entry, visualPose,
      hasBakedAnimation: Boolean(clip),
      hasProceduralSwim: Boolean(swimData)
    };
  }

  updateInstance(instance, dt, { phase = 0, speedFactor = 1, thrusting = false } = {}) {
    if (!instance || !(dt > 0) || !Number.isFinite(dt)) return;
    const rate = Math.max(0.25, Math.min(2.5, Number.isFinite(speedFactor) ? speedFactor : 1));
    if (instance.mixer) {
      instance.mixer.timeScale = rate;
      instance.mixer.update(Math.min(dt, 0.05));
      instance.visual.position.copy(instance.visualPose.position);
      instance.visual.quaternion.copy(instance.visualPose.quaternion);
      instance.visual.scale.copy(instance.visualPose.scale);
    }
    if (instance.swimData) updateSwimUniforms(instance.swimData, phase, Math.min(1, rate / 1.5), Boolean(thrusting));
  }

  disposeInstance(instance) {
    if (!instance) return;
    instance.mixer?.stopAllAction();
    instance.root?.removeFromParent?.();
  }

  dispose() {
    this.templates.clear();
    this.catalogues = null;
  }
}
