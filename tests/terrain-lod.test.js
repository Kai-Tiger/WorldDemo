import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { getLowlandMinimumSegmentsForBounds } from '../src/lowlandLandforms.js';
import { Terrain } from '../src/terrain.js';
import { CENTRAL_PEAK_MAX_HEIGHT, upliftCentralHeight } from '../src/terrainExpansion.js';

function createTerrain(options = {}, size = 32) {
  const heightData = new Uint8ClampedArray(size * size * 4);
  const texture = new THREE.Texture();

  for (let index = 0; index < heightData.length; index += 4) {
    heightData[index] = 96;
    heightData[index + 1] = 96;
    heightData[index + 2] = 96;
    heightData[index + 3] = 255;
  }

  return new Terrain(heightData, size, size, {
    rock: texture,
    rockNormal: texture,
    forestFloorBaseColor: texture,
    forestFloorNormal: texture,
    riverBank: texture,
    riverBed: texture,
    riverGravel: texture,
  }, {
    minimumSegmentsForChunk: () => 0,
    ...options,
  });
}

function completeNextScheduledChunk(terrain) {
  const task = terrain.getNextChunkBuildTask();

  if (!task) return;

  terrain.loadedChunks.set(task.key, {
    key: task.key,
    chunkX: task.chunkX,
    chunkZ: task.chunkZ,
    minX: task.minX,
    minZ: task.minZ,
    segments: task.segments,
    revision: task.revision,
  });
  terrain.pendingChunks.delete(task.key);
}

test('smoothed pixel samples are cached and a brush invalidates the local cache', () => {
  const terrain = createTerrain();
  const originalGetPixelHeight = terrain.getPixelHeight.bind(terrain);
  let pixelReads = 0;

  terrain.getPixelHeight = (...args) => {
    pixelReads += 1;
    return originalGetPixelHeight(...args);
  };

  terrain.getSampledPixelHeight(16, 16);
  const initialReads = pixelReads;
  terrain.getSampledPixelHeight(16, 16);
  assert.equal(pixelReads, initialReads);

  terrain.applyHeightBrush(0, 0, 12, 1);
  terrain.getSampledPixelHeight(16, 16);
  assert.ok(pixelReads > initialReads);
});

test('mountain smoothing removes narrow needles while preserving broad summits', () => {
  const size = 512;
  const terrain = createTerrain({}, size);
  const baseCode = 170;
  const center = Math.floor(size / 2);

  for (let index = 0; index < terrain.heightData.length; index += 4) {
    terrain.heightData[index] = baseCode;
    terrain.heightData[index + 1] = baseCode;
    terrain.heightData[index + 2] = baseCode;
  }

  for (let y = center - 2; y <= center + 2; y += 1) {
    for (let x = center - 2; x <= center + 2; x += 1) {
      const index = (y * size + x) * 4;
      terrain.heightData[index] = 255;
      terrain.heightData[index + 1] = 255;
      terrain.heightData[index + 2] = 255;
    }
  }

  terrain.rebuildMountainHeightField();
  terrain.sampledHeightCache.fill(Number.NaN);
  const narrowPeak = terrain.getSampledPixelHeight(center, center);
  let previousPeak = -Infinity;

  for (let peakCode = baseCode; peakCode <= 255; peakCode += 5) {
    for (let y = center - 2; y <= center + 2; y += 1) {
      for (let x = center - 2; x <= center + 2; x += 1) {
        const index = (y * size + x) * 4;
        terrain.heightData[index] = peakCode;
        terrain.heightData[index + 1] = peakCode;
        terrain.heightData[index + 2] = peakCode;
      }
    }

    terrain.rebuildMountainHeightField();
    terrain.sampledHeightCache.fill(Number.NaN);
    const currentPeak = terrain.getSampledPixelHeight(center, center);
    assert.ok(currentPeak >= previousPeak, `local height inversion at code ${peakCode}`);
    previousPeak = currentPeak;
  }

  terrain.heightData.fill(255);
  terrain.rebuildMountainHeightField();
  terrain.sampledHeightCache.fill(Number.NaN);
  const broadSummit = terrain.getSampledPixelHeight(center, center);

  assert.ok(narrowPeak < 230);
  assert.ok(Math.abs(broadSummit - 300) < 1e-9);
});

