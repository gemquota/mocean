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

The live page starts with 150 creatures and exposes a population slider from 10 to 200 in steps of ten. Its full species catalogue contains 30 species, but only the 12 species with reviewed animated models are active by default. The other 18 are temporarily disabled in the prevalence controls until appropriate models are sourced. The rendered schooling-fish body scale is 25% of the shared single-creature body dimensions. The habitat starts at 100 × 100 × 100 world units; its dimensions can be adjusted in the habitat configuration panel. The simulation uses a fixed-step update and shares gait/body helpers with the single-creature locomotion prototype.

## Performance strategy

A uniform 3D spatial hash replaces an all-pairs neighbour scan. Each fish queries its local cell and adjacent cells; only nearby candidates receive distance and interaction tests. The same broad-phase grid feeds capsule collision checks. The habitat uses a Canvas-based world layer plus a transparent Three.js overlay for all 12 active species. Their models are selected from the complete 35-model Quaternius Animated Fish Bundle plus a rigged PolyFish dolphin. Quaternius models use baked swim clips; the dolphin is animated by the adapted PolyFish vertex-swim shader. Species without an appropriate animated model are temporarily disabled rather than shown with unrelated stand-ins. The Canvas renderer remains a graceful loading/runtime fallback.

This reduces work for a spatially distributed school, but actual frame time still depends on browser, screen resolution and device. Performance should be measured on representative hardware rather than inferred from algorithmic complexity alone.

## Validation

The live habitat also uses a shared signed-distance voxel field for the visible seabed and creature terrain contact. All 35 Quaternius fish GLBs are staged from a pinned CC0 source, alongside a pinned MIT-licensed PolyFish dolphin. A build-time verifier checks that each required GLB contains animation clips and writes a catalogue of clip names. Twelve exact species mappings are enabled; the remaining 18 species are explicitly disabled until matching animated assets are available.

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
