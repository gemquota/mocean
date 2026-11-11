/**
 * Lightweight, deterministic underwater attenuation and suspended-particle data.
 * These are rendering helpers only; they do not feed back into simulation state.
 */

const clamp01 = value => Math.max(0, Math.min(1, value));

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Beer-Lambert transmittance per colour channel. Red is absorbed fastest,
 * followed by green; blue penetrates furthest in this simplified water model.
 */
export function waterTransmittance(distance, coefficients = { red: 0.045, green: 0.018, blue: 0.009 }) {
  if (!(distance >= 0) || !Number.isFinite(distance)) {
    throw new RangeError('Water distance must be a non-negative finite number.');
  }
  for (const channel of ['red', 'green', 'blue']) {
    if (!(coefficients[channel] >= 0) || !Number.isFinite(coefficients[channel])) {
      throw new RangeError('Absorption coefficients must be non-negative finite numbers.');
    }
  }
  return Object.freeze({
    red: Math.exp(-coefficients.red * distance),
    green: Math.exp(-coefficients.green * distance),
    blue: Math.exp(-coefficients.blue * distance)
  });
}

/** Blend an attenuated source colour towards a water-scattering colour. */
export function waterColorAtDistance(
  distance,
  source = { red: 0.7, green: 0.82, blue: 0.76 },
  scatter = { red: 0.025, green: 0.16, blue: 0.2 },
  coefficients
) {
  const transmission = waterTransmittance(distance, coefficients);
  const result = {};
  for (const channel of ['red', 'green', 'blue']) {
    if (!Number.isFinite(source[channel]) || !Number.isFinite(scatter[channel])) {
      throw new TypeError('Water colours must contain finite RGB channel values.');
    }
    result[channel] = clamp01(
      source[channel] * transmission[channel] + scatter[channel] * (1 - transmission[channel])
    );
  }
  return Object.freeze(result);
}

/** Generate repeatable, bounded suspended particles for a lightweight point cloud. */
export function generateWaterParticles({
  seed = 610211,
  count = 220,
  bounds = { minX: -42, maxX: 42, minY: -2, maxY: 18, minZ: -30, maxZ: 30 }
} = {}) {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError('Particle count must be a non-negative integer.');
  }
  for (const axis of ['X', 'Y', 'Z']) {
    if (!(bounds['max' + axis] > bounds['min' + axis])) {
      throw new RangeError('Particle bounds must have positive extent on every axis.');
    }
  }
  const random = seededRandom(seed);
  const range = (min, max) => min + random() * (max - min);
  const particles = Array.from({ length: count }, (_, index) => Object.freeze({
    id: 'particle-' + index,
    x: range(bounds.minX, bounds.maxX),
    y: range(bounds.minY, bounds.maxY),
    z: range(bounds.minZ, bounds.maxZ),
    phase: range(0, Math.PI * 2),
    speed: range(0.12, 0.42),
    amplitude: range(0.08, 0.38),
    size: range(0.035, 0.11)
  }));
  return Object.freeze(particles);
}
