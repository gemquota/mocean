import { clamp, mix } from './math.js';

const NODE_COUNT = 19;
const BODY_LENGTH = 2.65;
const MUSCLE_STIFFNESS = 76;
const AXIAL_COUPLING = 27;
const WATER_DAMPING = 8.5;

export function createGait() {
  return {
    phase: 0, frequency: 1.15, amplitude: 0.2, steering: 0,
    energy: 1, tailVelocity: 0, tailAcceleration: 0,
    leftFin: 0.16, rightFin: 0.16, leftFinAngle: 0, rightFinAngle: 0,
    tailLoad: 0, rollMoment: 0, brake: 0,
    spine: Array.from({ length: NODE_COUNT }, () => ({ y: 0, v: 0, target: 0 }))
  };
}

function muscleWave(u, gait, turn) {
  const envelope = Math.pow(u, 1.65);
  const wave = Math.sin(gait.phase - u * 3.55);
  // Axial muscle recruitment grows toward the tail; turning adds a persistent bend.
  return gait.amplitude * envelope * wave + turn * 0.72 * envelope * envelope;
}

function interpolateSpine(spine, u) {
  const p = clamp(u, 0, 1) * (spine.length - 1);
  const i = Math.min(spine.length - 2, Math.floor(p));
  const f = p - i;
  const a = spine[i], b = spine[i + 1];
  return {
    y: mix(a.y, b.y, f),
    slope: (b.y - a.y) * (spine.length - 1) / BODY_LENGTH,
    velocity: mix(a.v, b.v, f)
  };
}

/**
 * Distributed active-beam swimmer. Muscle recruitment drives a travelling
 * curvature wave; elastic coupling and water damping determine the actual pose.
 * Tail reaction is estimated from lateral tail momentum rather than a free thrust knob.
 */
