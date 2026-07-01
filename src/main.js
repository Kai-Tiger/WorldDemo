import * as THREE from 'three';
import './style.css';
import { Input } from './input.js';
import { Player } from './player.js';
import { createScene } from './scene.js';
import { PLAYER_SPAWN_POSITION } from './spawn.js';
import { updateRiverVisuals } from './riverChannel.js';
import { ThirdPersonCamera } from './thirdPersonCamera.js';
import { SUN_LIGHT_DIRECTION } from './lighting.js';
import { updateWaterSystemVisuals } from './waterSystem.js';
import { updateSmallLakes } from './smallLakes.js';

const canvas = document.querySelector('#game');
const positionX = document.querySelector('#position-x');
const positionZ = document.querySelector('#position-z');
const positionY = document.querySelector('#position-y');
const { scene, terrain, water, wetBanks, waterSystem, grassManager, sunLight, clouds, smallLakes } = await createScene();
const sunLightOffset = SUN_LIGHT_DIRECTION.clone().multiplyScalar(320);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);

const input = new Input(canvas);
const player = new Player();
player.position.x = PLAYER_SPAWN_POSITION.x;
player.position.z = PLAYER_SPAWN_POSITION.z;
player.position.y = player.getGroundHeight(terrain, player.position.x, player.position.z);
scene.add(player.group);

const thirdPersonCamera = new ThirdPersonCamera(camera, player);
thirdPersonCamera.update(input, terrain);
updateSunLight();

const clock = new THREE.Clock();

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateSunLight() {
  sunLight.position.copy(player.position).add(sunLightOffset);
  sunLight.target.position.copy(player.position);
  sunLight.target.updateMatrixWorld();
}

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.05);
  player.update(deltaTime, input, camera, terrain);
  positionX.textContent = player.position.x.toFixed(2);
  positionZ.textContent = player.position.z.toFixed(2);
  positionY.textContent = player.position.y.toFixed(2);
  thirdPersonCamera.update(input, terrain);
  updateRiverVisuals(water, wetBanks, camera, clock.elapsedTime);
  updateWaterSystemVisuals(waterSystem, camera, clock.elapsedTime);
  grassManager.update(player.position, clock.elapsedTime);
  clouds.update(clock.elapsedTime, camera);
  updateSmallLakes(smallLakes, camera, clock.elapsedTime);
  updateSunLight();

  renderer.render(scene, camera);
}

window.addEventListener('resize', resize);
animate();
