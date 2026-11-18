# Procedural voxel creature experiment

## Isolation

This experiment lives on `experiment/procedural-voxel-creatures`, based on the planetary-navigation work branch. It does not change `main`, does not deploy to the production Pages site, and is not merged. The connected GitHub tooling currently supports branch creation and pull requests but does not expose the repository-fork operation, so this is an isolated feature branch rather than a separate GitHub fork.

## Representation

The renderer no longer loads creature GLBs. It builds each creature from a species body-plan signed-distance field, samples that volume on a compact voxel lattice, and greedily merges coplanar exposed voxel faces into a small surface mesh. Internal voxel faces are omitted. Species share anatomical families (fusiform fish, streamlined predators, cetaceans, rays, eels, crustaceans, jellyfish, turtles, seals, starfish, seahorses, sea dragons, mola and anglerfish) but retain per-family shape differences and colour palettes.

Each species mesh is created once and rendered through an `InstancedMesh` batch. Instance transforms come from the existing simulation position and heading. The existing travelling-wave shader is applied to the voxel surface for fish, predator, eel, ray and cetacean-like movement; pulse-like species use a small scale oscillation. The animation phase is derived from the same persistent fish identity and continues to advance while the planetary overview hides local creatures.

The Canvas creature renderer remains disabled. The GLB model adapter and naturalistic GLB renderer are not imported by this experimental page. If voxel generation fails, the creature is hidden and a warning is logged; it does not silently fall back to a 2D sprite.

## Scope and known limitations

- This is a deliberately coarse, stylized voxel surface. It is not a high-resolution anatomical reconstruction.
- Body-plan SDFs are handcrafted approximations, not scanned morphology or validated animal data.
- Appendages and fins are currently static volume features; their motion is not yet independently articulated.
- The travelling-wave shader deforms the surface but does not yet feed voxel deformation back into hydrodynamic thrust. The existing simulation remains the authority for propulsion and translation.
- The initial implementation targets all 33 species listed by the schooling habitat, with one instanced batch per species and a capacity of 1,000 total entities.
- Performance and visual quality must be measured in-browser. Passing geometry tests does not establish frame rate or believable swimming.

## Review criteria

1. Silhouette reads as the intended body plan at the normal habitat camera distance.
2. Voxel scale is visible without making the creature look like a stack of disconnected cubes.
3. Body wave remains continuous from shoulder to tail and does not tear or visibly stretch the head.
4. Fins, rays, tentacles and limbs remain recognisable at typical entity sizes.
5. The 1,000-entity target is benchmarked against the existing instanced GLB renderer.
6. Existing simulation position, heading, collision, feeding and behaviour remain unchanged.
