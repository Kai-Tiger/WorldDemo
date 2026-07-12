import * as THREE from 'three';
import {
  getRiverMaterialFrame,
  RIVER_BED_TEXTURE_PATH,
  RIVER_BED_TEXTURE_WORLD_SIZE,
  RIVER_BANK_TEXTURE_PATH,
  RIVER_BANK_TEXTURE_WORLD_SIZE,
} from './riverChannel.js';
import {
  applyWaterSystemMacroTerrain,
  applyWaterSystemTerrain,
  getWaterSystemMinimumSegmentsForBounds,
  getWaterSystemMaterialFrame,
} from './waterSystem.js';
import { getSmallLakesMaterialMask } from './smallLakes.js';
import {
  applyMountainTrailTerrain,
  getMountainTrailMaterialMask,
  getMountainTrailMinimumSegmentsForBounds,
} from './mountainTrailNetwork.js';
import { getLowlandMinimumSegmentsForBounds } from './lowlandLandforms.js';
import {
  createTerrainMaterials,
  getTerrainMaterialForSegments,
} from './terrainMaterial.js';
import { MAP_SIZE } from './vegetationConfig.js';

const HEIGHT_MAP_PATH = '/assets/terrain/height.webp';
const ALPINE_ROCK_TEXTURE_PATH = '/assets/terrain/rock-alpine.webp';
const ALPINE_ROCK_NORMAL_TEXTURE_PATH = '/assets/terrain/rock-alpine-normal.png';
const ALPINE_SNOW_TEXTURE_PATH = '/assets/terrain/snow-alpine.webp';
const FOREST_FLOOR_OPTIMIZED_TEXTURE_PATH = '/assets/terrain/forest-floor/optimized';
const HEIGHT_MAP_WORLD_SIZE = 2048;
const CHUNK_SIZE = 256;
const SHADOW_PROXY_SEGMENTS = 64;
export const TERRAIN_SHADOW_PROXY_LAYER = 2;
const DEFAULT_LOD_SEGMENTS = [256, 128, 64];
const DEFAULT_CHUNK_BUILD_BUDGET_MS = 3;
const CHUNK_BUILD_VERTEX_BATCH_SIZE = 128;
const CHUNK_BUILD_INDEX_BATCH_SIZE = 1024;
const CHUNK_BUILD_SKIRT_BATCH_SIZE = 64;
const CHUNK_SKIRT_BOTTOM_MARGIN = 2;
const HEIGHT_BRUSH_DIRTY_PADDING = 7;
const PRIORITY_MISSING_CENTER = 0;
const PRIORITY_CENTER_UPGRADE = 10;
const PRIORITY_NEW_VISIBLE = 20;
const PRIORITY_NEAR_UPGRADE = 40;
const PRIORITY_EDITOR_REBUILD = 5;
const PRIORITY_DOWNGRADE = 100;
const MAX_HEIGHT = 300;
const HALF_MAP_SIZE = MAP_SIZE / 2;
const HALF_HEIGHT_MAP_WORLD_SIZE = HEIGHT_MAP_WORLD_SIZE / 2;
const CHUNKS_PER_SIDE = MAP_SIZE / CHUNK_SIZE;
const NORMAL_SAMPLE_DISTANCE = 1;
const GROUND_MASK_SAMPLE_DISTANCE = 5;
const HEIGHTMAP_SAVE_QUALITY = 0.98;
const ALPINE_TEXTURE_WORLD_SIZE = 20;
const FOREST_FLOOR_TEXTURE_WORLD_SIZE = 2;
const HEIGHT_SMOOTHING_ENABLED = true;
const HEIGHT_DITHER_AMPLITUDE = 0.35;
const HEIGHT_DITHER_FREQUENCY = 0.65;
const HEIGHT_SMOOTHING_KERNEL = [
  [1, 4, 6, 4, 1],
  [4, 16, 24, 16, 4],
  [6, 24, 36, 24, 6],
  [4, 16, 24, 16, 4],
  [1, 4, 6, 4, 1],
];
const HEIGHT_SMOOTHING_KERNEL_RADIUS = Math.floor(HEIGHT_SMOOTHING_KERNEL.length / 2);
const HEIGHT_SMOOTHING_KERNEL_WEIGHT = HEIGHT_SMOOTHING_KERNEL
  .flat()
  .reduce((total, weight) => total + weight, 0);

export class Terrain {
  constructor(heightData, width, height, textures, options = {}) {
    this.heightData = heightData;
    this.width = width;
    this.height = height;
    this.sampledHeightCache = HEIGHT_SMOOTHING_ENABLED
      ? new Float32Array(width * height)
      : null;
    this.sampledHeightCache?.fill(Number.NaN);
    this.group = new THREE.Group();
    this.group.name = 'Terrain';
    this.materials = createTerrainMaterials(textures, {
      alpineTextureWorldSize: ALPINE_TEXTURE_WORLD_SIZE,
      forestFloorTextureWorldSize: FOREST_FLOOR_TEXTURE_WORLD_SIZE,
      riverBankTextureWorldSize: RIVER_BANK_TEXTURE_WORLD_SIZE,
      riverBedTextureWorldSize: RIVER_BED_TEXTURE_WORLD_SIZE,
    });
    this.skirtMaterial = createTerrainSkirtMaterial();
    this.shadowProxy = createTerrainShadowProxy(this);
    this.shadowProxyLayer = TERRAIN_SHADOW_PROXY_LAYER;
    this.group.add(this.shadowProxy);
    this.loadedChunks = new Map();
    this.pendingChunks = new Map();
    this.chunkRevisions = new Map();
    this.lodSegments = [...DEFAULT_LOD_SEGMENTS];
    this.buildBudgetMs = options.buildBudgetMs ?? DEFAULT_CHUNK_BUILD_BUDGET_MS;
    this.minimumSegmentsForChunk = options.minimumSegmentsForChunk
      ?? getConservativeMinimumChunkSegments;
    this.now = options.now ?? getCurrentTime;
    this.nextBuildSequence = 0;
    this.surfaceSampleScratch = {};
    this.editorMode = false;
    this.editStrokeActive = false;
    this.dirtyEditedChunks = new Set();
    this.centerChunkX = null;
    this.centerChunkZ = null;
  }

  static async create(options = {}) {
    const [
      { data, width, height },
      textures,
    ] = await Promise.all([
      loadHeightMap(HEIGHT_MAP_PATH),
      loadTerrainTextures(
        options.textureTier,
        options.textureAnisotropy,
      ),
    ]);

    return new Terrain(data, width, height, textures, options);
  }

  async prepareInitialChunk(centerPosition) {
    const centerChunkX = this.getChunkCoord(centerPosition.x);
    const centerChunkZ = this.getChunkCoord(centerPosition.z);
    const centerKey = this.getChunkKey(centerChunkX, centerChunkZ);

    this.centerChunkX = centerChunkX;
    this.centerChunkZ = centerChunkZ;
    this.scheduleChunks(this.getAllChunkKeys());

    await new Promise((resolve) => {
      const advance = () => {
        this.processChunkBuilds();

        if (this.loadedChunks.has(centerKey)) {
          resolve();
          return;
        }

        requestAnimationFrame(advance);
      };

      requestAnimationFrame(advance);
    });
  }

