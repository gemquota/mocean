/**
 * Flat equirectangular planetary atlas.
 *
 * This is the same spherical elevation field used by the globe, sampled into
 * a 2D map. Longitude and the polar margins join at the map seams, allowing
 * the atlas to repeat as a navigable plane. The ecology renderer takes over
 * as the user continues to zoom in.
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
  const elevation = planetarySurfaceElevation(longitude, latitude);
  const polarDistance = Math.abs(latitude);
  const polarBlend = clamp((polarDistance - 1.42) / (Math.PI / 2 - 1.42), 0, 1);
  const polarWeight = polarBlend * polarBlend * (3 - 2 * polarBlend);
  return elevation * (1 - polarWeight) + .5 * polarWeight;
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
    const v = y / MAP_HEIGHT;
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

/** Draw the same planet as a 2D plane, centred on the selected location. */
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
  const focusU = mod(focus.u, 1), focusV = mod(focus.v, 1);

  ctx.save();
  ctx.globalAlpha *= clamp(opacity, 0, 1);
  ctx.fillStyle = '#061b2b';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;

  // Draw only repeated map copies that intersect the viewport.
  const minTileX = Math.floor(-centreX / mapWidth + focusU);
  const maxTileX = Math.ceil((width - centreX) / mapWidth + focusU);
  const minTileY = Math.floor(-centreY / mapHeight + focusV);
  const maxTileY = Math.ceil((height - centreY) / mapHeight + focusV);
  for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
    for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      const left = centreX + (tileX - focusU) * mapWidth;
      const top = centreY + (tileY - focusV) * mapHeight;
      ctx.drawImage(texture, left, top, mapWidth, mapHeight);
    }
  }
  ctx.restore();
}
