/**
 * Signed-distance queries for the Phase 6 spatial seabed prototype.
 *
 * The query treats the seabed, ellipsoidal boulders and hollow arch ribs as
 * a union of solids. Positive distance is open water; negative distance is
 * inside terrain. This is a renderer-independent geometry query and is not
 * yet wired into creature movement or benthic collision response.
 */

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function ellipsoidDistance(x, y, z, rx, ry, rz) {
  const k0 = Math.hypot(x / rx, y / ry, z / rz);
  if (k0 < 1e-10) return -Math.min(rx, ry, rz);
  const k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz));
  return k0 * (k0 - 1) / k1;
}

function archRibDistance(x, y, z, arch) {
  const cosine = Math.cos(arch.rotation || 0);
  const sine = Math.sin(arch.rotation || 0);
  const dx = x - arch.x;
  const dz = z - arch.z;
  const localX = cosine * dx - sine * dz;
  const localZ = sine * dx + cosine * dz;
  const centerY = arch.floor + arch.tube;
  const localY = y - centerY;

  // Closest point on the upper half of a circular arch in its local XY plane.
  const angle = clamp(Math.atan2(localY, localX), 0, Math.PI);
  const ringDistance = Math.hypot(
    localX - arch.radius * Math.cos(angle),
    localY - arch.radius * Math.sin(angle)
  ) - arch.tube;

  // Extrude the arch rib by its finite depth, leaving the passage open.
  const depthDistance = Math.abs(localZ) - arch.depth * 0.5;
  const outside = Math.hypot(Math.max(ringDistance, 0), Math.max(depthDistance, 0));
  return outside + Math.min(Math.max(ringDistance, depthDistance), 0);
}

function evaluateDistance(x, y, z, features, floorAt) {
  const floor = floorAt(x, z);
  if (!Number.isFinite(floor)) throw new TypeError('floorAt must return a finite height.');

  let best = { distance: y - floor, featureId: null, featureType: 'seabed' };

  for (const rock of features.rocks || []) {
    if (!(rock.radius > 0 && rock.height > 0 && rock.depth > 0)) continue;
    const distance = ellipsoidDistance(
      x - rock.x,
      y - rock.y,
      z - rock.z,
      rock.radius,
      rock.height,
      rock.depth
    );
    if (distance < best.distance) {
      best = { distance, featureId: rock.id ?? null, featureType: 'rock' };
    }
  }

  for (const arch of features.arches || []) {
    if (!(arch.radius > 0 && arch.tube > 0 && arch.depth > 0)) continue;
    const distance = archRibDistance(x, y, z, arch);
    if (distance < best.distance) {
      best = { distance, featureId: arch.id ?? null, featureType: 'arch' };
    }
  }

  return best;
}

/**
 * Sample signed distance and outward surface normal at a world-space point.
 *
 * @param {{x:number,y:number,z:number}} point World-space coordinates.
 * @param {object} options Terrain features, floor function and normal step.
 * @returns {{distance:number, normal:{x:number,y:number,z:number}, featureId:string|null, featureType:string}}
 */
export function sampleSpatialTerrain(
  point,
  { features = {}, floorAt = () => -8.65, normalStep = 0.025 } = {}
) {
  if (![point?.x, point?.y, point?.z].every(Number.isFinite)) {
    throw new TypeError('Terrain sample point must contain finite x, y and z coordinates.');
  }
  if (typeof floorAt !== 'function') throw new TypeError('floorAt must be a function.');
  if (!(normalStep > 0) || !Number.isFinite(normalStep)) {
    throw new RangeError('normalStep must be a positive finite number.');
  }

  const { x, y, z } = point;
  const result = evaluateDistance(x, y, z, features, floorAt);
  const h = normalStep;
  const dx = evaluateDistance(x + h, y, z, features, floorAt).distance
    - evaluateDistance(x - h, y, z, features, floorAt).distance;
  const dy = evaluateDistance(x, y + h, z, features, floorAt).distance
    - evaluateDistance(x, y - h, z, features, floorAt).distance;
  const dz = evaluateDistance(x, y, z + h, features, floorAt).distance
    - evaluateDistance(x, y, z - h, features, floorAt).distance;
  const magnitude = Math.hypot(dx, dy, dz) || 1;

  return Object.freeze({
    distance: result.distance,
    normal: Object.freeze({ x: dx / magnitude, y: dy / magnitude, z: dz / magnitude }),
    featureId: result.featureId,
    featureType: result.featureType
  });
}

/** True when a sphere centred at point has the requested terrain clearance. */
export function hasTerrainClearance(point, clearance, options = {}) {
  if (!(clearance >= 0) || !Number.isFinite(clearance)) {
    throw new RangeError('clearance must be a non-negative finite number.');
  }
  return sampleSpatialTerrain(point, options).distance >= clearance;
}
