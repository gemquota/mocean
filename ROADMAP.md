# Mocean Engineering Roadmap · Locomotion and Environment

**Revision:** 16 · 12 November 2026  
**Canonical status:** Phase 0 and Phase 1 approved. Phases 2–5 are provisionally tagged *candidate complete* at the user's request; visual acceptance, integration checks and/or user confirmation remain outstanding. Phase 6 is authorised and in progress.  
**Current production branch:** `main` · latest production integration includes Phase 6 spatial-terrain work. The Phase 5 autonomy increment remains subject to its own integration and review gates.

## Objective

Support the main Schooling habitat with reliable creature locomotion, behaviour and increasingly convincing spatial environment technology. The live product is the mixed-species schooling simulation in [schooling.html](schooling.html); the single-creature swimmer remains a focused locomotion reference. All simulation work remains phenomenological, not a validated animal model or computational fluid-dynamics solver.

Architecture, diagrams, tests and prototypes exist to improve the observable simulation. Experimental renderer work must remain clearly separated from the live habitat until it passes integration, regression, visual and performance checks.

## Engineering priorities

1. Correct travelling body curvature and resulting locomotion.
2. Stable, temporally coherent articulated-body and rigid-body dynamics.
3. Preserve accepted cruising and turning quality.
4. Real-time performance on ordinary browser hardware.
5. Keep gait, translation, attitude, behaviour and fixed-camera rendering distinct.
6. State model limitations honestly.

## Architecture and coordinate contract

- **Gait/body deformation:** travelling muscle wave, elastic spine response, fin articulation and tail reaction.
- **Translation:** forces, drag, buoyancy/restoring terms, velocity and position.
- **Attitude:** moments, angular rates and body-to-world quaternion orientation.
- **Behaviour:** persistent intent and state transitions. Behaviour may request motion but must not teleport or directly overwrite position or velocity.
- **Rendering:** fixed camera observes the simulated body and orientation; it does not drive them.

Respect the world/body axes and quaternion conventions in [PHASE_0.md](PHASE_0.md). The current body spine bends primarily along one lateral coordinate; independent vertical body curvature remains a known gap. The model uses phenomenological coefficients and simplified resistance, not full fluid coupling.

## Project planning and two-key completion

Every phase follows: **phase goal → subgoals → atomic tasks → dependencies → acceptance criteria → evidence/review**.

Each task has two independent marks:
- **Assistant complete:** implementation and acceptance evidence verified.
- **User confirmed:** the user independently reviewed and accepted that evidence.

A phase gate is approved only by explicit user approval. Automated tests alone do not establish convincing swimming. Do not mark a task complete merely because code exists or a workflow is green.

The development presentation at [development.html](development.html) displays separate assistant and user marks. User marks are browser-local convenience state; this file is the canonical engineering record.

## Current repository integration

The earlier locomotion and interaction branches have been integrated into `main`:
- PR #5: reconcile `main` into the Phase 1–4 locomotion branch.
- PR #6: integrate Phase 1–4 locomotion into `main`.
- PR #8: integrate the tap-to-swim 3D experiment into `main`.

The main-branch Actions test runs after these integrations succeeded. The current Phase 5 increment is isolated on `phase-5-autonomy` and is not yet merged.

## Phase 0 · Architecture and baseline

**Status:** Assistant complete and user confirmed. **Gate approved · 8 November 2026.**

- [x] P0-1 Document world axes, body axes and quaternion orientation convention.
- [x] P0-2 Separate translational propulsion from attitude control.
- [x] P0-3 Specify fixed-camera projection and depth treatment.
- [x] P0-4 Define baseline tests and locomotion acceptance criteria.
- [x] P0-5 Define phase dependencies and two-key approval governance.

**Evidence:** [PHASE_0.md](PHASE_0.md), architecture/source audit, acceptance matrix and regression tests.

## Phase 1 · True 3D locomotion foundation

**Status:** All tasks assistant complete and user confirmed. **Gate approved · 8 November 2026.**

- [x] P1-1 Quaternion-based 3D orientation frame.
- [x] P1-2 Separate thrust/lift/lateral force channels from pitch/yaw/roll control.
- [x] P1-3 Forward, reverse, lateral, vertical and diagonal travel.
- [x] P1-4 Perspective scale changes with depth on the fixed camera.
- [x] P1-5 Distance blur/fade below the quarter-size threshold.
- [x] P1-6 Smooth world-space habitat return using heading, pitch and body-forward thrust.

**Evidence:** Phase 1 regression suite, fixed-camera and kinematic tests, successful Pages deployment, and the user's independent review. Camera elevation is 22°; initial framing is reduced without moving the camera during simulation.

## Phase 2 · Elementary movement primitives

