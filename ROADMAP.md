# Mocean Development Roadmap

**Revision:** 10 · 8 November 2026  
**Status:** Phase 0 confirmed by user; Phase 1 implementation complete and awaiting review of its latest increment.  
**Implementation gate:** Phase 1 has started; remaining phase tasks stay evidence-gated.

## Direction

A hybrid locomotion model: physically grounded forces, inertia, momentum and body deformation, tuned for natural-looking autonomous fish behaviour. The presentation uses interactive mini-simulations and current-vs-target comparisons with balanced technical detail.

## Project planning hierarchy

Every phase is managed through the same explicit hierarchy. This is the project-management structure for building Mocean, not a description of the fish's runtime intelligence:

1. **Project objective:** the overall outcome Mocean is intended to achieve.
2. **Phase goal:** the outcome a phase must deliver.
3. **Subgoals:** coherent capabilities or decisions required to achieve that phase goal.
4. **Atomic tasks:** small, verifiable implementation or documentation actions within each subgoal.
5. **Dependencies:** prerequisites between tasks and subgoals; dependent work cannot be accepted ahead of its prerequisites.
6. **Acceptance criteria:** observable conditions and tests that establish whether each task and subgoal is complete.
7. **Evidence and review gate:** implementation evidence is recorded, then the user independently reviews and approves the phase before work advances.

### Two-key completion record

Each atomic task has two separate completion states:

- **Assistant complete:** checked by the assistant only when implementation and the task's acceptance criteria have been verified with evidence.
- **User confirmed:** checked by the user only after reviewing that evidence and accepting the result.

These states are independent. Assistant completion never implies user confirmation; user confirmation is unavailable until assistant completion is recorded. A phase is not approved merely because its tasks have assistant-complete marks. The user must explicitly approve the phase gate.

The Plan presentation must show both marks as separate columns for every task. The assistant column is an evidence-backed status maintained by development updates; the user column is the user's own review record. Browser-local user marks are a convenience and are not canonical repository evidence.

## Working agreement

1. Implement one phase at a time.
2. Each phase has atomic tasks, tests and explicit acceptance criteria.
3. At phase completion, deploy and present evidence for user review.
4. Do not begin the next phase until the user explicitly approves the previous one, unless the user gives a clear subsequent instruction authorising that next phase.
5. Keep environmental development deferred until locomotion and autonomous movement are convincing.
6. The HTML presentation checklist is a browser-local convenience. This file is the canonical engineering record; update it as work is completed.

## Phase 0 · Architecture and baseline

**Status:** Assistant complete and user confirmed on 8 November 2026.  
**Evidence:** [PHASE_0.md](PHASE_0.md), source audit, acceptance matrix and regression tests. All five Phase 0 tasks have both completion marks.

- [x] P0-1 Document world axes, body axes and quaternion orientation convention.
- [x] P0-2 Define separate translational propulsion and orientation-control pathways, their coupling, and the current implementation boundary.
- [x] P0-3 Specify fixed-camera projection, depth scaling, blur/fade target and re-entry behaviour.
- [x] P0-4 Define locomotion acceptance tests, baseline inventory and known limitations.
- [x] P0-5 Confirm phase boundaries, dependencies and the two-key user approval process.

**Phase 0 gate:** approved by the user on 8 November 2026. All five Phase 0 tasks are independently confirmed.

## Phase 1 · True 3D locomotion foundation

**Status:** All six tasks assistant-complete and user-confirmed on 8 November 2026; awaiting explicit Phase 1 gate approval.

- [x] P1-1 Build a coherent 3D orientation frame with quaternion-based attitude.
- [x] P1-2 Separate thrust, lift and lateral propulsion from pitch, yaw and roll control.
- [x] P1-3 Support forward, reverse, lateral, vertical and diagonal travel.
- [x] P1-4 Make depth travel visibly change perspective scale on the fixed camera.
- [x] P1-5 Add distance-based blur and fade near one-quarter apparent size.
- [x] P1-6 Guide the fish back toward the visible habitat using world-space heading, pitch and body-forward thrust.

### Phase 1 implementation evidence · current increment
- Fixed-camera elevation and framing refinement: the camera is now positioned 22° above the horizontal viewing plane, looking down into the habitat while remaining fixed in world space. Its distance from the habitat origin is increased from 10 to 13 world units, reducing the fish's initial apparent size without pushing its spawn toward the habitat boundary.
- Vertical attitude manoeuvres: upward/downward excursions are selected more often during EXPLORE and TURN states, with larger pitch targets. The attitude controller now commands a stronger but bounded pitch moment so the fish visibly points its nose up or down before its body-forward propulsion carries it along the inclined path. Automated tests check both signs of body pitch and the camera's elevation.
- Smooth manoeuvre refinement: autonomous intent now follows spatial quintic Bézier paths in world space. Their endpoint tangents align with the current and intended swimming directions; a look-ahead tracker steers toward the path without teleporting the fish or forcing its position. Ordinary cruising remains near-level in the XZ plane, while occasional EXPLORE and TURN transitions select upward/downward paths, including diagonal and rare steeper trajectories. A smooth effort envelope modulates tail-driven thrust through each manoeuvre. Drag, inertia and attitude dynamics still determine the actual response, so the fish may lag or overshoot the guide path. Manoeuvre duration is aligned with behaviour-state duration. Regression tests cover path endpoints, tangent continuity, vertical direction and smooth speed variation.


