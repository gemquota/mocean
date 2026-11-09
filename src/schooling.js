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
const subtract = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;

export const SCHOOLING_DEFAULT_COUNT = 100;
export const SCHOOLING_LIMITS = Object.freeze({ x: 8.2, y: 3.1, z: 6.2 });
export const SCHOOLING_FISH_SCALE = 0.25;
export const SCHOOLING_COLLISION = Object.freeze({ halfLength: 0.205, radius: 0.073 });
const NEIGHBOUR_RADIUS = 2.7;
const SEPARATION_RADIUS = 0.78;
const MAX_SPEED = 2.0;
const MAX_ACCELERATION = 1.25;
const GRID_CELL_SIZE = NEIGHBOUR_RADIUS;

function makeRandom(seed) {
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function cellKey(x, y, z) {
  return x + ',' + y + ',' + z;
}
function cellOf(p) {
  return { x: Math.floor(p.x / GRID_CELL_SIZE), y: Math.floor(p.y / GRID_CELL_SIZE), z: Math.floor(p.z / GRID_CELL_SIZE) };
}
function buildGrid(fish) {
  const grid = new Map();
  for (let i = 0; i < fish.length; i++) {
    const cell = cellOf(fish[i].p), key = cellKey(cell.x, cell.y, cell.z);
    let bucket = grid.get(key);
    if (!bucket) grid.set(key, bucket = []);
    bucket.push(i);
  }
  return grid;
}
function nearbyIndices(grid, cell) {
  const indices = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    const bucket = grid.get(cellKey(cell.x + x, cell.y + y, cell.z + z));
    if (bucket) for (let i = 0; i < bucket.length; i++) indices.push(bucket[i]);
  }
  return indices;
}

/** Closest points on two finite 3D centreline segments. */
function closestSegmentPoints(p1, q1, p2, q2) {
  const d1 = subtract(q1, p1), d2 = subtract(q2, p2), r = subtract(p1, p2);
  const a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r);
  let s = 0, t = 0;
  if (a <= 1e-10 && e <= 1e-10) return [p1, p2];
  if (a <= 1e-10) t = clamp(f / e, 0, 1);
  else {
    const c = dot(d1, r);
    if (e <= 1e-10) s = clamp(-c / a, 0, 1);
    else {
      const b = dot(d1, d2), denom = a * e - b * b;
      if (Math.abs(denom) > 1e-10) s = clamp((b * f - c * e) / denom, 0, 1);
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); }
      else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
    }
  }
  return [add(p1, { x: d1.x * s, y: d1.y * s, z: d1.z * s }), add(p2, { x: d2.x * t, y: d2.y * t, z: d2.z * t })];
}
function collisionSegment(agent) {
  const direction = normalize(agent.v);
  const half = SCHOOLING_COLLISION.halfLength;
  const offset = { x: direction.x * half, y: direction.y * half, z: direction.z * half };
  return [subtract(agent.p, offset), add(agent.p, offset)];
}
function resolveCollisions(fish, grid) {
  let collisions = 0;
  const diameter = SCHOOLING_COLLISION.radius * 2;
  for (let i = 0; i < fish.length; i++) {
    const a = fish[i], cell = cellOf(a.p), candidates = nearbyIndices(grid, cell);
    const [a0, a1] = collisionSegment(a);
    for (const j of candidates) {
      if (j <= i) continue;
      const b = fish[j];
      const [b0, b1] = collisionSegment(b);
      const [pa, pb] = closestSegmentPoints(a0, a1, b0, b1);
      let delta = subtract(pb, pa), distance = length(delta);
      if (distance >= diameter) continue;
      if (distance < 1e-8) {
        delta = normalize({ x: (j - i) % 3 === 0 ? 1 : 0.37, y: (j - i) % 3 === 1 ? 1 : 0.23, z: (j - i) % 3 === 2 ? 1 : 0.41 });
        distance = 0;
      } else delta = { x: delta.x / distance, y: delta.y / distance, z: delta.z / distance };
      const penetration = diameter - distance;
      // Soft positional correction prevents bodies passing through each other
      // without producing a visually violent hard-sphere bounce.
      const correction = penetration * 0.42;
      a.p.x -= delta.x * correction; a.p.y -= delta.y * correction; a.p.z -= delta.z * correction;
      b.p.x += delta.x * correction; b.p.y += delta.y * correction; b.p.z += delta.z * correction;
      const relative = dot(subtract(b.v, a.v), delta);
      if (relative < 0) {
        const impulse = -(1.08 * relative) * 0.5;
        a.v.x -= delta.x * impulse; a.v.y -= delta.y * impulse; a.v.z -= delta.z * impulse;
        b.v.x += delta.x * impulse; b.v.y += delta.y * impulse; b.v.z += delta.z * impulse;
      }
      a.collisionCount++; b.collisionCount++;
      collisions++;
    }
  }
  return collisions;
}

/** Create deterministic agents with independent momentum and gait phase. */
export function createSchool(count = SCHOOLING_DEFAULT_COUNT, seed = 73421) {
  const random = makeRandom(seed);
  const size = Math.max(1, Math.min(250, Math.floor(count)));
  const fish = Array.from({ length: size }, (_, id) => {
    const direction = normalize({
      x: random() * 2 - 1,
      y: (random() * 2 - 1) * 0.35,
      z: random() * 2 - 1
    });
    const speed = 1.0 + random() * 0.35;
    return {
      id,
      p: { x: (random() - 0.5) * 9.4, y: (random() - 0.5) * 3.2, z: (random() - 0.5) * 7.2 },
      v: { x: direction.x * speed, y: direction.y * speed, z: direction.z * speed },
      phase: random() * Math.PI * 2,
      neighbourCount: 0,
      collisionCount: 0
    };
  });
  return { fish, time: 0, metrics: { averageSpeed: 0, averageNeighbours: 0, collisions: 0, candidateChecks: 0 } };
}

