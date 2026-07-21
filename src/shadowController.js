import * as THREE from 'three';
import { CSM } from 'three/examples/jsm/csm/CSM.js';
import { getShadowCameraFit } from './renderQuality.js';

const SHADOW_WORLD_MIN_Y = -40;
const SHADOW_WORLD_MAX_Y = 450;
const SHADOW_BOUNDS_MARGIN = 0.5;
const SHADOW_DEPTH_MARGIN = 8;
const QUALITY_NEAR_CASCADE_DISTANCE = 90;
const CSM_LIGHT_MARGIN = 100;
const CSM_LIGHT_FAR = 850;
const MATERIAL_SCAN_FRAMES = 2;
const MATERIAL_RESCAN_INTERVAL = 120;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const CSM_DEFINE_KEYS = ['USE_CSM', 'CSM_CASCADES', 'CSM_FADE'];
const DEFAULT_LIGHTS_FRAGMENT_BEGIN = THREE.ShaderChunk.lights_fragment_begin;
const DEFAULT_LIGHTS_PARS_BEGIN = THREE.ShaderChunk.lights_pars_begin;

export function createShadowController({
  scene,
  camera,
  sunLight,
  lightDirection,
  shadowProxyLayer,
}) {
  const shadowCameraRight = new THREE.Vector3()
    .crossVectors(WORLD_UP, lightDirection)
    .normalize();
  const shadowCameraUp = new THREE.Vector3()
    .crossVectors(lightDirection, shadowCameraRight)
    .normalize();
  const shadowCenter = new THREE.Vector3();
  const csmMaterialRecords = new Map();
  let csm = null;
  let shadowSettings = null;
  let lastShadowUpdate = -Infinity;
  let pendingMaterialScans = 0;
  let framesSinceMaterialScan = 0;

  sunLight.shadow.camera.layers.enable(shadowProxyLayer);

  function applyQualityPreset(nextShadowSettings) {
    shadowSettings = nextShadowSettings;
    lastShadowUpdate = -Infinity;

    if (nextShadowSettings.cascadeCount > 1) {
      enableCsm(nextShadowSettings);
      return;
    }

    disableCsm();
    configureSingleShadow(nextShadowSettings);
  }

  function configureSingleShadow(settings) {
    const shadowFit = getShadowCameraFit(
      settings,
      lightDirection,
      SHADOW_WORLD_MIN_Y,
      SHADOW_WORLD_MAX_Y,
      SHADOW_BOUNDS_MARGIN,
    );

    sunLight.visible = true;
    sunLight.shadow.mapSize.set(settings.mapSize, settings.mapSize);
    sunLight.shadow.camera.left = -shadowFit.halfWidth;
    sunLight.shadow.camera.right = shadowFit.halfWidth;
    sunLight.shadow.camera.top = shadowFit.halfHeight;
    sunLight.shadow.camera.bottom = -shadowFit.halfHeight;
    sunLight.shadow.camera.far = shadowFit.halfDepth * 2
      + SHADOW_DEPTH_MARGIN * 2;
    sunLight.shadow.camera.updateProjectionMatrix();
    sunLight.shadow.map?.dispose();
    sunLight.shadow.map = null;
    sunLight.shadow.autoUpdate = settings.updateHz <= 0;
    sunLight.shadow.needsUpdate = true;
  }

  function enableCsm(settings) {
    disableCsm();
    sunLight.visible = false;
    sunLight.shadow.map?.dispose();
    sunLight.shadow.map = null;
    csm = new CSM({
      camera,
      parent: scene,
      cascades: settings.cascadeCount,
      maxFar: settings.distance,
      mode: 'custom',
      customSplitsCallback: (_cascades, _near, far, target) => {
        target.push(Math.min(QUALITY_NEAR_CASCADE_DISTANCE / far, 0.95), 1);
      },
      shadowMapSize: settings.mapSize,
      shadowBias: sunLight.shadow.bias,
      lightDirection: lightDirection.clone().negate(),
      lightIntensity: sunLight.intensity,
      lightNear: sunLight.shadow.camera.near,
      lightFar: CSM_LIGHT_FAR,
      lightMargin: CSM_LIGHT_MARGIN,
    });
    csm.fade = true;
    csm.updateFrustums();

    csm.lights.forEach((light, index) => {
      light.name = index === 0 ? 'SunCascadeNear' : 'SunCascadeFar';
      light.target.name = `${light.name}Target`;
      light.color.copy(sunLight.color);
      light.intensity = sunLight.intensity;
      light.shadow.normalBias = sunLight.shadow.normalBias;
      light.shadow.autoUpdate = settings.updateHz <= 0;
      light.shadow.camera.layers.enable(shadowProxyLayer);
      light.shadow.needsUpdate = true;
    });

    refreshMaterials();
  }

  function disableCsm() {
    if (!csm) return;

    for (const material of [...csmMaterialRecords.keys()]) {
      restoreMaterial(material);
    }
    csm.shaders.clear();
    csm.remove();

    for (const light of csm.lights) {
      light.shadow.map?.dispose();
      light.shadow.map = null;
      light.dispose();
    }

    csm.dispose();
    csm = null;
    THREE.ShaderChunk.lights_fragment_begin = DEFAULT_LIGHTS_FRAGMENT_BEGIN;
    THREE.ShaderChunk.lights_pars_begin = DEFAULT_LIGHTS_PARS_BEGIN;
    sunLight.visible = true;
    pendingMaterialScans = 0;
    framesSinceMaterialScan = 0;
  }

  function setupMaterial(material) {
    if (!csm || csmMaterialRecords.has(material) || !usesBuiltInLighting(material)) return;

    const originalOnBeforeCompile = material.onBeforeCompile;
    const originalProgramCacheKey = material.customProgramCacheKey;
    const hadDefines = material.defines !== undefined;
    const originalDefines = new Map(CSM_DEFINE_KEYS.map((key) => [
      key,
      {
        present: Object.hasOwn(material.defines ?? {}, key),
        value: material.defines?.[key],
      },
    ]));
    const onDispose = () => restoreMaterial(material);

    csm.setupMaterial(material);
    const csmOnBeforeCompile = material.onBeforeCompile;
    material.onBeforeCompile = function onBeforeCompile(shader, renderer) {
      originalOnBeforeCompile.call(this, shader, renderer);
      csmOnBeforeCompile.call(this, shader, renderer);
    };
    material.customProgramCacheKey = function customProgramCacheKey() {
      return `${originalProgramCacheKey.call(this)}|csm-${csm.cascades}-fade`;
    };
    material.addEventListener('dispose', onDispose);
    material.needsUpdate = true;
    csmMaterialRecords.set(material, {
      originalOnBeforeCompile,
      originalProgramCacheKey,
      originalDefines,
      hadDefines,
      onDispose,
    });
  }

  function restoreMaterial(material) {
    const record = csmMaterialRecords.get(material);

    if (!record) return;

    material.removeEventListener('dispose', record.onDispose);
    csm?.shaders.delete(material);
    material.onBeforeCompile = record.originalOnBeforeCompile;
    material.customProgramCacheKey = record.originalProgramCacheKey;

    for (const [key, original] of record.originalDefines) {
      if (original.present) {
        material.defines[key] = original.value;
      } else {
        delete material.defines[key];
      }
    }

    if (!record.hadDefines && Object.keys(material.defines).length === 0) {
      material.defines = undefined;
    }

    material.needsUpdate = true;
    csmMaterialRecords.delete(material);
  }

  function scanSceneMaterials() {
    if (!csm) return;

    scene.traverse((object) => {
      const materials = Array.isArray(object.material) ? object.material : [object.material];

      for (const material of materials) {
        if (material) setupMaterial(material);
      }
    });
    framesSinceMaterialScan = 0;
  }

  function refreshMaterials() {
    if (!csm) return;

    scanSceneMaterials();
    pendingMaterialScans = MATERIAL_SCAN_FRAMES;
  }

  function invalidate() {
    if (csm) {
      for (const light of csm.lights) {
        light.shadow.needsUpdate = true;
      }
      return;
    }

    sunLight.shadow.needsUpdate = true;
  }

  function resize() {
    csm?.updateFrustums();
    invalidate();
  }

  function update(now = performance.now(), centerPosition = null) {
    if (!shadowSettings) return;

    if (csm) {
      framesSinceMaterialScan += 1;
      if (pendingMaterialScans > 0 || framesSinceMaterialScan >= MATERIAL_RESCAN_INTERVAL) {
        scanSceneMaterials();
        pendingMaterialScans = Math.max(0, pendingMaterialScans - 1);
      }
      camera.updateMatrixWorld();
      csm.update();
      return;
    }

    if (!centerPosition) return;

    const updateHz = shadowSettings.updateHz;
    const minInterval = updateHz > 0 ? 1000 / updateHz : 0;

    if (now - lastShadowUpdate < minInterval) return;

    const shadowFit = getShadowCameraFit(
      shadowSettings,
      lightDirection,
      SHADOW_WORLD_MIN_Y,
      SHADOW_WORLD_MAX_Y,
      SHADOW_BOUNDS_MARGIN,
    );
    const snappedCenter = getSnappedShadowCenter(
      centerPosition,
      shadowFit,
      shadowSettings.mapSize,
      lightDirection,
      shadowCameraRight,
      shadowCameraUp,
      shadowCenter,
    );
    const shadowLightDistance = shadowFit.halfDepth + SHADOW_DEPTH_MARGIN;

    sunLight.target.position.copy(snappedCenter);
    sunLight.position
      .copy(sunLight.target.position)
      .addScaledVector(lightDirection, shadowLightDistance);
    sunLight.target.updateMatrixWorld();
    if (updateHz > 0) {
      sunLight.shadow.needsUpdate = true;
    }
    lastShadowUpdate = now;
  }

  function dispose() {
    disableCsm();
  }

  return {
    applyQualityPreset,
    dispose,
    getCascadeLights: () => csm?.lights ?? [],
    invalidate,
    refreshMaterials,
    resize,
    update,
  };
}

