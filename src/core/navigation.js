import { add3, clamp, dot3, normalize3, scale3, vec3 } from './math.js';

/** Camera ray through a CSS-pixel position using the simulation's projection. */
export function screenRay(camera, x, y, width, height) {
  const focalLength = Math.min(width, height) * 1.34;
  const horizontal = (x - width * 0.5) / focalLength;
  const vertical = (height * 0.51 - y) / focalLength;
  return normalize3(add3(
    camera.forward,
    add3(scale3(camera.right, horizontal), scale3(camera.up, vertical))
  ));
}

/** Intersect a forward camera ray with the world-horizontal floor. */
export function intersectWorldFloor(camera, ray, floorY = 0) {
  if (Math.abs(ray.y) < 1e-8) return null;
  const distance = (floorY - camera.p.y) / ray.y;
  if (distance <= 0 || !Number.isFinite(distance)) return null;
  return add3(camera.p, scale3(ray, distance));
}

/** Signed camera-forward distance of a world point from the camera. */
export function cameraDepth(camera, point) {
  return dot3(add3(point, scale3(camera.p, -1)), camera.forward);
}

/** Intersect a ray with a plane perpendicular to camera.forward at depth. */
export function pointOnCameraDepth(camera, ray, depth) {
  const forwardComponent = dot3(ray, camera.forward);
  if (forwardComponent <= 1e-8 || !Number.isFinite(depth)) return null;
  return add3(camera.p, scale3(ray, depth / forwardComponent));
}

/** Depth changes only; screen X/Y remain anchored to the original tap. */
export function depthFromDrag(startDepth, deltaY, viewportHeight) {
  const sensitivity = Math.max(0.004, startDepth * 1.08 / Math.max(1, viewportHeight));
  return clamp(startDepth - deltaY * sensitivity, 5, 21);
}

/** Endpoints of the visible depth-selection guide at the tap's screen height. */
export function depthLineEndpoints(camera, screenY, width, height, depth) {
  const leftRay = screenRay(camera, 0, screenY, width, height);
  const rightRay = screenRay(camera, width, screenY, width, height);
  return {
    left: pointOnCameraDepth(camera, leftRay, depth),
    right: pointOnCameraDepth(camera, rightRay, depth)
  };
}
