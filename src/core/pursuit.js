import { clamp, add3, scale3, length3, angleDelta } from './math.js';

export const MAX_PURSUIT_SPEED = 4.8;
const PURSUIT_THRUST_CAP = 1.55;

/**
 * Distance-shaped speed controller. Desired speed rises with range, while a
 * feed-forward estimate offsets quadratic drag and proportional speed error
 * raises acceleration demand. The fish still accelerates through tail thrust.
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
  const desiredSpeed = Math.min(MAX_PURSUIT_SPEED, Math.sqrt(distance) * 1.55);
  const dragAtDesiredSpeed = (0.11 + desiredSpeed * 0.19) * desiredSpeed;
  const feedForward = dragAtDesiredSpeed / PURSUIT_THRUST_CAP;
  const speedError = desiredSpeed - speed;
  const distanceGate = clamp(distance / 0.5, 0, 1);
  const thrustScale = clamp(feedForward + speedError * 1.45, 0, 5.5) * distanceGate;
  const brake = clamp((speed - desiredSpeed - 0.12) / 0.7, 0, 1);
  const hovering = distance < 0.42 && speed < 0.2;
  return {
    distance,
    speed,
    desiredSpeed,
    maxSpeed: MAX_PURSUIT_SPEED,
    targetYaw,
    targetPitch,
    turn: clamp(angleDelta(yaw, targetYaw) * 2.15, -1, 1),
    pitch: clamp((targetPitch - pitch) * 2.25, -0.9, 0.9),
    thrustScale,
    brake: hovering ? clamp(speed / 0.12, 0, 1) : brake,
    hovering
  };
}
