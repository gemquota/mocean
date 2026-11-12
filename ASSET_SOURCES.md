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


## Animated marine model intake

The GitHub Pages build stages and validates the complete animated Quaternius fish collection and one additional rigged PolyFish dolphin:

- **Quaternius Animated Fish Bundle:** all 35 GLB fish models from `Vitexus/ishtaria-client` commit `f42095c120c29a892c0c221bdc8357ac982ccfca`; CC0 1.0. The source licence is copied beside the models.
- **PolyFish dolphin:** `dolphin_rigged.glb` from `unclemattmakes/polyfish` commit `1c0d7636f2c71fd81d001a597c13554f9cbdd417`; MIT. Its original licence is copied beside the model. The GLB is skinned but has no baked clips, so its swim is driven by the PolyFish-derived vertex shader.
- **Gobkit Free 3D Assets:** `Jellyfish.glb`, `Seal.glb`, `Whale.glb`, `BlueTang.glb`, `Parrotfish.glb`, `Moorishidol.glb` and `Shark.glb`, downloaded from the live manifest at `https://gobkit.com/api/free`; CC0 1.0. The build verifies each exact URL, rig flag, clip metadata and embedded GLB animation timeline, and copies the pinned Gobkit CC0 licence.
- **Build verification:** `scripts/verify-animated-marine-models.mjs` parses each GLB's embedded glTF JSON chunk, requires animation clips, and writes a deployment-time `catalog.json` containing every model and clip name. The Pages build fails if a required model is absent, malformed or has no embedded animation.

The 35 Quaternius models include anglerfish, armored catfish, betta, black lionfish, blobfish, blue goldfish, blue tang, butterfly fish, cardinal fish, clownfish, coral grouper, cowfish, flatfish, flower horn, goblin shark, goldfish, humphead, koi, lionfish, mandarin fish, Moorish idol, parrot fish, piranha, puffer, red snapper, royal gramma, shark, sunfish, swordfish, tang, tetra, tuna, turbot, yellow tang and zebra clown fish. The extra PolyFish model is a dolphin. Gobkit adds jellyfish, seal, a generic whale model and alternate blue tang, parrotfish, Moorish idol and shark rigs. The Whale model is used as a transparent generic-whale stand-in for the sperm-whale species, not claimed as a species-specific sperm-whale sculpt.

The live habitat currently stages 43 animated model files (35 Quaternius, seven Gobkit and one PolyFish) and enables 15 of its 30 species: regular fish (blue goldfish), dedicated shoaling fish (tetra), clownfish, parrotfish, blue tang, butterflyfish, grouper, Moorish idol, tuna, shark, mola mola (sunfish), dolphin, jellyfish, seal and sperm whale (using a generic whale rig). The other 15 species are temporarily disabled in the prevalence controls and initial population because no suitable animated model is currently staged for them. The generic whale stand-in is explicitly recorded; other similar-looking animals are not silently substituted.

The live habitat uses the animated GLBs through its transparent Three.js overlay. The 35 Quaternius fish play their embedded swim clips; the dolphin's rig is driven by the adapted procedural swim shader. Several species select deterministic per-creature model variants, including additional Quaternius goldfish/koi, tetra/cardinal fish and clownfish, plus Gobkit blue tang/parrotfish/Moorish idol/shark alternatives. Gobkit's seven models store actions on a 24-fps master timeline, so the renderer extracts and loops only the idle frames (0–29) instead of accidentally playing attack/death/walk sequences. The existing Canvas species renderers remain as a graceful visual fallback while a model loads or if a runtime model load fails; they are no longer used to populate unsupported species. The model animation drives internal deformation only. Simulation position, heading, velocity and behaviour remain owned by `src/schooling.js`.

The manta species remains disabled for now. The older Quaternius seven-model fish pack includes an animated manta ray, and Poly Pizza mirrors it as a CC0 GLB bundle. I could not extract a stable direct GLB file URL from the Poly Pizza page; its documented API requires an API key, while Quaternius' original pack page lists FBX/OBJ/Blend only. I did not invent a CDN URL or substitute a static ray mesh.

The separate static Ocean Animals collection remains useful for future visual coverage but is not counted as animated and is not used to re-enable species. Its static posed meshes are not a substitute for a swim cycle.
