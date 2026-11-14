import { buildDualContourSurface } from './dual-contouring.js';
import { createHabitatVoxelField } from './voxel-field.js';

const CHUNK_SIZE = 32;
const WORLD_SIZE = Object.freeze({ x: 82, y: 31, z: 62 });
const floorAt = (x, z) => -8.65
  + Math.sin(x * 0.16 + z * 0.07) * 0.48
  + Math.sin(z * 0.31 - x * 0.045) * 0.22
  + Math.cos(x * 0.075 + z * 0.19) * 0.16
  + Math.sin(x * 0.34 + z * 0.23) * Math.cos(z * 0.29 - x * 0.17) * 0.18
  + Math.sin(x * 0.57 - z * 0.41) * 0.07;

function randomFor(seed, x, z) {
  let state = (seed ^ Math.imul(x, 0x9e3779b1) ^ Math.imul(z, 0x85ebca77)) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function ellipsoid(x, y, z, rock) {
  const dx = (x - rock.x) / rock.rx;
  const dy = (y - rock.y) / rock.ry;
  const dz = (z - rock.z) / rock.rz;
  const k0 = Math.hypot(dx, dy, dz);
  if (k0 < 1e-9) return -Math.min(rock.rx, rock.ry, rock.rz);
  const k1 = Math.hypot(dx / rock.rx, dy / rock.ry, dz / rock.rz);
  return k0 * (k0 - 1) / k1;
}

const smoothMin = (a, b, k) => {
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k));
  return b * (1 - h) + a * h - k * h * (1 - h);
};

function makeChunkField(seed, chunkX, chunkZ, worldSize = WORLD_SIZE, includeStreamRocks = true) {
  const base = createHabitatVoxelField(worldSize, floorAt);
  if (!includeStreamRocks) return base;
  const rocks = [];
  // Include neighbouring feature cells so a boulder that straddles a chunk
  // boundary is sampled identically by both chunk workers.
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const tx = chunkX + dx, tz = chunkZ + dz, random = randomFor(seed, tx, tz);
    const count = 2 + Math.floor(random() * 3);
    for (let i = 0; i < count; i++) {
      const x = tx * CHUNK_SIZE + 4 + random() * (CHUNK_SIZE - 8);
      const z = tz * CHUNK_SIZE + 4 + random() * (CHUNK_SIZE - 8);
      const radius = 1.3 + random() * 2.4;
      const height = radius * (0.55 + random() * 0.75);
      rocks.push({
        x, z, y: floorAt(x, z) + height * 0.34,
        rx: radius * (0.8 + random() * 0.35),
        ry: height, rz: radius * (0.72 + random() * 0.42)
      });
    }
  }
  return (x, y, z) => {
    let distance = base(x, y, z);
    for (const rock of rocks) {
      if (Math.abs(x - rock.x) > rock.rx + 0.5
        || Math.abs(z - rock.z) > rock.rz + 0.5
        || Math.abs(y - rock.y) > rock.ry + 0.5) continue;
      distance = smoothMin(distance, ellipsoid(x, y, z, rock), 0.32);
    }
    return distance;
  };
}

function buildChunk({ seed, chunkX, chunkZ, chunkSize, worldSize = WORLD_SIZE, minY = -18, maxY = 0, cellSize = 1, includeStreamRocks = true }) {
  const size = chunkSize || CHUNK_SIZE;
  const cell = cellSize;
  if (!(cell > 0) || !Number.isInteger(size / cell) || !(maxY > minY) || !Number.isInteger((maxY - minY) / cell)) {
    throw new RangeError('Chunk dimensions must align to the voxel cell size.');
  }
  const minX = chunkX * size, minZ = chunkZ * size;
  // Two-cell halo also gives boundary lattice gradients a full central-difference
  // stencil in both workers. A centroid ownership rule assigns every triangle
  // to exactly one chunk, eliminating cracks and duplicate faces.
  const min = [minX - cell * 2, minY, minZ - cell * 2];
  const max = [minX + size + cell * 2, maxY, minZ + size + cell * 2];
  const cells = [size / cell + 4, (maxY - minY) / cell, size / cell + 4];
  const sampleDistance = makeChunkField(seed, chunkX, chunkZ, worldSize, includeStreamRocks);
  const full = buildDualContourSurface({ min, max, cells, sampleDistance });
  const kept = [];
  for (let i = 0; i < full.indices.length; i += 3) {
    const ia = full.indices[i] * 3, ib = full.indices[i + 1] * 3, ic = full.indices[i + 2] * 3;
    const cx = (full.positions[ia] + full.positions[ib] + full.positions[ic]) / 3;
    const cz = (full.positions[ia + 2] + full.positions[ib + 2] + full.positions[ic + 2]) / 3;
    if (cx >= minX && cx < minX + size && cz >= minZ && cz < minZ + size) {
      kept.push(full.indices[i], full.indices[i + 1], full.indices[i + 2]);
    }
  }
  const used = new Map(), positions = [], normals = [], indices = [];
  for (const oldIndex of kept) {
    let next = used.get(oldIndex);
    if (next === undefined) {
      next = positions.length / 3;
      used.set(oldIndex, next);
      const p = oldIndex * 3;
      positions.push(full.positions[p], full.positions[p + 1], full.positions[p + 2]);
      normals.push(full.normals[p], full.normals[p + 1], full.normals[p + 2]);
    }
    indices.push(next);
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
    vertexCount: positions.length / 3,
    triangleCount: indices.length / 3
  };
}

self.addEventListener('message', event => {
  const message = event.data;
  if (message?.type !== 'generate-chunk') return;
  try {
    const mesh = buildChunk(message);
    self.postMessage({
      type: 'complete', key: message.key, token: message.token, mesh
    }, [mesh.positions.buffer, mesh.normals.buffer, mesh.indices.buffer]);
  } catch (error) {
    self.postMessage({
      type: 'error', key: message.key, token: message.token,
      message: String(error?.stack ?? error)
    });
  }
});

// Exposed for deterministic seam regression tests; the worker listener remains the runtime entry point.
export { buildChunk as buildVoxelTerrainChunk };
