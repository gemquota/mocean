// Adapted from unclemmattmakes/polyfish/src/rendering/SwimMaterial.js
// Copyright (c) 2025-2026 Matt Scott. MIT licensed; see docs/licenses/POLYFISH-MIT-LICENSE.txt.
/**
 * SwimMaterial — injects procedural vertex displacement into MeshStandardMaterial.
 *
 * Uses onBeforeCompile to patch the vertex shader with a sine-wave undulation
 * that travels from head to tail. The fragment shader (lighting, vertex colors,
 * IBL) remains untouched — identical visual quality to the base material.
 *
 * Swim parameters are exposed as uniforms for real-time editor tweaking:
 *   uTime       — elapsed time (set per frame)
 *   uFrequency  — wave cycles per unit length along the body
 *   uAmplitude  — max displacement at the tail (world units)
 *   uSpeed      — wave travel speed (how fast the undulation moves)
 *   uMaskStart  — where the undulation begins (0 = head, 1 = tail). Default 0.3
 *   uIntensity  — 0–1 velocity-driven blend (idle amplitude vs active amplitude)
 *   uSwimAxis   — which local axis to displace (0 = X side-to-side, 1 = Y up-down)
 *   uTurnLag    — lateral offset from body turning (set from creature turn rate)
 *
 * The "body" coordinate is derived from the vertex's local-space position along
 * the model's forward axis (Z in Three.js / glTF convention). This is normalized
 * to 0–1 using the mesh's bounding box, computed once at material creation.
 *
 * Works with InstancedMesh for future GPU instancing of large fish schools.
 */
// Three.js is injected by the renderer; this module has no runtime package dependency.

/**
 * Swim animation config per creature type.
 * These map directly to shader uniforms.
 */
export const SWIM_CONFIGS = {
  fish: {
    frequency: 1.5,
    amplitude: 0.005,
    speed: 4.0,
    maskStart: 0.4,       // 40% — keeps eyes outside the wave ramp zone
    maskFloor: 0.15,      // head gets 15% of shoulder wave (eyes follow body)
    headPhase: 0.5,       // phase delay for head region (positive = eyes lag behind body)
    swimAxis: 0,
    idleAmplitude: 0.055,   // stronger tail motion remains visible at reef camera distance
    thrustAmplitude: 0.0022, // tight fast strokes when thrusting
    coastAmplitude: 0.0,    // no animation when coasting after a burst
    idleSpeed: 5.34,        // 0.85 BPS
    thrustSpeed: 18.85,     // 3.0 BPS
    coastSpeed: 0.0,        // 0 BPS when coasting
  },
  dolphin: {
    frequency: 1.2,
    amplitude: 0.004,
    speed: 3.0,
    maskStart: 0.25,
    maskFloor: 0.1,
    headPhase: 0.4,
    swimAxis: 1,
    idleAmplitude: 0.01,    // visible lazy strokes when idle
    thrustAmplitude: 0.002,
    coastAmplitude: 0.0,
    idleSpeed: 4.0,
    thrustSpeed: 15.0,
    coastSpeed: 0.0,
  },
  manatee: {
    frequency: 1.0, amplitude: 0.004, speed: 2.0, maskStart: 0.3,
    maskFloor: 0.1, headPhase: 0.3, swimAxis: 1, idleAmplitude: 0.01,
    thrustAmplitude: 0.002, coastAmplitude: 0.0, idleSpeed: 3.0,
    thrustSpeed: 10.0, coastSpeed: 0.0,
  },
  'body-wave': {
    frequency: 1.15, amplitude: 0.04, speed: 2.8, maskStart: 0.22,
    maskFloor: 0.04, headPhase: 0.15, swimAxis: 0, waveMode: 0,
    idleAmplitude: 0.035, thrustAmplitude: 0.052, coastAmplitude: 0.012,
    idleSpeed: 3.6, thrustSpeed: 7.2, coastSpeed: 1.5,
  },
  'vertical-body-wave': {
    frequency: 0.9, amplitude: 0.035, speed: 2.4, maskStart: 0.2,
    maskFloor: 0.04, headPhase: 0.12, swimAxis: 1, waveMode: 0,
    idleAmplitude: 0.028, thrustAmplitude: 0.044, coastAmplitude: 0.01,
    idleSpeed: 2.8, thrustSpeed: 5.4, coastSpeed: 1.2,
  },
  'wing-wave': {
    frequency: 1.0, amplitude: 0.05, speed: 2.2, maskStart: 0.12,
    maskFloor: 0.08, headPhase: 0, swimAxis: 1, waveMode: 1,
    idleAmplitude: 0.045, thrustAmplitude: 0.07, coastAmplitude: 0.018,
    idleSpeed: 2.7, thrustSpeed: 4.6, coastSpeed: 1.0,
  },
};

