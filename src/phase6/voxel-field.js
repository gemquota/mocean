import { sampleSeabedHeight } from './terrain-surface.js';

const ROCKS = Object.freeze([
  Object.freeze({ x: -19, z: 7, rx: 4.8, ry: 2.8, rz: 3.7, lift: 0.7 }),
  Object.freeze({ x: 15, z: -5, rx: 5.2, ry: 3.1, rz: 4.1, lift: 0.9 }),
  Object.freeze({ x: 25, z: 13, rx: 3.8, ry: 2.3, rz: 3.2, lift: 0.55 }),
  Object.freeze({ x: -29, z: -13, rx: 3.6, ry: 2.1, rz: 3.1, lift: 0.4 })
]);

const CAVES = Object.freeze([
  Object.freeze({ a: [4.5, -10.45, -15], b: [4.5, -10.45, 34], radius: 1.45 }),
  Object.freeze({ a: [-40, -10.3, -12], b: [-3, -10.3, -12], radius: 1.25 })
]);

function ellipsoidDistance(x, y, z, rock, floor) {
  const cx = rock.x, cz = rock.z;
  const cy = floor + rock.ry * 0.55 + rock.lift;
  const nx = (x - cx) / rock.rx;
  const ny = (y - cy) / rock.ry;
  const nz = (z - cz) / rock.rz;
  return (Math.hypot(nx, ny, nz) - 1) * Math.min(rock.rx, rock.ry, rock.rz);
}

function capsuleDistance(x, y, z, capsule) {
  const [ax, ay, az] = capsule.a;
  const [bx, by, bz] = capsule.b;
  const vx = bx - ax, vy = by - ay, vz = bz - az;
  const wx = x - ax, wy = y - ay, wz = z - az;
  const denominator = vx * vx + vy * vy + vz * vz;
  const t = denominator > 1e-12
    ? Math.max(0, Math.min(1, (wx * vx + wy * vy + wz * vz) / denominator))
    : 0;
  return Math.hypot(wx - vx * t, wy - vy * t, wz - vz * t) - capsule.radius;
}

function extrudedArchDistance(x, y, z, arch) {
  // Extruded torus SDF: abs(radial offset) preserves the open arch aperture.
  const ring = Math.abs(Math.hypot(x - arch.x, y - arch.baseY) - arch.radius) - arch.tube;
  const slab = Math.abs(z - arch.z) - arch.depth * 0.5;
  const ox = Math.max(ring, 0);
  const oy = Math.max(slab, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(ring, slab), 0);
}

/**
 * A deterministic signed-distance-style seabed volume.
 * Negative values are solid rock/sediment; positive values are water.
 * The field contains an overhanging arch and two subtractive tunnels.
 */
export function createSeabedDensityField({ seed = 6102026 } = {}) {
  const phase = (seed >>> 0) / 4294967296 * Math.PI * 2;
  const floorAt = (x, z) => -8.65
    + Math.sin(x * 0.16 + z * 0.07 + phase) * 0.48
    + Math.sin(z * 0.31 - x * 0.045) * 0.22
    + Math.cos(x * 0.075 + z * 0.19) * 0.16;

  return (x, y, z) => {
    if (![x, y, z].every(Number.isFinite)) throw new TypeError('Density coordinates must be finite.');
    const floor = sampleSeabedHeight(x, z, floorAt);
    let density = y - floor;

    for (const rock of ROCKS) {
      const d = ellipsoidDistance(x, y, z, rock, floor);
      density = Math.min(density, d);
    }

    density = Math.min(density, extrudedArchDistance(x, y, z, {
      x: -7.5, z: 1.5, baseY: -8.45, radius: 3.45, tube: 0.82, depth: 4.8
    }));

    for (const cave of CAVES) {
      density = Math.max(density, -capsuleDistance(x, y, z, cave));
    }
    return density;
  };
}

export function sampleDensityGradient(sample, x, y, z, step = 0.2) {
  if (typeof sample !== 'function' || !(step > 0) || !Number.isFinite(step)) {
    throw new TypeError('A density sampler and positive gradient step are required.');
  }
  const dx = sample(x + step, y, z) - sample(x - step, y, z);
  const dy = sample(x, y + step, z) - sample(x, y - step, z);
  const dz = sample(x, y, z + step) - sample(x, y, z - step);
  const length = Math.hypot(dx, dy, dz);
  if (length < 1e-10) return { x: 0, y: 1, z: 0 };
  return { x: dx / length, y: dy / length, z: dz / length };
}
