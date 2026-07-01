import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { isInRiverGrassExclusion } from './riverChannel.js';
import { hash2 } from './grassClumps.js';
import {
  MAP_SIZE,
  ZONE_SIZE,
  TREE_MODEL_PATHS,
  TREE_VIEW_DISTANCE,
  TREE_MIN_SPACING,
  TREE_RIVER_BUFFER,
  TREE_DENSITY_LOWLAND,
  TREE_DENSITY_MIDLAND,
  TREE_DENSITY_HIGHLAND,
  TREE_HEIGHT_THRESHOLD_LOW,
  TREE_HEIGHT_THRESHOLD_MID,
  TREE_GROUND_MASK_THRESHOLD,
  TREE_SCALE_MIN,
  TREE_SCALE_MAX,
  TREE_NOISE_SCALE,
  TREE_NOISE_OCTAVES,
  TREE_NOISE_INFLUENCE,
  TREE_NOISE_MIN_FACTOR,
} from './vegetationConfig.js';

export { TREE_VIEW_DISTANCE, ZONE_SIZE };

const MIN_TREE_SPACING = TREE_MIN_SPACING;
const RIVER_BUFFER = TREE_RIVER_BUFFER;
const UP = new THREE.Vector3(0, 1, 0);
const HALF_MAP_SIZE = MAP_SIZE / 2;

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
  if (height <= TREE_HEIGHT_THRESHOLD_LOW) return TREE_DENSITY_LOWLAND;
  if (height <= TREE_HEIGHT_THRESHOLD_MID) return TREE_DENSITY_MIDLAND;

  return TREE_DENSITY_HIGHLAND;
}

export function isTreeArea(terrain, x, z) {
  const vGroundMask = terrain.getTerrainGroundMask(x, z);

  if (vGroundMask < TREE_GROUND_MASK_THRESHOLD) return false;

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

            const noiseVal = fbm(x * TREE_NOISE_SCALE, z * TREE_NOISE_SCALE, TREE_NOISE_OCTAVES);
            const normal = terrain.getNormalAt(x, z);
            const ridgeFactor = 1.0 - Math.abs(normal.y - 0.65) * 3.0;
            const ridgeBoost = THREE.MathUtils.clamp(ridgeFactor * 1.8, 0.4, 1.8);
            const modulatedDensity = densityRatio * (TREE_NOISE_MIN_FACTOR + TREE_NOISE_INFLUENCE * noiseVal) * ridgeBoost;

            if (hash2(gridX + 500, gridZ + 700) < modulatedDensity) {
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
  const yaw = hash2(seedX - 41.8, seedZ + 12.6) * Math.PI * 2;
  const scaleValue = THREE.MathUtils.lerp(TREE_SCALE_MIN, TREE_SCALE_MAX, hash2(seedX + 5.7, seedZ + 33.1));
  const rotation = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
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

function noise(x, z) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = x - x0;
  const tz = z - z0;
  const sx = tx * tx * (3 - 2 * tx);
  const sz = tz * tz * (3 - 2 * tz);
  const a = hash2(x0, z0);
  const b = hash2(x0 + 1, z0);
  const c = hash2(x0, z0 + 1);
  const d = hash2(x0 + 1, z0 + 1);
  const top = a + (b - a) * sx;
  const bottom = c + (d - c) * sx;

  return top + (bottom - top) * sz;
}

function fbm(x, z, octaves) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i += 1) {
    value += noise(x * frequency, z * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value / maxValue;
}

export function shouldKeepTreeForLOD(x, z, divisor) {
  const gx = Math.floor(x * 10);
  const gz = Math.floor(z * 10);

  return hash2(gx + divisor * 997, gz + divisor * 2003) < (1 / divisor);
}