  update() {
    this.scheduleLoadedChunkLods();
    this.processChunkBuilds();
  }

  setQualityPreset(preset) {
    this.lodSegments = normalizeLodSegments(preset.lodSegments);
    this.buildBudgetMs = preset.buildBudgetMs ?? this.buildBudgetMs;
    this.shadowProxy.castShadow = preset.useShadowProxy ?? true;

    if (this.centerChunkX !== null && this.centerChunkZ !== null) {
      this.reconcilePendingChunkLods();
      this.scheduleLoadedChunkLods();
    }
  }

  setEditorMode(enabled) {
    if (enabled) {
      this.editorMode = true;
      this.reconcilePendingChunkLods();
      this.scheduleLoadedChunkLods();
      return;
    }

    this.editorMode = false;
    this.endTerrainEditStroke();
    this.reconcilePendingChunkLods();
    this.scheduleLoadedChunkLods();
  }

  beginTerrainEditStroke() {
    this.editStrokeActive = true;
  }

  endTerrainEditStroke() {
    this.editStrokeActive = false;
    this.queueDirtyEditorRebuilds();
  }

  queueDirtyEditorRebuilds() {
    const dirtyKeys = [...this.dirtyEditedChunks];
    this.dirtyEditedChunks.clear();

    for (const key of dirtyKeys) {
      const record = this.loadedChunks.get(key);

      if (!record) {
        const { x, z } = this.parseChunkKey(key);
        const segments = this.getDesiredChunkSegments(x, z);

        this.requestChunkBuild(
          x,
          z,
          segments,
          this.getChunkBuildPriority(x, z, segments),
        );
        continue;
      }

      const segments = this.getDesiredChunkSegments(record.chunkX, record.chunkZ);
      this.requestChunkBuild(
        record.chunkX,
        record.chunkZ,
        segments,
        PRIORITY_EDITOR_REBUILD,
        true,
      );
    }
  }

  getChunkCoord(value) {
    return THREE.MathUtils.clamp(
      Math.floor((value + HALF_MAP_SIZE) / CHUNK_SIZE),
      0,
      CHUNKS_PER_SIDE - 1,
    );
  }

  getAllChunkKeys() {
    const keys = [];

    for (let z = 0; z < CHUNKS_PER_SIDE; z += 1) {
      for (let x = 0; x < CHUNKS_PER_SIDE; x += 1) {
        keys.push(this.getChunkKey(x, z));
      }
    }

    return keys;
  }

  scheduleChunks(keys) {
    for (const key of keys) {
      const { x, z } = this.parseChunkKey(key);
      const segments = this.getDesiredChunkSegments(x, z);
      const priority = this.getChunkBuildPriority(x, z, segments);

      this.requestChunkBuild(x, z, segments, priority);
    }
  }

  scheduleLoadedChunkLods() {
    for (const record of this.loadedChunks.values()) {
      const segments = this.getDesiredChunkSegments(record.chunkX, record.chunkZ);

      if (record.segments === segments && record.revision === this.getChunkRevision(record.key)) {
        continue;
      }

      this.requestChunkBuild(
        record.chunkX,
        record.chunkZ,
        segments,
        this.getChunkBuildPriority(record.chunkX, record.chunkZ, segments),
      );
    }
  }

  reconcilePendingChunkLods() {
    for (const task of [...this.pendingChunks.values()]) {
      const segments = this.getDesiredChunkSegments(task.chunkX, task.chunkZ);

      if (task.segments === segments) continue;

      this.requestChunkBuild(
        task.chunkX,
        task.chunkZ,
        segments,
        this.getChunkBuildPriority(task.chunkX, task.chunkZ, segments),
      );
    }
  }

  getChunkBuildPriority(chunkX, chunkZ, segments) {
    const distance = this.getChunkDistance(chunkX, chunkZ);
    const loaded = this.loadedChunks.get(this.getChunkKey(chunkX, chunkZ));

    if (!loaded) {
      return distance === 0
        ? PRIORITY_MISSING_CENTER
        : PRIORITY_NEW_VISIBLE + distance;
    }
    if (segments > loaded.segments) {
      return distance === 0
        ? PRIORITY_CENTER_UPGRADE
        : PRIORITY_NEAR_UPGRADE + distance;
    }
    if (segments < loaded.segments) {
      return PRIORITY_DOWNGRADE + distance;
    }

    return distance === 0
      ? PRIORITY_CENTER_UPGRADE
      : PRIORITY_NEAR_UPGRADE + distance;
  }

  requestChunkBuild(chunkX, chunkZ, segments, priority = 0, force = false) {
    const key = this.getChunkKey(chunkX, chunkZ);

    if (this.editStrokeActive && this.dirtyEditedChunks.has(key)) return;

    const revision = this.getChunkRevision(key);
    const normalizedSegments = this.applyMinimumChunkSegments(chunkX, chunkZ, segments);
    const loaded = this.loadedChunks.get(key);

    if (
      !force
      && loaded
      && loaded.segments === normalizedSegments
      && loaded.revision === revision
    ) {
      this.cancelPendingChunk(key);
      return;
    }

    const pending = this.pendingChunks.get(key);

    if (
      pending
      && pending.segments === normalizedSegments
      && pending.revision === revision
    ) {
      pending.priority = Math.min(pending.priority, priority);
      return;
    }

    this.cancelPendingChunk(key);
    this.pendingChunks.set(key, this.createChunkBuildTask(
      chunkX,
      chunkZ,
      normalizedSegments,
      revision,
      priority,
    ));
  }

  createChunkBuildTask(chunkX, chunkZ, segments, revision, priority) {
    return {
      key: this.getChunkKey(chunkX, chunkZ),
      chunkX,
      chunkZ,
      segments,
      revision,
      priority,
      sequence: this.nextBuildSequence++,
      phase: 'allocate',
      vertexIndex: 0,
      cellIndex: 0,
      skirtSampleIndex: 0,
      edgeMinimums: null,
      arrays: null,
      result: null,
      minX: -HALF_MAP_SIZE + chunkX * CHUNK_SIZE,
      minZ: -HALF_MAP_SIZE + chunkZ * CHUNK_SIZE,
      vertexStep: CHUNK_SIZE / segments,
      verticesPerSide: segments + 1,
    };
  }

  processChunkBuilds() {
    const deadline = this.now() + this.buildBudgetMs;
    let didWork = false;

    while (this.pendingChunks.size > 0 && (!didWork || this.now() < deadline)) {
      const task = this.getNextChunkBuildTask();

      if (!task) break;
      if (!this.isChunkBuildTaskCurrent(task)) {
        this.cancelPendingChunk(task.key);
        continue;
      }

      this.advanceChunkBuildTask(task, deadline);
      didWork = true;

      if (task.phase === 'complete') {
        this.commitChunkBuildTask(task);
      }
    }
  }

  getNextChunkBuildTask() {
    let next = null;

    for (const task of this.pendingChunks.values()) {
      if (
        !next
        || task.priority < next.priority
        || (task.priority === next.priority && task.sequence < next.sequence)
      ) {
        next = task;
      }
    }

    return next;
  }