export function usesBuiltInLighting(material) {
  return Boolean(
    material?.isMeshLambertMaterial
    || material?.isMeshPhongMaterial
    || material?.isMeshToonMaterial
    || material?.isMeshStandardMaterial
    || material?.isMeshPhysicalMaterial,
  );
}

export function getQualityCascadeDistances(shadowSettings) {
  return [Math.min(QUALITY_NEAR_CASCADE_DISTANCE, shadowSettings.distance), shadowSettings.distance];
}

export function getSnappedShadowCenter(
  position,
  shadowFit,
  mapSize,
  lightDirection,
  shadowCameraRight,
  shadowCameraUp,
  target = new THREE.Vector3(),
) {
  target.set(position.x, shadowFit.centerY, position.z);

  const depth = target.dot(lightDirection);
  const right = target.dot(shadowCameraRight);
  const up = target.dot(shadowCameraUp);
  const texelWidth = shadowFit.halfWidth * 2 / mapSize;
  const texelHeight = shadowFit.halfHeight * 2 / mapSize;

  return target
    .copy(lightDirection)
    .multiplyScalar(depth)
    .addScaledVector(
      shadowCameraRight,
      Math.round(right / texelWidth) * texelWidth,
    )
    .addScaledVector(
      shadowCameraUp,
      Math.round(up / texelHeight) * texelHeight,
    );
}
