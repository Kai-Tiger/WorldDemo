import * as THREE from 'three';
import './style.css';
import { Input } from './input.js';
import { Player } from './player.js';
import { createScene } from './scene.js';
import { applyEnvironmentLighting } from './environmentLighting.js';
import { PLAYER_SPAWN_POSITION } from './spawn.js';
import { configureRenderer, createPostProcessing } from './postProcessing.js';
import { updateRiverVisuals } from './riverChannel.js';
import { ThirdPersonCamera } from './thirdPersonCamera.js';
import { SUN_LIGHT_DIRECTION } from './lighting.js';
import { updateWaterSystemVisuals } from './waterSystem.js';
import { updateSmallLakes } from './smallLakes.js';
import { createTerrainEditor } from './terrainEditor.js';
import { DEFAULT_RENDER_QUALITY, getRenderQualityPreset } from './renderQuality.js';

const canvas = document.querySelector('#game');
const positionX = document.querySelector('#position-x');
const positionZ = document.querySelector('#position-z');
const positionY = document.querySelector('#position-y');
const fpsValue = document.querySelector('#fps-value');
const toggleGrass = document.querySelector('#toggle-grass');
const toggleTrees = document.querySelector('#toggle-trees');
const qualitySelect = document.querySelector('#quality-select');
const { scene, terrain, water, wetBanks, waterSystem, grassManager, treeManager, sunLight, clouds, smallLakes } = await createScene();
const hemisphereLight = scene.children.find((child) => child.isHemisphereLight);
const sunLightOffset = SUN_LIGHT_DIRECTION.clone().multiplyScalar(320);
let renderQuality = getRenderQualityPreset(DEFAULT_RENDER_QUALITY);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
configureRenderer(renderer);
renderer.setPixelRatio(getEffectivePixelRatio(renderQuality));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
await applyEnvironmentLighting(renderer, scene, hemisphereLight);
const postProcessing = createPostProcessing(renderer, scene, camera, renderQuality);

const input = new Input(canvas);
const player = new Player();
player.position.x = PLAYER_SPAWN_POSITION.x;
player.position.z = PLAYER_SPAWN_POSITION.z;
player.position.y = player.getGroundHeight(terrain, player.position.x, player.position.z);
applyRenderQuality(renderQuality, false);
terrain.update(player.position);
scene.add(player.group);

const thirdPersonCamera = new ThirdPersonCamera(camera, player);
thirdPersonCamera.update(input, terrain);
updateSunLight();

createTerrainEditor(terrain, camera, scene, canvas, input);
const clock = new THREE.Clock();
let fpsFrameCount = 0;
let fpsLastUpdate = performance.now();

function updateRenderToggles() {
  const showGrass = toggleGrass.checked;
  const showTrees = toggleTrees.checked;

  grassManager.group.visible = showGrass;
  treeManager.group.visible = showTrees;
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(getEffectivePixelRatio(renderQuality));
  renderer.setSize(window.innerWidth, window.innerHeight);
  postProcessing.setPixelRatio(renderer.getPixelRatio());
  postProcessing.resize(window.innerWidth, window.innerHeight);
}

function getEffectivePixelRatio(quality) {
  return Math.min(window.devicePixelRatio, quality.pixelRatioCap);
}

function applyRenderQuality(quality, rebuildPostProcessing = true) {
  renderer.setPixelRatio(getEffectivePixelRatio(quality));
  renderer.setSize(window.innerWidth, window.innerHeight);
  postProcessing.setPixelRatio(renderer.getPixelRatio());
  postProcessing.resize(window.innerWidth, window.innerHeight);
  if (rebuildPostProcessing) {
    postProcessing.applyQualityPreset(quality);
  }
  terrain.setQualityPreset(quality.terrain);
  sunLight.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  sunLight.shadow.map?.dispose();
  sunLight.shadow.map = null;
}

function updateSunLight() {
  sunLight.position.copy(player.position).add(sunLightOffset);
  sunLight.target.position.copy(player.position);
  sunLight.target.updateMatrixWorld();
}

function updateFps(now) {
  fpsFrameCount += 1;
  const elapsed = now - fpsLastUpdate;

  if (elapsed < 500) return;

  fpsValue.textContent = Math.round((fpsFrameCount * 1000) / elapsed).toString();
  fpsFrameCount = 0;
  fpsLastUpdate = now;
}

function animate(now) {
  requestAnimationFrame(animate);

  updateFps(now);
  const deltaTime = Math.min(clock.getDelta(), 0.05);
  player.update(deltaTime, input, camera, terrain);
  terrain.update(player.position);
  if (toggleTrees.checked) {
    treeManager.update(player.position);
  }
  thirdPersonCamera.update(input, terrain);
  positionX.textContent = player.position.x.toFixed(2);
  positionZ.textContent = player.position.z.toFixed(2);
  positionY.textContent = player.position.y.toFixed(2);
  updateRiverVisuals(water, wetBanks, camera, clock.elapsedTime);
  updateWaterSystemVisuals(waterSystem, camera, clock.elapsedTime);
  if (toggleGrass.checked) {
    grassManager.update(player.position, clock.elapsedTime);
  }
  clouds.update(clock.elapsedTime, camera);
  updateSmallLakes(smallLakes, camera, clock.elapsedTime);
  updateSunLight();

  postProcessing.render(deltaTime);
}

window.addEventListener('resize', resize);
toggleGrass.addEventListener('change', updateRenderToggles);
toggleTrees.addEventListener('change', updateRenderToggles);
qualitySelect.addEventListener('change', () => {
  renderQuality = getRenderQualityPreset(qualitySelect.value);
  applyRenderQuality(renderQuality);
});
updateRenderToggles();
requestAnimationFrame(animate);