test('mountain smoothing turns a vertical source wall into a broad slope', () => {
  const size = 512;
  const terrain = createTerrain({}, size);
  const center = Math.floor(size / 2);

  for (let index = 0; index < terrain.heightData.length; index += 4) {
    terrain.heightData[index] = 170;
    terrain.heightData[index + 1] = 170;
    terrain.heightData[index + 2] = 170;
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = center; x < size; x += 1) {
      const index = (y * size + x) * 4;
      terrain.heightData[index] = 255;
      terrain.heightData[index + 1] = 255;
      terrain.heightData[index + 2] = 255;
    }
  }

  terrain.rebuildMountainHeightField();
  terrain.sampledHeightCache.fill(Number.NaN);

  let maximumStep = 0;

  for (let x = center - 40; x <= center + 40; x += 1) {
    const current = upliftCentralHeight(terrain.getSampledPixelHeight(x, center));
    const next = upliftCentralHeight(terrain.getSampledPixelHeight(x + 1, center));
    maximumStep = Math.max(maximumStep, next - current);
  }

  assert.ok(maximumStep < 4, `vertical mountain step remained ${maximumStep.toFixed(2)}m`);
});

test('shadow proxy keeps macro basins but ignores narrow tree-river cuts', () => {
  const terrain = createTerrain();
  const baseAtJunction = terrain.getBaseHeightAt(16, -352);
  const visibleJunction = terrain.getHeightAt(16, -352);
  const proxyJunction = terrain.getShadowProxyHeightAt(16, -352);
  const lakeBase = terrain.getBaseHeightAt(300, -400);
  const proxyLake = terrain.getShadowProxyHeightAt(300, -400);

  assert.ok(visibleJunction < baseAtJunction - 20);
  assert.ok(Math.abs(proxyJunction - baseAtJunction) < 1e-6);
  assert.ok(proxyLake < lakeBase - 20);
});

test('source lowlands remain exact while sharp source summits compress to 350 meters', () => {
  const terrain = createTerrain();
  const sourceLowland = terrain.getSourceHeightAt(0, 0);

  assert.ok(sourceLowland <= 185);
  assert.equal(terrain.getBaseHeightAt(0, 0), sourceLowland);

  for (let index = 0; index < terrain.heightData.length; index += 4) {
    terrain.heightData[index] = 255;
    terrain.heightData[index + 1] = 255;
    terrain.heightData[index + 2] = 255;
  }
  terrain.rebuildMountainHeightField();
  terrain.sampledHeightCache.fill(Number.NaN);

  assert.ok(terrain.getSourceHeightAt(0, 0) >= 299);
  assert.ok(terrain.getBaseHeightAt(0, 0) > CENTRAL_PEAK_MAX_HEIGHT - 1);
  assert.ok(terrain.getBaseHeightAt(0, 0) <= CENTRAL_PEAK_MAX_HEIGHT);
});

test('outer terrain joins all old-map sides and corners with matching first derivatives', () => {
  const terrain = createTerrain();
  const epsilon = 1e-3;
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  for (const [directionX, directionZ] of directions) {
    const directionLength = Math.hypot(directionX, directionZ);
    const normalX = directionX / directionLength;
    const normalZ = directionZ / directionLength;
    const edgeX = directionX === 0 ? 137 : directionX * 1024;
    const edgeZ = directionZ === 0 ? -211 : directionZ * 1024;
    const insideX = edgeX - normalX;
    const insideZ = edgeZ - normalZ;
    const outsideX = edgeX + normalX * epsilon;
    const outsideZ = edgeZ + normalZ * epsilon;
    const edgeHeight = terrain.getBaseHeightAt(edgeX, edgeZ);
    const inwardSlope = edgeHeight - terrain.getBaseHeightAt(insideX, insideZ);
    const outwardSlope = (
      terrain.getBaseHeightAt(outsideX, outsideZ) - edgeHeight
    ) / epsilon;

    assert.ok(Math.abs(outwardSlope - inwardSlope) < 1e-4);
  }
});

test('shadow proxy covers the expanded 600 meter terrain envelope at 128 segments', () => {
  const terrain = createTerrain();
  const bounds = terrain.shadowProxy.geometry.boundingSphere;

  assert.equal(terrain.shadowProxy.userData.terrainSegments, 128);
  assert.equal(bounds.center.y, 300);
  assert.equal(bounds.radius, Math.hypot(2048, 2048, 300));
});

