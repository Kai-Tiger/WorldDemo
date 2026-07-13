import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createFlowingRiverMaterial } from '../src/flowingRiverMaterial.js';
import { createWaterRenderController } from '../src/waterContext.js';

test('water quality switches single-layer optics only on flowing materials', () => {
  const scene = new THREE.Scene();
  const waterRoot = new THREE.Group();
  const flowingMaterial = createFlowingRiverMaterial();
  const staticMaterial = new THREE.MeshBasicMaterial({
    color: 0x557788,
    transparent: true,
    opacity: 0.7,
  });
  const flowingWater = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), flowingMaterial);
  const secondFlowingWater = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    flowingMaterial,
  );
  const staticWater = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), staticMaterial);
  const renderer = {
    getDrawingBufferSize(target) {
      return target.set(320, 180);
    },
  };
  const environmentTexture = new THREE.Texture();

  waterRoot.add(flowingWater, secondFlowingWater, staticWater);
  scene.add(waterRoot);

  const controller = createWaterRenderController({
    renderer,
    scene,
    roots: [waterRoot],
    environmentTexture,
  });
  const performanceWater = {
    reflectionMode: 'environment',
    reflectionScale: 0.5,
    reflectionUpdateFrames: 0,
    depthShoreline: false,
    singleLayerWater: false,
    refractionPixels: 0,
  };
  const singleLayerWater = {
    ...performanceWater,
    depthShoreline: true,
    singleLayerWater: true,
    refractionPixels: 1.5,
  };

  controller.applyQualityPreset(performanceWater);
  assert.equal(flowingMaterial.blending, THREE.NormalBlending);
  assert.equal(flowingMaterial.defines.USE_SINGLE_LAYER_WATER, undefined);
  assert.equal(flowingMaterial.uniforms.uWaterFogDensity.value, 0.00045);

  controller.applyQualityPreset(singleLayerWater, { aerialPerspective: true });
  const enabledVersion = flowingMaterial.version;
  assert.equal(flowingMaterial.blending, THREE.NoBlending);
  assert.equal(flowingMaterial.defines.USE_SINGLE_LAYER_WATER, 1);
  assert.equal(flowingMaterial.uniforms.uRefractionPixels.value, 1.5);
  assert.equal(flowingMaterial.transparent, true);
  assert.equal(flowingMaterial.depthWrite, false);
  assert.equal(flowingMaterial.uniforms.uWaterFogDensity.value, 0);
  assert.equal(staticMaterial.blending, THREE.NormalBlending);

  controller.applyQualityPreset(singleLayerWater, { aerialPerspective: true });
  assert.equal(flowingMaterial.version, enabledVersion);

  const colorTexture = new THREE.Texture();
  const depthTexture = new THREE.DepthTexture(64, 48);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.4, 900);

  controller.bindSceneBuffers({
    colorTexture,
    depthTexture,
    width: 64,
    height: 48,
    camera,
  });
  assert.equal(flowingMaterial.uniforms.uSceneColor.value, colorTexture);
  assert.equal(flowingMaterial.uniforms.uSceneDepth.value, depthTexture);
  assert.deepEqual(flowingMaterial.uniforms.uSceneResolution.value.toArray(), [64, 48]);
  assert.equal(flowingMaterial.uniforms.uCameraNear.value, 0.4);
  assert.equal(flowingMaterial.uniforms.uCameraFar.value, 900);

  controller.applyQualityPreset(performanceWater);
  assert.equal(flowingMaterial.blending, THREE.NormalBlending);
  assert.equal(flowingMaterial.defines.USE_SINGLE_LAYER_WATER, undefined);
  assert.equal(flowingMaterial.uniforms.uSceneColor.value, null);
  assert.equal(flowingMaterial.uniforms.uSceneDepth.value, null);
  assert.equal(flowingMaterial.uniforms.uWaterFogDensity.value, 0.00045);

  controller.dispose();
  flowingWater.geometry.dispose();
  secondFlowingWater.geometry.dispose();
  staticWater.geometry.dispose();
  flowingMaterial.dispose();
  staticMaterial.dispose();
  environmentTexture.dispose();
  colorTexture.dispose();
  depthTexture.dispose();
});
