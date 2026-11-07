import { add3, clamp, length3, quatFromEuler, quatRotate, scale3, vec3 } from './math.js';

/**
 * Integrates one fixed simulation step. Commands are dimensionless, body-relative
 * intent; this function owns forces, drag, buoyancy, tank response and angular inertia.
 */
export function stepDynamics(body, command, dt, tuning = {}) {
  const drive = tuning.drive ?? 1;
  const agility = tuning.agility ?? 1;
  const q = quatFromEuler(body.yaw, body.pitch, body.roll);
  const forward = quatRotate(q, vec3(1, 0, 0));
  const right = quatRotate(q, vec3(0, 0, 1));
  const up = quatRotate(q, vec3(0, 1, 0));

  const force = add3(
    add3(scale3(forward, command.thrust * 2.1 * drive), scale3(right, command.side * 0.9 * drive)),
    scale3(up, command.lift * 0.85 * drive)
  );
  body.vel = add3(body.vel, scale3(force, dt));
  const speed = length3(body.vel);
  body.vel = scale3(body.vel, Math.exp(-dt * (0.42 + speed * 0.09)));
  body.vel.y += (-body.p.y * 0.11 - body.vel.y * 0.22) * dt;
  body.p = add3(body.p, scale3(body.vel, dt));

  // Soft tank boundaries apply a restoring acceleration, never a position clamp.
  for (const [axis, limit] of [['x', 7], ['y', 2.8], ['z', 4.2]]) {
    const distance = Math.abs(body.p[axis]) - limit;
    if (distance > 0) body.vel[axis] += -Math.sign(body.p[axis]) * distance * 2.8 * dt;
  }

  body.wy += (command.turn * 1.45 * agility - body.wy * 2.4) * dt;
  body.wp += (command.pitch * 1.15 * agility - body.wp * 2.5) * dt;
  body.wr += (-command.turn * 0.42 - body.wr * 2.8) * dt;
  body.yaw += body.wy * dt;
  body.pitch = clamp(body.pitch + body.wp * dt, -0.85, 0.85);
  body.roll = clamp(body.roll + body.wr * dt, -0.65, 0.65);
}
