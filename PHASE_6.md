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

- [ ] Unit-test terrain determinism, geometry bounds, normals/indices and ground-contact consistency.
- [ ] Run the full existing test suite and add renderer/terrain regression tests.
- [ ] Verify no startup freeze, blank canvas, WebGL context loss loop or animation fault.
- [ ] Measure frame time and memory at representative populations on ordinary hardware.
- [ ] Capture before/after visual evidence and inspect it at desktop and mobile aspect ratios.
- [ ] User independently reviews the deployed feature branch before any merge or phase completion claim.

## Acceptance criteria

Phase 6 is not complete until the environment has visibly real 3D depth and irregular terrain, including overhangs/caves; lighting and water effects improve realism without obscuring creatures; existing species remain visible and animated by the simulation; benthic movement agrees with visible ground; performance remains acceptable; tests pass; documentation/evidence are updated; and the user confirms after review.

## Known risks

- The current Canvas renderer cannot display genuine 3D meshes, physically based materials, shadow maps or a bloom render pass. A renderer migration or carefully bounded staged integration is required.
- The current `seabedHeight(x, z)` is a single-valued heightfield and cannot represent overhangs or caves. Ground contact and navigation need a terrain query that can represent more than one surface at a given horizontal coordinate.
- A 30-species migration is a substantial compatibility task. Start with environment geometry and a small representative creature set; do not port all renderers in one untestable change.
- Visual fidelity is not evidence of physical correctness. Keep simulation and rendering responsibilities separate.

## Phase gate

**Authorised to begin:** 11 November 2026.  
**Assistant completion:** pending subgoal evidence.  
**User confirmation:** pending independent review.  
**Phase 7:** not authorised by this document.

## Volumetric terrain and Osmocean model port · 12 November 2026

**Active implementation branch:** `phase-6-voxel-and-osmocean-models`.

### Volumetric terrain prototype

- Added `src/phase6/dual-contouring.js`: renderer-independent dual contouring over signed-distance fields. Positive values represent open water; negative values represent solid.
- The extractor builds one QEF-constrained vertex per mixed-sign voxel cell, estimates surface normals from the field gradient, and connects neighbouring cell vertices across sign-changing lattice edges.
- Added tests for finite sphere extraction, hollow/cave-like fields, valid indices and invalid density/bounds input.
- Added `voxel-terrain-study.html`, a standalone Three.js study with multi-scale seabed relief and carved cave volumes. This is deliberately isolated from the live habitat while topology, normals, seams and performance are evaluated.
- Current limitations: no chunk streaming, worker scheduling, LOD transitions, collision integration, or validation against a complete watertight reference mesh. Boundary-edge handling and QEF error need adversarial testing before production use.

### Osmocean animated model port

- Audited `gemquota/osmocean` and its `docs/FISH-MODELS-AND-SOCIAL-ECOLOGY.md`. Its animated marine model tier uses the Quaternius Animated Fish Bundle from pinned upstream commit `f42095c120c29a892c0c221bdc8357ac982ccfca`, recorded as CC0 1.0.
- Added a Pages build step to fetch that pinned source and stage 15 selected GLBs plus the original licence under `assets/models/osmocean/species/`.
- Added `src/phase6/osmocean-marine-models.js`, a Three.js GLTFLoader/SkeletonUtils adapter with cached loads, skeleton-safe instances, axis/scale normalization and per-instance AnimationMixer playback.
- Added `osmocean-model-study.html` to inspect the selected model assets and embedded animation clips independently.
- This first port covers bony fish / shark / sunfish representations only. It does not pretend fish meshes are suitable replacements for crabs, lobsters, rays, whales, turtles, jellyfish, eels or benthic invertebrates. Their existing species-specific renderers must remain until suitable models and animation rigs are sourced.
- The model adapter is not yet connected to the 30-species Canvas renderer. The current habitat is Canvas 2D, so actual replacement requires the staged Three.js creature-render integration and live-state pose bridge described in P6-6. The study page is an asset/animation inspection step, not evidence that live creatures have been replaced.

### Verification boundary

No browser visual/performance verification has yet been recorded for either study page. No model replacement or terrain collision is considered complete. Existing `schooling.html` remains the regression baseline. Phase 6 remains in progress; no Phase 7 gate is implied.
