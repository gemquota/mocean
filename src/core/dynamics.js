import { add3, clamp, length3, quatFromEuler, quatIntegrateAngularVelocity, quatMultiply, quatRotate, scale3, vec3 } from './math.js';

/**
 * Rigid-body translation and attitude response coupled to fish-body propulsion.
 * World: +Y up. Body at identity: +X forward, +Y dorsal, +Z lateral.
 * Orientation is a body-to-world quaternion. Lift is world-vertical; thrust and
 * side force follow body-local forward and right. Torque channels are independent.
 */
export function stepDynamics(body, command, dt) {
  const q = body.orientation ?? quatFromEuler(body.yaw, body.pitch, body.roll);
  const forward = quatRotate(q, vec3(1, 0, 0));
  const right = quatRotate(q, vec3(0, 0, 1));

  const force = add3(
    add3(scale3(forward, command.thrust ?? 0), scale3(right, command.side ?? 0)),
    vec3(0, command.lift ?? 0, 0)
  );
  body.vel = add3(body.vel, scale3(force, dt));

  const speed = length3(body.vel);
  // Active braking models deployed fins increasing resistance, not reverse thrust.
  const brake = clamp(command.brake ?? 0, 0, 1);
  const quadraticDrag = 0.11 + speed * 0.19 + (command.finDrag ?? 0) + brake * 1.35;
  body.vel = scale3(body.vel, Math.exp(-quadraticDrag * dt));
  body.vel.y += (-body.p.y * 0.052 - body.vel.y * 0.23) * dt;
  body.p = add3(body.p, scale3(body.vel, dt));

  for (const [axis, limit] of [['x', 9], ['y', 4], ['z', 6]]) {
    const excess = Math.abs(body.p[axis]) - limit;
    if (excess > 0) body.vel[axis] += -Math.sign(body.p[axis]) * excess * 1.35 * dt;
  }

  const yawDrive = clamp(command.turn ?? 0, -1, 1) * 3.1 + clamp(command.yawMoment ?? 0, -0.35, 0.35);
  body.wy += (yawDrive - body.wy * (1.05 + speed * 0.12)) * dt;
  const pitchDrive = clamp(command.pitch ?? 0, -1, 1) * 0.58;
  body.wp += (pitchDrive - body.wp * 1.25 - body.pitch * 0.12) * dt;
  body.wr += ((command.rollMoment ?? 0) * 1.8 - body.wr * 1.35 - body.roll * 0.09) * dt;

  // Yaw is about world-up. Pitch and axial roll are body-local Z and X.
  // Split composition preserves those axis definitions at arbitrary attitude.
  const halfYaw = body.wy * dt * 0.5;
  const worldYaw = { w: Math.cos(halfYaw), x: 0, y: Math.sin(halfYaw), z: 0 };
  const afterYaw = quatMultiply(worldYaw, q);
  body.orientation = quatIntegrateAngularVelocity(afterYaw, vec3(body.wr, 0, body.wp), dt);

  // Euler values remain approximate telemetry for the current behaviour controller.
  body.yaw += body.wy * dt;
  body.pitch += body.wp * dt;
  body.roll += body.wr * dt;
}
