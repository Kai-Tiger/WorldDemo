import * as THREE from 'three';
import { createRiverWaterMesh, createWetBankMesh } from './riverChannel.js';
import { Terrain } from './terrain.js';

export async function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa9c7e8);

  const terrain = await Terrain.create();
  scene.add(terrain.group);
  const wetBanks = createWetBankMesh(terrain);
  const water = createRiverWaterMesh(terrain);
  scene.add(wetBanks);
  scene.add(water);

  const hemisphereLight = new THREE.HemisphereLight(0xddeeff, 0x4d5d3b, 1.8);
  scene.add(hemisphereLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2.4);
  directionalLight.position.set(120, 260, 80);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(2048, 2048);
  directionalLight.shadow.camera.left = -180;
  directionalLight.shadow.camera.right = 180;
  directionalLight.shadow.camera.top = 180;
  directionalLight.shadow.camera.bottom = -180;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 600;
  scene.add(directionalLight);

  return { scene, terrain, water, wetBanks };
}
