const CORNERS = Object.freeze([
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
  [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]
]);
const EDGES = Object.freeze([
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7]
]);

function nodeIndex(i, j, k, ny, nz) {
  return (i * (ny + 1) + j) * (nz + 1) + k;
}
function cellIndex(i, j, k, ny, nz) {
  return (i * ny + j) * nz + k;
}
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

function solveQef(points, normals, fallback) {
  const matrix = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  const average = [0, 0, 0];
  for (let i = 0; i < points.length; i++) {
    const p = points[i], n = normals[i], projection = dot(n, p);
    for (let r = 0; r < 3; r++) {
      average[r] += p[r] / points.length;
      for (let c = 0; c < 3; c++) matrix[r][c] += n[r] * n[c];
      matrix[r][3] += n[r] * projection;
    }
  }

  // A tiny centroid regularizer stabilises nearly planar or underconstrained cells.
  const lambda = 1e-5;
  for (let axis = 0; axis < 3; axis++) {
    matrix[axis][axis] += lambda;
    matrix[axis][3] += lambda * average[axis];
  }

  for (let pivot = 0; pivot < 3; pivot++) {
    let best = pivot;
    for (let row = pivot + 1; row < 3; row++) {
      if (Math.abs(matrix[row][pivot]) > Math.abs(matrix[best][pivot])) best = row;
    }
    if (Math.abs(matrix[best][pivot]) < 1e-12) return average;
    if (best !== pivot) [matrix[pivot], matrix[best]] = [matrix[best], matrix[pivot]];
    const divisor = matrix[pivot][pivot];
    for (let c = pivot; c < 4; c++) matrix[pivot][c] /= divisor;
    for (let row = 0; row < 3; row++) {
      if (row === pivot) continue;
      const factor = matrix[row][pivot];
      for (let c = pivot; c < 4; c++) matrix[row][c] -= factor * matrix[pivot][c];
    }
  }
  return matrix.map(row => row[3]);
}

function appendQuad(indices, vertexIds, reverse, positions) {
  const q = reverse ? [vertexIds[0], vertexIds[3], vertexIds[2], vertexIds[1]] : vertexIds;
  const p = q.map(id => [positions[id * 3], positions[id * 3 + 1], positions[id * 3 + 2]]);
  const d02 = (p[0][0] - p[2][0]) ** 2 + (p[0][1] - p[2][1]) ** 2 + (p[0][2] - p[2][2]) ** 2;
  const d13 = (p[1][0] - p[3][0]) ** 2 + (p[1][1] - p[3][1]) ** 2 + (p[1][2] - p[3][2]) ** 2;
  if (d02 <= d13) indices.push(q[0], q[1], q[2], q[0], q[2], q[3]);
  else indices.push(q[0], q[1], q[3], q[1], q[2], q[3]);
}

/**
 * Extract an indexed smooth surface from a sampled signed density field.
 * This is a single-resolution prototype. Chunk stitching and LOD transitions
 * are intentionally not implied by this function.
 */
