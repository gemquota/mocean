# Phase 6 · 3D Environment, Seabed and Water

**Status:** In progress · authorised 11 November 2026.  
**Active branch:** `phase-6-spatial-terrain`  
**Scope authority:** The user explicitly authorised Phase 6 after requesting open-source 3D assets, complex seabed geometry (elevations, rocks, ledges, overhangs and crevasses), realistic underwater water effects and lighting/bloom.

## Goal

Turn the mixed-species habitat into a convincing underwater environment without degrading creature simulation, locomotion, interaction, or ordinary-browser performance. The environment must be a real spatial scene, not a flat backdrop decorated with fake depth cues.

The current `schooling.html` uses one 2D Canvas renderer for the habitat. Creature geometry is drawn in screen space from projected world coordinates; the simulation and seabed-height function live in `src/schooling.js`. There is no WebGL renderer, 3D asset pipeline, material system, or post-processing pipeline in the current habitat. A true 3D environment therefore requires a deliberate rendering integration, not simply importing GLB files into the existing Canvas context.

## Non-negotiable constraints

- Preserve the existing simulation state and fixed-step update pathway. Rendering observes creature state; it must not steer or rewrite it.
- Keep the current habitat as the visual/behavioural regression baseline.
- Any 3D creature representation must derive its pose/deformation from live simulation state (position, orientation, gait/phase and species-specific movement). Do not replace it with canned swimming clips.
- Environment geometry may be static or procedurally generated, but must support real depth, occlusion, overhangs and caves.
- Prefer openly licensed assets with verified per-asset licences. Record source, licence and attribution requirements. Do not assume every model on an asset site has the same licence.
- Progressive quality tiers and bounded geometry/effect budgets are required. Reduced-motion/reduced-quality fallback must not stop the simulation.
- Do not add user-facing configuration panels. Environment parameters are predefined.
- Tests are necessary but not sufficient: verify the actual scene, depth ordering, visual quality, frame time and preservation of existing creatures.

## Baseline audit · P6-0

**Assistant complete · 11 November 2026.**

- `schooling.html` owns the current fixed-camera Canvas 2D drawing loop and inline species renderers.
- `src/schooling.js` owns creature state and a deterministic analytic `seabedHeight(x, z)`; benthic agents use this function for ground contact.
- Existing reefs, coral, anemones, seagrass, kelp and plankton are drawn with Canvas primitives.
- The repository has no runtime dependency or bundler in `package.json`; its only script is Node's built-in test runner.
- The current renderer has no mesh/material/light/shadow/post-processing abstractions. A WebGL/Three.js integration must be evaluated against GitHub Pages static hosting and the existing single-file habitat entry point.
- Existing performance work reduced habitat drawing to 24 Hz and capped device pixel ratio at 2. The new renderer must be profiled against this baseline.

## Subgoals and atomic tasks

### P6-1 · Renderer architecture and compatibility spike

**Implementation decision (provisional): staged WebGL scene, with the existing Canvas habitat retained as the fallback and regression baseline.** A separate spike page avoids destabilising the live habitat while the renderer, camera and geometry budgets are evaluated. If the spike validates, the next integration step is a shared scene/camera contract with the current Canvas creature layer before migrating species one group at a time.

- [x] Compare single-scene migration with staged integration; select staged integration for the first compatibility spike.
- [x] Define a camera/projection contract matching the current habitat's camera position, target, world-up and focal-length rule (`src/phase6/renderer.js`).
- [x] Add explicit WebGL2 capability detection and an isolated fallback message (`phase6-spike.html`).
- [ ] Browser-verify WebGL initialisation and graceful fallback on unsupported devices.
- [ ] Establish a reproducible baseline for startup time, frame time, memory/geometry budget and creature counts.
- [x] Keep all work isolated on this branch; the existing live habitat entry point remains unchanged.