**Status:** PROVISIONAL · candidate complete (user-requested working label). Implementation is integrated and automated coverage exists; task-level assistant completion and live visual acceptance are not yet established. User confirmation and the phase gate remain open.

- [x] P2-1 Straight acceleration, coasting and braking. Assistant evidence recorded; user confirmation remains open.
- [ ] P2-2 Isolated nose-up and nose-down pitch.
- [ ] P2-3 Controlled yaw turns with bounded angular acceleration.
- [ ] P2-4 Axial roll around local head-to-tail axis, independent of pitch and yaw.
- [ ] P2-5 Live visual validation of each primitive with body-local orientation cues.

**Evidence:** Automated tests cover bounded pitch/yaw/roll, torque-only attitude, acceleration/coasting/braking, fin hinge kinematics and body-frame dorsal ridge attachment. Deliberate live visual inspection of the isolated primitives remains necessary.

## Phase 3 · Basic composite motions

**Status:** PROVISIONAL · candidate complete (user-requested working label). Sequence implementation is integrated and kinematic tests pass; live visual review, regression comparison and user confirmation remain open.

- [ ] P3-1 Dive: orient nose-down, then propel along the new heading.
- [ ] P3-2 Climb: orient nose-up, then propel along the new heading.
- [ ] P3-3 Combine turns with acceleration, coasting and braking while retaining momentum.
- [ ] P3-4 Combine axial roll with turns/glides without unwanted yaw spin.
- [ ] P3-5 Verify smooth hand-offs between manoeuvres and calm cruising.

**Evidence:** [PHASE_2_4.md](PHASE_2_4.md) documents sequence intent and kinematic checks. Sequences emit bounded commands; rigid-body dynamics determine the actual path. No Phase 3 task is assistant-complete until visual playback confirms the motion and preserves cruising quality.

## Phase 4 · Complex manoeuvre arrangements

**Status:** PROVISIONAL · candidate complete (user-requested working label). Compound sequence implementation is integrated and kinematic tests pass; live visual review, regression comparison and user confirmation remain open.

- [ ] P4-1 Backwards drift with head direction opposed to retained world momentum.
- [ ] P4-2 Momentum-led curved reversal and controlled loop-the-loop.
- [ ] P4-3 Dive, braking, reorientation and recovery as distinct consecutive stages.
- [ ] P4-4 Combined 3D sequences with deliberate axial roll.

**Evidence:** Physics-integration tests cover the listed manoeuvres and quaternion/numerical bounds. These tests establish kinematic behaviour, not biological realism. Visual inspection remains required.

## Phase 5 · Autonomous natural behaviour

**Status:** PROVISIONAL · candidate complete (user-requested working label). Prototype remains on `phase-5-autonomy`, not yet integrated into `main`. **68 automated tests pass (0 fail) at commit `8aae7739a248c7f1d15b698dd0664cd9d9804c28`.** Live visual review, integration/regression checks and user confirmation remain open.

- [ ] P5-1 Persistent behavioural intent, state transitions and burst cooldown.
- [ ] P5-2 Blend cruise, explore, dart, glide, turn and recovery according to energy and context.
- [ ] P5-3 Track smooth look-ahead trajectories and shorten manoeuvres near habitat limits.
- [ ] P5-4 Couple burst eligibility, glide and recovery to available energy.

