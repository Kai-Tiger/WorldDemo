import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { isInRiverGrassExclusion } from './riverChannel.js';
import { PLAYER_SPAWN_POSITION } from './spawn.js';

const GRASS_CLUMP_PATH = '/assets/vegetation/grass-clumps.glb';
const PLACEMENT_RADIUS = 15;
const CLUMPS_PER_SQUARE_METER = 20;
const CELL_SIZE = Math.sqrt(1 / CLUMPS_PER_SQUARE_METER);
const RIVER_BUFFER = 2;
const UP = new THREE.Vector3(0, 1, 0);

const loader = new GLTFLoader();

export async function createGrassClumps(terrain) {
  const asset = await loader.loadAsync(GRASS_CLUMP_PATH);
  const variants = createGrassVariants(asset.scene);
  const placements = createGrassPlacements(terrain);
  const group = new THREE.Group();

  group.name = 'GrassClumps';

  for (const [variantName, variant] of variants) {
    const variantPlacements = placements.filter((placement) => placement.variantName === variantName);

    for (const leaf of variant.leaves) {
      const mesh = new THREE.InstancedMesh(
        leaf.geometry,
        leaf.material,
        variantPlacements.length,
      );

      mesh.name = `${variantName}_${leaf.name}_Instances`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      for (let i = 0; i < variantPlacements.length; i += 1) {
        mesh.setMatrixAt(i, variantPlacements[i].matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
  }

  return group;
}

function createGrassVariants(scene) {
  scene.updateMatrixWorld(true);

  return new Map(['GrassClump_A', 'GrassClump_B'].map((name) => {
    const root = scene.getObjectByName(name);
    const rootInverse = root.matrixWorld.clone().invert();
    const leaves = [];

    root.traverse((child) => {
      if (!child.isMesh) return;

      const geometry = child.geometry.clone();
      const material = child.material.clone();
      const leafMatrix = rootInverse.clone().multiply(child.matrixWorld);

      geometry.applyMatrix4(leafMatrix);
      if ('vertexColors' in material) {
        material.vertexColors = true;
      }

      leaves.push({
        name: child.name,
        geometry,
        material,
      });
    });

    return [name, { leaves }];
  }));
}

function createGrassPlacements(terrain) {
  const placements = [];
  const radiusInCells = Math.ceil(PLACEMENT_RADIUS / CELL_SIZE);

  for (let gridZ = -radiusInCells; gridZ <= radiusInCells; gridZ += 1) {
    for (let gridX = -radiusInCells; gridX <= radiusInCells; gridX += 1) {
      const jitterX = hash2(gridX, gridZ) - 0.5;
      const jitterZ = hash2(gridX + 17.31, gridZ - 9.73) - 0.5;
      const offsetX = (gridX + jitterX) * CELL_SIZE;
      const offsetZ = (gridZ + jitterZ) * CELL_SIZE;

      if ((offsetX * offsetX) + (offsetZ * offsetZ) > PLACEMENT_RADIUS * PLACEMENT_RADIUS) {
        continue;
      }

      const x = PLAYER_SPAWN_POSITION.x + offsetX;
      const z = PLAYER_SPAWN_POSITION.z + offsetZ;

      if (isInRiverGrassExclusion(x, z, RIVER_BUFFER)) continue;

      placements.push(createPlacement(terrain, x, z, gridX, gridZ));
    }
  }

  return placements;
}

function createPlacement(terrain, x, z, gridX, gridZ) {
  const y = terrain.getHeightAt(x, z);
  const normal = terrain.getNormalAt(x, z);
  const yaw = hash2(gridX - 41.8, gridZ + 12.6) * Math.PI * 2;
  const scaleValue = THREE.MathUtils.lerp(0.82, 1.18, hash2(gridX + 5.7, gridZ + 33.1));
  const tilt = new THREE.Quaternion().setFromUnitVectors(UP, normal);
  const rotation = new THREE.Quaternion().setFromAxisAngle(normal, yaw).multiply(tilt);
  const scale = new THREE.Vector3(scaleValue, scaleValue, scaleValue);
  const matrix = new THREE.Matrix4();

  matrix.compose(new THREE.Vector3(x, y, z), rotation, scale);

  return {
    matrix,
    variantName: hash2(gridX + 91.2, gridZ - 11.4) < 0.5 ? 'GrassClump_A' : 'GrassClump_B',
  };
}

function hash2(x, z) {
  const value = Math.sin((x * 127.1) + (z * 311.7)) * 43758.5453123;

  return value - Math.floor(value);
}
