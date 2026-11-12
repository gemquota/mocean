/**
 * Deterministic ecological regions for the fixed-camera mixed-species habitat.
 * These are authored habitat patches, not a claim of calibrated reef ecology.
 */
export const HABITAT_BIOMES = Object.freeze([
  Object.freeze({ id: 'coral-reef', label: 'Coral reef', centres: [[-17,-13],[-12,5],[-7,-14],[1,8],[14,-13],[17,9],[18,-5],[-1,15],[-15,13],[8,14]], radius: 7.5 }),
  Object.freeze({ id: 'kelp-forest', label: 'Kelp forest', centres: [[-29,-21],[28,-19]], radius: 13 }),
  Object.freeze({ id: 'seagrass-meadow', label: 'Seagrass meadow', centres: [[-29,20],[28,21]], radius: 13 }),
  Object.freeze({ id: 'sponge-garden', label: 'Sponge garden', centres: [[-7,-7],[15,-8],[8,10]], radius: 9 }),
  Object.freeze({ id: 'rocky-ravine', label: 'Rocky ravine', centres: [[-17,8],[11,-2]], radius: 8 })
]);

/** Classify a seabed point using its local depth/slope and nearest authored patch. */
export function classifyHabitatBiome(x, z, { y = -8.6, normalY = 1 } = {}) {
  if (![x, z, y, normalY].every(Number.isFinite)) return 'open-sand';
  if (normalY < 0.48) return 'rocky-ravine';
  if (y < -10.35) return 'sponge-garden';
  let best = null, bestDistance = Infinity;
  for (const biome of HABITAT_BIOMES) {
    for (const [cx, cz] of biome.centres) {
      const distance = Math.hypot(x - cx, z - cz);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = biome;
      }
    }
  }
  if (best && bestDistance <= best.radius) return best.id;
  return normalY > 0.94 ? 'seagrass-meadow' : 'open-sand';
}