  advanceChunkBuildTask(task, deadline) {
    if (task.phase === 'allocate') {
      task.arrays = createChunkArrays(task.segments);
      task.surfaceHeightCache = createSurfaceHeightCache(task.minX, task.minZ);
      task.edgeMinimums = new Float32Array(4);
      task.edgeMinimums.fill(Number.POSITIVE_INFINITY);
      task.phase = 'vertices';
      return;
    }

    if (task.phase === 'vertices') {
      const vertexCount = task.verticesPerSide * task.verticesPerSide;
      let processed = 0;

      while (
        task.vertexIndex < vertexCount
        && processed < CHUNK_BUILD_VERTEX_BATCH_SIZE
        && (processed === 0 || this.now() < deadline)
      ) {
        const xIndex = task.vertexIndex % task.verticesPerSide;
        const zIndex = Math.floor(task.vertexIndex / task.verticesPerSide);
        const worldX = task.minX + xIndex * task.vertexStep;
        const worldZ = task.minZ + zIndex * task.vertexStep;

        this.writeSurfaceVertex(
          task.arrays,
          task.vertexIndex,
          worldX,
          worldZ,
          task.surfaceHeightCache,
        );
        task.vertexIndex += 1;
        processed += 1;
      }

      if (task.vertexIndex >= vertexCount) {
        task.phase = 'indices';
      }
      return;
    }

    if (task.phase === 'indices') {
      const cellCount = task.segments * task.segments;
      let processed = 0;

      while (
        task.cellIndex < cellCount
        && processed < CHUNK_BUILD_INDEX_BATCH_SIZE
        && (processed === 0 || this.now() < deadline)
      ) {
        writeSurfaceCellIndices(
          task.arrays.indices,
          task.cellIndex,
          task.segments,
          task.verticesPerSide,
        );
        task.cellIndex += 1;
        processed += 1;
      }

      if (task.cellIndex >= cellCount) {
        task.phase = 'skirt';
      }
      return;
    }

    if (task.phase === 'skirt') {
      const samplesPerEdge = CHUNK_SIZE + 1;
      const sampleCount = samplesPerEdge * 4;
      let processed = 0;

      while (
        task.skirtSampleIndex < sampleCount
        && processed < CHUNK_BUILD_SKIRT_BATCH_SIZE
        && (processed === 0 || this.now() < deadline)
      ) {
        const edge = Math.floor(task.skirtSampleIndex / samplesPerEdge);
        const edgeOffset = task.skirtSampleIndex % samplesPerEdge;
        const worldX = edge < 2
          ? task.minX + edgeOffset
          : task.minX + (edge === 3 ? CHUNK_SIZE : 0);
        const worldZ = edge < 2
          ? task.minZ + (edge === 1 ? CHUNK_SIZE : 0)
          : task.minZ + edgeOffset;
        const height = this.getCachedSurfaceHeight(worldX, worldZ, task.surfaceHeightCache);

        task.edgeMinimums[edge] = Math.min(task.edgeMinimums[edge], height);
        task.skirtSampleIndex += 1;
        processed += 1;
      }

      if (task.skirtSampleIndex >= sampleCount) {
        task.phase = 'finalize';
      }
      return;
    }

    if (task.phase === 'finalize') {
      task.result = this.createChunkRecord(task);
      task.phase = 'complete';
    }
  }

  createChunkRecord(task) {
    const geometry = createSurfaceGeometry(task.arrays, task.minX, task.minZ);
    const material = getTerrainMaterialForSegments(this.materials, task.segments);
    const surface = new THREE.Mesh(geometry, material);
    const skirt = new THREE.Mesh(
      createSkirtGeometry(
        task.arrays.positions,
        task.segments,
        task.minX,
        task.minZ,
        task.edgeMinimums,
      ),
      this.skirtMaterial,
    );

    surface.name = `TerrainChunk_${task.chunkX}_${task.chunkZ}`;
    surface.receiveShadow = material.userData.terrainReceivesShadow;
    surface.userData.isTerrainSurface = true;
    surface.userData.terrainSegments = task.segments;
    surface.userData.terrainMaterialLod = material.userData.terrainMaterialLod;
    skirt.name = `TerrainSkirt_${task.chunkX}_${task.chunkZ}`;
    skirt.userData.isTerrainSkirt = true;
    skirt.userData.terrainSegments = task.segments;
    skirt.raycast = disableRaycast;

    return {
      key: task.key,
      chunkX: task.chunkX,
      chunkZ: task.chunkZ,
      minX: task.minX,
      minZ: task.minZ,
      segments: task.segments,
      revision: task.revision,
      arrays: task.arrays,
      edgeMinimums: task.edgeMinimums,
      surface,
      skirt,
    };
  }

  commitChunkBuildTask(task) {
    if (!this.isChunkBuildTaskCurrent(task)) {
      disposeChunkRecord(task.result);
      this.pendingChunks.delete(task.key);
      return;
    }

    const previous = this.loadedChunks.get(task.key);
    const next = task.result;

    this.group.add(next.surface, next.skirt);
    if (previous) {
      this.group.remove(previous.surface, previous.skirt);
      disposeChunkRecord(previous);
    }
    this.loadedChunks.set(task.key, next);
    this.pendingChunks.delete(task.key);
  }

  isChunkBuildTaskCurrent(task) {
    return this.pendingChunks.get(task.key) === task
      && this.getChunkRevision(task.key) === task.revision;
  }

  cancelPendingChunk(key) {
    const task = this.pendingChunks.get(key);

    if (!task) return;
    if (task.result) disposeChunkRecord(task.result);
    this.pendingChunks.delete(key);
  }

  getChunkDistance(chunkX, chunkZ) {
    if (this.centerChunkX === null || this.centerChunkZ === null) return 0;

    return Math.max(
      Math.abs(chunkX - this.centerChunkX),
      Math.abs(chunkZ - this.centerChunkZ),
    );
  }

  getDesiredChunkSegments(chunkX, chunkZ) {
    const distance = this.getChunkDistance(chunkX, chunkZ);
    const segments = this.editorMode && distance <= 1
      ? CHUNK_SIZE
      : this.lodSegments[Math.min(distance, this.lodSegments.length - 1)];

    return this.applyMinimumChunkSegments(chunkX, chunkZ, segments);
  }

  applyMinimumChunkSegments(chunkX, chunkZ, segments) {
    const minX = -HALF_MAP_SIZE + chunkX * CHUNK_SIZE;
    const minZ = -HALF_MAP_SIZE + chunkZ * CHUNK_SIZE;
    const minimum = this.minimumSegmentsForChunk({
      chunkX,
      chunkZ,
      minX,
      minZ,
      maxX: minX + CHUNK_SIZE,
      maxZ: minZ + CHUNK_SIZE,
    });

    return normalizeChunkSegments(Math.max(segments, minimum || 0));
  }

  getChunkRevision(key) {
    return this.chunkRevisions.get(key) ?? 0;
  }

  bumpChunkRevision(key) {
    const revision = this.getChunkRevision(key) + 1;

    this.chunkRevisions.set(key, revision);
    this.cancelPendingChunk(key);
    return revision;
  }

  getChunkKey(chunkX, chunkZ) {
    return `${chunkX},${chunkZ}`;
  }

