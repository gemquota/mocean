/**
 * Exact-match mappings to reviewed, animated GLB assets staged by the Pages build.
 * Unsupported species are intentionally excluded from the live population until a
 * suitable animated model is available. No static or merely similar animal is used.
 */
export const SPECIES_MODEL_MAP = Object.freeze({
  fish: { collection: 'animated', id: 'blue_goldfish', animation: 'clip' },
  schoolFish: { collection: 'animated', id: 'tetra', animation: 'clip', scale: 0.25 },
  clownfish: { collection: 'animated', id: 'clownfish', animation: 'clip' },
  parrotfish: { collection: 'animated', id: 'parrot_fish', animation: 'clip' },
  blueTang: { collection: 'animated', id: 'blue_tang', animation: 'clip' },
  butterflyfish: { collection: 'animated', id: 'butterfly_fish', animation: 'clip' },
  grouper: { collection: 'animated', id: 'coral_grouper', animation: 'clip' },
  moorishIdol: { collection: 'animated', id: 'moorish_idol', animation: 'clip' },
  tuna: { collection: 'animated', id: 'tuna', animation: 'clip' },
  shark: { collection: 'animated', id: 'shark', animation: 'clip' },
  mola: { collection: 'animated', id: 'sunfish', animation: 'clip' },
  dolphin: { collection: 'animated', id: 'dolphin_rigged', animation: 'clip' }
});

export const SPECIES_WITHOUT_REVIEWED_MODEL = Object.freeze([
  'angelfish', 'barracuda', 'wobbegong', 'marlin', 'eel', 'crab', 'lobster',
  'mantis', 'manta', 'stingray', 'whaleShark', 'orca', 'spermWhale', 'seal',
  'starfish', 'turtle', 'jellyfish', 'sandEel'
]);

export function getSpeciesModel(species) {
  return SPECIES_MODEL_MAP[species] ?? null;
}