- P1-1 to P1-3: quaternion attitude, separated force/torque channels and 3D propulsion basis remain covered by the passing regression suite.
- P1-4: perspective projection explicitly uses focal scale divided by camera-space depth.
- P1-5: fish-only blur and restrained opacity reduction begin below one-quarter baseline apparent size.
- P1-6: world-space habitat-return guidance blends heading and pitch toward the habitat centre and adds bounded body-forward thrust. It does not reposition the fish or move the camera.
- Horizontal exploration refinement: TURN, EXPLORE and DART now select headings across the full world-up yaw circle instead of accumulating small turns around the initial +X heading. This gives the X/Z plane symmetric directional sampling. Vertical Y excursions are selected only on a minority of EXPLORE transitions (20% by design); the continuous pitch wobble has been removed and residual vertical targets decay between excursions. Regression tests check four-quadrant heading balance and the sparse vertical-selection rate. This changes behavioural intent, not the body-spine deformation axes; independent vertical body curvature remains a separate biomechanical gap.\n- Initial framing refinement: the fish now spawns at world position `(0, 0, -2.8)`, farther from the fixed camera than the habitat origin. This reduces its initial apparent size while keeping it inside the inactive region of the soft habitat boundary; it can still approach naturally. A regression test checks camera-space depth, apparent scale and boundary margin.
- Automated verification: **27 tests passed** in GitHub Actions at commit `425bf1cf048608e93b76dceef709a978e3c1cafa`.
- GitHub Pages deployment succeeded for that commit.

The user independently confirmed P1-4 to P1-6 on 8 November 2026. All six Phase 1 tasks now carry both completion marks. The implementation is backed by 26 passing automated tests and a successful GitHub Pages deployment. Phase 2 remains gated until explicit Phase 1 phase-gate approval.

### Visual verification record · 8 November 2026

A live browser observation of the deployed simulation confirmed one continuously animated fish, a fixed camera, no visible JavaScript errors or blank areas, and normal swimming within the viewport. The user has now independently confirmed the remaining three Phase 1 tasks after review.

## Phase 2 · Elementary movement primitives

- [ ] P2-1 Straight swimming, acceleration, coasting and braking.
- [ ] P2-2 Controlled pitch-up and pitch-down independently of translation.
- [ ] P2-3 Controlled yaw turns with bounded angular acceleration.
- [ ] P2-4 True axial roll around the local head-to-tail axis, independent of pitch and yaw.
- [ ] P2-5 Validate each primitive alone with local-axis visual cues.

## Phase 3 · Basic composite motions

- [ ] P3-1 Proper dive: pitch nose down first, then accelerate forward along the new heading.
- [ ] P3-2 Climb using the same orient-then-propel sequence.
- [ ] P3-3 Turns combined with acceleration, coasting and braking while preserving momentum.
- [ ] P3-4 Axial roll combined with a turn or glide without unwanted yaw spin.
- [ ] P3-5 Smooth transitions between composite motions and calm cruising.

## Phase 4 · Complex manoeuvre arrangements

- [ ] P4-1 Backwards drift while the head turns against current travel direction.
- [ ] P4-2 Momentum-carrying curved reversal and controlled loop-the-loop.
- [ ] P4-3 Continuous dive, braking, reorientation and recovery sequence.
- [ ] P4-4 Full 3D compound sequences with axial roll as a deliberate component.

## Phase 5 · Autonomous natural behaviour

- [ ] P5-1 Implement fish-level persistent behavioural intent and state transitions (runtime behaviour architecture, separate from the project-planning hierarchy).
- [ ] P5-2 Blend cruise, explore, dart, glide, turn and recovery states.
- [ ] P5-3 Plan smooth trajectories with anticipation and obstacle margins.
- [ ] P5-4 Tune energy, rest and movement variation for a convincing rhythm.

## Phase 6 · Environment and water surface (deferred)

- [ ] P6-1 Add sparse bubbles with buoyant rise and size variation.
- [ ] P6-2 Add tiny plankton/detritus with layered drift and parallax.
- [ ] P6-3 Add occasional drifting sticks with believable passive motion.
- [ ] P6-4 Build a visible water surface with travelling ripples and swells.
- [ ] P6-5 Add a basic wind field driving small waves and intermittent chop.

