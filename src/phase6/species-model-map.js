/**
 * Exact-match mappings to reviewed, animated GLB assets staged by the Pages build.
 * Unsupported species are intentionally excluded from the live population until a
 * suitable animated model is available. No static or merely similar animal is used.
 */
export const SPECIES_MODEL_MAP = Object.freeze({
  fish: { collection: 'animated', id: 'blue_goldfish', variants: ['blue_goldfish','goldfish','koi'], animation: 'clip' },
  schoolFish: { collection: 'animated', id: 'tetra', variants: ['tetra','cardinal_fish'], animation: 'clip', scale: 0.25 },
  clownfish: { collection: 'animated', id: 'clownfish', variants: ['clownfish','zebra_clown_fish'], animation: 'clip' },
  parrotfish: { collection: 'animated', id: 'parrot_fish', variants: ['parrot_fish','gobkit_parrotfish'], animation: 'clip' },
  blueTang: { collection: 'animated', id: 'blue_tang', variants: ['blue_tang','gobkit_bluetang'], animation: 'clip' },
  butterflyfish: { collection: 'animated', id: 'butterfly_fish', animation: 'clip' },
  grouper: { collection: 'animated', id: 'coral_grouper', animation: 'clip' },
  moorishIdol: { collection: 'animated', id: 'moorish_idol', variants: ['moorish_idol','gobkit_moorishidol'], animation: 'clip' },
  tuna: { collection: 'animated', id: 'tuna', animation: 'clip' },
  shark: { collection: 'animated', id: 'shark', variants: ['shark','gobkit_shark'], animation: 'clip' },
  mola: { collection: 'animated', id: 'sunfish', animation: 'clip' },
  dolphin: { collection: 'animated', id: 'dolphin_rigged', animation: 'procedural-swim' },
  jellyfish: { collection: 'animated', id: 'jellyfish', animation: 'clip', orientation: 'vertical' },
  seal: { collection: 'animated', id: 'seal', animation: 'clip' },
  spermWhale: { collection: 'animated', id: 'whale', animation: 'clip', note: 'generic whale model, not species-specific' }
});

// Review-only assets remain discoverable but are deliberately excluded from the
// live animated population. Static geometry is not an animated species model.
export const CREATURE_REVIEW_MODEL_MAP = Object.freeze({
  fish: { collection: 'polyfish', id: 'polyfish-rigged' },
  parrotfish: { collection: 'animated', id: 'parrot_fish' },
  manta: { collection: 'static', id: '5878' },
  jellyfish: { collection: 'static', id: '5889' }
});

export const SPECIES_WITHOUT_REVIEWED_MODEL = Object.freeze([
  'angelfish', 'barracuda', 'wobbegong', 'marlin', 'eel', 'crab', 'lobster',
  'mantis', 'manta', 'stingray', 'whaleShark', 'orca', 'starfish', 'turtle', 'sandEel'
]);

export function getSpeciesModel(species) {
  return SPECIES_MODEL_MAP[species] ?? null;
}

export function getCreatureReviewModel(species) {
  return CREATURE_REVIEW_MODEL_MAP[species] ?? null;
}
