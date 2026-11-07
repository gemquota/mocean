import { clamp, mix } from './math.js';

export function createGait() {
  return {
    phase: 0, amplitude: 0.22, frequency: 1.25, steering: 0,
    energy: 1, tailVelocity: 0, leftFin: 0.18, rightFin: 0.18,
    tailLoad: 0, rollMoment: 0
  };
}

/** Coordinated body-and-fin gait. Steering is expressed as fin asymmetry and a biased tail wave. */
export function stepGait(gait, behaviour, speed, turnIntent, dt) {
  const profiles = {
    CRUISE: [0.19, 1.25], EXPLORE: [0.25, 1.48],
    TURN: [0.31, 1.62], DART: [0.39, 2.35],
    GLIDE: [0.035, 0.42], RECOVER: [0.105, 0.82]
  };
  const [baseAmplitude, baseFrequency] = profiles[behaviour] ?? profiles.CRUISE;
  const burstCost = behaviour === 'DART' ? 0.22 * dt : 0;
  gait.energy = clamp(gait.energy - burstCost + (behaviour === 'RECOVER' ? 0.12 : 0.032) * dt, 0.12, 1);

  // A little more body wave is needed to maintain speed against drag, but effort is bounded.
  const speedCompensation = clamp(speed / 2.8, 0, 0.18);
  const reserve = 0.48 + gait.energy * 0.52;
  const targetAmplitude = (baseAmplitude + speedCompensation) * reserve;
  const targetFrequency = baseFrequency * (0.76 + gait.energy * 0.24);
  gait.amplitude = mix(gait.amplitude, targetAmplitude, 1 - Math.exp(-dt * 2.6));
  gait.frequency = mix(gait.frequency, targetFrequency, 1 - Math.exp(-dt * 2.0));
  gait.steering = mix(gait.steering, clamp(turnIntent, -1, 1), 1 - Math.exp(-dt * 3.2));
  gait.phase += dt * gait.frequency * Math.PI * 2;

  const tailLateralSpeed = gait.amplitude * gait.frequency * Math.PI * 2;
  gait.tailVelocity = tailLateralSpeed;
  gait.tailLoad = clamp(tailLateralSpeed / 4.5, 0, 1);
  const thrust = clamp(0.26 * tailLateralSpeed * tailLateralSpeed, 0, behaviour === 'DART' ? 1.9 : 1.05);

  // Outside pectoral fin opens to brake and pivot; the inside fin stays tucked.
  const turn = gait.steering;
  const targetLeft = clamp(0.18 + Math.max(0, turn) * 0.62 + (behaviour === 'GLIDE' ? 0.22 : 0), 0.08, 0.88);
  const targetRight = clamp(0.18 + Math.max(0, -turn) * 0.62 + (behaviour === 'GLIDE' ? 0.22 : 0), 0.08, 0.88);
  gait.leftFin = mix(gait.leftFin, targetLeft, 1 - Math.exp(-dt * 4.5));
  gait.rightFin = mix(gait.rightFin, targetRight, 1 - Math.exp(-dt * 4.5));
  gait.rollMoment = (gait.leftFin - gait.rightFin) * clamp(speed * 0.22, 0, 0.5);

  return {
    thrust,
    steering: gait.steering,
    yawMoment: gait.steering * (0.12 + gait.tailLoad * 0.22),
    finDrag: (gait.leftFin + gait.rightFin) * clamp(speed * 0.025, 0, 0.08),
    rollMoment: gait.rollMoment
  };
}

/**
 * Continuous centreline bend with a local moving frame. The cross-section is
 * reoriented along the spine tangent, preventing the body from shearing sideways.
 */
export function deformPoint(point, gait) {
  const u = clamp((0.98 - point.x) / 2.18, 0, 1.35);
  const envelope = u * u;
  const phase = gait.phase - u * 3.0;
  const amplitude = gait.amplitude ?? 0.2;
  const steering = gait.steering ?? 0;
  const wave = amplitude * envelope * Math.sin(phase);
  const curve = steering * 0.19 * envelope;
  const centre = wave + curve;

  const duDx = -1 / 2.18;
  const dCentreDu = amplitude * (2 * u * Math.sin(phase) - 3 * envelope * Math.cos(phase)) + steering * 0.38 * u;
  const slope = dCentreDu * duDx;
  const tangentScale = 1 / Math.sqrt(1 + slope * slope);

  // Offset each cross-section along the spine normal, not the world lateral axis.
  return {
    x: point.x - point.z * slope * tangentScale,
    y: point.y,
    z: centre + point.z * tangentScale
  };
}
