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

export const SCHOOLING_DEFAULT_COUNT = 150;
export const SCHOOLING_LIMITS = Object.freeze({ x: 41, y: 15.5, z: 31 });
export const SCHOOLING_FISH_SCALE = 0.25;
export const SCHOOLING_COLLISION = Object.freeze({ halfLength: 0.205, radius: 0.073 });
export const SCHOOLING_EEL_COLLISION = Object.freeze({ halfLength: 0.56, radius: 0.055 });
export const SCHOOLING_CRAB_COLLISION = Object.freeze({ halfLength: 0.25, radius: 0.13 });
export const SCHOOLING_LOBSTER_COLLISION = Object.freeze({ halfLength: 0.34, radius: 0.105 });
export const CRAB_SHELTERS = Object.freeze([
  Object.freeze({ x: -25, z: -8 }), Object.freeze({ x: -4, z: -3 }),
  Object.freeze({ x: 19, z: -10 }), Object.freeze({ x: 32, z: 2 }),
  Object.freeze({ x: -34, z: -17 }), Object.freeze({ x: 16, z: 18 })
]);
const NEIGHBOUR_RADIUS = 2.7;
const SEPARATION_RADIUS = 0.78;
const MAX_SPEED = 2.0;
const MAX_ACCELERATION = 1.25;
const GRID_CELL_SIZE = NEIGHBOUR_RADIUS;
const MAX_HEADING_RATE = 1.35;

