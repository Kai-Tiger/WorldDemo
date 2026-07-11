import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { isInRiverGrassExclusion } from './riverChannel.js';
import { isInWaterSystemVegetationExclusion } from './waterSystem.js';
import { isInSmallLakeExclusion } from './smallLakes.js';
import { isInMountainTrailTreeExclusion } from './mountainTrailNetwork.js';
import { hash2, sampleTerrainSurface } from './grassClumps.js';
import { PLAYER_SPAWN_POSITION } from './spawn.js';
import {
  GRASS_WIND_X,
  GRASS_WIND_Z,
  MAP_SIZE,
  SPAWN_TREE_COLOR_MULTIPLIER,
  SPAWN_TREE_EMISSIVE_INTENSITY_MULTIPLIER,
  SPAWN_TREE_MODEL_PATH,
  SPAWN_TREE_REPLACEMENT_COUNT,
  SPAWN_TREE_SCALE_MULTIPLIER,
  TREE_MODEL_PATHS,
  TREE_SHADOW_LIFT_COLOR,
  TREE_SHADOW_LIFT_INTENSITY,
  TREE_SWAY_BOUNDS_PADDING,
  TREE_SWAY_FADE_END,
  TREE_SWAY_FADE_START,
  TREE_SWAY_PRIMARY_FREQUENCY,
  TREE_SWAY_SECONDARY_FREQUENCY,
  TREE_SWAY_STRENGTH,
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

const MIN_TREE_SPACING = TREE_MIN_SPACING;
const RIVER_BUFFER = TREE_RIVER_BUFFER;
const WATER_SYSTEM_BUFFER = Math.max(RIVER_BUFFER, 10);
const UP = new THREE.Vector3(0, 1, 0);
const HALF_MAP_SIZE = MAP_SIZE / 2;
const BATCH_SIZE = 3000;
const TREE_ALPHA_TEST = 0.38;
const TREE_ENVIRONMENT_INTENSITY = 0.92;
const TREE_WIND_DIRECTION = new THREE.Vector2(GRASS_WIND_X, GRASS_WIND_Z).normalize();
const TREE_SWAY_PROGRAM_KEY = 'tree-canopy-sway-world-wind-v1';

const loader = new GLTFLoader();

export async function loadTreeModels() {
  const models = [];
  const paths = [...TREE_MODEL_PATHS, SPAWN_TREE_MODEL_PATH];

  for (const path of paths) {
    const asset = await loader.loadAsync(path);
    models.push(extractMeshes(asset.scene, path === SPAWN_TREE_MODEL_PATH));
  }

  return models;
}

function extractMeshes(scene, isSpawnTree = false) {
  scene.updateMatrixWorld(true);

  const sources = [];
  let modelMinY = Infinity;
  let modelMaxY = -Infinity;

  scene.traverse((child) => {
    if (!child.isMesh) return;

    const geometry = child.geometry.clone();

    geometry.applyMatrix4(child.matrixWorld);
    geometry.computeBoundingBox();

    modelMinY = Math.min(modelMinY, geometry.boundingBox.min.y);
    modelMaxY = Math.max(modelMaxY, geometry.boundingBox.max.y);
    sources.push({
      geometry,
      sourceMaterial: child.material,
      role: getTreeMeshRole(child.name, child.material?.name),
    });
  });

  const modelBaseY = Number.isFinite(modelMinY) ? modelMinY : 0;
  const modelHeight = Number.isFinite(modelMaxY)
    ? Math.max(modelMaxY - modelBaseY, 0.001)
    : 1;
  const hasSway = sources.some((source) => source.role === 'canopy');
  const swayUniforms = hasSway ? createTreeSwayUniforms(modelBaseY, modelHeight) : null;
  const meshes = sources.map(({ geometry, sourceMaterial, role }) => {
    const material = createTreeMaterial(
      sourceMaterial,
      isSpawnTree,
      role === 'canopy' ? swayUniforms : null,
    );

    return {
      geometry,
      material,
      role,
      depthMaterial: role === 'canopy'
        ? createTreeDepthMaterial(material, swayUniforms)
        : null,
    };
  });

  return { meshes, swayUniforms };
}

export function getTreeMeshRole(meshName = '', materialName = '') {
  const label = `${meshName} ${materialName}`;

  if (/trunk/i.test(label)) return 'trunk';
  if (/branch(?:es)?|lea(?:f|ves)/i.test(label)) return 'canopy';

  return 'static';
}

export function createTreeSwayUniforms(modelBaseY, modelHeight) {
  return {
    uTreeTime: { value: 0 },
    uTreeViewerPosition: {
      value: new THREE.Vector2(PLAYER_SPAWN_POSITION.x, PLAYER_SPAWN_POSITION.z),
    },
    uTreeWindDirection: { value: TREE_WIND_DIRECTION },
    uTreeBaseY: { value: modelBaseY },
    uTreeHeight: { value: modelHeight },
    uTreeSwayStrength: { value: TREE_SWAY_STRENGTH },
  };
}

export function createTreeMaterial(sourceMaterial, isSpawnTree, swayUniforms = null) {
  const material = sourceMaterial.clone();

  material.transparent = false;
  material.alphaTest = Math.max(material.alphaTest || 0, TREE_ALPHA_TEST);
  material.depthWrite = true;
  material.depthTest = true;
  if (isSpawnTree && 'color' in material) {
    material.color.multiply(new THREE.Color(SPAWN_TREE_COLOR_MULTIPLIER));
  }
  if ('emissive' in material) {
    material.emissive = new THREE.Color(TREE_SHADOW_LIFT_COLOR);
    material.emissiveIntensity = isSpawnTree
      ? TREE_SHADOW_LIFT_INTENSITY * SPAWN_TREE_EMISSIVE_INTENSITY_MULTIPLIER
      : TREE_SHADOW_LIFT_INTENSITY;
  }
  if ('envMapIntensity' in material) {
    material.envMapIntensity = TREE_ENVIRONMENT_INTENSITY;
  }
  if (swayUniforms) {
    configureTreeSwayMaterial(material, swayUniforms, 'surface');
  } else {
    material.userData.treeSwayUniforms = null;
  }
  material.needsUpdate = true;

  return material;
}

export function createTreeDepthMaterial(sourceMaterial, swayUniforms) {
  const material = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: sourceMaterial.map,
    alphaMap: sourceMaterial.alphaMap,
    alphaTest: sourceMaterial.alphaTest,
    side: sourceMaterial.side,
  });

  material.name = `${sourceMaterial.name || 'TreeCanopy'}Depth`;
  configureTreeSwayMaterial(material, swayUniforms, 'depth');
  return material;
}

