import * as THREE from 'three';
import {
  hash2,
  createPlacement,
  sampleTerrainSurface,
} from './grassClumps.js';
import { isInRiverGrassExclusion } from './riverChannel.js';
import { isInWaterSystemVegetationExclusion } from './waterSystem.js';
import { isInSmallLakeExclusion } from './smallLakes.js';

const GRASS_WATER_BUFFER = 4;
const GRASS_MIN_NORMAL_Y = 0.88;
const GRASS_MIN_GROUND_MASK = 0.35;
const GRASS_BOUNDS_PADDING = 4;

export const GRASS_LOD_CAPACITY_RATIOS = Object.freeze([1, 0.4, 0.1]);

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

    this.lodGroups = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
    this.lodGroups.forEach((lodGroup, index) => {
      lodGroup.name = `GrassZone_${minX}_${minZ}_LOD${index}`;
      this.group.add(lodGroup);
    });
    this.lodMeshes = [new Map(), new Map(), new Map()];

    this.allPlacements = null;
    this._generator = null;
    this._lodJob = null;
    this._persistentInitialization = null;
    this._persistentMeshesReady = false;
    this.builtForPosition = null;
    this.builtForRevision = -1;
    this.isDisposed = false;
  }

  get isGenerating() {
    return this._generator !== null;
  }

  get hasPlacements() {
    return this.allPlacements !== null && this.allPlacements.length > 0;
  }

  get hasLODJob() {
    return this._lodJob !== null;
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

  initializePersistentMeshes(maxVariants = Infinity) {
    if (!this.hasPlacements) return false;
    if (this._persistentMeshesReady) return true;

    if (!this._persistentInitialization) {
      const placementsByVariant = new Map();

      for (const variantName of this.variants.keys()) {
        placementsByVariant.set(variantName, []);
      }

      for (const placement of this.allPlacements) {
        placementsByVariant.get(placement.variantName)?.push(placement);
      }

      this._persistentInitialization = {
        cursor: 0,
        variants: [...this.variants.entries()],
        placementsByVariant,
        bounds: createZoneBounds(this.allPlacements, this.minX, this.minZ, this.maxX, this.maxZ),
      };
    }

    const state = this._persistentInitialization;
    const end = Math.min(state.cursor + maxVariants, state.variants.length);

    for (; state.cursor < end; state.cursor += 1) {
      const [variantName, variant] = state.variants[state.cursor];
      const variantPlacements = state.placementsByVariant.get(variantName) ?? [];

      this.lodMeshes.forEach((lodMeshes, lodLevel) => {
        const capacity = countCapacity(variantPlacements, GRASS_LOD_CAPACITY_RATIOS[lodLevel]);

        if (capacity === 0) return;

        const leaves = variant.lods[Math.min(lodLevel, variant.lods.length - 1)];
        const meshes = leaves.map((leaf) => {
          const mesh = new THREE.InstancedMesh(leaf.geometry, leaf.material, capacity);

          mesh.name = `${variantName}_${leaf.name}_LOD${lodLevel}_PersistentInstances`;
          mesh.castShadow = false;
          mesh.receiveShadow = lodLevel === 0;
          mesh.count = 0;
          mesh.visible = false;
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          mesh.boundingBox = state.bounds.box.clone();
          mesh.boundingSphere = state.bounds.sphere.clone();
          this.lodGroups[lodLevel].add(mesh);

          return mesh;
        });

        lodMeshes.set(variantName, {
          capacity,
          meshes,
          staging: new Float32Array(capacity * 16),
        });
      });
    }

    if (state.cursor < state.variants.length) return false;

    this._persistentInitialization = null;
    this._persistentMeshesReady = true;
    return true;
  }

  startLODJob(playerX, playerZ, lodDistances, keepRatios, revision) {
    if (!this.hasPlacements || this.isDisposed || this._lodJob) return false;

    if (!this.initializePersistentMeshes(1)) return false;

    const counts = this.lodMeshes.map((lodMeshes) => new Map(
      Array.from(lodMeshes.keys(), (variantName) => [variantName, 0]),
    ));

    this._lodJob = {
      cursor: 0,
      playerX,
      playerZ,
      distanceSquares: lodDistances.map((distance) => distance * distance),
      keepRatios: keepRatios.slice(),
      revision,
      counts,
    };

    return true;
  }

  processLODJob(maxPlacements) {
    if (!this._lodJob) return true;

    const job = this._lodJob;
    const end = Math.min(job.cursor + maxPlacements, this.allPlacements.length);

    for (let i = job.cursor; i < end; i += 1) {
      const placement = this.allPlacements[i];
      const elements = placement.matrix.elements;
      const dx = elements[12] - job.playerX;
      const dz = elements[14] - job.playerZ;
      const distanceSq = dx * dx + dz * dz;
      const lodLevel = getLODLevel(distanceSq, job.distanceSquares);

      if (lodLevel < 0 || getPlacementLODRoll(placement) >= job.keepRatios[lodLevel]) continue;

      const bucket = this.lodMeshes[lodLevel].get(placement.variantName);

      if (!bucket) continue;

      const index = job.counts[lodLevel].get(placement.variantName);

      if (index >= bucket.capacity) continue;

      bucket.staging.set(elements, index * 16);
      job.counts[lodLevel].set(placement.variantName, index + 1);
    }

    job.cursor = end;

    if (job.cursor < this.allPlacements.length) return false;

    this.commitLODJob(job);
    return true;
  }

  commitLODJob(job) {
    let hasVisibleMeshes = false;

    this.lodMeshes.forEach((lodMeshes, lodLevel) => {
      for (const [variantName, bucket] of lodMeshes) {
        const count = job.counts[lodLevel].get(variantName) ?? 0;
        const matrixValues = bucket.staging.subarray(0, count * 16);

        for (const mesh of bucket.meshes) {
          if (count > 0) {
            mesh.instanceMatrix.array.set(matrixValues, 0);
            mesh.instanceMatrix.clearUpdateRanges();
            mesh.instanceMatrix.addUpdateRange(0, count * 16);
            mesh.instanceMatrix.needsUpdate = true;
          }

          mesh.count = count;
          mesh.visible = count > 0;
        }

        hasVisibleMeshes ||= count > 0;
      }
    });

    this.group.visible = hasVisibleMeshes;
    this.builtForPosition = { x: job.playerX, z: job.playerZ };
    this.builtForRevision = job.revision;
    this._lodJob = null;
  }

  clearGroup(group) {
    while (group.children.length > 0) {
      const child = group.children[0];

      group.remove(child);
      child.dispose?.();
    }
  }

  clearAll() {
    this.lodGroups.forEach((lodGroup) => this.clearGroup(lodGroup));
    this.lodMeshes = [new Map(), new Map(), new Map()];
    this._persistentInitialization = null;
    this._persistentMeshesReady = false;
    this.allPlacements = null;
    this._lodJob = null;
    this.group.visible = false;
    this.builtForPosition = null;
    this.builtForRevision = -1;
  }

  dispose() {
    if (this.isDisposed) return;

    this.isDisposed = true;
    this.clearAll();
    this._generator = null;

    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}

function countCapacity(placements, keepRatio) {
  if (keepRatio >= 1) return placements.length;

  let count = 0;

  for (const placement of placements) {
    if (getPlacementLODRoll(placement) < keepRatio) count += 1;
  }

  return count;
}

function getPlacementLODRoll(placement) {
  if (Number.isFinite(placement.lodRoll)) return placement.lodRoll;

  const elements = placement.matrix.elements;
  placement.lodRoll = hash2(elements[12] * 0.73, elements[14] * 0.61);

  return placement.lodRoll;
}

function getLODLevel(distanceSq, distanceSquares) {
  if (distanceSq <= distanceSquares[0]) return 0;
  if (distanceSq <= distanceSquares[1]) return 1;
  if (distanceSq <= distanceSquares[2]) return 2;

  return -1;
}

function createZoneBounds(placements, minX, minZ, maxX, maxZ) {
  let minY = Infinity;
  let maxY = -Infinity;

  for (const placement of placements) {
    const y = placement.matrix.elements[13];

    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const box = new THREE.Box3(
    new THREE.Vector3(minX - GRASS_BOUNDS_PADDING, minY - GRASS_BOUNDS_PADDING, minZ - GRASS_BOUNDS_PADDING),
    new THREE.Vector3(maxX + GRASS_BOUNDS_PADDING, maxY + GRASS_BOUNDS_PADDING, maxZ + GRASS_BOUNDS_PADDING),
  );

  return {
    box,
    sphere: box.getBoundingSphere(new THREE.Sphere()),
  };
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
  const surface = {};

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
            sampleTerrainSurface(terrain, x, z, surface);
          }

          if (x >= minX && x <= maxX && z >= minZ && z <= maxZ && shouldPlaceGrassAt(x, z, surface)) {
            placements.push(createPlacement(terrain, x, z, gridX, gridZ, 1, surface));
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

function shouldPlaceGrassAt(x, z, surface) {
  if (isInRiverGrassExclusion(x, z, GRASS_WATER_BUFFER)) return false;
  if (isInWaterSystemVegetationExclusion(x, z, GRASS_WATER_BUFFER)) return false;
  if (isInSmallLakeExclusion(x, z)) return false;

  return surface.normalY >= GRASS_MIN_NORMAL_Y
    && surface.groundMask >= GRASS_MIN_GROUND_MASK;
}
