/**
 * Species-exact naturalistic marine models from 3DAssets.dev.
 * The source GLBs are static posed studies; the renderer supplies procedural
 * body/wing deformation. No cartoon stand-ins or unrelated species mappings.
 * All source assets are CC0 1.0 and staged by the Pages workflow.
 */
export const SPECIES_MODEL_MAP = Object.freeze({
  barracuda: { collection: 'naturalistic', id: 'barracuda', assetId: '5875', motion: 'body-wave' },
  marlin: { collection: 'naturalistic', id: 'blue_marlin', assetId: '5873', motion: 'body-wave' },
  tuna: { collection: 'naturalistic', id: 'bluefin_tuna', assetId: '5870', motion: 'body-wave' },
  shark: { collection: 'naturalistic', id: 'great_white_shark', assetId: '5867', motion: 'body-wave' },
  whaleShark: { collection: 'naturalistic', id: 'whale_shark', assetId: '5864', motion: 'body-wave' },
  mola: { collection: 'naturalistic', id: 'ocean_sunfish', assetId: '5866', motion: 'vertical-body-wave' },
  manta: { collection: 'naturalistic', id: 'manta_ray', assetId: '5878', motion: 'wing-wave' },
  stingray: { collection: 'naturalistic', id: 'southern_stingray', assetId: '5877', motion: 'wing-wave' },
  orca: { collection: 'naturalistic', id: 'orca', assetId: '5861', motion: 'vertical-body-wave' },
  spermWhale: { collection: 'naturalistic', id: 'sperm_whale', assetId: '5860', motion: 'vertical-body-wave' },
  dolphin: { collection: 'naturalistic', id: 'bottlenose_dolphin', assetId: '39330', motion: 'vertical-body-wave' },
  jellyfish: { collection: 'naturalistic', id: 'moon_jellyfish', assetId: '5889', motion: 'pulse', orientation: 'vertical' },
  turtle: { collection: 'naturalistic', id: 'loggerhead_turtle', assetId: '39340', motion: 'wing-wave' },
  seahorse: { collection: 'naturalistic', id: 'lined_seahorse', assetId: '39345', motion: 'pulse', orientation: 'vertical' },
  seaDragon: { collection: 'naturalistic', id: 'leafy_seadragon', assetId: '39346', motion: 'body-wave', orientation: 'vertical' }
});

export const CREATURE_REVIEW_MODEL_MAP = Object.freeze({});

export const SPECIES_WITHOUT_REVIEWED_MODEL = Object.freeze([
  'fish', 'schoolFish', 'clownfish', 'parrotfish', 'blueTang', 'angelfish',
  'butterflyfish', 'grouper', 'moorishIdol', 'wobbegong', 'eel', 'crab',
  'lobster', 'mantis', 'seal', 'starfish', 'sandEel'
]);

export function getSpeciesModel(species) {
  return SPECIES_MODEL_MAP[species] ?? null;
}

export function getCreatureReviewModel(species) {
  return CREATURE_REVIEW_MODEL_MAP[species] ?? null;
}
