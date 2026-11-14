/**
 * GPU-instanced naturalistic marine school renderer.
 *
 * One InstancedMesh is created per GLB mesh part and species. Position,
 * orientation, scale and travelling-wave phase are updated per entity while
 * geometry and materials are shared across the entire species batch.
 */
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { applySwimMaterial, SWIM_CONFIGS } from './polyfish-swim-material.js';
import { SPECIES_MODEL_MAP } from './species-model-map.js';

const MODEL_LENGTH = 0.78;

function promoteQuantizedAttributes(THREE, geometry) {
  for (const name of ['position', 'normal', 'tangent']) {
    const attribute = geometry.getAttribute(name);
    if (!attribute || attribute.array instanceof Float32Array) continue;
    const values = new Float32Array(attribute.count * attribute.itemSize);
    for (let i = 0; i < attribute.count; i++) {
      values[i * attribute.itemSize] = attribute.getX(i);
      if (attribute.itemSize > 1) values[i * attribute.itemSize + 1] = attribute.getY(i);
      if (attribute.itemSize > 2) values[i * attribute.itemSize + 2] = attribute.getZ(i);
      if (attribute.itemSize > 3) values[i * attribute.itemSize + 3] = attribute.getW(i);
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize, false));
  }
}

function flatten(THREE, source) {
  source.updateMatrixWorld(true);
  const root = new THREE.Group();
  source.traverse(node => {
    if (!node.isMesh || !node.geometry) return;
    const geometry = node.geometry.clone();
    promoteQuantizedAttributes(THREE, geometry);
    geometry.applyMatrix4(node.matrixWorld);
    geometry.computeBoundingBox();
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    const material = Array.isArray(node.material)
      ? node.material.map(item => item.clone())
      : node.material?.clone();
    root.add(new THREE.Mesh(geometry, material));
  });
  return root;
}

export function advanceMarineAnimation(fish, dt) {
  const mapping = SPECIES_MODEL_MAP[fish.species];
  const config = SWIM_CONFIGS[mapping?.motion] ?? SWIM_CONFIGS.fish;
  const step = Math.min(Math.max(dt, 0), 0.05);
  fish._marinePhase = (fish._marinePhase ?? (((fish.id * 0.61803398875) % 1) * Math.PI * 2)) + step * (config.idleSpeed ?? 2.8);
  fish._marinePulsePhase = (fish._marinePulsePhase ?? (((fish.id * 0.38196601125) % 1) * Math.PI * 2)) + step * 1.7;
}

export class InstancedMarineSchoolRenderer {
  constructor(THREE, { baseUrl = './assets/models/osmocean/naturalistic/', loader = new GLTFLoader(), capacity = 1000 } = {}) {
    this.THREE = THREE;
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    this.loader = loader;
    this.capacity = Math.max(1, Math.floor(capacity));
    this.gltfCache = new Map();
    this.batches = new Map();
  }

  async load(modelId) {
    if (!this.gltfCache.has(modelId)) this.gltfCache.set(modelId, this.loader.loadAsync(this.baseUrl + modelId + '.glb'));
    return this.gltfCache.get(modelId);
  }

