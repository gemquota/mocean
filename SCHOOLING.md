# Schooling · Main simulation

**Status:** Primary live Mocean simulation · published at [schooling.html](https://gemquota.github.io/mocean/schooling.html).

The Schooling habitat is the main product experience, not an isolated experiment. It simulates a mixed-species underwater world with autonomous group movement, individual variation, population controls and a shared marine environment.

## Model

Each creature has independent 3D position, velocity, body-forward direction and gait phase. A 3D spatial hash limits local-neighbour and collision candidate searches.

- **Separation:** local repulsion increases as creatures approach, with an anticipatory term for closing velocity.
- **Alignment:** velocity matching is deliberately damped so schools do not snap into one shared heading.
- **Cohesion:** weak centroid attraction preserves loose schools without collapsing them into a ball.
- **Inertia:** bounded acceleration and a gently regulated cruising speed replace per-frame speed snapping.
- **Attitude:** body-forward direction has a finite turn rate and lags velocity changes.
- **Collisions:** creatures are approximated as short oriented capsules. Soft positional correction and a low-restitution velocity impulse prevent body-centreline intersections without hard, explosive bounces.
- **Habitat pressure:** a smooth ellipsoidal force steers creatures away from the soft boundary.
- **Individual variation:** slow phase-offset drift prevents rigid rotating formations.

The live page starts with 150 creatures and exposes a population slider from 10 to 200 in steps of ten. Its full species catalogue contains 30 species, but only the 12 with reviewed naturalistic models are active by default. Eighteen species are temporarily disabled in the prevalence controls until appropriate models and movement are sourced. The habitat starts at 100 × 100 × 100 world units; its dimensions can be adjusted in the habitat configuration panel.

## Naturalistic model layer

The live habitat uses twelve species-matched, smooth-shaded, natural-colour GLBs from 3DAssets.dev. The GLBs are static posed studies with no rigs or baked clips. The renderer flattens their mesh hierarchies and applies procedural vertex motion: lateral body waves for fish, vertical tail strokes for cetaceans, wing waves for rays, and a bell pulse for jellyfish.

The selected models are not photoreal scans. They are untextured AI-generated smooth-shaded assets, but their body plans and natural colour palettes are a substantial improvement over the previous cartoon/low-poly packs. The exact species mapping, asset IDs, CC0 licence and animation limitations are recorded in [ASSET_SOURCES.md](ASSET_SOURCES.md).

**Enabled:** barracuda, marlin, tuna, great white shark, whale shark, mola, manta ray, stingray, orca, sperm whale, bottlenose dolphin and moon jellyfish.

**Temporarily disabled:** regular fish, schooling fish, clownfish, parrotfish, blue tang, angelfish, butterflyfish, grouper, Moorish idol, wobbegong, eel, crab, lobster, mantis shrimp, seal, starfish, turtle and sand eel.

The old Quaternius and Gobkit model packs are no longer staged or rendered in Schooling. Modelled species do not fall back to the cartoon Canvas renderers while loading or after a model failure. Unsupported species remain disabled rather than being represented by an unrelated model.

## Performance strategy

A uniform 3D spatial hash replaces an all-pairs neighbour scan. Each creature queries its local cell and adjacent cells; only nearby candidates receive distance and interaction tests. The same broad-phase grid feeds capsule collision checks.

The habitat uses a Canvas-based world layer plus a transparent Three.js overlay for the naturalistic GLBs. Geometry is cached by model ID and cloned per creature. Procedural deformation runs in the vertex shader; simulation position, heading, velocity and behaviour remain owned by `src/schooling.js`.

The camera's maximum zoom-in has been reduced from 4.5× to 3.5×, including pinch gestures. Minimum zoom-out remains tied to world dimensions so the camera cannot pull back beyond the world framing limit.

## Validation

The live habitat also uses a shared signed-distance voxel field for the visible seabed and creature terrain contact. The Pages build stages the twelve pinned-by-ID CC0 GLBs from their permanent CDN URLs and validates each file's GLB header, glTF 2.0 JSON chunk and mesh primitives. It also verifies that these models are static and that the procedural motion path is selected.

Automated coverage includes:

- Deterministic initialisation.
- Spatial-hash candidate work below all-pairs scanning for the 1,000-agent test distribution.
- Increased separation response as creatures approach and contact response for overlapping capsules.
- Bounded heading change from a finite angular rate.
- Finite state and bounded speed during sustained simulation.
- Exact species-to-model mappings, disabled-species filtering, GLB validation and procedural body/wing motion.

Visual and performance acceptance still require real-browser checks for silhouette quality, mesh deformation, visible interpenetration, jitter, frame time and memory use.

## Known limits

This is a phenomenological group model, not a validated biological schooling model. Collision geometry is a capsule approximation of each body, not a continuously deforming collision mesh. The simulation does not model fluid-mediated wakes, hydrodynamic schooling or full independent rigid-body attitude dynamics for every creature.

The naturalistic models use shader-based deformation rather than skeletal fin rigs. That gives the fish and cetaceans a travelling body wave and the rays a wing stroke, but detailed pectoral-fin articulation, gill motion, eye movement and species-specific joint chains remain future work.

The original [single-creature swimmer](https://gemquota.github.io/mocean/) remains a separate locomotion prototype and engineering reference.
