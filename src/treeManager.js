import * as THREE from 'three';
import { buildLeafDecals } from './leafDecals.js';
import {
  buildTreeInstancedMeshes,
  createTreePlacementIterator,
  replaceSpawnAreaTrees,
  updateTreeSwayUniforms,
} from './treePlacements.js';
import { PLAYER_SPAWN_POSITION } from './spawn.js';

const GENERATION_BATCH_SIZE = 64;
const DEFAULT_UPDATE_BUDGET_MS = 1;
const DEFAULT_TREE_DISTANCE = 380;

export class TreeManager {
  constructor(terrain, treeModels, leafTextures) {
    this.terrain = terrain;
    this.treeModels = treeModels;
    this.leafTextures = leafTextures;
    this.group = new THREE.Group();
    this.group.name = 'Trees';
    this.zones = new Map();
    this.updateBudgetMs = DEFAULT_UPDATE_BUDGET_MS;
    this.treeDistance = DEFAULT_TREE_DISTANCE;
    this.shadowNeedsUpdate = true;
    this.generationCursor = 0;
  }

  update(cameraPosition, elapsedTime = 0) {
    updateTreeSwayUniforms(this.treeModels, cameraPosition, elapsedTime);

    const loadedChunks = this.terrain.getLoadedChunkBounds();
    const neededKeys = new Set(loadedChunks.map((chunk) => chunk.key));

    for (const [key, zone] of this.zones) {
      if (neededKeys.has(key)) continue;

      zone.dispose();
      this.zones.delete(key);
      this.shadowNeedsUpdate = true;
    }

    for (const chunk of loadedChunks) {
      if (this.zones.has(chunk.key)) continue;

      const zone = new TreeZone(this.terrain, this.treeModels, this.leafTextures, chunk);
      this.zones.set(chunk.key, zone);
      this.group.add(zone.group);
      this.shadowNeedsUpdate = true;
    }

    this.updateZoneVisibility(cameraPosition);
    this.processGenerations(cameraPosition);

    return this.consumeShadowUpdate();
  }

  setQualityPreset(treePreset = {}) {
    if (treePreset.trees || treePreset.vegetation) {
      const vegetationPreset = treePreset.vegetation ?? {};
      treePreset = treePreset.trees ?? {};
      this.treeDistance = vegetationPreset.treeDistance ?? this.treeDistance;
    }

    this.updateBudgetMs = treePreset.updateBudgetMs ?? this.updateBudgetMs;
    this.shadowNeedsUpdate = true;
  }

  updateZoneVisibility(cameraPosition) {
    for (const zone of this.zones.values()) {
      const visible = distanceToChunkBounds(cameraPosition, zone.chunk) <= this.treeDistance;

      if (zone.group.visible === visible) continue;

      zone.group.visible = visible;
      this.shadowNeedsUpdate = true;
    }
  }

  consumeShadowUpdate() {
    const needsUpdate = this.shadowNeedsUpdate;

    this.shadowNeedsUpdate = false;
    return needsUpdate;
  }

  processGenerations(cameraPosition) {
    const generatingZones = [];

    for (const zone of this.zones.values()) {
      if (!zone.isGenerating || !zone.group.visible) continue;
      generatingZones.push(zone);
    }

    generatingZones.sort((a, b) => {
      const da = Math.hypot(a.centerX - cameraPosition.x, a.centerZ - cameraPosition.z);
      const db = Math.hypot(b.centerX - cameraPosition.x, b.centerZ - cameraPosition.z);

      return da - db;
    });

    if (generatingZones.length === 0) {
      this.generationCursor = 0;
      return;
    }

    const deadline = performance.now() + this.updateBudgetMs;
    let processed = 0;

    while (processed < generatingZones.length && performance.now() < deadline) {
      const index = (this.generationCursor + processed) % generatingZones.length;
      const zone = generatingZones[index];
      const wasGenerating = zone.isGenerating;

      zone.processGeneration(GENERATION_BATCH_SIZE);
      if (wasGenerating && !zone.isGenerating) {
        this.shadowNeedsUpdate = true;
      }
      processed += 1;
    }

    this.generationCursor = (this.generationCursor + Math.max(processed, 1)) % generatingZones.length;
  }
}

export class TreeZone {
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
    this.isDisposed = false;
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
    if (this.isDisposed) return;
    this.isDisposed = true;

    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }

    if (this.leafGroup) {
      this.leafGroup.traverse((child) => {
        if (!child.isMesh) return;
        child.dispose?.();
        child.geometry.dispose();
        child.material.dispose();
      });
    }

    this.group.traverse((child) => {
      if (!child.isInstancedMesh || this.leafGroup?.getObjectById(child.id)) return;
      child.dispose();
    });

    this.group.clear();
    this.iterator = null;
    this.isGenerating = false;
  }
}

export function distanceToChunkBounds(position, chunk) {
  const dx = Math.max(chunk.minX - position.x, 0, position.x - chunk.maxX);
  const dz = Math.max(chunk.minZ - position.z, 0, position.z - chunk.maxZ);

  return Math.hypot(dx, dz);
}
