# Phase 6 · 3D Environment, Seabed and Water

**Status:** In progress · authorised 11 November 2026.  
**Production baseline:** `main` · the terrain and animated-model integration has been merged.  
**Scope authority:** The user explicitly authorised Phase 6 after requesting open-source 3D assets, complex seabed geometry (elevations, rocks, ledges, overhangs and crevasses), realistic underwater water effects and lighting/bloom.

## Goal

Turn the mixed-species habitat into a convincing underwater environment without degrading creature simulation, locomotion, interaction, or ordinary-browser performance. The environment must be a real spatial scene, not a flat backdrop decorated with fake depth cues.

`schooling.html` retains its Canvas-based habitat and species renderers, now augmented by a volumetric voxel terrain projection and a transparent Three.js overlay for thirteen naturalistic marine models with procedural swimming. `src/schooling.js` owns creature state and the fixed-step simulation; `src/phase6/voxel-field.js` supplies the shared signed-distance field used by terrain extraction and creature contact. This is a staged hybrid renderer, not yet a fully unified 3D scene: cross-renderer depth ordering, water/light integration and performance on ordinary hardware remain open.

## Non-negotiable constraints

- Preserve the existing simulation state and fixed-step update pathway. Rendering observes creature state; it must not steer or rewrite it.
- Keep the current habitat as the visual/behavioural regression baseline.
- Any 3D creature representation must derive its pose/deformation from live simulation state (position, orientation, gait/phase and species-specific movement). Do not replace it with canned swimming clips.
- Environment geometry may be static or procedurally generated, but must support real depth, occlusion, overhangs and caves.
- Prefer openly licensed assets with verified per-asset licences. Record source, licence and attribution requirements. Do not assume every model on an asset site has the same licence.
- Progressive quality tiers and bounded geometry/effect budgets are required. Reduced-motion/reduced-quality fallback must not stop the simulation.
- Keep habitat controls explicit and honest: configuration controls must change real simulation parameters, and defaults must remain usable without opening the panel.
- Tests are necessary but not sufficient: verify the actual scene, depth ordering, visual quality, frame time and preservation of existing creatures.

## Baseline audit · P6-0

**Assistant complete · 11 November 2026.**

- `schooling.html` owns the live fixed-camera habitat, Canvas world layer, inline species renderers and transparent Three.js creature overlay.
- `src/schooling.js` owns creature state, group behaviour and the fixed-step simulation. The shared voxel density field in `src/phase6/voxel-field.js` now supplies visible terrain extraction and creature contact.
- Reefs, coral, anemones, seagrass, kelp and plankton remain part of the Canvas habitat layer; suitable imported fish models use the Three.js overlay.
- The repository remains dependency-light: browser modules load pinned Three.js from jsDelivr, while Node's built-in test runner handles automated tests.
- The hybrid renderer must be profiled on ordinary hardware. Cross-renderer depth ordering and a fully unified material/lighting pipeline remain unresolved.

## Subgoals and atomic tasks

### P6-1 · Renderer architecture and compatibility spike

**Implementation decision: staged hybrid rendering.** The live Canvas habitat remains the fallback and regression baseline, while a transparent Three.js overlay handles selected imported fish models. Separate spike and terrain-study pages remain available for isolated renderer and geometry work.

- [x] Compare single-scene migration with staged integration; select staged integration for the first compatibility spike.
- [x] Define a camera/projection contract matching the current habitat's camera position, target, world-up and focal-length rule (`src/phase6/renderer.js`).
- [x] Add explicit WebGL2 capability detection and an isolated fallback message (`phase6-spike.html`).
- [ ] Browser-verify WebGL initialisation and graceful fallback on unsupported devices.
- [ ] Establish a reproducible baseline for startup time, frame time, memory/geometry budget and creature counts.
- [x] Keep the initial renderer and terrain studies isolated until selected modules pass integration checks; the live habitat entry point now includes the voxel terrain and selected animated-model overlay.

**Spike implementation:** `phase6-spike.html` loads pinned Three.js r180 from jsDelivr and renders a deterministic heightfield, irregular rock clusters and half-ring arch formations with directional and hemisphere lighting. `src/phase6/renderer.js` owns camera and renderer lifecycle only; it does not import or mutate simulation state. `src/phase6/terrain.js` generates seeded, bounded rock/arch placements and exposes a preliminary arch-aperture query. `tests/phase6-renderer.test.js` and `tests/phase6-terrain.test.js` cover camera projection, capability detection, renderer lifecycle, deterministic layout and feature bounds. PR #44 was merged to main as `6f755e7`; its core-test and GitHub Pages deployment workflows both succeeded. Browser visual verification and performance profiling have not yet been performed.

### P6-2 · Spatial seabed and terrain

