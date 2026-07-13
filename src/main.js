import * as THREE from 'three';
import './style.css';
import { Input } from './input.js';
import { Player } from './player.js';
import { createScene } from './scene.js';
import { applyEnvironmentLighting } from './environmentLighting.js';
import { applyGoldenShot, getGoldenShotFromLocation } from './goldenShots.js';
import { PLAYER_SPAWN_POSITION } from './spawn.js';
import { configureRenderer, createPostProcessing } from './postProcessing.js';
import { updateRiverVisuals } from './riverChannel.js';
import { ThirdPersonCamera } from './thirdPersonCamera.js';
import { SUN_LIGHT_DIRECTION } from './lighting.js';
import { updateWaterSystemVisuals } from './waterSystem.js';
import { updateSmallLakes } from './smallLakes.js';
import { createTerrainEditor } from './terrainEditor.js';
import {
  DEFAULT_RENDER_QUALITY,
  getRenderQualityPreset,
} from './renderQuality.js';
import { FrameBenchmark } from './performanceBenchmark.js';
import { createWaterRenderController } from './waterContext.js';
import { createShadowController } from './shadowController.js';

const RENDER_QUALITY_KEYS = Object.freeze({
  performance: true,
  balanced: true,
  quality: true,
});
const DYNAMIC_RESOLUTION = Object.freeze({
  adjustmentIntervalMs: 750,
  warmupMs: 2000,
  resizeWarmupMs: 1000,
  step: 0.05,
  scaleDownThreshold: 1.08,
  scaleUpThreshold: 0.85,
});
const PLAYER_FILL_COLOR = 0xb7d3df;
const PLAYER_FILL_INTENSITY = 120;
const canvas = document.querySelector('#game');
const positionX = document.querySelector('#position-x');
const positionZ = document.querySelector('#position-z');
const positionY = document.querySelector('#position-y');
const fpsValue = document.querySelector('#fps-value');
const toggleGrass = document.querySelector('#toggle-grass');
const toggleTrees = document.querySelector('#toggle-trees');
const qualitySelect = document.querySelector('#quality-select');
const loadingStatus = document.querySelector('#loading-status');
const frameTimeValue = document.querySelector('#frame-time-value');
const drawCallValue = document.querySelector('#draw-call-value');
const triangleValue = document.querySelector('#triangle-value');
const geometryValue = document.querySelector('#geometry-value');
const textureValue = document.querySelector('#texture-value');
const programValue = document.querySelector('#program-value');
const resolutionScaleValue = document.querySelector('#resolution-scale-value');
const query = new URLSearchParams(window.location.search);
const debugMode = query.get('debug') === '1';
const captureMode = query.get('capture') === '1';
const goldenShot = getGoldenShotFromLocation();
const initialQualityKey = query.get('quality') || DEFAULT_RENDER_QUALITY;
let renderQuality = getRenderQualityPreset(initialQualityKey);

qualitySelect.value = Object.hasOwn(RENDER_QUALITY_KEYS, initialQualityKey)
  ? initialQualityKey
  : DEFAULT_RENDER_QUALITY;

document.body.classList.toggle('debug-mode', debugMode);
loadingStatus.textContent = 'Building the mountain terrain';

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  preserveDrawingBuffer: query.get('capture') === '1',
  powerPreference: 'high-performance',
});
configureRenderer(renderer);
renderer.setPixelRatio(getEffectivePixelRatio(renderQuality));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.info.autoReset = false;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const {
  scene,
  terrain,
  water,
  wetBanks,
  waterSystem,
  grassManager,
  treeManager,
  sunLight,
  clouds,
  smallLakes,
  backgroundReady,
} = await createScene(renderer, renderQuality);
const hemisphereLight = scene.children.find((child) => child.isHemisphereLight);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.25, 1800);
const shadowController = createShadowController({
  scene,
  camera,
  sunLight,
  lightDirection: SUN_LIGHT_DIRECTION,
  shadowProxyLayer: terrain.shadowProxyLayer,
});
loadingStatus.textContent = 'Lighting the cold morning';
const environmentLighting = await applyEnvironmentLighting(renderer, scene, hemisphereLight);
const waterRoots = [water, waterSystem.group, smallLakes];
const waterRenderController = createWaterRenderController({
  renderer,
  scene,
  roots: waterRoots,
  environmentTexture: environmentLighting.sourceTexture,
});
const postProcessing = createPostProcessing(
  renderer,
  scene,
  camera,
  renderQuality,
  {
    waterRoots,
    bindWaterSceneBuffers: waterRenderController.bindSceneBuffers,
  },
);
let resolutionAdjustmentNotBefore = performance.now() + DYNAMIC_RESOLUTION.warmupMs;