**Spike implementation:** `phase6-spike.html` loads pinned Three.js r180 from jsDelivr and renders a deterministic heightfield, irregular rock clusters and half-ring arch formations with directional and hemisphere lighting. `src/phase6/renderer.js` owns camera and renderer lifecycle only; it does not import or mutate simulation state. `src/phase6/terrain.js` generates seeded, bounded rock/arch placements and exposes a preliminary arch-aperture query. `tests/phase6-renderer.test.js` and `tests/phase6-terrain.test.js` cover camera projection, capability detection, renderer lifecycle, deterministic layout and feature bounds. PR #44 was merged to main as `6f755e7`; its core-test and GitHub Pages deployment workflows both succeeded. Browser visual verification and performance profiling have not yet been performed.

### P6-2 · Spatial seabed and terrain

**Prototype extended:** the isolated renderer spike now contains a seeded heightfield, irregular rock clusters, arch meshes, raised shelf slabs and smooth depressed sand channels. The channels are part of the generated heightfield, with sediment shading and a matching floor query. Shelf undersides remain open water and are represented as solid oriented boxes in the spatial query. This is scene-prototype geometry only; the live habitat's ground-contact model is unchanged.

- [ ] Replace the simple analytic floor presentation with irregular 3D terrain at multiple elevations.
- [x] Add seeded raised rock shelves with finite solid volume and queryable top/underside normals.
- [x] Add smooth, rotated, finite-length depressed sand channels, sediment colour cues, and use the composed floor for the terrain mesh, spatial queries and feature placement.
- [ ] Extend the prototype to coherent overhangs, crevasses with steeper walls, and larger connected cave systems.
- [x] Add an initial renderer-independent signed-distance query for the seabed, ellipsoidal boulders and finite-depth hollow arch ribs (`src/phase6/spatial-query.js`).
- [x] Return outward surface normals and feature identity; add a sphere-clearance helper for future contact checks.
- [x] Add oriented box signed-distance queries for raised shelves, including top and underside clearance.
- [ ] Validate query distances against the exact rendered mesh geometry, including faceted boulder geometry and arch transforms.
- [x] Use deterministic generation/seeds for initial rock and arch placement (`src/phase6/terrain.js`).
- [ ] Integrate spatial contact/navigation with benthic species, eels and sheltering creatures only after visual/query agreement is demonstrated.

**Spatial-query boundary:** positive signed distance means open water; negative means inside a terrain solid. The current query uses the same composed analytic floor as the rendered heightfield, ellipsoid approximations for rocks, oriented box volumes for shelves and a finite-depth half-torus approximation for arches. It is not yet used by the live simulation. The prototype now renders faceted sphere-based boulders using the same ellipsoidal scale parameters as the query. Raised shelves are rendered as instanced-shape box geometry (shared geometry/materials) and use matching oriented-box distance queries. The seabed heightfield and generated rock/arch placement both use the same smoothed crevasse depression function. The query remains a smooth signed-distance approximation to the triangulated mesh, so final collision integration still requires a measured surface-error tolerance.

**Visual rework candidate · 11 November 2026:** the first renderer spike was intentionally rejected as visually weak: its flat low-resolution heightfield, ellipsoid boulders, box shelves and decorative half-torus arches did not read as a coherent reef. The replacement study in `phase6-spike.html` uses a 240 × 172 multi-scale heightfield, broad reef ridges and broken ledges, smooth crevasse cuts, displaced faceted boulder meshes with clustered talus, irregular extruded shelf geometry, and hollow extruded rock arches. A subtle animated sediment/caustic texture, shadowed directional lighting, a bounded 720-point water column and restrained bloom add depth cues. The pure surface builder lives in `src/phase6/terrain-surface.js` and has independent topology, bounds, determinism and finite-value tests. This remains a terrain-only renderer study: it does not yet contain the 30-species habitat, and visual/browser/performance verification remains pending. No phase subgoal is being marked complete from source inspection alone.

### P6-3 · Open-source asset integration

**Source shortlist started:** `ASSET_SOURCES.md` records Poly Haven's CC0 licence and four reviewed rock/cliff candidates, including triangle counts and download-size concerns. No binary asset has been downloaded or integrated yet.

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