  parseChunkKey(key) {
    const [x, z] = key.split(',').map(Number);

    return { x, z };
  }

  getLoadedChunkBounds() {
    const chunks = [];

    for (const record of this.loadedChunks.values()) {
      chunks.push({
        key: record.key,
        chunkX: record.chunkX,
        chunkZ: record.chunkZ,
        minX: record.minX,
        minZ: record.minZ,
        maxX: record.minX + CHUNK_SIZE,
        maxZ: record.minZ + CHUNK_SIZE,
      });
    }

    return chunks;
  }

  getRaycastMeshes() {
    return [...this.loadedChunks.values()].map((record) => record.surface);
  }

  dispose() {
    for (const record of this.loadedChunks.values()) {
      this.group.remove(record.surface, record.skirt);
      disposeChunkRecord(record);
    }
    for (const task of this.pendingChunks.values()) {
      disposeChunkRecord(task.result);
    }
    this.loadedChunks.clear();
    this.pendingChunks.clear();
    for (const material of Object.values(this.materials)) {
      material.dispose();
    }
    this.skirtMaterial.dispose();
    this.shadowProxy.geometry.dispose();
    this.shadowProxy.material.dispose();
  }

  getHeightMapData() {
    return {
      data: this.heightData,
      width: this.width,
      height: this.height,
      worldSize: HEIGHT_MAP_WORLD_SIZE,
      maxHeight: MAX_HEIGHT,
      saveQuality: HEIGHTMAP_SAVE_QUALITY,
    };
  }

  heightMapPixelToWorld(imageX, imageY) {
    const x = (imageX / (this.width - 1)) * HEIGHT_MAP_WORLD_SIZE - HALF_HEIGHT_MAP_WORLD_SIZE;
    const z = ((this.height - 1 - imageY) / (this.height - 1)) * HEIGHT_MAP_WORLD_SIZE - HALF_HEIGHT_MAP_WORLD_SIZE;

    return { x, z };
  }

  applyHeightBrush(worldX, worldZ, radius, strength) {
    const centerX = ((worldX + HALF_HEIGHT_MAP_WORLD_SIZE) / HEIGHT_MAP_WORLD_SIZE) * (this.width - 1);
    const centerY = (1 - ((worldZ + HALF_HEIGHT_MAP_WORLD_SIZE) / HEIGHT_MAP_WORLD_SIZE)) * (this.height - 1);
    const pixelRadius = Math.max((radius / HEIGHT_MAP_WORLD_SIZE) * (this.width - 1), 1);
    const minX = Math.max(Math.floor(centerX - pixelRadius), 0);
    const maxX = Math.min(Math.ceil(centerX + pixelRadius), this.width - 1);
    const minY = Math.max(Math.floor(centerY - pixelRadius), 0);
    const maxY = Math.min(Math.ceil(centerY + pixelRadius), this.height - 1);
    const delta = (strength / MAX_HEIGHT) * 255;

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy) / pixelRadius;

        if (distance > 1) continue;

        const falloff = 1 - smoothstepRange(0.18, 1, distance);
        const index = (y * this.width + x) * 4;
        const value = THREE.MathUtils.clamp(this.getPixelLuminance(index) + delta * falloff, 0, 255);