## Phase 7 · Integration and polish

- [ ] P7-1 Tune lighting, depth cues, silhouette and material response.
- [ ] P7-2 Profile simulation and rendering; stabilise fixed-step behaviour.
- [ ] P7-3 Run regression tests and verify public Pages deployment.
- [ ] P7-4 Complete final visual and behavioural acceptance review.

## Baseline source audit

Reviewed on 8 November 2026:
- `src/core/body.js`: 19-node damped elastic spine, travelling muscle wave, tail-motion-derived thrust, pectoral fin response, and `deformPoint` reconstruction.
- `src/core/dynamics.js`: thrust/side/lift force integration, speed-dependent drag, vertical restoring term, soft habitat boundaries, and yaw/pitch/roll angular response.
- `src/main.js`: autonomous behaviour selection, fixed camera basis, perspective projection, procedural fish rendering and environmental particles.
- `tests/core.test.js`: existing tests for quaternion math, drag, body deformation, gait, fin response, tail thrust, turning and tail-root continuity.

### Confirmed gaps to address
- The body spine currently bends primarily along one lateral coordinate; vertical body curvature is not modelled as a second independent bend axis.
- Forward, reverse, lateral and world-vertical translation channels now exist independently of attitude control. Hydrodynamic realism and combined manoeuvre quality remain unvalidated.
- Quaternion attitude is now integrated without Euler pitch/roll clamps. The rotational response is an initial foundation and still needs broader visual validation and more complete control tuning.
- The caudal fin is drawn as a separate polygon rather than being fully deformed from the body attachment frame.
- The current perspective projection exists, but robust depth travel, scale threshold, blur/fade and natural re-entry need implementation and acceptance tests.
- The current model is a phenomenological approximation, not a validated animal model or CFD solver.

### Phase 1 implementation evidence · current increment\n\n- P1-1: persistent body-to-world quaternion attitude is integrated from angular velocity, with world-up yaw and body-local pitch/roll composition.\n- P1-2: translational and attitude inputs are separate; lift is world-vertical, while thrust and lateral force follow body axes.\n- P1-3: forward, reverse, lateral, vertical and combined-direction travel are supported by the force basis. Regression tests cover pitched thrust, reverse thrust, lateral thrust, world lift and torque-only attitude.\n- P1-4 and P1-5 implement depth-scaled perspective and thresholded fish-only distance treatment. P1-6 adds a smooth world-space habitat-return controller: it blends the desired yaw and pitch toward the habitat centre and adds bounded forward thrust along the fish's current body-forward axis. It does not move the camera or directly reposition the fish.\n\nPhase 1 is underway, not complete. The GitHub Actions Core tests workflow passed for the Phase 1 code increment at commit `1f3381a9c81c0c1d097f6d376e0c311cd486bf53` (22 tests, 22 passed).\n\n## Phase approval record

| Phase | Status | Approval |
|---|---|---|
| 0 · Architecture | Assistant complete | User confirmed · 8 November 2026 |
| 1 · 3D locomotion foundation | In progress | P1-1 to P1-3 confirmed · 8 November 2026; phase gate remains open |
| 2 · Elementary movement primitives | Queued | Not started |
| 3 · Basic composite motions | Queued | Not started |
| 4 · Complex manoeuvre arrangements | Queued | Not started |
| 5 · Autonomous natural behaviour | Queued | Not started |
| 6 · Environment | Deferred | Not started |
| 7 · Integration and polish | Queued | Not started |

**Phase 0 implementation and all five tasks were independently confirmed by the user on 8 November 2026. The user also confirmed the three completed Phase 1 tasks. Phase 1 continues; its remaining tasks and phase gate are open.**


## Presentation architecture · Revision 05

- **Plan** is the primary workspace: phases, hierarchical goals, atomic tasks, dependencies and progress tracking.
- **Review** is the technical evidence workspace. It must explain coordinate frames, six degrees of freedom, world versus body-local axes, force and torque, momentum versus heading, orient-then-thrust diving, body curvature, fin attachment and perspective/depth rendering.
- **Present** is deliberately deferred until Plan and Review are substantially complete. The interactive simulation is a secondary sub-tab inside Present, not the main presentation.
- Every implementation task should eventually link its design diagram, source excerpt, test evidence and visible acceptance result.

### Motion semantics clarified

- A dive is not an altitude offset. The fish pitches its nose downward, then accelerates forward along the new body-forward axis.
- Axial roll is rotation around the fish's own longitudinal head-to-tail axis. It is not pitch rotation and must not introduce gratuitous yaw.
- Manoeuvres progress from isolated primitives, to basic composites, to complex sequences such as backwards drift into a loop-the-loop.
