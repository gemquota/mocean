import { add3, clamp, length3, quatFromEuler, quatRotate, scale3, vec3 } from './math.js';

/**
 * Simplified rigid-body response coupled to distributed fish-body propulsion.
 * Translational drag is quadratic; angular response includes water damping and
 * passive stability. Coefficients are fixed physical approximations, not controls.
 */
export function stepDynamics(body, command, dt) {
  const q = quatFromEuler(body.yaw, body.pitch, body.roll);
  const forward = quatRotate(q, vec3(1, 0, 0));
  const right = quatRotate(q, vec3(0, 0, 1));
  const up = quatRotate(q, vec3(0, 1, 0));

  const force = add3(
    add3(scale3(forward, command.thrust), scale3(right, command.side ?? 0)),
    scale3(up, command.lift ?? 0)
  );
  body.vel = add3(body.vel, scale3(force, dt));

  const speed = length3(body.vel);
  const quadraticDrag = 0.11 + speed * 0.19 + (command.finDrag ?? 0);
  body.vel = scale3(body.vel, Math.exp(-quadraticDrag * dt));
  // Weak restoring buoyancy about the preferred depth, with vertical damping.
  body.vel.y += (-body.p.y * 0.052 - body.vel.y * 0.23) * dt;
  body.p = add3(body.p, scale3(body.vel, dt));

  // Soft habitat limits prevent hard wall collisions.
  for (const [axis, limit] of [['x', 9], ['y', 4], ['z', 6]]) {
    const excess = Math.abs(body.p[axis]) - limit;
    if (excess > 0) body.vel[axis] += -Math.sign(body.p[axis]) * excess * 1.35 * dt;
  }

  // Hydrodynamic yaw damping and passive pitch/roll stability.
  const yawDrive = (command.turn ?? 0) * 0.58 + (command.yawMoment ?? 0);
  body.wy += (yawDrive - body.wy * (1.15 + speed * 0.12)) * dt;
  body.wp += ((command.pitch ?? 0) * 0.34 - body.wp * 1.65 - body.pitch * 0.18) * dt;
  body.wr += ((command.rollMoment ?? 0) - body.wr * 1.9 - body.roll * 0.12) * dt;
  body.yaw += body.wy * dt;
  body.pitch = clamp(body.pitch + body.wp * dt, -0.68, 0.68);
  body.roll = clamp(body.roll + body.wr * dt, -0.46, 0.46);
}
