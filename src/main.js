import * as THREE from 'three';
import './style.css';
import { Input } from './input.js';
import { Player } from './player.js';
import { Enemy, isTargetInAttackArc } from './enemy.js';
import { createEnemySpawnPositions } from './enemySpawns.js';
import { SpellSystem } from './spellSystem.js';
import { createScene } from './scene.js';
import { applyEnvironmentLighting } from './environmentLighting.js';
import { applyGoldenShot, getGoldenShotFromLocation } from './goldenShots.js';
import { PLAYER_SPAWN_POSITION } from './spawn.js';
import { configureRenderer, createPostProcessing } from './postProcessing.js';
import { ThirdPersonCamera } from './thirdPersonCamera.js';
import { SUN_LIGHT_DIRECTION } from './lighting.js';
import { createTerrainEditor } from './terrainEditor.js';
import {
  DEFAULT_RENDER_QUALITY,
  getRenderQualityPreset,
} from './renderQuality.js';
import { FrameBenchmark } from './performanceBenchmark.js';
import { createWaterRenderController } from './waterContext.js';
import { createShadowController } from './shadowController.js';
import { WORLD_VIEW_DISTANCE } from './vegetationConfig.js';

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
const PLAYER_MELEE_RANGE = 2.64;
const PLAYER_MELEE_ANGLE_DEGREES = 90;
const EXPECTED_ENEMY_COUNT = 6;
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
const playerHpValue = document.querySelector('#player-hp');
const playerMpValue = document.querySelector('#player-mp');
const playerStaminaValue = document.querySelector('#player-stamina');
const enemyCountValue = document.querySelector('#enemy-count');
const query = new URLSearchParams(window.location.search);
const debugMode = query.get('debug') === '1';
const captureMode = query.get('capture') === '1';
const requestedCaptureTime = Number.parseFloat(query.get('captureTime') ?? '');
const captureTime = Number.isFinite(requestedCaptureTime) ? requestedCaptureTime : 18.5;
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
  unifiedWaterSystem,
  grassManager,
  treeManager,
  sunLight,
  clouds,
  worldCollision,
  backgroundReady,
} = await createScene(renderer, renderQuality);
const hemisphereLight = scene.children.find((child) => child.isHemisphereLight);
const { surfaceRoot, effectsRoot } = unifiedWaterSystem;

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.25,
  WORLD_VIEW_DISTANCE,
);
const shadowController = createShadowController({
  scene,
  camera,
  sunLight,
  lightDirection: SUN_LIGHT_DIRECTION,
  shadowProxyLayer: terrain.shadowProxyLayer,
});
loadingStatus.textContent = 'Lighting the clear alpine morning';
const environmentLighting = await applyEnvironmentLighting(renderer, scene, hemisphereLight);
const postProcessing = createPostProcessing(
  renderer,
  scene,
  camera,
  renderQuality,
  {
    surfaceRoot,
    effectsRoot,
  },
);
const waterRenderController = createWaterRenderController({
  renderer,
  scene,
  roots: [surfaceRoot, effectsRoot],
  resolveMaterial: postProcessing.getWaterResolveMaterial(),
  environmentTexture: environmentLighting.sourceTexture,
});
let resolutionAdjustmentNotBefore = performance.now() + DYNAMIC_RESOLUTION.warmupMs;

const input = new Input(canvas);
const player = new Player();
player.position.x = PLAYER_SPAWN_POSITION.x;
player.position.z = PLAYER_SPAWN_POSITION.z;
player.position.y = player.getGroundHeight(terrain, player.position.x, player.position.z);
applyRenderQuality(renderQuality, false);
terrain.update();
scene.add(player.group);
const enemySpawnPositions = createEnemySpawnPositions(terrain, player.position, {
  count: EXPECTED_ENEMY_COUNT,
});
const enemies = enemySpawnPositions.map((spawnPosition) => {
  const enemy = new Enemy(spawnPosition);
  scene.add(enemy.group);
  return enemy;
});
const spellSystem = new SpellSystem(scene);