**Prototype and live integration:** isolated terrain studies contain seeded heightfields, irregular rock clusters, arch meshes, raised shelves and depressed sand channels. The live habitat now extracts a volumetric terrain mesh from a shared signed-distance field and uses that same field for creature contact. The richer terrain study remains a separate review surface; the live hybrid renderer still needs visual and performance acceptance.

- [x] Replace the simple analytic floor presentation with a volumetric terrain mesh extracted from the shared signed-distance field at multiple elevations.
- [x] Add seeded raised rock shelves with finite solid volume and queryable top/underside normals.
- [x] Add smooth, rotated, finite-length depressed sand channels, sediment colour cues, and use the composed floor for the terrain mesh, spatial queries and feature placement.
- [ ] Extend the prototype to coherent overhangs, crevasses with steeper walls, and larger connected cave systems.
- [x] Add an initial renderer-independent signed-distance query for the seabed, ellipsoidal boulders and finite-depth hollow arch ribs (`src/phase6/spatial-query.js`).
- [x] Return outward surface normals and feature identity; add a sphere-clearance helper for future contact checks.
- [x] Add oriented box signed-distance queries for raised shelves, including top and underside clearance.
- [ ] Validate query distances against the exact rendered mesh geometry, including faceted boulder geometry and arch transforms.
- [x] Use deterministic generation/seeds for initial rock and arch placement (`src/phase6/terrain.js`).
- [x] Integrate voxel contact with benthic and other creatures using the shared density field; preserve the sand-eel burrowing exception. Full path planning through caves remains open.

**Spatial-query boundary:** positive signed distance means open water; negative means inside a terrain solid. The live voxel field is used for terrain extraction and creature contact. The earlier analytic-floor/ellipsoid/box/arch query remains a separate prototype and should not be confused with the integrated voxel-field path. The prototype now renders faceted sphere-based boulders using the same ellipsoidal scale parameters as the query. Raised shelves are rendered as instanced-shape box geometry (shared geometry/materials) and use matching oriented-box distance queries. The seabed heightfield and generated rock/arch placement both use the same smoothed crevasse depression function. The query remains a smooth signed-distance approximation to the triangulated mesh, so final collision integration still requires a measured surface-error tolerance.

**Visual rework candidate · 11 November 2026:** the first renderer spike was intentionally rejected as visually weak: its flat low-resolution heightfield, ellipsoid boulders, box shelves and decorative half-torus arches did not read as a coherent reef. The replacement study in `phase6-spike.html` uses a 240 × 172 multi-scale heightfield, broad reef ridges and broken ledges, smooth crevasse cuts, displaced faceted boulder meshes with clustered talus, irregular extruded shelf geometry, and hollow extruded rock arches. A subtle animated sediment/caustic texture, shadowed directional lighting, a bounded 720-point water column and restrained bloom add depth cues. The pure surface builder lives in `src/phase6/terrain-surface.js` and has independent topology, bounds, determinism and finite-value tests. This remains a terrain-only renderer study: it does not yet contain the 30-species habitat, and visual/browser/performance verification remains pending. No phase subgoal is being marked complete from source inspection alone.

### P6-3 · Open-source asset integration

**Naturalistic marine model pipeline established:** `ASSET_SOURCES.md` records the thirteen species-matched CC0 smooth-shaded GLBs now used by the live habitat. The Pages workflow downloads them from stable 3DAssets.dev CDN URLs and validates their glTF structure. They are static posed studies, so the Three.js overlay adds procedural body, tail, ray-wing and jellyfish-bell motion. The old Quaternius/Gobkit cartoon packs are no longer staged or rendered. Environment props and materials still require individual licence review, optimisation and visual acceptance.

- [x] Identify a preferred CC0 source and verify its redistribution terms (`https://polyhaven.com/license`).
- [x] Record initial model/texture candidates and reject raw assets that exceed a sensible browser budget (`ASSET_SOURCES.md`).
- [ ] Source suitable rocks, seabed materials, coral/environment props and other useful models from repositories with verified redistribution terms.
- [ ] Prefer CC0 assets where quality is appropriate; document each asset's origin and licence.
- [ ] Optimise meshes, textures, material variants and texture sizes for browser delivery.
- [ ] Do not use downloaded animated creature clips as a substitute for simulation-driven locomotion.

### P6-4 · Water and suspended matter

**Prototype started:** `src/phase6/water.js` provides per-channel Beer-Lambert transmittance and a scattering-colour blend; the spike uses the resulting blue-green attenuation colour for distance fog. A seeded 260-point suspended-particle field drifts slowly without reading or modifying simulation state. This is an approximation, not volumetric light transport or depth-correct per-fragment absorption.

