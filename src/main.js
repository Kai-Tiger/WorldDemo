import * as THREE from 'three';
import './style.css';
import { Input } from './input.js';
import { Player } from './player.js';
import { createScene } from './scene.js';
import { ThirdPersonCamera } from './thirdPersonCamera.js';

const canvas = document.querySelector('#game');
const positionX = document.querySelector('#position-x');
const positionZ = document.querySelector('#position-z');
const positionY = document.querySelector('#position-y');
const { scene, terrain } = await createScene();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);

const input = new Input(canvas);
const player = new Player();
player.position.y = player.getGroundHeight(terrain, player.position.x, player.position.z);
scene.add(player.group);

const thirdPersonCamera = new ThirdPersonCamera(camera, player);
thirdPersonCamera.update(input, terrain);

const clock = new THREE.Clock();

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.05);
  player.update(deltaTime, input, camera, terrain);
  positionX.textContent = player.position.x.toFixed(2);
  positionZ.textContent = player.position.z.toFixed(2);
  positionY.textContent = player.position.y.toFixed(2);
  thirdPersonCamera.update(input, terrain);

  renderer.render(scene, camera);
}

window.addEventListener('resize', resize);
animate();
