# Mocean Development Roadmap

**Revision:** 04 · 8 November 2026  
**Status:** Phase 0 architecture and baseline complete; awaiting user review and confirmation.  
**Implementation gate:** Phase One has not started.

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
4. Do not begin the next phase until the user explicitly approves the previous one.
5. Keep environmental development deferred until locomotion and autonomous movement are convincing.
6. The HTML presentation checklist is a browser-local convenience. This file is the canonical engineering record; update it as work is completed.

## Phase 0 · Architecture and baseline

**Status:** Assistant complete; awaiting independent user confirmation.  
**Evidence:** [PHASE_0.md](PHASE_0.md), source audit and 17 existing test cases. The baseline test workflow is configured in GitHub Actions; no claim is made here that the tests were freshly executed during documentation authoring.

- [x] P0-1 Document world axes, body axes and quaternion orientation convention.
- [x] P0-2 Define separate translational propulsion and orientation-control pathways, their coupling, and the current implementation boundary.
- [x] P0-3 Specify fixed-camera projection, depth scaling, blur/fade target and re-entry behaviour.
- [x] P0-4 Define locomotion acceptance tests, baseline inventory and known limitations.
- [x] P0-5 Confirm phase boundaries, dependencies and the two-key user approval process.

**Phase 0 gate:** awaiting user review. Phase 1 remains locked until explicit approval.

## Phase 1 · True 3D locomotion foundation

**Status:** Locked until initial presentation approval.

- [ ] P1-1 Build a coherent 3D orientation frame with quaternion-based attitude.
- [ ] P1-2 Separate thrust, lift and lateral propulsion from pitch, yaw and roll control.
- [ ] P1-3 Support forward, reverse, lateral, vertical and diagonal travel.
- [ ] P1-4 Make depth travel visibly change perspective scale on the fixed camera.
- [ ] P1-5 Add distance-based blur and fade near one-quarter apparent size.
- [ ] P1-6 Return the fish to the visible habitat naturally after leaving frame.

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
- Translational forces are tied to body-forward/right/up axes. Independent vertical propulsion and heading are not yet a full capability.
- Pitch and roll are clamped; unrestricted arbitrary attitude and full axial roll are not yet supported.
- The caudal fin is drawn as a separate polygon rather than being fully deformed from the body attachment frame.
- The current perspective projection exists, but robust depth travel, scale threshold, blur/fade and natural re-entry need implementation and acceptance tests.
- The current model is a phenomenological approximation, not a validated animal model or CFD solver.

## Phase approval record

| Phase | Status | Approval |
|---|---|---|
| 0 · Architecture | Assistant complete · review pending | Awaiting user confirmation |
| 1 · 3D locomotion foundation | Locked pending plan approval | Not started |
| 2 · Elementary movement primitives | Queued | Not started |
| 3 · Basic composite motions | Queued | Not started |
| 4 · Complex manoeuvre arrangements | Queued | Not started |
| 5 · Autonomous natural behaviour | Queued | Not started |
| 6 · Environment | Deferred | Not started |
| 7 · Integration and polish | Queued | Not started |

**Phase 0 defines the architecture and acceptance contract only. Phase One implementation has not started and remains locked pending user approval.**


## Presentation architecture · Revision 04

- **Plan** is the primary workspace: phases, hierarchical goals, atomic tasks, dependencies and progress tracking.
- **Review** is the technical evidence workspace. It must explain coordinate frames, six degrees of freedom, world versus body-local axes, force and torque, momentum versus heading, orient-then-thrust diving, body curvature, fin attachment and perspective/depth rendering.
- **Present** is deliberately deferred until Plan and Review are substantially complete. The interactive simulation is a secondary sub-tab inside Present, not the main presentation.
- Every implementation task should eventually link its design diagram, source excerpt, test evidence and visible acceptance result.

### Motion semantics clarified

- A dive is not an altitude offset. The fish pitches its nose downward, then accelerates forward along the new body-forward axis.
- Axial roll is rotation around the fish's own longitudinal head-to-tail axis. It is not pitch rotation and must not introduce gratuitous yaw.
- Manoeuvres progress from isolated primitives, to basic composites, to complex sequences such as backwards drift into a loop-the-loop.
