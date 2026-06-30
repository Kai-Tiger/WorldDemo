import * as THREE from 'three';
import { createRiverWaterMesh, createWetBankMesh } from './riverChannel.js';
import { Terrain } from './terrain.js';

export async function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2f9bff);

  const terrain = await Terrain.create();
  scene.add(terrain.group);
  const wetBanks = createWetBankMesh(terrain);
  const water = createRiverWaterMesh(terrain);
  scene.add(wetBanks);
  scene.add(water);

  const hemisphereLight = new THREE.HemisphereLight(0x7fc8ff, 0x4d5d3b, 1.6);
  scene.add(hemisphereLight);

  const sunLight = new THREE.DirectionalLight(0xfff4d6, 3.2);
  sunLight.position.set(180, 420, 140);
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
