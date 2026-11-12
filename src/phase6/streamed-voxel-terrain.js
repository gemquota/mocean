/**
 * Bounded, predictive chunk streaming for the voxel terrain study.
 * Geometry generation is delegated to module workers; this module owns only
 * scheduling, cache lifetime and Three.js resource disposal.
 */
export const TERRAIN_CHUNK_SIZE = 32;
export const TERRAIN_STREAM_RADIUS = 3;
export const TERRAIN_PREFETCH_RADIUS = 4;
export const TERRAIN_MAX_CHUNKS = 81;

export function selectTerrainChunks({
  x = 0, z = 0, forwardX = 0, forwardZ = 0,
  chunkSize = TERRAIN_CHUNK_SIZE,
  radius = TERRAIN_STREAM_RADIUS,
  prefetchRadius = TERRAIN_PREFETCH_RADIUS
} = {}) {
  if (!Number.isInteger(chunkSize) || chunkSize < 8 || !Number.isInteger(radius) || radius < 0
    || !Number.isInteger(prefetchRadius) || prefetchRadius < radius) {
    throw new RangeError('Invalid terrain chunk dimensions or radii.');
  }
  const centreX = Math.floor(x / chunkSize);
  const centreZ = Math.floor(z / chunkSize);
  const length = Math.hypot(forwardX, forwardZ) || 1;
  const fx = forwardX / length, fz = forwardZ / length;
  const chunks = [];
  for (let dz = -prefetchRadius; dz <= prefetchRadius; dz++) {
    for (let dx = -prefetchRadius; dx <= prefetchRadius; dx++) {
      const distance = Math.hypot(dx, dz);
      if (distance > prefetchRadius + 0.25) continue;
      const ahead = dx * fx + dz * fz;
      chunks.push({
        x: centreX + dx,
        z: centreZ + dz,
        key: (centreX + dx) + ',' + (centreZ + dz),
        distance,
        priority: distance * distance - Math.max(0, ahead) * 0.8,
        visible: distance <= radius + 0.25
      });
    }
  }
  return chunks.sort((a, b) => a.priority - b.priority || a.key.localeCompare(b.key));
}