test('quality presets keep the center at 256 and use preset values down to 32', () => {
  const terrain = createTerrain();

  terrain.setQualityPreset({ lodSegments: [128, 64, 32], buildBudgetMs: 5 });
  terrain.centerChunkX = 3;
  terrain.centerChunkZ = 3;

  assert.equal(terrain.getDesiredChunkSegments(3, 3), 256);
  terrain.loadedChunks.set('3,3', { segments: 64 });
  terrain.loadedChunks.set('4,3', { segments: 64 });
  terrain.loadedChunks.set('5,3', { segments: 64 });
  terrain.loadedChunks.set('6,3', { segments: 32 });
  assert.equal(terrain.getDesiredChunkSegments(3, 3), 256);
  assert.equal(terrain.getDesiredChunkSegments(4, 3), 128);
  assert.equal(terrain.getDesiredChunkSegments(5, 3), 64);
  assert.equal(terrain.getDesiredChunkSegments(6, 3), 32);
  assert.equal(terrain.buildBudgetMs, 5);
});

test('the outermost ring follows its inward neighbor LOD only when approached', () => {
  const terrain = createTerrain();

  terrain.setQualityPreset({ lodSegments: [256, 128, 64, 32] });
  terrain.centerChunkX = 12;
  terrain.centerChunkZ = 8;

  assert.equal(terrain.getDesiredChunkSegments(14, 8), 64);
  assert.equal(terrain.getDesiredChunkSegments(15, 8), 64);

  terrain.centerChunkX = 8;
  terrain.centerChunkZ = 8;

  assert.equal(terrain.getDesiredChunkSegments(14, 8), 32);
  assert.equal(terrain.getDesiredChunkSegments(15, 8), 32);
});

test('initial readiness waits for the spawn chunk while the full map keeps loading', async () => {
  const terrain = createTerrain();
  const animationFrames = [];
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;

  globalThis.requestAnimationFrame = (callback) => {
    animationFrames.push(callback);
    return animationFrames.length;
  };
  terrain.processChunkBuilds = () => completeNextScheduledChunk(terrain);

  try {
    const ready = terrain.prepareInitialChunk({ x: 335, z: -358 });

    assert.equal(terrain.loadedChunks.size, 0);
    assert.equal(terrain.pendingChunks.size, 256);
    assert.equal(animationFrames.length, 1);

    animationFrames.shift()();
    await ready;

    assert.equal(terrain.loadedChunks.has('9,6'), true);
    assert.equal(terrain.loadedChunks.size, 1);
    assert.equal(terrain.pendingChunks.size, 255);

    while (terrain.pendingChunks.size > 0) terrain.update();

    assert.equal(terrain.loadedChunks.size, 256);
    assert.equal(terrain.pendingChunks.size, 0);
    assert.deepEqual([terrain.centerChunkX, terrain.centerChunkZ], [9, 6]);
    assert.equal(
      terrain.getAllChunkKeys().every((key) => terrain.loadedChunks.has(key)),
      true,
    );
  } finally {
    if (originalRequestAnimationFrame) {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    } else {
      delete globalThis.requestAnimationFrame;
    }
  }
});

test('quality changes replace unfinished terrain tasks with the new LOD', () => {
  const terrain = createTerrain();

  terrain.centerChunkX = 3;
  terrain.centerChunkZ = 3;
  terrain.setQualityPreset({ lodSegments: [256, 128, 64] });
  terrain.scheduleChunks(terrain.getAllChunkKeys());

  const oldTask = terrain.pendingChunks.get('4,3');
  assert.equal(oldTask.segments, 128);
  terrain.advanceChunkBuildTask(oldTask, Number.POSITIVE_INFINITY);
  assert.equal(oldTask.phase, 'vertices');

  terrain.setQualityPreset({ lodSegments: [256, 64] });

  const replacementTask = terrain.pendingChunks.get('4,3');
  assert.equal(terrain.pendingChunks.size, 256);
  assert.notEqual(replacementTask, oldTask);
  assert.equal(replacementTask.segments, 64);
  assert.equal(replacementTask.phase, 'allocate');
  assert.equal(terrain.pendingChunks.get('3,3').segments, 256);
});

