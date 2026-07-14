import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { VISUAL_ENVIRONMENT } from './visualEnvironment.js';
import {
  WATER_DEEP_COLOR,
  WATER_FOAM_COLOR,
  WATER_HORIZON_REFLECTION_COLOR,
  WATER_SHALLOW_COLOR,
  WATER_SUN_REFLECTION_COLOR,
} from './waterPalette.js';

/**
 * @typedef {Object} WaterRenderContext
 * @property {Object} environment
 * @property {Readonly<Record<string, number>>} renderOrder
 */

export const WATER_RENDER_ORDER = Object.freeze({
  wetBank: 18,
  surface: 20,
  waterfall: 30,
  foam: 32,
  mist: 34,
});

/** @type {WaterRenderContext} */
export const WATER_RENDER_CONTEXT = Object.freeze({
  environment: VISUAL_ENVIRONMENT,
  renderOrder: WATER_RENDER_ORDER,
});

export function createWaterUniforms(overrides = {}) {
  return {
    uTime: { value: 0 },
    uCameraPosition: { value: new THREE.Vector3() },
    uShallowColor: { value: new THREE.Color(WATER_SHALLOW_COLOR) },
    uDeepColor: { value: new THREE.Color(WATER_DEEP_COLOR) },
    uFoamColor: { value: new THREE.Color(WATER_FOAM_COLOR) },
    uHorizonReflectionColor: { value: toColor(VISUAL_ENVIRONMENT.sky.horizonColor, WATER_HORIZON_REFLECTION_COLOR) },
    uSunReflectionColor: { value: toColor(VISUAL_ENVIRONMENT.sun.glowColor, WATER_SUN_REFLECTION_COLOR) },
    uWaterFogColor: { value: toColor(VISUAL_ENVIRONMENT.fog.color, VISUAL_ENVIRONMENT.sky.horizonColor) },
    uWaterFogDensity: { value: VISUAL_ENVIRONMENT.fog.density },
    ...overrides,
  };
}