**Current implementation evidence:**
- State selection is isolated in `src/core/behaviour.js`; it uses energy reserve, current speed, previous state, time since the last burst and soft habitat-boundary pressure.
- Recovery and glide become more likely as energy falls. Darting requires adequate reserve and an 18-second burst cooldown. Immediate repeated states are suppressed.
- Existing quintic spatial manoeuvres remain steering intent. Manoeuvre distance contracts as the fish approaches the soft habitat boundary; return guidance remains a separate bounded controller.
- Sequence events are less frequent and are deferred while the fish is recovering or has insufficient energy. High-cost loops and backwards-drift sequences are not injected into ordinary autonomous swimming.
- Directed swimming is optional and defaults to **AUTO**. The AUTO/DIRECT control enables tap-to-target steering. Tap position selects XY on the fixed target plane; two-finger vertical dragging changes world Z. The depth approach reaches its selected Z by halfway path progress and then levels. Pursuit changes heading and tail-generated thrust/braking demand, but translation and attitude still pass through the normal gait and rigid-body pathways.
- Automated coverage includes energy-biased state selection, burst eligibility/cooldown, transition variety, depth-path geometry, monotonic path progress and distance-shaped pursuit. GitHub Actions run [42544791895](https://github.com/gemquota/mocean/actions/runs/42544791895) passed all 68 tests, including a low-effort near-target hold check.

**Unresolved acceptance:** watch the actual fish in AUTO and DIRECT modes; compare cruising, acceleration, turn radius, overshoot, braking and near-target hovering against the accepted baseline. The current habitat boundary is not a general obstacle field. Do not mark Phase 5 tasks or the phase gate complete until visual evidence and user review exist.

## Main simulation · Schooling habitat

**Status:** Primary live simulation on `main` and published through GitHub Pages.

**Entry point:** [schooling.html](schooling.html) · [model notes](SCHOOLING.md).

The habitat uses local group interactions rather than a shared waypoint:
- separation to avoid crowding and collisions;
- alignment to respond to nearby heading and velocity;
- cohesion to maintain a loose school;
- a 3D spatial hash to bound neighbour and collision candidate work;
- individual inertia, turn-rate limits and phase variation;
- a default population of 1,000 fish, with mixed-species habitat work layered around the schooling model.

The single-creature swimmer at [index.html](index.html) remains a separate locomotion prototype. Its mechanics and tests are useful references, but it is not the primary live experience. See `SCHOOLING.md` for model details and known limitations.

## Phase 6 · 3D environment, seabed and water

**Status:** Authorised · in progress. The main branch contains the integrated voxel terrain/contact path and selected animated-fish overlay. The habitat remains a hybrid Canvas/Three.js renderer; unified depth ordering, water/light polish and performance acceptance are still open. The scope includes open-source 3D assets, complex spatial terrain, underwater lighting and post-processing. See [PHASE_6.md](PHASE_6.md) for implementation details and acceptance criteria.

- [x] P6-0 Audit current renderer, simulation/terrain coupling and delivery constraints. (Assistant complete; evidence in `PHASE_6.md`.)
- [ ] P6-1 Renderer architecture and compatibility spike.
- [ ] P6-2 Spatial seabed: elevations, rock formations, shelves, overhangs, arches, crevasses, caves and sand channels.
- [ ] P6-3 Verified open-source environment assets and optimised materials.
- [ ] P6-4 Water depth/absorption, haze, light shafts, plankton/particles, bubbles and surface motion.
- [ ] P6-5 Underwater lighting, shadows and restrained bloom/post-processing.
- [ ] P6-6 Simulation-driven creature rendering and terrain-contact integration.
- [ ] P6-7 Regression, performance, visual evidence and user acceptance.

## Phase 7 · Integration and polish

**Status:** Queued.

- [ ] P7-1 Tune lighting, depth cues, silhouette and material response.
- [ ] P7-2 Profile simulation/rendering and stabilise fixed-step behaviour.
- [ ] P7-3 Run regression suite and verify public Pages deployment.
- [ ] P7-4 Complete final visual and behavioural acceptance review.

## Single-creature locomotion model limits

- The spine currently has one dominant lateral deformation axis; independent vertical curvature is not implemented.
- The caudal fin is still rendered as a separate shape rather than fully deformed from its attachment frame.
- Drag, buoyancy/restoring terms, thrust and rotational response are phenomenological approximations.
- The model is not validated against animal kinematics or CFD.
- Kinematic tests do not prove that the fish looks or feels natural. Visual review remains mandatory.

## Phase approval record

| Phase | Assistant evidence | User confirmation / gate |
|---|---|---|
| 0 · Architecture | Complete | Confirmed · gate approved 8 Nov 2026 |
| 1 · 3D foundation | Complete | Confirmed · gate approved 8 Nov 2026 |
| 2 · Primitives | **Provisional candidate complete**; task evidence/visual checks incomplete | Pending · not approved |
| 3 · Basic composites | **Provisional candidate complete**; implementation and kinematic checks integrated | Pending visual review · not approved |
| 4 · Complex arrangements | **Provisional candidate complete**; implementation and kinematic checks integrated | Pending visual review · not approved |
| 5 · Autonomous behaviour | **Provisional candidate complete**; prototype on feature branch, 68 tests pass | Pending integration, visual review · not approved |
| 6 · Environment | In progress · voxel terrain/contact and selected animated-model overlay integrated | Pending water/light polish, visual/performance review |
| 7 · Integration and polish | Queued | Not started |

**Status-label note (10 November 2026):** At the user's request, Phases 2–5 are labelled *provisional / candidate complete*. This is a planning label only. It does not change task checkboxes, assistant-complete evidence, user-confirmation marks or phase-gate approvals. In particular, Phase 5 remains on its feature branch and must be integrated and regression-checked before acceptance.

**Authorisation:** The user authorised the locomotion and environment engineering tracks, and the Schooling habitat is now the primary live simulation. Implementation status, visual acceptance and phase-gate approval remain separate; a working deployment does not automatically approve every engineering task.