export function createTerrainChunkStream({
  THREE, scene, onUpdate = () => {},
  workerCount = 2, chunkSize = TERRAIN_CHUNK_SIZE,
  radius = TERRAIN_STREAM_RADIUS, prefetchRadius = TERRAIN_PREFETCH_RADIUS,
  maxChunks = TERRAIN_MAX_CHUNKS, seed = 6102026
} = {}) {
  if (!THREE?.BufferGeometry || !THREE?.Mesh || !scene) {
    throw new TypeError('Three.js and a scene are required.');
  }
  if (!Number.isInteger(workerCount) || workerCount < 1 || workerCount > 4) {
    throw new RangeError('workerCount must be between one and four.');
  }
  if (!Number.isInteger(chunkSize) || chunkSize < 8 || !Number.isInteger(maxChunks) || maxChunks < 1) {
    throw new RangeError('chunkSize must be an integer of at least eight and maxChunks must be positive.');
  }
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, roughness: 0.96, metalness: 0.01
  });
  const workers = [];
  const chunks = new Map();
  const queue = [];
  let sequence = 0, disposed = false, lastFocus = { x: NaN, z: NaN };

  const colourise = positions => {
    const colours = new Float32Array(positions.length);
    const colour = new THREE.Color();
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i + 1], z = positions[i + 2];
      const grain = 0.5 + 0.5 * Math.sin(x * 0.72 + Math.sin(z * 0.41) * 2.1)
        * Math.cos(z * 0.61 - x * 0.23);
      const height = Math.max(0, Math.min(1, (y + 11.5) / 5));
      colour.setRGB(0.09 + grain * 0.018 + height * 0.025,
        0.16 + grain * 0.025 + height * 0.035,
        0.15 + grain * 0.018 + height * 0.025);
      colours[i] = colour.r; colours[i + 1] = colour.g; colours[i + 2] = colour.b;
    }
    return colours;
  };

  function report() {
    onUpdate({
      loaded: [...chunks.values()].filter(item => item.mesh).length,
      pending: queue.length + workers.filter(item => item.busy).length,
      visible: [...chunks.values()].filter(item => item.mesh && item.visible).length
    });
  }

  function disposeChunk(item) {
    if (!item) return;
    if (item.mesh) {
      scene.remove(item.mesh);
      item.mesh.geometry.dispose();
    }
  }

  function dispatch() {
    if (disposed) return;
    for (const slot of workers) {
      if (slot.busy || !queue.length) continue;
      const job = queue.shift();
      const item = chunks.get(job.key);
      if (!item || item.token !== job.token) continue;
      slot.busy = true;
      slot.key = job.key;
      slot.worker.postMessage({
        type: 'generate-chunk', key: job.key, token: job.token,
        chunkX: job.x, chunkZ: job.z, chunkSize, seed
      });
    }
    report();
  }

  function handleMessage(slot, event) {
    slot.busy = false;
    const message = event.data || {};
    const item = chunks.get(message.key);
    if (item && item.token === message.token && message.type === 'complete') {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(message.mesh.positions, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(message.mesh.normals, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colourise(message.mesh.positions), 3));
      geometry.setIndex(new THREE.BufferAttribute(message.mesh.indices, 1));
      geometry.computeBoundingSphere();
      item.mesh = new THREE.Mesh(geometry, material);
      item.mesh.receiveShadow = true;
      item.mesh.frustumCulled = true;
      item.mesh.userData.chunkKey = message.key;
      item.mesh.visible = item.visible;
      scene.add(item.mesh);
      item.error = null;
    } else if (item && item.token === message.token && message.type === 'error') {
      item.error = message.message || 'Chunk generation failed';
    }
    slot.key = null;
    dispatch();
  }

  for (let i = 0; i < workerCount; i++) {
    const worker = new Worker(new URL('./streamed-voxel-worker.js', import.meta.url), { type: 'module' });
    const slot = { worker, busy: false, key: null };
    worker.addEventListener('message', event => handleMessage(slot, event));
    worker.addEventListener('error', event => {
      slot.busy = false;
      const item = slot.key ? chunks.get(slot.key) : null;
      if (item) item.error = event.message || 'Terrain worker failed';
      slot.key = null;
      dispatch();
    });
    workers.push(slot);
  }

  function update({ x = 0, z = 0, forwardX = 0, forwardZ = 0 } = {}) {
    if (disposed) return;
    const desired = selectTerrainChunks({
      x, z, forwardX, forwardZ, chunkSize, radius, prefetchRadius
    });
    const keep = new Set(desired.map(item => item.key));
    for (const [key, item] of chunks) {
      if (!keep.has(key)) {
        item.token = ++sequence;
        disposeChunk(item);
        chunks.delete(key);
      }
    }
    // Drop obsolete jobs and refresh priorities as the camera turns.
    const desiredByKey = new Map(desired.map(request => [request.key, request]));
    for (let i = queue.length - 1; i >= 0; i--) {
      const request = desiredByKey.get(queue[i].key);
      if (!request) queue.splice(i, 1);
      else {
        queue[i].priority = request.priority;
        queue[i].visible = request.visible;
      }
    }
    for (const request of desired) {
      let item = chunks.get(request.key);
      if (item) {
        item.visible = request.visible;
        if (item.mesh) item.mesh.visible = request.visible;
        continue;
      }
      item = { token: ++sequence, mesh: null, visible: request.visible, error: null };
      chunks.set(request.key, item);
      queue.push({ ...request, token: item.token });
    }
    queue.sort((a, b) => a.priority - b.priority);
    // A hard cap prevents a long orbit session from retaining unbounded GPU memory.
    while (chunks.size > maxChunks) {
      const candidates = [...chunks.entries()].filter(([key]) => !keep.has(key));
      if (!candidates.length) break;
      const [key, item] = candidates[0];
      disposeChunk(item);
      chunks.delete(key);
    }
    lastFocus = { x, z };
    dispatch();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const slot of workers) {
      slot.worker.terminate();
      slot.busy = false;
    }
    workers.length = 0;
    for (const item of chunks.values()) disposeChunk(item);
    chunks.clear(); queue.length = 0;
    material.dispose();
  }

  return Object.freeze({
    update, dispose,
    get stats() {
      return {
        loaded: [...chunks.values()].filter(item => item.mesh).length,
        queued: queue.length,
        working: workers.filter(item => item.busy).length,
        focus: { ...lastFocus }
      };
    }
  });
}
