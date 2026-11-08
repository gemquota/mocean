import { add3, dot3, scale3, vec3, normalize3 } from './math.js';

export const TARGET_PLANE_Z = 0;
export const WORLD_FLOOR_Y = -3.1;

export function screenRay(camera, x, y, width, height) {
  const focalLength = Math.min(width, height) * 1.34;
  return normalize3(add3(camera.forward, add3(
    scale3(camera.right, (x - width * 0.5) / focalLength),
    scale3(camera.up, (height * 0.51 - y) / focalLength)
  )));
}
export function intersectXYPlane(camera, ray, planeZ) {
  if (Math.abs(ray.z) < 1e-8) return null;
  const distance = (planeZ - camera.p.z) / ray.z;
  if (distance <= 0 || !Number.isFinite(distance)) return null;
  return add3(camera.p, scale3(ray, distance));
}
export function projectToWorldFloor(point, floorY = WORLD_FLOOR_Y) {
  return vec3(point.x, floorY, point.z);
}
export function projectedScreenY(camera, point, height, width) {
  const relative = add3(point, scale3(camera.p, -1));
  const depth = dot3(relative, camera.forward);
  if (depth <= 1e-8) return null;
  return height * 0.51 - dot3(relative, camera.up) * Math.min(width, height) * 1.34 / depth;
}
/** Solve world Z for a fixed-X/Y point whose projection reaches screenY. */
export function worldZAtScreenY(camera, point, screenY, width, height) {
  const dx = point.x - camera.p.x, dy = point.y - camera.p.y;
  const q = (height * 0.51 - screenY) / (Math.min(width, height) * 1.34);
  const numerator = (camera.up.x - q * camera.forward.x) * dx
    + (camera.up.y - q * camera.forward.y) * dy;
  const denominator = q * camera.forward.z - camera.up.z;
  if (Math.abs(denominator) < 1e-8) return null;
  const z = camera.p.z + numerator / denominator;
  return Number.isFinite(z) ? z : null;
}

/**
 * Use the largest signed displacement of either captured finger. This preserves
 * full depth-control travel when one finger moves and the other acts as an anchor.
 */
export function dominantPointerDelta(currentPointers, startPointerY) {
  let largest = 0;
  for (const [id, point] of currentPointers) {
    const start = startPointerY.get(id);
    if (!Number.isFinite(start)) continue;
    const delta = point.y - start;
    if (Math.abs(delta) > Math.abs(largest)) largest = delta;
  }
  return largest;
}
