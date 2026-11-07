# Mocean

**An experimental laboratory for aquatic locomotion and procedural creature rendering.**

Mocean separates a creature's movement from the way it is drawn. A single autonomous 3D simulation drives four visual experiments:

1. Procedural pixel
2. Hybrid volumetric / pixel aesthetic
3. Layered 2.5D
4. Voxel-inspired volume

## Live site

GitHub Pages is deployed from the `main` branch by the workflow in `.github/workflows/pages.yml`.

## Current prototype

- Autonomous behaviour blends cruise, drift, explore, dart, turn and recovery states.
- Movement uses body-relative forward, reverse, lateral and vertical thrust.
- Velocity persists through inertia and water resistance.
- Orientation responds with finite angular acceleration and damping.
- Vertical buoyancy and soft tank boundaries constrain movement.
- Seeded random behaviour makes a run repeatable.
- All four render panels use the same simulation state.
- Manual nudges temporarily influence the autonomous controller.

## Run locally

This is a static site. Open `index.html` directly, or serve the repository root with any static HTTP server:

```sh
python -m http.server 8000
```

Then visit http://localhost:8000.

## Architecture direction

The current prototype intentionally keeps the runtime dependency-free. The next engineering pass should replace the simplified canvas renderers with distinct geometry pipelines while preserving the shared simulation contract.

Planned modules:
- Creature definition and procedural anatomy
- 3D physics and orientation
- Autonomous behaviour and steering
- Animation cycles and procedural modulation
- Independent renderer implementations
- Deterministic tests and performance instrumentation

## Status

Early interactive prototype. The voxel panel is currently a voxel-inspired visual treatment, not yet a true volumetric voxel mesh. The 2.5D and hybrid panels are visual prototypes, not production geometry pipelines.
