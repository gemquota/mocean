# Mocean

<p align="center">
  <strong>A living underwater world, driven by simulated creatures.</strong><br>
  A real-time aquatic simulation exploring locomotion, behaviour, ecology and a spatial marine habitat.
</p>

<p align="center">
  <a href="https://gemquota.github.io/mocean/schooling.html"><strong>▶ OPEN THE LIVE SIMULATION</strong></a>
  &nbsp;·&nbsp;
  <a href="https://gemquota.github.io/mocean/schooling.htmldevelopment.html">Development presentation</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/gemquota/mocean">Source repository</a>
</p>

<p align="center">
  <a href="https://github.com/gemquota/mocean/actions"><img alt="CI" src="https://github.com/gemquota/mocean/actions/workflows/test.yml/badge.svg"></a>
  <a href="https://github.com/gemquota/mocean/blob/main/ROADMAP.md">Roadmap</a>
  ·
  <a href="https://github.com/gemquota/mocean/blob/main/PHASE_6.md">Phase 6 engineering record</a>
</p>

---

## The main simulation

**[▶ Open Schooling · the main Mocean simulation ↗](https://gemquota.github.io/mocean/schooling.html)**

Schooling is the primary live simulation for Mocean: a mixed-species aquatic habitat driven by autonomous schooling and individual creature behaviour. It is published through GitHub Pages from this repository's `main` branch.

The [single-creature prototype](https://gemquota.github.io/mocean/) remains available as a secondary locomotion experiment; it is not the main simulation.

## What Mocean is

Mocean is a full-screen aquatic simulation. The habitat and its creatures are the experience: there is no user-facing configuration dashboard. Creature movement is intended to emerge from body mechanics, inertia, resistance and behavioural intent rather than canned animation cycles.

The main experience is the Schooling simulation: a mixed-species marine habitat with autonomous group motion, individual variation and population controls. The original single-creature swimmer remains available as a focused locomotion prototype.

## Current development status

- **Phase 0 · Architecture and baseline:** approved.
- **Phase 1 · True 3D locomotion foundation:** approved.
- **Phases 2–5:** provisionally labelled *candidate complete*. This is a working status only; visual acceptance, integration checks and/or independent user confirmation remain open. It is not final phase approval.
- **Phase 6 · Environment, seabed and water:** authorised and in progress. The current increment adds a staged 3D renderer, spatial terrain geometry and renderer-independent terrain-clearance queries. Browser visual verification and performance profiling remain important acceptance work.
- **Phase 7 · Integration and polish:** not started.

See the [canonical roadmap](ROADMAP.md) and [Phase 6 record](PHASE_6.md) for task-level status and evidence. The [development presentation](https://gemquota.github.io/mocean/schooling.htmldevelopment.html) provides the visual project overview.

## Engineering priorities

1. Observable correctness of body deformation and resulting locomotion.
2. Numerical stability and temporal coherence of articulated bodies and rigid-body dynamics.
3. Preservation of already-working swimming behaviour.
4. Real-time performance in ordinary browsers.
5. Clear separation of gait, translation, attitude, behaviour and rendering.
6. Honest reporting of model limitations.

The environment renderer observes simulation state. It must not become an alternate owner of creature physics or conceal broken mechanics with decorative geometry.

## Current architecture

The repository keeps the simulation and presentation responsibilities separate:

- **Creature mechanics:** body deformation, gait, fin articulation and propulsion.
- **Translational dynamics:** forces, drag, buoyancy, velocity and position.
- **Attitude dynamics:** moments, angular rates and 3D orientation.
- **Behaviour:** autonomous intent and state transitions; behaviour requests motion but does not teleport creatures.
- **Environment:** terrain, habitat features and spatial queries.
- **Rendering:** fixed-camera presentation derived from simulation state.

The Phase 6 renderer and terrain prototypes are isolated behind their own modules and tests. The existing habitat remains the regression reference while integration proceeds. The volumetric voxel study and Osmocean creature-model review are separate experiments; neither has replaced the live habitat yet.

## Core project records

- [Development roadmap](ROADMAP.md)
- [Phase 0 architecture and coordinate conventions](PHASE_0.md)
- [Phase 2–4 movement sequences](PHASE_2_4.md)
- [Phase 6 environment and terrain work](PHASE_6.md)
- [Open asset sources and licences](ASSET_SOURCES.md)
- [Tap-to-swim navigation experiment](EXPERIMENT_TAP_TO_SWIM.md)
- [Main simulation: Schooling](schooling.html)
- [Schooling experiment notes](SCHOOLING_100.md)

## Phase 6 prototypes

- [Volumetric voxel terrain study](voxel-terrain-spike.html): signed-density seabed, Dual Contouring, caves and an overhanging arch.
- [Creature model and animation review](creature-model-review.html): pinned Osmocean GLB assets, embedded clip inspection and licence metadata.

These pages are engineering review surfaces, not alternate canonical habitat builds.

## Tests and local development

Use Node 22 or later for the built-in test runner:

```sh
npm test
```

To serve the static project locally:

```sh
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Scope and model limitations

Mocean uses biomechanical and ecological approximations. It is not a validated animal model, calibrated marine-ecology model or computational fluid-dynamics solver. Hydrodynamic and ecological coefficients are phenomenological; tests establish software and kinematic properties, not biological realism. Visual inspection, regression comparison and performance profiling remain necessary alongside automated tests.

---

<p align="center">
  <a href="https://gemquota.github.io/mocean/schooling.html"><strong>Explore the Schooling simulation ↗</strong></a>
  <br>
  <sub>Mocean · one evolving underwater world</sub>
</p>
