import * as THREE from 'three';
import { TreeZone } from './treeZone.js';
import { TREE_VIEW_DISTANCE, ZONE_SIZE } from './treePlacements.js';

const HALF_MAP_SIZE = 2048 / 2;
const ZONE_MUTATIONS_PER_FRAME = 4;
const GENERATION_STEPS = 100;
const TOTAL_GENERATION_BUDGET = 400;
const ZONE_BUILDS_PER_FRAME = 8;
const KEEP_ALIVE_PADDING = ZONE_SIZE;

export class TreeManager {
  constructor(terrain, treeModels) {
    this.terrain = terrain;
    this.treeModels = treeModels;
    this.group = new THREE.Group();
    this.group.name = 'TreeManager';
    this.zones = new Map();
  }

  update(cameraPosition) {
    const camX = cameraPosition.x;
    const camZ = cameraPosition.z;

    const centerChunkX = Math.floor((camX + HALF_MAP_SIZE) / ZONE_SIZE);
    const centerChunkZ = Math.floor((camZ + HALF_MAP_SIZE) / ZONE_SIZE);
    const chunkRadius = Math.ceil((TREE_VIEW_DISTANCE + KEEP_ALIVE_PADDING) / ZONE_SIZE);

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

        if (distToCamera > TREE_VIEW_DISTANCE + KEEP_ALIVE_PADDING) continue;

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
          const zone = new TreeZone(
            this.terrain,
            this.treeModels,
            minXStr,
            minZStr,
            minXStr + ZONE_SIZE,
            minZStr + ZONE_SIZE,
          );

          this.group.add(zone.group);
          this.zones.set(mutation.key, zone);
          zone.startGeneration();
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
    this.buildReadyZones();
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

  buildReadyZones() {
    const readyZones = [];

    for (const zone of this.zones.values()) {
      if (!zone.isReady) continue;
      readyZones.push(zone);
    }

    let count = 0;

    for (const zone of readyZones) {
      if (count >= ZONE_BUILDS_PER_FRAME) break;
      zone.buildInstances();
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