        this.heightData[index] = value;
        this.heightData[index + 1] = value;
        this.heightData[index + 2] = value;
        this.heightData[index + 3] = 255;
      }
    }

    this.invalidateSampledHeightCache(minX, minY, maxX, maxY);
    const topLeft = this.heightMapPixelToWorld(minX, minY);
    const bottomRight = this.heightMapPixelToWorld(maxX, maxY);
    const bounds = {
      minX: Math.min(topLeft.x, bottomRight.x) - HEIGHT_BRUSH_DIRTY_PADDING,
      maxX: Math.max(topLeft.x, bottomRight.x) + HEIGHT_BRUSH_DIRTY_PADDING,
      minZ: Math.min(topLeft.z, bottomRight.z) - HEIGHT_BRUSH_DIRTY_PADDING,
      maxZ: Math.max(topLeft.z, bottomRight.z) + HEIGHT_BRUSH_DIRTY_PADDING,
    };

    this.refreshChunksInBounds(bounds);

    return {
      minX,
      minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  invalidateSampledHeightCache(minX, minY, maxX, maxY) {
    if (!this.sampledHeightCache) return;

    const startX = Math.max(minX - HEIGHT_SMOOTHING_KERNEL_RADIUS, 0);
    const endX = Math.min(maxX + HEIGHT_SMOOTHING_KERNEL_RADIUS, this.width - 1);
    const startY = Math.max(minY - HEIGHT_SMOOTHING_KERNEL_RADIUS, 0);
    const endY = Math.min(maxY + HEIGHT_SMOOTHING_KERNEL_RADIUS, this.height - 1);

    for (let y = startY; y <= endY; y += 1) {
      const rowStart = y * this.width + startX;
      this.sampledHeightCache.fill(Number.NaN, rowStart, rowStart + endX - startX + 1);
    }
  }

  refreshChunksInBounds(bounds) {
    this.updateShadowProxyInBounds(bounds);
    const minChunkX = this.getChunkCoord(bounds.minX);
    const maxChunkX = this.getChunkCoord(bounds.maxX);
    const minChunkZ = this.getChunkCoord(bounds.minZ);
    const maxChunkZ = this.getChunkCoord(bounds.maxZ);

    for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ += 1) {
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX += 1) {
        const key = this.getChunkKey(chunkX, chunkZ);
        const revision = this.bumpChunkRevision(key);
        const record = this.loadedChunks.get(key);

        if (!record) {
          this.dirtyEditedChunks.add(key);
          continue;
        }

        this.updateLoadedChunkSurface(record, bounds);
        record.revision = revision;
        record.surface.userData.terrainRevision = revision;
        record.skirt.userData.terrainRevision = revision;
        this.dirtyEditedChunks.add(key);
      }
    }

    if (!this.editStrokeActive) this.queueDirtyEditorRebuilds();
  }

  updateShadowProxyInBounds(bounds) {
    const positions = this.shadowProxy.geometry.getAttribute('position');
    const vertexStep = MAP_SIZE / SHADOW_PROXY_SEGMENTS;
    const verticesPerSide = SHADOW_PROXY_SEGMENTS + 1;
    const startX = THREE.MathUtils.clamp(
      Math.floor((bounds.minX + HALF_MAP_SIZE) / vertexStep),
      0,
      SHADOW_PROXY_SEGMENTS,
    );
    const endX = THREE.MathUtils.clamp(
      Math.ceil((bounds.maxX + HALF_MAP_SIZE) / vertexStep),
      0,
      SHADOW_PROXY_SEGMENTS,
    );
    const startZ = THREE.MathUtils.clamp(
      Math.floor((bounds.minZ + HALF_MAP_SIZE) / vertexStep),
      0,
      SHADOW_PROXY_SEGMENTS,
    );
    const endZ = THREE.MathUtils.clamp(
      Math.ceil((bounds.maxZ + HALF_MAP_SIZE) / vertexStep),
      0,
      SHADOW_PROXY_SEGMENTS,
    );

    if (startX > endX || startZ > endZ) return;

    for (let z = startZ; z <= endZ; z += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const vertexIndex = z * verticesPerSide + x;
        const worldX = -HALF_MAP_SIZE + x * vertexStep;
        const worldZ = -HALF_MAP_SIZE + z * vertexStep;

        positions.setY(vertexIndex, this.getHeightAt(worldX, worldZ));
      }
    }

    positions.needsUpdate = true;
  }

  updateLoadedChunkSurface(record, bounds) {
    const vertexStep = CHUNK_SIZE / record.segments;
    const startX = THREE.MathUtils.clamp(
      Math.ceil((bounds.minX - record.minX) / vertexStep),
      0,
      record.segments,
    );
    const endX = THREE.MathUtils.clamp(
      Math.floor((bounds.maxX - record.minX) / vertexStep),
      0,
      record.segments,
    );
    const startZ = THREE.MathUtils.clamp(
      Math.ceil((bounds.minZ - record.minZ) / vertexStep),
      0,
      record.segments,
    );
    const endZ = THREE.MathUtils.clamp(
      Math.floor((bounds.maxZ - record.minZ) / vertexStep),
      0,
      record.segments,
    );

    if (startX > endX || startZ > endZ) return;

    const verticesPerSide = record.segments + 1;

    for (let z = startZ; z <= endZ; z += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const vertexIndex = z * verticesPerSide + x;
        const worldX = record.minX + x * vertexStep;
        const worldZ = record.minZ + z * vertexStep;

        this.writeSurfaceVertex(record.arrays, vertexIndex, worldX, worldZ);
      }
    }

    for (const attribute of Object.values(record.surface.geometry.attributes)) {
      attribute.needsUpdate = true;
    }

    const dirtyEdges = [];
    if (startZ === 0) dirtyEdges.push(0);
    if (endZ === record.segments) dirtyEdges.push(1);
    if (startX === 0) dirtyEdges.push(2);
    if (endX === record.segments) dirtyEdges.push(3);

    if (dirtyEdges.length > 0) {
      this.updateChunkEdgeMinimums(record, dirtyEdges);
      const previousGeometry = record.skirt.geometry;
      record.skirt.geometry = createSkirtGeometry(
        record.arrays.positions,
        record.segments,
        record.minX,
        record.minZ,
        record.edgeMinimums,
      );
      previousGeometry.dispose();
    }
  }

  updateChunkEdgeMinimums(record, edges) {
    const heightCache = createSurfaceHeightCache(record.minX, record.minZ);

    for (const edge of edges) {
      let minimum = Number.POSITIVE_INFINITY;

      for (let offset = 0; offset <= CHUNK_SIZE; offset += 1) {
        const worldX = edge < 2
          ? record.minX + offset
          : record.minX + (edge === 3 ? CHUNK_SIZE : 0);
        const worldZ = edge < 2
          ? record.minZ + (edge === 1 ? CHUNK_SIZE : 0)
          : record.minZ + offset;
        minimum = Math.min(
          minimum,
          this.getCachedSurfaceHeight(worldX, worldZ, heightCache),
        );
      }

      record.edgeMinimums[edge] = minimum;
    }
  }

  writeSurfaceVertex(arrays, vertexIndex, worldX, worldZ, surfaceHeightCache = null) {
    const sample = this.sampleSurfaceAt(
      worldX,
      worldZ,
      this.surfaceSampleScratch,
      surfaceHeightCache,
    );
    const riverFrame = getRiverMaterialFrame(sample.baseHeight, worldX, worldZ);
    const waterSystemFrame = getWaterSystemMaterialFrame(sample.baseHeight, worldX, worldZ);
    const smallLakesMask = getSmallLakesMaterialMask(worldX, worldZ);
    const mountainTrailMask = getMountainTrailMaterialMask(worldX, worldZ);
    const worldSpaceWaterBedMask = Math.max(
      smallLakesMask,
      waterSystemFrame.riverNetworkBedMask,
    );
    const positionOffset = vertexIndex * 3;
    const uvOffset = vertexIndex * 2;
    const waterMaskOffset = vertexIndex * 4;

    arrays.positions[positionOffset] = worldX;
    arrays.positions[positionOffset + 1] = sample.height;
    arrays.positions[positionOffset + 2] = worldZ;
    arrays.normals[positionOffset] = sample.normalX;
    arrays.normals[positionOffset + 1] = sample.normalY;
    arrays.normals[positionOffset + 2] = sample.normalZ;
    arrays.uvs[uvOffset] = (worldX + HALF_MAP_SIZE) / MAP_SIZE;
    arrays.uvs[uvOffset + 1] = (worldZ + HALF_MAP_SIZE) / MAP_SIZE;
    arrays.groundMasks[vertexIndex] = sample.groundMask;
    arrays.riverMasks[vertexIndex] = riverFrame.riverMask;
    arrays.riverBedMasks[vertexIndex] = Math.max(
      riverFrame.riverBedMask,
      worldSpaceWaterBedMask,
    );
    arrays.riverUnderwaterMasks[vertexIndex] = riverFrame.riverUnderwaterMask;
    arrays.riverBedCoords[uvOffset] = riverFrame.riverDistance;
    arrays.riverBedCoords[uvOffset + 1] = riverFrame.riverLateral;
    arrays.waterSystemMasks[waterMaskOffset] = waterSystemFrame.lakeBedMask;
    arrays.waterSystemMasks[waterMaskOffset + 1] = waterSystemFrame.wetShoreMask;
    arrays.waterSystemMasks[waterMaskOffset + 2] = waterSystemFrame.snowmeltWetMask;
    arrays.waterSystemMasks[waterMaskOffset + 3] = waterSystemFrame.plungeMask;
    arrays.smallLakeMasks[vertexIndex] = worldSpaceWaterBedMask;
    arrays.mountainTrailMasks[vertexIndex] = mountainTrailMask;
  }

  sampleSurfaceAt(x, z, target = {}, surfaceHeightCache = null) {
    const baseHeight = this.getBaseHeightAt(x, z);
    const height = this.getSurfaceHeightFromBase(baseHeight, x, z);
    this.setCachedSurfaceHeight(surfaceHeightCache, x, z, height);
    const normalLeft = this.getCachedSurfaceHeight(x - NORMAL_SAMPLE_DISTANCE, z, surfaceHeightCache);
    const normalRight = this.getCachedSurfaceHeight(x + NORMAL_SAMPLE_DISTANCE, z, surfaceHeightCache);
    const normalDown = this.getCachedSurfaceHeight(x, z - NORMAL_SAMPLE_DISTANCE, surfaceHeightCache);
    const normalUp = this.getCachedSurfaceHeight(x, z + NORMAL_SAMPLE_DISTANCE, surfaceHeightCache);
    const normalX = normalLeft - normalRight;
    const normalY = NORMAL_SAMPLE_DISTANCE * 2;
    const normalZ = normalDown - normalUp;
    const normalLength = Math.hypot(normalX, normalY, normalZ) || 1;
    const groundLeft = this.getCachedSurfaceHeight(x - GROUND_MASK_SAMPLE_DISTANCE, z, surfaceHeightCache);
    const groundRight = this.getCachedSurfaceHeight(x + GROUND_MASK_SAMPLE_DISTANCE, z, surfaceHeightCache);
    const groundDown = this.getCachedSurfaceHeight(x, z - GROUND_MASK_SAMPLE_DISTANCE, surfaceHeightCache);
    const groundUp = this.getCachedSurfaceHeight(x, z + GROUND_MASK_SAMPLE_DISTANCE, surfaceHeightCache);
    const groundNormalX = groundLeft - groundRight;
    const groundNormalY = GROUND_MASK_SAMPLE_DISTANCE * 2;
    const groundNormalZ = groundDown - groundUp;
    const groundNormalLength = Math.hypot(groundNormalX, groundNormalY, groundNormalZ) || 1;
    const minHeight = Math.min(height, groundLeft, groundRight, groundDown, groundUp);
    const maxHeight = Math.max(height, groundLeft, groundRight, groundDown, groundUp);
    const slopeMask = smoothstepRange(0.76, 0.94, groundNormalY / groundNormalLength);
    const reliefRatio = (maxHeight - minHeight) / (GROUND_MASK_SAMPLE_DISTANCE * 2);
    const smoothMask = 1 - smoothstepRange(0.22, 0.62, reliefRatio);

    target.baseHeight = baseHeight;
    target.height = height;
    target.normalX = normalX / normalLength;
    target.normalY = normalY / normalLength;
    target.normalZ = normalZ / normalLength;
    target.groundMask = THREE.MathUtils.clamp(slopeMask * smoothMask, 0, 1);
    return target;
  }

  getCachedSurfaceHeight(x, z, cache) {
    const cacheIndex = getSurfaceHeightCacheIndex(cache, x, z);

    if (cacheIndex === -1) return this.getHeightAt(x, z);

    const cachedHeight = cache.values[cacheIndex];
    if (!Number.isNaN(cachedHeight)) return cachedHeight;

    const height = this.getHeightAt(x, z);
    cache.values[cacheIndex] = height;
    return height;
  }

  setCachedSurfaceHeight(cache, x, z, height) {
    const cacheIndex = getSurfaceHeightCacheIndex(cache, x, z);

    if (cacheIndex !== -1) cache.values[cacheIndex] = height;
  }

  getSurfaceHeightFromBase(baseHeight, x, z) {
    const mountainTrailHeight = applyMountainTrailTerrain(baseHeight, x, z);

    return applyWaterSystemTerrain(mountainTrailHeight, x, z);
  }

  getHeightAt(x, z) {
    return this.getSurfaceHeightFromBase(this.getBaseHeightAt(x, z), x, z);
  }

  getShadowProxyHeightAt(x, z) {
    const baseHeight = this.getBaseHeightAt(x, z);

    return applyWaterSystemMacroTerrain(baseHeight, x, z);
  }

  getBaseHeightAt(x, z) {
    const u = THREE.MathUtils.clamp((x + HALF_HEIGHT_MAP_WORLD_SIZE) / HEIGHT_MAP_WORLD_SIZE, 0, 1);
    const v = THREE.MathUtils.clamp((z + HALF_HEIGHT_MAP_WORLD_SIZE) / HEIGHT_MAP_WORLD_SIZE, 0, 1);
    const imageX = u * (this.width - 1);
    const imageY = (1 - v) * (this.height - 1);
    const x0 = Math.floor(imageX);
    const y0 = Math.floor(imageY);
    const x1 = Math.min(x0 + 1, this.width - 1);
    const y1 = Math.min(y0 + 1, this.height - 1);
    const tx = imageX - x0;
    const ty = imageY - y0;

    const h00 = this.getSampledPixelHeight(x0, y0);
    const h10 = this.getSampledPixelHeight(x1, y0);
    const h01 = this.getSampledPixelHeight(x0, y1);
    const h11 = this.getSampledPixelHeight(x1, y1);
    const top = THREE.MathUtils.lerp(h00, h10, tx);
    const bottom = THREE.MathUtils.lerp(h01, h11, tx);
    const height = THREE.MathUtils.lerp(top, bottom, ty) + getHeightDither(x, z);

    return THREE.MathUtils.clamp(height, 0, MAX_HEIGHT);
  }

  getSampledPixelHeight(x, y) {
    if (!HEIGHT_SMOOTHING_ENABLED) {
      return this.getPixelHeight(x, y);
    }

    const cacheIndex = y * this.width + x;
    const cachedHeight = this.sampledHeightCache[cacheIndex];

    if (!Number.isNaN(cachedHeight)) {
      return cachedHeight;
    }

    let weightedHeight = 0;

    for (let offsetY = -HEIGHT_SMOOTHING_KERNEL_RADIUS; offsetY <= HEIGHT_SMOOTHING_KERNEL_RADIUS; offsetY += 1) {
      for (let offsetX = -HEIGHT_SMOOTHING_KERNEL_RADIUS; offsetX <= HEIGHT_SMOOTHING_KERNEL_RADIUS; offsetX += 1) {
        const sampleX = THREE.MathUtils.clamp(x + offsetX, 0, this.width - 1);
        const sampleY = THREE.MathUtils.clamp(y + offsetY, 0, this.height - 1);
        const weight = HEIGHT_SMOOTHING_KERNEL[offsetY + HEIGHT_SMOOTHING_KERNEL_RADIUS]
          [offsetX + HEIGHT_SMOOTHING_KERNEL_RADIUS];

        weightedHeight += this.getPixelHeight(sampleX, sampleY) * weight;
      }
    }

    const height = weightedHeight / HEIGHT_SMOOTHING_KERNEL_WEIGHT;
    this.sampledHeightCache[cacheIndex] = height;
    return height;
  }

  getNormalAt(x, z) {
    const left = this.getHeightAt(x - NORMAL_SAMPLE_DISTANCE, z);
    const right = this.getHeightAt(x + NORMAL_SAMPLE_DISTANCE, z);
    const down = this.getHeightAt(x, z - NORMAL_SAMPLE_DISTANCE);
    const up = this.getHeightAt(x, z + NORMAL_SAMPLE_DISTANCE);

    return new THREE.Vector3(
      left - right,
      NORMAL_SAMPLE_DISTANCE * 2,
      down - up,
    ).normalize();
  }

  getTerrainGroundMask(x, z) {
    const center = this.getHeightAt(x, z);
    const left = this.getHeightAt(x - GROUND_MASK_SAMPLE_DISTANCE, z);
    const right = this.getHeightAt(x + GROUND_MASK_SAMPLE_DISTANCE, z);
    const down = this.getHeightAt(x, z - GROUND_MASK_SAMPLE_DISTANCE);
    const up = this.getHeightAt(x, z + GROUND_MASK_SAMPLE_DISTANCE);
    const normalX = left - right;
    const normalY = GROUND_MASK_SAMPLE_DISTANCE * 2;
    const normalZ = down - up;
    const normalLength = Math.hypot(normalX, normalY, normalZ) || 1;
    const minHeight = Math.min(center, left, right, down, up);
    const maxHeight = Math.max(center, left, right, down, up);
    const slopeMask = smoothstepRange(0.76, 0.94, normalY / normalLength);
    const reliefRatio = (maxHeight - minHeight) / (GROUND_MASK_SAMPLE_DISTANCE * 2);
    const smoothMask = 1 - smoothstepRange(0.22, 0.62, reliefRatio);

    return THREE.MathUtils.clamp(slopeMask * smoothMask, 0, 1);
  }

  getMaxHeightInRadius(x, z, radius) {
    const diagonal = radius * Math.SQRT1_2;
    const samplePoints = [
      [0, 0],
      [radius, 0],
      [-radius, 0],
      [0, radius],
      [0, -radius],
      [diagonal, diagonal],
      [diagonal, -diagonal],
      [-diagonal, diagonal],
      [-diagonal, -diagonal],
    ];

    let maxHeight = -Infinity;

    for (const [offsetX, offsetZ] of samplePoints) {
      maxHeight = Math.max(maxHeight, this.getHeightAt(x + offsetX, z + offsetZ));
    }

    return maxHeight;
  }

  getPixelHeight(x, y) {
    const index = (y * this.width + x) * 4;
    const luminance = this.getPixelLuminance(index) / 255;

    return luminance * MAX_HEIGHT;
  }

  getPixelLuminance(index) {
    const r = this.heightData[index];
    const g = this.heightData[index + 1];
    const b = this.heightData[index + 2];

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
}

