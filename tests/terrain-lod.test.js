import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { Terrain } from '../src/terrain.js';

function createTerrain(options = {}) {
  const size = 32;
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
    groundDirtAlbedo: texture,
    groundDirtNormal: texture,
    mossAlbedo: texture,
    mossNormal: texture,
    dryGrassAlbedo: texture,
    dryGrassNormal: texture,
    gravelAlbedo: texture,
    gravelNormal: texture,
    blendSplat: texture,
    riverBank: texture,
    riverBed: texture,
  }, {
    minimumSegmentsForChunk: () => 0,
    ...options,
  });
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

test('quality presets keep the center at 256 and use preset values for rings', () => {
  const terrain = createTerrain();

  terrain.setQualityPreset({ lodSegments: [128, 64], buildBudgetMs: 5 });
  terrain.centerChunkX = 3;
  terrain.centerChunkZ = 3;

  assert.equal(terrain.getDesiredChunkSegments(3, 3), 256);
  terrain.loadedChunks.set('3,3', { segments: 64 });
  terrain.loadedChunks.set('4,3', { segments: 64 });
  terrain.loadedChunks.set('5,3', { segments: 64 });
  assert.equal(terrain.getDesiredChunkSegments(3, 3), 256);
  assert.equal(terrain.getDesiredChunkSegments(4, 3), 128);
  assert.equal(terrain.getDesiredChunkSegments(5, 3), 64);
  assert.equal(terrain.buildBudgetMs, 5);
});

test('feature floors keep narrow water at 256 and wide water at 128', () => {
  const terrain = createTerrain({ minimumSegmentsForChunk: undefined });

  terrain.setQualityPreset({ lodSegments: [256, 128, 64] });
  terrain.centerChunkX = 3;
  terrain.centerChunkZ = 3;

  assert.equal(terrain.getDesiredChunkSegments(3, 0), 256);
  assert.equal(terrain.getDesiredChunkSegments(5, 0), 128);
  assert.equal(terrain.getDesiredChunkSegments(0, 5), 64);
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

  terrain.setEditorMode(true);
  assert.equal(terrain.getDesiredChunkSegments(4, 3), 256);
  terrain.setEditorMode(false);
  assert.equal(terrain.getDesiredChunkSegments(4, 3), 128);
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

test('brush refresh bounds include the locked seven meter halo', () => {
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

  assert.equal(refreshedBounds.minX, Math.min(topLeft.x, bottomRight.x) - 7);
  assert.equal(refreshedBounds.maxX, Math.max(topLeft.x, bottomRight.x) + 7);
  assert.equal(refreshedBounds.minZ, Math.min(topLeft.z, bottomRight.z) - 7);
  assert.equal(refreshedBounds.maxZ, Math.max(topLeft.z, bottomRight.z) + 7);
});

test('an edit stroke patches live and queues one forced rebuild per dirty chunk', () => {
  const terrain = createTerrain({ now: () => 0 });

  terrain.requestChunkBuild(0, 0, 64, 0);
  terrain.processChunkBuilds();
  const surface = terrain.loadedChunks.get('0,0').surface;
  terrain.centerChunkX = 0;
  terrain.centerChunkZ = 0;
  terrain.setEditorMode(true);
  terrain.beginTerrainEditStroke();

  const requestChunkBuild = terrain.requestChunkBuild.bind(terrain);
  let rebuildRequests = 0;
  terrain.requestChunkBuild = (...args) => {
    rebuildRequests += 1;
    return requestChunkBuild(...args);
  };

  terrain.applyHeightBrush(-700, -700, 8, 1);
  terrain.applyHeightBrush(-698, -700, 8, 1);
  assert.equal(terrain.loadedChunks.get('0,0').surface, surface);
  assert.equal(rebuildRequests, 0);

  terrain.endTerrainEditStroke();
  assert.equal(rebuildRequests, 1);
  assert.equal(terrain.pendingChunks.get('0,0').segments, 256);
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