/**
 * Inertial local-interaction schooling. A spatial hash limits neighbour work to
 * nearby cells. Fish steer by bounded acceleration, use anticipatory separation,
 * and collide as short oriented capsules rather than point particles.
 */
export function stepSchool(school, dt) {
  const step = clamp(dt, 0, 0.05);
  if (step === 0) return school.metrics;
  const fish = school.fish, grid = buildGrid(fish);
  const accelerations = new Array(fish.length);
  let neighbourTotal = 0, candidateChecks = 0;

  for (let i = 0; i < fish.length; i++) {
    const self = fish[i], candidates = nearbyIndices(grid, cellOf(self.p));
    let sepX = 0, sepY = 0, sepZ = 0;
    let posX = 0, posY = 0, posZ = 0;
    let velX = 0, velY = 0, velZ = 0, neighbours = 0;
    candidateChecks += candidates.length;
    for (const j of candidates) {
      if (i === j) continue;
      const other = fish[j], dx = other.p.x - self.p.x, dy = other.p.y - self.p.y, dz = other.p.z - self.p.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= NEIGHBOUR_RADIUS * NEIGHBOUR_RADIUS) continue;
      neighbours++;
      posX += other.p.x; posY += other.p.y; posZ += other.p.z;
      velX += other.v.x; velY += other.v.y; velZ += other.v.z;
      const d = Math.sqrt(d2);
      if (d < SEPARATION_RADIUS) {
        // Anticipate convergence using relative velocity along the line of approach.
        const rvx = other.v.x - self.v.x, rvy = other.v.y - self.v.y, rvz = other.v.z - self.v.z;
        const closing = Math.max(0, -(dx * rvx + dy * rvy + dz * rvz) / Math.max(d, 0.04));
        const weight = (SEPARATION_RADIUS - d) / SEPARATION_RADIUS;
        const strength = weight * (1.0 + Math.min(1.5, closing * 0.55)) / (d + 0.12);
        sepX -= dx * strength; sepY -= dy * strength; sepZ -= dz * strength;
      }
    }
    self.neighbourCount = neighbours;
    neighbourTotal += neighbours;

    let ax = sepX * 0.62, ay = sepY * 0.62, az = sepZ * 0.62;
    if (neighbours > 0) {
      const inv = 1 / neighbours;
      // Cohesion is deliberately weak; alignment acts on velocity, not heading.
      ax += (posX * inv - self.p.x) * 0.075 + (velX * inv - self.v.x) * 0.34;
      ay += (posY * inv - self.p.y) * 0.075 + (velY * inv - self.v.y) * 0.34;
      az += (posZ * inv - self.p.z) * 0.075 + (velZ * inv - self.v.z) * 0.34;
    }

    const boundary = Math.hypot(self.p.x / SCHOOLING_LIMITS.x, self.p.y / SCHOOLING_LIMITS.y, self.p.z / SCHOOLING_LIMITS.z);
    if (boundary > 0.72) {
      const pressure = (boundary - 0.72) * 1.35;
      ax -= self.p.x / (SCHOOLING_LIMITS.x ** 2) * pressure * 5.2;
      ay -= self.p.y / (SCHOOLING_LIMITS.y ** 2) * pressure * 5.2;
      az -= self.p.z / (SCHOOLING_LIMITS.z ** 2) * pressure * 5.2;
    }
    // Slow, individual heading drift replaces high-frequency random steering.
    ax += Math.sin(school.time * 0.13 + self.phase) * 0.035;
    ay += Math.sin(school.time * 0.09 + self.phase * 1.7) * 0.018;
    az += Math.cos(school.time * 0.11 + self.phase * 0.83) * 0.035;
    accelerations[i] = limit({ x: ax, y: ay, z: az }, MAX_ACCELERATION);
    self.collisionCount = 0;
  }

  let speedTotal = 0;
  for (let i = 0; i < fish.length; i++) {
    const agent = fish[i], acceleration = accelerations[i];
    // Gently regulate cruising speed through acceleration, preserving inertia.
    const currentSpeed = length(agent.v), desiredSpeed = 1.12 + 0.12 * Math.sin(school.time * 0.08 + agent.phase);
    const direction = normalize(agent.v);
    const speedCorrection = clamp((desiredSpeed - currentSpeed) * 0.55, -0.28, 0.28);
    agent.v.x += (acceleration.x + direction.x * speedCorrection) * step;
    agent.v.y += (acceleration.y + direction.y * speedCorrection) * step;
    agent.v.z += (acceleration.z + direction.z * speedCorrection) * step;
    agent.v = limit(agent.v, MAX_SPEED);
    agent.p.x += agent.v.x * step;
    agent.p.y += agent.v.y * step;
    agent.p.z += agent.v.z * step;
    agent.phase += step * (2.8 + length(agent.v) * 0.65);
    speedTotal += length(agent.v);
  }

  // Rebuild after integration so the contact pass sees the current positions.
  const collisionGrid = buildGrid(fish);
  const collisions = resolveCollisions(fish, collisionGrid);
  school.time += step;
  school.metrics = {
    averageSpeed: speedTotal / Math.max(1, fish.length),
    averageNeighbours: neighbourTotal / Math.max(1, fish.length),
    collisions,
    candidateChecks
  };
  return school.metrics;
}
