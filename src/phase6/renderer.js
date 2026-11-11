/**
 * Phase 6 renderer foundation.
 *
 * Rendering is deliberately downstream of simulation state. This module owns
 * the camera contract and WebGL renderer lifecycle only; it never imports or
 * mutates creature state.
 */

export const PHASE6_CAMERA = Object.freeze({
  position: Object.freeze({ x: 0, y: 21, z: 77.5 }),
  target: Object.freeze({ x: 0, y: 0, z: 0 }),
  worldUp: Object.freeze({ x: 0, y: 1, z: 0 }),
  focalScale: 1.08,
  near: 0.1,
  far: 220,
  maxPixelRatio: 1.5
});

/**
 * Match the existing habitat's perspective projection:
 * focal length = min(view width, view height) * focalScale.
 */
export function cameraFovDegrees(width, height, focalScale = PHASE6_CAMERA.focalScale) {
  if (!(width > 0) || !(height > 0) || !(focalScale > 0)) {
    throw new RangeError('Camera dimensions and focal scale must be positive.');
  }
  const focalLength = Math.min(width, height) * focalScale;
  return 2 * Math.atan(height / (2 * focalLength)) * 180 / Math.PI;
}

export function detectWebGL2(documentRef = globalThis.document) {
  if (!documentRef?.createElement) return false;
  try {
    const probe = documentRef.createElement('canvas');
    return Boolean(probe.getContext('webgl2', { alpha: true, antialias: false }));
  } catch {
    return false;
  }
}

/**
 * Construct a renderer using an injected Three.js namespace. Injection keeps
 * the simulation/test modules independent of a particular renderer package.
 */
export function createPhase6Renderer({ THREE, canvas, pixelRatio = 1 }) {
  if (!THREE?.WebGLRenderer || !THREE?.PerspectiveCamera || !THREE?.Scene) {
    throw new TypeError('A compatible Three.js namespace is required.');
  }
  if (!canvas) throw new TypeError('A canvas is required.');

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(Math.max(pixelRatio, 1), PHASE6_CAMERA.maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    50,
    1,
    PHASE6_CAMERA.near,
    PHASE6_CAMERA.far
  );
  camera.position.set(
    PHASE6_CAMERA.position.x,
    PHASE6_CAMERA.position.y,
    PHASE6_CAMERA.position.z
  );
  camera.up.set(PHASE6_CAMERA.worldUp.x, PHASE6_CAMERA.worldUp.y, PHASE6_CAMERA.worldUp.z);
  camera.lookAt(
    PHASE6_CAMERA.target.x,
    PHASE6_CAMERA.target.y,
    PHASE6_CAMERA.target.z
  );

  function resize(width, height) {
    if (!(width > 0) || !(height > 0)) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = cameraFovDegrees(width, height);
    camera.updateProjectionMatrix();
  }

  function render() {
    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.dispose();
  }

  return Object.freeze({ renderer, scene, camera, resize, render, dispose });
}
