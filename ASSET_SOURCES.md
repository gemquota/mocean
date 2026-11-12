# Marine model sources

## Live Schooling models

The live habitat no longer uses the Quaternius or Gobkit cartoon-style models. It now stages twelve species-matched, smooth-shaded marine GLBs from 3DAssets.dev's *Ocean Animals: Whales, Sharks and Fish* collection. The bottlenose dolphin comes from the companion *Ocean Giants: Whales, Dolphins, Sharks and Reef Life* collection.

These are natural-colour, untextured, smooth-shaded posed studies, not photoreal scans. The source pages describe them as static and explicitly list no rig or baked animation. The GLBs are CC0 1.0 Universal and are staged from their stable CDN URLs by the Pages workflow.

| Live species | Model | Asset ID | Motion treatment |
|---|---|---:|---|
| Barracuda | Barracuda | 5875 | Lateral travelling body wave |
| Marlin | Blue marlin | 5873 | Lateral travelling body wave |
| Tuna | Bluefin tuna | 5870 | Lateral travelling body wave |
| Shark | Great white shark | 5867 | Lateral travelling body wave |
| Whale shark | Whale shark | 5864 | Lateral travelling body wave |
| Mola | Ocean sunfish | 5866 | Vertical body/tail wave |
| Manta | Manta ray | 5878 | Travelling wing wave |
| Stingray | Southern stingray | 5877 | Travelling wing wave |
| Orca | Orca | 5861 | Vertical body/tail wave |
| Sperm whale | Sperm whale | 5860 | Vertical body/tail wave |
| Dolphin | Bottlenose dolphin | 39330 | Vertical body/tail wave |
| Jellyfish | Moon jellyfish | 5889 | Bell pulse |

Source packs:

- [Ocean Animals: Whales, Sharks and Fish](https://3dassets.dev/packs/open-ocean-and-deep-sea-life) · [machine-readable manifest](https://3dassets.dev/api/v1/packs/open-ocean-and-deep-sea-life)
- [Ocean Giants: Whales, Dolphins, Sharks and Reef Life](https://3dassets.dev/packs/ocean-giants-kit) · [machine-readable manifest](https://3dassets.dev/api/v1/packs/ocean-giants-kit)
- [CC0 1.0 Universal licence](https://creativecommons.org/publicdomain/zero/1.0/)

## Animation and renderer

The selected GLBs contain no baked clips. The renderer flattens their static mesh hierarchies into model-local geometry and applies procedural vertex deformation:

- Fish and sharks use a travelling lateral body wave with a relatively stable head and increasing tail amplitude.
- Dolphins, whales and sunfish use vertical tail/body displacement.
- Manta and stingray models use a travelling vertical wave from the wing roots to the tips.
- Jellyfish use a subtle bell pulse.

The simulation still owns root position, heading, velocity, acceleration and behaviour. The procedural shader changes internal mesh shape only. This is not skeletal animation or a substitute for detailed fin rigs; it is a deliberate compromise that removes the toy-like models while retaining visible swimming.

The current model catalogue is generated at deployment by `scripts/verify-naturalistic-marine-models.mjs`. It checks each downloaded GLB header, glTF 2.0 JSON chunk, mesh data and expected absence of baked clips before writing `assets/models/osmocean/naturalistic/catalog.json`.

## Temporarily disabled species

Eighteen species remain disabled because the reviewed naturalistic collections do not currently provide a suitable model and motion treatment for them: regular fish, schooling fish, clownfish, parrotfish, blue tang, angelfish, butterflyfish, grouper, Moorish idol, wobbegong, eel, crab, lobster, mantis shrimp, seal, starfish, turtle and sand eel.

They remain in the simulation's species catalogue and behaviour code, but their prevalence is forced to zero and their controls are disabled. No Quaternius, Gobkit, static reef-study or unrelated animal stand-in is used to make them appear enabled.

## Visual quality caveat

These models are a clear step away from the cartoon asset packs, but they are still AI-generated smooth-shaded models with untextured materials. They are not photogrammetry, high-end textured production assets or anatomically rigged creatures. The current priority is a coherent naturalistic silhouette and species identity, with procedural movement. A later asset pass can replace individual models with higher-fidelity hand-authored or scanned assets without changing the simulation interface.
