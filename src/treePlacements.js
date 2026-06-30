import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { isInRiverGrassExclusion } from './riverChannel.js';
import { hash2, smoothstep } from './grassClumps.js';

const TREE_MODEL_PATHS = [
  '/assets/vegetation/tree_01.glb',
  '/assets/vegetation/tree_02.glb',
  '/assets/vegetation/tree_03.glb',
  '/assets/vegetation/tree_04.glb',
];

export const TREE_VIEW_DISTANCE = 300;
export const ZONE_SIZE = 64;

const MIN_TREE_SPACING = 3;
const RIVER_BUFFER = 5;
const UP = new THREE.Vector3(0, 1, 0);
const HALF_MAP_SIZE = 2048 / 2;

const loader = new GLTFLoader();

export async function loadTreeModels() {
  const models = [];

  for (const path of TREE_MODEL_PATHS) {
    const asset = await loader.loadAsync(path);
    const meshes = extractMeshes(asset.scene);

    models.push({ meshes });
  }

  return models;
}

function extractMeshes(scene) {
  scene.updateMatrixWorld(true);

  const meshes = [];

  scene.traverse((child) => {
    if (!child.isMesh) return;

    const geometry = child.geometry.clone();

    geometry.applyMatrix4(child.matrixWorld);
    geometry.computeBoundingBox();

    meshes.push({
      geometry,
      material: child.material.clone(),
    });
  });

  return meshes;
}

export function getTreeDensity(height) {
  if (height <= 130) return 0.05;
  if (height <= 185) return 0.03;

  return 0.005;
}

export function isTreeArea(terrain, x, z) {
  const vGroundMask = terrain.getTerrainGroundMask(x, z);

  if (vGroundMask < 0.35) return false;

  return true;
}

export function createTreePlacementIterator(terrain, minX, minZ, maxX, maxZ) {
  const baseCellSize = Math.sqrt(1 / 0.05);
  const startZ = minZ - baseCellSize * 0.5;
  const endZ = maxZ + baseCellSize * 0.5;
  const startX = minX - baseCellSize * 0.5;
  const endX = maxX + baseCellSize * 0.5;

  let worldZ = startZ;
  let worldX = startX;
  const placements = [];
  const occupied = {};

  return {
    getPlacements() {
      return placements;
    },
    step(count) {
      let done = 0;

      while (done < count && worldZ <= endZ) {
        while (done < count && worldX <= endX) {
          const gridX = Math.round(worldX / baseCellSize);
          const gridZ = Math.round(worldZ / baseCellSize);

          const jitterX = (hash2(gridX, gridZ) - 0.5) * baseCellSize;
          const jitterZ = (hash2(gridX + 17.31, gridZ - 9.73) - 0.5) * baseCellSize;
          const x = worldX + jitterX;
          const z = worldZ + jitterZ;

          if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
            const height = terrain.getHeightAt(x, z);
            const density = getTreeDensity(height);
            const densityRatio = density / 0.05;

            if (hash2(gridX + 500, gridZ + 700) < densityRatio) {
              if (isTreeArea(terrain, x, z)) {
                if (!isInRiverGrassExclusion(x, z, RIVER_BUFFER)) {
                  if (!isTooClose(x, z, occupied)) {
                    markOccupied(x, z, occupied);
                    const modelCount = TREE_MODEL_PATHS.length;
                    const modelIndex = Math.floor(hash2(gridX + 300, gridZ + 400) * modelCount);

                    placements.push(createTreePlacement(terrain, x, z, gridX, gridZ, modelIndex));
                  }
                }
              }
            }
          }

          worldX += baseCellSize;
          done += 1;
        }

        if (worldX > endX) {
          worldX = startX;
          worldZ += baseCellSize;
        }
      }

      return worldZ > endZ;
    },
  };
}

export function buildTreeInstancedMeshes(placements, treeModels, parent) {
  for (let modelIdx = 0; modelIdx < treeModels.length; modelIdx += 1) {
    const modelPlacements = placements.filter((p) => p.modelIndex === modelIdx);

    if (modelPlacements.length === 0) continue;

    for (const mesh of treeModels[modelIdx].meshes) {
      const instanced = new THREE.InstancedMesh(
        mesh.geometry,
        mesh.material,
        modelPlacements.length,
      );

      instanced.name = `Tree${modelIdx}_Instances`;
      instanced.castShadow = true;
      instanced.receiveShadow = true;

      for (let i = 0; i < modelPlacements.length; i += 1) {
        instanced.setMatrixAt(i, modelPlacements[i].matrix);
      }

      instanced.instanceMatrix.needsUpdate = true;
      instanced.computeBoundingBox();
      instanced.computeBoundingSphere();
      parent.add(instanced);
    }
  }
}

function createTreePlacement(terrain, x, z, seedX, seedZ, modelIndex) {
  const y = terrain.getHeightAt(x, z);
  const normal = terrain.getNormalAt(x, z);
  const yaw = hash2(seedX - 41.8, seedZ + 12.6) * Math.PI * 2;
  const scaleValue = THREE.MathUtils.lerp(0.85, 1.2, hash2(seedX + 5.7, seedZ + 33.1));
  const tilt = new THREE.Quaternion().setFromUnitVectors(UP, normal);
  const rotation = new THREE.Quaternion().setFromAxisAngle(normal, yaw).multiply(tilt);
  const scale = new THREE.Vector3(scaleValue, scaleValue, scaleValue);
  const matrix = new THREE.Matrix4();

  matrix.compose(new THREE.Vector3(x, y, z), rotation, scale);

  return { matrix, modelIndex };
}

function isTooClose(x, z, occupied) {
  const keyX = Math.floor(x / MIN_TREE_SPACING);
  const keyZ = Math.floor(z / MIN_TREE_SPACING);

  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const key = `${keyX + dx},${keyZ + dz}`;
      const cell = occupied[key];

      if (!cell) continue;

      for (let i = 0; i < cell.length; i += 1) {
        const pos = cell[i];
        const d = (pos.x - x) * (pos.x - x) + (pos.z - z) * (pos.z - z);

        if (d < MIN_TREE_SPACING * MIN_TREE_SPACING) return true;
      }
    }
  }

  return false;
}

function markOccupied(x, z, occupied) {
  const keyX = Math.floor(x / MIN_TREE_SPACING);
  const keyZ = Math.floor(z / MIN_TREE_SPACING);
  const key = `${keyX},${keyZ}`;

  if (!occupied[key]) occupied[key] = [];
  occupied[key].push({ x, z });
}
