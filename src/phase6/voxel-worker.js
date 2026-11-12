import { createSeabedDensityField } from './voxel-field.js';
import { buildDualContourMesh } from './dual-contouring.js';

self.addEventListener('message', event => {
  const message = event.data;
  if (message?.type !== 'generate') return;
  try {
    const sample = createSeabedDensityField({ seed: message.seed });
    const mesh = buildDualContourMesh({
      sample,
      origin: message.origin,
      cells: message.cells,
      cellSize: message.cellSize
    });
    const result = {
      positions: mesh.positions,
      normals: mesh.normals,
      indices: mesh.indices,
      vertexCount: mesh.vertexCount,
      triangleCount: mesh.triangleCount,
      bounds: mesh.bounds
    };
    self.postMessage({ type: 'complete', mesh: result }, [
      result.positions.buffer, result.normals.buffer, result.indices.buffer
    ]);
  } catch (error) {
    self.postMessage({ type: 'error', message: String(error?.stack ?? error) });
  }
});
