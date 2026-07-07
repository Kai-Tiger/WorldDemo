import * as THREE from 'three';
import { buildLeafDecals } from './leafDecals.js';
import {
  buildTreeInstancedMeshes,
  createTreePlacementIterator,
  replaceSpawnAreaTrees,
} from './treePlacements.js';
import { PLAYER_SPAWN_POSITION } from './spawn.js';

const GENERATION_STEPS_PER_ZONE = 3000;
const GENERATION_BUDGET_PER_FRAME = 9000;

export class TreeManager {
  constructor(terrain, treeModels, leafTextures) {
    this.terrain = terrain;
    this.treeModels = treeModels;
    this.leafTextures = leafTextures;
    this.group = new THREE.Group();
    this.group.name = 'Trees';
    this.zones = new Map();
  }

  update(cameraPosition) {
    const loadedChunks = this.terrain.getLoadedChunkBounds();
    const neededKeys = new Set(loadedChunks.map((chunk) => chunk.key));

    for (const [key, zone] of this.zones) {
      if (neededKeys.has(key)) continue;

      zone.dispose();
      this.zones.delete(key);
    }

    for (const chunk of loadedChunks) {
      if (this.zones.has(chunk.key)) continue;

      const zone = new TreeZone(this.terrain, this.treeModels, this.leafTextures, chunk);
      this.zones.set(chunk.key, zone);
      this.group.add(zone.group);
    }

    this.processGenerations(cameraPosition);
  }

  processGenerations(cameraPosition) {
    const generatingZones = [];

    for (const zone of this.zones.values()) {
      if (!zone.isGenerating) continue;
      generatingZones.push(zone);
    }

    generatingZones.sort((a, b) => {
      const da = Math.hypot(a.centerX - cameraPosition.x, a.centerZ - cameraPosition.z);
      const db = Math.hypot(b.centerX - cameraPosition.x, b.centerZ - cameraPosition.z);

      return da - db;
    });

    let budgetRemaining = GENERATION_BUDGET_PER_FRAME;

    for (const zone of generatingZones) {
      if (budgetRemaining <= 0) break;

      const steps = Math.min(GENERATION_STEPS_PER_ZONE, budgetRemaining);
      zone.processGeneration(steps);
      budgetRemaining -= steps;
    }
  }
}

class TreeZone {
  constructor(terrain, treeModels, leafTextures, chunk) {
    this.terrain = terrain;
    this.treeModels = treeModels;
    this.leafTextures = leafTextures;
    this.chunk = chunk;
    this.centerX = (chunk.minX + chunk.maxX) / 2;
    this.centerZ = (chunk.minZ + chunk.maxZ) / 2;
    this.group = new THREE.Group();
    this.group.name = `TreeZone_${chunk.key}`;
    this.iterator = createTreePlacementIterator(
      terrain,
      chunk.minX,
      chunk.minZ,
      chunk.maxX,
      chunk.maxZ,
    );
    this.isGenerating = true;
    this.leafGroup = null;
  }

  processGeneration(steps) {
    if (!this.isGenerating) return;

    const done = this.iterator.step(steps);

    if (!done) return;

    const placements = this.iterator.getPlacements();

    if (this.containsSpawn()) {
      replaceSpawnAreaTrees(placements);
    }

    buildTreeInstancedMeshes(placements, this.treeModels, this.group);
    this.leafGroup = buildLeafDecals(placements, this.terrain, this.leafTextures);
    this.group.add(this.leafGroup);
    this.iterator = null;
    this.isGenerating = false;
  }

  containsSpawn() {
    return PLAYER_SPAWN_POSITION.x >= this.chunk.minX
      && PLAYER_SPAWN_POSITION.x <= this.chunk.maxX
      && PLAYER_SPAWN_POSITION.z >= this.chunk.minZ
      && PLAYER_SPAWN_POSITION.z <= this.chunk.maxZ;
  }

  dispose() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }

    if (this.leafGroup) {
      this.leafGroup.traverse((child) => {
        if (!child.isMesh) return;
        child.geometry.dispose();
        child.material.dispose();
      });
    }

    this.group.clear();
    this.iterator = null;
    this.isGenerating = false;
  }
}