- [ ] Integrate the current 30-species simulation with the spatial scene without changing simulation authority.
- [ ] Drive 3D creature orientation and deformation from existing state; retain species-specific locomotion.
- [ ] Preserve depth ordering, scale, occlusion and benthic contact.
- [ ] Compare representative species and population settings against the Canvas baseline.

### P6-7 · Verification and acceptance

- [x] Add deterministic signed-distance field tests, finite mesh/index checks, outward-winding and watertight sphere regression checks.
- [x] Route live agent terrain contact through the same voxel density field used for mesh extraction; retain the sand-eel burrowing exception.
- [x] Add live habitat renderer integration regression tests and voxel terrain contact tests.
- [ ] Run the full existing test suite and inspect CI results.
- [ ] Verify no startup freeze, blank canvas, WebGL context loss loop or animation fault.
- [ ] Measure frame time and memory at representative populations on ordinary hardware.
- [ ] Capture before/after visual evidence and inspect it at desktop and mobile aspect ratios.
- [ ] User independently reviews the deployed feature branch before any merge or phase completion claim.

## Terrain geology iteration · 12 November 2026

**Merged:** PR #49, commit `696d0bf790db1505142387c20b4647cd822f8904` from `terrain-geology-upgrade`.

- Expanded the shared signed-distance field with six connected ridge spines, four rotated finite shelf formations, sixteen embedded boulders/talus elements, and a branched cave network with side galleries.
- Kept terrain contact smooth at creature scale; fine breakup comes from nested geological forms rather than high-frequency collision noise.
- Increased the integrated voxel extraction resolution from 66 × 26 × 51 to at least 82 × 32 × 64. Static geological feature descriptors are hoisted out of the per-sample path.
- Stabilised QEF vertices at sharp feature junctions with a deterministic sub-millimetre perturbation, preserving shared topology without emitting degenerate faces.
- Added deterministic field assertions for ridge, boulder, shelf and cave-gallery samples. The existing topology checks enforce outward-facing triangles, no non-manifold edges and boundary-only open edges.
- PR validation passed 160/160 tests; the production Pages build and deployment for the merge commit succeeded. Browser visual inspection and ordinary-hardware startup/frame-time/memory profiling remain outstanding. This is a geometry pass, not a material/lighting pass, and Phase 6 remains in progress.

## Habitat terrain and vegetation pass · 12 November 2026

**Implementation branch:** `habitat-ravines-vegetation` · pending CI and review.

- Population control defaults to 10–200 creatures in steps of ten. Any previous population override is cleared once so the requested range takes effect; later long-press custom bounds are saved and restored normally, as are other sliders.
- Terrain adds angular superellipsoid outcrops, three deep open ravines with steep walls and solid lower floors, and three enlarged cave chambers with stepped connectors and side galleries. All geometry remains in the shared voxel signed-distance field used for rendering and collision.
- Added a deterministic terrain-aware vegetation layout. Seagrass is sampled onto near-horizontal sediment, kelp onto sloping reef shoulders and ledges, and attached macroalgae onto exposed vertical faces including ravine/cave walls.
- Increased kelp presence while reducing the previous scattered, circular bed placement. Coral colonies and anemones have been moved inside the terrain footprint and their root heights are sampled from the voxel surface.
- Added field assertions for ravines, angular rock, cave chambers and connectors, plus vegetation normal/clearance/determinism tests. Browser visual review and startup/frame-time profiling remain required before acceptance.

## Acceptance criteria

Phase 6 is not complete until the environment has visibly real 3D depth and irregular terrain, including overhangs/caves; lighting and water effects improve realism without obscuring creatures; existing species remain visible and animated by the simulation; benthic movement agrees with visible ground; performance remains acceptable; tests pass; documentation/evidence are updated; and the user confirms after review.

## Known risks