// Vertex shader chunk injected before the main() transform
const SWIM_VERTEX_PARS = /* glsl */`
  uniform float uPhase;
  uniform float uFrequency;
  uniform float uAmplitude;
  uniform float uMaskStart;
  uniform float uSwimAxis;
  uniform float uBodyMin;
  uniform float uBodyMax;
  uniform float uMaskFloor;
  uniform float uHeadPhase;
  uniform float uWaveMode;
  uniform float uWingMax;
`;

// Vertex shader chunk — the wave is sin(spatialPhase - uPhase).
// uPhase is accumulated smoothly in JS. NO time*speed computation in the shader.
const SWIM_VERTEX_MAIN = /* glsl */`
  {
    float bodyRange = uBodyMax - uBodyMin;
    float body = uWaveMode > 0.5
      ? clamp(abs(position.x) / max(uWingMax, 0.001), 0.0, 1.0)
      : (bodyRange > 0.001 ? clamp(1.0 - (position.z - uBodyMin) / bodyRange, 0.0, 1.0) : 0.5);

    // Head region: all vertices sample wave at maskStart (rigid head, no eye sliding)
    float waveBody = max(body, uMaskStart);

    // Amplitude ramp with eye weighting
    float ramp = uWaveMode > 0.5 ? smoothstep(0.08, 0.72, body) : smoothstep(uMaskStart, uMaskStart + 0.3, body);
    float lateralOffset;
    if (uSwimAxis < 0.5) {
      lateralOffset = abs(position.y) / (bodyRange * 0.5 + 0.001);
    } else {
      lateralOffset = abs(position.x) / (bodyRange * 0.5 + 0.001);
    }
    float eyeWeight = clamp(lateralOffset * 3.0, 0.0, 1.0);
    float headAmp = uMaskFloor * eyeWeight;
    float amp = mix(headAmp, 1.0, ramp);

    // Phase: spatial component from body position, temporal from JS-accumulated uPhase.
    // Head delay shifts the phase for the head region.
    float headDelay = (1.0 - ramp) * uHeadPhase;
    float phase = waveBody * uFrequency * 6.2832 - uPhase + headDelay;
    float wave = sin(phase) * uAmplitude * amp;

    if (uWaveMode > 0.5) {
      transformed.y += wave;
    } else if (uSwimAxis < 0.5) {
      transformed.x += wave;
    } else {
      transformed.y += wave;
    }
  }
`;

/**
 * Apply swim vertex displacement to all materials in a mesh hierarchy.
 * Returns an object with uniform references for per-frame updates.
 *
 * @param {THREE.Object3D} meshRoot — the creature's mesh (GLB scene root)
 * @param {string} creatureType — 'fish', 'dolphin', or 'manatee'
 * @returns {{ uniforms: object, config: object }} — uniform refs + config for editor
 */
