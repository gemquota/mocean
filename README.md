# Mocean

<p align="center">
  <strong>A living underwater world, driven by simulated creatures.</strong><br>
  An evolving marine habitat with autonomous schooling, mixed species, population dynamics and experimental 3D environment work.
</p>

<p align="center">
  <a href="https://gemquota.github.io/mocean/schooling.html"><strong>▶ OPEN THE MAIN SIMULATION</strong></a>
  &nbsp;·&nbsp;
  <a href="https://gemquota.github.io/mocean/development.html">Development blueprint</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/gemquota/mocean">Source repository</a>
</p>

<p align="center">
  <a href="https://github.com/gemquota/mocean/actions/workflows/test.yml"><img alt="Core tests" src="https://github.com/gemquota/mocean/actions/workflows/test.yml/badge.svg"></a>
  <a href="https://github.com/gemquota/mocean/actions/workflows/pages.yml"><img alt="GitHub Pages deployment" src="https://github.com/gemquota/mocean/actions/workflows/pages.yml/badge.svg"></a>
</p>

---

## The main simulation

**[▶ Launch Schooling · the main Mocean simulation](https://gemquota.github.io/mocean/schooling.html)**

Schooling is the primary live Mocean experience. It runs a mixed-species underwater habitat with autonomous group motion, individual variation, population controls and a growing set of marine species.

The original [single-creature swimmer](https://gemquota.github.io/mocean/) remains available as a focused locomotion prototype and engineering reference. It is not the main product.

## Project map

| Area | Location | Purpose |
|---|---|---|
| Main simulation | `schooling.html` | Live mixed-species schooling habitat |
| Single-creature prototype | `index.html` | Focused locomotion and manoeuvre reference |
| Schooling model | `src/schooling.js` | Creature state, group behaviour and habitat simulation |
| Locomotion core | `src/core/` | Body mechanics, dynamics, intent, navigation and behaviour |
| 3D/environment experiments | `src/phase6/` | Terrain, voxel, water, model and renderer modules |
| Automated tests | `tests/` | Core, habitat, schooling and Phase 6 regression coverage |
| Build/deployment workflows | `.github/workflows/` | Tests and GitHub Pages publishing |

## Development status

The live Schooling habitat is the main simulation. The separate locomotion and Phase 6 engineering tracks continue to develop supporting mechanics, rendering and environment technology. Their prototypes are not automatically part of the live habitat simply because their modules or review pages exist.

See the [engineering roadmap](ROADMAP.md) for phase history and task status, and [Phase 6](PHASE_6.md) for the 3D environment, seabed and water work.

## Project documentation

- [Engineering roadmap](ROADMAP.md)
- [Schooling simulation and model notes](SCHOOLING.md)
- [Phase 0 architecture and coordinate conventions](PHASE_0.md)
- [Phases 2–4 movement primitives and sequences](PHASE_2_4.md)
- [Phase 6 environment, seabed and water](PHASE_6.md)
- [Marine model sources and licences](ASSET_SOURCES.md)
- [Tap-to-swim navigation experiment](EXPERIMENT_TAP_TO_SWIM.md)

## Engineering previews

These are review surfaces and experiments, not alternate main simulations:

- [3D renderer and terrain spike](phase6-spike.html)
- [Volumetric voxel terrain spike](voxel-terrain-spike.html)
- [Voxel terrain study](voxel-terrain-study.html)
- [Creature model and animation review](creature-model-review.html)
- [Naturalistic marine model review](creature-model-review.html)
- [Development blueprint](development.html)

## Tests and local development

Requirements: Node.js 22 or later.

Run the automated suite:

```sh
npm test
```

Serve the static site locally from the repository root:

```sh
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000). The main simulation is at `/schooling.html`.

## Deployment

GitHub Pages deploys the repository's `main` branch through [pages.yml](.github/workflows/pages.yml). The workflow downloads and validates twelve CC0 naturalistic marine GLBs from 3DAssets.dev, then generates a model catalogue before deployment. It no longer stages the Quaternius or Gobkit cartoon model packs. Core tests run separately through [test.yml](.github/workflows/test.yml).

## Scope and model limitations

Mocean is an experimental real-time simulation, not a validated animal model, calibrated marine-ecology model or computational fluid-dynamics solver. Hydrodynamic and ecological coefficients are phenomenological approximations. Automated tests establish software and selected kinematic properties, not biological realism. Visual inspection, regression comparison and performance profiling remain necessary.

The current naturalistic GLBs are smooth-shaded, untextured static studies, not photoreal scans or rigged animation assets. Shader-based body and wing deformation provides visible swimming, but detailed fin articulation and skeletal motion remain future work.

---

<p align="center">
  <a href="https://gemquota.github.io/mocean/schooling.html"><strong>Explore the Schooling simulation ↗</strong></a>
  <br>
  <sub>Mocean · one evolving underwater world</sub>
</p>