  async createBatch(species) {
    if (this.batches.has(species)) return this.batches.get(species);
    const mapping = SPECIES_MODEL_MAP[species];
    if (!mapping?.id) return null;
    const gltf = await this.load(mapping.id);
    const visual = flatten(this.THREE, cloneSkeleton(gltf.scene));
    if (!visual.children.length) throw new Error('Naturalistic marine GLB contains no mesh geometry: ' + mapping.id);

    // Normalize once. Individual fish then need only one compact instance matrix.
    visual.rotation.y = Math.PI / 2;
    visual.updateMatrixWorld(true);
    const bounds = new this.THREE.Box3().setFromObject(visual);
    const extent = bounds.getSize(new this.THREE.Vector3());
    const normalizer = 1 / Math.max(extent.x, extent.y, extent.z, 0.001);
    visual.scale.setScalar(normalizer);
    visual.updateMatrixWorld(true);
    const normalizedBounds = new this.THREE.Box3().setFromObject(visual);
    visual.position.sub(normalizedBounds.getCenter(new this.THREE.Vector3()));
    visual.updateMatrixWorld(true);

    const phaseArray = new Float32Array(this.capacity);
    const amplitudeArray = new Float32Array(this.capacity);
    const phaseAttribute = new this.THREE.InstancedBufferAttribute(phaseArray, 1);
    const amplitudeAttribute = new this.THREE.InstancedBufferAttribute(amplitudeArray, 1);
    const group = new this.THREE.Group();
    const geometries = [];
    const materials = [];
    const meshes = [];

    for (const part of visual.children) {
      if (!part.isMesh) continue;
      const geometry = part.geometry.clone();
      geometry.applyMatrix4(visual.matrix);
      geometry.setAttribute('aSwimPhase', phaseAttribute);
      geometry.setAttribute('aSwimAmplitude', amplitudeAttribute);
      const material = Array.isArray(part.material)
        ? part.material.map(item => item.clone())
        : part.material.clone();
      const mesh = new this.THREE.InstancedMesh(geometry, material, this.capacity);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(this.THREE.DynamicDrawUsage);
      group.add(mesh);
      meshes.push(mesh);
      geometries.push(geometry);
      if (Array.isArray(material)) materials.push(...material);
      else materials.push(material);
    }

    const motion = mapping.motion;
    let swimData = null;
    if (motion !== 'pulse') {
      swimData = applySwimMaterial(group, motion, { instanced: true });
      // The instance matrix carries the 0.78m body scale. Compensate here so
      // tail displacement remains in world units and does not grow with fish size.
      swimData.uniforms.uAmplitude.value = (swimData.config.idleAmplitude ?? swimData.config.amplitude) / MODEL_LENGTH;
    }

    const dummy = new this.THREE.Object3D();
    const forward = new this.THREE.Vector3(1, 0, 0);
    const up = new this.THREE.Vector3(0, 1, 0);
    const direction = new this.THREE.Vector3();
    const batch = {
      species,
      modelId: mapping.id,
      group,
      meshes,
      capacity: this.capacity,
      rendered: 0,
      overflow: 0,
      update(fishList, dt) {
        const count = Math.min(fishList.length, this.capacity);
        this.overflow = Math.max(0, fishList.length - count);
        this.rendered = count;
        for (let i = 0; i < count; i++) {
          const fish = fishList[i];
          const bodyScale = fish.bodyScale ?? 1;
          if (fish._marinePhase === undefined) fish._marinePhase = ((fish.id * 0.61803398875) % 1) * Math.PI * 2;
          if (swimData) {
            phaseArray[i] = fish._marinePhase;
            amplitudeArray[i] = 1 / Math.max(0.1, bodyScale);
          } else {
            phaseArray[i] = 0;
            amplitudeArray[i] = 1;
          }
          dummy.position.set(fish.p.x, fish.p.y, fish.p.z);
          if (mapping.orientation === 'vertical') {
            const yaw = Math.atan2(fish.forward.x, fish.forward.z);
            dummy.quaternion.setFromAxisAngle(up, yaw);
          } else {
            direction.set(fish.forward.x, fish.forward.y, fish.forward.z).normalize();
            dummy.quaternion.setFromUnitVectors(forward, direction);
          }
          const scale = MODEL_LENGTH * bodyScale;
          const pulse = motion === 'pulse' ? 1 + 0.035 * Math.sin(fish._marinePulsePhase ?? 0) : 1;
          dummy.scale.set(scale, scale * pulse, scale);
          dummy.updateMatrix();
          for (const mesh of meshes) mesh.setMatrixAt(i, dummy.matrix);
        }
        phaseAttribute.needsUpdate = true;
        amplitudeAttribute.needsUpdate = true;
        for (const mesh of meshes) {
          mesh.count = count;
          mesh.instanceMatrix.needsUpdate = true;
        }
      },
      dispose() {
        for (const mesh of meshes) group.remove(mesh);
        for (const geometry of geometries) geometry.dispose();
        for (const material of materials) material.dispose();
      }
    };
    this.batches.set(species, batch);
    return batch;
  }

  dispose() {
    for (const batch of this.batches.values()) batch.dispose();
    this.batches.clear();
    this.gltfCache.clear();
  }
}
