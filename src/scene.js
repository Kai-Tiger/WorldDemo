import * as THREE from 'three';
import { createRiverWaterMesh, createWetBankMesh } from './riverChannel.js';
import { Terrain } from './terrain.js';

const SUN_POSITION = new THREE.Vector3(180, 420, 140);
const SUN_VISUAL_DISTANCE = 1000;

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
  const group = new THREE.Group();
  const position = SUN_POSITION.clone().normalize().multiplyScalar(SUN_VISUAL_DISTANCE);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(95, 32, 16),
    new THREE.MeshBasicMaterial({
      color: 0xfff0a8,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(38, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff6c2 }),
  );

  group.position.copy(position);
  group.add(glow);
  group.add(sun);
  group.name = 'SunVisual';

  return group;
}
