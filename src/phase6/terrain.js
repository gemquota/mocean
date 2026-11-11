/**
 * Deterministic, renderer-independent layout for the Phase 6 seabed prototype.
 * Features are static scene descriptions; they never participate in simulation.
 */

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const smoothstep = (edge0, edge1, value) => {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Compose a base seabed height with smooth, finite-length depressed channels.
 * The same function must be used for terrain mesh vertices and feature placement.
 */
export function createTerrainFloor(baseFloor, features = {}) {
  if (typeof baseFloor !== 'function') throw new TypeError('baseFloor must be a function.');
  const channels = features.crevasses || [];
  return (x, z) => {
    const base = baseFloor(x, z);
    if (!Number.isFinite(base)) throw new TypeError('baseFloor must return a finite height.');
    let depression = 0;
    for (const channel of channels) {
      const cosine = Math.cos(channel.rotation || 0);
      const sine = Math.sin(channel.rotation || 0);
      const dx = x - channel.x;
      const dz = z - channel.z;
      const along = cosine * dx - sine * dz;
      const across = sine * dx + cosine * dz;
      const halfLength = channel.length * 0.5;
      const halfWidth = channel.width * 0.5;
      const endFade = 1 - smoothstep(halfLength * 0.72, halfLength, Math.abs(along));
      const crossProfile = Math.exp(-2.2 * Math.pow(across / halfWidth, 4));
      depression = Math.max(depression, channel.depth * endFade * crossProfile);
    }
    return base - depression;
  };
}

/**
 * Produce repeatable rock, arch, shelf and crevasse placements inside bounds.
 * floorAt is supplied by the caller so this module has no simulation dependency.
 */
export function generateTerrainFeatures({
  seed = 6102026,
  bounds = { minX: -40, maxX: 40, minZ: -28, maxZ: 28 },
  rockCount = 24,
  archCount = 5,
  shelfCount = 7,
  crevasseCount = 4,
  floorAt = () => -8.65
} = {}) {
  const counts = [rockCount, archCount, shelfCount, crevasseCount];
  if (counts.some(count => !Number.isInteger(count) || count < 0)) {
    throw new RangeError('Terrain feature counts must be non-negative integers.');
  }
  if (!(bounds.maxX > bounds.minX) || !(bounds.maxZ > bounds.minZ)) {
    throw new RangeError('Terrain bounds must have positive width and depth.');
  }
  if (typeof floorAt !== 'function') throw new TypeError('floorAt must be a function.');

  const random = seededRandom(seed);
  const range = (min, max) => min + random() * (max - min);
  const rocks = [];
  const arches = [];
  const shelves = [];
  const crevasses = [];

  for (let i = 0; i < crevasseCount; i++) {
    const length = range(12, 23);
    const width = range(2.8, 5.2);
    const rotation = range(-Math.PI, Math.PI);
    const extentX = Math.abs(Math.cos(rotation)) * length * 0.5
      + Math.abs(Math.sin(rotation)) * width * 0.5;
    const extentZ = Math.abs(Math.sin(rotation)) * length * 0.5
      + Math.abs(Math.cos(rotation)) * width * 0.5;
    crevasses.push(Object.freeze({
      id: 'crevasse-' + i,
      x: range(bounds.minX + extentX, bounds.maxX - extentX),
      z: range(bounds.minZ + extentZ, bounds.maxZ - extentZ),
      length,
      width,
      depth: range(1.2, 2.8),
      rotation
    }));
  }

  const terrainFloor = createTerrainFloor(floorAt, { crevasses });

  for (let i = 0; i < rockCount; i++) {
    const radius = range(1.1, 3.8);
    const x = range(bounds.minX + radius, bounds.maxX - radius);
    const z = range(bounds.minZ + radius, bounds.maxZ - radius);
    const height = radius * range(0.55, 1.25);
    rocks.push(Object.freeze({
      id: 'rock-' + i,
      x, z,
      y: terrainFloor(x, z) + height * 0.82,
      radius,
      height,
      depth: radius * range(0.62, 1.12),
      rotation: range(0, Math.PI * 2),
      tilt: range(-0.18, 0.18)
    }));
  }

  for (let i = 0; i < archCount; i++) {
    const radius = range(2.3, 4.8);
    const x = range(bounds.minX + radius + 1, bounds.maxX - radius - 1);
    const z = range(bounds.minZ + radius + 1, bounds.maxZ - radius - 1);
    arches.push(Object.freeze({
      id: 'arch-' + i,
      x, z,
      floor: terrainFloor(x, z),
      radius,
      tube: range(0.55, 1.05),
      depth: range(1.4, 2.8),
      rotation: range(-0.28, 0.28)
    }));
  }

  for (let i = 0; i < shelfCount; i++) {
    const width = range(5.5, 10);
    const depth = range(3.5, 7);
    const height = range(0.8, 1.5);
    const rotation = range(-0.42, 0.42);
    const extentX = Math.abs(Math.cos(rotation)) * width * 0.5
      + Math.abs(Math.sin(rotation)) * depth * 0.5;
    const extentZ = Math.abs(Math.sin(rotation)) * width * 0.5
      + Math.abs(Math.cos(rotation)) * depth * 0.5;
    const x = range(bounds.minX + extentX, bounds.maxX - extentX);
    const z = range(bounds.minZ + extentZ, bounds.maxZ - extentZ);
    shelves.push(Object.freeze({
      id: 'shelf-' + i,
      x, z,
      y: terrainFloor(x, z) + range(2.2, 4.8) + height * 0.5,
      width,
      height,
      depth,
      rotation
    }));
  }

  return Object.freeze({
    seed: seed >>> 0,
    bounds: Object.freeze({ ...bounds }),
    rocks: Object.freeze(rocks),
    arches: Object.freeze(arches),
    shelves: Object.freeze(shelves),
    crevasses: Object.freeze(crevasses)
  });
}

/** True if a horizontal point lies within the arch's clear passage aperture. */
export function isInsideArchPassage(x, z, arch, clearance = 0) {
  if (!arch || !(arch.radius > 0) || !(arch.tube > 0)) return false;
  const dx = x - arch.x, dz = z - arch.z;
  const halfWidth = Math.sqrt(Math.max(0, arch.radius * arch.radius - dx * dx));
  return Math.abs(dx) < arch.radius - arch.tube - clearance
    && Math.abs(dz) < arch.depth * 0.5 - clearance
    && halfWidth > arch.tube + clearance;
}

export function terrainFeatureBounds(features) {
  const points = [];
  for (const rock of features.rocks || []) {
    points.push([rock.x - rock.radius, rock.z - rock.depth], [rock.x + rock.radius, rock.z + rock.depth]);
  }
  for (const arch of features.arches || []) {
    points.push([arch.x - arch.radius - arch.tube, arch.z - arch.depth * .5 - arch.tube]);
    points.push([arch.x + arch.radius + arch.tube, arch.z + arch.depth * .5 + arch.tube]);
  }
  for (const shelf of features.shelves || []) {
    const ex = Math.abs(Math.cos(shelf.rotation || 0)) * shelf.width * .5
      + Math.abs(Math.sin(shelf.rotation || 0)) * shelf.depth * .5;
    const ez = Math.abs(Math.sin(shelf.rotation || 0)) * shelf.width * .5
      + Math.abs(Math.cos(shelf.rotation || 0)) * shelf.depth * .5;
    points.push([shelf.x - ex, shelf.z - ez], [shelf.x + ex, shelf.z + ez]);
  }
  for (const channel of features.crevasses || []) {
    const ex = Math.abs(Math.cos(channel.rotation || 0)) * channel.length * .5
      + Math.abs(Math.sin(channel.rotation || 0)) * channel.width * .5;
    const ez = Math.abs(Math.sin(channel.rotation || 0)) * channel.length * .5
      + Math.abs(Math.cos(channel.rotation || 0)) * channel.width * .5;
    points.push([channel.x - ex, channel.z - ez], [channel.x + ex, channel.z + ez]);
  }
  if (!points.length) return null;
  return {
    minX: Math.min(...points.map(p => p[0])),
    maxX: Math.max(...points.map(p => p[0])),
    minZ: Math.min(...points.map(p => p[1])),
    maxZ: Math.max(...points.map(p => p[1]))
  };
}
