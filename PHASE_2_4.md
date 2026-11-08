# Phases 2–4 · Movement primitives and manoeuvre sequences

**Engineering status:** implementation and automated kinematic verification in progress on `phase-1-4-locomotion`.  
**Review status:** visual acceptance and user confirmation are still open.  
**Scope:** isolated attitude/translation primitives, basic composites and longer compound manoeuvres. No Phase 5 behavioural architecture or Phase 6 environment work is included.

## Design rule

A sequence emits bounded intentions only. It does not set position, velocity, orientation or camera state directly. The existing runtime pathways remain authoritative:

- body gait and fin response produce propulsive/drag inputs;
- the sequence layer provides temporary target attitude, thrust, side-force, braking and bounded pitch-moment intentions;
- `stepDynamics` applies force and torque, integrates velocity and angular rates, and updates position and quaternion attitude;
- momentum can therefore diverge from heading, and the actual path can lag, overshoot or curve away from the intention.

Sequence segments use eased hand-offs. The live scheduler inserts one occasional movement sequence between ordinary autonomous swimming periods. It is deliberately not an intelligent planner and does not count as Phase 5.

## Phase 2 · Elementary movement primitives

| Task | Implementation evidence | Current acceptance |
|---|---|---|
| P2-1 · Straight travel, acceleration, coasting and braking | Translational force and speed-dependent drag; brake increases resistance without reversing velocity. | Automated tests pass. |
| P2-2 · Independent pitch up/down | Bounded pitch torque; torque-only input does not create translation or yaw. | Automated tests pass; visual primitive inspection pending. |
| P2-3 · Bounded yaw | Bounded world-up yaw drive and auxiliary moment. | Automated tests pass; visual primitive inspection pending. |
| P2-4 · True axial roll | Local longitudinal roll integrated separately from pitch and yaw. | Automated tests pass; visual primitive inspection pending. |
| P2-5 · Isolated visual validation | Dorsal ridge is attached to the deforming body frame and makes axial orientation observable. | Live inspection of deliberate isolated commands remains pending. |

### Pectoral-fin articulation increment · 9 November 2026
The pectoral fins now articulate around body-local longitudinal hinges. The fin root remains fixed, the hinge radius is preserved, and mirrored left/right commands produce mirrored movement. Stroke magnitude is still a bounded output of the existing gait state (phase, speed and steering); the renderer adds subtle fin-ray highlights to make the changing fin plane easier to read.

The new kinematic test is included in the **61/61 passing** Node 22 regression run at [commit c9c71ab](https://github.com/gemquota/mocean/commit/c9c71ab244c344cbe707d68561470214b33cb721). This is implementation and mathematical evidence only. Live visual inspection of isolated pitch, yaw and axial roll is still required before Phase 2 assistant completion.

## Phase 3 · Basic composite motions

Implemented sequence profiles:

- **Dive and climb:** pitch the nose first, then increase body-forward thrust, then brake and recover.
- **Turn / accelerate / coast / brake:** retain world-space momentum while heading changes; deployed fins dissipate speed rather than applying an instantaneous reverse impulse.
- **Roll-turn:** combine a deliberate local-axis roll with a world-up turn, keeping pitch command separate.
- **Transition:** eased command hand-offs and a return to the ordinary behaviour/path controller after sequence completion.

Automated kinematic tests exercise the rigid-body dynamics rather than merely checking that a profile contains the expected labels. Visual playback and comparison with the pre-sequence cruising baseline remain required before phase acceptance.

## Phase 4 · Complex manoeuvre arrangements

Implemented sequence profiles:

- **Backwards drift:** establish forward world-space momentum, turn the head against that travel direction, then apply bounded reverse body-forward thrust.
- **Curved reversal:** progressively counter-steer while momentum carries the fish through a curved path.
- **Loop-the-loop:** use a bounded pitch-fin moment to carry pitch through a full revolution; a periodic righting moment resists attitude change without making a full revolution mathematically unreachable.
- **Dive / brake / reorient:** build downward momentum, deploy braking drag, then change heading and recover.
- **Compound 3D:** combine yaw, pitch and axial roll as separate deliberate components.

The pitch-fin moment is bounded to ±0.4 in the dynamics layer and used only by the loop sequence. The pitch and roll righting terms are periodic in attitude. These are phenomenological control moments, not measured fin hydrodynamics.

## Regression and acceptance

- **60 tests passed, 0 failed** on Node 22 through GitHub Actions at implementation commit `50983741e208af474724abd3252a4f58944fd3cb` ([workflow run](https://github.com/gemquota/mocean/actions/runs/42497653176)). Documentation and presentation updates continue on the same feature branch.
- The full Node test suite runs on Node 22 through GitHub Actions on pushes and pull requests.
- Tests cover finite state, normalized quaternions, force/torque separation, sequence hand-off continuity, orient-then-propel vertical momentum, retained momentum during turns, independent axial roll, counter-heading drift, a complete pitch revolution and compound 3D attitude changes.
- Passing tests establish numerical and kinematic properties, not that the motion looks biologically convincing.
- Before assistant completion of the visual tasks: inspect the live fish through each isolated primitive and composite, compare ordinary cruising before/after, and check for abrupt attitude changes, unnatural spin, excessive path overshoot and performance regressions.
- User confirmation and phase-gate approval remain separate actions. No phase is accepted by this engineering record alone.

## Known limits

- The elastic centreline remains primarily a lateral bend. Independent vertical centreline curvature is still a biomechanical gap.
- Attitude control uses a phenomenological angular-response model; it is not validated against fish fin moments or measured inertias.
- The loop sequence is a controlled demonstration of the attitude/force pathways, not a validated fish acrobatic manoeuvre.
- The sequence scheduler makes a sparse seeded selection from the primitive/composite sequence pool every roughly 24–42 seconds. It is a demonstration mechanism, not a planner; rich intent selection, anticipation and natural behavioural rhythm belong to Phase 5.
- No fluid solver, multi-creature system, user-facing physics controls or environment expansion is introduced here.