export function stepGait(gait, behaviour, speed, turnIntent, dt, brakeIntent = 0) {
  const profiles = {
    CRUISE: [0.16, 1.12], EXPLORE: [0.205, 1.34],
    TURN: [0.255, 1.48], DART: [0.31, 2.05],
    PURSUIT: [0.30, 2.15],
    GLIDE: [0.018, 0.32], RECOVER: [0.085, 0.72]
  };
  const [baseAmplitude, baseFrequency] = profiles[behaviour] ?? profiles.CRUISE;
  const cost = behaviour === 'DART' ? 0.19 * dt : behaviour === 'TURN' ? 0.035 * dt : 0;
  gait.energy = clamp(gait.energy - cost + (behaviour === 'RECOVER' ? 0.105 : 0.025) * dt, 0.1, 1);
  const reserve = 0.52 + gait.energy * 0.48;
  const speedGain = clamp(speed / 4.8, 0, 0.16);
  gait.amplitude = mix(gait.amplitude, (baseAmplitude + speedGain) * reserve, 1 - Math.exp(-dt * 2.2));
  gait.frequency = mix(gait.frequency, baseFrequency * (0.82 + gait.energy * 0.18), 1 - Math.exp(-dt * 1.8));
  gait.steering = mix(gait.steering, clamp(turnIntent, -1, 1), 1 - Math.exp(-dt * 4.6));
  gait.phase += dt * gait.frequency * Math.PI * 2;

  const previousTailVelocity = gait.tailVelocity;
  for (let i = 0; i < NODE_COUNT; i++) {
    const u = i / (NODE_COUNT - 1);
    const node = gait.spine[i];
    node.target = muscleWave(u, gait, gait.steering);
  }

  // Semi-implicit integration of a damped, coupled elastic spine.
  const accelerations = gait.spine.map((node, i) => {
    if (i < 2) return -node.v * 18;
    const previous = gait.spine[i - 1].y;
    const next = gait.spine[Math.min(NODE_COUNT - 1, i + 1)].y;
    const curvature = previous - 2 * node.y + next;
    const coupling = AXIAL_COUPLING * curvature * (NODE_COUNT - 1) ** 2 / 100;
    const muscle = MUSCLE_STIFFNESS * (node.target - node.y);
    const water = -WATER_DAMPING * (1 + speed * 0.12) * node.v;
    return coupling + muscle + water;
  });
  for (let i = 0; i < NODE_COUNT; i++) {
    const node = gait.spine[i];
    node.v += accelerations[i] * dt;
    node.y += node.v * dt;
    node.y = clamp(node.y, -0.62, 0.62);
    if (i < 2) { node.y = 0; node.v = 0; }
  }

  const tail = gait.spine[NODE_COUNT - 1];
  gait.tailVelocity = tail.v;
  gait.tailAcceleration = (tail.v - previousTailVelocity) / Math.max(dt, 1e-5);
  gait.tailLoad = clamp(Math.abs(tail.v) * 0.42 + Math.abs(gait.tailAcceleration) * 0.025, 0, 1);

  // Approximate reactive thrust from lateral tail motion and caudal-fin area.
  // A slip correction reduces thrust as forward speed approaches the stroke's useful limit.
  const slip = clamp(speed / (0.55 + Math.abs(tail.v) * 2.8), 0, 0.82);
  const caudalArea = 0.34;
  const thrustCap = behaviour === 'PURSUIT' ? 1.55 : behaviour === 'DART' ? 1.15 : 0.72;
  const thrust = clamp(caudalArea * 1.9 * tail.v * tail.v * (1 - slip), 0, thrustCap);

  const turn = gait.steering;
  gait.brake = mix(gait.brake, clamp(brakeIntent, 0, 1), 1 - Math.exp(-dt * 5.5));
  const glide = behaviour === 'GLIDE' ? 0.24 : 0;
  const brakingSpread = gait.brake * 0.58;
  const leftTarget = clamp(0.12 + Math.max(0, turn) * 0.72 + glide + brakingSpread, 0.08, 0.9);
  const rightTarget = clamp(0.12 + Math.max(0, -turn) * 0.72 + glide + brakingSpread, 0.08, 0.9);
  gait.leftFin = mix(gait.leftFin, leftTarget, 1 - Math.exp(-dt * 5.2));
  gait.rightFin = mix(gait.rightFin, rightTarget, 1 - Math.exp(-dt * 5.2));
  const finStroke = Math.sin(gait.phase * 0.5 + 0.4) * (0.2 + speed * 0.05);
  gait.leftFinAngle = mix(gait.leftFinAngle, finStroke + turn * 0.16, 1 - Math.exp(-dt * 5));
  gait.rightFinAngle = mix(gait.rightFinAngle, -finStroke - turn * 0.16, 1 - Math.exp(-dt * 5));

  const differentialDrag = gait.leftFin - gait.rightFin;
  gait.rollMoment = differentialDrag * clamp(speed * 0.18, 0, 0.42);
  const finDrag = (gait.leftFin + gait.rightFin) * (0.035 + speed * 0.018);
  return {
    thrust,
    steering: turn,
    yawMoment: turn * (0.08 + gait.tailLoad * 0.12) + differentialDrag * speed * 0.055,
    finDrag,
    brake: gait.brake,
    rollMoment: gait.rollMoment,
    tailVelocity: tail.v,
    slip
  };
}

/** Rotate a pectoral-fin point around its body-local longitudinal hinge. */
export function articulateFinPoint(point, root, angle) {
  const dy = point.y - root.y;
  const dz = point.z - root.z;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: point.x,
    y: root.y + dy * c - dz * s,
    z: root.z + dy * s + dz * c
  };
}

/** Reconstruct the local body frame from the integrated spine centreline. */
export function deformPoint(point, gait) {
  const u = clamp((0.98 - point.x) / BODY_LENGTH, 0, 1);
  const spine = interpolateSpine(gait.spine, u);
  const tangentLength = Math.sqrt(1 + spine.slope * spine.slope);
  const normalX = -spine.slope / tangentLength;
  const normalZ = 1 / tangentLength;
  // Cross-sections follow the spine normal. Small longitudinal correction preserves
  // the local section shape during bends rather than shearing the body mesh.
  return {
    x: point.x + point.z * normalX,
    y: point.y,
    z: spine.y + point.z * normalZ
  };
}
