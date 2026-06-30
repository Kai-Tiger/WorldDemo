import * as THREE from 'three';
import { createRiverWaterMesh, createWetBankMesh } from './riverChannel.js';
import { Terrain } from './terrain.js';

const SUN_POSITION = new THREE.Vector3(180, 420, 140);
const SUN_VISUAL_DISTANCE = 1000;
const SUN_TEXTURE_SIZE = 256;

export async function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2f9bff);

  const terrain = await Terrain.create();
  scene.add(terrain.group);
  const wetBanks = createWetBankMesh(terrain);
  const water = createRiverWaterMesh(terrain);
  scene.add(wetBanks);
  scene.add(water);
  scene.add(createSunModel());

  const hemisphereLight = new THREE.HemisphereLight(0x7fc8ff, 0x4d5d3b, 1.6);
  scene.add(hemisphereLight);

  const sunLight = new THREE.DirectionalLight(0xfff4d6, 3.2);
  sunLight.position.copy(SUN_POSITION);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -180;
  sunLight.shadow.camera.right = 180;
  sunLight.shadow.camera.top = 180;
  sunLight.shadow.camera.bottom = -180;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 700;
  scene.add(sunLight);

  return { scene, terrain, water, wetBanks };
}

function createSunModel() {
  const texture = createSunTexture();
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  const position = SUN_POSITION.clone().normalize().multiplyScalar(SUN_VISUAL_DISTANCE);

  sprite.position.copy(position);
  sprite.scale.set(170, 170, 1);
  sprite.name = 'SunVisual';

  return sprite;
}

function createSunTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = SUN_TEXTURE_SIZE;
  canvas.height = SUN_TEXTURE_SIZE;

  const context = canvas.getContext('2d');
  const center = SUN_TEXTURE_SIZE / 2;
  const gradient = context.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    center,
  );

  gradient.addColorStop(0, 'rgba(255, 255, 245, 1)');
  gradient.addColorStop(0.16, 'rgba(255, 252, 220, 1)');
  gradient.addColorStop(0.28, 'rgba(255, 232, 145, 0.82)');
  gradient.addColorStop(0.48, 'rgba(255, 184, 72, 0.26)');
  gradient.addColorStop(0.72, 'rgba(255, 150, 48, 0.08)');
  gradient.addColorStop(1, 'rgba(255, 150, 48, 0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, SUN_TEXTURE_SIZE, SUN_TEXTURE_SIZE);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}
