import * as THREE from 'three';
import { loadGrassModel, createGrassVariants } from './grassClumps.js';
import { GrassManager } from './grassManager.js';
import { TreeManager } from './treeManager.js';
import { loadTreeModels } from './treePlacements.js';
import { loadLeafDecalTextures } from './leafDecals.js';
import { createHeroRocks } from './heroRocks.js';
import { createRiverWaterMesh } from './riverChannel.js';
import { Terrain } from './terrain.js';
import { createWaterSystem } from './waterSystem.js';
import { Clouds } from './clouds.js';
import { createSmallLakes } from './smallLakes.js';
import { VISUAL_ENVIRONMENT } from './visualEnvironment.js';
import { createCompressedTextureLoader } from './compressedTextureLoader.js';
import { PLAYER_SPAWN_POSITION } from './spawn.js';

const SHADOW_CAMERA_SIZE = 120;

export async function createScene(renderer, quality) {
  const scene = new THREE.Scene();
  const compressedTextureLoader = createCompressedTextureLoader(renderer);
  scene.background = VISUAL_ENVIRONMENT.sky.horizonColor.clone();
  scene.fog = new THREE.FogExp2(
    VISUAL_ENVIRONMENT.fog.color,
    VISUAL_ENVIRONMENT.fog.density,
  );

  let terrain;

  try {
    terrain = await Terrain.create({
      compressedTextureLoader,
      textureTier: quality.textureTier,
      textureAnisotropy: quality.textureAnisotropy,
    });
    await terrain.prepareInitialChunk(PLAYER_SPAWN_POSITION);
  } catch (error) {
    compressedTextureLoader.dispose();
    throw error;
  }
  scene.add(terrain.group);
  const water = createRiverWaterMesh(terrain);
  const waterSystem = createWaterSystem(terrain);
  const grassManager = createDeferredManager('GrassManager');
  const treeManager = createDeferredManager('TreeManager');

  scene.add(grassManager.group);
  scene.add(treeManager.group);
  scene.add(water);
  scene.add(waterSystem.group);

  const smallLakes = createSmallLakes(terrain);
  scene.add(smallLakes);

  const clouds = Clouds.create();
  scene.add(clouds.dome);

  const hemisphereLight = new THREE.HemisphereLight(
    VISUAL_ENVIRONMENT.hemisphere.skyColor,
    VISUAL_ENVIRONMENT.hemisphere.groundColor,
    VISUAL_ENVIRONMENT.hemisphere.intensity,
  );
  scene.add(hemisphereLight);

  const sunLight = new THREE.DirectionalLight(
    VISUAL_ENVIRONMENT.sun.color,
    VISUAL_ENVIRONMENT.sun.intensity,
  );
  sunLight.position.copy(VISUAL_ENVIRONMENT.sun.direction).multiplyScalar(320);
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

  const vegetationReady = Promise.all([
    loadGrassModel(compressedTextureLoader, quality.textureTier),
    loadTreeModels(),
    loadLeafDecalTextures(),
  ]).then(([grassAsset, treeModels, leafTextures]) => {
    grassManager.attach(new GrassManager(terrain, createGrassVariants(grassAsset)));
    treeManager.attach(new TreeManager(terrain, treeModels, leafTextures));
  }).finally(() => compressedTextureLoader.dispose());
  const heroRocksReady = createHeroRocks(terrain).then((heroRocks) => {
    scene.add(heroRocks);
    return heroRocks;
  });

  return {
    scene,
    terrain,
    water,
    wetBanks: null,
    waterSystem,
    grassManager,
    treeManager,
    sunLight,
    clouds,
    smallLakes,
    backgroundReady: Promise.all([vegetationReady, heroRocksReady]),
  };
}

function createDeferredManager(name) {
  const group = new THREE.Group();
  let implementation = null;
  let qualityPreset = null;

  group.name = `${name}Host`;

  return {
    group,
    attach(nextImplementation) {
      implementation = nextImplementation;
      group.add(implementation.group);
      if (qualityPreset) {
        implementation.setQualityPreset?.(qualityPreset);
      }
    },
    update(...args) {
      return implementation?.update(...args);
    },
    setQualityPreset(preset) {
      qualityPreset = preset;
      implementation?.setQualityPreset?.(preset);
    },
  };
}
