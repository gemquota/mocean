import { SPECIES_MODEL_MAP } from './species-model-map.js';

export const ANIMATED_MODEL_SPECIES = Object.freeze(Object.keys(SPECIES_MODEL_MAP));

export function filterToAnimatedSpecies(percentages) {
  const allowed = new Set(ANIMATED_MODEL_SPECIES);
  const filtered = {};
  for (const [species, value] of Object.entries(percentages ?? {})) {
    filtered[species] = allowed.has(species) ? Math.max(0, Number(value) || 0) : 0;
  }
  const total = Object.values(filtered).reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) {
    const fallback = ANIMATED_MODEL_SPECIES[0];
    for (const key of Object.keys(filtered)) filtered[key] = key === fallback ? 100 : 0;
    return filtered;
  }
  for (const key of Object.keys(filtered)) filtered[key] = filtered[key] / total * 100;
  return filtered;
}
