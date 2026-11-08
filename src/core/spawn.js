// Initial world-space placement keeps the fish comfortably framed at first render.
// The negative Z offset places it farther from the fixed camera while leaving room to approach.
export const INITIAL_SPAWN_POSITION = Object.freeze({ x: 0, y: 0, z: -2.8 });
