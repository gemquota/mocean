/**
 * Seamless 2D planetary atlas.
 *
 * This equirectangular atlas reuses the globe's spherical elevation field.
 * The polar margins collapse to a shared, longitude-independent seam so the
 * navigable map can wrap in both axes. Only visible repeated cells are drawn.
 */
import { terrainColour } from './habitat-terrain-stream.js';
import { planetaryGlobalSurfaceElevation } from './planetary-renderer.js';

const GRID_X = 64;
const GRID_Y = 32;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const fade = value => value * value * value * (value * (value * 6 - 15) + 10);
const smoothstep = (a, b, value) => {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;

function hash2(x, y, seed) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function periodicNoise(u, v, frequency, seed) {
  const x = mod(u, 1) * frequency, y = mod(v, 1) * frequency;
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = fade(x - ix), fy = fade(y - iy);
  const a = hash2(mod(ix, frequency), mod(iy, frequency), seed);
  const b = hash2(mod(ix + 1, frequency), mod(iy, frequency), seed);
  const c = hash2(mod(ix, frequency), mod(iy + 1, frequency), seed);
  const d = hash2(mod(ix + 1, frequency), mod(iy + 1, frequency), seed);
  const top = a + (b - a) * fx, bottom = c + (d - c) * fx;
  return top + (bottom - top) * fy;
}

export function planetaryMapElevation(u, v) {
  if (!Number.isFinite(u) || !Number.isFinite(v)) throw new RangeError('Map coordinates must be finite.');
  const wrappedU = mod(u, 1), wrappedV = mod(v, 1);
  const longitude = wrappedU * Math.PI * 2 - Math.PI;
  const latitude = (.5 - wrappedV) * Math.PI;
  const spherical = planetaryGlobalSurfaceElevation(longitude, latitude);
  // Collapse both polar margins to the same longitude-independent value. This
  // keeps the north/south atlas seam continuous while retaining the globe's
  // actual geography everywhere outside the small polar caps.
  const polarWeight = smoothstep(1.42, Math.PI / 2, Math.abs(latitude));
  return spherical * (1 - polarWeight) + .5 * polarWeight;
}

function mapMoisture(u, v) {
  return periodicNoise(u, v, 8, 101) * .62 + periodicNoise(u, v, 16, 131) * .38;
}

const MAP_CELLS = (() => {
  const cells = [];
  for (let y = 0; y < GRID_Y; y++) {
    for (let x = 0; x < GRID_X; x++) {
      const u = (x + .5) / GRID_X, v = (y + .5) / GRID_Y;
      const elevation = planetaryMapElevation(u, v);
      cells.push({ x, y, elevation, moisture: mapMoisture(u, v) });
    }
  }
  return cells;
})();

function mapColour(cell) {
  const elevation = cell.elevation;
  if (elevation < .43) return elevation < .29 ? '#082d46' : '#0d4960';
  if (elevation < .51) return '#236b78';
  if (elevation < .555) return '#9b9a78';
  if (elevation > .78) return '#c5cbbd';
  if (cell.moisture < .38) return '#a79770';
  if (cell.moisture > .66) return '#477a65';
  return '#718d70';
}

/** Render a wrapped 2:1 planetary map centred on a periodic map focus. */
export function drawPlanetaryMap(ctx, width, height, {
  focus = { u: .5, v: .5 },
  zoom = 1,
  opacity = 1,
  terrainMeshes = [],
  planetaryFrame = null
} = {}) {
  if (!ctx || !Number.isFinite(width) || !Number.isFinite(height) ||
      !focus || !Number.isFinite(focus.u) || !Number.isFinite(focus.v) ||
      !Number.isFinite(zoom) || zoom <= 0 || opacity <= .001) return;

  const mapWidth = Math.min(width, height * 2) * .92 * zoom;
  const mapHeight = mapWidth / 2;
  const cellWidth = mapWidth / GRID_X, cellHeight = mapHeight / GRID_Y;
  const cx = width * .5, cy = height * .5;
  ctx.save();
  ctx.globalAlpha *= clamp(opacity, 0, 1);
  ctx.fillStyle = '#061b2b';
  ctx.fillRect(0, 0, width, height);

  // Repeated copies are culled against the viewport. There is no world edge.
  for (let tileY = -2; tileY <= 2; tileY++) {
    for (let tileX = -2; tileX <= 2; tileX++) {
      const tileLeft = cx + (tileX - focus.u) * mapWidth;
      const tileTop = cy + (tileY - focus.v) * mapHeight;
      if (tileLeft > width || tileLeft + mapWidth < 0 ||
          tileTop > height || tileTop + mapHeight < 0) continue;
      for (const cell of MAP_CELLS) {
        const x = tileLeft + cell.x * cellWidth;
        const y = tileTop + cell.y * cellHeight;
        if (x > width || x + cellWidth < 0 || y > height || y + cellHeight < 0) continue;
        ctx.fillStyle = mapColour(cell);
        ctx.fillRect(x, y, cellWidth + .35, cellHeight + .35);
      }
    }
  }

  // Preserve the exact active habitat patch over the procedural global atlas.
  if (planetaryFrame && terrainMeshes.length) {
    let triangleBudget = 2600, total = 0;
    for (const mesh of terrainMeshes) total += Math.floor((mesh.indices?.length ?? 0) / 3);
    const stride = Math.max(1, Math.ceil(total / triangleBudget));
    for (const mesh of terrainMeshes) {
      const { positions, normals, indices } = mesh;
      if (!positions || !normals || !indices) continue;
      for (let index = 0; index < indices.length; index += 3 * stride) {
        const points = [], normal = [0, 0, 0], position = [0, 0, 0];
        let valid = true;
        for (let vertex = 0; vertex < 3; vertex++) {
          const offset = indices[index + vertex] * 3;
          const x = positions[offset], y = positions[offset + 1], z = positions[offset + 2];
          const geo = planetaryFrame.localToGeographic(x, -z);
          let u = geo.longitude / (Math.PI * 2) + .5;
          let v = .5 - geo.latitude / Math.PI;
          u -= Math.round(u - focus.u);
          v -= Math.round(v - focus.v);
          const px = cx + (u - focus.u) * mapWidth;
          const py = cy + (v - focus.v) * mapHeight;
          points.push({ x: px, y: py });
          if (px < -mapWidth || px > width + mapWidth || py < -mapHeight || py > height + mapHeight) valid = false;
          for (let axis = 0; axis < 3; axis++) {
            normal[axis] += normals[offset + axis] / 3;
            position[axis] += [x, y, z][axis] / 3;
          }
        }
        if (!valid) continue;
        ctx.beginPath();
        points.forEach((point, pointIndex) => pointIndex ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
        ctx.closePath();
        ctx.fillStyle = terrainColour(normal, position);
        ctx.globalAlpha = clamp(opacity, 0, 1) * .92;
        ctx.fill();
      }
    }
  }

  // Fine tile seams are intentionally absent: adjacent copies share the same
  // periodic samples and are drawn with overlapping sub-pixel cell edges.
  ctx.restore();
}