export function createWaterRenderController({
  renderer,
  scene,
  roots = [],
  surfaceRoot = null,
  effectsRoot = null,
  environmentTexture,
  resolveMaterial: initialResolveMaterial = null,
}) {
  const captureRoots = [
    ...(Array.isArray(roots) ? roots : [roots]),
    surfaceRoot,
    effectsRoot,
  ].filter(Boolean);

  const probeTarget = new THREE.WebGLCubeRenderTarget(128, {
    type: THREE.HalfFloatType,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const probeCamera = new THREE.CubeCamera(0.5, 1200, probeTarget);
  const reflector = new Reflector(new THREE.PlaneGeometry(132, 132), {
    clipBias: 0.001,
    textureWidth: 1,
    textureHeight: 1,
    color: 0xffffff,
  });
  const textureMatrix = reflector.material.uniforms.textureMatrix.value;
  let quality = null;
  let aerialPerspectiveEnabled = false;
  let probeReady = false;
  let planarReady = false;
  let hasLocalProbePosition = false;
  let disposed = false;
  let resolveMaterial = initialResolveMaterial;
  let currentTime = 0;
  let hasCameraPosition = false;
  const lastProbePosition = new THREE.Vector3();
  const lastCameraPosition = new THREE.Vector3();

  probeCamera.position.set(300, 36, -400);
  reflector.name = 'AlpineLakePlanarReflectionCapture';
  reflector.userData.excludeFromGtao = true;
  reflector.position.set(300, 31.015, -400);
  reflector.rotation.x = -Math.PI * 0.5;
  reflector.renderOrder = WATER_RENDER_ORDER.wetBank - 1;
  reflector.material.colorWrite = false;
  reflector.material.depthWrite = false;
  reflector.visible = false;
  scene.add(reflector);

  const renderReflection = reflector.onBeforeRender;
  reflector.onBeforeRender = (...args) => {
    const visibility = hideCaptureRoots();
    try {
      const result = renderReflection.apply(reflector, args);

      planarReady = true;
      applyUniforms();
      return result;
    } finally {
      restoreCaptureRoots(visibility);
    }
  };

  applyUniforms();

  return {
    applyQualityPreset(nextQuality, { aerialPerspective = false } = {}) {
      const reflectionModeChanged = quality?.reflectionMode
        !== nextQuality.reflectionMode;
      quality = nextQuality;
      aerialPerspectiveEnabled = aerialPerspective;
      if (reflectionModeChanged) probeReady = false;
      if (reflectionModeChanged && quality.reflectionMode === 'planar') {
        planarReady = false;
      }
      applyUniforms();
      resize();
      if (quality.reflectionMode !== 'environment' && !probeReady) {
        refreshProbe();
      }
    },
    setResolveMaterial(nextResolveMaterial) {
      resolveMaterial = nextResolveMaterial;
      applyUniforms();
    },
    resize,
    update(frame, viewerPosition = null, camera = null, elapsedTime = 0) {
      currentTime = elapsedTime;
      const cameraPosition = camera?.position ?? viewerPosition;
      if (cameraPosition) {
        lastCameraPosition.copy(cameraPosition);
        hasCameraPosition = true;
      }
      applyFrameUniforms();

      if (
        quality?.reflectionMode !== 'environment'
        && viewerPosition
        && (
          !probeReady
          || !hasLocalProbePosition
          || lastProbePosition.distanceToSquared(viewerPosition) >= 64 * 64
        )
      ) {
        refreshProbe(viewerPosition);
      }

      if (!quality || quality.reflectionMode !== 'planar') {
        reflector.visible = false;
        return;
      }

      const interval = Math.max(1, quality.reflectionUpdateFrames || 2);
      reflector.visible = frame % interval === 0;
    },
    refreshProbe,
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(reflector);
      reflector.geometry.dispose();
      reflector.dispose();
      probeTarget.dispose();
    },
  };

  function resize() {
    const scale = quality?.reflectionScale ?? 0.5;
    const drawingBufferSize = renderer.getDrawingBufferSize(new THREE.Vector2());

    planarReady = false;
    reflector.getRenderTarget().setSize(
      Math.max(1, Math.floor(drawingBufferSize.x * scale)),
      Math.max(1, Math.floor(drawingBufferSize.y * scale)),
    );
    applyUniforms();
  }

  function refreshProbe(viewerPosition = null) {
    if (disposed) return;
    if (viewerPosition) {
      probeCamera.position.set(
        viewerPosition.x,
        viewerPosition.y + 2.5,
        viewerPosition.z,
      );
      lastProbePosition.copy(viewerPosition);
      hasLocalProbePosition = true;
    }
    const visibility = hideCaptureRoots();
    const reflectorVisible = reflector.visible;

    reflector.visible = false;
    try {
      probeCamera.update(renderer, scene);
      probeReady = true;
    } finally {
      restoreCaptureRoots(visibility);
      reflector.visible = reflectorVisible;
    }
    applyUniforms();
  }

  function applyUniforms() {
    const mode = quality?.reflectionMode === 'planar'
      ? 2
      : quality?.reflectionMode === 'probe'
        ? 1
        : 0;

    const uniforms = resolveMaterial?.uniforms;
    if (!uniforms) return;

    setUniformValue(uniforms, 'tEnvironmentMap', environmentTexture);
    setUniformValue(uniforms, 'tReflectionProbe', probeTarget.texture);
    setUniformValue(
      uniforms,
      'tPlanarReflection',
      reflector.getRenderTarget().texture,
    );
    setUniformValue(uniforms, 'uPlanarTextureMatrix', textureMatrix);
    setUniformValue(uniforms, 'uReflectionMode', mode);
    setUniformValue(
      uniforms,
      'uReflectionStrength',
      mode === 0 ? 0.46 : mode === 1 ? 0.64 : 0.74,
    );
    setUniformValue(
      uniforms,
      'uDepthShorelineEnabled',
      quality?.depthShoreline ? 1 : 0,
    );
    setUniformValue(
      uniforms,
      'uRefractionPixels',
      quality?.refractionPixels ?? 0,
    );
    setUniformValues(
      uniforms,
      ['uWaterFogDensity', 'uFogDensity'],
      aerialPerspectiveEnabled ? 0 : VISUAL_ENVIRONMENT.fog.density,
    );
    setUniformValue(uniforms, 'uHasEnvironmentMap', environmentTexture ? 1 : 0);
    setUniformValue(
      uniforms,
      'uHasReflectionProbe',
      mode >= 1 && probeReady ? 1 : 0,
    );
    setUniformValue(
      uniforms,
      'uHasPlanarReflection',
      mode >= 2 && planarReady ? 1 : 0,
    );
    applyFrameUniforms();
  }

  function applyFrameUniforms() {
    const uniforms = resolveMaterial?.uniforms;
    if (!uniforms) return;

    setUniformValue(uniforms, 'uTime', currentTime);
    if (hasCameraPosition && uniforms.uCameraPosition) {
      uniforms.uCameraPosition.value.copy(lastCameraPosition);
    }
  }

  function hideCaptureRoots() {
    const visibility = captureRoots.map((root) => root.visible);
    captureRoots.forEach((root) => { root.visible = false; });
    return visibility;
  }

  function restoreCaptureRoots(visibility) {
    captureRoots.forEach((root, index) => {
      root.visible = visibility[index];
    });
  }
}

function setUniformValue(uniforms, name, value) {
  if (uniforms[name]) uniforms[name].value = value;
}

function setUniformValues(uniforms, names, value) {
  names.forEach((name) => setUniformValue(uniforms, name, value));
}

export const WATER_NOISE_GLSL = `
  float waterHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float waterNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = waterHash(i);
    float b = waterHash(i + vec2(1.0, 0.0));
    float c = waterHash(i + vec2(0.0, 1.0));
    float d = waterHash(i + vec2(1.0, 1.0));

    return mix(a, b, u.x)
      + (c - a) * u.y * (1.0 - u.x)
      + (d - b) * u.x * u.y;
  }

  float waterNoise2(vec2 p) {
    return waterNoise(p) * 0.68
      + waterNoise(p * 2.03 + vec2(7.1, -4.3)) * 0.32;
  }
`;

export const WATER_FOG_VERTEX_PARS_GLSL = 'varying float vWaterFogDepth;';
export const WATER_FOG_VERTEX_GLSL = 'vWaterFogDepth = -(viewMatrix * worldPosition).z;';
export const WATER_FOG_FRAGMENT_PARS_GLSL = `
  uniform vec3 uWaterFogColor;
  uniform float uWaterFogDensity;
  varying float vWaterFogDepth;
`;
export const WATER_FOG_FRAGMENT_GLSL = `
  float waterFogFactor = 1.0 - exp(
    -uWaterFogDensity * uWaterFogDensity * vWaterFogDepth * vWaterFogDepth
  );
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uWaterFogColor, clamp(waterFogFactor, 0.0, 1.0));
`;

function toColor(value, fallback) {
  const resolved = value ?? fallback;

  return resolved?.isColor ? resolved.clone() : new THREE.Color(resolved);
}
