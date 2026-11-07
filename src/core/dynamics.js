import { add3, clamp, length3, quatFromEuler, quatRotate, scale3, vec3 } from './math.js';

/** Fixed-step aquatic response with bounded inertia, drag and fin-generated moments. */
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
  const drag = 0.24 + speed * 0.20 + (command.finDrag ?? 0);
  body.vel = scale3(body.vel, Math.exp(-dt * drag));
  body.vel.y += (-body.p.y * 0.075 - body.vel.y * 0.16) * dt;
  body.p = add3(body.p, scale3(body.vel, dt));

  for (const [axis, limit] of [['x', 9], ['y', 4], ['z', 6]]) {
    const distance = Math.abs(body.p[axis]) - limit;
    if (distance > 0) body.vel[axis] += -Math.sign(body.p[axis]) * distance * 1.8 * dt;
  }

  // Tail asymmetry and pectoral-fin drag contribute to turning and banking.
  body.wy += ((command.turn ?? 0) * 0.72 - body.wy * 1.35) * dt;
  body.wp += ((command.pitch ?? 0) * 0.48 - body.wp * 1.5) * dt;
  body.wr += ((command.rollMoment ?? 0) - body.wr * 1.8) * dt;
  body.yaw += body.wy * dt;
  body.pitch = clamp(body.pitch + body.wp * dt, -0.72, 0.72);
  body.roll = clamp(body.roll + body.wr * dt, -0.48, 0.48);
}