- [x] Add a deterministic per-channel absorption function and water-scattering colour blend (`src/phase6/water.js`).
- [x] Apply a restrained depth-attenuation fog colour in the isolated WebGL spike.
- [x] Add a bounded, seeded suspended-particle field with subtle drift and no simulation coupling.
- [ ] Add true depth-aware per-fragment absorption and distance attenuation.
- [ ] Add restrained volumetric-looking light shafts and occasional bubbles.
- [ ] Add surface ripples/swell and intermittent chop where visible in the fixed camera.
- [ ] Preserve the existing plankton layer's movement character while integrating it into the new depth model.

### P6-5 · Lighting and post-processing

- [ ] Establish a coherent underwater light direction, ambient fill and soft contact shadows.
- [ ] Add restrained bloom/highlight response only after materials and exposure are balanced.
- [ ] Keep post-processing passes resolution-aware and quality-tiered; avoid full-resolution expensive effects on every frame.
- [ ] Ensure colour and contrast retain creature silhouette readability.

### P6-6 · Creature/render integration

- [x] Integrate the live 30-species simulation with shared voxel terrain contact without changing simulation authority.
- [x] Add a Three.js overlay for suitable animated fish models driven by live creature position, heading and swimming speed; retain dedicated renderers for species without reviewed naturalistic models.
- [ ] Resolve cross-renderer depth ordering, scale and occlusion across the full habitat.
- [ ] Compare representative species and population settings against the Canvas baseline on ordinary hardware.

### P6-7 · Verification and acceptance

- [x] Add deterministic signed-distance field tests, finite mesh/index checks, outward-winding and watertight sphere regression checks.
- [x] Route live agent terrain contact through the same voxel density field used for mesh extraction; retain the sand-eel burrowing exception.
- [x] Add live habitat renderer integration regression tests and voxel terrain contact tests.
- [ ] Run the full existing test suite and inspect CI results.
- [ ] Verify no startup freeze, blank canvas, WebGL context loss loop or animation fault.
- [ ] Measure frame time and memory at representative populations on ordinary hardware.
- [ ] Capture before/after visual evidence and inspect it at desktop and mobile aspect ratios.
- [ ] User independently reviews the deployed main Schooling habitat at desktop and mobile sizes before Phase 6 completion.

## Terrain geology iteration · 12 November 2026

**Merged:** PR #49, commit `696d0bf790db1505142387c20b4647cd822f8904` from `terrain-geology-upgrade`.

- Expanded the shared signed-distance field with six connected ridge spines, four rotated finite shelf formations, sixteen embedded boulders/talus elements, and a branched cave network with side galleries.
- Kept terrain contact smooth at creature scale; fine breakup comes from nested geological forms rather than high-frequency collision noise.
- Increased the integrated voxel extraction resolution from 66 × 26 × 51 to at least 82 × 32 × 64. Static geological feature descriptors are hoisted out of the per-sample path.
- Stabilised QEF vertices at sharp feature junctions with a deterministic sub-millimetre perturbation, preserving shared topology without emitting degenerate faces.
- Added deterministic field assertions for ridge, boulder, shelf and cave-gallery samples. The existing topology checks enforce outward-facing triangles, no non-manifold edges and boundary-only open edges.
- PR validation passed 160/160 tests; the production Pages build and deployment for the merge commit succeeded. Browser visual inspection and ordinary-hardware startup/frame-time/memory profiling remain outstanding. This is a geometry pass, not a material/lighting pass, and Phase 6 remains in progress.

## Habitat terrain and vegetation pass · 12 November 2026

**Merged:** PR #50, commit `a9cdc43a137aa83b435b74d1ec786c845acdbd9d`.

- Population control defaults to 10–200 creatures in steps of ten. A one-time local migration clears any older population override; subsequent long-press custom bounds remain saved and are restored on this device.
- Terrain adds angular superellipsoid outcrops, three deep open ravines with steep walls and solid lower floors, and three enlarged cave chambers with stepped connectors and side galleries. All geometry remains in the shared voxel signed-distance field used for rendering and collision.
- Added deterministic terrain-aware vegetation placement. Seagrass is sampled onto near-horizontal sediment, kelp onto sloping reef shoulders and ledges, and attached macroalgae onto exposed vertical faces including ravine/cave walls.
- Increased kelp presence while removing the previous scattered, circular bed placement. Coral colonies and anemones are inside the terrain footprint and their root heights are sampled from the voxel surface.
- Validation: 163/163 Node tests pass, including terrain topology, ravine/cave feature, deterministic vegetation and root-clearance checks. GitHub Pages build and production deployment for the merge commit succeeded.
- Browser visual review and ordinary-hardware startup/frame-time/memory profiling remain outstanding. Phase 6 remains in progress and is not marked complete.

## Acceptance criteria

