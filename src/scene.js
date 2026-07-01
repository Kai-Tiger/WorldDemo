import * as THREE from 'three';
import { loadGrassModel, createGrassVariants } from './grassClumps.js';
import { GrassManager } from './grassManager.js';
import { loadTreeModels, generateAllTreePlacements, buildTreeInstancedMeshes } from './treePlacements.js';
import { createRiverWaterMesh } from './riverChannel.js';
import { Terrain } from './terrain.js';
import { createWaterSystem } from './waterSystem.js';
import { Clouds } from './clouds.js';
import { SUN_LIGHT_DIRECTION } from './lighting.js';

const SHADOW_CAMERA_SIZE = 120;

const HORIZON_COLOR = '#9bbdd0';

export async function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(HORIZON_COLOR);
  scene.fog = new THREE.Fog(HORIZON_COLOR, 500, 2000);

  const [terrain, grassAsset, treeModels] = await Promise.all([
    Terrain.create(),
    loadGrassModel(),
    loadTreeModels(),
  ]);
  scene.add(terrain.group);
  const water = createRiverWaterMesh(terrain);
  const waterSystem = createWaterSystem(terrain);
  const grassVariants = createGrassVariants(grassAsset.scene);
  const grassManager = new GrassManager(terrain, grassVariants);

  scene.add(grassManager.group);
  scene.add(water);
  scene.add(waterSystem.group);

  const treeGroup = new THREE.Group();
  treeGroup.name = 'Trees';
  scene.add(treeGroup);

  const treePlacements = await generateAllTreePlacements(terrain);
  buildTreeInstancedMeshes(treePlacements, treeModels, treeGroup);

  const clouds = Clouds.create();
  scene.add(clouds.dome);

  const hemisphereLight = new THREE.HemisphereLight(0x7fc8ff, 0x4d5d3b, 1.6);
  scene.add(hemisphereLight);

  const sunLight = new THREE.DirectionalLight(0xfff4d6, 3.2);
  sunLight.position.copy(SUN_LIGHT_DIRECTION).multiplyScalar(320);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -SHADOW_CAMERA_SIZE;
  sunLight.shadow.camera.right = SHADOW_CAMERA_SIZE;
  sunLight.shadow.camera.top = SHADOW_CAMERA_SIZE;
  sunLight.shadow.camera.bottom = -SHADOW_CAMERA_SIZE;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 700;
  sunLight.shadow.bias = -0.0003;
  sunLight.shadow.normalBias = 0.04;
  scene.add(sunLight);
  scene.add(sunLight.target);

  return { scene, terrain, water, wetBanks: null, waterSystem, grassManager, sunLight, clouds };
}
