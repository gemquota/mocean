import { createGeologicalField } from './geological-field.js';
import { buildDualContourSurface } from './dual-contouring.js';

self.onmessage = () => {
  const started = performance.now();
  try {
    const field = createGeologicalField({ seed: 6102026 });
    const surface = buildDualContourSurface({
      min: [-48, -24, -36],
      max: [48, 5, 36],
      cells: [96, 36, 72],
      sampleDistance: (x, y, z) => field.sampleDistance(x, y, z),
      sampleColumn: (x, z) => field.sampleDistanceColumn(x, z)
    });
    const elapsed = performance.now() - started;
    self.postMessage({
      type: 'mesh',
      elapsed,
      surface: {
        positions: surface.positions,
        normals: surface.normals,
        indices: surface.indices,
        vertexCount: surface.vertexCount,
        triangleCount: surface.triangleCount
      }
    }, [surface.positions.buffer, surface.normals.buffer, surface.indices.buffer]);
  } catch (error) {
    self.postMessage({ type: 'error', message: error?.stack || String(error) });
  }
};
