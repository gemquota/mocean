# Mocean

**An experimental laboratory for aquatic locomotion and procedural creature rendering.**

[Open the live simulation](https://gemquota.github.io/mocean/)

## Current prototype

The interface presents one renderer at a time on a large stage. The camera follows the creature's position and orientation with a smoothed chase camera rather than leaving it pinned to a fixed side-view frame.

- Autonomous behaviour blends cruise, drift, explore, dart, turn and recovery.
- Movement uses body-relative forward, reverse, lateral and vertical thrust.
- Velocity persists through inertia and water resistance.
- Orientation responds with finite angular acceleration and damping.
- Vertical buoyancy and soft tank boundaries constrain movement.
- Seeded random behaviour makes a run repeatable.
- Manual nudges temporarily influence the autonomous controller.

## Renderer selector

- **Procedural pixel:** current first-pass low-poly, pixel-snapped surface treatment.
- **Hybrid:** shaded faceted surface treatment.
- **2.5D:** layered detail treatment.
- **Voxel:** blocky surface treatment only; not yet a true voxel volume.

These are still early visual prototypes. The next renderer pass should focus on making one implementation genuinely good before treating the other three as finished alternatives.

## Core modules

- `src/core/math.js`: vector operations, quaternion rotation and angle handling.
- `src/core/dynamics.js`: force integration, drag, buoyancy, rotational response and soft tank boundaries.
- `src/main.js`: autonomous behaviour, follow camera, renderer selection and telemetry.

Run the deterministic core checks with:

```sh
npm test
```

## Run locally

```sh
python -m http.server 8000
```

Then visit http://localhost:8000.
