import * as THREE from 'three';
import { createGrassClumps } from './grassClumps.js';
import {
  createRiverBedMesh,
  createRiverWaterMesh,
  createWetBankMesh,
  loadRiverTextures,
} from './riverChannel.js';
import { Terrain } from './terrain.js';

const SUN_POSITION = new THREE.Vector3(180, 420, 140);
const SUN_VISUAL_DISTANCE = 1000;
const SUN_TEXTURE_SIZE = 256;
const SKY_TEXTURE_WIDTH = 16;
const SKY_TEXTURE_HEIGHT = 256;

export async function createScene() {
  const scene = new THREE.Scene();
  scene.background = createSkyTexture();

  const [terrain, riverTextures] = await Promise.all([
    Terrain.create(),
    loadRiverTextures(),
  ]);
  scene.add(terrain.group);
  const riverBed = createRiverBedMesh(terrain, riverTextures);
  const wetBanks = createWetBankMesh(terrain, riverTextures);
  const water = createRiverWaterMesh(terrain);
  const grassClumps = await createGrassClumps(terrain);
  scene.add(riverBed);
  scene.add(wetBanks);
  scene.add(water);
  scene.add(grassClumps);
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

  drawSunRays(context, center);

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

function drawSunRays(context, center) {
  context.save();
  context.translate(center, center);
  context.globalCompositeOperation = 'lighter';

  for (let i = 0; i < 22; i += 1) {
    const angle = (i / 22) * Math.PI * 2;
    const variation = Math.sin(i * 12.9898) * 43758.5453;
    const random = variation - Math.floor(variation);
    const innerRadius = 18 + random * 8;
    const outerRadius = 82 + random * 34;
    const rayWidth = 1.2 + random * 1.8;
    const rayGradient = context.createLinearGradient(innerRadius, 0, outerRadius, 0);

    rayGradient.addColorStop(0, 'rgba(255, 255, 230, 0)');
    rayGradient.addColorStop(0.22, 'rgba(255, 248, 190, 0.28)');
    rayGradient.addColorStop(0.62, 'rgba(255, 208, 105, 0.12)');
    rayGradient.addColorStop(1, 'rgba(255, 170, 60, 0)');

    context.save();
    context.rotate(angle);
    context.beginPath();
    context.moveTo(innerRadius, -rayWidth);
    context.lineTo(outerRadius, -rayWidth * 0.25);
    context.lineTo(outerRadius, rayWidth * 0.25);
    context.lineTo(innerRadius, rayWidth);
    context.closePath();
    context.fillStyle = rayGradient;
    context.fill();
    context.restore();
  }

  context.restore();
}

function createSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = SKY_TEXTURE_WIDTH;
  canvas.height = SKY_TEXTURE_HEIGHT;

  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, SKY_TEXTURE_HEIGHT);

  gradient.addColorStop(0, '#1478ff');
  gradient.addColorStop(0.42, '#2f9bff');
  gradient.addColorStop(0.78, '#58c0ff');
  gradient.addColorStop(1, '#86d8ff');

  context.fillStyle = gradient;
  context.fillRect(0, 0, SKY_TEXTURE_WIDTH, SKY_TEXTURE_HEIGHT);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}
