import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { VISUAL_ENVIRONMENT } from './visualEnvironment.js';
import {
  WATER_BANK_REFLECTION_COLOR,
  WATER_DEEP_COLOR,
  WATER_FOAM_COLOR,
  WATER_HORIZON_REFLECTION_COLOR,
  WATER_REFLECTION_COLOR,
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

export const WATER_REFLECTION_GLSL = `
  uniform sampler2D uWaterEnvironmentMap;
  uniform samplerCube uWaterReflectionProbe;
  uniform sampler2D uWaterPlanarReflection;
  uniform mat4 uWaterPlanarTextureMatrix;
  uniform float uWaterReflectionMode;
  uniform float uWaterReflectionStrength;
  uniform float uDepthShorelineEnabled;

  vec2 waterEquirectUv(vec3 direction) {
    vec3 ray = normalize(direction);
    return vec2(
      atan(ray.z, ray.x) * 0.15915494309189535 + 0.5,
      asin(clamp(ray.y, -1.0, 1.0)) * 0.3183098861837907 + 0.5
    );
  }

  vec3 getTieredWaterReflection(
    vec3 fallbackColor,
    vec3 worldPosition,
    vec3 surfaceNormal,
    vec3 viewDirection
  ) {
    vec3 reflectionDirection = reflect(-viewDirection, surfaceNormal);
    vec3 tierReflection;

    if (uWaterReflectionMode > 1.5) {
      vec4 planarCoord = uWaterPlanarTextureMatrix * vec4(worldPosition, 1.0);
      tierReflection = texture2DProj(
        uWaterPlanarReflection,
        planarCoord
      ).rgb;
    } else if (uWaterReflectionMode > 0.5) {
      tierReflection = textureCube(
        uWaterReflectionProbe,
        reflectionDirection
      ).rgb;
    } else {
      tierReflection = texture2D(
        uWaterEnvironmentMap,
        waterEquirectUv(reflectionDirection)
      ).rgb;
    }

    return mix(fallbackColor, tierReflection, uWaterReflectionStrength);
  }
`;

export function createWaterUniforms(overrides = {}) {
  return {
    uTime: { value: 0 },
    uCameraPosition: { value: new THREE.Vector3() },
    uShallowColor: { value: new THREE.Color(WATER_SHALLOW_COLOR) },
    uDeepColor: { value: new THREE.Color(WATER_DEEP_COLOR) },
    uFoamColor: { value: new THREE.Color(WATER_FOAM_COLOR) },
    uReflectionColor: { value: new THREE.Color(WATER_REFLECTION_COLOR) },
    uHorizonReflectionColor: { value: toColor(VISUAL_ENVIRONMENT.sky.horizonColor, WATER_HORIZON_REFLECTION_COLOR) },
    uBankReflectionColor: { value: new THREE.Color(WATER_BANK_REFLECTION_COLOR) },
    uSunReflectionColor: { value: toColor(VISUAL_ENVIRONMENT.sun.glowColor, WATER_SUN_REFLECTION_COLOR) },
    uSunDirection: { value: VISUAL_ENVIRONMENT.sun.direction.clone().normalize() },
    uSunIntensity: { value: VISUAL_ENVIRONMENT.sun.intensity },
    uWaterFogColor: { value: toColor(VISUAL_ENVIRONMENT.fog.color, VISUAL_ENVIRONMENT.sky.horizonColor) },
    uWaterFogDensity: { value: VISUAL_ENVIRONMENT.fog.density },
    uWaterEnvironmentMap: { value: null },
    uWaterReflectionProbe: { value: null },
    uWaterPlanarReflection: { value: null },
    uWaterPlanarTextureMatrix: { value: new THREE.Matrix4() },
    uWaterReflectionMode: { value: 0 },
    uWaterReflectionStrength: { value: 0.46 },
    uDepthShorelineEnabled: { value: 0 },
    ...overrides,
  };
}

export function createWaterRenderController({
  renderer,
  scene,
  roots,
  environmentTexture,
}) {
  const waterRoots = roots.filter(Boolean);
  const opticalMaterials = new Set();

  for (const root of waterRoots) {
    root.traverse((object) => {
      const material = object.material;
      if (material?.uniforms?.uSceneColor) opticalMaterials.add(material);
    });
  }

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
  let hasLocalProbePosition = false;
  let disposed = false;
  const lastProbePosition = new THREE.Vector3();

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
    const visibility = waterRoots.map((root) => root.visible);
    waterRoots.forEach((root) => { root.visible = false; });
    renderReflection.apply(reflector, args);
    waterRoots.forEach((root, index) => { root.visible = visibility[index]; });
  };

  applyUniforms();

  return {
    applyQualityPreset(nextQuality, { aerialPerspective = false } = {}) {
      const reflectionModeChanged = quality?.reflectionMode
        !== nextQuality.reflectionMode;
      quality = nextQuality;
      aerialPerspectiveEnabled = aerialPerspective;
      if (reflectionModeChanged) probeReady = false;
      applyUniforms();
      resize();
      if (quality.reflectionMode !== 'environment' && !probeReady) {
        refreshProbe();
      }
    },
    resize,
    update(frame, viewerPosition = null) {
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
    bindSceneBuffers({
      colorTexture,
      depthTexture,
      width,
      height,
      camera,
    }) {
      forEachOpticalMaterial((material) => {
        const uniforms = material.uniforms;

        uniforms.uSceneColor.value = colorTexture;
        uniforms.uSceneDepth.value = depthTexture;
        uniforms.uSceneResolution.value.set(width, height);
        uniforms.uCameraNear.value = camera.near;
        uniforms.uCameraFar.value = camera.far;
      });
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
    reflector.getRenderTarget().setSize(
      Math.max(1, Math.floor(drawingBufferSize.x * scale)),
      Math.max(1, Math.floor(drawingBufferSize.y * scale)),
    );
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
    const visibility = waterRoots.map((root) => root.visible);
    const reflectorVisible = reflector.visible;

    waterRoots.forEach((root) => { root.visible = false; });
    reflector.visible = false;
    probeCamera.update(renderer, scene);
    waterRoots.forEach((root, index) => { root.visible = visibility[index]; });
    reflector.visible = reflectorVisible;
    probeReady = true;
  }

  function applyUniforms() {
    const mode = quality?.reflectionMode === 'planar'
      ? 2
      : quality?.reflectionMode === 'probe'
        ? 1
        : 0;

    for (const root of waterRoots) {
      root.traverse((object) => {
        const material = object.material;
        const uniforms = material?.uniforms;
        if (uniforms?.uWaterFogDensity) {
          uniforms.uWaterFogDensity.value = aerialPerspectiveEnabled
            ? 0
            : VISUAL_ENVIRONMENT.fog.density;
        }
        if (!uniforms?.uWaterReflectionMode) return;
        const planarModeCap = object.name === 'AlpineLakeSurface' ? 2 : 1;
        const objectMode = Math.min(
          mode,
          object.userData.waterReflectionModeCap ?? planarModeCap,
          planarModeCap,
        );

        uniforms.uWaterEnvironmentMap.value = environmentTexture;
        uniforms.uWaterReflectionProbe.value = probeTarget.texture;
        uniforms.uWaterPlanarReflection.value = reflector.getRenderTarget().texture;
        uniforms.uWaterPlanarTextureMatrix.value = textureMatrix;
        uniforms.uWaterReflectionMode.value = objectMode;
        uniforms.uWaterReflectionStrength.value = objectMode === 0
          ? 0.46
          : objectMode === 1
            ? 0.64
            : 0.74;
        uniforms.uDepthShorelineEnabled.value = quality?.depthShoreline ? 1 : 0;

        if (uniforms.uSceneColor) {
          const singleLayerWater = quality?.singleLayerWater === true;
          const wasSingleLayerWater = material.defines?.USE_SINGLE_LAYER_WATER === 1;

          if (singleLayerWater !== wasSingleLayerWater) {
            material.defines ??= {};
            if (singleLayerWater) {
              material.defines.USE_SINGLE_LAYER_WATER = 1;
            } else {
              delete material.defines.USE_SINGLE_LAYER_WATER;
            }
            material.needsUpdate = true;
          }

          material.blending = singleLayerWater
            ? THREE.NoBlending
            : THREE.NormalBlending;
          uniforms.uRefractionPixels.value = quality?.refractionPixels ?? 0;

          if (!singleLayerWater) {
            uniforms.uSceneColor.value = null;
            uniforms.uSceneDepth.value = null;
          }
        }
      });
    }
  }

  function forEachOpticalMaterial(callback) {
    opticalMaterials.forEach(callback);
  }
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

export const WATER_DUAL_WAVE_GLSL = `
  vec3 getDualWaveNormal(vec2 flowUv, vec2 worldUv, float time, float strength) {
    float broadX = sin(flowUv.x * 6.4 - time * 1.15 + sin(worldUv.y * 1.7) * 0.7);
    float broadZ = sin(flowUv.x * 4.1 - flowUv.y * 8.0 - time * 0.82);
    float detailX = sin(flowUv.x * 15.5 + flowUv.y * 18.0 - time * 2.1);
    float detailZ = sin(flowUv.x * 11.0 - flowUv.y * 23.0 - time * 1.62);
    vec2 slope = vec2(
      broadX * 0.055 + detailX * 0.028,
      broadZ * 0.05 + detailZ * 0.03
    ) * strength;

    return normalize(vec3(slope.x, 1.0, slope.y));
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
