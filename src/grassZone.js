import * as THREE from 'three';
import {
  buildInstancedMeshes,
  hash2,
  createPlacement,
} from './grassClumps.js';
import { isInRiverGrassExclusion } from './riverChannel.js';
import { isInWaterSystemVegetationExclusion } from './waterSystem.js';
import { isInSmallLakeExclusion } from './smallLakes.js';

const GRASS_WATER_BUFFER = 4;
const GRASS_MIN_NORMAL_Y = 0.88;
const GRASS_MIN_GROUND_MASK = 0.35;
const LOD1_KEEP_RATIO = 0.5;
const LOD2_KEEP_RATIO = 0.16;

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

    const lodPlacements = [[], [], []];
    const nearDistance = lodDistances[0];
    const midDistance = lodDistances[1];
    const farDistance = lodDistances[2];

    for (let i = 0; i < this.allPlacements.length; i += 1) {
      const p = this.allPlacements[i];
      const el = p.matrix.elements;
      const dx = el[12] - playerX;
      const dz = el[14] - playerZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= nearDistance) {
        lodPlacements[0].push(p);
      } else if (dist <= midDistance) {
        if (shouldKeepForLOD(p, 1)) lodPlacements[1].push(p);
      } else if (dist <= farDistance) {
        if (shouldKeepForLOD(p, 2)) lodPlacements[2].push(p);
      }
    }

    this.lodGroups.forEach((lodGroup) => this.clearGroup(lodGroup));

    lodPlacements.forEach((placements, lodLevel) => {
      if (placements.length > 0) {
        buildInstancedMeshes(placements, this.variants, this.lodGroups[lodLevel], lodLevel);
      }
    });

    this.group.visible = true;
    this.builtForPosition = { x: playerX, z: playerZ };
  }

  clearGroup(group) {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
  }

  clearAll() {
    this.lodGroups.forEach((lodGroup) => this.clearGroup(lodGroup));
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

          if (x >= minX && x <= maxX && z >= minZ && z <= maxZ && shouldPlaceGrassAt(terrain, x, z)) {
            placements.push(createPlacement(terrain, x, z, gridX, gridZ, 1));
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

function shouldPlaceGrassAt(terrain, x, z) {
  if (isInRiverGrassExclusion(x, z, GRASS_WATER_BUFFER)) return false;
  if (isInWaterSystemVegetationExclusion(x, z, GRASS_WATER_BUFFER)) return false;
  if (isInSmallLakeExclusion(x, z)) return false;

  const normal = terrain.getNormalAt(x, z);

  return normal.y >= GRASS_MIN_NORMAL_Y
    && terrain.getTerrainGroundMask(x, z) >= GRASS_MIN_GROUND_MASK;
}

function shouldKeepForLOD(placement, lodLevel) {
  const el = placement.matrix.elements;
  const keepRatio = lodLevel === 1 ? LOD1_KEEP_RATIO : LOD2_KEEP_RATIO;
  const roll = hash2(el[12] * 0.73 + lodLevel * 19.1, el[14] * 0.61 - lodLevel * 7.4);

  return roll < keepRatio;
}
