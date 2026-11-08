import { clamp, angleDelta } from './math.js';

const bezier = (a, b, c, d, t) => {
  const u = 1 - t;
  return u*u*u*a + 3*u*u*t*b + 3*u*t*t*c + t*t*t*d;
};

/**
 * Smooth attitude-and-effort intent. The fish still turns and accelerates
 * through physical dynamics; this supplies continuously varying targets.
 */
export function createManeuver({ startYaw, startPitch, endYaw, endPitch, duration, curve = 0, speedPeak = 1.18 }) {
  const yawDelta = angleDelta(startYaw, endYaw);
  const pitchDelta = endPitch - startPitch;
  const bend = clamp(curve, -1, 1);
  return {
    duration: Math.max(0.1, duration),
    yaw: [startYaw, startYaw + yawDelta * 0.28 + bend * 0.32, startYaw + yawDelta * 0.72 + bend * 0.32, startYaw + yawDelta],
    pitch: [startPitch, startPitch + pitchDelta * 0.28 + bend * 0.12, startPitch + pitchDelta * 0.72 - bend * 0.12, endPitch],
    speed: [0.88, speedPeak * 1.12, speedPeak * 1.12, 0.82]
  };
}

export function sampleManeuver(maneuver, elapsed) {
  const t = clamp(elapsed / maneuver.duration, 0, 1);
  return {
    progress: t,
    yaw: bezier(...maneuver.yaw, t),
    pitch: bezier(...maneuver.pitch, t),
    speed: bezier(...maneuver.speed, t),
    complete: t >= 1
  };
}
