/**
 * Equirectangular planetary-map coordinates.
 * Longitude is periodic; latitude is bounded at the poles.
 */
export const PLANET_MAP_ASPECT = 2;
const TAU = Math.PI * 2;
const clampUnit = value => Math.max(0, Math.min(1, value));

export function wrapUnit(value) {
  if (!Number.isFinite(value)) throw new RangeError('Map coordinate must be finite.');
  return ((value % 1) + 1) % 1;
}

export function geographicToMap(longitude, latitude) {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new RangeError('Geographic coordinates must be finite.');
  }
  return Object.freeze({
    u: wrapUnit(longitude / TAU + 0.5),
    v: clampUnit(0.5 - latitude / Math.PI)
  });
}

export function mapToGeographic(u, v) {
  if (!Number.isFinite(u) || !Number.isFinite(v)) {
    throw new RangeError('Map coordinates must be finite.');
  }
  return Object.freeze({
    longitude: wrapUnit(u) * TAU - Math.PI,
    latitude: (0.5 - clampUnit(v)) * Math.PI
  });
}

/** Pan horizontally through longitude; stop vertically at the geographic poles. */
export function panPlanetMap(focus, deltaX, deltaY, viewportWidth, viewportHeight, zoom = 1) {
  if (!focus || ![focus.u, focus.v, deltaX, deltaY, viewportWidth, viewportHeight, zoom].every(Number.isFinite) ||
      viewportWidth <= 0 || viewportHeight <= 0 || zoom <= 0) {
    throw new RangeError('Map focus, drag, viewport and zoom must be finite and valid.');
  }
  const mapWidth = Math.min(viewportWidth, viewportHeight * PLANET_MAP_ASPECT) * 0.92 * zoom;
  const mapHeight = mapWidth / PLANET_MAP_ASPECT;
  return Object.freeze({
    u: wrapUnit(focus.u - deltaX / mapWidth),
    v: clampUnit(focus.v - deltaY / mapHeight)
  });
}
