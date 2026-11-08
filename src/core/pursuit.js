import { clamp, add3, scale3, length3, angleDelta } from './math.js';

/**
 * Closed-loop target pursuit using nose attitude and existing tail propulsion.
 * Target distance raises thrust demand smoothly; near-target speed is dissipated
 * through fin deployment and hydrodynamic drag rather than reverse thrust.
 */
export function createPursuitGuidance(position, velocity, yaw, pitch, target, aimPoint = target) {
  const toAim = add3(aimPoint, scale3(position, -1));
  const direction = length3(toAim) > 1e-8 ? scale3(toAim, 1 / length3(toAim))
    : scale3(add3(target, scale3(position, -1)), 1 / (length3(add3(target, scale3(position, -1))) || 1));
  const targetYaw = Math.atan2(-direction.z, direction.x);
  const targetPitch = Math.atan2(direction.y, Math.hypot(direction.x, direction.z));
  const distance = length3(add3(target, scale3(position, -1)));
  const speed = length3(velocity);
  const arrival = clamp((1.2 - distance) / 1.2, 0, 1);
  const brake = arrival * clamp(speed / 0.72, 0, 1);
  const hovering = distance < 0.42 && speed < 0.2;
  return {
    distance,
    speed,
    targetYaw,
    targetPitch,
    turn: clamp(angleDelta(yaw, targetYaw) * 2.15, -1, 1),
    pitch: clamp((targetPitch - pitch) * 2.25, -0.9, 0.9),
    thrustScale: clamp(0.78 + distance * 0.115, 0.78, 1.85),
    brake: hovering ? clamp(speed / 0.12, 0, 1) : brake,
    hovering
  };
}