async function loadHeightMap(path) {
  const image = new Image();
  image.src = path;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  return {
    data: imageData.data,
    width: canvas.width,
    height: canvas.height,
  };
}

async function loadTerrainTextures(textureTier, textureAnisotropy) {
  const standardTextureLoader = new THREE.TextureLoader();
  const tier = textureTier === '1k' ? '1k' : '2k';
  const anisotropy = textureAnisotropy ?? 4;
  const [
    rock,
    rockNormal,
    snow,
    forestFloorBaseColor,
    forestFloorNormal,
    riverBank,
    riverBed,
  ] = await Promise.all([
    standardTextureLoader.loadAsync(ALPINE_ROCK_TEXTURE_PATH),
    standardTextureLoader.loadAsync(ALPINE_ROCK_NORMAL_TEXTURE_PATH),
    standardTextureLoader.loadAsync(ALPINE_SNOW_TEXTURE_PATH),
    standardTextureLoader.loadAsync(`${FOREST_FLOOR_OPTIMIZED_TEXTURE_PATH}/forest_floor_basecolor_${tier}.jpg`),
    standardTextureLoader.loadAsync(`${FOREST_FLOOR_OPTIMIZED_TEXTURE_PATH}/forest_floor_normal_${tier}.jpg`),
    standardTextureLoader.loadAsync(RIVER_BANK_TEXTURE_PATH),
    standardTextureLoader.loadAsync(RIVER_BED_TEXTURE_PATH),
  ]);

  for (const texture of [
    rock,
    snow,
    forestFloorBaseColor,
    riverBank,
    riverBed,
  ]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;
  }

  for (const texture of [
    rockNormal,
    forestFloorNormal,
  ]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = anisotropy;
  }

  return {
    rock,
    rockNormal,
    snow,
    forestFloorBaseColor,
    forestFloorNormal,
    riverBank,
    riverBed,
  };
}

