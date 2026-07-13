import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  createShadowController,
  getQualityCascadeDistances,
  usesBuiltInLighting,
} from '../src/shadowController.js';
import { RENDER_QUALITY_PRESETS } from '../src/renderQuality.js';

function createFixture() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.25, 1800);
  const sunLight = new THREE.DirectionalLight(0xfff2dc, 3.2);
  const lightDirection = new THREE.Vector3(0.48, 0.48, 0.73).normalize();

  sunLight.castShadow = true;
  sunLight.shadow.bias = -0.0003;
  sunLight.shadow.normalBias = 0.04;
  scene.add(sunLight, sunLight.target);

  const controller = createShadowController({
    scene,
    camera,
    sunLight,
    lightDirection,
    shadowProxyLayer: 3,
  });

  return { camera, controller, scene, sunLight };
}

test('single-cascade presets keep the original sun and their 1024/2048 budgets', () => {
  const { controller, scene, sunLight } = createFixture();

  controller.applyQualityPreset(RENDER_QUALITY_PRESETS.performance.shadows);
  assert.equal(sunLight.visible, true);
  assert.equal(sunLight.shadow.mapSize.width, 1024);
  assert.equal(sunLight.shadow.mapSize.height, 1024);
  assert.equal(controller.getCascadeLights().length, 0);

  controller.applyQualityPreset(RENDER_QUALITY_PRESETS.balanced.shadows);
  assert.equal(sunLight.visible, true);
  assert.equal(sunLight.shadow.mapSize.width, 2048);
  assert.equal(sunLight.shadow.mapSize.height, 2048);
  assert.equal(scene.getObjectByName('SunCascadeNear'), undefined);

  controller.dispose();
});

test('Quality creates two faded 2048 cascades and composes material shader hooks', () => {
  const { camera, controller, scene, sunLight } = createFixture();
  const originalLightsFragment = THREE.ShaderChunk.lights_fragment_begin;
  const originalLightsPars = THREE.ShaderChunk.lights_pars_begin;
  const material = new THREE.MeshStandardMaterial();
  const depthMaterial = new THREE.MeshDepthMaterial();
  let originalHookCalls = 0;
  const originalHook = function originalHook(shader) {
    originalHookCalls += 1;
    shader.uniforms.uExistingHook = { value: 1 };
  };
  const originalProgramCacheKey = () => 'existing-material-hook';

  material.defines = { EXISTING_DEFINE: 1 };
  material.onBeforeCompile = originalHook;
  material.customProgramCacheKey = originalProgramCacheKey;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.customDepthMaterial = depthMaterial;
  scene.add(mesh);

  controller.applyQualityPreset(RENDER_QUALITY_PRESETS.quality.shadows);
  const cascadeLights = controller.getCascadeLights();

  assert.deepEqual(getQualityCascadeDistances(RENDER_QUALITY_PRESETS.quality.shadows), [90, 420]);
  assert.equal(sunLight.visible, false);
  assert.equal(cascadeLights.length, 2);
  assert.deepEqual(cascadeLights.map((light) => light.name), ['SunCascadeNear', 'SunCascadeFar']);
  assert.deepEqual(cascadeLights.map((light) => light.shadow.mapSize.width), [2048, 2048]);
  assert.ok(cascadeLights.every((light) => light.shadow.normalBias === 0.04));
  assert.ok(cascadeLights.every((light) => (light.shadow.camera.layers.mask & (1 << 3)) !== 0));
  assert.notEqual(THREE.ShaderChunk.lights_fragment_begin, originalLightsFragment);
  assert.notEqual(THREE.ShaderChunk.lights_pars_begin, originalLightsPars);
  assert.equal(material.defines.USE_CSM, 1);
  assert.equal(material.defines.CSM_CASCADES, 2);
  assert.equal(Object.hasOwn(material.defines, 'CSM_FADE'), true);
  assert.equal(mesh.customDepthMaterial, depthMaterial);

  const shader = { uniforms: {} };
  material.onBeforeCompile(shader, null);
  assert.equal(originalHookCalls, 1);
  assert.equal(shader.uniforms.uExistingHook.value, 1);
  assert.equal(shader.uniforms.CSM_cascades.value.length, 2);
  assert.equal(shader.uniforms.cameraNear.value, camera.near);
  assert.equal(shader.uniforms.shadowFar.value, 420);
  assert.match(material.customProgramCacheKey(), /existing-material-hook\|csm-2-fade/);

  camera.position.set(12, 30, 45);
  camera.lookAt(0, 0, 0);
  controller.update(0, new THREE.Vector3());
  assert.ok(cascadeLights.every((light) => Number.isFinite(light.position.x)));

  controller.applyQualityPreset(RENDER_QUALITY_PRESETS.balanced.shadows);
  assert.equal(sunLight.visible, true);
  assert.equal(controller.getCascadeLights().length, 0);
  assert.equal(scene.getObjectByName('SunCascadeNear'), undefined);
  assert.equal(material.onBeforeCompile, originalHook);
  assert.equal(material.customProgramCacheKey, originalProgramCacheKey);
  assert.equal(material.defines.EXISTING_DEFINE, 1);
  assert.equal(Object.hasOwn(material.defines, 'USE_CSM'), false);
  assert.equal(Object.hasOwn(material.defines, 'CSM_CASCADES'), false);
  assert.equal(Object.hasOwn(material.defines, 'CSM_FADE'), false);
  assert.equal(THREE.ShaderChunk.lights_fragment_begin, originalLightsFragment);
  assert.equal(THREE.ShaderChunk.lights_pars_begin, originalLightsPars);

  mesh.geometry.dispose();
  material.dispose();
  depthMaterial.dispose();
  controller.dispose();
});

test('streamed lit materials can register after CSM startup and restore on disposal', () => {
  const { controller, scene } = createFixture();

  controller.applyQualityPreset(RENDER_QUALITY_PRESETS.quality.shadows);
  const material = new THREE.MeshLambertMaterial();
  const originalHook = material.onBeforeCompile;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);

  scene.add(mesh);
  controller.refreshMaterials();
  assert.equal(material.defines.USE_CSM, 1);
  assert.notEqual(material.onBeforeCompile, originalHook);

  material.dispose();
  assert.equal(material.onBeforeCompile, originalHook);
  assert.equal(Object.hasOwn(material.defines ?? {}, 'USE_CSM'), false);

  mesh.geometry.dispose();
  controller.dispose();
});

test('only Three built-in lit surface materials opt into CSM', () => {
  assert.equal(usesBuiltInLighting(new THREE.MeshStandardMaterial()), true);
  assert.equal(usesBuiltInLighting(new THREE.MeshLambertMaterial()), true);
  assert.equal(usesBuiltInLighting(new THREE.MeshBasicMaterial()), false);
  assert.equal(usesBuiltInLighting(new THREE.MeshDepthMaterial()), false);
  assert.equal(usesBuiltInLighting(new THREE.ShaderMaterial()), false);
});