const input = new Input(canvas);
const player = new Player();
player.position.x = PLAYER_SPAWN_POSITION.x;
player.position.z = PLAYER_SPAWN_POSITION.z;
player.position.y = player.getGroundHeight(terrain, player.position.x, player.position.z);
applyRenderQuality(renderQuality, false);
terrain.update();
scene.add(player.group);
shadowController.refreshMaterials();
const playerFillTarget = new THREE.Object3D();
playerFillTarget.position.y = 1;
player.group.add(playerFillTarget);
const playerFillLight = new THREE.SpotLight(
  PLAYER_FILL_COLOR,
  PLAYER_FILL_INTENSITY,
  14,
  THREE.MathUtils.degToRad(25),
  0.82,
  2,
);
playerFillLight.name = 'PlayerCameraFill';
playerFillLight.target = playerFillTarget;
scene.add(playerFillLight);

const thirdPersonCamera = new ThirdPersonCamera(camera, player);
if (!applyGoldenShot(goldenShot, terrain, player, camera)) {
  thirdPersonCamera.update(input, terrain);
}

createTerrainEditor(terrain, camera, scene, canvas, input);
const clock = new THREE.Clock();
let fpsFrameCount = 0;
let fpsLastUpdate = performance.now();
let smoothedFrameMs = 16.7;
let firstFrameRendered = false;
let renderFrame = 0;
const benchmarkResults = [];
const benchmark = query.get('benchmark') === '1'
  ? new FrameBenchmark({
      warmupMs: Number(query.get('benchmarkWarmupMs')) || 20_000,
      durationMs: Number(query.get('benchmarkDurationMs')) || 30_000,
      runCount: Number(query.get('benchmarkRuns')) || 3,
      onRunComplete(result) {
        console.info('Render benchmark run complete', result);
      },
      onComplete(results) {
        benchmarkResults.push(...results);
        window.__renderBenchmarkResults = benchmarkResults;
        window.__renderBenchmarkEnvironment = getBenchmarkEnvironment();
        console.info('Render benchmark complete', {
          environment: window.__renderBenchmarkEnvironment,
          results,
        });
      },
    })
  : null;

if (benchmark) {
  window.__renderBenchmarkResults = benchmarkResults;
}

backgroundReady
  .then(() => {
    document.body.classList.add('assets-ready');
    waterRenderController.refreshProbe();
    shadowController.refreshMaterials();
  })
  .catch((error) => {
    loadingStatus.textContent = 'Some scenery could not be loaded';
    console.error('Background scenery failed to load:', error);
  });

function updateRenderToggles() {
  const showGrass = toggleGrass.checked;
  const showTrees = toggleTrees.checked;

  grassManager.group.visible = showGrass;
  treeManager.group.visible = showTrees;
  shadowController.invalidate();
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(getEffectivePixelRatio(renderQuality));
  renderer.setSize(window.innerWidth, window.innerHeight);
  postProcessing.setPixelRatio(renderer.getPixelRatio());
  postProcessing.resize(window.innerWidth, window.innerHeight);
  waterRenderController.resize();
  shadowController.resize();
  deferResolutionAdjustment(DYNAMIC_RESOLUTION.resizeWarmupMs);
}

function getEffectivePixelRatio(quality) {
  return Math.min(window.devicePixelRatio, quality.pixelRatioCap);
}

