# Mocean Development Roadmap

**Revision:** 02 · 8 November 2026  
**Status:** Initial blueprint drafted; awaiting user approval.  
**Implementation gate:** Phase One has not started.

## Direction

A hybrid locomotion model: physically grounded forces, inertia, momentum and body deformation, tuned for natural-looking autonomous fish behaviour. The presentation uses interactive mini-simulations and current-vs-target comparisons with balanced technical detail.

## Working agreement

1. Implement one phase at a time.
2. Each phase has atomic tasks, tests and explicit acceptance criteria.
3. At phase completion, deploy and present evidence for user review.
4. Do not begin the next phase until the user explicitly approves the previous one.
5. Keep environmental development deferred until locomotion and autonomous movement are convincing.
6. The HTML presentation checklist is a browser-local convenience. This file is the canonical engineering record; update it as work is completed.

## Phase 0 · Architecture and baseline

**Status:** Blueprint drafted; user review pending.

- [ ] P0-1 Document world axes, body axes and quaternion orientation convention.
- [ ] P0-2 Separate translational propulsion from orientation control in the architecture.
- [ ] P0-3 Specify fixed-camera projection, depth scaling, blur and fade behaviour.
- [ ] P0-4 Define locomotion acceptance tests and baseline metrics.
- [ ] P0-5 Confirm phase boundaries and user approval process.

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

- [ ] P5-1 Add a goal/subgoal behaviour layer with persistent intent.
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
| 0 · Architecture | Draft for review | Pending |
| 1 · 3D locomotion | Locked | Not started |
| 2 · Inertia / manoeuvres | Queued | Not started |
| 3 · Autonomy | Queued | Not started |
| 4 · Environment | Deferred | Not started |
| 5 · Polish | Queued | Not started |

**No Phase One code has been changed as part of this blueprint.**


## Presentation architecture · Revision 02

- **Plan** is the primary workspace: phases, hierarchical goals, atomic tasks, dependencies and progress tracking.
- **Review** is the technical evidence workspace. It must explain coordinate frames, six degrees of freedom, world versus body-local axes, force and torque, momentum versus heading, orient-then-thrust diving, body curvature, fin attachment and perspective/depth rendering.
- **Present** is deliberately deferred until Plan and Review are substantially complete. The interactive simulation is a secondary sub-tab inside Present, not the main presentation.
- Every implementation task should eventually link its design diagram, source excerpt, test evidence and visible acceptance result.

### Motion semantics clarified

- A dive is not an altitude offset. The fish pitches its nose downward, then accelerates forward along the new body-forward axis.
- Axial roll is rotation around the fish's own longitudinal head-to-tail axis. It is not pitch rotation and must not introduce gratuitous yaw.
- Manoeuvres progress from isolated primitives, to basic composites, to complex sequences such as backwards drift into a loop-the-loop.
