export const TAU = Math.PI * 2;
export const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const vec3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
export const add3 = (a, b) => vec3(a.x + b.x, a.y + b.y, a.z + b.z);
export const scale3 = (a, s) => vec3(a.x * s, a.y * s, a.z * s);
export const dot3 = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross3 = (a, b) => vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const length3 = a => Math.hypot(a.x, a.y, a.z);
export const normalize3 = a => scale3(a, 1 / (length3(a) || 1));
export const wrapAngle = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
export const angleDelta = (from, to) => wrapAngle(to - from);

export const quatMultiply = (a, b) => ({
  w: a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z,
  x: a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,
  y: a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,
  z: a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w
});
export function quatFromEuler(yaw, pitch, roll) {
  // World convention: Y is up, X is forward, Z is lateral.
  const cy=Math.cos(yaw/2), sy=Math.sin(yaw/2);
  const cp=Math.cos(pitch/2), sp=Math.sin(pitch/2);
  const cr=Math.cos(roll/2), sr=Math.sin(roll/2);
  const qYaw={w:cy,x:0,y:sy,z:0};
  const qPitch={w:cp,x:0,y:0,z:sp};
  const qRoll={w:cr,x:sr,y:0,z:0};
  return quatNormalize(quatMultiply(quatMultiply(qYaw,qPitch),qRoll));
}
export function quatNormalize(q) {
  const n = Math.hypot(q.w, q.x, q.y, q.z) || 1;
  return { w: q.w / n, x: q.x / n, y: q.y / n, z: q.z / n };
}
export function quatRotate(q, p) {
  const u = vec3(q.x, q.y, q.z), s = q.w;
  return add3(add3(scale3(u, 2 * dot3(u, p)), scale3(p, s * s - dot3(u, u))), scale3(cross3(u, p), 2 * s));
}


/** Integrate a body-local angular velocity (radians/second) into body-to-world attitude. */
export function quatIntegrateAngularVelocity(q, omegaLocal, dt) {
  const speed = length3(omegaLocal);
  if (speed < 1e-10 || dt === 0) return quatNormalize(q);
  const halfAngle = speed * dt * 0.5;
  const s = Math.sin(halfAngle) / speed;
  const delta = { w: Math.cos(halfAngle), x: omegaLocal.x * s, y: omegaLocal.y * s, z: omegaLocal.z * s };
  return quatNormalize(quatMultiply(q, delta));
}

/** Perspective focal scale with a near-plane guard. */
export function perspectiveScale(focalLength, cameraDepth) {
  return focalLength / Math.max(0.3, cameraDepth);
}

/** Subtle distance treatment, activated only below the quarter-size threshold. */
export function distanceTreatment(apparentSizeRatio, threshold = 0.25) {
  const amount = clamp((threshold - apparentSizeRatio) / threshold, 0, 1);
  return { blur: amount * 1.8, opacity: 1 - amount * 0.22 };
}

/**
 * Smooth world-space return guidance for a fixed habitat volume.
 * Body-forward is +X at identity; positive pitch points nose-up.
 */
export function habitatReturnGuidance(position, radii, softStart = 0.88) {
  const nx = position.x / radii.x, ny = position.y / radii.y, nz = position.z / radii.z;
  const radius = Math.hypot(nx, ny, nz);
  const weight = clamp((radius - softStart) / (1.12 - softStart), 0, 1);
  const toCentre = vec3(-position.x, -position.y, -position.z);
  return {
    weight,
    yaw: Math.atan2(-toCentre.z, toCentre.x),
    pitch: Math.atan2(toCentre.y, Math.hypot(toCentre.x, toCentre.z)),
    thrust: weight * 0.24
  };
}
