import { createHabitatVoxelField, resolveVoxelTerrainContact } from './phase6/voxel-field.js';
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
export const seabedHeight = (x, z) => -8.65 + Math.sin(x * .16 + z * .07) * .48 + Math.sin(z * .31 - x * .045) * .22 + Math.cos(x * .075 + z * .19) * .16;

export const SCHOOLING_DEFAULT_COUNT = 150;
export const SCHOOLING_LIMITS = Object.freeze({ x: 41, y: 15.5, z: 31 });
// Relative per-individual model volume, adult mass, and ecological prevalence.
// Values are comparative proxies, not validated measurements. Ecological prevalence
// is a temperate Australian coastal-reef suitability/encounter index (1 = uncommon,
// 10 = very common), not a census-derived abundance estimate.
export const SCHOOLING_SPECIES_VOLUME = Object.freeze({
  fish: 1, schoolFish: 0.015625, clownfish: 0.16, parrotfish: 0.72, blueTang: 0.12, angelfish: 0.48, butterflyfish: 0.22, grouper: 5.8, moorishIdol: 0.20, barracuda: 3.2, wobbegong: 4.8, marlin: 5.2, tuna: 3.8, eel: 1.35, crab: 0.38, lobster: 0.32,
  mantis: 0.30, manta: 6.5, stingray: 3.2, shark: 5.8, whaleShark: 21,
  mola: 4.4, orca: 24, spermWhale: 70, seal: 2.2, starfish: 0.08,
  dolphin: 2.9, turtle: 1.4, jellyfish: 0.55, sandEel: 0.38
});
export const SCHOOLING_SPECIES_ADULT_MASS_KG = Object.freeze({
  fish: 0.10, schoolFish: 0.025, clownfish: 0.025, parrotfish: 0.65, blueTang: 0.018, angelfish: 0.35, butterflyfish: 0.045, grouper: 180, moorishIdol: 0.20, barracuda: 18, wobbegong: 100, marlin: 90, tuna: 35, eel: 15, crab: 0.30, lobster: 0.90,
  mantis: 0.09, manta: 350, stingray: 8, shark: 13, whaleShark: 15000,
  mola: 1000, orca: 3500, spermWhale: 36000, seal: 180, starfish: 0.06,
  dolphin: 225, turtle: 150, jellyfish: 0.01, sandEel: 0.01
});
export const SCHOOLING_SPECIES_ECOLOGY = Object.freeze({
  fish: 10, schoolFish: 9, clownfish: 7, parrotfish: 8, blueTang: 6, angelfish: 5, butterflyfish: 6, grouper: 2, moorishIdol: 5, barracuda: 3, wobbegong: 4, marlin: 2, tuna: 4, eel: 5, crab: 8, lobster: 4,
  mantis: 3, manta: 2, stingray: 5, shark: 3, whaleShark: 1,
  mola: 1, orca: 1, spermWhale: 1, seal: 2, starfish: 8,
  dolphin: 2, turtle: 3, jellyfish: 7, sandEel: 8
});
const geometricMean = values => Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length);
const volumeMean = geometricMean(Object.values(SCHOOLING_SPECIES_VOLUME));
const massMean = geometricMean(Object.values(SCHOOLING_SPECIES_ADULT_MASS_KG));
const ecologyMean = geometricMean(Object.values(SCHOOLING_SPECIES_ECOLOGY));
// Each measure is first normalised by its across-species geometric mean. Their
// geometric mean gives each dimension equal influence; inverse score becomes prevalence.
export const SCHOOLING_SPECIES_BALANCE = Object.freeze(Object.fromEntries(
  Object.keys(SCHOOLING_SPECIES_VOLUME).map(species => {
    const score = Math.cbrt(
      (SCHOOLING_SPECIES_VOLUME[species] / volumeMean) *
      (SCHOOLING_SPECIES_ADULT_MASS_KG[species] / massMean) *
      (SCHOOLING_SPECIES_ECOLOGY[species] / ecologyMean)
    );
    return [species, score];
  })
));
const inverseBalanceTotal = Object.values(SCHOOLING_SPECIES_BALANCE).reduce((sum, score) => sum + 1 / score, 0);
export const SCHOOLING_SPECIES_PERCENTAGES = Object.freeze(Object.fromEntries(
  Object.entries(SCHOOLING_SPECIES_BALANCE).map(([species, score]) => [species, (1 / score) / inverseBalanceTotal * 100])
));
export const REEF_ANEMONE_SITES = Object.freeze([
  Object.freeze({ x: -34.2, z: -14.8 }), Object.freeze({ x: -27.4, z: 7.2 }), Object.freeze({ x: -10.8, z: -12.6 }), Object.freeze({ x: 3.8, z: 8.4 }), Object.freeze({ x: 16.6, z: -16.8 }), Object.freeze({ x: 29.4, z: 9.6 }), Object.freeze({ x: 36.4, z: -6.2 }), Object.freeze({ x: -2.4, z: 19.6 }), Object.freeze({ x: -18.6, z: 17.4 }), Object.freeze({ x: 21.4, z: 22.2 })
]);
export const SCHOOLING_FISH_SCALE = 0.25;
export const SCHOOLING_COLLISION = Object.freeze({ halfLength: 0.205, radius: 0.073 });
export const SCHOOLING_EEL_COLLISION = Object.freeze({ halfLength: 0.56, radius: 0.055 });
export const SCHOOLING_CRAB_COLLISION = Object.freeze({ halfLength: 0.25, radius: 0.13 });
export const SCHOOLING_LOBSTER_COLLISION = Object.freeze({ halfLength: 0.34, radius: 0.105 });
export const SCHOOLING_MANTIS_COLLISION = Object.freeze({ halfLength: 0.27, radius: 0.085 });
export const SCHOOLING_MANTA_COLLISION = Object.freeze({ halfLength: 0.82, radius: 0.2 });
export const SCHOOLING_STINGRAY_COLLISION = Object.freeze({ halfLength: 0.68, radius: 0.22 });
export const SCHOOLING_SHARK_COLLISION = Object.freeze({ halfLength: 1.02, radius: 0.25 });
export const SCHOOLING_WHALE_SHARK_COLLISION = Object.freeze({ halfLength: 1.34, radius: 0.38 });
export const SCHOOLING_MOLA_COLLISION = Object.freeze({ halfLength: 0.58, radius: 0.39 });
export const SCHOOLING_ORCA_COLLISION = Object.freeze({ halfLength: 1.18, radius: 0.36 });
export const SCHOOLING_SPERM_WHALE_COLLISION = Object.freeze({ halfLength: 1.72, radius: 0.52 });
export const SCHOOLING_SEAL_COLLISION = Object.freeze({ halfLength: 0.62, radius: 0.25 });
export const SCHOOLING_SHOAL_COLLISION = Object.freeze({ halfLength: 0.236, radius: 0.045 });
export const SCHOOLING_STARFISH_COLLISION = Object.freeze({ halfLength: 0.27, radius: 0.19 });
export const SCHOOLING_DOLPHIN_COLLISION = Object.freeze({ halfLength: 0.94, radius: 0.21 });
export const SCHOOLING_TURTLE_COLLISION = Object.freeze({ halfLength: 0.62, radius: 0.24 });
export const SCHOOLING_JELLYFISH_COLLISION = Object.freeze({ halfLength: 0.22, radius: 0.2 });
export const SCHOOLING_SAND_EEL_COLLISION = Object.freeze({ halfLength: 0.34, radius: 0.07 });
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
    : agent.species === 'mantis' ? SCHOOLING_MANTIS_COLLISION.halfLength
    : agent.species === 'manta' ? SCHOOLING_MANTA_COLLISION.halfLength
    : agent.species === 'stingray' ? SCHOOLING_STINGRAY_COLLISION.halfLength
    : agent.species === 'shark' ? SCHOOLING_SHARK_COLLISION.halfLength
    : agent.species === 'whaleShark' ? SCHOOLING_WHALE_SHARK_COLLISION.halfLength
    : agent.species === 'mola' ? SCHOOLING_MOLA_COLLISION.halfLength
    : agent.species === 'orca' ? SCHOOLING_ORCA_COLLISION.halfLength
    : agent.species === 'spermWhale' ? SCHOOLING_SPERM_WHALE_COLLISION.halfLength
    : agent.species === 'seal' ? SCHOOLING_SEAL_COLLISION.halfLength
    : agent.species === 'schoolFish' ? SCHOOLING_SHOAL_COLLISION.halfLength
    : agent.species === 'starfish' ? SCHOOLING_STARFISH_COLLISION.halfLength
    : agent.species === 'dolphin' ? SCHOOLING_DOLPHIN_COLLISION.halfLength
    : agent.species === 'turtle' ? SCHOOLING_TURTLE_COLLISION.halfLength
    : agent.species === 'jellyfish' ? SCHOOLING_JELLYFISH_COLLISION.halfLength
    : agent.species === 'sandEel' ? SCHOOLING_SAND_EEL_COLLISION.halfLength
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
        : species === 'mantis' ? SCHOOLING_MANTIS_COLLISION.radius
        : species === 'manta' ? SCHOOLING_MANTA_COLLISION.radius
        : species === 'stingray' ? SCHOOLING_STINGRAY_COLLISION.radius
        : species === 'shark' ? SCHOOLING_SHARK_COLLISION.radius
        : species === 'whaleShark' ? SCHOOLING_WHALE_SHARK_COLLISION.radius
        : species === 'mola' ? SCHOOLING_MOLA_COLLISION.radius
        : species === 'orca' ? SCHOOLING_ORCA_COLLISION.radius
        : species === 'spermWhale' ? SCHOOLING_SPERM_WHALE_COLLISION.radius
        : species === 'seal' ? SCHOOLING_SEAL_COLLISION.radius
        : species === 'schoolFish' ? SCHOOLING_SHOAL_COLLISION.radius
        : species === 'starfish' ? SCHOOLING_STARFISH_COLLISION.radius
        : species === 'dolphin' ? SCHOOLING_DOLPHIN_COLLISION.radius
        : species === 'turtle' ? SCHOOLING_TURTLE_COLLISION.radius
        : species === 'jellyfish' ? SCHOOLING_JELLYFISH_COLLISION.radius
        : species === 'sandEel' ? SCHOOLING_SAND_EEL_COLLISION.radius
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
export function createSchool(count = SCHOOLING_DEFAULT_COUNT, seed = 73421, options = {}) {
  const random = makeRandom(seed);
  const mix = options.speciesPercentages ?? SCHOOLING_SPECIES_PERCENTAGES;
  const speciesEntries = Object.entries(mix).filter(([, value]) => Number.isFinite(value) && value > 0);
  if (!speciesEntries.length) speciesEntries.push(['fish', 1]);
  const speciesTotal = speciesEntries.reduce((sum, [, value]) => sum + value, 0) || 1;
  const size = Math.max(1, Math.min(5000, Math.floor(count)));
  const speciesOrder = Array.from({ length: size }, (_, id) => id);
  for (let i = size - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [speciesOrder[i], speciesOrder[j]] = [speciesOrder[j], speciesOrder[i]]; }
  const speciesById = new Array(size);
  // Guarantee one representative of every enabled species whenever the population
  // can accommodate them, then apportion the remaining agents by the blended weights.
  const reserve = size >= speciesEntries.length ? 1 : 0;
  const distributable = size - reserve * speciesEntries.length;
  const allocations = speciesEntries.map(([name, weight]) => {
    const exact = distributable * weight / speciesTotal;
    return { name, count: reserve + Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = size - allocations.reduce((sum, entry) => sum + entry.count, 0);
  for (const entry of [...allocations].sort((a, b) => b.remainder - a.remainder).slice(0, remaining)) entry.count++;
  let speciesCursor = 0;
  for (const entry of allocations) for (let n = 0; n < entry.count; n++) speciesById[speciesOrder[speciesCursor++]] = entry.name;
  const fish = Array.from({ length: size }, (_, id) => {
    const direction = normalize({
      x: random() * 2 - 1,
      y: (random() * 2 - 1) * 0.35,
      z: random() * 2 - 1
    });
    const speed = 1.0 + random() * 0.35;
    const phase = random() * Math.PI * 2;
    const species = speciesById[id] ?? 'fish';
    if (species === 'eel') direction.y *= 0.28;
    const standardFishScale = 0.58 + Math.pow(random(), 1.35) * 0.92;
    const bodyScale = species === 'fish' ? standardFishScale
      : species === 'schoolFish' ? standardFishScale * 0.25
      : species === 'eel' ? 1.28 + random() * 0.22
      : species === 'mantis' ? 0.72 + random() * 0.18
      : species === 'manta' ? 1.55 + random() * 0.35
      : species === 'stingray' ? 0.98 + random() * 0.28
      : species === 'shark' ? 1.62 + random() * 0.3
      : species === 'whaleShark' ? 2.45 + random() * 0.55
      : species === 'mola' ? 1.42 + random() * 0.28
      : species === 'orca' ? 2.05 + random() * 0.35
      : species === 'spermWhale' ? 3.05 + random() * 0.55
      : species === 'seal' ? 0.92 + random() * 0.22
      : species === 'clownfish' ? 0.52 + random() * 0.16
      : species === 'parrotfish' ? 1.05 + random() * 0.28
      : species === 'blueTang' ? 0.62 + random() * 0.16
      : species === 'angelfish' ? 0.9 + random() * 0.2
      : species === 'butterflyfish' ? 0.66 + random() * 0.16
      : species === 'grouper' ? 1.75 + random() * 0.35
      : species === 'moorishIdol' ? 0.72 + random() * 0.16
      : species === 'barracuda' ? 1.55 + random() * 0.25
      : species === 'wobbegong' ? 1.55 + random() * 0.25
      : species === 'marlin' ? 1.85 + random() * 0.28
      : species === 'tuna' ? 1.45 + random() * 0.22
      : species === 'dolphin' ? 1.12 + random() * 0.2
      : species === 'turtle' ? 0.92 + random() * 0.18
      : species === 'jellyfish' ? 0.58 + random() * 0.2
      : species === 'sandEel' ? 2.2 + random() * 0.5
      : 0.78 + random() * 0.34;
    const eelLengthScale = species === 'eel' ? 2 + random() * 3 : 1;
    const schoolAffinity = species === 'fish' ? clamp(1.48 - bodyScale * 0.62, 0.48, 1.12) : species === 'schoolFish' ? 2.4 : 0;
    const socialGroupId = species === 'schoolFish' ? id % 6 : species === 'dolphin' ? id % 3 : species === 'orca' ? 0 : species === 'seal' ? id % 3 : -1;
    const grounded = species === 'crab' || species === 'lobster' || species === 'mantis' || species === 'starfish' || species === 'sandEel' || species === 'wobbegong';
    const anemoneHome = species === 'clownfish' ? REEF_ANEMONE_SITES[id % REEF_ANEMONE_SITES.length] : null;
    if (grounded) direction.y = 0;
    const heading = normalize(direction);
    const groundSpeed = species === 'crab' ? 0.28 : species === 'mantis' ? 0.22 : species === 'starfish' ? 0.018 : species === 'sandEel' ? 0 : species === 'wobbegong' ? 0.035 : 0.34;
    const groundVelocity = species === 'crab'
      ? { x: -heading.z * groundSpeed, y: 0, z: heading.x * groundSpeed }
      : { x: heading.x * groundSpeed, y: 0, z: heading.z * groundSpeed };
    return {
      id,
      species,
      bodyScale,
      eelLengthScale,
      schoolAffinity,
      socialGroupId,
      feedingCooldown: 0,
      filterFeedPhase: random() * Math.PI * 2,
      planktonFiltered: 0,
      p: { x: species === 'crab' ? CRAB_SHELTERS[id % CRAB_SHELTERS.length].x + (random() - 0.5) * 0.55 : species === 'schoolFish' ? [-21,-13,-5,5,13,21][socialGroupId] + (random() - 0.5) * 2.4 : species === 'dolphin' ? [-22,0,22][socialGroupId] + (random() - 0.5) * 3 : species === 'orca' ? (random() - 0.5) * 5 : species === 'seal' ? [-20,0,20][socialGroupId] + (random() - 0.5) * 3 : anemoneHome ? anemoneHome.x + (random() - 0.5) * 1.5 : (random() - 0.5) * 47, y: grounded ? -8.55 : species === 'orca' ? -1.5 + random() * 3 : species === 'spermWhale' ? -5.5 + random() * 2 : species === 'seal' ? 3.2 + random() * 2 : species === 'stingray' ? -7.92 + random() * 0.12 : species === 'wobbegong' ? -8.48 + random() * 0.08 : species === 'grouper' ? -7.45 + random() * 0.65 : species === 'eel' ? -7.25 + random() * 1.65 : species === 'manta' ? (random() - 0.5) * 7 : species === 'whaleShark' ? -1.2 + random() * 2.4 : species === 'mola' ? -2.1 + random() * 4.2 : species === 'marlin' ? -2.2 + random() * 2.4 : species === 'tuna' ? -1.8 + random() * 2.2 : species === 'schoolFish' ? [-4,-1,2,4,-2,1][socialGroupId] + (random() - 0.5) * 1.5 : species === 'dolphin' ? (random() - 0.5) * 3 : species === 'turtle' ? -1.5 + random() * 3 : species === 'jellyfish' ? -3 + random() * 6 : anemoneHome ? seabedHeight(anemoneHome.x, anemoneHome.z) + 1.1 + random() * 0.8 : (random() - 0.5) * 16, z: species === 'crab' ? CRAB_SHELTERS[id % CRAB_SHELTERS.length].z + (random() - 0.5) * 0.55 : species === 'schoolFish' ? [-15,15,-11,11,0,-2][socialGroupId] + (random() - 0.5) * 2.4 : species === 'dolphin' ? [-16,0,16][socialGroupId] + (random() - 0.5) * 3 : species === 'orca' ? (random() - 0.5) * 5 : species === 'seal' ? [-12,0,12][socialGroupId] + (random() - 0.5) * 3 : anemoneHome ? anemoneHome.z + (random() - 0.5) * 1.5 : (random() - 0.5) * 36 },
      wingPhase: random() * Math.PI * 2,
      tentaclePhase: random() * Math.PI * 2,
      burrowPhase: random() * Math.PI * 2,
      buried: species === 'sandEel',
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
  for (const agent of fish) if (['crab','lobster','mantis','starfish','sandEel'].includes(agent.species)) agent.p.y = seabedHeight(agent.p.x, agent.p.z) + .06;
  const worldSize = { ...(options.worldSize ?? SCHOOLING_LIMITS) };
  return { fish, time: 0, worldSize, terrainField: createHabitatVoxelField(worldSize, seabedHeight), terrainFieldWorldSize: { ...worldSize }, speciesPercentages: { ...mix }, metrics: { averageSpeed: 0, averageNeighbours: 0, collisions: 0, candidateChecks: 0 } };
}

/**
 * Inertial local-interaction schooling. Regular fish retain soft social schooling;
 * dedicated schoolFish form persistent, cohesive shoals, while dolphins travel in pods.
 * A spatial hash bounds local interactions and capsules handle body contact.
 */
export function stepSchool(school, dt) {
  const limits = school.worldSize ?? SCHOOLING_LIMITS;
  if (!school.terrainField || school.terrainFieldWorldSize?.x !== limits.x || school.terrainFieldWorldSize?.y !== limits.y || school.terrainFieldWorldSize?.z !== limits.z) {
    school.terrainField = createHabitatVoxelField(limits, seabedHeight);
    school.terrainFieldWorldSize = { ...limits };
  }
  const step = clamp(dt, 0, 0.05);
  if (step === 0) return school.metrics;
  const fish = school.fish, grid = buildGrid(fish);
  const socialGroups = new Map();
  for (const agent of fish) if (agent.species === 'schoolFish' || agent.species === 'dolphin' || agent.species === 'orca' || agent.species === 'seal') {
    const key = agent.species + ':' + agent.socialGroupId;
    let group = socialGroups.get(key);
    if (!group) { group = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, count: 0 }; socialGroups.set(key, group); }
    group.x += agent.p.x; group.y += agent.p.y; group.z += agent.p.z;
    group.vx += agent.v.x; group.vy += agent.v.y; group.vz += agent.v.z; group.count++;
  }
  for (const group of socialGroups.values()) { const inv = 1 / group.count; group.x *= inv; group.y *= inv; group.z *= inv; group.vx *= inv; group.vy *= inv; group.vz *= inv; }
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
      if (((self.species === 'shark' || self.species === 'dolphin' || self.species === 'orca' || self.species === 'seal') && (other.species === 'fish' || other.species === 'schoolFish') || (self.species === 'turtle' && other.species === 'jellyfish')) && d < preyDistance) {
        preyTarget = other; preyDistance = d;
      }
      if ((self.species === 'fish' || self.species === 'schoolFish') && (other.species === 'shark' || other.species === 'dolphin' || other.species === 'orca') && d < 3.3) {
        const flee = (3.3 - d) / 3.3 / Math.max(d, 0.3);
        fleeX -= dx * flee * 1.6; fleeY -= dy * flee * 1.6; fleeZ -= dz * flee * 1.6;
      }
      if (self.species === 'schoolFish' && other.species === 'schoolFish' && self.socialGroupId === other.socialGroupId) {
        neighbours++;
        const similarity = 1 / (1 + Math.abs((self.bodyScale ?? 1) - (other.bodyScale ?? 1)) * 2.4);
        const weight = similarity * 2.2;
        schoolWeight += weight;
        posX += other.p.x * weight; posY += other.p.y * weight; posZ += other.p.z * weight;
        velX += other.v.x * weight; velY += other.v.y * weight; velZ += other.v.z * weight;
      }
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
    if (self.species === 'schoolFish' || self.species === 'dolphin' || self.species === 'orca' || self.species === 'seal') {
      const group = socialGroups.get(self.species + ':' + self.socialGroupId);
      if (group && group.count > 1) {
        const cohesion = self.species === 'schoolFish' ? 0.22 : self.species === 'orca' ? 0.2 : 0.13;
        const alignment = self.species === 'schoolFish' ? 0.78 : self.species === 'orca' ? 0.72 : 0.48;
        ax += (group.x - self.p.x) * cohesion + (group.vx - self.v.x) * alignment;
        ay += (group.y - self.p.y) * cohesion + (group.vy - self.v.y) * alignment;
        az += (group.z - self.p.z) * cohesion + (group.vz - self.v.z) * alignment;
      }
    }
    if (self.species === 'wobbegong') {
      const floor = seabedHeight(self.p.x, self.p.z);
      ay += (floor + 0.28 - self.p.y) * 0.22 - self.v.y * 0.3;
      ax *= 0.55; az *= 0.55;
    }
    if (self.species === 'clownfish') {
      const home = REEF_ANEMONE_SITES[self.id % REEF_ANEMONE_SITES.length];
      const dx = home.x - self.p.x, dz = home.z - self.p.z, distance = Math.hypot(dx, dz);
      if (distance > 1.8) { ax += dx * 0.11; az += dz * 0.11; }
      ay += ((seabedHeight(home.x, home.z) + 1.45) - self.p.y) * 0.12 - self.v.y * 0.18;
    }
    if (self.species === 'fish' || self.species === 'schoolFish') {
      ax += fleeX * 0.9; ay += fleeY * 0.9; az += fleeZ * 0.9;
      if (preyTarget && (self.feedingCooldown ?? 0) <= 0) {
        const chase = normalize(subtract(preyTarget.p, self.p));
        const gain = clamp(0.95 - preyDistance * 0.12, 0.28, 0.8) * clamp(self.aggression ?? 1, 0, 2);
        ax += chase.x * gain; ay += chase.y * gain; az += chase.z * gain;
        self.preyId = preyTarget.id;
      } else self.preyId = null;
      self.feedingCooldown = Math.max(0, (self.feedingCooldown ?? 0) - step);
    } else if (self.species === 'shark' || self.species === 'dolphin' || self.species === 'turtle' || self.species === 'orca' || self.species === 'seal') {
      if (preyTarget && (self.feedingCooldown ?? 0) <= 0) {
        const chase = normalize(subtract(preyTarget.p, self.p));
        const gain = clamp(1.25 - preyDistance * 0.1, 0.38, 1.05) * clamp(self.aggression ?? 1, 0, 2);
        ax += chase.x * gain; ay += chase.y * gain; az += chase.z * gain;
        self.preyId = preyTarget.id;
      } else self.preyId = null;
      self.feedingCooldown = Math.max(0, (self.feedingCooldown ?? 0) - step);
    }

    const limits = school.worldSize ?? SCHOOLING_LIMITS;
    const boundary = Math.hypot(self.p.x / limits.x, self.p.y / limits.y, self.p.z / limits.z);
    if (boundary > 0.72) {
      const pressure = (boundary - 0.72) * 1.35;
      ax -= self.p.x / (limits.x ** 2) * pressure * 5.2;
      ay -= self.p.y / (limits.y ** 2) * pressure * 5.2;
      az -= self.p.z / (limits.z ** 2) * pressure * 5.2;
    }
    // Slow, individual heading drift replaces high-frequency random steering.
    if (self.species !== 'crab' && self.species !== 'lobster' && self.species !== 'mantis' && self.species !== 'starfish') {
      const wanderGain = self.species === 'eel' ? 0.052 : self.species === 'manta' ? 0.018 : self.species === 'schoolFish' ? 0.006 : self.species === 'dolphin' ? 0.014 : 0.035;
      if (self.species === 'eel') {
        const bottomTarget = -6.75;
        ay += clamp((bottomTarget - self.p.y) * 0.3 - self.v.y * 1.15, -0.82, 0.82);
      } else if (self.species === 'manta') {
        ay += Math.sin(school.time * 0.22 + self.phase) * 0.075 - self.v.y * 0.12;
      }
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
    if (agent.species === 'whaleShark') {
      // Whale sharks cruise slowly through midwater, filtering the plankton-rich flow.
      const desiredSpeed = 0.72 + 0.045 * Math.sin(school.time * 0.09 + agent.phase);
      const currentSpeed = length(agent.v);
      const direction = currentSpeed > 0.08 ? normalize(agent.v) : agent.forward;
      const speedCorrection = clamp((desiredSpeed - currentSpeed) * 0.82, -0.2, 0.24);
      agent.v.x += (acceleration.x * 0.42 + direction.x * speedCorrection) * step;
      agent.v.y += (acceleration.y * 0.3 + direction.y * speedCorrection + clamp((Math.sin(school.time * 0.16 + agent.phase) * 0.8 - agent.p.y) * 0.18, -0.12, 0.12)) * step;
      agent.v.z += (acceleration.z * 0.42 + direction.z * speedCorrection) * step;
      agent.v = limit(agent.v, 0.92);
      agent.forward = turnDirection(agent.forward, normalize(agent.v), 0.38 * step);
      agent.filterFeedPhase += step * 1.25;
      agent.planktonFiltered += step * (0.7 + 0.3 * Math.max(0, Math.sin(agent.filterFeedPhase)));
      agent.p.x += agent.v.x * step;
      agent.p.y += agent.v.y * step;
      agent.p.z += agent.v.z * step;
      agent.phase += step * 0.8;
      speedTotal += length(agent.v);
      continue;
    }
    if (agent.species === 'orca') {
      const desired=agent.preyId!=null?1.18:0.88+0.08*Math.sin(school.time*.12+agent.phase),speed=length(agent.v),dir=speed>.06?normalize(agent.v):agent.forward,correction=clamp((desired-speed)*.7,-.2,.24),depth=-.4+Math.sin(school.time*.17+agent.phase)*1.7;
      agent.v.x+=(acceleration.x*.48+dir.x*correction)*step;agent.v.y+=(acceleration.y*.42+(depth-agent.p.y)*.1-agent.v.y*.2)*step;agent.v.z+=(acceleration.z*.48+dir.z*correction)*step;
      agent.v=limit(agent.v,1.42);agent.forward=turnDirection(agent.forward,normalize(agent.v),.62*step);agent.p.x+=agent.v.x*step;agent.p.y+=agent.v.y*step;agent.p.z+=agent.v.z*step;agent.phase+=step*1.35;speedTotal+=length(agent.v);continue;
    }
    if (agent.species === 'spermWhale') {
      const depth=-4.6+Math.sin(school.time*.075+agent.phase*.22)*5.1,desired=.58+.045*Math.sin(school.time*.06+agent.phase),speed=length(agent.v),dir=speed>.05?normalize(agent.v):agent.forward,correction=clamp((desired-speed)*.65,-.14,.16);
      agent.v.x+=(acceleration.x*.22+dir.x*correction)*step;agent.v.y+=(acceleration.y*.12+(depth-agent.p.y)*.095-agent.v.y*.22)*step;agent.v.z+=(acceleration.z*.22+dir.z*correction)*step;
      agent.v=limit(agent.v,.78);agent.forward=turnDirection(agent.forward,normalize(agent.v),.24*step);agent.p.x+=agent.v.x*step;agent.p.y+=agent.v.y*step;agent.p.z+=agent.v.z*step;agent.phase+=step*.48;speedTotal+=length(agent.v);continue;
    }
    if (agent.species === 'seal') {
      const dive=Math.max(0,Math.sin(school.time*.19+agent.phase)),depth=3.4-dive*6.4,desired=.68+.13*dive,speed=length(agent.v),dir=speed>.05?normalize(agent.v):agent.forward,correction=clamp((desired-speed)*.78,-.16,.2);
      agent.v.x+=(acceleration.x*.52+dir.x*correction)*step;agent.v.y+=(acceleration.y*.3+(depth-agent.p.y)*.16-agent.v.y*.28)*step;agent.v.z+=(acceleration.z*.52+dir.z*correction)*step;
      agent.v=limit(agent.v,1.02);agent.forward=turnDirection(agent.forward,normalize(agent.v),.58*step);agent.p.x+=agent.v.x*step;agent.p.y+=agent.v.y*step;agent.p.z+=agent.v.z*step;agent.phase+=step*1.05;speedTotal+=length(agent.v);continue;
    }
    if (agent.species === 'mola') {
      // Slow, deep-bodied ocean sunfish cruise through midwater with gentle vertical drift.
      const desiredSpeed = 0.54 + 0.035 * Math.sin(school.time * 0.07 + agent.phase);
      const currentSpeed = length(agent.v);
      const direction = currentSpeed > 0.06 ? normalize(agent.v) : agent.forward;
      const speedCorrection = clamp((desiredSpeed - currentSpeed) * 0.72, -0.12, 0.16);
      const depthTarget = 0.8 + Math.sin(school.time * 0.11 + agent.phase) * 1.35;
      agent.v.x += (acceleration.x * 0.32 + direction.x * speedCorrection) * step;
      agent.v.y += (acceleration.y * 0.18 + (depthTarget - agent.p.y) * 0.12 - agent.v.y * 0.24) * step;
      agent.v.z += (acceleration.z * 0.32 + direction.z * speedCorrection) * step;
      agent.v = limit(agent.v, 0.72);
      agent.forward = turnDirection(agent.forward, normalize(agent.v), 0.3 * step);
      agent.phase += step * 0.62;
      agent.p.x += agent.v.x * step; agent.p.y += agent.v.y * step; agent.p.z += agent.v.z * step;
      speedTotal += length(agent.v);
      continue;
    }
    if (agent.species === 'sandEel') {
      agent.burrowPhase += step * 0.22;
      const emergence = Math.max(0, Math.sin(agent.burrowPhase));
      agent.buried = emergence < 0.32;
      agent.filterFeedPhase += step * 1.6;
      if (!agent.buried) agent.planktonFiltered += step * (0.15 + emergence * 0.3);
      agent.v.x = 0.018 * Math.sin(agent.burrowPhase * 0.7); agent.v.z = 0.012 * Math.cos(agent.burrowPhase * 0.6);
      agent.p.x += agent.v.x * step; agent.p.z += agent.v.z * step;
      agent.p.y = seabedHeight(agent.p.x, agent.p.z) + (agent.buried ? 0.02 : 0.72 + emergence * 0.8);
      agent.phase += step * 0.9; speedTotal += length(agent.v); continue;
    }
    if (agent.species === 'jellyfish') {
      agent.tentaclePhase += step * 1.4;
      const targetY = -1.5 + Math.sin(school.time * 0.18 + agent.phase) * 3.2;
      agent.v.x += (Math.sin(school.time * .12 + agent.phase) * .045 - agent.v.x * .12) * step;
      agent.v.y += clamp((targetY - agent.p.y) * .16 - agent.v.y * .3, -.22, .22) * step;
      agent.v.z += (Math.cos(school.time * .1 + agent.phase) * .045 - agent.v.z * .12) * step;
      agent.v = limit(agent.v, .32); agent.p.x += agent.v.x * step; agent.p.y += agent.v.y * step; agent.p.z += agent.v.z * step;
      agent.phase += step * .7; speedTotal += length(agent.v); continue;
    }
    if (agent.species === 'turtle') {
      const desired = .48 + .05 * Math.sin(school.time * .2 + agent.phase), speed = length(agent.v);
      const direction = speed > .05 ? normalize(agent.v) : agent.forward, correction = clamp((desired - speed) * .6, -.12, .12);
      agent.v.x += (acceleration.x * .35 + direction.x * correction) * step; agent.v.y += (acceleration.y * .25 + direction.y * correction) * step; agent.v.z += (acceleration.z * .35 + direction.z * correction) * step;
      agent.v = limit(agent.v, .72); agent.forward = turnDirection(agent.forward, normalize(agent.v), .48 * step);
      agent.p.x += agent.v.x * step; agent.p.y += agent.v.y * step; agent.p.z += agent.v.z * step; agent.phase += step * 1.1; speedTotal += length(agent.v); continue;
    }
    if (agent.species === 'starfish') {
      const drift = 0.035 + 0.018 * Math.sin(school.time * 0.17 + agent.phase);
      const desired = { x: agent.forward.x * drift, z: agent.forward.z * drift };
      agent.v.x += clamp((desired.x - agent.v.x) * 0.5, -0.035, 0.035) * step;
      agent.v.z += clamp((desired.z - agent.v.z) * 0.5, -0.035, 0.035) * step;
      agent.v.y = 0; agent.p.x += agent.v.x * step; agent.p.z += agent.v.z * step; agent.p.y = seabedHeight(agent.p.x, agent.p.z) + .06;
      agent.forward = turnDirection(agent.forward, normalize({x: agent.v.x || agent.forward.x,y:0,z: agent.v.z || agent.forward.z}),0.12*step);
      agent.groundPhase += step * 0.22; agent.phase += step * 0.12; speedTotal += length(agent.v); continue;
    }
    if (agent.species === 'stingray') {
      // Stingrays cruise just above the substrate with slow, continuous pectoral-fin strokes.
      const desiredSpeed = 0.62 + 0.055 * Math.sin(school.time * 0.12 + agent.phase);
      const currentSpeed = Math.hypot(agent.v.x, agent.v.z);
      const direction = currentSpeed > 0.08 ? normalize({ x: agent.v.x, y: 0, z: agent.v.z }) : agent.forward;
      const speedCorrection = clamp((desiredSpeed - currentSpeed) * 0.72, -0.24, 0.3);
      agent.v.x += (acceleration.x + direction.x * speedCorrection) * step;
      agent.v.z += (acceleration.z + direction.z * speedCorrection) * step;
      agent.v.y = 0;
      agent.v = limit(agent.v, 0.82);
      agent.forward = turnDirection(agent.forward, normalize({ x: agent.v.x, y: 0, z: agent.v.z }), 0.72 * step);
      agent.p.x += agent.v.x * step;
      agent.p.z += agent.v.z * step;
      agent.p.y = -7.92;
      agent.wingPhase += step * 1.55;
      agent.phase += step * 1.1;
      speedTotal += length(agent.v);
      continue;
    }
    if (agent.species === 'crab' || agent.species === 'lobster' || agent.species === 'mantis') {
      // Benthic locomotion keeps the shell grounded and uses a species-specific
      // walking direction: crabs sidestep, lobsters progress more longitudinally.
      const turn = Math.sin(school.time * (agent.species === 'mantis' ? 0.34 : 0.17) + agent.groundPhase) * (agent.species === 'mantis' ? 0.34 : 0.22);
      const targetForward = normalize({
        x: agent.forward.x * Math.cos(turn) - agent.forward.z * Math.sin(turn),
        y: 0,
        z: agent.forward.x * Math.sin(turn) + agent.forward.z * Math.cos(turn)
      });
      agent.forward = turnDirection(agent.forward, targetForward, 0.42 * step);
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
          agent.forward = turnDirection(agent.forward, normalize({ x: tz, y: 0, z: -tx }), 2.8 * step);
          desiredSpeed = 1.05 + 0.18 * Math.sin(agent.groundPhase * 1.7);
        }
      } else if (agent.species === 'mantis') {
        // Mantis shrimp stay benthic but move in short, abrupt bursts between pauses.
        const pulse = Math.pow(Math.max(0, Math.sin(school.time * 0.72 + agent.groundPhase)), 12);
        desiredSpeed = 0.12 + pulse * 0.82;
        agent.forward = turnDirection(agent.forward, targetForward, 1.35 * step);
      } else {
        const baseSpeed = 0.34;
        desiredSpeed = baseSpeed * (0.78 + 0.22 * Math.sin(school.time * 0.31 + agent.groundPhase));
      }
      const moveDirection = agent.species === 'crab'
        ? (agent.sheltering ? { x: 0, y: 0, z: 0 } : { x: -agent.forward.z, y: 0, z: agent.forward.x })
        : { x: agent.forward.x, y: 0, z: agent.forward.z };
      const desired = { x: moveDirection.x * desiredSpeed, y: 0, z: moveDirection.z * desiredSpeed };
      const response = agent.species === 'crab' ? (agent.sheltering ? 3.5 : 4.2) : agent.species === 'mantis' ? 4.8 : 1.05;
      const accelerationLimit = agent.species === 'crab' ? 3.8 : agent.species === 'mantis' ? 4.2 : 0.55;
      agent.v.x += clamp((desired.x - agent.v.x) * response, -accelerationLimit, accelerationLimit) * step;
      agent.v.z += clamp((desired.z - agent.v.z) * response, -accelerationLimit, accelerationLimit) * step;
      if (agent.species === 'crab' || agent.species === 'mantis') { agent.v.x = clamp(agent.v.x, -1.5, 1.5); agent.v.z = clamp(agent.v.z, -1.5, 1.5); }
      agent.v.y = 0;
      agent.p.x += agent.v.x * step;
      agent.p.z += agent.v.z * step;
      agent.p.y = -8.55;
      agent.groundPhase += step * (agent.species === 'crab' ? (agent.sheltering ? 0.35 : 11.5) : agent.species === 'mantis' ? 8.2 : 4.1);
      agent.phase += step * 1.2;
      speedTotal += length(agent.v);
      continue;
    }
    // Gently regulate cruising speed through acceleration, preserving inertia.
    const currentSpeed = length(agent.v), desiredSpeed = (agent.species === 'grouper' ? 0.48 : agent.species === 'barracuda' ? 1.62 : agent.species === 'moorishIdol' ? 0.82 : agent.species === 'eel' ? 0.92 : agent.species === 'manta' ? 0.82 : agent.species === 'shark' ? 1.48 : agent.species === 'dolphin' ? 1.72 : 1.12) + (agent.species === 'manta' ? 0.055 : 0.12) * Math.sin(school.time * 0.08 + agent.phase);
    const direction = currentSpeed > 0.12 ? normalize(agent.v) : agent.forward;
    const speedCorrection = clamp((desiredSpeed - currentSpeed) * 1.05, -0.35, 0.48);
    agent.v.x += (acceleration.x + direction.x * speedCorrection) * step;
    agent.v.y += (acceleration.y + direction.y * speedCorrection) * step;
    agent.v.z += (acceleration.z + direction.z * speedCorrection) * step;
    agent.v = limit(agent.v, agent.species === 'eel' ? 1.65 : agent.species === 'manta' ? 1.25 : agent.species === 'shark' ? 2.55 : agent.species === 'dolphin' ? 2.2 : agent.species === 'barracuda' ? 2.35 : agent.species === 'grouper' ? 0.72 : MAX_SPEED);
    agent.forward = turnDirection(agent.forward, normalize(agent.v), (agent.species === 'eel' ? 0.92 : agent.species === 'manta' ? 0.62 : agent.species === 'shark' ? 1.08 : agent.species === 'dolphin' ? 1.5 : MAX_HEADING_RATE) * step);
    if (agent.species === 'manta') agent.wingPhase += step * 2.15;
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
    if (!((predator.species === 'fish' && predator.bodyScale >= 1.08) || predator.species === 'shark' || predator.species === 'dolphin' || predator.species === 'turtle' || predator.species === 'grouper' || predator.species === 'barracuda') || predator.feedingCooldown > 0) continue;
    for (const j of nearbyIndices(predationGrid, cellOf(predator.p))) {
      if (j === i || eaten.has(j)) continue;
      const prey = fish[j];
      if ((predator.species === 'turtle' ? prey.species !== 'jellyfish' : (prey.species !== 'fish' && prey.species !== 'schoolFish' && prey.species !== 'clownfish' && prey.species !== 'moorishIdol' && prey.species !== 'butterflyfish' && prey.species !== 'blueTang')) || (predator.species === 'fish' && (prey.species !== 'fish' || prey.bodyScale >= predator.bodyScale * 0.68))) continue;
      const d = length(subtract(prey.p, predator.p));
      if (d < 0.36 + prey.bodyScale * 0.045) {
        eaten.add(j);
        predator.feedingCooldown = 3.5;
        if (predator.species === 'fish') predator.bodyScale = Math.min(1.55, predator.bodyScale + 0.035);
        break;
      }
    }
  }
  if (eaten.size) school.fish = fish.filter((agent, index) => !eaten.has(index));
  const survivors = school.fish;
  const collisionGrid = buildGrid(survivors);
  const collisions = resolveCollisions(survivors, collisionGrid);
  for (const agent of survivors) {
    if (agent.species === 'crab' || agent.species === 'lobster' || agent.species === 'mantis' || agent.species === 'starfish') {
      agent.p.y = seabedHeight(agent.p.x, agent.p.z) + .06;
      agent.v.y = 0;
      if (agent.species === 'starfish') agent.v = limit({ x: agent.v.x, y: 0, z: agent.v.z }, 0.08);
    } else if (agent.species === 'sandEel') {
      agent.p.y = Math.max(agent.p.y, seabedHeight(agent.p.x, agent.p.z) + .02);
      agent.v.y = 0;
    } else if (agent.species === 'stingray') {
      agent.p.y = -7.92;
      agent.v.y = 0;
      agent.v = limit({ x: agent.v.x, y: 0, z: agent.v.z }, 0.82);
    }
  }
  // The same signed-distance field that generates the visible voxel mesh also
  // prevents creatures entering solid rock. Burrowing sand eels are exempt.
  for (const agent of survivors) {
    agent.terrainContact = false;
    if (agent.species !== 'sandEel') resolveVoxelTerrainContact(agent, school.terrainField);
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