function applyRenderQuality(quality, rebuildPostProcessing = true) {
  renderer.setPixelRatio(getEffectivePixelRatio(quality));
  renderer.setSize(window.innerWidth, window.innerHeight);
  postProcessing.setPixelRatio(renderer.getPixelRatio());
  if (rebuildPostProcessing) {
    postProcessing.applyQualityPreset(quality);
  }
  postProcessing.setResolutionScale(quality.resolution.maxScale);
  postProcessing.resize(window.innerWidth, window.innerHeight);
  deferResolutionAdjustment(DYNAMIC_RESOLUTION.warmupMs);
  terrain.setQualityPreset(quality.terrain);
  grassManager.setQualityPreset(quality);
  treeManager.setQualityPreset(quality);
  waterRenderController.applyQualityPreset(quality.water);
  clouds.setQualityPreset?.(quality);
  applyWaterAndTextureQuality(quality);
  shadowController.applyQualityPreset(quality.shadows);
}

function updatePlayerFillLight() {
  playerFillLight.position
    .subVectors(camera.position, player.position)
    .normalize()
    .multiplyScalar(4.2)
    .add(player.position);
  playerFillLight.position.y += 2.4;
  playerFillLight.target.updateMatrixWorld();
}

function updateFps(now) {
  fpsFrameCount += 1;
  const elapsed = now - fpsLastUpdate;

  if (elapsed < 500) return;

  fpsValue.textContent = Math.round((fpsFrameCount * 1000) / elapsed).toString();
  frameTimeValue.textContent = smoothedFrameMs.toFixed(1);
  drawCallValue.textContent = renderer.info.render.calls.toLocaleString();
  triangleValue.textContent = renderer.info.render.triangles.toLocaleString();
  geometryValue.textContent = renderer.info.memory.geometries.toLocaleString();
  textureValue.textContent = renderer.info.memory.textures.toLocaleString();
  programValue.textContent = (renderer.info.programs?.length ?? 0).toLocaleString();
  resolutionScaleValue.textContent = postProcessing.getResolutionScale().toFixed(2);
  fpsFrameCount = 0;
  fpsLastUpdate = now;
}

function updateFrameTiming(frameMs) {
  smoothedFrameMs += (frameMs - smoothedFrameMs) * 0.06;
}

function deferResolutionAdjustment(delayMs) {
  resolutionAdjustmentNotBefore = performance.now() + delayMs;
}

function updateDynamicResolution(now) {
  if (goldenShot || document.hidden || now < resolutionAdjustmentNotBefore) return;

  const targetFrameMs = postProcessing.getTargetFrameMs();
  const { minScale, maxScale } = postProcessing.getResolutionScaleRange();
  const currentScale = postProcessing.getResolutionScale();
  let nextScale = currentScale;

  if (smoothedFrameMs > targetFrameMs * DYNAMIC_RESOLUTION.scaleDownThreshold) {
    nextScale = Math.max(minScale, currentScale - DYNAMIC_RESOLUTION.step);
  } else if (smoothedFrameMs < targetFrameMs * DYNAMIC_RESOLUTION.scaleUpThreshold) {
    nextScale = Math.min(maxScale, currentScale + DYNAMIC_RESOLUTION.step);
  }

  postProcessing.setResolutionScale(nextScale);
  resolutionAdjustmentNotBefore = now + DYNAMIC_RESOLUTION.adjustmentIntervalMs;
}

function applyWaterAndTextureQuality(quality) {
  const anisotropy = Math.min(
    quality.textureAnisotropy,
    renderer.capabilities.getMaxAnisotropy(),
  );
  const visitedTextures = new Set();
  const roots = [scene, water, wetBanks, waterSystem?.group, smallLakes];

  for (const root of roots) {
    root?.traverse?.((object) => {
      const materials = Array.isArray(object.material) ? object.material : [object.material];

      for (const material of materials) {
        if (!material) continue;
        material.userData.shaderQuality = quality.shaderQuality;
        applyMaterialTextureAnisotropy(material, anisotropy, visitedTextures);
      }
    });
  }

  for (const material of Object.values(terrain.materials ?? {})) {
    applyMaterialTextureAnisotropy(material, anisotropy, visitedTextures);
  }
}

