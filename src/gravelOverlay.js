import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { isInRiverGrassExclusion } from './riverChannel.js';
import { isInSmallLakeExclusion } from './smallLakes.js';
import { isInWaterSystemVegetationExclusion } from './waterSystem.js';
import {
  GRAVEL_OVERLAY_CHUNK_MUTATIONS,
  GRAVEL_OVERLAY_RADIUS,
  GRAVEL_OVERLAY_Y_OFFSET,
  GRAVEL_PATCH_DENSITY,
  GRAVEL_PATCH_MIN_SPACING,
  GRAVEL_PATCH_SCALE_MAX,
  GRAVEL_PATCH_SCALE_MIN,
  KEEP_ALIVE_PADDING,
  MAP_SIZE,
  ZONE_SIZE,
} from './vegetationConfig.js';

const PATCH_PATHS = [
  '/assets/terrain/gravel-patches/gravel_patch_small.glb',
  '/assets/terrain/gravel-patches/gravel_patch_medium.glb',
  '/assets/terrain/gravel-patches/gravel_patch_wide.glb',
  '/assets/terrain/gravel-patches/gravel_patch_strip.glb',
];
const HALF_MAP_SIZE = MAP_SIZE / 2;
const WATER_EXCLUSION_BUFFER = 2.4;
const UP = new THREE.Vector3(0, 1, 0);
const loader = new GLTFLoader();

export async function createGravelOverlay(terrain) {
  const patchModels = await loadGravelPatchModels();

  return new GravelOverlayManager(terrain, patchModels);
}

export class GravelOverlayManager {
  constructor(terrain, patchModels) {
    this.terrain = terrain;
    this.patchModels = patchModels;
    this.group = new THREE.Group();
    this.group.name = 'GravelOverlay';
    this.chunks = new Map();
  }

  update(centerPosition) {
    const centerChunkX = Math.floor((centerPosition.x + HALF_MAP_SIZE) / ZONE_SIZE);
    const centerChunkZ = Math.floor((centerPosition.z + HALF_MAP_SIZE) / ZONE_SIZE);
    const chunkRadius = Math.ceil((GRAVEL_OVERLAY_RADIUS + KEEP_ALIVE_PADDING) / ZONE_SIZE);
    const neededKeys = new Set();

    for (let dz = -chunkRadius; dz <= chunkRadius; dz += 1) {
      for (let dx = -chunkRadius; dx <= chunkRadius; dx += 1) {
        const chunkX = centerChunkX + dx;
        const chunkZ = centerChunkZ + dz;
        const minX = chunkX * ZONE_SIZE - HALF_MAP_SIZE;
        const minZ = chunkZ * ZONE_SIZE - HALF_MAP_SIZE;
        const maxX = minX + ZONE_SIZE;
        const maxZ = minZ + ZONE_SIZE;

        if (maxX < -HALF_MAP_SIZE || minX > HALF_MAP_SIZE) continue;
        if (maxZ < -HALF_MAP_SIZE || minZ > HALF_MAP_SIZE) continue;

        const centerX = minX + ZONE_SIZE / 2;
        const centerZ = minZ + ZONE_SIZE / 2;
        const distance = Math.hypot(centerX - centerPosition.x, centerZ - centerPosition.z);

        if (distance > GRAVEL_OVERLAY_RADIUS + KEEP_ALIVE_PADDING) continue;
        neededKeys.add(`${chunkX},${chunkZ}`);
      }
    }

    const staleKeys = [];
    for (const key of this.chunks.keys()) {
      if (!neededKeys.has(key)) staleKeys.push(key);
    }

    for (let i = 0; i < Math.min(staleKeys.length, GRAVEL_OVERLAY_CHUNK_MUTATIONS); i += 1) {
      this.removeChunk(staleKeys[i]);
    }

    const missing = [];
    for (const key of neededKeys) {
      if (this.chunks.has(key)) continue;
      const [chunkX, chunkZ] = key.split(',').map(Number);
      const centerX = chunkX * ZONE_SIZE - HALF_MAP_SIZE + ZONE_SIZE / 2;
      const centerZ = chunkZ * ZONE_SIZE - HALF_MAP_SIZE + ZONE_SIZE / 2;

      missing.push({
        key,
        chunkX,
        chunkZ,
        distance: Math.hypot(centerX - centerPosition.x, centerZ - centerPosition.z),
      });
    }

    missing.sort((a, b) => a.distance - b.distance);

    for (let i = 0; i < Math.min(missing.length, GRAVEL_OVERLAY_CHUNK_MUTATIONS); i += 1) {
      this.addChunk(missing[i].key, missing[i].chunkX, missing[i].chunkZ);
    }
  }

