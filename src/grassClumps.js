import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { isInRiverGrassExclusion } from './riverChannel.js';
import { PLAYER_SPAWN_POSITION } from './spawn.js';

const GRASS_CLUMP_PATH = '/assets/vegetation/grass-clumps.glb';
const PLACEMENT_RADIUS = 15;
const CLUMPS_PER_SQUARE_METER = 20;
const CELL_SIZE = Math.sqrt(1 / CLUMPS_PER_SQUARE_METER);
const RIVER_BUFFER = 2;
const PATCH_COUNT = 24;
const PATCH_MIN_RADIUS = 1.5;
const PATCH_MAX_RADIUS = 3;
const PATCH_GAP_ACCEPTANCE = 0.75;
const PATCH_FULL_ACCEPTANCE = 1;
const SWAY_STRENGTH = 0.035;
const WIND_DIRECTION = new THREE.Vector2(0.82, 0.38).normalize();
const UP = new THREE.Vector3(0, 1, 0);

export const LOD_DENSITIES = [20, 5, 1.25];
export const LOD_DISTANCES = [35, 100, 200];
export const ZONE_SIZE = 64;

const HALF_MAP_SIZE = 2048 / 2;
const loader = new GLTFLoader();
const grassPatches = createGrassPatches();
const patchCellCache = new Map();

export async function loadGrassModel() {
  return loader.loadAsync(GRASS_CLUMP_PATH);
}

export function createGrassVariants(scene) {
  scene.updateMatrixWorld(true);

  return new Map(['GrassClump_A', 'GrassClump_B'].map((name) => {
    const root = scene.getObjectByName(name);
    const rootInverse = root.matrixWorld.clone().invert();
    const leaves = [];

    root.traverse((child) => {
      if (!child.isMesh) return;

      const geometry = child.geometry.clone();
      const leafMatrix = rootInverse.clone().multiply(child.matrixWorld);

      geometry.applyMatrix4(leafMatrix);
      geometry.computeBoundingBox();

      leaves.push({
        name: child.name,
        geometry,
        material: createGrassSwayMaterial(child.material, geometry),
      });
    });

    return [name, { leaves }];
  }));
}

