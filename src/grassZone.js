import * as THREE from 'three';
import {
  buildInstancedMeshes,
  hash2,
  smoothstep,
  isGrassArea,
  createPlacement,
  ZONE_SIZE,
} from './grassClumps.js';
import { isInRiverGrassExclusion } from './riverChannel.js';
import {
  MAP_SIZE,
  GRASS_RIVER_BUFFER,
  GRASS_PATCH_RADIUS_MIN,
  GRASS_PATCH_RADIUS_MAX,
  GRASS_PATCH_GAP_ACCEPTANCE,
} from './vegetationConfig.js';

const RIVER_BUFFER = GRASS_RIVER_BUFFER;
const PATCH_GAP_ACCEPTANCE = GRASS_PATCH_GAP_ACCEPTANCE;
const PATCH_FULL_ACCEPTANCE = 1;
const PATCH_MIN_RADIUS = GRASS_PATCH_RADIUS_MIN;
const PATCH_MAX_RADIUS = GRASS_PATCH_RADIUS_MAX;
const HALF_MAP_SIZE = MAP_SIZE / 2;

const patchCellCache = new Map();

export class GrassZone {
  constructor(terrain, variants, minX, minZ, maxX, maxZ) {
    this.terrain = terrain;
    this.variants = variants;
    this.minX = minX;
    this.minZ = minZ;
    this.maxX = maxX;
    this.maxZ = maxZ;

    this.group = new THREE.Group();
    this.group.name = `GrassZone_${minX}_${minZ}`;
    this.group.visible = false;

    this.lod0Group = new THREE.Group();
    this.lod1Group = new THREE.Group();
    this.lod2Group = new THREE.Group();
    this.group.add(this.lod0Group, this.lod1Group, this.lod2Group);

    this.allPlacements = null;
    this._generator = null;
    this.builtForPosition = null;
  }

  get isGenerating() {
    return this._generator !== null;
  }

  get hasPlacements() {
    return this.allPlacements !== null && this.allPlacements.length > 0;
  }

  get centerX() {
    return (this.minX + this.maxX) / 2;
  }

  get centerZ() {
    return (this.minZ + this.maxZ) / 2;
  }

  startGeneration(density) {
    this.clearAll();
    this._generator = createPlacementIterator(
      this.terrain,
      this.minX,
      this.minZ,
      this.maxX,
      this.maxZ,
      density,
    );
  }

  processGeneration(maxSteps) {
    if (!this._generator) return true;

    const done = this._generator.step(maxSteps);

    if (done) {
      this.allPlacements = this._generator.getPlacements();
      this._generator = null;
    }

    return done;
  }

  rebuildLOD(playerX, playerZ, lodDistances) {
    if (!this.hasPlacements) return;

    const lod0 = [];
    const lod1 = [];
    const lod2 = [];

    for (let i = 0; i < this.allPlacements.length; i += 1) {
      const p = this.allPlacements[i];
      const el = p.matrix.elements;
      const dx = el[12] - playerX;
      const dz = el[14] - playerZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= lodDistances[0]) {
        lod0.push(p);
      }

      if (dist <= lodDistances[1] && shouldKeepForLOD(el[12], el[14], 1)) {
        lod1.push(p);
      }

      if (dist <= lodDistances[2] && shouldKeepForLOD(el[12], el[14], 2)) {
        lod2.push(p);
      }
    }

    this.clearGroup(this.lod0Group);
    this.clearGroup(this.lod1Group);
    this.clearGroup(this.lod2Group);

    if (lod0.length > 0) {
      buildInstancedMeshes(lod0, this.variants, this.lod0Group, 0);
    }

    if (lod1.length > 0) {
      buildInstancedMeshes(lod1, this.variants, this.lod1Group, 1);
    }

    if (lod2.length > 0) {
      buildInstancedMeshes(lod2, this.variants, this.lod2Group, 2);
    }

    this.group.visible = true;
    this.builtForPosition = { x: playerX, z: playerZ };
  }

  clearGroup(group) {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
  }

  clearAll() {
    this.clearGroup(this.lod0Group);
    this.clearGroup(this.lod1Group);
    this.clearGroup(this.lod2Group);
    this.allPlacements = null;
    this.group.visible = false;
    this.builtForPosition = null;
  }

  dispose() {
    this.clearAll();
    this._generator = null;

    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}

function shouldKeepForLOD(x, z, lodLevel) {
  const quantize = 10;
  const gx = Math.floor(x * quantize);
  const gz = Math.floor(z * quantize);
  const divisor = lodLevel === 1 ? 4 : 16;

  return hash2(gx + lodLevel * 997, gz + lodLevel * 2003) < (1 / divisor);
}

function createPlacementIterator(terrain, minX, minZ, maxX, maxZ, density) {
  const cellSize = Math.sqrt(1 / density);
  const startZ = minZ - cellSize * 0.5;
  const endZ = maxZ + cellSize * 0.5;
  const startX = minX - cellSize * 0.5;
  const endX = maxX + cellSize * 0.5;

  let worldZ = startZ;
  let worldX = startX;
  const placements = [];

  return {
    getPlacements() {
      return placements;
    },
    step(count) {
      let done = 0;

      while (done < count && worldZ <= endZ) {
        while (done < count && worldX <= endX) {
          const gridX = Math.round(worldX / cellSize);
          const gridZ = Math.round(worldZ / cellSize);

          const jitterX = (hash2(gridX, gridZ) - 0.5) * cellSize;
          const jitterZ = (hash2(gridX + 17.31, gridZ - 9.73) - 0.5) * cellSize;
          const x = worldX + jitterX;
          const z = worldZ + jitterZ;

          if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
            const patches = getPatchesForPoint(x, z);

            if (shouldPlaceInPatch(x, z, gridX, gridZ, patches)) {
              if (isGrassArea(terrain, x, z)) {
                if (!isInRiverGrassExclusion(x, z, RIVER_BUFFER)) {
                  const clustered = getClusteredOffset(x, z, gridX, gridZ, patches);
                  placements.push(createPlacement(terrain, clustered.x, clustered.z, gridX, gridZ));
                }
              }
            }
          }

          worldX += cellSize;
          done += 1;
        }

        if (worldX > endX) {
          worldX = startX;
          worldZ += cellSize;
        }
      }

      return worldZ > endZ;
    },
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
        const cMinX = (gridX + dx) * ZONE_SIZE - HALF_MAP_SIZE;
        const cMinZ = (gridZ + dz) * ZONE_SIZE - HALF_MAP_SIZE;
        patchCellCache.set(key, createPatchCell(cMinX, cMinZ, ZONE_SIZE));
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
    const radius = THREE.MathUtils.lerp(PATCH_MIN_RADIUS, PATCH_MAX_RADIUS, hash2(minX + i * 31.6, minZ + i * -18.9));

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
