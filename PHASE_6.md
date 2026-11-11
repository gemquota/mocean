# Phase 6 · 3D Environment, Seabed and Water

**Status:** In progress · authorised 11 November 2026.  
**Branch:** `phase-6-environment`  
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

**Spike implementation:** `phase6-spike.html` loads pinned Three.js r180 from jsDelivr and renders a deterministic heightfield plus low-poly rock masses with directional and hemisphere lighting. `src/phase6/renderer.js` owns camera and renderer lifecycle only; it does not import or mutate simulation state. `tests/phase6-renderer.test.js` covers camera projection, capability detection and renderer lifecycle. Automated test status is pending; browser visual verification has not yet been performed.

### P6-2 · Spatial seabed and terrain

- [ ] Replace the simple analytic floor presentation with irregular 3D terrain at multiple elevations.
- [ ] Add coherent rock formations, shelves, overhangs, arches, crevasses, caves and sand channels.
- [ ] Keep collision/ground-contact queries consistent with visible terrain. A visual cave must not be solid floor in the simulation, and vice versa.
- [ ] Use deterministic generation/seeds so tests and visual comparisons are reproducible.
- [ ] Ensure benthic species, eels and sheltering creatures still interact plausibly with the new terrain.

### P6-3 · Open-source asset integration

- [ ] Source suitable rocks, seabed materials, coral/environment props and other useful models from repositories with verified redistribution terms.
- [ ] Prefer CC0 assets where quality is appropriate; document each asset's origin and licence.
- [ ] Optimise meshes, textures, material variants and texture sizes for browser delivery.
- [ ] Do not use downloaded animated creature clips as a substitute for simulation-driven locomotion.

### P6-4 · Water and suspended matter

- [ ] Add depth-dependent colour absorption, haze and distance attenuation.
- [ ] Add restrained volumetric-looking light shafts, drifting particulate/plankton and occasional bubbles.
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