function makeRandom(seed) {
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function turnDirection(current, target, maxAngle) {
  const cosine = clamp(dot(current, target), -1, 1);
  const angle = Math.acos(cosine);
  if (angle < 1e-6) return target;
  const fraction = Math.min(1, maxAngle / angle);
  return normalize({
    x: current.x * (1 - fraction) + target.x * fraction,
    y: current.y * (1 - fraction) + target.y * fraction,
    z: current.z * (1 - fraction) + target.z * fraction
  });
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
  const direction = agent.forward ?? normalize(agent.v);
  const half = agent.species === 'eel' ? SCHOOLING_EEL_COLLISION.halfLength
    : agent.species === 'crab' ? SCHOOLING_CRAB_COLLISION.halfLength
    : agent.species === 'lobster' ? SCHOOLING_LOBSTER_COLLISION.halfLength
    : SCHOOLING_COLLISION.halfLength;
  const scale = agent.bodyScale ?? 1;
  const scaledHalf = half * scale * (agent.species === 'eel' ? (agent.eelLengthScale ?? 1) : 1);
  const offset = { x: direction.x * scaledHalf, y: direction.y * scaledHalf, z: direction.z * scaledHalf };
  return [subtract(agent.p, offset), add(agent.p, offset)];
}
function resolveCollisions(fish, grid) {
  let collisions = 0;
  for (let i = 0; i < fish.length; i++) {
    const a = fish[i], cell = cellOf(a.p), candidates = nearbyIndices(grid, cell);
    const [a0, a1] = collisionSegment(a);
    for (const j of candidates) {
      if (j <= i) continue;
      const b = fish[j];
      const [b0, b1] = collisionSegment(b);
      const [pa, pb] = closestSegmentPoints(a0, a1, b0, b1);
      let delta = subtract(pb, pa), distance = length(delta);
      const radiusFor = species => species === 'eel' ? SCHOOLING_EEL_COLLISION.radius
        : species === 'crab' ? SCHOOLING_CRAB_COLLISION.radius
        : species === 'lobster' ? SCHOOLING_LOBSTER_COLLISION.radius
        : SCHOOLING_COLLISION.radius;
      const radiusScale = agent => agent.bodyScale ?? 1;
      const contactDistance = radiusFor(a.species) * radiusScale(a) + radiusFor(b.species) * radiusScale(b);
      if (distance >= contactDistance) continue;
      if (distance < 1e-8) {
        delta = normalize({ x: (j - i) % 3 === 0 ? 1 : 0.37, y: (j - i) % 3 === 1 ? 1 : 0.23, z: (j - i) % 3 === 2 ? 1 : 0.41 });
        distance = 0;
      } else delta = { x: delta.x / distance, y: delta.y / distance, z: delta.z / distance };
      const penetration = contactDistance - distance;
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
  const size = Math.max(1, Math.min(5000, Math.floor(count)));
  const fish = Array.from({ length: size }, (_, id) => {
    const direction = normalize({
      x: random() * 2 - 1,
      y: (random() * 2 - 1) * 0.35,
      z: random() * 2 - 1
    });
    const speed = 1.0 + random() * 0.35;
    const phase = random() * Math.PI * 2;
    const speciesRoll = random();
    const species = speciesRoll < 0.68 ? 'fish' : speciesRoll < 0.83 ? 'eel' : speciesRoll < 0.841 ? 'crab' : 'lobster';
    const bodyScale = species === 'fish' ? 0.58 + Math.pow(random(), 1.35) * 0.92
      : species === 'eel' ? 1.28 + random() * 0.22
      : 0.78 + random() * 0.34;
    const eelLengthScale = species === 'eel' ? 2 + random() * 3 : 1;
    const schoolAffinity = species === 'fish' ? clamp(1.48 - bodyScale * 0.62, 0.48, 1.12) : 0;
    const grounded = species === 'crab' || species === 'lobster';
    if (grounded) direction.y = 0;
    const heading = normalize(direction);
    const groundSpeed = species === 'crab' ? 0.28 : 0.34;
    const groundVelocity = species === 'crab'
      ? { x: -heading.z * groundSpeed, y: 0, z: heading.x * groundSpeed }
      : { x: heading.x * groundSpeed, y: 0, z: heading.z * groundSpeed };
    return {
      id,
      species,
      bodyScale,
      eelLengthScale,
      schoolAffinity,
      feedingCooldown: 0,
      p: { x: species === 'crab' ? CRAB_SHELTERS[id % CRAB_SHELTERS.length].x + (random() - 0.5) * 0.55 : (random() - 0.5) * 47, y: grounded ? -8.55 : (random() - 0.5) * 16, z: species === 'crab' ? CRAB_SHELTERS[id % CRAB_SHELTERS.length].z + (random() - 0.5) * 0.55 : (random() - 0.5) * 36 },
      v: grounded ? groundVelocity : { x: direction.x * speed, y: direction.y * speed, z: direction.z * speed },
      forward: heading,
      phase,
      groundPhase: random() * Math.PI * 2,
      shelterIndex: id % 6,
      shelterTimer: 2 + random() * 5,
      sheltering: species === 'crab',
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
    let velX = 0, velY = 0, velZ = 0, schoolWeight = 0, neighbours = 0;
    let preyTarget = null, preyDistance = Infinity;
    let fleeX = 0, fleeY = 0, fleeZ = 0;
    candidateChecks += candidates.length;
    for (const j of candidates) {
      if (i === j) continue;
      const other = fish[j], dx = other.p.x - self.p.x, dy = other.p.y - self.p.y, dz = other.p.z - self.p.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= NEIGHBOUR_RADIUS * NEIGHBOUR_RADIUS) continue;
      const d = Math.sqrt(d2);
      if (self.species === 'fish' && other.species === 'fish') {
        neighbours++;
        const similarity = 1 / (1 + Math.abs((self.bodyScale ?? 1) - (other.bodyScale ?? 1)) * 2.4);
        const weight = similarity * (other.schoolAffinity ?? 1);
        schoolWeight += weight;
        posX += other.p.x * weight; posY += other.p.y * weight; posZ += other.p.z * weight;
        velX += other.v.x * weight; velY += other.v.y * weight; velZ += other.v.z * weight;
        const selfSize = self.bodyScale ?? 1, otherSize = other.bodyScale ?? 1;
        if (d > 0.001 && selfSize > 1.08 && otherSize < selfSize * 0.68 && d < preyDistance) {
          preyTarget = other; preyDistance = d;
        } else if (d > 0.001 && otherSize > 1.08 && selfSize < otherSize * 0.68 && d < 2.35) {
          const flee = (2.35 - d) / 2.35 / Math.max(d, 0.22);
          fleeX -= dx * flee; fleeY -= dy * flee; fleeZ -= dz * flee;
        }
      }
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
    if (neighbours > 0 && schoolWeight > 0) {
      const inv = 1 / schoolWeight, affinity = self.schoolAffinity ?? 1;
      ax += ((posX * inv - self.p.x) * 0.075 + (velX * inv - self.v.x) * 0.34) * affinity;
      ay += ((posY * inv - self.p.y) * 0.075 + (velY * inv - self.v.y) * 0.34) * affinity;
      az += ((posZ * inv - self.p.z) * 0.075 + (velZ * inv - self.v.z) * 0.34) * affinity;
    }
    if (self.species === 'fish') {
      ax += fleeX * 0.9; ay += fleeY * 0.9; az += fleeZ * 0.9;
      if (preyTarget && (self.feedingCooldown ?? 0) <= 0) {
        const chase = normalize(subtract(preyTarget.p, self.p));
        const gain = clamp(0.95 - preyDistance * 0.12, 0.28, 0.8);
        ax += chase.x * gain; ay += chase.y * gain; az += chase.z * gain;
        self.preyId = preyTarget.id;
      } else self.preyId = null;
      self.feedingCooldown = Math.max(0, (self.feedingCooldown ?? 0) - step);
    }

    const boundary = Math.hypot(self.p.x / SCHOOLING_LIMITS.x, self.p.y / SCHOOLING_LIMITS.y, self.p.z / SCHOOLING_LIMITS.z);
    if (boundary > 0.72) {
      const pressure = (boundary - 0.72) * 1.35;
      ax -= self.p.x / (SCHOOLING_LIMITS.x ** 2) * pressure * 5.2;
      ay -= self.p.y / (SCHOOLING_LIMITS.y ** 2) * pressure * 5.2;
      az -= self.p.z / (SCHOOLING_LIMITS.z ** 2) * pressure * 5.2;
    }
    // Slow, individual heading drift replaces high-frequency random steering.
    if (self.species !== 'crab' && self.species !== 'lobster') {
      const wanderGain = self.species === 'eel' ? 0.052 : 0.035;
      ax += Math.sin(school.time * 0.13 + self.phase) * wanderGain;
      ay += Math.sin(school.time * 0.09 + self.phase * 1.7) * wanderGain * 0.52;
      az += Math.cos(school.time * 0.11 + self.phase * 0.83) * wanderGain;
    }
    accelerations[i] = limit({ x: ax, y: ay, z: az }, MAX_ACCELERATION);
    self.collisionCount = 0;
  }

  let speedTotal = 0;
  for (let i = 0; i < fish.length; i++) {
    const agent = fish[i], acceleration = accelerations[i];
    if (agent.species === 'crab' || agent.species === 'lobster') {
      // Benthic locomotion keeps the shell grounded and uses a species-specific
      // walking direction: crabs sidestep, lobsters progress more longitudinally.
      const turn = Math.sin(school.time * 0.17 + agent.groundPhase) * 0.22;
      const targetForward = normalize({
        x: agent.forward.x * Math.cos(turn) - agent.forward.z * Math.sin(turn),
        y: 0,
        z: agent.forward.x * Math.sin(turn) + agent.forward.z * Math.cos(turn)
      });
      agent.forward = turnDirection(agent.forward, targetForward, 0.42 * step);
      const direction = agent.species === 'crab'
        ? (agent.sheltering ? { x: 0, y: 0, z: 0 } : { x: agent.forward.x, y: 0, z: agent.forward.z })
        : { x: agent.forward.x, y: 0, z: agent.forward.z };
      let desiredSpeed;
      if (agent.species === 'crab') {
        agent.shelterTimer -= step;
        const shelter = CRAB_SHELTERS[agent.shelterIndex % CRAB_SHELTERS.length];
        const dx = shelter.x - agent.p.x, dz = shelter.z - agent.p.z, distance = Math.hypot(dx, dz);
        if (agent.sheltering && agent.shelterTimer <= 0) {
          agent.sheltering = false;
          agent.shelterIndex = (agent.shelterIndex + 1 + (agent.id % 2)) % CRAB_SHELTERS.length;
          agent.shelterTimer = 0;
        }
        const target = CRAB_SHELTERS[agent.shelterIndex % CRAB_SHELTERS.length];
        const tx = target.x - agent.p.x, tz = target.z - agent.p.z, targetDistance = Math.hypot(tx, tz);
        if (!agent.sheltering && targetDistance < 1.15) {
          agent.sheltering = true;
          agent.shelterTimer = 3.5 + ((agent.id * 17 + Math.floor(school.time * 3)) % 45) / 10;
        }
        if (agent.sheltering) desiredSpeed = 0.025;
        else {
          agent.forward = turnDirection(agent.forward, normalize({ x: tx, y: 0, z: tz }), 2.8 * step);
          desiredSpeed = 1.05 + 0.18 * Math.sin(agent.groundPhase * 1.7);
        }
      } else {
        const baseSpeed = 0.34;
        desiredSpeed = baseSpeed * (0.78 + 0.22 * Math.sin(school.time * 0.31 + agent.groundPhase));
      }
      const desired = { x: direction.x * desiredSpeed, y: 0, z: direction.z * desiredSpeed };
      const response = agent.species === 'crab' ? (agent.sheltering ? 3.5 : 4.2) : 1.05;
      const accelerationLimit = agent.species === 'crab' ? 3.8 : 0.55;
      agent.v.x += clamp((desired.x - agent.v.x) * response, -accelerationLimit, accelerationLimit) * step;
      agent.v.z += clamp((desired.z - agent.v.z) * response, -accelerationLimit, accelerationLimit) * step;
      if (agent.species === 'crab') { agent.v.x = clamp(agent.v.x, -1.5, 1.5); agent.v.z = clamp(agent.v.z, -1.5, 1.5); }
      agent.v.y = 0;
      agent.p.x += agent.v.x * step;
      agent.p.z += agent.v.z * step;
      agent.p.y = -8.55;
      agent.groundPhase += step * (agent.species === 'crab' ? (agent.sheltering ? 0.35 : 11.5) : 4.1);
      agent.phase += step * 1.2;
      speedTotal += length(agent.v);
      continue;
    }
    // Gently regulate cruising speed through acceleration, preserving inertia.
    const currentSpeed = length(agent.v), desiredSpeed = (agent.species === 'eel' ? 0.92 : 1.12) + 0.12 * Math.sin(school.time * 0.08 + agent.phase);
    const direction = currentSpeed > 0.12 ? normalize(agent.v) : agent.forward;
    const speedCorrection = clamp((desiredSpeed - currentSpeed) * 1.05, -0.35, 0.48);
    agent.v.x += (acceleration.x + direction.x * speedCorrection) * step;
    agent.v.y += (acceleration.y + direction.y * speedCorrection) * step;
    agent.v.z += (acceleration.z + direction.z * speedCorrection) * step;
    agent.v = limit(agent.v, agent.species === 'eel' ? 1.65 : MAX_SPEED);
    agent.forward = turnDirection(agent.forward, normalize(agent.v), (agent.species === 'eel' ? 0.92 : MAX_HEADING_RATE) * step);
    agent.p.x += agent.v.x * step;
    agent.p.y += agent.v.y * step;
    agent.p.z += agent.v.z * step;
    agent.phase += step * (2.8 + length(agent.v) * 0.65);
    speedTotal += length(agent.v);
  }

  const predationGrid = buildGrid(fish);
  const eaten = new Set();
  for (let i = 0; i < fish.length; i++) {
    const predator = fish[i];
    if (predator.species !== 'fish' || predator.bodyScale < 1.08 || predator.feedingCooldown > 0) continue;
    for (const j of nearbyIndices(predationGrid, cellOf(predator.p))) {
      if (j === i || eaten.has(j)) continue;
      const prey = fish[j];
      if (prey.species !== 'fish' || prey.bodyScale >= predator.bodyScale * 0.68) continue;
      const d = length(subtract(prey.p, predator.p));
      if (d < 0.36 + prey.bodyScale * 0.045) {
        eaten.add(j);
        predator.feedingCooldown = 3.5;
        predator.bodyScale = Math.min(1.55, predator.bodyScale + 0.035);
        break;
      }
    }
  }
  if (eaten.size) school.fish = fish.filter((agent, index) => !eaten.has(index));
  const survivors = school.fish;
  const collisionGrid = buildGrid(survivors);
  const collisions = resolveCollisions(survivors, collisionGrid);
  for (const agent of survivors) if (agent.species === 'crab' || agent.species === 'lobster') {
    agent.p.y = -8.55;
    agent.v.y = 0;
  }
  school.time += step;
  school.metrics = {
    averageSpeed: speedTotal / Math.max(1, fish.length),
    averageNeighbours: neighbourTotal / Math.max(1, fish.length),
    collisions,
    eaten: (school.metrics.eaten ?? 0) + eaten.size,
    population: survivors.length,
    candidateChecks
  };
  return school.metrics;
}
