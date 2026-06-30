import * as THREE from 'three';
import { GrassZone } from './grassZone.js';
import { ZONE_SIZE, LOD_DISTANCES, LOD_DENSITIES, updateGrassClumps } from './grassClumps.js';

const HALF_MAP_SIZE = 2048 / 2;
const ZONE_MUTATIONS_PER_FRAME = 4;
const GENERATION_STEPS = 2000;
const TOTAL_GENERATION_BUDGET = 8000;
const ZONE_REBUILDS_PER_FRAME = 6;
const REBUILD_THRESHOLD = 5;
const KEEP_ALIVE_PADDING = ZONE_SIZE;

export class GrassManager {
  constructor(terrain, variants) {
    this.terrain = terrain;
    this.variants = variants;
    this.group = new THREE.Group();
    this.group.name = 'GrassManager';
    this.zones = new Map();
    this.lastRebuildPos = null;
  }

  update(cameraPosition, elapsedTime) {
    updateGrassClumps(this.group, elapsedTime);

    const camX = cameraPosition.x;
    const camZ = cameraPosition.z;

    const maxViewDistance = LOD_DISTANCES[LOD_DISTANCES.length - 1];
    const centerChunkX = Math.floor((camX + HALF_MAP_SIZE) / ZONE_SIZE);
    const centerChunkZ = Math.floor((camZ + HALF_MAP_SIZE) / ZONE_SIZE);
    const chunkRadius = Math.ceil((maxViewDistance + KEEP_ALIVE_PADDING) / ZONE_SIZE);

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
        const distToCamera = Math.sqrt(
          (centerX - camX) ** 2 + (centerZ - camZ) ** 2,
        );

        if (distToCamera > maxViewDistance + KEEP_ALIVE_PADDING) continue;

        neededKeys.add(`${minX},${minZ}`);
      }
    }

    const mutations = [];

    for (const key of neededKeys) {
      if (!this.zones.has(key)) {
        mutations.push({ type: 'new', key, priority: 0 });
      }
    }

    for (const [key, zone] of this.zones) {
      if (!neededKeys.has(key)) {
        mutations.push({ type: 'remove', key, zone, priority: 100 });
      }
    }

    mutations.sort((a, b) => a.priority - b.priority);

    let mutationsDone = 0;

    for (const mutation of mutations) {
      if (mutationsDone >= ZONE_MUTATIONS_PER_FRAME) break;

      switch (mutation.type) {
        case 'new': {
          const [minXStr, minZStr] = mutation.key.split(',').map(Number);
          const zone = new GrassZone(
            this.terrain,
            this.variants,
            minXStr,
            minZStr,
            minXStr + ZONE_SIZE,
            minZStr + ZONE_SIZE,
          );

          this.group.add(zone.group);
          this.zones.set(mutation.key, zone);
          zone.startGeneration(LOD_DENSITIES[0]);
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

    const needsRebuild = !this.lastRebuildPos
      || Math.hypot(camX - this.lastRebuildPos.x, camZ - this.lastRebuildPos.z) > REBUILD_THRESHOLD;

    if (needsRebuild) {
      this.rebuildLODForZones(camX, camZ);
      this.lastRebuildPos = { x: camX, z: camZ };
    }
  }

  processGenerations() {
    const generatingZones = [];

    for (const zone of this.zones.values()) {
      if (!zone.isGenerating) continue;
      generatingZones.push(zone);
    }

    let budgetRemaining = TOTAL_GENERATION_BUDGET;

    for (const zone of generatingZones) {
      if (budgetRemaining <= 0) break;
      zone.processGeneration(Math.min(GENERATION_STEPS, budgetRemaining));
      budgetRemaining -= GENERATION_STEPS;
    }
  }

  rebuildLODForZones(camX, camZ) {
    const readyZones = [];

    for (const zone of this.zones.values()) {
      if (!zone.hasPlacements || zone.isGenerating) continue;
      readyZones.push(zone);
    }

    readyZones.sort((a, b) => {
      const da = Math.hypot(a.centerX - camX, a.centerZ - camZ);
      const db = Math.hypot(b.centerX - camX, b.centerZ - camZ);

      return da - db;
    });

    let count = 0;

    for (const zone of readyZones) {
      if (count >= ZONE_REBUILDS_PER_FRAME) break;
      zone.rebuildLOD(camX, camZ, LOD_DISTANCES);
      count += 1;
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
