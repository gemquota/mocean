import { vec3, add3, scale3, cross3, normalize3 } from './math.js';

// Fixed observer, elevated above the horizontal plane and set farther back
// to retain comfortable fish framing without altering the habitat dimensions.
export const CAMERA_ELEVATION_DEGREES = 22;
export const CAMERA_DISTANCE = 13;

export function createFixedCamera() {
  const elevation = CAMERA_ELEVATION_DEGREES * Math.PI / 180;
  const target = vec3(0, 0, 0);
  const position = vec3(0, Math.sin(elevation) * CAMERA_DISTANCE, Math.cos(elevation) * CAMERA_DISTANCE);
  const forward = normalize3(add3(target, scale3(position, -1)));
  const right = normalize3(cross3(forward, vec3(0, 1, 0)));
  const up = normalize3(cross3(right, forward));
  return { p: position, target, forward, right, up };
}