- The habitat keeps its established Canvas projection for coral, invertebrates and species without matching rigs. A transparent Three.js layer now composites animated fish GLBs over that view; cross-renderer depth ordering remains a known limitation.
- The original `seabedHeight(x, z)` remains as the broad base profile, but the visible seabed is now extracted from a signed-distance volume. Creature contact uses the same volume field; full path planning through cave networks is not yet implemented.
- A 30-species migration is a substantial compatibility task. Start with environment geometry and a small representative creature set; do not port all renderers in one untestable change.
- Visual fidelity is not evidence of physical correctness. Keep simulation and rendering responsibilities separate.

## Phase gate

**Authorised to begin:** 11 November 2026.  
**Assistant completion:** pending subgoal evidence.  
**User confirmation:** pending independent review.  
**Phase 7:** not authorised by this document.

## Volumetric terrain and Osmocean model port · 12 November 2026

**Active implementation branch:** `phase-6-voxel-and-osmocean-models`.

### Integrated volumetric terrain

- Added `src/phase6/dual-contouring.js` with multi-component QEF-constrained cell vertices, gradient normals and shared-edge quads. Ambiguous face crossings are separated into distinct surface patches; winding is corrected per triangle. Sphere and integrated terrain tests check watertight/manifold topology, outward normals and boundary-only open edges.
- Added `src/phase6/voxel-field.js` as the common signed-distance source for the visible terrain and live creature contact. It combines the base seabed, connected limestone masses, two tunnel runs and a cave chamber.
- Added `src/phase6/habitat-voxel-terrain.js`; the live `schooling.html` now projects the extracted volumetric mesh into its fixed-camera habitat canvas and caches the static raster between camera/viewport changes.
- The same density field is attached to each school and queried after each simulation step. Benthic agents are initially seated on the nearest upward-facing voxel surface, remain there between steps, and are re-seated only if they drift clear; all non-burrowing creatures are projected out of solid terrain. Sand eels remain exempt so their existing burrowing behaviour survives.
- The standalone `voxel-terrain-study.html` remains available for isolated inspection. The integrated habitat uses a single world mesh, not yet streamed chunks; worker generation and LOD remain future optimisation work.

### Osmocean animated model integration

- Audited the pinned Osmocean asset source `Vitexus/ishtaria-client@f42095c120c29a892c0c221bdc8357ac982ccfca`. Its Quaternius Animated Fish Bundle includes 35 low-poly animated fish GLBs and a CC0 licence.
- The Pages build now stages the complete fish bundle and original licence under `assets/models/osmocean/species/`.
- Added `src/phase6/osmocean-marine-models.js`: cached GLTF loading, skeleton-safe cloning, longest-axis normalisation, per-instance animation mixers and species-to-model mapping.
- The live `schooling.html` now mounts a transparent Three.js overlay. Suitable fish models follow the simulation's live position and forward vector; animation playback speed is scaled by swimming speed. The procedural 2D fish remains visible until its GLB has loaded, then yields to the model.
- The full fish bundle is inspectable through `osmocean-model-study.html`, which lists embedded animation clips for the imported models.
- Schooling fish retain the light procedural renderer to avoid creating dozens of skeletal animation mixers for the densest shoal. Whale shark, mammals, rays, eels and crustaceans retain their dedicated renderers because the pinned Osmocean bundle does not contain equivalent suitable animated rigs. No animal is silently replaced with an unrelated fish.

### Verification boundary

Merged in PR #48 (commit `f9a2051c993102c8dff26d7e723b2fad1f45d247`) and deployed to GitHub Pages. Main-branch CI passed 160/160 tests; the Pages build and deployment both succeeded, including the pinned 35-model CC0 asset bundle. Targeted runtime checks found no non-manifold terrain edges or inward-facing triangles, and benthic/mixed-school simulations remained finite in tested runs. Browser visual inspection and ordinary-hardware frame-time/memory profiling are still outstanding; cross-renderer depth ordering between the WebGL fish layer and remaining Canvas creatures is a known limitation. Phase 6 remains in progress pending independent user review; no Phase 7 gate is implied.
