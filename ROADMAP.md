# Mocean Development Roadmap

**Revision:** 13 · 9 November 2026  
**Canonical status:** Phase 0 and Phase 1 approved. Phases 2–5 are authorised and in implementation/review. Phase 6 remains deferred.  
**Current work branch:** `phase-5-autonomy` · awaiting integration and live visual review.

## Objective

Build one aquatic creature whose movement emerges from body deformation, tail-driven propulsion, inertia, resistance and persistent behavioural intent. The simulation is a real-time phenomenological biomechanical model, not a validated animal model or computational fluid-dynamics solver.

The fish is the product. Architecture, diagrams, tests and presentation exist to improve and explain its movement, not to replace observable correctness.

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

**Status:** Implementation integrated. Visual acceptance and user confirmation remain open.

- [x] P2-1 Straight acceleration, coasting and braking. Assistant evidence recorded; user confirmation remains open.
- [ ] P2-2 Isolated nose-up and nose-down pitch.
- [ ] P2-3 Controlled yaw turns with bounded angular acceleration.
- [ ] P2-4 Axial roll around local head-to-tail axis, independent of pitch and yaw.
- [ ] P2-5 Live visual validation of each primitive with body-local orientation cues.

**Evidence:** Automated tests cover bounded pitch/yaw/roll, torque-only attitude, acceleration/coasting/braking, fin hinge kinematics and body-frame dorsal ridge attachment. Deliberate live visual inspection of the isolated primitives remains necessary.

## Phase 3 · Basic composite motions

**Status:** Sequence implementation integrated; kinematic tests pass. Live visual review remains open.

- [ ] P3-1 Dive: orient nose-down, then propel along the new heading.
- [ ] P3-2 Climb: orient nose-up, then propel along the new heading.
- [ ] P3-3 Combine turns with acceleration, coasting and braking while retaining momentum.
- [ ] P3-4 Combine axial roll with turns/glides without unwanted yaw spin.
- [ ] P3-5 Verify smooth hand-offs between manoeuvres and calm cruising.

**Evidence:** [PHASE_2_4.md](PHASE_2_4.md) documents sequence intent and kinematic checks. Sequences emit bounded commands; rigid-body dynamics determine the actual path. No Phase 3 task is assistant-complete until visual playback confirms the motion and preserves cruising quality.

## Phase 4 · Complex manoeuvre arrangements

**Status:** Compound sequence implementation integrated; kinematic tests pass. Live visual review remains open.

- [ ] P4-1 Backwards drift with head direction opposed to retained world momentum.
- [ ] P4-2 Momentum-led curved reversal and controlled loop-the-loop.
- [ ] P4-3 Dive, braking, reorientation and recovery as distinct consecutive stages.
- [ ] P4-4 Combined 3D sequences with deliberate axial roll.

**Evidence:** Physics-integration tests cover the listed manoeuvres and quaternion/numerical bounds. These tests establish kinematic behaviour, not biological realism. Visual inspection remains required.

## Phase 5 · Autonomous natural behaviour

**Status:** Prototype integrated on `phase-5-autonomy`. **68 automated tests pass (0 fail) at commit `8aae7739a248c7f1d15b698dd0664cd9d9804c28`. Live visual review and user confirmation remain open.**

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

## Post-Phase 5 experiment · 100-fish schooling

**Authorised by the user, but gated behind single-fish Phase 5 visual review. Not a new production phase and not part of the live single-fish build.**

The experiment should use local interactions, not a shared waypoint:
- separation to avoid crowding/collisions;
- alignment to respond to nearby heading and velocity;
- cohesion to maintain a loose group;
- bounded neighbour sampling and spatial partitioning so 100 agents remain real-time;
- the same movement intent/force principles where practical, with simplified per-agent body rendering if necessary.

First establish a reproducible single-fish baseline, then profile 10, 25, 50 and 100 agents. Keep the experiment isolated and compare group behaviour and frame time against the single-fish build. Do not introduce schooling infrastructure into the production fish until the experiment demonstrates value.

## Phase 6 · Environment and water surface

**Status:** Deferred until locomotion and autonomous movement are convincing.

- [ ] P6-1 Sparse bubbles with buoyant rise and size variation.
- [ ] P6-2 Tiny plankton/detritus with layered drift and parallax.
- [ ] P6-3 Occasional drifting objects with passive motion.
- [ ] P6-4 Water surface with travelling ripples and swells.
- [ ] P6-5 Wind field and intermittent surface chop.

## Phase 7 · Integration and polish

**Status:** Queued.

- [ ] P7-1 Tune lighting, depth cues, silhouette and material response.
- [ ] P7-2 Profile simulation/rendering and stabilise fixed-step behaviour.
- [ ] P7-3 Run regression suite and verify public Pages deployment.
- [ ] P7-4 Complete final visual and behavioural acceptance review.

## Known model limits

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
| 2 · Primitives | P2-1 complete; remaining visual checks open | Pending |
| 3 · Basic composites | Prototype and kinematic tests integrated | Pending visual review |
| 4 · Complex arrangements | Prototype and kinematic tests integrated | Pending visual review |
| 5 · Autonomous behaviour | Prototype integrated; 67 tests pass | Pending visual review |
| 6 · Environment | Deferred | Not started |
| 7 · Integration and polish | Queued | Not started |

**Authorisation:** On 9 November 2026 the user explicitly authorised the work through Phase 5 and the subsequent isolated 100-fish schooling experiment. This authorises implementation work; it does not imply task completion, user confirmation or phase-gate approval.