function configureTreeSwayMaterial(material, uniforms, pass) {
  material.userData.treeSwayUniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = injectTreeSway(shader.vertexShader);
  };
  material.customProgramCacheKey = () => `${TREE_SWAY_PROGRAM_KEY}-${pass}`;
  material.needsUpdate = true;
}

export function injectTreeSway(vertexShader) {
  return vertexShader
    .replace(
      '#include <common>',
      `#include <common>
uniform float uTreeTime;
uniform vec2 uTreeViewerPosition;
uniform vec2 uTreeWindDirection;
uniform float uTreeBaseY;
uniform float uTreeHeight;
uniform float uTreeSwayStrength;`,
    )
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
float treeHeightRatio = clamp((position.y - uTreeBaseY) / uTreeHeight, 0.0, 1.0);
float treeHeightMask = pow(smoothstep(0.18, 1.0, treeHeightRatio), 2.0);
vec3 treeInstanceWorld = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
mat3 treeInstanceTransform = mat3(modelMatrix);
#ifdef USE_INSTANCING
treeInstanceWorld = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
treeInstanceTransform = mat3(modelMatrix) * mat3(instanceMatrix);
#endif
vec3 treeWorldWindDirection = vec3(uTreeWindDirection.x, 0.0, uTreeWindDirection.y);
vec2 treeLocalWindDirection = vec2(
  dot(treeWorldWindDirection, normalize(treeInstanceTransform[0])),
  dot(treeWorldWindDirection, normalize(treeInstanceTransform[2]))
);
treeLocalWindDirection /= max(length(treeLocalWindDirection), 0.001);
vec2 treeWorldSideDirection = vec2(-uTreeWindDirection.y, uTreeWindDirection.x);
vec2 treeLocalSideDirection = vec2(-treeLocalWindDirection.y, treeLocalWindDirection.x);
float treeViewerDistance = distance(treeInstanceWorld.xz, uTreeViewerPosition);
float treeDistanceMask = 1.0 - smoothstep(${TREE_SWAY_FADE_START.toFixed(1)}, ${TREE_SWAY_FADE_END.toFixed(1)}, treeViewerDistance);
float treePrimaryWave = sin(
  dot(treeInstanceWorld.xz, uTreeWindDirection) * 0.035
  + uTreeTime * ${TREE_SWAY_PRIMARY_FREQUENCY.toFixed(2)}
);
float treeSecondaryWave = sin(
  dot(treeInstanceWorld.xz, treeWorldSideDirection) * 0.05
  - uTreeTime * ${TREE_SWAY_SECONDARY_FREQUENCY.toFixed(2)}
);
transformed.xz += (
  treeLocalWindDirection * treePrimaryWave * 0.78
  + treeLocalSideDirection * treeSecondaryWave * 0.22
) * uTreeHeight * uTreeSwayStrength * treeHeightMask * treeDistanceMask;`,
    );
}

export function updateTreeSwayUniforms(treeModels, viewerPosition, elapsedTime) {
  const updatedUniforms = new Set();

  for (const model of treeModels ?? []) {
    const uniforms = model.swayUniforms;

    if (!uniforms || updatedUniforms.has(uniforms)) continue;

    uniforms.uTreeTime.value = elapsedTime;
    uniforms.uTreeViewerPosition.value.set(viewerPosition.x, viewerPosition.z);
    updatedUniforms.add(uniforms);
  }
}

export function getTreeDensity(height) {
  if (height <= TREE_HEIGHT_THRESHOLD_LOW) return TREE_DENSITY_LOWLAND;
  if (height <= TREE_HEIGHT_THRESHOLD_MID) return TREE_DENSITY_MIDLAND;

  return TREE_DENSITY_HIGHLAND;
}

export function isTreeArea(terrain, x, z, surface = null) {
  const vGroundMask = (surface ?? sampleTerrainSurface(terrain, x, z)).groundMask;

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
  const surface = {};

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
            sampleTerrainSurface(terrain, x, z, surface);
            const height = surface.height;
            const density = getTreeDensity(height);
            const densityRatio = density / 0.05;

            const noiseVal = fbm(x * TREE_NOISE_SCALE, z * TREE_NOISE_SCALE, TREE_NOISE_OCTAVES);
            const biomeNoise = fbm((x + 180) * 0.0045, (z - 260) * 0.0045, 4);
            const moistureNoise = fbm((x - 430) * 0.007, (z + 90) * 0.007, 3);
            const ridgeFactor = 1.0 - Math.abs(surface.normalY - 0.65) * 3.0;
            const ridgeBoost = THREE.MathUtils.clamp(ridgeFactor * 1.8, 0.4, 1.8);
            const forestCluster = THREE.MathUtils.smoothstep(biomeNoise, 0.28, 0.74);
            const moistureFactor = THREE.MathUtils.lerp(0.72, 1.18, moistureNoise);
            const modulatedDensity = densityRatio
              * (TREE_NOISE_MIN_FACTOR + TREE_NOISE_INFLUENCE * noiseVal)
              * ridgeBoost
              * THREE.MathUtils.lerp(0.42, 1.24, forestCluster)
              * moistureFactor;

            if (hash2(gridX + 500, gridZ + 700) < modulatedDensity) {
              if (isTreeArea(terrain, x, z, surface)) {
                if (
                  !isInRiverGrassExclusion(x, z, RIVER_BUFFER)
                  && !isInWaterSystemVegetationExclusion(x, z, WATER_SYSTEM_BUFFER)
                  && !isInSmallLakeExclusion(x, z)
                  && !isInMountainTrailTreeExclusion(x, z)
                ) {
                  if (!isTooClose(x, z, occupied)) {
                    markOccupied(x, z, occupied);
                    const modelCount = TREE_MODEL_PATHS.length;
                    const modelIndex = Math.floor(hash2(gridX + 300, gridZ + 400) * modelCount);

                    placements.push(createTreePlacement(terrain, x, z, gridX, gridZ, modelIndex, surface));
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
      instanced.userData.treeRole = mesh.role ?? 'static';
      if (mesh.depthMaterial) {
        instanced.customDepthMaterial = mesh.depthMaterial;
      }

      for (let i = 0; i < modelPlacements.length; i += 1) {
        instanced.setMatrixAt(i, modelPlacements[i].matrix);
        instanced.setColorAt(i, modelPlacements[i].tint);
      }

      instanced.instanceMatrix.needsUpdate = true;
      instanced.instanceColor.needsUpdate = true;
      instanced.computeBoundingBox();
      instanced.computeBoundingSphere();
      if (mesh.depthMaterial) {
        instanced.boundingBox.expandByScalar(TREE_SWAY_BOUNDS_PADDING);
        instanced.boundingSphere.radius += TREE_SWAY_BOUNDS_PADDING;
      }
      parent.add(instanced);
    }
  }
}

export async function generateAllTreePlacements(terrain) {
  const iterator = createTreePlacementIterator(
    terrain,
    -HALF_MAP_SIZE,
    -HALF_MAP_SIZE,
    HALF_MAP_SIZE,
    HALF_MAP_SIZE,
  );

  return new Promise((resolve) => {
    function batch() {
      const done = iterator.step(BATCH_SIZE);

      if (done) {
        const placements = iterator.getPlacements();

        replaceSpawnAreaTrees(placements);
        resolve(placements);
      } else {
        requestAnimationFrame(batch);
      }
    }

    requestAnimationFrame(batch);
  });
}

export function replaceSpawnAreaTrees(placements) {
  const spawnTreeModelIndex = TREE_MODEL_PATHS.length;
  const nearestPlacements = placements
    .map((placement) => {
      const elements = placement.matrix.elements;
      const dx = elements[12] - PLAYER_SPAWN_POSITION.x;
      const dz = elements[14] - PLAYER_SPAWN_POSITION.z;

      return { placement, distanceSq: dx * dx + dz * dz };
    })
    .sort((a, b) => a.distanceSq - b.distanceSq)
    .slice(0, SPAWN_TREE_REPLACEMENT_COUNT);

  for (const { placement } of nearestPlacements) {
    placement.modelIndex = spawnTreeModelIndex;
    scaleTreePlacement(placement.matrix, SPAWN_TREE_SCALE_MULTIPLIER);
  }
}

function scaleTreePlacement(matrix, multiplier) {
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  matrix.decompose(position, rotation, scale);
  scale.multiplyScalar(multiplier);
  matrix.compose(position, rotation, scale);
}

function createTreePlacement(terrain, x, z, seedX, seedZ, modelIndex, surface = null) {
  const y = (surface ?? sampleTerrainSurface(terrain, x, z)).height;
  const yaw = hash2(seedX - 41.8, seedZ + 12.6) * Math.PI * 2;
  const scaleValue = THREE.MathUtils.lerp(TREE_SCALE_MIN, TREE_SCALE_MAX, hash2(seedX + 5.7, seedZ + 33.1));
  const widthScale = scaleValue * THREE.MathUtils.lerp(0.84, 1.12, hash2(seedX - 7.4, seedZ + 81.2));
  const heightScale = scaleValue * THREE.MathUtils.lerp(0.92, 1.16, hash2(seedX + 47.8, seedZ - 25.6));
  const yawRotation = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
  const leanAngle = THREE.MathUtils.lerp(-0.045, 0.045, hash2(seedX + 18.9, seedZ + 13.2));
  const leanAxis = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
  const leanRotation = new THREE.Quaternion().setFromAxisAngle(leanAxis, leanAngle);
  const rotation = yawRotation.multiply(leanRotation);
  const scale = new THREE.Vector3(widthScale, heightScale, widthScale);
  const matrix = new THREE.Matrix4();
  const tintValue = THREE.MathUtils.lerp(0.82, 1.04, hash2(seedX + 95.3, seedZ - 62.7));
  const tint = new THREE.Color(tintValue * 0.91, tintValue, tintValue * 0.86);

  matrix.compose(new THREE.Vector3(x, y, z), rotation, scale);

  return { matrix, modelIndex, tint };
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
