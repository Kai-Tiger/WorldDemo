import * as THREE from 'three';
import { GrassZone, GRASS_LOD_CAPACITY_RATIOS } from './grassZone.js';
import { ZONE_SIZE, LOD_DENSITIES, updateGrassClumps } from './grassClumps.js';
import {
  MAP_SIZE,
  KEEP_ALIVE_PADDING,
  GRASS_ZONE_MUTATIONS,
  GRASS_GENERATION_STEPS,
  GRASS_GENERATION_BUDGET,
  GRASS_REBUILDS_PER_FRAME,
  GRASS_REBUILD_THRESHOLD,
} from './vegetationConfig.js';

const HALF_MAP_SIZE = MAP_SIZE / 2;
const ZONE_MUTATIONS_PER_FRAME = GRASS_ZONE_MUTATIONS;
const GENERATION_STEPS = Math.min(GRASS_GENERATION_STEPS, 256);
const TOTAL_GENERATION_BUDGET = GRASS_GENERATION_BUDGET;
const ZONE_REBUILDS_PER_FRAME = GRASS_REBUILDS_PER_FRAME;
const REBUILD_THRESHOLD = GRASS_REBUILD_THRESHOLD;
const LOD_JOB_STEPS = 256;

export const DEFAULT_GRASS_PRESET = Object.freeze({
  lodDistances: Object.freeze([20, 50, 120]),
  keepRatios: Object.freeze([1, 0.25, 0.05]),
  updateBudgetMs: 1,
});

export class GrassManager {
  constructor(terrain, variants, preset = DEFAULT_GRASS_PRESET) {
    this.terrain = terrain;
    this.variants = variants;
    this.group = new THREE.Group();
    this.group.name = 'GrassManager';
    this.zones = new Map();
    this.grassPreset = normalizeGrassPreset(preset);
    this.presetRevision = 0;
    this.lodQueue = [];
    this.queuedZones = new Set();
    this.lodTarget = null;
    this.lastQueuePos = null;
    this.streamingTurn = 0;
  }

