# Planetary-to-local world coherence repair

## Problems observed

The previous live path split one habitat across incompatible representations:

- The planetary overview was a separate stylised sphere.
- Local voxel chunks were projected into cached Canvas tiles.
- Creature instances were rendered from live world coordinates by a Three.js camera.
- The terrain tile cache was keyed only by viewport dimensions, so it could retain an old screen projection after camera movement.
- Zoom enlarged those cached raster tiles instead of increasing geometric detail.
- The WebGL planet pass was overwritten by the local-camera render as soon as the local-world crossfade began, while the 2D fallback globe was suppressed.

That combination explains stale terrain, pixelation, detached creature/terrain motion, and the abrupt planet hand-off.

## Changes

### Shared local-world camera

Streamed voxel chunks are now attached as native Three.js meshes. They remain in their original habitat coordinates and are rendered with the same perspective camera used by the procedural creature instances. The terrain and creature layers therefore share camera position, target, orientation, field of view and viewport aspect.

The terrain WebGL canvas sits below the transparent 2D habitat overlay. The creature WebGL canvas remains above it. This preserves the existing 2D vegetation and interface layering while removing screen-space raster tiles from the live terrain path. The Canvas terrain path remains available if the terrain WebGL context cannot be created or is lost.

### Planet-to-geography hand-off

The planetary overview remains visible in the 2D presentation layer during the full crossfade, rather than being overwritten by a second camera render. The active streamed voxel terrain mesh is projected onto the globe using the same planetary tangent frame used by local navigation. Its edge is feathered into the stylised global bathymetry.

As zoom increases, the curved planetary patch fades out while the exact same terrain chunks appear as flat world-space meshes. The transition is still a curved-to-local presentation blend, not a fully spherical voxel planet or a fluid continuous mesh morph.

The globe reaches full display scale at the start of the hand-off and can recede to 3.5% of its normal radius at the new outer zoom limit. The minimum zoom is 0.2% of local-fit zoom.

### Planet rotation and geographic focus

A drag no longer rotates only a decorative globe. The surface point moved under the centre of the globe is converted back into local tangent coordinates, and the local camera target and terrain stream focus are moved to that location. Zooming in after rotating therefore enters the selected geographic area.

## Validation

Automated tests cover:
- native world-space terrain mesh attachment and disposal;
- Canvas fallback after WebGL detachment;
- shared terrain/creature camera integration;
- planetary globe scale and outer zoom range;
- geographic focus updates after globe rotation;
- use of live terrain mesh data in the planetary overview.

## Limits and remaining verification

- The global ocean/land appearance remains a stylised procedural overview. Only the active local voxel patch is derived from the live terrain field.
- The curved planetary patch is a Canvas projection of the streamed mesh; local terrain and creatures are native WebGL geometry.
- No full browser visual inspection has been completed in this environment.
- No FPS or GPU-memory benchmark has been completed. The terrain now uses a second WebGL context alongside the creature renderer, so performance and context-loss behaviour require browser testing.
- The existing terrain chunk seam/manifold issue remains separate and is not masked by this change.
