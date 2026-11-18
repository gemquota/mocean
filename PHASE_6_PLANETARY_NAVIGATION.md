# Planetary navigation foundation

## Coordinate model

The live habitat remains the authoritative simulation space. Fish positions, velocities, gait state, terrain chunks and vegetation continue to use the existing local X/Y/Z coordinates. The planet is a geographic presentation of that same local world, not a second simulation.

A fixed geographic anchor (longitude 0, latitude 0) defines the local tangent frame. Local X maps east and negative local Z maps north. The toy planet radius is initial horizontal world extent multiplied by 2.5; it is intentionally a compact fictional ocean world, not an Earth-scale model. Exponential-map and inverse logarithmic-map conversions preserve metric offsets on the sphere and handle longitude wrapping and high latitudes.

The current camera target is converted through that frame for the planetary view. The globe camera orbits around the selected geographic focus, so the same location remains centred when zooming back into the local habitat.

## Navigation

- Wheel or pinch: zoom continuously from the planetary overview through ocean, geology and ecology.
- One-finger drag: orbit the planet at the outer scale; pan the local habitat at closer scales.
- Two-finger drag: orbit the planet or pan the local habitat.
- Two-finger twist: rotate the local camera azimuth or add planetary orbit roll.
- Two-finger pinch: zoom.

Planet/ocean handoff uses a continuous opacity blend with hysteresis. Local terrain streaming is held while the local view is mostly hidden, retaining the current chunk set during planetary navigation. Once the local view is substantially visible, the existing terrain LOD stream resumes and its established terrain crossfade handles resolution changes. The simulation fixed-step loop continues independently of presentation scale; creatures are not recreated or repositioned when the camera changes scale.

## Rendering and limitations

When WebGL is available, the overview is a lit Three.js sphere with procedural bathymetry and land colour. A Canvas 2D spherical fallback is retained until the WebGL model layer is ready or if it is unavailable. The procedural surface is a visual overview, not a globally sampled copy of the streamed voxel terrain yet. The local voxel habitat remains the authoritative detailed geology.

The spherical coordinate mapping is a coherent bridge for navigation and location identity. It does not yet make the local rectangular voxel terrain wrap around the entire planet, nor does it provide globally streamed geology/ecology. Those are separate follow-on tasks requiring a global terrain field and chunk addressing scheme.
