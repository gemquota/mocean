# Mocean

**An experimental laboratory for aquatic locomotion and procedural creature rendering.**

Mocean separates a creature's movement from the way it is drawn. A single autonomous simulation drives four visual experiments:

1. Procedural pixel
2. Hybrid volumetric / pixel aesthetic
3. Layered 2.5D
4. Voxel-inspired volume

## Live site

[Open the Mocean simulation](https://gemquota.github.io/mocean/)

GitHub Pages deploys from the `main` branch through `.github/workflows/pages.yml`.

## Current prototype

- Autonomous behaviour blends cruise, drift, explore, dart, turn and recovery states.
- Movement uses body-relative forward, reverse, lateral and vertical thrust.
- Velocity persists through inertia and water resistance.
- Orientation responds with finite angular acceleration and damping.
- Vertical buoyancy and soft tank boundaries constrain movement.
- Seeded random behaviour makes a run repeatable.
- All four render panels use the same simulation state.
- Manual nudges temporarily influence the autonomous controller.

## Core modules

- `src/core/math.js`: vector operations, quaternion rotation, angle wrapping and interpolation helpers.
- `src/core/dynamics.js`: fixed-step force integration, drag, buoyancy, rotational response and soft tank boundaries.
- `src/main.js`: autonomous behaviour, controls, render scheduling and telemetry.

The runtime remains dependency-free. Node's built-in test runner covers the simulation core:

```sh
npm test
```

The `Core tests` GitHub Actions workflow runs this suite on pushes and pull requests.

## Run locally

Serve the repository root with any static HTTP server:

```sh
python -m http.server 8000
```

Then visit http://localhost:8000.

## Next engineering steps

- Move autonomous decision-making into a separately testable behaviour module.
- Define a renderer-independent creature anatomy and animation contract.
- Replace the simplified canvas renderers with independent geometry pipelines.
- Implement true volumetric voxel geometry and full orientation-aware 3D rendering.
- Add deterministic behaviour and long-run stability tests.

## Status

Early interactive prototype. The four panels are synchronised visual experiments, not four finished 3D renderers. The voxel panel is voxel-inspired rather than a true volumetric voxel mesh; hybrid and 2.5D remain visual prototypes.
