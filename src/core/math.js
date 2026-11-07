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

export function quatFromEuler(yaw, pitch, roll) {
  const cy = Math.cos(yaw / 2), sy = Math.sin(yaw / 2);
  const cp = Math.cos(pitch / 2), sp = Math.sin(pitch / 2);
  const cr = Math.cos(roll / 2), sr = Math.sin(roll / 2);
  return {
    w: cr * cp * cy + sr * sp * sy,
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy
  };
}
export function quatNormalize(q) {
  const n = Math.hypot(q.w, q.x, q.y, q.z) || 1;
  return { w: q.w / n, x: q.x / n, y: q.y / n, z: q.z / n };
}
export function quatRotate(q, p) {
  const u = vec3(q.x, q.y, q.z), s = q.w;
  return add3(add3(scale3(u, 2 * dot3(u, p)), scale3(p, s * s - dot3(u, u))), scale3(cross3(u, p), 2 * s));
}
