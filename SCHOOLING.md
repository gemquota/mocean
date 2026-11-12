# Schooling · Main simulation

**Status:** Primary live Mocean simulation · published at [schooling.html](https://gemquota.github.io/mocean/schooling.html).

The Schooling habitat is the main product experience, not an isolated experiment. It simulates a mixed-species underwater world with autonomous group movement, individual variation, population controls and a shared marine environment.

## Model

Each fish has independent 3D position, velocity, body-forward direction and gait phase. A 3D spatial hash limits local-neighbour and collision candidate searches.

- **Separation:** local repulsion increases as fish approach, with an anticipatory term for closing velocity.
- **Alignment:** velocity matching is deliberately damped so the school does not snap into one shared heading.
- **Cohesion:** weak centroid attraction preserves a loose school without collapsing it into a ball.
- **Inertia:** bounded acceleration and a gently regulated cruising speed replace per-frame speed snapping.
- **Attitude:** body-forward direction has a finite turn rate and lags velocity changes.
- **Collisions:** fish are approximated as short oriented capsules. Soft positional correction and a low-restitution velocity impulse prevent body-centreline intersections without hard, explosive bounces.
- **Habitat pressure:** a smooth ellipsoidal force steers fish away from the soft boundary.
- **Individual variation:** slow phase-offset drift prevents a rigid rotating formation.

The default school contains 1,000 fish. The rendered body is 25% of the previous schooling prototype's dimensions, and the habitat extents are five times the previous experiment in all three axes. The gait and articulated geometry are shared with the single-creature body implementation. The schooling scene uses a lower-polygon mesh and renders at 30 Hz while simulation continues at a 60 Hz fixed step.

## Performance strategy

A uniform 3D spatial hash replaces an all-pairs neighbour scan. Each fish queries its local cell and adjacent cells; only nearby candidates receive distance and interaction tests. The same broad-phase grid feeds capsule collision checks. Rendering uses a lower-resolution mesh and precomputed face shading rather than recomputing per-triangle lighting normals.

This reduces work for a spatially distributed school, but actual frame time still depends on browser, screen resolution and device. Performance should be measured on representative hardware rather than inferred from algorithmic complexity alone.

## Validation

Automated coverage includes:

- Deterministic initialisation.
- Spatial-hash candidate work below all-pairs scanning for the 1,000-agent test distribution.
- Increased separation response as fish approach and contact response for overlapping capsules.
- Bounded heading change from a finite angular rate.
- Finite state and bounded speed during sustained simulation.

Visual and performance acceptance still require real-browser checks for visible interpenetration, jitter, rigid-looking group motion, frame time and memory use.

## Known limits

This is a phenomenological group model, not a validated biological schooling model. Collision geometry is a capsule approximation of each body, not a continuously deforming collision mesh. The simulation does not model fluid-mediated wakes, hydrodynamic schooling or full independent rigid-body attitude dynamics for every fish.

The original [single-creature swimmer](https://gemquota.github.io/mocean/) remains a separate locomotion prototype and engineering reference.