  update(cameraPosition, elapsedTime) {
    updateGrassClumps(this.variants, cameraPosition, elapsedTime);

    const camX = cameraPosition.x;
    const camZ = cameraPosition.z;
    this.lodTarget = { x: camX, z: camZ };

    const maxViewDistance = this.grassPreset.lodDistances[2];
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
        const [minXStr, minZStr] = key.split(',').map(Number);
        const centerX = minXStr + ZONE_SIZE / 2;
        const centerZ = minZStr + ZONE_SIZE / 2;

        mutations.push({
          type: 'new',
          key,
          priority: Math.hypot(centerX - camX, centerZ - camZ),
        });
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
          this.removeFromLODQueue(mutation.zone);
          mutation.zone.dispose();
          this.zones.delete(mutation.key);
          break;
        }
      }

      mutationsDone += 1;
    }

    const needsQueueRefresh = !this.lastQueuePos
      || Math.hypot(camX - this.lastQueuePos.x, camZ - this.lastQueuePos.z) > REBUILD_THRESHOLD;

    if (needsQueueRefresh) {
      this.enqueueReadyZones();
      this.lastQueuePos = { x: camX, z: camZ };
    }

    this.processStreamingWork(camX, camZ);
  }

  setQualityPreset(preset) {
    const nextPreset = normalizeGrassPreset(preset?.grass ?? preset);

    if (presetsEqual(this.grassPreset, nextPreset)) return;

    this.grassPreset = nextPreset;
    this.presetRevision += 1;
    this.enqueueReadyZones();
  }

  processStreamingWork(camX, camZ) {
    const deadline = performance.now() + this.grassPreset.updateBudgetMs;

    if (this.streamingTurn === 0) {
      this.processGenerations(camX, camZ, deadline);
      if (performance.now() < deadline) {
        this.processLODQueue(
          ZONE_REBUILDS_PER_FRAME,
          LOD_JOB_STEPS,
          deadline - performance.now(),
        );
      }
    } else {
      this.processLODQueue(
        ZONE_REBUILDS_PER_FRAME,
        LOD_JOB_STEPS,
        this.grassPreset.updateBudgetMs,
      );
      if (performance.now() < deadline) {
        this.processGenerations(camX, camZ, deadline);
      }
    }

    this.streamingTurn = (this.streamingTurn + 1) % 2;
  }

  processGenerations(camX, camZ, deadline = Infinity) {
    const generatingZones = [];

    for (const zone of this.zones.values()) {
      if (!zone.isGenerating) continue;
      generatingZones.push(zone);
    }

    generatingZones.sort((a, b) => (
      Math.hypot(a.centerX - camX, a.centerZ - camZ)
      - Math.hypot(b.centerX - camX, b.centerZ - camZ)
    ));

    let stepsRemaining = TOTAL_GENERATION_BUDGET;
    let batches = 0;

    while (
      generatingZones.length > 0
      && stepsRemaining > 0
      && (batches === 0 || performance.now() < deadline)
    ) {
      const zone = generatingZones[0];
      const steps = Math.min(GENERATION_STEPS, stepsRemaining);
      const done = zone.processGeneration(steps);

      if (done && zone.hasPlacements) {
        this.enqueueLODZone(zone);
      }
      if (done) generatingZones.shift();

      stepsRemaining -= steps;
      batches += 1;
    }
  }

  enqueueReadyZones() {
    for (const zone of this.zones.values()) {
      if (!zone.hasPlacements || zone.isGenerating) continue;
      this.enqueueLODZone(zone);
    }
  }

  enqueueLODZone(zone) {
    if (zone.isDisposed || this.queuedZones.has(zone)) return false;

    this.queuedZones.add(zone);
    this.lodQueue.push(zone);
    return true;
  }

  removeFromLODQueue(zone) {
    if (!this.queuedZones.delete(zone)) return;

    this.lodQueue = this.lodQueue.filter((queuedZone) => queuedZone !== zone);
  }

  processLODQueue(
    maxChunks = ZONE_REBUILDS_PER_FRAME,
    placementSteps = LOD_JOB_STEPS,
    budgetMs = this.grassPreset.updateBudgetMs,
  ) {
    if (!this.lodTarget || this.lodQueue.length === 0) return;

    const queueLengthAtStart = this.lodQueue.length;
    const startTime = performance.now();
    let chunksProcessed = 0;

    for (let attempt = 0; attempt < queueLengthAtStart; attempt += 1) {
      if (chunksProcessed >= maxChunks) break;
      if (chunksProcessed > 0 && performance.now() - startTime >= budgetMs) break;

      const zone = this.lodQueue.shift();

      if (!zone || zone.isDisposed || !zone.hasPlacements || zone.isGenerating) {
        this.queuedZones.delete(zone);
        continue;
      }

      if (!zone.hasLODJob) {
        const started = zone.startLODJob(
          this.lodTarget.x,
          this.lodTarget.z,
          this.grassPreset.lodDistances,
          this.grassPreset.keepRatios,
          this.presetRevision,
        );

        if (!started) {
          this.lodQueue.push(zone);
          chunksProcessed += 1;
          continue;
        }
      }

      const done = zone.processLODJob(placementSteps);

      if (done) {
        this.queuedZones.delete(zone);

        if (this.isZoneStale(zone)) {
          this.enqueueLODZone(zone);
        }
      } else {
        this.lodQueue.push(zone);
      }

      chunksProcessed += 1;
    }
  }

  isZoneStale(zone) {
    if (!zone.builtForPosition || zone.builtForRevision !== this.presetRevision) return true;

    return Math.hypot(
      this.lodTarget.x - zone.builtForPosition.x,
      this.lodTarget.z - zone.builtForPosition.z,
    ) > REBUILD_THRESHOLD;
  }

  dispose() {
    for (const zone of this.zones.values()) {
      zone.dispose();
    }

    this.zones.clear();
    this.lodQueue.length = 0;
    this.queuedZones.clear();

    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}

export function normalizeGrassPreset(preset = DEFAULT_GRASS_PRESET) {
  const source = preset?.grass ?? preset ?? DEFAULT_GRASS_PRESET;
  const lodDistances = normalizeArray(
    source.lodDistances,
    DEFAULT_GRASS_PRESET.lodDistances,
    (value, index, values) => value > 0 && (index === 0 || value > values[index - 1]),
  );
  const keepRatios = normalizeArray(
    source.keepRatios,
    DEFAULT_GRASS_PRESET.keepRatios,
    (value, index) => value >= 0 && value <= GRASS_LOD_CAPACITY_RATIOS[index],
  );
  const updateBudgetMs = Number.isFinite(source.updateBudgetMs) && source.updateBudgetMs > 0
    ? source.updateBudgetMs
    : DEFAULT_GRASS_PRESET.updateBudgetMs;

  return { lodDistances, keepRatios, updateBudgetMs };
}

function normalizeArray(values, fallback, isValid) {
  if (!Array.isArray(values) || values.length !== fallback.length) return [...fallback];

  const normalized = values.map(Number);

  return normalized.every((value, index) => Number.isFinite(value) && isValid(value, index, normalized))
    ? normalized
    : [...fallback];
}

function presetsEqual(a, b) {
  return a.updateBudgetMs === b.updateBudgetMs
    && a.lodDistances.every((value, index) => value === b.lodDistances[index])
    && a.keepRatios.every((value, index) => value === b.keepRatios[index]);
}
