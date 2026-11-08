import { clamp, mix } from './math.js';

const zero = () => ({ yawOffset: 0, pitch: 0, roll: 0, thrust: 0, brake: 0, side: 0 });
const segment = (duration, command) => ({ duration, command: { ...zero(), ...command } });

/**
 * A time-ordered set of body-attitude and propulsion intentions.
 * It never writes position or velocity: stepDynamics remains responsible for
 * forces, inertia, drag and the resulting trajectory.
 */
const PROGRAMS = {
  'pitch-up': [segment(1.4, { pitch: 0.78 }), segment(0.9, { pitch: 0.2 })],
  'pitch-down': [segment(1.4, { pitch: -0.78 }), segment(0.9, { pitch: -0.2 })],
  'yaw-left': [segment(1.8, { yawOffset: 0.95, thrust: 0.16 }), segment(1, { yawOffset: 0.95 })],
  'yaw-right': [segment(1.8, { yawOffset: -0.95, thrust: 0.16 }), segment(1, { yawOffset: -0.95 })],
  'axial-roll': [segment(2.4, { roll: 1.45, thrust: 0.12 }), segment(0.8, { roll: 1.45 })],
  accelerate: [segment(1.8, { thrust: 0.78 })],
  coast: [segment(2.1)],
  brake: [segment(1.25, { brake: 0.92 })],

  // Phase 3: orient first, then propel along the changed body-forward axis.
  dive: [
    segment(1.25, { pitch: -0.82, thrust: 0.08 }),
    segment(1.8, { pitch: -0.58, thrust: 0.78 }),
    segment(0.7, { pitch: -0.3, brake: 0.68 }),
    segment(1.1, { pitch: 0.24, thrust: 0.12 })
  ],
  climb: [
    segment(1.25, { pitch: 0.82, thrust: 0.08 }),
    segment(1.8, { pitch: 0.58, thrust: 0.78 }),
    segment(0.7, { pitch: 0.3, brake: 0.68 }),
    segment(1.1, { pitch: -0.24, thrust: 0.12 })
  ],
  'turn-accelerate-coast-brake': [
    segment(1.45, { yawOffset: 1.35, thrust: 0.58 }),
    segment(1.25, { yawOffset: 1.35, thrust: 0.28 }),
    segment(0.75, { yawOffset: 1.35, brake: 0.72 }),
    segment(0.9, { yawOffset: 1.35 })
  ],
  'roll-turn': [
    segment(1.35, { roll: 0.62, yawOffset: 0.32, thrust: 0.28 }),
    segment(1.25, { roll: 1.15, yawOffset: 0.72, thrust: 0.22 }),
    segment(0.9, { roll: 1.35, yawOffset: 0.72, brake: 0.3 })
  ],

  // Phase 4: momentum and attitude are deliberately allowed to disagree.
  'backward-drift': [
    segment(1.1, { thrust: 0.62 }),
    segment(2.4, { yawOffset: Math.PI * 0.78, thrust: 0.12 }),
    segment(1.35, { yawOffset: Math.PI * 0.92, thrust: -0.28 }),
    segment(0.85, { yawOffset: Math.PI * 0.92, brake: 0.55 })
  ],
  'curved-reversal': [
    segment(1.2, { yawOffset: 0.6, thrust: 0.62 }),
    segment(1.6, { yawOffset: 1.55, thrust: 0.4 }),
    segment(1.8, { yawOffset: 2.55, thrust: 0.22 }),
    segment(0.9, { yawOffset: Math.PI, brake: 0.55 })
  ],
  'loop-the-loop': [
    segment(1.1, { pitch: 0.7, thrust: 0.42 }),
    segment(9.5, { pitch: Math.PI * 2, pitchMoment: 0.36, thrust: 0.68 }),
    segment(1.15, { pitch: Math.PI * 2, thrust: 0.18, brake: 0.18 })
  ],
  'dive-brake-reorient': [
    segment(1.15, { pitch: -0.82, thrust: 0.08 }),
    segment(1.55, { pitch: -0.62, thrust: 0.74 }),
    segment(0.85, { pitch: -0.5, brake: 0.88 }),
    segment(1.25, { yawOffset: Math.PI * 0.72, pitch: 0.16, thrust: 0.08 }),
    segment(1.1, { yawOffset: Math.PI * 0.72, pitch: 0.08, thrust: 0.28 })
  ],
  'compound-3d': [
    segment(1.1, { yawOffset: 0.55, pitch: 0.52, roll: 0.72, thrust: 0.35 }),
    segment(1.8, { yawOffset: 1.35, pitch: 1.15, roll: 1.1, thrust: 0.62 }),
    segment(1.25, { yawOffset: 2.1, pitch: 0.45, roll: 1.55, thrust: 0.3 }),
    segment(0.85, { yawOffset: 2.1, pitch: 0.08, roll: 1.8, brake: 0.42 })
  ]
};

export const MOTION_SEQUENCE_NAMES = Object.freeze(Object.keys(PROGRAMS));

export function createMotionSequence(name, attitude = {}) {
  const source = PROGRAMS[name];
  if (!source) throw new RangeError(`Unknown motion sequence: ${name}`);
  const segments = source.map(item => ({ duration: item.duration, command: { ...item.command } }));
  return {
    name,
    startYaw: Number.isFinite(attitude.yaw) ? attitude.yaw : 0,
    startPitch: Number.isFinite(attitude.pitch) ? attitude.pitch : 0,
    startRoll: Number.isFinite(attitude.roll) ? attitude.roll : 0,
    segments,
    duration: segments.reduce((sum, item) => sum + item.duration, 0)
  };
}

const smoothstep = t => t * t * (3 - 2 * t);
const interpolateCommand = (a, b, t) => Object.fromEntries(
  Object.keys(zero()).map(key => [key, mix(a[key] ?? 0, b[key] ?? 0, t)])
);

/** Sample a sequence with eased segment hand-offs; outputs intentions, not a rail. */
export function sampleMotionSequence(sequence, elapsed) {
  const time = clamp(elapsed, 0, sequence.duration);
  let start = 0;
  let previous = zero();
  for (let i = 0; i < sequence.segments.length; i++) {
    const item = sequence.segments[i];
    const end = start + item.duration;
    if (time <= end || i === sequence.segments.length - 1) {
      const local = clamp((time - start) / item.duration, 0, 1);
      const blend = smoothstep(clamp(local / 0.22, 0, 1));
      return {
        command: interpolateCommand(previous, item.command, blend),
        progress: sequence.duration ? time / sequence.duration : 1,
        segmentIndex: i,
        segmentProgress: local,
        complete: time >= sequence.duration
      };
    }
    previous = item.command;
    start = end;
  }
  return { command: zero(), progress: 1, segmentIndex: sequence.segments.length - 1, segmentProgress: 1, complete: true };
}
