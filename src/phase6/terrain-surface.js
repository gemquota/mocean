/**
 * Multi-scale seabed surface for the Phase 6 visual prototype.
 * Pure deterministic functions: no renderer or creature-simulation dependencies.
 */

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function seabedRelief(x, z) {
  const broad = 1.25 * Math.sin(x * 0.105 + z * 0.052)
    * Math.cos(z * 0.082 - x * 0.037);
  const rolling = 0.62 * Math.sin(x * 0.29 + z * 0.19)
    * Math.cos(z * 0.24 - x * 0.17);
  const detail = 0.19 * Math.sin(x * 0.91 + z * 0.63)
    * Math.cos(z * 0.77 - x * 0.58);

  const ridgeLine = 4.2 * Math.sin(x * 0.073) + 1.7 * Math.sin(x * 0.19);
  const ridgeDistance = Math.abs(z - ridgeLine);
  const reefShoulder = 2.35 * Math.exp(-Math.pow(ridgeDistance / 4.6, 2));
  const outerShelf = 1.15 * Math.exp(-Math.pow((z + 17 + 2.8 * Math.sin(x * 0.08)) / 5.8, 2));
  const brokenLedge = 0.72 * Math.exp(-Math.pow((z - 15 - 2 * Math.cos(x * 0.11)) / 2.5, 2))
    * (0.45 + 0.55 * Math.sin(x * 0.31) ** 2);

  return broad + rolling + detail + reefShoulder + outerShelf + brokenLedge;
}

export function sampleSeabedHeight(x, z, floorAt) {
  if (typeof floorAt !== 'function') throw new TypeError('floorAt must be a function.');
  const base = floorAt(x, z);
  if (!Number.isFinite(base)) throw new TypeError('floorAt must return a finite height.');
  return base + seabedRelief(x, z);
}

/**
 * Build a bounded indexed heightfield with sediment, exposed-rock and slope cues.
 * Returns transferable typed arrays suitable for a single Three.js BufferGeometry.
 */
export function buildSeabedGrid({
  width = 84,
  depth = 60,
  segmentsX = 220,
  segmentsZ = 160,
  floorAt
} = {}) {
  if (!(width > 0) || !(depth > 0)
    || !Number.isInteger(segmentsX) || segmentsX < 2
    || !Number.isInteger(segmentsZ) || segmentsZ < 2
    || typeof floorAt !== 'function') {
    throw new RangeError('A positive grid size, at least two segments per axis, and floorAt are required.');
  }

  const vertexCount = (segmentsX + 1) * (segmentsZ + 1);
  const positions = new Float32Array(vertexCount * 3);
  const colours = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = new Uint32Array(segmentsX * segmentsZ * 6);
  let minHeight = Infinity, maxHeight = -Infinity;

  for (let iz = 0; iz <= segmentsZ; iz++) {
    const v = iz / segmentsZ;
    const z = (v - 0.5) * depth;
    for (let ix = 0; ix <= segmentsX; ix++) {
      const u = ix / segmentsX;
      const x = (u - 0.5) * width;
      const y = sampleSeabedHeight(x, z, floorAt);
      const vertex = iz * (segmentsX + 1) + ix;
      const p = vertex * 3;
      const uv = vertex * 2;
      positions[p] = x;
      positions[p + 1] = y;
      positions[p + 2] = z;
      uvs[uv] = u * width * 0.22;
      uvs[uv + 1] = v * depth * 0.22;
      minHeight = Math.min(minHeight, y);
      maxHeight = Math.max(maxHeight, y);

      const grain = 0.5 + 0.5 * Math.sin(x * 0.72 + Math.sin(z * 0.41) * 2.1)
        * Math.cos(z * 0.61 - x * 0.23);
      const exposed = smooth(0.9, 3.2, seabedRelief(x, z));
      const sediment = 0.035 * grain;
      colours[p] = 0.105 + sediment + exposed * 0.065;
      colours[p + 1] = 0.19 + sediment * 1.3 + exposed * 0.095;
      colours[p + 2] = 0.17 + sediment * 0.9 + exposed * 0.055;
    }
  }

  let cursor = 0;
  for (let iz = 0; iz < segmentsZ; iz++) {
    for (let ix = 0; ix < segmentsX; ix++) {
      const a = iz * (segmentsX + 1) + ix;
      const b = a + 1;
      const c = a + segmentsX + 1;
      const d = c + 1;
      indices[cursor++] = a;
      indices[cursor++] = c;
      indices[cursor++] = b;
      indices[cursor++] = b;
      indices[cursor++] = c;
      indices[cursor++] = d;
    }
  }

  return Object.freeze({
    positions,
    colours,
    uvs,
    indices,
    vertexCount,
    triangleCount: indices.length / 3,
    bounds: Object.freeze({
      minX: -width / 2, maxX: width / 2,
      minZ: -depth / 2, maxZ: depth / 2,
      minY: minHeight, maxY: maxHeight
    })
  });
}