test('full terrain coverage stays fixed while LOD priority follows player movement', () => {
  const terrain = createTerrain();
  const keys = terrain.getAllChunkKeys();

  terrain.centerChunkX = terrain.getChunkCoord(335);
  terrain.centerChunkZ = terrain.getChunkCoord(-358);
  terrain.scheduleChunks(keys);
  terrain.update({ x: -900, z: 900 });

  assert.equal(keys.length, 256);
  assert.equal(keys[0], '0,0');
  assert.equal(keys.at(-1), '15,15');
  assert.deepEqual([terrain.centerChunkX, terrain.centerChunkZ], [4, 11]);
  assert.equal(terrain.pendingChunks.get('4,11').priority, 0);
  assert.ok(terrain.pendingChunks.get('9,6').priority > 0);
});

test('feature floors keep the existing water and the tree river network at full detail', () => {
  const terrain = createTerrain({ minimumSegmentsForChunk: undefined });
  const getSegmentsAt = (x, z) => terrain.getDesiredChunkSegments(
    terrain.getChunkCoord(x),
    terrain.getChunkCoord(z),
  );

  terrain.setQualityPreset({ lodSegments: [256, 128, 64] });
  terrain.centerChunkX = terrain.getChunkCoord(0);
  terrain.centerChunkZ = terrain.getChunkCoord(0);

  assert.equal(getSegmentsAt(128, -640), 256);
  assert.equal(getSegmentsAt(640, -640), 256);
  assert.equal(getSegmentsAt(-384, -384), 256);
  assert.equal(getSegmentsAt(-640, 640), 256);
});

test('hero tributaries and their full bank corridors receive only local terrain detail floors', () => {
  const getPointBounds = (x, z) => ({
    minX: x - 0.25,
    maxX: x + 0.25,
    minZ: z - 0.25,
    maxZ: z + 0.25,
  });

  assert.equal(getLowlandMinimumSegmentsForBounds(getPointBounds(635, -300)), 256);
  assert.equal(getLowlandMinimumSegmentsForBounds(getPointBounds(700, -270)), 256);
  assert.equal(getLowlandMinimumSegmentsForBounds(getPointBounds(710.5, -270)), 256);
  assert.equal(getLowlandMinimumSegmentsForBounds(getPointBounds(606, -349)), 256);
  assert.equal(getLowlandMinimumSegmentsForBounds({
    minX: 512,
    maxX: 768,
    minZ: -256,
    maxZ: 0,
  }), 0);
});

test('build priorities order center recovery before visible, upgrades, and downgrades', () => {
  const terrain = createTerrain();

  terrain.centerChunkX = 3;
  terrain.centerChunkZ = 3;
  const missingCenter = terrain.getChunkBuildPriority(3, 3, 64);
  terrain.loadedChunks.set('3,3', { segments: 64 });
  terrain.loadedChunks.set('3,4', { segments: 64 });
  terrain.loadedChunks.set('2,3', { segments: 128 });
  const centerUpgrade = terrain.getChunkBuildPriority(3, 3, 256);
  const newVisible = terrain.getChunkBuildPriority(4, 3, 64);
  const nearUpgrade = terrain.getChunkBuildPriority(3, 4, 128);
  const downgrade = terrain.getChunkBuildPriority(2, 3, 64);

  assert.ok(missingCenter < centerUpgrade);
  assert.ok(centerUpgrade < newVisible);
  assert.ok(newVisible < nearUpgrade);
  assert.ok(nearUpgrade < downgrade);
});

test('editor mode temporarily promotes the player neighborhood to 256', () => {
  const terrain = createTerrain();

  terrain.setQualityPreset({ lodSegments: [256, 128, 64] });
  terrain.centerChunkX = 3;
  terrain.centerChunkZ = 3;
  terrain.loadedChunks.set('4,3', {
    key: '4,3',
    chunkX: 4,
    chunkZ: 3,
    segments: 64,
    revision: 0,
  });
  terrain.requestChunkBuild(3, 4, 128, 0);

  terrain.setEditorMode(true);
  assert.equal(terrain.getDesiredChunkSegments(4, 3), 256);
  assert.equal(terrain.pendingChunks.get('3,4').segments, 256);
  terrain.setEditorMode(false);
  assert.equal(terrain.getDesiredChunkSegments(4, 3), 128);
  assert.equal(terrain.pendingChunks.get('3,4').segments, 128);
});

