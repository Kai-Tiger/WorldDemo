import * as THREE from 'three';
import {
  generatePlacementsInRect,
  buildInstancedMeshes,
  hash2,
  smoothstep,
  isGrassArea,
  createPlacement,
} from './grassClumps.js';
import { isInRiverGrassExclusion } from './riverChannel.js';

const RIVER_BUFFER = 2;
const PATCH_GAP_ACCEPTANCE = 0.75;
const PATCH_FULL_ACCEPTANCE = 1;
const PATCH_MIN_RADIUS = 1.5;
const PATCH_MAX_RADIUS = 4.0;
const ZONE_SIZE = 64;
const HALF_MAP_SIZE = 2048 / 2;

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
    this.currentLOD = -1;
    this._generator = null;
    this._targetLOD = -1;
  }

  get isGenerating() {
    return this._generator !== null;
  }

  get centerX() {
    return (this.minX + this.maxX) / 2;
  }

  get centerZ() {
    return (this.minZ + this.maxZ) / 2;
  }

  setLOD(lodLevel, density) {
    if (this.currentLOD === lodLevel && !this.isGenerating) return;

    this.clearInstances();
    this._generator = null;
    this._targetLOD = -1;

    if (lodLevel < 0 || density <= 0) {
      this.group.visible = false;
      this.currentLOD = -1;
      return;
    }

    const generator = createPlacementIterator(
      this.terrain,
      this.minX,
      this.minZ,
      this.maxX,
      this.maxZ,
      density,
    );

    if (!generator) {
      this.currentLOD = lodLevel;
      return;
    }

    this._generator = generator;
    this._targetLOD = lodLevel;
    this.currentLOD = -1;
    this.group.visible = false;
  }

  processGeneration(maxSteps) {
    if (!this._generator) return true;
    if (this.currentLOD === this._targetLOD) return true;

    const done = this._generator.step(maxSteps);

    if (done) {
      const placements = this._generator.getPlacements();

      if (placements.length > 0) {
        buildInstancedMeshes(placements, this.variants, this.group);
      }

      this.group.visible = placements.length > 0;
      this.currentLOD = this._targetLOD;
      this._generator = null;

      return true;
    }

    return false;
  }

  clearInstances() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
  }

  dispose() {
    this.clearInstances();
    this._generator = null;

    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
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