export function applySwimMaterial(meshRoot, creatureType) {
  const config = SWIM_CONFIGS[creatureType] || SWIM_CONFIGS.fish;

  // ── Fast path: reuse uniforms already wired into the compiled shader ──
  // Three.js caches compiled shader programs. If we create new uniform objects
  // after the shader has been compiled, the shader keeps using the OLD uniforms
  // and our new ones are orphaned. Fix: store uniforms on the material itself
  // and reuse them across activate/deactivate cycles.
  let reuseUniforms = null;
  meshRoot.traverse((child) => {
    if (!reuseUniforms && (child.isMesh || child.isSkinnedMesh) && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const existing = materials.find(material => material?._swimUniforms);
      if (existing) reuseUniforms = existing._swimUniforms;
    }
  });

  if (reuseUniforms) {
    // Reset phase for fresh activation
    reuseUniforms.uPhase.value = 0;
    return { uniforms: reuseUniforms, config };
  }

  // ── First-time patch: compute bounding box, create uniforms, inject shader ──
  let bodyMin = Infinity, bodyMax = -Infinity, wingMax = 0;
  meshRoot.updateMatrixWorld(true);
  meshRoot.traverse((child) => {
    if ((child.isMesh || child.isSkinnedMesh) && child.geometry) {
      child.geometry.computeBoundingBox();
      const box = child.geometry.boundingBox.clone().applyMatrix4(child.matrix);
      bodyMin = Math.min(bodyMin, box.min.z);
      bodyMax = Math.max(bodyMax, box.max.z);
      wingMax = Math.max(wingMax, Math.abs(box.min.x), Math.abs(box.max.x));
    }
  });
  if (!Number.isFinite(bodyMin) || !Number.isFinite(bodyMax)) {
    bodyMin = -1;
    bodyMax = 1;
  }

  // Shared uniforms (all materials on this creature share the same uniform objects)
  const uniforms = {
    uPhase: { value: 0 },
    uFrequency: { value: config.frequency },
    uAmplitude: { value: config.amplitude },
    uMaskStart: { value: config.maskStart },
    uSwimAxis: { value: config.swimAxis },
    uBodyMin: { value: bodyMin },
    uBodyMax: { value: bodyMax },
    uMaskFloor: { value: config.maskFloor ?? 0.15 },
    uHeadPhase: { value: config.headPhase ?? 0.5 },
    uWaveMode: { value: config.waveMode ?? 0 },
    uWingMax: { value: wingMax || 1 },\n    uWaveMode: { value: config.waveMode ?? 0 },\n    uWingMax: { value: wingMax || 1 },
  };

  // Patch all materials in the hierarchy
  meshRoot.traverse((child) => {
    if (child.isMesh || child.isSkinnedMesh) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of materials) {
        if (!mat || mat._swimPatched) continue;

        const origCompile = mat.onBeforeCompile;
        mat.onBeforeCompile = (shader) => {
          if (origCompile) origCompile(shader);
          Object.assign(shader.uniforms, uniforms);
          shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            '#include <common>\n' + SWIM_VERTEX_PARS
          );
          // Apply the travelling wave after skeletal deformation so the shader
          // supplements, rather than fights, the imported bone animation.
          shader.vertexShader = shader.vertexShader.replace(
            '#include <skinning_vertex>',
            '#include <skinning_vertex>\n' + SWIM_VERTEX_MAIN
          );
        };
        mat.needsUpdate = true;
        mat._swimPatched = true;
        mat._swimUniforms = uniforms;
      }
    }
  });

  return { uniforms, config };
}

/**
 * Update swim uniforms per frame.
 * @param {{ uniforms: object, config: object }} swimData
 * @param {number} phase — accumulated wave phase in radians (from JS)
 * @param {number} intensity — 0–1 velocity-driven
 * @param {boolean} thrusting — true if engines are firing
 */
export function updateSwimUniforms(swimData, phase, intensity, thrusting = false) {
  const { uniforms, config } = swimData;
  const t = Math.max(0, Math.min(1, intensity));

  // Always play idle as baseline. When thrusting, blend toward thrust values.
  // Smooth the thrust blend to avoid pops.
  if (swimData._smoothThrust === undefined) swimData._smoothThrust = 0;
  const thrustTarget = thrusting ? 1 : 0;
  swimData._smoothThrust += (thrustTarget - swimData._smoothThrust) * 0.1;
  const thrust = swimData._smoothThrust;

  // Idle is always playing. Thrust overrides when engines fire.
  const amplitude = config.idleAmplitude + thrust * (config.thrustAmplitude - config.idleAmplitude);

  uniforms.uPhase.value = phase;
  uniforms.uAmplitude.value = amplitude;

}