export function buildDualContourMesh({
  sample,
  origin = { x: -16, y: -12, z: -16 },
  cells = { x: 32, y: 24, z: 32 },
  cellSize = 1,
  gradientStep = cellSize * 0.25
} = {}) {
  if (typeof sample !== 'function') throw new TypeError('sample must be a density function.');
  if (![origin.x, origin.y, origin.z].every(Number.isFinite)
    || ![cells.x, cells.y, cells.z].every(v => Number.isInteger(v) && v >= 2)
    || !(cellSize > 0) || !Number.isFinite(cellSize)
    || !(gradientStep > 0) || !Number.isFinite(gradientStep)) {
    throw new RangeError('Invalid dual-contouring grid configuration.');
  }
  const { x: nx, y: ny, z: nz } = cells;
  const nodeCount = (nx + 1) * (ny + 1) * (nz + 1);
  if (nodeCount > 2_000_000) throw new RangeError('Voxel grid exceeds the 2-million sample safety limit.');

  const sampleAt = (x, y, z) => {
    const value = sample(x, y, z);
    if (!Number.isFinite(value)) throw new TypeError('Density sampler must return finite values.');
    return value;
  };
  const values = new Float32Array(nodeCount);
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) for (let k = 0; k <= nz; k++) {
    values[nodeIndex(i, j, k, ny, nz)] = sampleAt(
      origin.x + i * cellSize,
      origin.y + j * cellSize,
      origin.z + k * cellSize
    );
  }

  const cellVertexIds = new Int32Array(nx * ny * nz);
  cellVertexIds.fill(-1);
  const positions = [];
  const normals = [];
  const gradient = (p) => {
    const h = gradientStep;
    const gx = sampleAt(p[0] + h, p[1], p[2]) - sampleAt(p[0] - h, p[1], p[2]);
    const gy = sampleAt(p[0], p[1] + h, p[2]) - sampleAt(p[0], p[1] - h, p[2]);
    const gz = sampleAt(p[0], p[1], p[2] + h) - sampleAt(p[0], p[1], p[2] - h);
    const length = Math.hypot(gx, gy, gz);
    return length > 1e-10 ? [gx / length, gy / length, gz / length] : [0, 1, 0];
  };

  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
    const cornerPositions = CORNERS.map(([cx, cy, cz]) => [
      origin.x + (i + cx) * cellSize,
      origin.y + (j + cy) * cellSize,
      origin.z + (k + cz) * cellSize
    ]);
    const cornerValues = CORNERS.map(([cx, cy, cz]) => values[nodeIndex(i + cx, j + cy, k + cz, ny, nz)]);
    let hasInside = false, hasOutside = false;
    for (const value of cornerValues) {
      if (value < 0) hasInside = true;
      else hasOutside = true;
    }
    if (!hasInside || !hasOutside) continue;

    const intersections = [], intersectionNormals = [];
    for (const [a, b] of EDGES) {
      const va = cornerValues[a], vb = cornerValues[b];
      if ((va < 0) === (vb < 0)) continue;
      const t = Math.max(0, Math.min(1, va / (va - vb)));
      const pa = cornerPositions[a], pb = cornerPositions[b];
      const point = [
        pa[0] + (pb[0] - pa[0]) * t,
        pa[1] + (pb[1] - pa[1]) * t,
        pa[2] + (pb[2] - pa[2]) * t
      ];
      intersections.push(point);
      intersectionNormals.push(gradient(point));
    }
    if (!intersections.length) continue;

    const vertex = solveQef(intersections, intersectionNormals, cornerPositions[0]);
    for (let axis = 0; axis < 3; axis++) {
      const min = cornerPositions[0][axis];
      vertex[axis] = Math.max(min, Math.min(min + cellSize, vertex[axis]));
    }
    const normalSum = intersectionNormals.reduce((sum, n) => [
      sum[0] + n[0], sum[1] + n[1], sum[2] + n[2]
    ], [0, 0, 0]);
    let normalLength = Math.hypot(...normalSum);
    if (normalLength < 1e-10) {
      const fallbackNormal = gradient(vertex);
      normalSum[0] = fallbackNormal[0];
      normalSum[1] = fallbackNormal[1];
      normalSum[2] = fallbackNormal[2];
      normalLength = 1;
    }
    const vertexId = positions.length / 3;
    positions.push(...vertex);
    normals.push(normalSum[0] / normalLength, normalSum[1] / normalLength, normalSum[2] / normalLength);
    cellVertexIds[cellIndex(i, j, k, ny, nz)] = vertexId;
  }

  const indices = [];
  const getCell = (i, j, k) => {
    if (i < 0 || i >= nx || j < 0 || j >= ny || k < 0 || k >= nz) return -1;
    return cellVertexIds[cellIndex(i, j, k, ny, nz)];
  };
  const crossing = (a, b) => (a < 0) !== (b < 0);

  // X-directed grid edges. Winding points from solid toward water.
  for (let i = 0; i < nx; i++) for (let j = 1; j < ny; j++) for (let k = 1; k < nz; k++) {
    const a = values[nodeIndex(i, j, k, ny, nz)], b = values[nodeIndex(i + 1, j, k, ny, nz)];
    if (!crossing(a, b)) continue;
    const quad = [getCell(i, j - 1, k - 1), getCell(i, j, k - 1), getCell(i, j, k), getCell(i, j - 1, k)];
    if (quad.every(id => id >= 0)) appendQuad(indices, quad, a >= 0, positions);
  }
  // Y-directed grid edges.
  for (let i = 1; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 1; k < nz; k++) {
    const a = values[nodeIndex(i, j, k, ny, nz)], b = values[nodeIndex(i, j + 1, k, ny, nz)];
    if (!crossing(a, b)) continue;
    const quad = [getCell(i - 1, j, k - 1), getCell(i - 1, j, k), getCell(i, j, k), getCell(i, j, k - 1)];
    if (quad.every(id => id >= 0)) appendQuad(indices, quad, a >= 0, positions);
  }
  // Z-directed grid edges.
  for (let i = 1; i < nx; i++) for (let j = 1; j < ny; j++) for (let k = 0; k < nz; k++) {
    const a = values[nodeIndex(i, j, k, ny, nz)], b = values[nodeIndex(i, j, k + 1, ny, nz)];
    if (!crossing(a, b)) continue;
    const quad = [getCell(i - 1, j - 1, k), getCell(i, j - 1, k), getCell(i, j, k), getCell(i - 1, j, k)];
    if (quad.every(id => id >= 0)) appendQuad(indices, quad, a >= 0, positions);
  }

  const positionArray = new Float32Array(positions);
  const normalArray = new Float32Array(normals);
  const indexArray = new Uint32Array(indices);
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < positionArray.length; i += 3) {
    minX = Math.min(minX, positionArray[i]); maxX = Math.max(maxX, positionArray[i]);
    minY = Math.min(minY, positionArray[i + 1]); maxY = Math.max(maxY, positionArray[i + 1]);
    minZ = Math.min(minZ, positionArray[i + 2]); maxZ = Math.max(maxZ, positionArray[i + 2]);
  }
  return Object.freeze({
    positions: positionArray,
    normals: normalArray,
    indices: indexArray,
    cellVertexIds,
    vertexCount: positionArray.length / 3,
    triangleCount: indexArray.length / 3,
    bounds: Object.freeze({ minX, maxX, minY, maxY, minZ, maxZ })
  });
}