export function createGrassSwayMaterial(sourceMaterial, geometry) {
  const material = sourceMaterial.clone();
  const height = Math.max(geometry.boundingBox.max.y - geometry.boundingBox.min.y, 0.001);
  const uniforms = {
    uGrassTime: { value: 0 },
    uGrassBaseY: { value: geometry.boundingBox.min.y },
    uGrassHeight: { value: height },
    uGrassWindDirection: { value: WIND_DIRECTION },
    uGrassSwayStrength: { value: SWAY_STRENGTH },
  };

  if ('vertexColors' in material) {
    material.vertexColors = true;
  }

  material.userData.grassUniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uGrassTime;
uniform float uGrassBaseY;
uniform float uGrassHeight;
uniform vec2 uGrassWindDirection;
uniform float uGrassSwayStrength;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
float grassHeightRatio = clamp((position.y - uGrassBaseY) / uGrassHeight, 0.0, 1.0);
float grassTipMask = smoothstep(0.08, 1.0, grassHeightRatio) * grassHeightRatio;
vec3 grassInstanceWorld = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
#ifdef USE_INSTANCING
grassInstanceWorld = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
#endif
vec2 grassSideDirection = vec2(-uGrassWindDirection.y, uGrassWindDirection.x);
float grassWave = sin(dot(grassInstanceWorld.xz, uGrassWindDirection) * 0.55 + uGrassTime * 1.35 + position.y * 5.0);
float grassFlutter = sin(dot(grassInstanceWorld.xz, grassSideDirection) * 0.9 + uGrassTime * 2.1 + position.y * 7.0);
transformed.xz += (
  uGrassWindDirection * grassWave
  + grassSideDirection * grassFlutter * 0.28
) * uGrassSwayStrength * grassTipMask;`,
      );
  };
  material.customProgramCacheKey = () => 'grass-sway-v1';

  return material;
}

export function isGrassArea(terrain, x, z) {
  const vGroundMask = terrain.getTerrainGroundMask(x, z);
  const height = terrain.getHeightAt(x, z);
  const lowGroundFade = 1 - smoothstep(130, 185, height);
  const groundMask = smoothstepRange(0.08, 0.82, vGroundMask) * lowGroundFade;

  return groundMask > 0.3;
}

export function generatePlacementsInRect(terrain, minX, minZ, maxX, maxZ, density) {
  const cellSize = Math.sqrt(1 / density);
  const placements = [];

  for (
    let worldZ = minZ - cellSize * 0.5;
    worldZ <= maxZ + cellSize * 0.5;
    worldZ += cellSize
  ) {
    for (
      let worldX = minX - cellSize * 0.5;
      worldX <= maxX + cellSize * 0.5;
      worldX += cellSize
    ) {
      const gridX = Math.round(worldX / cellSize);
      const gridZ = Math.round(worldZ / cellSize);

      const jitterX = (hash2(gridX, gridZ) - 0.5) * cellSize;
      const jitterZ = (hash2(gridX + 17.31, gridZ - 9.73) - 0.5) * cellSize;
      const x = worldX + jitterX;
      const z = worldZ + jitterZ;

      if (x < minX || x > maxX || z < minZ || z > maxZ) continue;

      const patches = getPatchesForPoint(x, z);
      if (!shouldPlaceInPatch(x, z, gridX, gridZ, patches)) continue;
      if (!isGrassArea(terrain, x, z)) continue;
      if (isInRiverGrassExclusion(x, z, RIVER_BUFFER)) continue;

      const clustered = getClusteredOffset(x, z, gridX, gridZ, patches);

      placements.push(createPlacement(terrain, clustered.x, clustered.z, gridX, gridZ));
    }
  }

  return placements;
}

export function buildInstancedMeshes(placements, variants, parent) {
  for (const [variantName, variant] of variants) {
    const variantPlacements = placements.filter((p) => p.variantName === variantName);

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
      parent.add(mesh);
    }
  }
}

export function hash2(x, z) {
  const value = Math.sin((x * 127.1) + (z * 311.7)) * 43758.5453123;

  return value - Math.floor(value);
}

export function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}

function smoothstepRange(edge0, edge1, value) {
  return smoothstep(edge0, edge1, value);
}

export function createPlacement(terrain, x, z, seedX, seedZ) {
  const y = terrain.getHeightAt(x, z);
  const normal = terrain.getNormalAt(x, z);
  const yaw = hash2(seedX - 41.8, seedZ + 12.6) * Math.PI * 2;
  const scaleValue = THREE.MathUtils.lerp(0.82, 1.18, hash2(seedX + 5.7, seedZ + 33.1));
  const tilt = new THREE.Quaternion().setFromUnitVectors(UP, normal);
  const rotation = new THREE.Quaternion().setFromAxisAngle(normal, yaw).multiply(tilt);
  const scale = new THREE.Vector3(scaleValue, scaleValue, scaleValue);
  const matrix = new THREE.Matrix4();

  matrix.compose(new THREE.Vector3(x, y, z), rotation, scale);

  return {
    matrix,
    variantName: hash2(seedX + 91.2, seedZ - 11.4) < 0.5 ? 'GrassClump_A' : 'GrassClump_B',
  };
}

function getPatchesForPoint(worldX, worldZ) {
  const gridX = Math.floor((worldX + HALF_MAP_SIZE) / ZONE_SIZE);
  const gridZ = Math.floor((worldZ + HALF_MAP_SIZE) / ZONE_SIZE);
  const patches = [];

  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const key = `${gridX + dx},${gridZ + dz}`;
      if (!patchCellCache.has(key)) {
        const minX = (gridX + dx) * ZONE_SIZE - HALF_MAP_SIZE;
        const minZ = (gridZ + dz) * ZONE_SIZE - HALF_MAP_SIZE;
        patchCellCache.set(key, createPatchCell(minX, minZ, ZONE_SIZE));
      }
      patches.push(...patchCellCache.get(key));
    }
  }

  return patches;
}

function createPatchCell(minX, minZ, size) {
  const patches = [];
  const maxX = minX + size;
  const maxZ = minZ + size;

  patches.push({
    x: (minX + maxX) / 2,
    z: (minZ + maxZ) / 2,
    radius: size * 0.35,
  });

  const patchCount = 8;
  for (let i = 1; i < patchCount; i += 1) {
    const angle = hash2(minX + i * 9.4, minZ + i * -2.8) * Math.PI * 2;
    const distance = Math.sqrt(hash2(minX + i * -4.7, minZ + i * 15.2)) * (size * 0.4);
    const radius = THREE.MathUtils.lerp(1.5, 4.0, hash2(minX + i * 31.6, minZ + i * -18.9));

    patches.push({
      x: (minX + maxX) / 2 + Math.cos(angle) * distance,
      z: (minZ + maxZ) / 2 + Math.sin(angle) * distance,
      radius,
    });
  }

  return patches;
}

function shouldPlaceInPatch(worldX, worldZ, gridX, gridZ, patches) {
  const patchInfluence = getPatchInfluenceAt(worldX, worldZ, patches);
  const localAcceptance = THREE.MathUtils.lerp(
    PATCH_GAP_ACCEPTANCE,
    PATCH_FULL_ACCEPTANCE,
    patchInfluence,
  );

  return hash2(gridX + 203.4, gridZ - 71.8) < localAcceptance;
}

function getClusteredOffset(worldX, worldZ, gridX, gridZ, patches) {
  const patch = getStrongestPatch(worldX, worldZ, patches);

  if (!patch) return { x: worldX, z: worldZ };

  const dx = patch.x - worldX;
  const dz = patch.z - worldZ;
  const distance = Math.sqrt(dx * dx + dz * dz);
  const influence = 1 - smoothstep(patch.radius * 0.2, patch.radius, distance);
  const pull = influence * THREE.MathUtils.lerp(0.12, 0.24, hash2(gridX - 14.2, gridZ + 55.8));

  return {
    x: worldX + dx * pull,
    z: worldZ + dz * pull,
  };
}

function getStrongestPatch(worldX, worldZ, patches) {
  let strongest = null;
  let strongestInfluence = 0;

  for (const patch of patches) {
    const dx = worldX - patch.x;
    const dz = worldZ - patch.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const influence = 1 - smoothstep(patch.radius * 0.28, patch.radius, distance);

    if (influence <= strongestInfluence) continue;

    strongestInfluence = influence;
    strongest = patch;
  }

  return strongest;
}

function getPatchInfluenceAt(worldX, worldZ, patches) {
  let influence = 0;
  let layeredInfluence = 0;

  for (const patch of patches) {
    const dx = worldX - patch.x;
    const dz = worldZ - patch.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const patchInfluence = 1 - smoothstep(patch.radius * 0.28, patch.radius, distance);

    influence = Math.max(influence, patchInfluence);
    layeredInfluence += patchInfluence * 0.42;
  }

  const broadBreakup = 0.5 + 0.5 * Math.sin(worldX * 0.72 + worldZ * 0.41);

  return THREE.MathUtils.clamp(
    Math.max(influence, layeredInfluence) * 0.88 + broadBreakup * 0.12,
    0,
    1,
  );
}

function createGrassPatches() {
  const patches = [{ x: 0, z: 0, radius: 2.4 }];

  for (let i = 0; i < PATCH_COUNT - 1; i += 1) {
    const angle = hash2(i + 9.4, i - 2.8) * Math.PI * 2;
    const distance = Math.sqrt(hash2(i - 4.7, i + 15.2)) * (PLACEMENT_RADIUS - PATCH_MAX_RADIUS);
    const radius = THREE.MathUtils.lerp(PATCH_MIN_RADIUS, PATCH_MAX_RADIUS, hash2(i + 31.6, i - 18.9));

    patches.push({
      x: Math.cos(angle) * distance,
      z: Math.sin(angle) * distance,
      radius,
    });
  }

  return patches;
}

export async function createGrassClumps(terrain) {
  const asset = await loadGrassModel();
  const variants = createGrassVariants(asset.scene);
  const placements = createGrassPlacements(terrain);
  const group = new THREE.Group();

  group.name = 'GrassClumps';
  buildInstancedMeshes(placements, variants, group);

  return group;
}

export function updateGrassClumps(grassManager, elapsedTime) {
  grassManager?.traverse((child) => {
    const uniforms = child.material?.userData?.grassUniforms;

    if (uniforms) {
      uniforms.uGrassTime.value = elapsedTime;
    }
  });
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

      if (!shouldPlaceGrassInPatch(offsetX, offsetZ, gridX, gridZ)) continue;

      const clusteredOffset = getClusteredGrassOffset(offsetX, offsetZ, gridX, gridZ);
      const x = PLAYER_SPAWN_POSITION.x + clusteredOffset.x;
      const z = PLAYER_SPAWN_POSITION.z + clusteredOffset.z;

      if (isInRiverGrassExclusion(x, z, RIVER_BUFFER)) continue;

      placements.push(createPlacement(terrain, x, z, gridX, gridZ));
    }
  }

  return placements;
}

function shouldPlaceGrassInPatch(offsetX, offsetZ, gridX, gridZ) {
  const patchInfluence = getGrassPatchInfluence(offsetX, offsetZ);
  const localAcceptance = THREE.MathUtils.lerp(
    PATCH_GAP_ACCEPTANCE,
    PATCH_FULL_ACCEPTANCE,
    patchInfluence,
  );

  return hash2(gridX + 203.4, gridZ - 71.8) < localAcceptance;
}

function getClusteredGrassOffset(offsetX, offsetZ, gridX, gridZ) {
  const patch = getStrongestGrassPatch(offsetX, offsetZ);

  if (!patch) return { x: offsetX, z: offsetZ };

  const dx = patch.x - offsetX;
  const dz = patch.z - offsetZ;
  const distance = Math.sqrt(dx * dx + dz * dz);
  const influence = 1 - smoothstep(patch.radius * 0.2, patch.radius, distance);
  const pull = influence * THREE.MathUtils.lerp(0.12, 0.24, hash2(gridX - 14.2, gridZ + 55.8));

  return {
    x: offsetX + dx * pull,
    z: offsetZ + dz * pull,
  };
}

function getStrongestGrassPatch(offsetX, offsetZ) {
  let strongestPatch = null;
  let strongestInfluence = 0;

  for (const patch of grassPatches) {
    const dx = offsetX - patch.x;
    const dz = offsetZ - patch.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const influence = 1 - smoothstep(patch.radius * 0.28, patch.radius, distance);

    if (influence <= strongestInfluence) continue;

    strongestInfluence = influence;
    strongestPatch = patch;
  }

  return strongestPatch;
}

function getGrassPatchInfluence(offsetX, offsetZ) {
  let influence = 0;
  let layeredInfluence = 0;

  for (const patch of grassPatches) {
    const dx = offsetX - patch.x;
    const dz = offsetZ - patch.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const patchInfluence = 1 - smoothstep(patch.radius * 0.28, patch.radius, distance);

    influence = Math.max(influence, patchInfluence);
    layeredInfluence += patchInfluence * 0.42;
  }

  const broadBreakup = 0.5 + 0.5 * Math.sin(offsetX * 0.72 + offsetZ * 0.41);

  return THREE.MathUtils.clamp(
    Math.max(influence, layeredInfluence) * 0.88 + broadBreakup * 0.12,
    0,
    1,
  );
}
