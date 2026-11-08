# Phase 0 · Architecture and baseline

**Status:** Complete · implementation-ready baseline  
**Date:** 8 November 2026

## Project objective

Build a single-fish, full-screen aquatic simulation whose movement reads as physically coherent and naturally alive. Locomotion is the priority; environment detail remains deferred until movement is accepted.

## Goal 0.1 · Establish coordinate and attitude conventions

### Subgoal 0.1.1 · Coordinate frames

- World axes: **+X** is the initial screen-horizontal forward direction, **+Y** is world-up, and **+Z** is lateral/depth.
- Body axes at identity attitude: **+X** forward (head direction), **+Y** dorsal/up, **+Z** right-side/lateral.
- Positive yaw is rotation about world +Y; pitch is rotation about the body-local +Z axis; axial roll is rotation about the body-local +X axis.
- Quaternions encode body-to-world orientation. Vectors used by the renderer are transformed from body-local to world space by that orientation.
- Positive pitch convention: nose-up. A dive is therefore a nose-down pitch followed by forward thrust along the newly rotated body-forward axis.

### Acceptance

- Identity attitude maps each body axis to its corresponding world axis.
- A positive 90° yaw maps body-forward +X to world -Z under the selected right-handed convention.
- A dive does not directly write world altitude; vertical displacement results from velocity integration.

## Goal 0.2 · Separate translation and attitude

### Subgoal 0.2.1 · Force and torque channels

- Translational forces alter linear velocity only.
- Attitude commands alter angular velocity/orientation only.
- Body-forward thrust follows the current body-forward axis.
- Lateral side force follows the current body-right axis.
- Lift is a world-vertical force channel, independent of pitch.
- Drag opposes existing world-space velocity, not body heading. Momentum can therefore persist while the fish turns.

### Acceptance

- Applying lift at identity and pitched attitudes produces the same world-vertical acceleration.
- Applying thrust after a pitch rotates its direction with body-forward.
- With zero force, drag reduces speed without snapping velocity to body heading.
- Torque-only input changes attitude without directly changing linear velocity.

## Goal 0.3 · Fixed-camera projection and depth treatment

### Subgoal 0.3.1 · Camera contract

- The camera is fixed in the habitat. It never follows or recentres on the fish.
- Perspective projection uses camera-space depth; apparent size decreases as distance increases.
- Depth travel must remain perceptible through apparent scale and later distance treatment.
- Distance blur/fade target: begin only as the fish approaches one-quarter of its normal apparent size. Preserve a readable silhouette until then.
- Leaving the visible frame is not permission to move the camera. Natural return-to-view behaviour is a later locomotion/autonomy responsibility.

### Acceptance

- A stationary camera produces different apparent fish sizes at different camera-space depths.
- Camera position and basis remain unchanged while the fish moves.
- Blur/fade is distance-derived, not tied to arbitrary screen coordinates.

## Goal 0.4 · Define locomotion validation

### Subgoal 0.4.1 · Baseline test matrix

The automated baseline is `node --test`. Existing coverage includes quaternion/vector transforms, drag, thrust, body deformation, tail propulsion, fin response, turning and attachment continuity.

Phase 1 adds explicit checks for:
1. Quaternion integration remains normalized over repeated steps.
2. Body-local forward/right/up remain orthogonal after arbitrary attitude changes.
3. World lift is independent of body pitch.
4. Torque-only input does not create translation.
5. Linear momentum is not redirected merely because attitude changes.

### Visual acceptance

- One fish only; full-screen simulation; fixed side-on habitat camera.
- No user-facing physics sliders or configuration UI.
- Fish orientation, travel direction and body deformation must be visually distinguishable.
- No fake altitude offsets, camera tracking, or roll represented as yaw.

### Baseline limitations recorded

The pre-Phase-1 implementation used Euler angles as the persistent attitude state, clamped pitch/roll, applied lift along body-local up, and used a one-axis elastic spine. Perspective projection existed but had no accepted depth/blur/fade threshold. This is a behavioural prototype, not validated hydrodynamics or CFD.

## Goal 0.5 · Establish phase governance

### Subgoal 0.5.1 · Completion and approval

Every task has two independent marks:
- **Assistant complete:** only after code/docs/tests and stated acceptance criteria are verified.
- **User confirmed:** only after independent review. It is never set by the assistant.

A phase advances only after its implementation evidence is presented and the user explicitly approves the phase gate. Browser-local review ticks are convenience state, not canonical engineering records.

### Phase sequence

0. Architecture and baseline → 1. True 3D locomotion foundation → 2. Elementary movement primitives → 3. Basic composite motions → 4. Complex manoeuvre arrangements → 5. Autonomous natural behaviour → 6. Environment and water surface (deferred) → 7. Integration and polish.

## Phase 0 completion evidence

- Coordinate frame, handedness, local axes and rotation semantics are defined above.
- Translation/attitude force-channel contract is defined above.
- Fixed-camera and perspective/depth treatment contract is defined above.
- Automated and visual validation criteria are defined above.
- Phase ordering, dual completion marks and explicit approval gate are defined above.

Phase 0 establishes the architecture and acceptance contract. It does not claim that Phase 1 mechanics are already implemented.