function normalizeLodSegments(lodSegments) {
  const values = Array.isArray(lodSegments)
    ? lodSegments
    : lodSegments === undefined
      ? DEFAULT_LOD_SEGMENTS
      : [lodSegments];
  const normalized = values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0 && CHUNK_SIZE % value === 0)
    .map((value) => Math.min(value, CHUNK_SIZE))
    .filter((value, index, list) => list.indexOf(value) === index)
    .sort((a, b) => b - a);

  if (normalized.length === 0) return [...DEFAULT_LOD_SEGMENTS];
  if (normalized[0] !== CHUNK_SIZE) normalized.unshift(CHUNK_SIZE);
  return normalized;
}

function normalizeChunkSegments(value) {
  const segments = Number(value);

  if (Number.isInteger(segments) && segments > 0 && CHUNK_SIZE % segments === 0) {
    return Math.min(segments, CHUNK_SIZE);
  }

  return DEFAULT_LOD_SEGMENTS[DEFAULT_LOD_SEGMENTS.length - 1];
}

function createChunkArrays(segments) {
  const vertexCount = (segments + 1) ** 2;

  return {
    positions: new Float32Array(vertexCount * 3),
    normals: new Float32Array(vertexCount * 3),
    uvs: new Float32Array(vertexCount * 2),
    groundMasks: new Float32Array(vertexCount),
    riverMasks: new Float32Array(vertexCount),
    riverBedMasks: new Float32Array(vertexCount),
    riverUnderwaterMasks: new Float32Array(vertexCount),
    riverBedCoords: new Float32Array(vertexCount * 2),
    waterSystemMasks: new Float32Array(vertexCount * 4),
    smallLakeMasks: new Float32Array(vertexCount),
    mountainTrailMasks: new Float32Array(vertexCount),
    indices: new Uint32Array(segments * segments * 6),
  };
}

function createSurfaceHeightCache(minX, minZ) {
  const padding = GROUND_MASK_SAMPLE_DISTANCE;
  const size = CHUNK_SIZE + padding * 2 + 1;
  const values = new Float32Array(size * size);

  values.fill(Number.NaN);
  return {
    minX: minX - padding,
    minZ: minZ - padding,
    size,
    values,
  };
}

function getSurfaceHeightCacheIndex(cache, x, z) {
  if (!cache) return -1;

  const xIndex = Math.round(x - cache.minX);
  const zIndex = Math.round(z - cache.minZ);

  if (
    xIndex < 0
    || xIndex >= cache.size
    || zIndex < 0
    || zIndex >= cache.size
    || Math.abs(cache.minX + xIndex - x) > 0.0001
    || Math.abs(cache.minZ + zIndex - z) > 0.0001
  ) {
    return -1;
  }

  return zIndex * cache.size + xIndex;
}

function writeSurfaceCellIndices(indices, cellIndex, segments, verticesPerSide) {
  const x = cellIndex % segments;
  const z = Math.floor(cellIndex / segments);
  const topLeft = z * verticesPerSide + x;
  const topRight = topLeft + 1;
  const bottomLeft = topLeft + verticesPerSide;
  const bottomRight = bottomLeft + 1;
  const offset = cellIndex * 6;

  indices[offset] = topLeft;
  indices[offset + 1] = bottomLeft;
  indices[offset + 2] = topRight;
  indices[offset + 3] = topRight;
  indices[offset + 4] = bottomLeft;
  indices[offset + 5] = bottomRight;
}