test('editing an unloaded chunk reschedules its cancelled terrain task', () => {
  const terrain = createTerrain();

  terrain.centerChunkX = 3;
  terrain.centerChunkZ = 3;
  terrain.requestChunkBuild(4, 4, 128, 0);
  const staleTask = terrain.pendingChunks.get('4,4');

  terrain.refreshChunksInBounds({
    minX: -1000,
    maxX: -990,
    minZ: -1000,
    maxZ: -990,
  });

  const replacementTask = terrain.pendingChunks.get('4,4');
  assert.notEqual(replacementTask, staleTask);
  assert.equal(replacementTask.revision, 1);
  assert.equal(replacementTask.segments, 128);
});

test('LOD replacement retains the old surface until an atomic swap and disposes both geometries', () => {
  const terrain = createTerrain({ now: () => 0 });

  terrain.requestChunkBuild(0, 0, 64, 0);
  terrain.processChunkBuilds();
  const original = terrain.loadedChunks.get('0,0');
  let surfaceDisposed = false;
  let skirtDisposed = false;

  original.surface.geometry.addEventListener('dispose', () => {
    surfaceDisposed = true;
  });
  original.skirt.geometry.addEventListener('dispose', () => {
    skirtDisposed = true;
  });

  terrain.requestChunkBuild(0, 0, 128, 0);
  assert.equal(terrain.loadedChunks.get('0,0'), original);
  terrain.processChunkBuilds();

  const replacement = terrain.loadedChunks.get('0,0');
  assert.notEqual(replacement, original);
  assert.equal(surfaceDisposed, true);
  assert.equal(skirtDisposed, true);
  assert.deepEqual(terrain.getRaycastMeshes(), [replacement.surface]);
  assert.equal(replacement.surface.userData.isTerrainSurface, true);
  assert.equal(replacement.skirt.userData.isTerrainSkirt, true);
  assert.equal(replacement.skirt.raycast.name, 'disableRaycast');

  const surfacePositions = replacement.surface.geometry.getAttribute('position').array;
  let minimumHeight = Infinity;
  let maximumHeight = -Infinity;

  for (let offset = 1; offset < surfacePositions.length; offset += 3) {
    minimumHeight = Math.min(minimumHeight, surfacePositions[offset]);
    maximumHeight = Math.max(maximumHeight, surfacePositions[offset]);
  }
  assert.ok(Math.abs(
    replacement.surface.geometry.boundingSphere.center.y
      - (minimumHeight + maximumHeight) / 2,
  ) < 1e-6);

  const skirtPositions = replacement.skirt.geometry.getAttribute('position').array;
  const verticesPerEdge = (replacement.segments + 1) * 2;
  for (let edge = 0; edge < 4; edge += 1) {
    for (let index = 0; index <= replacement.segments; index += 1) {
      const topVertex = edge * verticesPerEdge + index * 2;
      const bottomVertex = edge * verticesPerEdge + index * 2 + 1;
      const expectedBottom = skirtPositions[topVertex * 3 + 1] - 2;
      assert.ok(Math.abs(skirtPositions[bottomVertex * 3 + 1] - expectedBottom) < 0.0001);
    }
  }
});

test('deadline slicing keeps work pending and a revision cancels stale work', () => {
  let clock = 0;
  const terrain = createTerrain({
    buildBudgetMs: 3,
    now: () => {
      clock += 1;
      return clock;
    },
  });

  terrain.requestChunkBuild(0, 0, 64, 0);
  const staleTask = terrain.pendingChunks.get('0,0');
  terrain.processChunkBuilds();
  assert.equal(terrain.loadedChunks.has('0,0'), false);
  assert.equal(terrain.pendingChunks.get('0,0'), staleTask);

  const revision = terrain.bumpChunkRevision('0,0');
  assert.equal(terrain.pendingChunks.has('0,0'), false);
  terrain.requestChunkBuild(0, 0, 64, 0);

  let frames = 0;
  while (terrain.pendingChunks.size > 0) {
    terrain.processChunkBuilds();
    frames += 1;
    assert.ok(frames < 10000);
  }

  assert.equal(terrain.loadedChunks.get('0,0').revision, revision);
});

