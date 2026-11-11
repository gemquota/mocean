import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraFovDegrees, PHASE6_CAMERA, createPhase6Renderer, detectWebGL2 } from '../src/phase6/renderer.js';

test('Phase 6 camera preserves the existing habitat focal-length contract', () => {
  const width = 1200, height = 800;
  const expected = 2 * Math.atan(height / (2 * Math.min(width, height) * 1.08)) * 180 / Math.PI;
  assert.ok(Math.abs(cameraFovDegrees(width, height) - expected) < 1e-12);
  assert.ok(cameraFovDegrees(800, 1200) > cameraFovDegrees(1200, 800));
  assert.throws(() => cameraFovDegrees(0, 800), RangeError);
});

test('Phase 6 camera origin and clipping remain explicit and bounded', () => {
  assert.deepEqual(PHASE6_CAMERA.position, { x: 0, y: 21, z: 77.5 });
  assert.deepEqual(PHASE6_CAMERA.target, { x: 0, y: 0, z: 0 });
  assert.ok(PHASE6_CAMERA.near > 0);
  assert.ok(PHASE6_CAMERA.far > PHASE6_CAMERA.near);
  assert.ok(PHASE6_CAMERA.maxPixelRatio <= 2);
});

test('WebGL2 capability detection fails safely without a document or context', () => {
  assert.equal(detectWebGL2(null), false);
  assert.equal(detectWebGL2({ createElement: () => ({ getContext: () => null }) }), false);
  assert.equal(detectWebGL2({ createElement: () => ({ getContext: name => name === 'webgl2' ? {} : null }) }), true);
  assert.equal(detectWebGL2({ createElement: () => { throw new Error('blocked'); } }), false);
});

test('renderer lifecycle uses a shared scene and camera and caps pixel ratio', () => {
  const calls = [];
  class Vector3 { set(...v) { calls.push(['vector', ...v]); } }
  class Scene {}
  class PerspectiveCamera {
    constructor(fov, aspect, near, far) { this.fov=fov;this.aspect=aspect;this.near=near;this.far=far;this.position=new Vector3();this.up=new Vector3(); }
    lookAt(...v) { calls.push(['lookAt', ...v]); }
    updateProjectionMatrix() { calls.push(['projection']); }
  }
  class WebGLRenderer {
    constructor(options) { this.options=options; }
    setPixelRatio(v) { calls.push(['pixelRatio',v]); }
    setSize(...v) { calls.push(['size',...v]); }
    render(...v) { calls.push(['render',...v]); }
    dispose() { calls.push(['dispose']); }
  }
  const THREE={Scene,PerspectiveCamera,WebGLRenderer,SRGBColorSpace:'srgb',ACESFilmicToneMapping:'aces'};
  const api=createPhase6Renderer({THREE,canvas:{},pixelRatio:3});
  assert.equal(api.renderer.options.alpha,true);
  assert.equal(api.renderer.options.antialias,true);
  assert.ok(calls.some(c=>c[0]==='pixelRatio'&&c[1]===PHASE6_CAMERA.maxPixelRatio));
  api.resize(1000,700);
  assert.equal(api.camera.aspect,1000/700);
  assert.equal(api.camera.fov,cameraFovDegrees(1000,700));
  api.render();
  api.dispose();
  assert.ok(calls.some(c=>c[0]==='render'));
  assert.ok(calls.some(c=>c[0]==='dispose'));
});

test('renderer refuses missing dependencies rather than silently drawing nothing', () => {
  assert.throws(() => createPhase6Renderer({ THREE:{}, canvas:{} }), TypeError);
  assert.throws(() => createPhase6Renderer({ THREE:{WebGLRenderer:class{},PerspectiveCamera:class{},Scene:class{} } }), TypeError);
});
