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

const loader = new GLTFLoader();
const grassPatches = createGrassPatches();

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

export function updateGrassClumps(grassClumps, elapsedTime) {
  grassClumps?.traverse((child) => {
    const uniforms = child.material?.userData?.grassUniforms;

    if (uniforms) {
      uniforms.uGrassTime.value = elapsedTime;
    }
  });
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

function createGrassSwayMaterial(sourceMaterial, geometry) {
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

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}
