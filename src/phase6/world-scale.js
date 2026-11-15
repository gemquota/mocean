/**
 * Three-scale world presentation policy.
 *
 * Zoom is normalised against the fit-to-world zoom, so thresholds remain
 * stable when the configured world dimensions change. Tier hysteresis avoids
 * repeatedly rebuilding terrain when the user hovers around a threshold.
 */
export const WORLD_SCALE_LEVELS = Object.freeze({
  ocean: Object.freeze({ id: 'ocean', terrainCellSize: 3.2 }),
  geology: Object.freeze({ id: 'geology', terrainCellSize: 1.6 }),
  ecology: Object.freeze({ id: 'ecology', terrainCellSize: 0.8 })
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = (min, max, value) => {
  const t = clamp((value - min) / (max - min), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Convert absolute camera zoom to a dimension-independent world zoom ratio. */
export function normaliseWorldZoom(zoom, fitZoom) {
  if (!Number.isFinite(zoom) || !Number.isFinite(fitZoom) || fitZoom <= 0) {
    throw new RangeError('zoom and fitZoom must be finite, with fitZoom positive.');
  }
  return Math.max(1, zoom / fitZoom);
}

/**
 * Map relative zoom to continuous detail blends and a hysteretic terrain tier.
 * Ocean -> geology begins around 1.9x fit; geology -> ecology around 4.0x fit.
 */
export function createWorldScaleController() {
  let level = 'ocean';
  return Object.freeze({
    update(relativeZoom) {
      if (!Number.isFinite(relativeZoom) || relativeZoom < 1) {
        throw new RangeError('relativeZoom must be finite and at least one.');
      }
      if (level === 'ocean' && relativeZoom >= 2.05) level = 'geology';
      else if (level === 'geology' && relativeZoom < 1.78) level = 'ocean';
      else if (level === 'geology' && relativeZoom >= 4.25) level = 'ecology';
      else if (level === 'ecology' && relativeZoom < 3.72) level = 'geology';

      const geologyBlend = smoothstep(1.45, 2.3, relativeZoom);
      const ecologyBlend = smoothstep(3.35, 4.65, relativeZoom);
      return Object.freeze({
        level,
        relativeZoom,
        geologyBlend,
        ecologyBlend,
        terrainCellSize: WORLD_SCALE_LEVELS[level].terrainCellSize,
        showLocalEcology: ecologyBlend > 0.015,
        showIndividualAnimals: ecologyBlend >= 0.96
      });
    },
    get level() { return level; }
  });
}

/**
 * Translate a camera parallel to the habitat plane from a one-finger screen
 * drag. The view-up vector is projected onto XZ and compensated for the
 * camera's shallow downward angle.
 */
export function screenDragToHabitatPan({
  deltaX, deltaY, depth, focalLength, viewRight, viewUp
}) {
  if (![deltaX, deltaY, depth, focalLength, viewRight?.x, viewRight?.z, viewUp?.x, viewUp?.z]
    .every(Number.isFinite) || depth <= 0 || focalLength <= 0) {
    throw new RangeError('Pan inputs must be finite and depth/focalLength positive.');
  }
  const worldPerPixel = depth / focalLength;
  const horizontalUpLength = Math.hypot(viewUp.x, viewUp.z);
  const verticalCompensation = horizontalUpLength > 1e-6 ? 1 / horizontalUpLength : 0;
  return {
    x: -viewRight.x * deltaX * worldPerPixel - viewUp.x * deltaY * worldPerPixel * verticalCompensation ** 2,
    z: -viewRight.z * deltaX * worldPerPixel - viewUp.z * deltaY * worldPerPixel * verticalCompensation ** 2
  };
}
