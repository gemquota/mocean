const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const length = v => Math.hypot(v.x, v.y, v.z);
const normalize = v => {
  const n = length(v) || 1;
  return { x: v.x / n, y: v.y / n, z: v.z / n };
};
const limit = (v, maximum) => {
  const n = length(v);
  return n > maximum ? { x: v.x * maximum / n, y: v.y * maximum / n, z: v.z * maximum / n } : v;
};
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });

export const SCHOOLING_DEFAULT_COUNT = 100;
export const SCHOOLING_LIMITS = Object.freeze({ x: 8.2, y: 3.1, z: 6.2 });
const NEIGHBOUR_RADIUS = 3.4;
const SEPARATION_RADIUS = 1.15;
const MAX_SPEED = 2.3;
const MIN_SPEED = 0.8;
const MAX_ACCELERATION = 1.8;

function makeRandom(seed) {
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Create a deterministic school with individual positions, headings and gait phases. */
export function createSchool(count = SCHOOLING_DEFAULT_COUNT, seed = 73421) {
  const random = makeRandom(seed);
  const size = Math.max(1, Math.min(250, Math.floor(count)));
  const fish = Array.from({ length: size }, (_, id) => {
    const direction = normalize({
      x: random() * 2 - 1,
      y: (random() * 2 - 1) * 0.45,
      z: random() * 2 - 1
    });
    const speed = 1.05 + random() * 0.55;
    return {
      id,
      p: { x: (random() - 0.5) * 9.4, y: (random() - 0.5) * 3.2, z: (random() - 0.5) * 7.2 },
      v: { x: direction.x * speed, y: direction.y * speed, z: direction.z * speed },
      phase: random() * Math.PI * 2,
      neighbourCount: 0
    };
  });
  return { fish, time: 0, metrics: { averageSpeed: 0, averageNeighbours: 0 } };
}

/**
 * One local-interaction boids step. Separation, alignment and cohesion use only
 * neighbours inside a finite radius. There is deliberately no shared destination
 * or global leader. Each agent retains its own momentum and bounded acceleration.
 */
export function stepSchool(school, dt) {
  const step = clamp(dt, 0, 0.05);
  if (step === 0) return school.metrics;
  const fish = school.fish;
  const accelerations = new Array(fish.length);
  let neighbourTotal = 0;

  for (let i = 0; i < fish.length; i++) {
    const self = fish[i];
    let separationX = 0, separationY = 0, separationZ = 0;
    let positionX = 0, positionY = 0, positionZ = 0;
    let velocityX = 0, velocityY = 0, velocityZ = 0;
    let neighbours = 0;

    for (let j = 0; j < fish.length; j++) {
      if (i === j) continue;
      const other = fish[j];
      const dx = other.p.x - self.p.x;
      const dy = other.p.y - self.p.y;
      const dz = other.p.z - self.p.z;
      const distanceSquared = dx * dx + dy * dy + dz * dz;
      if (distanceSquared >= NEIGHBOUR_RADIUS * NEIGHBOUR_RADIUS) continue;

      neighbours++;
      positionX += other.p.x; positionY += other.p.y; positionZ += other.p.z;
      velocityX += other.v.x; velocityY += other.v.y; velocityZ += other.v.z;
      if (distanceSquared < SEPARATION_RADIUS * SEPARATION_RADIUS) {
        const inverse = 1 / (distanceSquared + 0.055);
        separationX -= dx * inverse;
        separationY -= dy * inverse;
        separationZ -= dz * inverse;
      }
    }
    self.neighbourCount = neighbours;
    neighbourTotal += neighbours;

    let ax = separationX * 1.2;
    let ay = separationY * 1.2;
    let az = separationZ * 1.2;
    if (neighbours > 0) {
      const inverseCount = 1 / neighbours;
      const centreX = positionX * inverseCount - self.p.x;
      const centreY = positionY * inverseCount - self.p.y;
      const centreZ = positionZ * inverseCount - self.p.z;
      const averageVX = velocityX * inverseCount;
      const averageVY = velocityY * inverseCount;
      const averageVZ = velocityZ * inverseCount;
      ax += centreX * 0.16 + (averageVX - self.v.x) * 0.72;
      ay += centreY * 0.16 + (averageVY - self.v.y) * 0.72;
      az += centreZ * 0.16 + (averageVZ - self.v.z) * 0.72;
    }

    // Soft ellipsoidal habitat pressure, not a hard position clamp.
    const radius = Math.hypot(self.p.x / SCHOOLING_LIMITS.x, self.p.y / SCHOOLING_LIMITS.y, self.p.z / SCHOOLING_LIMITS.z);
    if (radius > 0.68) {
      const pressure = (radius - 0.68) * 1.65;
      ax -= self.p.x / (SCHOOLING_LIMITS.x ** 2) * pressure * 7;
      ay -= self.p.y / (SCHOOLING_LIMITS.y ** 2) * pressure * 7;
      az -= self.p.z / (SCHOOLING_LIMITS.z ** 2) * pressure * 7;
    }

    // Small individual variation prevents a rigid rotating ball without inventing a leader.
    ax += Math.sin(school.time * 0.23 + self.phase) * 0.075;
    ay += Math.sin(school.time * 0.17 + self.phase * 1.7) * 0.035;
    az += Math.cos(school.time * 0.21 + self.phase * 0.83) * 0.075;
    accelerations[i] = limit({ x: ax, y: ay, z: az }, MAX_ACCELERATION);
  }

  let speedTotal = 0;
  for (let i = 0; i < fish.length; i++) {
    const agent = fish[i], acceleration = accelerations[i];
    agent.v.x += acceleration.x * step;
    agent.v.y += acceleration.y * step;
    agent.v.z += acceleration.z * step;
    const desiredSpeed = 1.18 + 0.22 * Math.sin(school.time * 0.11 + agent.phase);
    let speed = length(agent.v);
    if (speed < 1e-8) agent.v = { x: 1, y: 0, z: 0 }, speed = 1;
    const boundedSpeed = clamp(speed, MIN_SPEED, Math.min(MAX_SPEED, desiredSpeed + 0.75));
    const direction = normalize(agent.v);
    agent.v.x = direction.x * boundedSpeed;
    agent.v.y = direction.y * boundedSpeed;
    agent.v.z = direction.z * boundedSpeed;
    agent.p.x += agent.v.x * step;
    agent.p.y += agent.v.y * step;
    agent.p.z += agent.v.z * step;
    agent.phase += step * (3.0 + boundedSpeed * 0.8);
    speedTotal += boundedSpeed;
  }

  school.time += step;
  school.metrics = {
    averageSpeed: speedTotal / Math.max(1, fish.length),
    averageNeighbours: neighbourTotal / Math.max(1, fish.length)
  };
  return school.metrics;
}
