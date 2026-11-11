# Mocean

<p align="center">
  <strong>A living underwater world, driven by simulated creatures.</strong><br>
  A real-time aquatic simulation exploring locomotion, behaviour, ecology and a spatial marine habitat.
</p>

<p align="center">
  <a href="https://mocean-tap-to-swim-3d.vercel.app/"><strong>▶ OPEN THE CURRENT BUILD</strong></a>
  &nbsp;·&nbsp;
  <a href="https://mocean-tap-to-swim-3d.vercel.app/development.html">Development presentation</a>
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

## Builds

The links below point to real Vercel deployments. The first link is the stable production alias; the others are retained snapshots of earlier milestones, not separate active projects.

| Build | What it represents | Link |
|---|---|---|
| **Current · Phase 6 spatial terrain** | Latest production build on `main`, including the Phase 6 spatial-terrain integration | [Open current build](https://mocean-tap-to-swim-3d.vercel.app/) |
| Phase 6 · Environment foundation | Earlier production snapshot with the initial 3D renderer and terrain prototype | [Open build](https://mocean-tap-to-swim-3d-nm4373ozd-gemquotas-projects.vercel.app/) |
| Phase 2–4 · Locomotion sequences | Production snapshot containing physics-driven movement primitives and compound manoeuvre intent | [Open build](https://mocean-tap-to-swim-3d-kv0qsynz8-gemquotas-projects.vercel.app/) |
| Phase 6 · Spatial-terrain preview | Branch preview for the terrain-query work that was subsequently integrated into `main` | [Open preview](https://mocean-tap-to-swim-3d-htk8fqs7k-gemquotas-projects.vercel.app/) |

Deployment URLs are snapshots and may eventually be retired by the hosting provider. The stable production alias above is the canonical link to share.

## What Mocean is

Mocean is a full-screen aquatic simulation. The habitat and its creatures are the experience: there is no user-facing configuration dashboard. Creature movement is intended to emerge from body mechanics, inertia, resistance and behavioural intent rather than canned animation cycles.

The project has expanded from a single flexible swimmer into a richer marine habitat with multiple fish and benthic species, reefs, vegetation and spatial environment work. The current focus is making the habitat genuinely three-dimensional while preserving the existing simulation and its working behaviours.

## Current development status

- **Phase 0 · Architecture and baseline:** approved.
- **Phase 1 · True 3D locomotion foundation:** approved.
- **Phases 2–5:** provisionally labelled *candidate complete*. This is a working status only; visual acceptance, integration checks and/or independent user confirmation remain open. It is not final phase approval.
- **Phase 6 · Environment, seabed and water:** authorised and in progress. The current increment adds a staged 3D renderer, spatial terrain geometry and renderer-independent terrain-clearance queries. Browser visual verification and performance profiling remain important acceptance work.
- **Phase 7 · Integration and polish:** not started.

See the [canonical roadmap](ROADMAP.md) and [Phase 6 record](PHASE_6.md) for task-level status and evidence. The [development presentation](https://mocean-tap-to-swim-3d.vercel.app/development.html) provides the visual project overview.

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

The Phase 6 renderer and terrain prototype are isolated behind their own modules and tests. The existing habitat remains the regression reference while integration proceeds.

## Core project records

- [Development roadmap](ROADMAP.md)
- [Phase 0 architecture and coordinate conventions](PHASE_0.md)
- [Phase 2–4 movement sequences](PHASE_2_4.md)
- [Phase 6 environment and terrain work](PHASE_6.md)
- [Open asset sources and licences](ASSET_SOURCES.md)
- [Tap-to-swim navigation experiment](EXPERIMENT_TAP_TO_SWIM.md)
- [Schooling experiment](SCHOOLING_100.md)

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
  <a href="https://mocean-tap-to-swim-3d.vercel.app/"><strong>Explore the current build ↗</strong></a>
  <br>
  <sub>Mocean · one evolving underwater world</sub>
</p>
