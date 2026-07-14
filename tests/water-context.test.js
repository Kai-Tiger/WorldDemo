import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { RENDER_QUALITY_PRESETS } from '../src/renderQuality.js';
import { createWaterRenderController } from '../src/waterContext.js';

test('water quality presets keep one unified surface path at every tier', () => {
  const presets = Object.values(RENDER_QUALITY_PRESETS);

  assert.deepEqual(
    presets.map((preset) => preset.water.reflectionMode),
    ['environment', 'probe', 'planar'],
  );
  assert.deepEqual(
    presets.map((preset) => preset.water.refractionPixels),
    [0, 2, 3],
  );
  assert.deepEqual(
    presets.map((preset) => preset.water.waterInfoPrecision),
    ['packed', 'high', 'high'],
  );
  assert.deepEqual(
    presets.map((preset) => preset.water.normalDetail),
    ['low', 'medium', 'high'],
  );
  assert.ok(
    presets.every((preset) => !('singleLayerWater' in preset.water)),
  );
});

test('water controller binds reflections and frame state only to the resolve material', () => {
  const scene = new THREE.Scene();
  const surfaceRoot = new THREE.Group();
  const effectsRoot = new THREE.Group();
  const legacyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uSceneColor: { value: null },
      uWaterReflectionMode: { value: 17 },
    },
  });
  const legacySurface = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    legacyMaterial,
  );
  const renderer = {
    getDrawingBufferSize(target) {
      return target.set(320, 180);
    },
  };
  const environmentTexture = new THREE.Texture();
  const resolveMaterial = createResolveMaterial();

  surfaceRoot.add(legacySurface);
  scene.add(surfaceRoot, effectsRoot);

  const controller = createWaterRenderController({
    renderer,
    scene,
    surfaceRoot,
    effectsRoot,
    environmentTexture,
    resolveMaterial,
  });
  const quality = {
    reflectionMode: 'environment',
    reflectionScale: 0.5,
    reflectionUpdateFrames: 0,
    depthShoreline: true,
    refractionPixels: 1.5,
    waterInfoPrecision: 'high',
    normalDetail: 'medium',
  };

  controller.applyQualityPreset(quality, { aerialPerspective: true });

  assert.equal(resolveMaterial.uniforms.tEnvironmentMap.value, environmentTexture);
  assert.ok(resolveMaterial.uniforms.tReflectionProbe.value.isCubeTexture);
  assert.ok(resolveMaterial.uniforms.tPlanarReflection.value.isTexture);
  assert.ok(resolveMaterial.uniforms.uPlanarTextureMatrix.value.isMatrix4);
  assert.equal(resolveMaterial.uniforms.uReflectionMode.value, 0);
  assert.equal(resolveMaterial.uniforms.uReflectionStrength.value, 0.46);
  assert.equal(resolveMaterial.uniforms.uDepthShorelineEnabled.value, 1);
  assert.equal(resolveMaterial.uniforms.uRefractionPixels.value, 1.5);
  assert.equal(resolveMaterial.uniforms.uFogDensity.value, 0);
  assert.equal(resolveMaterial.uniforms.uHasEnvironmentMap.value, 1);
  assert.equal(resolveMaterial.uniforms.uHasReflectionProbe.value, 0);
  assert.equal(resolveMaterial.uniforms.uHasPlanarReflection.value, 0);
  assert.equal(legacyMaterial.uniforms.uWaterReflectionMode.value, 17);
  assert.equal(controller.bindSceneBuffers, undefined);

  const viewerPosition = new THREE.Vector3(4, 5, 6);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 900);
  camera.position.set(7, 8, 9);
  controller.update(12, viewerPosition, camera, 7.25);

  assert.equal(resolveMaterial.uniforms.uTime.value, 7.25);
  assert.deepEqual(
    resolveMaterial.uniforms.uCameraPosition.value.toArray(),
    [7, 8, 9],
  );

  const replacementMaterial = createResolveMaterial();
  controller.setResolveMaterial(replacementMaterial);
  assert.equal(replacementMaterial.uniforms.tEnvironmentMap.value, environmentTexture);
  assert.equal(replacementMaterial.uniforms.uRefractionPixels.value, 1.5);
  assert.equal(replacementMaterial.uniforms.uTime.value, 7.25);
  assert.deepEqual(
    replacementMaterial.uniforms.uCameraPosition.value.toArray(),
    [7, 8, 9],
  );

  controller.update(13, viewerPosition, null, 8.5);
  assert.equal(replacementMaterial.uniforms.uTime.value, 8.5);
  assert.deepEqual(
    replacementMaterial.uniforms.uCameraPosition.value.toArray(),
    [4, 5, 6],
  );
  assert.equal(resolveMaterial.uniforms.uTime.value, 7.25);

  controller.dispose();
  assert.equal(
    scene.children.some((object) => object.name === 'AlpineLakePlanarReflectionCapture'),
    false,
  );

  legacySurface.geometry.dispose();
  legacyMaterial.dispose();
  environmentTexture.dispose();
});

function createResolveMaterial() {
  return {
    uniforms: {
      uTime: { value: -1 },
      uCameraPosition: { value: new THREE.Vector3() },
      tEnvironmentMap: { value: null },
      tReflectionProbe: { value: null },
      tPlanarReflection: { value: null },
      uPlanarTextureMatrix: { value: new THREE.Matrix4() },
      uReflectionMode: { value: -1 },
      uReflectionStrength: { value: -1 },
      uDepthShorelineEnabled: { value: -1 },
      uRefractionPixels: { value: -1 },
      uFogDensity: { value: -1 },
      uHasEnvironmentMap: { value: -1 },
      uHasReflectionProbe: { value: -1 },
      uHasPlanarReflection: { value: -1 },
    },
  };
}