test('a completed stale task cannot replace the currently loaded chunk', () => {
  const terrain = createTerrain({ now: () => 0 });

  terrain.requestChunkBuild(0, 0, 64, 0);
  terrain.processChunkBuilds();
  const current = terrain.loadedChunks.get('0,0');
  terrain.requestChunkBuild(0, 0, 128, 0);
  const staleTask = terrain.pendingChunks.get('0,0');

  while (staleTask.phase !== 'complete') {
    terrain.advanceChunkBuildTask(staleTask, Number.POSITIVE_INFINITY);
  }

  terrain.chunkRevisions.set('0,0', staleTask.revision + 1);
  terrain.commitChunkBuildTask(staleTask);

  assert.equal(terrain.loadedChunks.get('0,0'), current);
  assert.equal(terrain.pendingChunks.has('0,0'), false);
  assert.equal(staleTask.result.disposed, true);
});

test('brush refresh bounds include the mountain smoothing halo', () => {
  const terrain = createTerrain();
  let refreshedBounds = null;

  terrain.refreshChunksInBounds = (bounds) => {
    refreshedBounds = bounds;
  };

  const dirtyPixels = terrain.applyHeightBrush(0, 0, 12, 1);
  const topLeft = terrain.heightMapPixelToWorld(dirtyPixels.minX, dirtyPixels.minY);
  const bottomRight = terrain.heightMapPixelToWorld(
    dirtyPixels.minX + dirtyPixels.width - 1,
    dirtyPixels.minY + dirtyPixels.height - 1,
  );

  assert.equal(refreshedBounds.minX, Math.min(topLeft.x, bottomRight.x) - 97);
  assert.equal(refreshedBounds.maxX, Math.max(topLeft.x, bottomRight.x) + 97);
  assert.equal(refreshedBounds.minZ, Math.min(topLeft.z, bottomRight.z) - 97);
  assert.equal(refreshedBounds.maxZ, Math.max(topLeft.z, bottomRight.z) + 97);
});

test('an edit stroke patches live and queues one forced rebuild per dirty chunk', () => {
  const terrain = createTerrain({ now: () => 0 });

  terrain.requestChunkBuild(5, 5, 64, 0);
  terrain.processChunkBuilds();
  const surface = terrain.loadedChunks.get('5,5').surface;
  terrain.centerChunkX = 5;
  terrain.centerChunkZ = 5;
  terrain.setEditorMode(true);
  terrain.beginTerrainEditStroke();

  const requestChunkBuild = terrain.requestChunkBuild.bind(terrain);
  let rebuildRequests = 0;
  terrain.requestChunkBuild = (...args) => {
    if (args[4]) rebuildRequests += 1;
    return requestChunkBuild(...args);
  };

  terrain.applyHeightBrush(-700, -700, 8, 1);
  terrain.applyHeightBrush(-698, -700, 8, 1);
  assert.equal(terrain.loadedChunks.get('5,5').surface, surface);
  assert.equal(rebuildRequests, 0);

  terrain.endTerrainEditStroke();
  assert.equal(rebuildRequests, 1);
  assert.equal(terrain.pendingChunks.get('5,5').segments, 256);
});

test('the heightmap editor rejects the procedural outer terrain', () => {
  const terrain = createTerrain();
  const before = terrain.heightData.slice();

  assert.equal(terrain.isHeightEditableAt(1024, -1024), true);
  assert.equal(terrain.isHeightEditableAt(1024.01, 0), false);
  assert.equal(terrain.applyHeightBrush(1500, 0, 12, 1), null);
  assert.deepEqual(terrain.heightData, before);
});

test('a dirty edge refresh recomputes its full-resolution skirt minimum synchronously', () => {
  const terrain = createTerrain({ now: () => 0 });

  terrain.requestChunkBuild(0, 0, 64, 0);
  terrain.processChunkBuilds();
  const record = terrain.loadedChunks.get('0,0');
  const originalGetHeightAt = terrain.getHeightAt.bind(terrain);
  const troughX = record.minX + 8;

  terrain.getHeightAt = (x, z) => (
    x === troughX && z === record.minZ ? -40 : originalGetHeightAt(x, z)
  );
  terrain.updateLoadedChunkSurface(record, {
    minX: troughX - 1,
    maxX: troughX + 1,
    minZ: record.minZ,
    maxZ: record.minZ + 1,
  });

  assert.equal(record.edgeMinimums[0], -40);
  const skirtPositions = record.skirt.geometry.getAttribute('position').array;
  for (let index = 0; index <= record.segments; index += 1) {
    const topVertex = index * 2;
    const bottomVertex = index * 2 + 1;
    assert.equal(
      skirtPositions[bottomVertex * 3 + 1],
      skirtPositions[topVertex * 3 + 1] - 2,
    );
  }
});