function createSurfaceGeometry(arrays, minX, minZ) {
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.BufferAttribute(arrays.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(arrays.normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(arrays.uvs, 2));
  geometry.setAttribute('groundMask', new THREE.BufferAttribute(arrays.groundMasks, 1));
  geometry.setAttribute('riverMask', new THREE.BufferAttribute(arrays.riverMasks, 1));
  geometry.setAttribute('riverBedMask', new THREE.BufferAttribute(arrays.riverBedMasks, 1));
  geometry.setAttribute('riverUnderwaterMask', new THREE.BufferAttribute(arrays.riverUnderwaterMasks, 1));
  geometry.setAttribute('riverBedCoord', new THREE.BufferAttribute(arrays.riverBedCoords, 2));
  geometry.setAttribute('waterSystemMask', new THREE.BufferAttribute(arrays.waterSystemMasks, 4));
  geometry.setAttribute('smallLakesMask', new THREE.BufferAttribute(arrays.smallLakeMasks, 1));
  geometry.setAttribute('mountainTrailMask', new THREE.BufferAttribute(arrays.mountainTrailMasks, 1));
  geometry.setIndex(new THREE.BufferAttribute(arrays.indices, 1));
  geometry.boundingSphere = createChunkBoundingSphere(minX, minZ, false);
  return geometry;
}

function createSkirtGeometry(surfacePositions, segments, minX, minZ, edgeMinimums) {
  const verticesPerSide = segments + 1;
  const positions = new Float32Array(4 * verticesPerSide * 2 * 3);
  const indices = new Uint32Array(4 * segments * 6);
  let vertexOffset = 0;
  let indexOffset = 0;

  for (let edge = 0; edge < 4; edge += 1) {
    const edgeVertexOffset = vertexOffset;

    for (let i = 0; i < verticesPerSide; i += 1) {
      const sourceIndex = getEdgeSurfaceVertexIndex(edge, i, segments, verticesPerSide);
      const sourceOffset = sourceIndex * 3;
      const topOffset = vertexOffset * 3;
      const bottomOffset = topOffset + 3;

      positions[topOffset] = surfacePositions[sourceOffset];
      positions[topOffset + 1] = surfacePositions[sourceOffset + 1];
      positions[topOffset + 2] = surfacePositions[sourceOffset + 2];
      positions[bottomOffset] = surfacePositions[sourceOffset];
      positions[bottomOffset + 1] = surfacePositions[sourceOffset + 1]
        - CHUNK_SKIRT_BOTTOM_MARGIN;
      positions[bottomOffset + 2] = surfacePositions[sourceOffset + 2];
      vertexOffset += 2;
    }

    for (let i = 0; i < segments; i += 1) {
      const topFirst = edgeVertexOffset + i * 2;
      const bottomFirst = topFirst + 1;
      const topSecond = topFirst + 2;
      const bottomSecond = topFirst + 3;

      indices[indexOffset] = topFirst;
      indices[indexOffset + 1] = bottomFirst;
      indices[indexOffset + 2] = topSecond;
      indices[indexOffset + 3] = topSecond;
      indices[indexOffset + 4] = bottomFirst;
      indices[indexOffset + 5] = bottomSecond;
      indexOffset += 6;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.boundingSphere = createChunkBoundingSphere(minX, minZ, true);
  return geometry;
}

function getEdgeSurfaceVertexIndex(edge, index, segments, verticesPerSide) {
  if (edge === 0) return index;
  if (edge === 1) return segments * verticesPerSide + index;
  if (edge === 2) return index * verticesPerSide;
  return index * verticesPerSide + segments;
}

function createChunkBoundingSphere(minX, minZ, includeSkirt) {
  const verticalRadius = MAX_HEIGHT / 2 + (includeSkirt ? 32 : 24);

  return new THREE.Sphere(
    new THREE.Vector3(minX + CHUNK_SIZE / 2, MAX_HEIGHT / 2, minZ + CHUNK_SIZE / 2),
    Math.hypot(CHUNK_SIZE / 2, CHUNK_SIZE / 2, verticalRadius),
  );
}

function createTerrainSkirtMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0x465044,
    fog: true,
    side: THREE.DoubleSide,
  });
}

function createTerrainShadowProxy(terrain) {
  const verticesPerSide = SHADOW_PROXY_SEGMENTS + 1;
  const positions = new Float32Array(verticesPerSide * verticesPerSide * 3);
  const indices = new Uint32Array(SHADOW_PROXY_SEGMENTS * SHADOW_PROXY_SEGMENTS * 6);
  const vertexStep = MAP_SIZE / SHADOW_PROXY_SEGMENTS;
  let positionOffset = 0;
  let indexOffset = 0;

  for (let z = 0; z < verticesPerSide; z += 1) {
    for (let x = 0; x < verticesPerSide; x += 1) {
      const worldX = -HALF_MAP_SIZE + x * vertexStep;
      const worldZ = -HALF_MAP_SIZE + z * vertexStep;

      positions[positionOffset] = worldX;
      positions[positionOffset + 1] = terrain.getShadowProxyHeightAt(worldX, worldZ);
      positions[positionOffset + 2] = worldZ;
      positionOffset += 3;
    }
  }

  for (let z = 0; z < SHADOW_PROXY_SEGMENTS; z += 1) {
    for (let x = 0; x < SHADOW_PROXY_SEGMENTS; x += 1) {
      const topLeft = z * verticesPerSide + x;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + verticesPerSide;
      const bottomRight = bottomLeft + 1;

      indices[indexOffset] = topLeft;
      indices[indexOffset + 1] = bottomLeft;
      indices[indexOffset + 2] = topRight;
      indices[indexOffset + 3] = topRight;
      indices[indexOffset + 4] = bottomLeft;
      indices[indexOffset + 5] = bottomRight;
      indexOffset += 6;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(0, MAX_HEIGHT / 2, 0),
    Math.hypot(HALF_MAP_SIZE, HALF_MAP_SIZE, MAX_HEIGHT / 2),
  );
  const material = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
  });
  const shadowProxy = new THREE.Mesh(geometry, material);

  shadowProxy.name = 'TerrainShadowProxy';
  shadowProxy.castShadow = true;
  shadowProxy.receiveShadow = false;
  shadowProxy.layers.set(TERRAIN_SHADOW_PROXY_LAYER);
  shadowProxy.raycast = disableRaycast;
  shadowProxy.userData.isTerrainShadowProxy = true;
  shadowProxy.userData.terrainSegments = SHADOW_PROXY_SEGMENTS;

  return shadowProxy;
}

function disposeChunkRecord(record) {
  if (!record || record.disposed) return;
  record.disposed = true;
  record.surface?.geometry.dispose();
  record.skirt?.geometry.dispose();
}

function disableRaycast() {}

function getConservativeMinimumChunkSegments(bounds) {
  const mountainTrailMinimum = getMountainTrailMinimumSegmentsForBounds(bounds);
  const waterMinimum = getWaterSystemMinimumSegmentsForBounds(bounds);
  const lowlandMinimum = getLowlandMinimumSegmentsForBounds(bounds);

  return Math.max(mountainTrailMinimum, waterMinimum, lowlandMinimum);
}

function getCurrentTime() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function getHeightDither(x, z) {
  return valueNoise(x * HEIGHT_DITHER_FREQUENCY, z * HEIGHT_DITHER_FREQUENCY)
    * HEIGHT_DITHER_AMPLITUDE;
}

function valueNoise(x, z) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = smoothstep(x - x0);
  const tz = smoothstep(z - z0);
  const a = random2d(x0, z0);
  const b = random2d(x0 + 1, z0);
  const c = random2d(x0, z0 + 1);
  const d = random2d(x0 + 1, z0 + 1);
  const top = THREE.MathUtils.lerp(a, b, tx);
  const bottom = THREE.MathUtils.lerp(c, d, tx);

  return THREE.MathUtils.lerp(top, bottom, tz) * 2 - 1;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function smoothstepRange(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return smoothstep(t);
}

function random2d(x, z) {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;

  return value - Math.floor(value);
}