if (enemies.length < EXPECTED_ENEMY_COUNT) {
  console.warn(`Placed ${enemies.length} of ${EXPECTED_ENEMY_COUNT} requested enemies.`);
}

Promise.all([player.ready, ...enemies.map((enemy) => enemy.ready)]).then(() => {
  shadowController.invalidate();
  shadowController.refreshMaterials();
});
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
const playerSpellForward = new THREE.Vector3();
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
    waterRenderController.setResolveMaterial(
      postProcessing.getWaterResolveMaterial(),
    );
  }
  postProcessing.setResolutionScale(quality.resolution.maxScale);
  postProcessing.resize(window.innerWidth, window.innerHeight);
  deferResolutionAdjustment(DYNAMIC_RESOLUTION.warmupMs);
  terrain.setQualityPreset(quality.terrain);
  grassManager.setQualityPreset(quality);
  treeManager.setQualityPreset(quality);
  waterRenderController.applyQualityPreset(quality.water, {
    aerialPerspective: quality.postProcessing.aerialPerspective,
  });
  unifiedWaterSystem.setAerialPerspectiveEnabled(
    quality.postProcessing.aerialPerspective,
  );
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

function updateCombat(deltaTime) {
  let hitInfo = player.consumeAttackHitWindow();

  while (hitInfo) {
    const damage = Math.round(player.getAttackDamage() * hitInfo.damageMul);
    const range = PLAYER_MELEE_RANGE * hitInfo.rangeMul;

    for (const enemy of enemies) {
      if (
        enemy.isAlive()
        && isTargetInAttackArc(
          player.position,
          player.group.rotation.y,
          enemy.position,
          range,
          PLAYER_MELEE_ANGLE_DEGREES,
        )
      ) {
        enemy.takeDamage(damage);
      }
    }

    hitInfo = player.consumeAttackHitWindow();
  }

  const spellRelease = player.consumeSpellRelease();
  if (spellRelease) {
    spellSystem.cast(
      player.position,
      player.getForward(playerSpellForward),
      spellRelease.damage,
    );
  }

  spellSystem.update(deltaTime, enemies, terrain);
  for (const enemy of enemies) enemy.update(deltaTime, player, terrain, enemies);
}

function updateCombatHud() {
  playerHpValue.textContent = `${Math.ceil(player.getHp())}/${player.getMaxHp()}`;
  playerMpValue.textContent = `${Math.ceil(player.getMp())}/${player.getMaxMp()}`;
  playerStaminaValue.textContent = `${Math.ceil(player.getStamina())}/${player.getMaxStamina()}`;
  enemyCountValue.textContent = enemies.filter((enemy) => enemy.isAlive()).length.toString();
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
  const roots = [scene, surfaceRoot, effectsRoot];

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
  const flowingWaterTime = captureMode ? captureTime : clock.elapsedTime;

  updateFrameTiming(frameMs);
  updateDynamicResolution(now);
  if (goldenShot) {
    player.setAnimationTime(1.1);
    for (const enemy of enemies) enemy.setAnimationTime(0.6);
    applyGoldenShot(goldenShot, terrain, player, camera);
  } else {
    player.update(deltaTime, input, camera, terrain, worldCollision);
    updateCombat(deltaTime);
  }
  terrain.update(player.position);
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
  updateCombatHud();
  unifiedWaterSystem.update(flowingWaterTime, camera);
  postProcessing.setWaterTime(flowingWaterTime);
  if (toggleGrass.checked) {
    grassManager.update(player.position, visualTime);
  }
  clouds.update(visualTime, camera);
  waterRenderController.update(
    renderFrame,
    player.position,
    camera,
    flowingWaterTime,
  );
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
  if (!event.persisted) {
    spellSystem.dispose();
    for (const enemy of enemies) enemy.dispose();
    shadowController.dispose();
    waterRenderController.dispose();
    postProcessing.dispose();
    unifiedWaterSystem.dispose();
  }
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
