# 100-fish schooling experiment

**Status:** isolated prototype · not part of the production single-fish simulation.

## Model

Each fish has independent 3D position, velocity, body-forward direction and gait phase. A 3D spatial hash limits local-neighbour and collision candidate searches.

- **Separation:** local repulsion increases as fish approach, with an anticipatory term for closing velocity.
- **Alignment:** velocity matching is deliberately damped so the school does not snap into one shared heading.
- **Cohesion:** weak centroid attraction preserves a loose school without collapsing it into a ball.
- **Inertia:** bounded acceleration and a gently regulated cruising speed replace per-frame speed snapping.
- **Attitude:** the body-forward direction has a finite turn rate and lags velocity changes.
- **Collisions:** fish are approximated as short oriented capsules. Soft positional correction and a low-restitution velocity impulse prevent body-centreline intersections without hard, explosive bounces.
- **Habitat pressure:** a smooth ellipsoidal force steers fish away from the soft boundary.
- **Individual variation:** slow phase-offset drift prevents a rigid rotating formation.

The rendered body is 25% of the previous schooling prototype's dimensions. Its gait and articulated geometry are shared with the single-fish body implementation. The schooling scene uses a lower polygon mesh and renders at 30 Hz while simulation continues at a 60 Hz fixed step.

## Performance strategy

The previous all-pairs neighbour scan was replaced by a uniform 3D spatial hash. Each fish queries its local cell and adjacent cells; only nearby candidates receive distance and interaction tests. The same broad-phase grid feeds capsule collision checks. Rendering uses a lower-resolution mesh and precomputed face shading rather than recomputing per-triangle lighting normals.

This reduces work substantially for a spatially distributed school, but actual frame-time still depends on browser, screen resolution and device. The prototype has not yet been profiled on a range of ordinary hardware.

## Acceptance checks

- Deterministic initialisation.
- Spatial-hash candidate work remains below all-pairs scanning for the 100-agent test distribution.
- Close fish increase separation and overlapping capsules produce contact response.
- Heading change is bounded by a finite angular rate.
- State remains finite and speed bounded during sustained simulation.
- Visual inspection must confirm fish do not visibly interpenetrate, jitter, or move as one rigid blob.
- Browser frame-time must be measured on representative hardware before calling performance acceptable.

## Known limits

This remains a phenomenological group model, not a validated biological schooling model. Collision geometry is a capsule approximation of the body, not a continuously deforming collision mesh. It does not simulate fluid-mediated wakes, hydrodynamic schooling, or full independent rigid-body attitude dynamics for every fish. The production simulation remains a single fish.
