import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { CreatureModelBank } from './creature-model-bank.js';
import { getSpeciesModel } from './species-model-map.js';

export const ANIMATED_MODEL_SPECIES = Object.freeze(
  Object.entries({
    fish: true, schoolFish: true, parrotfish: true, grouper: true,
    tuna: true, shark: true, mola: true
  }).filter(([, enabled]) => enabled).map(([species]) => species)
);

export function filterToAnimatedSpecies(percentages) {
  const allowed = new Set(ANIMATED_MODEL_SPECIES);
  const filtered = {};
  for (const [species, value] of Object.entries(percentages ?? {})) {
    filtered[species] = allowed.has(species) ? Math.max(0, Number(value) || 0) : 0;
  }
  const total = Object.values(filtered).reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) {
    const fallback = ANIMATED_MODEL_SPECIES.includes('fish') ? 'fish' : ANIMATED_MODEL_SPECIES[0];
    for (const key of Object.keys(filtered)) filtered[key] = key === fallback ? 100 : 0;
    return filtered;
  }
  for (const key of Object.keys(filtered)) filtered[key] = filtered[key] / total * 100;
  return filtered;
}

/**
 * Transparent WebGL layer for animated GLB creatures. Simulation state remains
 * authoritative: this renderer reads position/forward/velocity and never writes
 * back to the school or its agents.
 */
export class SchoolingCreatureRenderer {
  constructor({ canvas, baseUrl = './assets/models/osmocean' } = {}) {
    if (!canvas) throw new TypeError('A WebGL overlay canvas is required.');
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 250);
    this.scene.add(new THREE.HemisphereLight(0xc9f0f0, 0x173039, 1.65));
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(-12, 18, 14);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x75b8c6, 0.7);
    fill.position.set(12, 5, -16);
    this.scene.add(fill);
    this.bank = new CreatureModelBank({ THREE, loader: new GLTFLoader(), cloneSkeleton: clone, baseUrl });
    this.instances = new Map();
    this.pending = new Set();
    this.failed = new Set();
    this.ready = this.bank.loadCatalogues();
    this.disposed = false;
  }

  hasInstance(id) { return this.instances.has(id); }

  resize(width, height) {
    const w = Math.max(1, width), h = Math.max(1, height);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(h / (Math.min(w, h) * 1.08) / 2));
    this.camera.updateProjectionMatrix();
  }

  async ensureInstance(agent) {
    const key = agent.id;
    if (this.instances.has(key) || this.pending.has(key) || this.failed.has(key)) return;
    this.pending.add(key);
    try {
      await this.ready;
      if (this.disposed) return;
      const mapping = getSpeciesModel(agent.species);
      if (!mapping || !['animated', 'polyfish'].includes(mapping.collection)) {
        this.failed.add(key);
        return;
      }
      const instance = await this.bank.createInstance(agent.species, {
        targetLength: Math.max(0.08, (agent.bodyScale ?? 1) * (agent.species === 'schoolFish' ? 2.7 : 3.2)),
        phase: agent.phase ?? 0
      });
      if (!instance || this.disposed) { this.failed.add(key); return; }
      this.scene.add(instance.root);
      this.instances.set(key, instance);
    } catch (error) {
      this.failed.add(key);
      console.warn('Animated creature model unavailable for ' + agent.species, error);
    } finally {
      this.pending.delete(key);
    }
  }

  render(agents, { dt = 1 / 24, cameraPosition, cameraTarget, width, height } = {}) {
    if (this.disposed) return;
    this.resize(width, height);
    this.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    this.camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);
    const live = new Set();
    for (const agent of agents) {
      live.add(agent.id);
      this.ensureInstance(agent);
      const instance = this.instances.get(agent.id);
      if (!instance) continue;
      instance.root.position.set(agent.p.x, agent.p.y, agent.p.z);
      const yaw = Math.atan2(-agent.forward.z, agent.forward.x);
      const pitch = Math.atan2(agent.forward.y, Math.hypot(agent.forward.x, agent.forward.z));
      const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), pitch);
      instance.root.quaternion.copy(qYaw).multiply(qPitch);
      instance.root.visible = true;
      const speed = Math.hypot(agent.v.x, agent.v.y, agent.v.z);
      this.bank.updateInstance(instance, Math.min(dt, 0.05), {
        phase: agent.phase ?? agent.gait?.phase ?? 0,
        speedFactor: Math.max(0.25, Math.min(2.5, speed / 1.2)),
        thrusting: speed > 2.0
      });
    }
    for (const [id, instance] of this.instances) {
      if (!live.has(id)) {
        this.bank.disposeInstance(instance);
        this.instances.delete(id);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    for (const instance of this.instances.values()) this.bank.disposeInstance(instance);
    this.instances.clear();
    this.bank.dispose();
    this.renderer.dispose();
  }
}
