import { clamp, add3, scale3, cross3, normalize3, length3 } from './math.js';

const bezier3 = (a, b, c, d, t) => {
  const u = 1 - t;
  return add3(
    add3(scale3(a, u*u*u), scale3(b, 3*u*u*t)),
    add3(scale3(c, 3*u*t*t), scale3(d, t*t*t))
  );
};

const bezier5 = (points, t) => {
  const u = 1 - t;
  const weights = [u**5, 5*u**4*t, 10*u**3*t*t, 10*u*t**3, 5*u*t**4, t**5];
  return points.reduce((sum, point, i) => sum + point * weights[i], 0);
};

/**
 * A spatial cubic Bezier path used as steering intent, not a kinematic rail.
 * The fish must follow it through its own thrust, drag, inertia and attitude response.
 */
export function createManeuver({ start, startDirection, endDirection, distance, duration, curve = 0, speedPeak = 1.18 }) {
  const forward = normalize3(startDirection);
  const finish = normalize3(endDirection);
  let side = normalize3(cross3({ x: 0, y: 1, z: 0 }, forward));
  if (length3(side) < 1e-6) side = normalize3(cross3({ x: 0, y: 0, z: 1 }, forward));
  const bend = clamp(curve, -1, 1) * distance * 0.16;
  const end = add3(add3(start, scale3(forward, distance * 0.55)), scale3(finish, distance * 0.45));
  const control1 = add3(add3(start, scale3(forward, distance / 3)), scale3(side, bend));
  const control2 = add3(add3(end, scale3(finish, -distance / 3)), scale3(side, bend));
  return {
    duration: Math.max(0.1, duration),
    points: [start, control1, control2, end],
    finish,
    speed: [1, speedPeak * 1.12, speedPeak * 1.12, 1]
  };
}

export function sampleManeuver(maneuver, elapsed) {
  const t = clamp(elapsed / maneuver.duration, 0, 1);
  const position = bezier3(...maneuver.points, t);
  const u = 1 - t;
  const [p0, p1, p2, p3] = maneuver.points;
  const tangent = normalize3(add3(
    add3(scale3(add3(p1, scale3(p0, -1)), 3*u*u), scale3(add3(p2, scale3(p1, -1)), 6*u*t)),
    scale3(add3(p3, scale3(p2, -1)), 3*t*t)
  ));
  return {
    progress: t,
    position,
    tangent,
    speed: bezier5([1, maneuver.speed[1], maneuver.speed[1], maneuver.speed[2], maneuver.speed[2], 1], t),
    complete: t >= 1
  };
}
