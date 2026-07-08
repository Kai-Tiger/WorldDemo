import * as THREE from 'three';
import {
  buildInstancedMeshes,
  hash2,
  createPlacement,
} from './grassClumps.js';

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

    this.grassGroup = new THREE.Group();
    this.group.add(this.grassGroup);

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

    const visibleGrass = [];
    const maxDistance = lodDistances[lodDistances.length - 1];

    for (let i = 0; i < this.allPlacements.length; i += 1) {
      const p = this.allPlacements[i];
      const el = p.matrix.elements;
      const dx = el[12] - playerX;
      const dz = el[14] - playerZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= maxDistance) {
        visibleGrass.push(p);
      }
    }

    this.clearGroup(this.grassGroup);

    if (visibleGrass.length > 0) {
      buildInstancedMeshes(visibleGrass, this.variants, this.grassGroup, 0);
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
    this.clearGroup(this.grassGroup);
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

          if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
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
