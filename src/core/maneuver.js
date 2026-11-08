import { clamp, add3, scale3, cross3, normalize3, length3 } from './math.js';

const choose = (n, k) => {
  let value = 1;
  for (let i = 1; i <= k; i++) value = value * (n - i + 1) / i;
  return value;
};

const bezierVector = (points, t) => {
  const n = points.length - 1;
  return points.reduce((sum, point, i) => {
    const weight = choose(n, i) * (1 - t)**(n-i) * t**i;
    return add3(sum, scale3(point, weight));
  }, { x: 0, y: 0, z: 0 });
};

const bezierDerivative = (points, t) => {
  const n = points.length - 1;
  const differences = points.slice(1).map((point, i) => scale3(add3(point, scale3(points[i], -1)), n));
  return bezierVector(differences, t);
};

const bezierScalar = (points, t) => {
  const n = points.length - 1;
  return points.reduce((sum, point, i) => sum + choose(n, i) * (1-t)**(n-i) * t**i * point, 0);
};

/**
 * A spatial quintic Bezier path used as steering intent, not a kinematic rail.
 * Endpoint tangents align with the fish's current and intended headings.
 */
export function createManeuver({ start, startDirection, endDirection, distance, duration, curve = 0, speedPeak = 1.18 }) {
  const forward = normalize3(startDirection);
  const finish = normalize3(endDirection);
  let side = normalize3(cross3({ x: 0, y: 1, z: 0 }, forward));
  if (length3(side) < 1e-6) side = normalize3(cross3({ x: 0, y: 0, z: 1 }, forward));
  const bend = clamp(curve, -1, 1) * distance * 0.18;
  const end = add3(add3(start, scale3(forward, distance * 0.55)), scale3(finish, distance * 0.45));
  const points = [
    start,
    add3(start, scale3(forward, distance * 0.2)),
    add3(add3(start, scale3(forward, distance * 0.4)), scale3(side, bend)),
    add3(add3(end, scale3(finish, -distance * 0.4)), scale3(side, bend)),
    add3(end, scale3(finish, -distance * 0.2)),
    end
  ];
  return {
    duration: Math.max(0.1, duration),
    points,
    speed: [1, 1, speedPeak * 1.12, speedPeak * 1.12, 1, 1]
  };
}

export function sampleManeuver(maneuver, elapsed) {
  const t = clamp(elapsed / maneuver.duration, 0, 1);
  return {
    progress: t,
    position: bezierVector(maneuver.points, t),
    tangent: normalize3(bezierDerivative(maneuver.points, t)),
    speed: bezierScalar(maneuver.speed, t),
    complete: t >= 1
  };
}
