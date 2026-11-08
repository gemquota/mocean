import { clamp, add3, scale3, length3, angleDelta } from './math.js';

/**
 * Distance-shaped speed control for target pursuit. Far targets invite a faster
 * approach; desired speed falls with remaining distance so braking starts before
 * the fish reaches the target. Propulsion and drag still act through the normal
 * gait and rigid-body pathways.
 */
export function createPursuitGuidance(position, velocity, yaw, pitch, target, aimPoint = target) {
  const toAim = add3(aimPoint, scale3(position, -1));
  const fallback = add3(target, scale3(position, -1));
  const aimLength = length3(toAim);
  const direction = aimLength > 1e-8 ? scale3(toAim, 1 / aimLength)
    : scale3(fallback, 1 / (length3(fallback) || 1));
  const targetYaw = Math.atan2(-direction.z, direction.x);
  const targetPitch = Math.atan2(direction.y, Math.hypot(direction.x, direction.z));
  const distance = length3(fallback);
  const speed = length3(velocity);

  // A square-root speed envelope gives distant targets a clear speed advantage
  // without demanding an unbounded sprint as distance grows.
  const desiredSpeed = Math.min(2.65, Math.sqrt(distance) * 0.85);
  const distanceGate = clamp(distance / 0.38, 0, 1);
  const thrustScale = clamp(0.55 + (desiredSpeed - speed) * 1.25, 0, 3.2) * distanceGate;

  // Brake when actual speed exceeds the distance-appropriate approach speed.
  // This makes stopping distance respond to momentum rather than a fixed radius.
  const brake = clamp((speed - desiredSpeed - 0.15) / 0.85, 0, 1);
  const hovering = distance < 0.42 && speed < 0.2;
  return {
    distance,
    speed,
    desiredSpeed,
    targetYaw,
    targetPitch,
    turn: clamp(angleDelta(yaw, targetYaw) * 2.15, -1, 1),
    pitch: clamp((targetPitch - pitch) * 2.25, -0.9, 0.9),
    thrustScale,
    brake: hovering ? clamp(speed / 0.12, 0, 1) : brake,
    hovering
  };
}
