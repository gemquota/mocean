# Planetary streaming and camera handoff

## Changes

- The global planet surface now uses deterministic multi-frequency 3D value noise sampled on unit-sphere coordinates. A three-axis domain warp breaks up rounded noise blobs, while a masked ridged field adds connected mountain systems to continental interiors. Regional and coastal frequencies refine the outlines without a longitude seam or latitude singularity.
- Land colouring varies with elevation, latitude and a slow moisture field, with continental shelves, high-elevation snow, subtle abyssal basin bands, drifting cloud fields, directional day/night shading, ocean glint and a soft atmospheric rim.
- The shared seabed elevation field now preserves the authored starter habitat and blends into a deterministic world-coordinate geology field beyond it. The wider field combines warped continental relief, regional and fine-scale noise, ridged uplands, a winding primary canyon, a branching secondary channel, shelf breaks, raised canyon shoulders and broad depositional fans at canyon outlets. The same height function feeds voxel extraction and creature contact, so the visible seabed and collision surface remain aligned.
- Beyond the authored reef, the shared voxel SDF now adds deterministic cave complexes on a 96 m world grid: surface throats, enlarged chambers and two branching galleries. The caves are real meshable voids in the same field used for contact. Cave sites are cached and spatially bounded during sampling to limit worker cost.
- Local voxel terrain shading adds mineral variation, thin elevation-following strata, stronger cliff darkening and slope-aware lighting. Existing authored starter-region caves, ledges and ravines remain intact.

- The planetary-to-local transition now spherically interpolates the shared 3D camera from a radial, top-down view to the authored habitat camera direction. Camera distance and target remain fixed during the interpolation.
- The globe expands to cover the viewport as the camera approaches the surface, hiding the presentation cut at the surface hand-off. At the hand-off midpoint, planetary presentation switches off and local geography switches on; the two incompatible surface projections are never composited together.
- The camera continues its spherical orientation interpolation through the presentation switch, while the live voxel patch remains attached to the globe before the switch.
- Planetary terrain streaming can opt out of the local habitat bounds while retaining the same voxel field, worker pipeline, LOD and mesh ownership.
- The planetary stream requests 57 visible chunks and 32 predictive chunks (89 desired chunks total), with a 128 chunk cache ceiling. Remote chunks receive deterministic per-chunk rock features.
- Local habitat streams remain bounded by default. The planetary mode is explicit and does not change the fish simulation coordinate frame.

## Important limits

- This is focus-centred streaming, not a pre-generated, permanently resident 128-tile spherical atlas. Chunks outside the current streaming window are evicted and regenerated when revisited.
- The underlying geological signed-distance field is still authored around the original habitat. Remote chunks currently gain the shared seabed relief and deterministic chunk-local rock features; a globally varied procedural geology field is still needed for convincing world-scale geological diversity.
- The geographic mapping uses the existing spherical exponential/tangent mapping. Its antipode is a coordinate singularity; a cube-sphere or hierarchical equal-area tile address scheme is the longer-term solution for seamless global coverage.
- The globe's global land/ocean field is still a stylised procedural geography, not Earth data or a geologically calibrated planet. It establishes coherent continents and climate-like variation, not tectonic plates, drainage basins or realistic erosion.
- The new streamed world-scale geology now combines continuous heightfield relief, procedural rock placement and SDF cave complexes. The caves are deterministic stylised features, not geologically calibrated karst or tectonic systems. True stratigraphic volumes, fracture-controlled cave development and plate-boundary simulation remain out of scope.
- No browser visual review or frame-time benchmark is claimed by this change. Tests validate spherical-noise determinism/seam behaviour, the presentation hand-off, remote chunk requests, worker rock generation and integration wiring.

## Verification

The camera helper is tested at blend endpoints and midpoint for continuity and constant distance. Stream tests assert that an out-of-bounds focus still requests chunks and propagates the procedural-rock option. The voxel worker regression test exercises deterministic remote chunk generation.