  addChunk(key, chunkX, chunkZ) {
    const minX = chunkX * ZONE_SIZE - HALF_MAP_SIZE;
    const minZ = chunkZ * ZONE_SIZE - HALF_MAP_SIZE;
    const placements = createPatchPlacements(this.terrain, minX, minZ);
    const group = buildPatchChunk(placements, this.patchModels, minX, minZ);

    this.chunks.set(key, group);

    if (group.children.length > 0) {
      this.group.add(group);
    }
  }

  removeChunk(key) {
    const group = this.chunks.get(key);

    if (group?.parent) {
      this.group.remove(group);
    }

    if (group) {
      disposeChunk(group);
    }

    this.chunks.delete(key);
  }

  dispose() {
    for (const key of this.chunks.keys()) {
      this.removeChunk(key);
    }

    for (const model of this.patchModels) {
      for (const mesh of model.meshes) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    }
  }
}

async function loadGravelPatchModels() {
  const assets = await Promise.all(PATCH_PATHS.map((path) => loader.loadAsync(path)));

  return assets.map((asset, index) => extractPatchModel(asset.scene, index));
}

function extractPatchModel(scene, modelIndex) {
  scene.updateMatrixWorld(true);

  const meshes = [];

  scene.traverse((child) => {
    if (!child.isMesh) return;

    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    meshes.push({
      geometry,
      material: createPatchMaterial(child.material),
    });
  });

  return {
    modelIndex,
    meshes,
  };
}

function createPatchMaterial(sourceMaterial) {
  const material = sourceMaterial.clone();

  material.roughness = 0.94;
  material.metalness = 0;
  material.vertexColors = true;
  material.transparent = false;
  material.depthWrite = true;
  material.depthTest = true;
  material.needsUpdate = true;

  return material;
}

function createPatchPlacements(terrain, minX, minZ) {
  const cellSize = Math.sqrt(1 / GRAVEL_PATCH_DENSITY);
  const placements = [];
  const occupied = [];

  for (let worldZ = minZ - cellSize * 0.5; worldZ <= minZ + ZONE_SIZE + cellSize * 0.5; worldZ += cellSize) {
    for (let worldX = minX - cellSize * 0.5; worldX <= minX + ZONE_SIZE + cellSize * 0.5; worldX += cellSize) {
      const gridX = Math.round(worldX / cellSize);
      const gridZ = Math.round(worldZ / cellSize);
      const jitterX = (hash2(gridX, gridZ) - 0.5) * cellSize;
      const jitterZ = (hash2(gridX + 17.31, gridZ - 9.73) - 0.5) * cellSize;
      const x = worldX + jitterX;
      const z = worldZ + jitterZ;

      if (x < minX || x > minX + ZONE_SIZE || z < minZ || z > minZ + ZONE_SIZE) continue;

      const coverage = getGravelCoverage(terrain, x, z);
      const acceptance = coverage * 0.72;

      if (hash2(gridX + 101.7, gridZ - 55.2) > acceptance) continue;
      if (isTooClose(x, z, occupied)) continue;

      const placement = createPatchPlacement(terrain, x, z, gridX, gridZ, coverage);
      occupied.push({ x, z });
      placements.push(placement);
    }
  }

  return placements;
}

function createPatchPlacement(terrain, x, z, seedX, seedZ, coverage) {
  const y = terrain.getHeightAt(x, z) + GRAVEL_OVERLAY_Y_OFFSET;
  const normal = terrain.getNormalAt(x, z);
  const modelRoll = hash2(seedX + 220.4, seedZ - 91.6);
  const modelIndex = getPatchModelIndex(modelRoll);
  const yaw = hash2(seedX - 41.8, seedZ + 12.6) * Math.PI * 2;
  const scaleBase = THREE.MathUtils.lerp(GRAVEL_PATCH_SCALE_MIN, GRAVEL_PATCH_SCALE_MAX, hash2(seedX + 5.7, seedZ + 33.1));
  const scale = scaleBase * THREE.MathUtils.lerp(0.82, 1.18, coverage);
  const tilt = new THREE.Quaternion().setFromUnitVectors(UP, normal);
  const rotation = new THREE.Quaternion().setFromAxisAngle(normal, yaw).multiply(tilt);
  const matrix = new THREE.Matrix4();

  matrix.compose(
    new THREE.Vector3(x, y, z),
    rotation,
    new THREE.Vector3(scale, scale, scale),
  );

  return { matrix, modelIndex };
}

