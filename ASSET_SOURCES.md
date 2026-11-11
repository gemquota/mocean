# Phase 6 asset source register

Asset intake is deliberately separate from renderer work. A source being CC0 does not make its raw geometry or textures suitable for an ordinary browser. Every candidate needs a target format, polygon/texture budget, and a visual check in the actual underwater lighting.

## Preferred source

[Poly Haven](https://polyhaven.com/) publishes its HDRIs, textures and 3D models under CC0. Its licence page explicitly permits commercial use and redistribution without required attribution: https://polyhaven.com/license

Use the official asset download/API, not scraped preview images. Poly Haven's terms distinguish the CC0 asset files from protected site content such as preview renders and logos.

## Reviewed candidates

| Asset | Type | Source facts | Phase 6 decision |
|---|---|---|---|
| [Rock Face 02](https://polyhaven.com/a/rock_face_02) | Cliff/rock-face mesh | CC0; 30K triangles; 4.9 m wide; page lists glTF and 1K/2K/4K/8K options; 8K package shown as 48.97 MB | First mesh candidate. Download glTF at 1K or 2K, inspect topology and texture payload, then test LOD/instancing |
| [Coastal Cliff 01](https://polyhaven.com/a/coastal_cliff_01) | Cliff formation with overhangs and crevices | CC0; 866K triangles; 67.94 MB package | Useful silhouette reference, but too heavy to ship raw. Only consider after decimation and LOD generation |
| [Coast Rocks 03](https://polyhaven.com/a/coast_rocks_03) | Coastal boulder formation | CC0; 2M triangles; 105.16 MB package | Do not ship raw. Potential source for a heavily simplified static mesh |
| [Seaside Rock](https://polyhaven.com/a/seaside_rock) | PBR rock surface | CC0; 8K source texture package shown as 79.21 MB | Texture candidate only after reducing resolution and selecting a browser-friendly map set |

## Intake rules

- Prefer glTF/GLB for browser runtime and retain the original source URL and CC0 evidence.
- Start with 1K/2K textures; do not download 8K maps into the live scene by default.
- Strip unused maps, reduce texture dimensions, compress textures where supported, and record final byte sizes.
- Decimate high-poly cliff meshes and generate at least two LODs before runtime use.
- Reuse geometry/materials for repeated props; avoid one unique geometry allocation per instance.
- Imported creature clips may drive internal body/fin/limb deformation only. Root translation, orientation, velocity, acceleration and behaviour remain owned by Mocean's simulation. Disable or adapt clips that contain root motion or fight the simulated gait.
- Do not treat coastal moss/grass as underwater vegetation. Materials and asset appearance must be checked under the planned underwater lighting.
- Asset acceptance requires checking the downloaded file's embedded metadata and the official asset page's licence at intake time.

## Current state

No Poly Haven binary assets have been added to the repository yet. This register is a vetted source shortlist, not a claim that the models are already downloaded or integrated. The next asset task is a single low-resolution Rock Face 02 glTF intake test, followed by geometry/texture budget measurement in the isolated renderer spike.


## Osmocean creature model intake

The Mocean branch `phase6-voxel-terrain-and-creature-assets` adds a reproducible build-time intake of the model collections already used by Osmocean:

- **Quaternius Animated Fish Bundle:** twelve selected GLB fish, pinned through `Vitexus/ishtaria-client` commit `f42095c120c29a892c0c221bdc8357ac982ccfca`; CC0 1.0. The build retains the original bundle licence.
- **PolyFish rigged fish:** `fish_rigged.glb`, pinned to `unclemattmakes/polyfish` commit `1c0d7636f2c71fd81d001a597c13554f9cbdd417`; MIT. The procedural vertex-swim shader is adapted separately.
- **Ocean Animals: Whales, Sharks and Fish:** the published 3DAssets.dev pack manifest is checked at build time. Only published animal assets explicitly marked CC0 1.0 with no attribution requirement are accepted. The pack is AI-generated and its models are static posed meshes with no rig or animation clips; this limitation is retained in the catalogue.

The review page `creature-model-review.html` loads one model at a time and exposes any embedded animation clips. It is an asset inspection surface, not the live habitat renderer.

The exact-match mapping currently covers 16 of Mocean's 30 species. Unsupported species remain explicitly unmapped; they are not silently replaced by a vaguely similar animal. The production habitat remains Canvas 2D today, so the GLB bank is not yet wired into the live 30-species scene. The next integration task is to migrate the renderer while preserving the existing agent state and locomotion.
