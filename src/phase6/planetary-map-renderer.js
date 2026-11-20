/**
 * Flat equirectangular planetary map.
 *
 * Longitude wraps continuously. Latitude remains bounded by the real poles:
 * the map is not tiled vertically and does not invent a polar seam.
 */
import { planetarySurfaceElevation } from './planetary-renderer.js';

const MAP_WIDTH = 512;
const MAP_HEIGHT = 256;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
const fade = value => value * value * value * (value * (value * 6 - 15) + 10);

function hash2(x, y, seed) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function periodicNoise(u, v, frequency, seed) {
  const x = mod(u, 1) * frequency, y = clamp(v, 0, 1) * frequency;
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = fade(x - ix), fy = fade(y - iy);
  const a = hash2(mod(ix, frequency), iy, seed);
  const b = hash2(mod(ix + 1, frequency), iy, seed);
  const c = hash2(mod(ix, frequency), iy + 1, seed);
  const d = hash2(mod(ix + 1, frequency), iy + 1, seed);
  const top = a + (b - a) * fx, bottom = c + (d - c) * fx;
  return top + (bottom - top) * fy;
}

export function planetaryMapElevation(u, v) {
  if (!Number.isFinite(u) || !Number.isFinite(v)) throw new RangeError('Map coordinates must be finite.');
  const longitude = mod(u, 1) * Math.PI * 2 - Math.PI;
  const latitude = (.5 - clamp(v, 0, 1)) * Math.PI;
  return planetarySurfaceElevation(longitude, latitude);
}

function colourFor(elevation, moisture) {
  if (elevation < .43) return elevation < .29 ? [8, 45, 70] : [13, 73, 96];
  if (elevation < .51) return [35, 107, 120];
  if (elevation < .555) return [155, 154, 120];
  if (elevation > .78) return [197, 203, 189];
  if (moisture < .38) return [167, 151, 112];
  if (moisture > .66) return [71, 122, 101];
  return [113, 141, 112];
}

let mapTexture = null;

function getMapTexture() {
  if (mapTexture || typeof document === 'undefined') return mapTexture;
  const canvas = document.createElement('canvas');
  canvas.width = MAP_WIDTH;
  canvas.height = MAP_HEIGHT;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return null;
  const image = context.createImageData(MAP_WIDTH, MAP_HEIGHT);
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const v = y / (MAP_HEIGHT - 1);
    for (let x = 0; x < MAP_WIDTH; x++) {
      const u = x / MAP_WIDTH;
      const elevation = planetaryMapElevation(u, v);
      const moisture = periodicNoise(u, v, 8, 101) * .62 + periodicNoise(u, v, 16, 131) * .38;
      const colour = colourFor(elevation, moisture);
      const offset = (y * MAP_WIDTH + x) * 4;
      image.data[offset] = colour[0];
      image.data[offset + 1] = colour[1];
      image.data[offset + 2] = colour[2];
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  mapTexture = canvas;
  return mapTexture;
}

/** Draw a bounded north-to-south map with a horizontally repeating longitude seam. */
export function drawPlanetaryMap(ctx, width, height, {
  focus = { u: .5, v: .5 },
  zoom = 1,
  opacity = 1
} = {}) {
  if (!ctx || !Number.isFinite(width) || !Number.isFinite(height) ||
      !focus || !Number.isFinite(focus.u) || !Number.isFinite(focus.v) ||
      !Number.isFinite(zoom) || zoom <= 0 || opacity <= .001) return;

  const texture = getMapTexture();
  if (!texture) return;
  const mapWidth = Math.min(width, height * 2) * .92 * zoom;
  const mapHeight = mapWidth / 2;
  const centreX = width * .5, centreY = height * .5;
  const focusU = mod(focus.u, 1), focusV = clamp(focus.v, 0, 1);
  const top = centreY - focusV * mapHeight;

  ctx.save();
  ctx.globalAlpha *= clamp(opacity, 0, 1);
  ctx.fillStyle = '#061b2b';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;

  // Repeat only longitude. The north and south poles are actual map edges.
  const minTileX = Math.floor(-centreX / mapWidth + focusU);
  const maxTileX = Math.ceil((width - centreX) / mapWidth + focusU);
  for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
    const left = centreX + (tileX - focusU) * mapWidth;
    ctx.drawImage(texture, left, top, mapWidth, mapHeight);
  }
  ctx.restore();
}