Phase 6 is not complete until the environment has visibly real 3D depth and irregular terrain, including overhangs/caves; lighting and water effects improve realism without obscuring creatures; existing species remain visible and animated by the simulation; benthic movement agrees with visible ground; performance remains acceptable; tests pass; documentation/evidence are updated; and the user confirms after review.

## Known risks

- The habitat keeps its established Canvas projection for coral, invertebrates and disabled species. A transparent Three.js layer now composites naturalistic marine GLBs with procedural swimming over that view; cross-renderer depth ordering remains a known limitation.
- The original `seabedHeight(x, z)` remains as the broad base profile, but the visible seabed is now extracted from a signed-distance volume. Creature contact uses the same volume field; full path planning through cave networks is not yet implemented.
- The habitat already contains 30 species, but only suitable fish use the imported animated-model overlay. Other species retain their dedicated Canvas renderers; do not replace them with unrelated GLBs merely to increase model coverage.
- Visual fidelity is not evidence of physical correctness. Keep simulation and rendering responsibilities separate.

## Phase gate

**Authorised to begin:** 11 November 2026.  
**Assistant completion:** partial · terrain/contact and selected animated-model integration merged; remaining water, lighting, depth-ordering and performance criteria are open.  
**User confirmation:** pending independent review.  
**Phase 7:** not authorised by this document.

## Volumetric terrain and Osmocean model port · 12 November 2026

**Merged integration baseline:** PR #48, followed by the terrain geology and habitat vegetation integrations in PRs #49 and #50.

### Integrated volumetric terrain

- Added `src/phase6/dual-contouring.js` with multi-component QEF-constrained cell vertices, gradient normals and shared-edge quads. Ambiguous face crossings are separated into distinct surface patches; winding is corrected per triangle. Sphere and integrated terrain tests check watertight/manifold topology, outward normals and boundary-only open edges.
- Added `src/phase6/voxel-field.js` as the common signed-distance source for the visible terrain and live creature contact. It combines the base seabed, connected limestone masses, two tunnel runs and a cave chamber.
- Added `src/phase6/habitat-voxel-terrain.js`; the live `schooling.html` now projects the extracted volumetric mesh into its fixed-camera habitat canvas and caches the static raster between camera/viewport changes.
- The same density field is attached to each school and queried after each simulation step. Benthic agents are initially seated on the nearest upward-facing voxel surface, remain there between steps, and are re-seated only if they drift clear; all non-burrowing creatures are projected out of solid terrain. Sand eels remain exempt so their existing burrowing behaviour survives.
- The standalone `voxel-terrain-study.html` remains available for isolated inspection. The integrated habitat uses a single world mesh, not yet streamed chunks; worker generation and LOD remain future optimisation work.

### Naturalistic marine model integration

- Replaced the stylized Quaternius/Gobkit live creature models with thirteen species-exact CC0 GLBs from 3DAssets.dev's Ocean Animals and Ocean Giants packs. The selected GLBs are static smooth-shaded studies rather than rigged clips; procedural vertex deformation now supplies the swim cycle. Seventeen species remain disabled until suitable naturalistic models are sourced.
- The Pages build now stages the complete fish bundle and original licence under `assets/models/osmocean/species/`.
- Added `src/phase6/osmocean-marine-models.js`: cached GLTF loading, skeleton-safe cloning, longest-axis normalisation, per-instance animation mixers and species-to-model mapping.
- The live `schooling.html` now mounts a transparent Three.js overlay. Suitable fish models follow the simulation's live position and forward vector; animation playback speed is scaled by swimming speed. The procedural 2D fish remains visible until its GLB has loaded, then yields to the model.
- The naturalistic model set is inspectable through `creature-model-review.html`, which previews each species-specific model and its procedural motion.
- Schooling fish retain the light procedural renderer to avoid creating dozens of skeletal animation mixers for the densest shoal. Whale shark, mammals, rays, eels and crustaceans retain their dedicated renderers because the pinned Osmocean bundle does not contain equivalent suitable animated rigs. No animal is silently replaced with an unrelated fish.

### Verification boundary

Merged in PR #48 (commit `f9a2051c993102c8dff26d7e723b2fad1f45d247`) and deployed to GitHub Pages. Main-branch CI passed 160/160 tests; the Pages build and deployment both succeeded, including the pinned 35-model CC0 asset bundle. Targeted runtime checks found no non-manifold terrain edges or inward-facing triangles, and benthic/mixed-school simulations remained finite in tested runs. Browser visual inspection and ordinary-hardware frame-time/memory profiling are still outstanding; cross-renderer depth ordering between the WebGL fish layer and remaining Canvas creatures is a known limitation. Phase 6 remains in progress pending independent user review; no Phase 7 gate is implied.
