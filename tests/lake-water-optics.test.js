import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as THREE from 'three';
import { RENDER_QUALITY_PRESETS } from '../src/renderQuality.js';
import { createSmallLakes } from '../src/smallLakes.js';
import {
  createWaterRenderController,
  createWaterUniforms,
} from '../src/waterContext.js';
import { createLakeSurfaceMaterial } from '../src/waterSystem.js';
import {
  FLOWING_RIVER_DEEP_COLOR,
  FLOWING_RIVER_FOAM_COLOR,
  FLOWING_RIVER_SHALLOW_COLOR,
  WATER_DEEP_COLOR,
  WATER_REFLECTION_COLOR,
  WATER_SHALLOW_COLOR,
} from '../src/waterPalette.js';

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
  assert.match(shader, /vec3 absorption = vec3\(0\.28, 0\.11, 0\.055\);/);
  assert.match(shader, /vec3 scattering = vec3\(0\.014, 0\.028, 0\.040\);/);
  assert.match(shader, /mix\(uDeepColor, uShallowColor, 0\.50\)/);
  assert.match(shader, /float waterFresnel = 0\.0204 \+ 0\.9796/);
  assert.match(shader, /mix\(undistortedScene, foggedWaterColor, coverage\)/);

  material.dispose();
});

test('lake and river share clear optics while the river keeps a restrained palette', async () => {
  const [flowingRiverSource, waterContextSource] = await Promise.all([
    readFile(new URL('../src/flowingRiverMaterial.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/waterContext.js', import.meta.url), 'utf8'),
  ]);
  const sharedOptics = [
    /vec3 absorption = vec3\(0\.28, 0\.11, 0\.055\);/,
    /vec3 scattering = vec3\(0\.014, 0\.028, 0\.040\);/,
    /mix\(uDeepColor, uShallowColor, 0\.50\)/,
  ];

  assert.equal(WATER_SHALLOW_COLOR, 0x2f8588);
  assert.equal(WATER_DEEP_COLOR, 0x073c52);
  assert.equal(WATER_REFLECTION_COLOR, 0x3f7899);
  assert.equal(FLOWING_RIVER_SHALLOW_COLOR, 0x4b756b);
  assert.equal(FLOWING_RIVER_DEEP_COLOR, 0x123945);
  assert.equal(FLOWING_RIVER_FOAM_COLOR, 0xd5e7e7);

  for (const pattern of sharedOptics) {
    assert.match(flowingRiverSource, pattern);
  }
  assert.match(
    flowingRiverSource,
    /vec3 waterFresnel = fresnelSchlick\(nDotV, vec3\(0\.02037\)\);/,
  );
  assert.match(
    flowingRiverSource,
    /vec3 reflectedEnergy = waterFresnel \* foamSpecularAttenuation \* 0\.26;/,
  );
  assert.match(
    flowingRiverSource,
    /color \+= directSpecular \* foamSpecularAttenuation \* 0\.40;/,
  );

  const uniforms = createWaterUniforms();
  assert.equal(uniforms.uWaterReflectionStrength.value, 0.46);
  assert.match(
    waterContextSource,
    /objectMode === 0\s*\? 0\.46\s*: objectMode === 1\s*\? 0\.64\s*: 0\.74;/,
  );
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
