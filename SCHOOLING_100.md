# 100-fish schooling experiment

**Status:** isolated prototype · not part of the production single-fish simulation.

## Model

Each fish has its own 3D position, velocity and oscillation phase. Neighbour interactions are local and use a finite interaction radius:

- **Separation:** repel nearby fish to reduce crowding.
- **Alignment:** steer velocity toward the local neighbours' average velocity.
- **Cohesion:** steer toward the local neighbours' centroid.
- **Habitat pressure:** smoothly steer fish away from the soft ellipsoidal boundary.
- **Individual variation:** small phase-offset wander prevents a rigid flock from behaving like one object.

There is no shared destination, leader or global waypoint. The prototype uses a bounded acceleration and speed model with simple tail oscillation in the renderer. It is a group-behaviour experiment, not 100 copies of the production biomechanical fish.

## Performance

The current prototype uses pairwise neighbour checks. At 100 agents this is 10,000 pair checks per simulation step, which is deliberately simple and should be profiled before scaling further. If the school grows materially, replace the pairwise scan with a 3D spatial hash or uniform grid.

## Acceptance checks

- Reproducible initialisation from a fixed seed.
- Separation increases spacing for overlapping neighbours.
- Alignment reduces local velocity disagreement.
- All agents remain finite and speed-bounded during sustained simulation.
- Inspect visible cohesion, separation, heading changes, boundary behaviour and frame rate in a browser.

## Known limits

The school model is phenomenological and intentionally simpler than the single-fish gait/dynamics model. It does not simulate fluid-mediated wake interactions, hydrodynamic schooling, collision geometry or validated animal schooling data. The production simulation remains a single fish.