function applyMaterialTextureAnisotropy(material, anisotropy, visitedTextures) {
  const values = [
    ...Object.values(material),
    ...Object.values(material.uniforms ?? {}).map((uniform) => uniform?.value),
    ...Object.values(material.userData.terrainUniforms ?? {}).map((uniform) => uniform?.value),
  ];

  for (const value of values) {
    if (
      !value?.isTexture
      || value.isRenderTargetTexture
      || visitedTextures.has(value)
    ) continue;
    visitedTextures.add(value);
    value.anisotropy = anisotropy;
    value.needsUpdate = true;
  }
}

function getBenchmarkEnvironment() {
  return {
    userAgent: navigator.userAgent,
    quality: qualitySelect.value,
    shot: goldenShot?.key ?? 'moving',
    cssViewport: `${window.innerWidth}x${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio,
    rendererPixelRatio: renderer.getPixelRatio(),
    drawingBuffer: `${renderer.domElement.width}x${renderer.domElement.height}`,
    grass: toggleGrass.checked,
    trees: toggleTrees.checked,
  };
}

function animate(now) {
  requestAnimationFrame(animate);
  renderFrame += 1;

  updateFps(now);
  const deltaTime = Math.min(clock.getDelta(), 0.05);
  const frameMs = deltaTime * 1000;
  const visualTime = goldenShot ? 18.5 : clock.elapsedTime;
  const flowingWaterTime = captureMode ? 18.5 : clock.elapsedTime;

  updateFrameTiming(frameMs);
  updateDynamicResolution(now);
  if (goldenShot) {
    player.setAnimationTime(1.1);
    applyGoldenShot(goldenShot, terrain, player, camera);
  } else {
    player.update(deltaTime, input, camera, terrain);
  }
  terrain.update();
  if (toggleTrees.checked) {
    if (treeManager.update(player.position, visualTime)) {
      shadowController.invalidate();
      shadowController.refreshMaterials();
    }
  }
  if (!goldenShot) {
    thirdPersonCamera.update(input, terrain);
  }
  positionX.textContent = player.position.x.toFixed(2);
  positionZ.textContent = player.position.z.toFixed(2);
  positionY.textContent = player.position.y.toFixed(2);
  updateRiverVisuals(water, wetBanks, camera, flowingWaterTime);
  updateWaterSystemVisuals(waterSystem, camera, flowingWaterTime);
  if (toggleGrass.checked) {
    grassManager.update(player.position, visualTime);
  }
  clouds.update(visualTime, camera);
  updateSmallLakes(smallLakes, camera, visualTime);
  waterRenderController.update(renderFrame);
  shadowController.update(now, player.position);
  updatePlayerFillLight();

  renderer.info.reset();
  postProcessing.render(deltaTime);
  benchmark?.sample(now, {
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    programs: renderer.info.programs?.length ?? 0,
  });
  if (!firstFrameRendered) {
    firstFrameRendered = true;
    requestAnimationFrame(() => document.body.classList.add('is-ready'));
  }
}

window.addEventListener('resize', resize);
window.addEventListener('pagehide', (event) => {
  if (!event.persisted) shadowController.dispose();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    smoothedFrameMs = 16.7;
    deferResolutionAdjustment(DYNAMIC_RESOLUTION.warmupMs);
  }
});
toggleGrass.addEventListener('change', updateRenderToggles);
toggleTrees.addEventListener('change', updateRenderToggles);
qualitySelect.addEventListener('change', () => {
  renderQuality = getRenderQualityPreset(qualitySelect.value);
  applyRenderQuality(renderQuality);
});
window.addEventListener('keydown', (event) => {
  if (event.code === 'Backquote') {
    document.body.classList.toggle('debug-mode');
  }
});
updateRenderToggles();
shadowController.update(performance.now(), player.position);
requestAnimationFrame(animate);
