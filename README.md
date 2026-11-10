# Mocean

[**GitHub Pages deployment · Live simulation →**](https://gemquota.github.io/mocean/) · [**Development presentation →**](https://gemquota.github.io/mocean/development.html)

An autonomous aquatic creature study focused on believable movement and procedural anatomy.

## Current direction

Mocean is deliberately presented as a full-screen simulation, not a control dashboard. Movement and physical properties are predefined. There are no user-facing sliders or configuration panels.

The first creature is a flexible-bodied swimmer:
- A travelling lateral wave passes from the front of the body toward the tail.
- Body curvature increases toward the caudal peduncle.
- Tail stroke frequency and amplitude change with behaviour.
- Propulsive acceleration is derived from tail motion and is bounded.
- Burst swimming consumes an energy reserve; recovery restores it.
- Momentum, speed-dependent drag, buoyancy, angular inertia and soft spatial limits shape the motion.
- A fixed world-space camera observes the creature; the fish moves through the habitat without camera chasing.

Autonomous behaviour transitions between cruising, exploring, turning, darting, gliding and recovering. Randomness changes behavioural intent; it does not teleport the creature or bypass the physical model.

## Core modules

- `src/core/math.js`: vector operations, quaternion rotation and angle handling.
- `src/core/body.js`: travelling-wave body deformation, gait adaptation, tail-driven propulsion and burst-energy costs.
- `src/core/dynamics.js`: fixed-step motion, drag, buoyancy, rotational response and soft habitat boundaries.
- `src/core/maneuver.js`: spatial Bézier steering intent with smooth endpoint tangents.
- `src/core/sequences.js`: eased isolated primitives, composite motions and longer compound manoeuvre intent.
- `src/core/camera.js`: fixed-camera basis and projection framing.
- `src/main.js`: autonomous behaviour, sparse manoeuvre sequencing, fixed-camera projection and full-screen procedural rendering.

## Tests

Run the simulation-core tests with Node 22 or later:

```sh
npm test
```

GitHub Actions runs the tests on pushes and pull requests.

## Run locally

```sh
python -m http.server 8000
```

Then visit http://localhost:8000.

## Scope and honesty

This is a biomechanical approximation, not a validated animal model or computational fluid-dynamics solver. It uses a distributed damped elastic spine, active muscle-wave forcing, approximate added-water damping, quadratic body drag and fin-generated moments. Hydrodynamic coefficients are phenomenological and still require calibration against measured swimming data. The immediate goal is to establish a convincing flexible swimmer and coherent autonomous movement before building additional renderer experiments.
