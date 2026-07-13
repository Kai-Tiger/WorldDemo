import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as THREE from 'three';
import { RENDER_QUALITY_PRESETS } from '../src/renderQuality.js';
import { createSmallLakes } from '../src/smallLakes.js';
import { createWaterRenderController } from '../src/waterContext.js';
import { createLakeSurfaceMaterial } from '../src/waterSystem.js';

const TERRAIN_STUB = {
  getBaseHeightAt: () => 8,
  getHeightAt: () => -4,
};

test('static lake material exposes bounded single-layer scene optics', () => {
  const material = createLakeSurfaceMaterial();
  const shader = material.fragmentShader;

  assert.equal(material.uniforms.uSceneColor.value, null);
  assert.equal(material.uniforms.uSceneDepth.value, null);
  assert.deepEqual(material.uniforms.uSceneResolution.value.toArray(), [1, 1]);
  assert.equal(material.uniforms.uRefractionPixels.value, 0);
  assert.match(shader, /#ifdef USE_SINGLE_LAYER_WATER/);
  assert.match(shader, /float getLinearLakeViewDepth\(float depth\)/);
  assert.match(shader, /vec3 getSingleLayerLakeVolume\(/);
  assert.match(shader, /vec2 safeMinimum = inverseResolution \* 0\.5;/);
  assert.match(shader, /float depthIsBehindWater = step\(/);
  assert.match(shader, /float depthContinuity = 1\.0 - step\(/);
  assert.match(shader, /vec3 absorption = vec3\(0\.32, 0\.14, 0\.08\);/);
  assert.match(shader, /vec3 scattering = vec3\(0\.025, 0\.045, 0\.060\);/);
  assert.match(shader, /float waterFresnel = 0\.0204 \+ 0\.9796/);
  assert.match(shader, /mix\(undistortedScene, foggedWaterColor, coverage\)/);

  material.dispose();
});

test('water controller binds scene buffers and toggles static lake composition', () => {
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  const material = createLakeSurfaceMaterial();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  const renderer = {
    getDrawingBufferSize(target) {
      return target.set(320, 180);
    },
  };
  const environmentTexture = new THREE.Texture();

  root.add(mesh);
  scene.add(root);
  const controller = createWaterRenderController({
    renderer,
    scene,
    roots: [root],
    environmentTexture,
  });
  const performance = {
    reflectionMode: 'environment',
    reflectionScale: 0.5,
    reflectionUpdateFrames: 0,
    depthShoreline: false,
    singleLayerWater: false,
    refractionPixels: 0,
  };
  const balancedOptics = {
    ...performance,
    depthShoreline: true,
    singleLayerWater: true,
    refractionPixels: 2,
  };

  controller.applyQualityPreset(performance);
  assert.equal(material.blending, THREE.NormalBlending);
  assert.equal(material.defines.USE_SINGLE_LAYER_WATER, undefined);

  controller.applyQualityPreset(balancedOptics);
  assert.equal(material.blending, THREE.NoBlending);
  assert.equal(material.defines.USE_SINGLE_LAYER_WATER, 1);
  assert.equal(material.uniforms.uRefractionPixels.value, 2);

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
  assert.equal(material.uniforms.uSceneColor.value, colorTexture);
  assert.equal(material.uniforms.uSceneDepth.value, depthTexture);
  assert.deepEqual(material.uniforms.uSceneResolution.value.toArray(), [64, 48]);

  controller.applyQualityPreset(performance);
  assert.equal(material.uniforms.uSceneColor.value, null);
  assert.equal(material.uniforms.uSceneDepth.value, null);

  controller.dispose();
  mesh.geometry.dispose();
  material.dispose();
  environmentTexture.dispose();
  colorTexture.dispose();
  depthTexture.dispose();
});

test('reflection tiers reserve planar capture for the main alpine lake', async () => {
  const smallLakes = createSmallLakes(TERRAIN_STUB);
  const waterSystemSource = await readFile(
    new URL('../src/waterSystem.js', import.meta.url),
    'utf8',
  );

  assert.ok(
    smallLakes.children.every(
      (lake) => lake.userData.waterReflectionModeCap === 1,
    ),
  );
  assert.match(
    waterSystemSource,
    /surface\.name = 'AlpineLakeSurface';[\s\S]*?surface\.userData\.waterReflectionModeCap = 2;/,
  );

  for (const lake of smallLakes.children) {
    lake.geometry.dispose();
    lake.material.dispose();
  }
});

test('quality presets and render loop use stronger bounded refraction and a local probe', async () => {
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map(
      (preset) => preset.water.refractionPixels,
    ),
    [0, 2, 3],
  );

  const [mainSource, waterContextSource] = await Promise.all([
    readFile(new URL('../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/waterContext.js', import.meta.url), 'utf8'),
  ]);

  assert.match(
    mainSource,
    /waterRenderController\.update\(renderFrame, player\.position\)/,
  );
  assert.match(waterContextSource, /distanceToSquared\(viewerPosition\) >= 64 \* 64/);
  assert.match(waterContextSource, /viewerPosition\.y \+ 2\.5/);
});
