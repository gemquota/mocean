# Progressive ocean world streaming

Mocean's mixed habitat uses one deterministic world coordinate system and three camera-relative presentation scales.

| Scale | Relative zoom | Terrain voxel size | Presentation |
|---|---:|---:|---|
| Ocean | 1.0–about 2.0x fit | 3.2 m | Broad geography and low-frequency seabed form |
| Geology | about 2.0–4.2x fit | 1.6 m | Local cliffs, ravines, ledges and caves |
| Ecology | above about 4.2x fit | 0.8 m | Fine terrain and local habitat detail |

The scale controller uses continuous detail blend values and hysteresis. Terrain LOD changes are generated in a replacement stream while the previous stream remains visible; the replacement fades in only after visible chunks arrive. Camera panning translates the camera and target together in the habitat plane, preserving the view basis and creature/world coordinate relationship.

Chunk selection is centred on the camera target and bounded to the configured world footprint. The terrain worker samples the same signed-distance field at each resolution, so LOD changes alter sampling density rather than changing geological coordinates or feature placement.

The three scales are presentation and sampling tiers, not three independent worlds. Current habitat ecology remains phenomenological and authored; the scale architecture does not claim validated marine population distributions or fluid simulation.
