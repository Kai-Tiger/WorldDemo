import * as THREE from 'three';
import { GrassZone } from './grassZone.js';
import { ZONE_SIZE, LOD_DISTANCES, LOD_DENSITIES, updateGrassClumps } from './grassClumps.js';

const HALF_MAP_SIZE = 2048 / 2;
const ZONE_MUTATIONS_PER_FRAME = 4;
const GENERATION_STEPS_PER_ZONE = 2000;
const TOTAL_GENERATION_BUDGET = 8000;
const KEEP_ALIVE_PADDING = ZONE_SIZE;

export class GrassManager {
  constructor(terrain, variants) {
    this.terrain = terrain;
    this.variants = variants;
    this.group = new THREE.Group();
    this.group.name = 'GrassManager';
    this.zones = new Map();
    this._activeZonesLastFrame = new Set();
  }

  update(cameraPosition, elapsedTime) {
    updateGrassClumps(this.group, elapsedTime);

    const camX = cameraPosition.x;
    const camZ = cameraPosition.z;
    const centerChunkX = Math.floor((camX + HALF_MAP_SIZE) / ZONE_SIZE);
    const centerChunkZ = Math.floor((camZ + HALF_MAP_SIZE) / ZONE_SIZE);
    const maxViewDistance = LOD_DISTANCES[LOD_DISTANCES.length - 1];
    const chunkRadius = Math.ceil((maxViewDistance + KEEP_ALIVE_PADDING) / ZONE_SIZE);

    const neededZones = new Map();

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
        const distToCamera = Math.sqrt(
          (centerX - camX) ** 2 + (centerZ - camZ) ** 2,
        );

        let lodLevel = -1;

        for (let l = 0; l < LOD_DISTANCES.length; l += 1) {
          if (distToCamera <= LOD_DISTANCES[l] + ZONE_SIZE * 0.5) {
            lodLevel = l;
            break;
          }
        }

        if (lodLevel < 0 && distToCamera > maxViewDistance + KEEP_ALIVE_PADDING) continue;

        neededZones.set(`${minX},${minZ}`, { minX, minZ, maxX, maxZ, lodLevel });
      }
    }

    const mutations = [];

    for (const [key, info] of neededZones) {
      const zone = this.zones.get(key);

      if (!zone) {
        const priority = info.lodLevel >= 0 ? info.lodLevel : 99;
        mutations.push({ type: 'new', key, info, priority });
      } else {
        const targetLOD = info.lodLevel;
        const currentLOD = zone.isGenerating ? zone._targetLOD : zone.currentLOD;

        if (currentLOD !== targetLOD) {
          const priority = targetLOD >= 0 ? targetLOD : 99;
          mutations.push({ type: 'lod', key, info, zone, priority });
        }
      }
    }

    for (const [key, zone] of this.zones) {
      if (!neededZones.has(key)) {
        mutations.push({ type: 'remove', key, zone, priority: 100 });
      }
    }

    mutations.sort((a, b) => a.priority - b.priority);

    let mutationsDone = 0;

    for (const mutation of mutations) {
      if (mutationsDone >= ZONE_MUTATIONS_PER_FRAME) break;

      switch (mutation.type) {
        case 'new': {
          const zone = new GrassZone(
            this.terrain,
            this.variants,
            mutation.info.minX,
            mutation.info.minZ,
            mutation.info.maxX,
            mutation.info.maxZ,
          );

          this.group.add(zone.group);
          this.zones.set(mutation.key, zone);

          if (mutation.info.lodLevel >= 0) {
            zone.setLOD(mutation.info.lodLevel, LOD_DENSITIES[mutation.info.lodLevel]);
          }

          break;
        }
        case 'lod': {
          if (mutation.info.lodLevel >= 0) {
            mutation.zone.setLOD(mutation.info.lodLevel, LOD_DENSITIES[mutation.info.lodLevel]);
          } else {
            mutation.zone.setLOD(-1, 0);
          }

          break;
        }
        case 'remove': {
          mutation.zone.dispose();
          this.zones.delete(mutation.key);
          break;
        }
      }

      mutationsDone += 1;
    }

    this.processGenerations();
  }

  processGenerations() {
    const generatingZones = [];

    for (const zone of this.zones.values()) {
      if (!zone.isGenerating) continue;
      generatingZones.push(zone);
    }

    generatingZones.sort((a, b) => (a._targetLOD ?? 99) - (b._targetLOD ?? 99));

    let budgetRemaining = TOTAL_GENERATION_BUDGET;

    for (const zone of generatingZones) {
      if (budgetRemaining <= 0) break;
      zone.processGeneration(Math.min(GENERATION_STEPS_PER_ZONE, budgetRemaining));
      budgetRemaining -= GENERATION_STEPS_PER_ZONE;
    }
  }

  dispose() {
    for (const zone of this.zones.values()) {
      zone.dispose();
    }

    this.zones.clear();

    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