function getPatchModelIndex(roll) {
  if (roll < 0.32) return 0;
  if (roll < 0.66) return 1;
  if (roll < 0.86) return 2;

  return 3;
}

function buildPatchChunk(placements, patchModels, minX, minZ) {
  const group = new THREE.Group();
  group.name = `GravelPatchChunk_${minX}_${minZ}`;

  for (const model of patchModels) {
    const modelPlacements = placements.filter((placement) => placement.modelIndex === model.modelIndex);

    if (modelPlacements.length === 0) continue;

    for (let meshIndex = 0; meshIndex < model.meshes.length; meshIndex += 1) {
      const source = model.meshes[meshIndex];
      const instanced = new THREE.InstancedMesh(
        source.geometry,
        source.material,
        modelPlacements.length,
      );

      instanced.name = `GravelPatch_${model.modelIndex}_${meshIndex}_Instances`;
      instanced.castShadow = true;
      instanced.receiveShadow = true;

      for (let i = 0; i < modelPlacements.length; i += 1) {
        instanced.setMatrixAt(i, modelPlacements[i].matrix);
      }

      instanced.instanceMatrix.needsUpdate = true;
      instanced.computeBoundingBox();
      instanced.computeBoundingSphere();
      group.add(instanced);
    }
  }

  return group;
}

function disposeChunk(group) {
  while (group.children.length > 0) {
    const child = group.children[0];

    group.remove(child);
    child.dispose?.();
  }
}

function getGravelCoverage(terrain, x, z) {
  if (isInRiverGrassExclusion(x, z, WATER_EXCLUSION_BUFFER)) return 0;
  if (isInWaterSystemVegetationExclusion(x, z, WATER_EXCLUSION_BUFFER)) return 0;
  if (isInSmallLakeExclusion(x, z)) return 0;

  const height = terrain.getHeightAt(x, z);
  const normal = terrain.getNormalAt(x, z);
  const groundMask = smoothstep(0.08, 0.82, terrain.getTerrainGroundMask(x, z));
  const heightMask = 1 - smoothstep(95, 155, height);
  const flatMask = smoothstep(0.66, 0.92, normal.y);
  const gravelPatch = smoothstep(0.42, 0.76, fbm(x * 0.08 + 5.4, z * 0.08 + 18.0));
  const breakup = smoothstep(0.2, 0.58, fbm(x * 0.12 - 8.0, z * 0.12 + 3.0));

  return THREE.MathUtils.clamp(
    groundMask * heightMask * flatMask * THREE.MathUtils.lerp(0.2, 1.0, gravelPatch) * breakup,
    0,
    1,
  );
}

function isTooClose(x, z, occupied) {
  const minDistanceSq = GRAVEL_PATCH_MIN_SPACING * GRAVEL_PATCH_MIN_SPACING;

  for (let i = 0; i < occupied.length; i += 1) {
    const dx = occupied[i].x - x;
    const dz = occupied[i].z - z;

    if (dx * dx + dz * dz < minDistanceSq) return true;
  }

  return false;
}

function fbm(x, z) {
  let value = 0;
  let amplitude = 0.5;
  let px = x;
  let pz = z;

  for (let i = 0; i < 4; i += 1) {
    value += noise(px, pz) * amplitude;
    const nextX = px * 2.02 + 7.3;
    const nextZ = pz * 2.02 + 13.1;

    px = nextX;
    pz = nextZ;
    amplitude *= 0.5;
  }

  return value;
}

function noise(x, z) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = x - x0;
  const tz = z - z0;
  const a = hash2(x0, z0);
  const b = hash2(x0 + 1, z0);
  const c = hash2(x0, z0 + 1);
  const d = hash2(x0 + 1, z0 + 1);
  const ux = tx * tx * (3 - 2 * tx);
  const uz = tz * tz * (3 - 2 * tz);

  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(a, b, ux),
    THREE.MathUtils.lerp(c, d, ux),
    uz,
  );
}

function hash2(x, z) {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;

  return value - Math.floor(value);
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}
