/**
 * Exact-match mapping from Mocean's existing 30 species to Osmocean model assets.
 * A null entry means no suitable model exists in the reviewed Osmocean collections;
 * those creatures retain their current species-specific renderer until a proper asset
 * is sourced. Static models receive simulated root motion only, not invented clips.
 */
export const SPECIES_MODEL_MAP = Object.freeze({
  fish: { collection: 'polyfish', id: 'polyfish-rigged', animation: 'procedural' },
  schoolFish: { collection: 'polyfish', id: 'polyfish-rigged', animation: 'procedural', scale: 0.25 },
  parrotfish: { collection: 'animated', id: 'parrot_fish', animation: 'clip' },
  grouper: { collection: 'animated', id: 'coral_grouper', animation: 'clip' },
  tuna: { collection: 'animated', id: 'tuna', animation: 'clip' },
  shark: { collection: 'animated', id: 'shark', animation: 'clip' },
  barracuda: { collection: 'static', id: '5875', animation: null },
  marlin: { collection: 'static', id: '5873', animation: null },
  manta: { collection: 'static', id: '5878', animation: null },
  stingray: { collection: 'static', id: '5877', animation: null },
  whaleShark: { collection: 'static', id: '5864', animation: null },
  mola: { collection: 'animated', id: 'sunfish', animation: 'clip' },
  orca: { collection: 'static', id: '5861', animation: null },
  spermWhale: { collection: 'static', id: '5860', animation: null },
  turtle: { collection: 'static', id: '5881', animation: null },
  jellyfish: { collection: 'static', id: '5889', animation: null }
});

export const SPECIES_WITHOUT_REVIEWED_MODEL = Object.freeze([
  'clownfish', 'blueTang', 'angelfish', 'butterflyfish', 'moorishIdol',
  'wobbegong', 'eel', 'crab', 'lobster', 'mantis', 'seal', 'starfish',
  'dolphin', 'sandEel'
]);

export function getSpeciesModel(species) {
  return SPECIES_MODEL_MAP[species] ?? null;
}
