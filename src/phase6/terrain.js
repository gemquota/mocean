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

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Produce repeatable rock and arch placements inside the habitat bounds.
 * floorAt is supplied by the caller so this module has no simulation dependency.
 */
export function generateTerrainFeatures({
  seed = 6102026,
  bounds = { minX: -40, maxX: 40, minZ: -28, maxZ: 28 },
  rockCount = 24,
  archCount = 5,
  floorAt = () => -8.65
} = {}) {
  if (!Number.isInteger(rockCount) || rockCount < 0 || !Number.isInteger(archCount) || archCount < 0) {
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

  for (let i = 0; i < rockCount; i++) {
    const radius = range(1.1, 3.8);
    const x = range(bounds.minX + radius, bounds.maxX - radius);
    const z = range(bounds.minZ + radius, bounds.maxZ - radius);
    const height = radius * range(0.55, 1.25);
    rocks.push(Object.freeze({
      id: 'rock-' + i,
      x, z,
      y: floorAt(x, z) + height * 0.34,
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
      floor: floorAt(x, z),
      radius,
      tube: range(0.55, 1.05),
      depth: range(1.4, 2.8),
      rotation: range(-0.28, 0.28)
    }));
  }

  return Object.freeze({
    seed: seed >>> 0,
    bounds: Object.freeze({ ...bounds }),
    rocks: Object.freeze(rocks),
    arches: Object.freeze(arches)
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
  for (const rock of features.rocks) {
    points.push([rock.x - rock.radius, rock.z - rock.depth], [rock.x + rock.radius, rock.z + rock.depth]);
  }
  for (const arch of features.arches) {
    points.push([arch.x - arch.radius - arch.tube, arch.z - arch.depth * .5 - arch.tube]);
    points.push([arch.x + arch.radius + arch.tube, arch.z + arch.depth * .5 + arch.tube]);
  }
  if (!points.length) return null;
  return {
    minX: Math.min(...points.map(p => p[0])),
    maxX: Math.max(...points.map(p => p[0])),
    minZ: Math.min(...points.map(p => p[1])),
    maxZ: Math.max(...points.map(p => p[1]))
  };
}
