import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as THREE from 'three';
import {
  LOD_DENSITIES,
  buildInstancedMeshes,
  createGrassVariants,
  createPlacement,
  flipGrassTextureVertically,
  hash2,
  normalizeRibbonGrassGeometry,
  sampleGrassCommunity,
  updateGrassClumps,
} from '../src/grassClumps.js';
import { GrassZone } from '../src/grassZone.js';
import {
  DEFAULT_GRASS_PRESET,
  GrassManager,
  normalizeGrassPreset,
} from '../src/grassManager.js';
import { RENDER_QUALITY_PRESETS } from '../src/renderQuality.js';
import {
  GRASS_CANDIDATE_JITTER,
  GRASS_ROOT_EMBED_DEPTH,
  GRASS_SWAY_FADE_END,
  GRASS_SWAY_FADE_START,
  GRASS_SWAY_FLUTTER_FREQUENCY,
  GRASS_SWAY_PLAYER_RADIUS,
  GRASS_SWAY_PRIMARY_FREQUENCY,
  GRASS_SWAY_REGIONAL_STRENGTH,
  GRASS_SWAY_STRENGTH,
} from '../src/vegetationConfig.js';

const VARIANT_NAME = 'RibbonGrass_VarA';
const DISTANCES = [10, 50, 100];
const KEEP_ALL = [1, 0.4, 0.1];
const FADE_DISTANCE = 4;

function createVariants() {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial();

  return {
    geometry,
    material,
    variants: new Map([[
      VARIANT_NAME,
      {
        lods: [0, 1, 2].map((lodLevel) => [{
          name: `Leaf_LOD${lodLevel}`,
          geometry,
          material,
        }]),
      },
    ]]),
  };
}

function createTestPlacement(x, lodRoll = 0, transitionRoll = 0, isDry = false) {
  return {
    matrix: new THREE.Matrix4().makeTranslation(x, 0, 0),
    variantName: VARIANT_NAME,
    isDry,
    lodRoll,
    transitionRoll,
  };
}

function createZone(placements) {
  const fixture = createVariants();
  const zone = new GrassZone({}, fixture.variants, 0, 0, 64, 64);

  zone.allPlacements = placements;
  zone.initializePersistentMeshes();

  return { ...fixture, zone };
}

function completeJob(zone, playerX, revision = 0, steps = 1000) {
  assert.equal(zone.startLODJob(
    playerX,
    0,
    DISTANCES,
    KEEP_ALL,
    revision,
    FADE_DISTANCE,
  ), true);

  while (!zone.processLODJob(steps)) {
    // Drain the deliberately incremental job.
  }
}

function getMesh(zone, lodLevel) {
  return zone.lodMeshes[lodLevel].get(VARIANT_NAME).meshes[0];
}

function generateGrassZone(minX, minZ, maxX, maxZ) {
  let sampleCalls = 0;
  const terrain = {
    sampleSurfaceAt(_x, _z, target) {
      sampleCalls += 1;
      Object.assign(target, {
        height: 12,
        normalX: 0,
        normalY: 1,
        normalZ: 0,
        groundMask: 1,
      });
      return target;
    },
  };
  const zone = new GrassZone(terrain, new Map(), minX, minZ, maxX, maxZ);

  zone.startGeneration(LOD_DENSITIES[0]);
  while (!zone.processGeneration(128)) {
    // Drain the incremental world-space candidate iterator.
  }

  return { placements: zone.allPlacements, sampleCalls };
}

function placementKey(placement) {
  return JSON.stringify([
    placement.variantName,
    placement.isDry,
    placement.lodRoll,
    placement.transitionRoll,
    placement.matrix.elements,
  ]);
}

test('createPlacement assigns independent stable rolls with nested quality subsets', () => {
  const terrain = {
    getHeightAt: () => 0,
    getNormalAt: () => new THREE.Vector3(0, 1, 0),
  };
  const first = createPlacement(terrain, 1, 2, 7, 9);
  const moved = createPlacement(terrain, 30, 40, 7, 9);
  const community = sampleGrassCommunity(1, 2, 7, 9);
  const forcedDryState = createPlacement(terrain, 1, 2, 7, 9, {
    influence: 1,
    variantName: VARIANT_NAME,
    isDry: !community.isDry,
  });

  assert.equal(first.lodRoll, moved.lodRoll);
  assert.equal(first.transitionRoll, moved.transitionRoll);
  assert.ok(first.lodRoll >= 0 && first.lodRoll < 1);
  assert.ok(first.transitionRoll >= 0 && first.transitionRoll < 1);
  assert.notEqual(first.lodRoll, first.transitionRoll);
  assert.equal(first.isDry, community.isDry);
  assert.equal(forcedDryState.isDry, !community.isDry);

  const rolls = Array.from({ length: 128 }, (_value, index) => (
    createPlacement(terrain, index, index * 2, index, index * 3).lodRoll
  ));
  const performance = [0.6, 0.18, 0.03];
  const balanced = [1, 0.25, 0.05];
  const quality = [1, 0.4, 0.1];

  for (let lodLevel = 0; lodLevel < 3; lodLevel += 1) {
    for (const roll of rolls) {
      if (roll < performance[lodLevel]) assert.ok(roll < balanced[lodLevel]);
      if (roll < balanced[lodLevel]) assert.ok(roll < quality[lodLevel]);
    }
  }
});

test('world-space communities are deterministic and retain the candidate budget', () => {
  assert.equal(LOD_DENSITIES[0], 40 / 7);

  const cellSize = Math.sqrt(1 / LOD_DENSITIES[0]);
  const deterministicSample = sampleGrassCommunity(12.3, -44.1, 7, 9);
  const gridSize = 400;
  const gridHalf = gridSize / 2;
  const drySamples = new Uint8Array(gridSize * gridSize);
  let accepted = 0;
  let acceptedDry = 0;
  let count = 0;
  let dryCandidates = 0;
  let minAcceptance = 1;
  let maxAcceptance = 0;

  assert.deepEqual(deterministicSample, sampleGrassCommunity(12.3, -44.1, 7, 9));

  for (let gridZ = -gridHalf; gridZ < gridHalf; gridZ += 1) {
    for (let gridX = -gridHalf; gridX < gridHalf; gridX += 1) {
      const jitterX = (hash2(gridX, gridZ) - 0.5) * GRASS_CANDIDATE_JITTER;
      const jitterZ = (hash2(gridX + 17.31, gridZ - 9.73) - 0.5) * GRASS_CANDIDATE_JITTER;
      const x = (gridX + 0.5 + jitterX) * cellSize;
      const z = (gridZ + 0.5 + jitterZ) * cellSize;
      const community = sampleGrassCommunity(x, z, gridX, gridZ);
      const index = (gridZ + gridHalf) * gridSize + gridX + gridHalf;

      accepted += Number(community.accepted);
      acceptedDry += Number(community.accepted && community.isDry);
      dryCandidates += Number(community.isDry);
      drySamples[index] = Number(community.isDry);
      count += 1;
      minAcceptance = Math.min(minAcceptance, community.acceptance);
      maxAcceptance = Math.max(maxAcceptance, community.acceptance);
    }
  }

  const acceptanceRatio = accepted / count;
  const dryRatio = dryCandidates / count;
  const acceptedDryRatio = acceptedDry / accepted;
  const greenCandidateDensity = LOD_DENSITIES[0] * (1 - dryRatio);
  const conditionalDryRatio = (offset) => {
    const directions = [[offset, 0], [-offset, 0], [0, offset], [0, -offset]];
    let dryPairs = 0;
    let dryNeighbors = 0;

    for (let z = 0; z < gridSize; z += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        if (!drySamples[z * gridSize + x]) continue;

        for (const [dx, dz] of directions) {
          const neighborX = x + dx;
          const neighborZ = z + dz;

          if (neighborX < 0 || neighborX >= gridSize) continue;
          if (neighborZ < 0 || neighborZ >= gridSize) continue;
          dryPairs += 1;
          dryNeighbors += drySamples[neighborZ * gridSize + neighborX];
        }
      }
    }

    return dryNeighbors / dryPairs;
  };
  const oneMeterDryRatio = conditionalDryRatio(Math.round(1 / cellSize));
  const fiveMeterDryRatio = conditionalDryRatio(Math.round(5 / cellSize));

  assert.ok(acceptanceRatio >= 0.55);
  assert.ok(acceptanceRatio <= 0.7);
  assert.ok(minAcceptance <= 0.1);
  assert.ok(maxAcceptance >= 0.95);
  assert.ok(maxAcceptance / minAcceptance >= 6);
  assert.ok(Math.abs(LOD_DENSITIES[0] * 0.875 - 5) < 0.000001);
  assert.ok(greenCandidateDensity >= 4.9 && greenCandidateDensity <= 5.1);
  assert.ok(acceptedDryRatio >= 0.1 && acceptedDryRatio <= 0.15);
  assert.ok(oneMeterDryRatio >= dryRatio * 3);
  assert.ok(Math.abs(fiveMeterDryRatio - dryRatio) <= 0.04);
});

test('global cells join adjacent half-open zones without seams or duplicates', () => {
  const left = generateGrassZone(-128, -128, -112, -112);
  const right = generateGrassZone(-112, -128, -96, -112);
  const combined = generateGrassZone(-128, -128, -96, -112);
  const repeated = generateGrassZone(-128, -128, -96, -112);
  const leftKeys = new Set(left.placements.map(placementKey));
  const rightKeys = new Set(right.placements.map(placementKey));
  const joinedKeys = new Set([...leftKeys, ...rightKeys]);
  const combinedKeys = new Set(combined.placements.map(placementKey));

  assert.ok(left.placements.every((placement) => placement.matrix.elements[12] < -112));
  assert.ok(right.placements.every((placement) => placement.matrix.elements[12] >= -112));
  assert.ok([...leftKeys].every((key) => !rightKeys.has(key)));
  assert.equal(joinedKeys.size, leftKeys.size + rightKeys.size);
  assert.deepEqual([...joinedKeys].sort(), [...combinedKeys].sort());
  assert.deepEqual(
    repeated.placements.map(placementKey).sort(),
    combined.placements.map(placementKey).sort(),
  );
  assert.equal(left.sampleCalls, left.placements.length);
  assert.equal(right.sampleCalls, right.placements.length);
  assert.equal(combined.sampleCalls, combined.placements.length);
});

test('one community favors 72/20/8 variants and scales cores above edges', () => {
  const counts = new Map();
  const reference = sampleGrassCommunity(12.3, -44.1, 0, 0);

  for (let gridZ = 0; gridZ < 100; gridZ += 1) {
    for (let gridX = 0; gridX < 100; gridX += 1) {
      const sample = sampleGrassCommunity(12.3, -44.1, gridX, gridZ);

      assert.equal(sample.communityX, reference.communityX);
      assert.equal(sample.communityZ, reference.communityZ);
      counts.set(sample.variantName, (counts.get(sample.variantName) ?? 0) + 1);
    }
  }

  const primaryRatio = counts.get(reference.primaryVariantName) / 10000;
  const secondaryRatio = counts.get(reference.secondaryVariantName) / 10000;
  const otherRatio = 1 - primaryRatio - secondaryRatio;

  assert.ok(primaryRatio >= 0.69 && primaryRatio <= 0.75);
  assert.ok(secondaryRatio >= 0.17 && secondaryRatio <= 0.23);
  assert.ok(otherRatio >= 0.05 && otherRatio <= 0.11);

  const terrain = {
    getHeightAt: () => 0,
    getNormalAt: () => new THREE.Vector3(0, 1, 0),
  };
  const edge = createPlacement(terrain, 0, 0, 7, 9, {
    influence: 0,
    variantName: reference.primaryVariantName,
  });
  const core = createPlacement(terrain, 0, 0, 7, 9, {
    influence: 1,
    variantName: reference.primaryVariantName,
  });
  const edgeScale = new THREE.Vector3();
  const coreScale = new THREE.Vector3();

  edge.matrix.decompose(new THREE.Vector3(), new THREE.Quaternion(), edgeScale);
  core.matrix.decompose(new THREE.Vector3(), new THREE.Quaternion(), coreScale);

  assert.ok(coreScale.y > edgeScale.y);
  assert.equal(edge.variantName, core.variantName);
  assert.equal(edge.lodRoll, core.lodRoll);
  assert.equal(edge.transitionRoll, core.transitionRoll);
});

test('legacy instancing colors dry grass without adding a draw call', () => {
  const { variants, geometry, material } = createVariants();
  const parent = new THREE.Group();

  buildInstancedMeshes([
    createTestPlacement(0),
    createTestPlacement(1, 0, 0, true),
  ], variants, parent);

  assert.equal(parent.children.length, 1);
  assertColorArray(parent.children[0].instanceColor.array, [
    1, 1, 1,
    1.45, 0.72, 0.48,
  ]);

  parent.children[0].dispose();
  geometry.dispose();
  material.dispose();
});

test('spatial dither mixes adjacent LODs without duplicate instances', () => {
  const { zone } = createZone([
    createTestPlacement(8, 0, 0.1),
    createTestPlacement(8, 0, 0.9),
  ]);

  completeJob(zone, 0);

  const counts = [0, 1, 2].map((lodLevel) => getMesh(zone, lodLevel).count);

  assert.deepEqual(counts, [1, 1, 0]);
  assert.equal(counts.reduce((total, count) => total + count, 0), 2);
});

test('the final dither band fades LOD2 to invisible', () => {
  const { zone } = createZone([
    createTestPlacement(98, 0, 0.1),
    createTestPlacement(98, 0, 0.9),
    createTestPlacement(100, 0, 0.999),
    createTestPlacement(101, 0, 0),
  ]);

  completeJob(zone, 0);

  const counts = [0, 1, 2].map((lodLevel) => getMesh(zone, lodLevel).count);

  assert.deepEqual(counts, [0, 0, 1]);
});

test('quality presets expose the intended grass dither widths', () => {
  assert.deepEqual([
    RENDER_QUALITY_PRESETS.performance.grass.fadeDistance,
    RENDER_QUALITY_PRESETS.balanced.grass.fadeDistance,
    RENDER_QUALITY_PRESETS.quality.grass.fadeDistance,
  ], [6, 8, 10]);
});

test('converted GLB grass preserves and embeds the authored root plane', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.354105, 0, -0.36457,
    0.354105, 0, -0.36457,
    0, 0.54101, 0.36457,
    -0.1, -0.1, 0,
    0.1, 0, 0,
    0, 0.2, 0.1,
  ], 3));

  normalizeRibbonGrassGeometry(geometry);

  const height = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
  const positions = geometry.getAttribute('position');
  const heightRatios = geometry.getAttribute('aGrassHeightRatio');
  let minimumHeightRatio = 1;
  let maximumHeightRatio = 0;

  for (let index = 0; index < heightRatios.count; index += 1) {
    const heightRatio = heightRatios.getX(index);

    minimumHeightRatio = Math.min(minimumHeightRatio, heightRatio);
    maximumHeightRatio = Math.max(maximumHeightRatio, heightRatio);
    assert.ok(heightRatio >= 0 && heightRatio <= 1);
  }

  assert.ok(Math.abs(positions.getY(0) + GRASS_ROOT_EMBED_DEPTH) < 0.000001);
  assert.ok(positions.getY(3) < -GRASS_ROOT_EMBED_DEPTH);
  assert.equal(heightRatios.getX(0), 0);
  assert.equal(heightRatios.getX(1), 0);
  assert.equal(heightRatios.getX(3), 0);
  assert.equal(heightRatios.getX(4), 0);
  assert.equal(heightRatios.getX(2), 1);
  assert.ok(Math.abs(height - 0.8653635) < 0.000001);
  assert.equal(heightRatios.itemSize, 1);
  assert.equal(heightRatios.count, positions.count);
  assert.equal(minimumHeightRatio, 0);
  assert.equal(maximumHeightRatio, 1);

  geometry.dispose();
});

test('persistent LOD meshes reuse InstancedMesh and DynamicDrawUsage buffers', () => {
  const { zone } = createZone([
    createTestPlacement(0),
    createTestPlacement(1, 0, 0, true),
    createTestPlacement(2),
  ]);

  completeJob(zone, 0);

  const meshes = [0, 1, 2].map((lodLevel) => getMesh(zone, lodLevel));
  const attributes = meshes.map((mesh) => mesh.instanceMatrix);
  const arrays = attributes.map((attribute) => attribute.array);
  const colorAttributes = meshes.map((mesh) => mesh.instanceColor);
  const colorArrays = colorAttributes.map((attribute) => attribute.array);
  const childCounts = zone.lodGroups.map((group) => group.children.length);
  let disposeEvents = 0;

  for (const mesh of meshes) {
    mesh.addEventListener('dispose', () => { disposeEvents += 1; });
  }

  assert.deepEqual(meshes.map((mesh) => mesh.count), [3, 0, 0]);
  assert.ok(attributes.every((attribute) => attribute.usage === THREE.DynamicDrawUsage));
  assert.ok(colorAttributes.every((attribute) => attribute.usage === THREE.DynamicDrawUsage));
  assertColorArray(meshes[0].instanceColor.array.slice(0, 9), [
    1, 1, 1,
    1.45, 0.72, 0.48,
    1, 1, 1,
  ]);

  for (let iteration = 0; iteration < 1000; iteration += 1) {
    completeJob(zone, iteration % 2 === 0 ? 40 : 0, iteration + 1);

    for (let lodLevel = 0; lodLevel < 3; lodLevel += 1) {
      assert.equal(getMesh(zone, lodLevel), meshes[lodLevel]);
      assert.equal(getMesh(zone, lodLevel).instanceMatrix, attributes[lodLevel]);
      assert.equal(getMesh(zone, lodLevel).instanceMatrix.array, arrays[lodLevel]);
      assert.equal(getMesh(zone, lodLevel).instanceColor, colorAttributes[lodLevel]);
      assert.equal(getMesh(zone, lodLevel).instanceColor.array, colorArrays[lodLevel]);
    }

    assert.deepEqual(zone.lodGroups.map((group) => group.children.length), childCounts);
  }

  assert.equal(disposeEvents, 0);
  assert.deepEqual(meshes[0].instanceMatrix.updateRanges, [{ start: 0, count: 48 }]);
  assert.deepEqual(meshes[0].instanceColor.updateRanges, [{ start: 0, count: 9 }]);
});

test('persistent mesh allocation advances one variant per queued slice', () => {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial();
  const variants = new Map(['A', 'B', 'C'].map((name) => [name, {
    lods: [0, 1, 2].map((lodLevel) => [{
      name: `${name}_LOD${lodLevel}`,
      geometry,
      material,
    }]),
  }]));
  const zone = new GrassZone({}, variants, 0, 0, 64, 64);

  zone.allPlacements = ['A', 'B', 'C'].map((variantName, index) => ({
    ...createTestPlacement(index),
    variantName,
  }));

  assert.equal(zone.startLODJob(0, 0, DISTANCES, KEEP_ALL, 0), false);
  assert.equal(zone.lodMeshes[0].size, 1);
  assert.equal(zone.startLODJob(0, 0, DISTANCES, KEEP_ALL, 0), false);
  assert.equal(zone.lodMeshes[0].size, 2);
  assert.equal(zone.startLODJob(0, 0, DISTANCES, KEEP_ALL, 0), true);
  assert.equal(zone.lodMeshes[0].size, 3);
  assert.equal(zone.hasLODJob, true);

  zone.dispose();
  geometry.dispose();
  material.dispose();
});

test('incremental LOD jobs commit matrices and counts atomically', () => {
  const { zone } = createZone([
    createTestPlacement(0),
    createTestPlacement(1, 0, 0, true),
    createTestPlacement(2),
  ]);

  completeJob(zone, 0, 0);

  const meshes = [0, 1, 2].map((lodLevel) => getMesh(zone, lodLevel));
  const countsBefore = meshes.map((mesh) => mesh.count);
  const matricesBefore = meshes.map((mesh) => Float32Array.from(mesh.instanceMatrix.array));
  const colorsBefore = meshes.map((mesh) => Float32Array.from(mesh.instanceColor.array));

  assert.equal(zone.startLODJob(40, 0, DISTANCES, KEEP_ALL, 1), true);
  assert.equal(zone.processLODJob(1), false);
  assert.equal(zone.startLODJob(80, 0, DISTANCES, KEEP_ALL, 2), false);
  assert.deepEqual(meshes.map((mesh) => mesh.count), countsBefore);
  assert.deepEqual(meshes.map((mesh) => Float32Array.from(mesh.instanceMatrix.array)), matricesBefore);
  assert.deepEqual(meshes.map((mesh) => Float32Array.from(mesh.instanceColor.array)), colorsBefore);
  assert.deepEqual(zone.builtForPosition, { x: 0, z: 0 });
  assert.equal(zone.builtForRevision, 0);

  while (!zone.processLODJob(1)) {
    assert.deepEqual(meshes.map((mesh) => mesh.count), countsBefore);
    assert.deepEqual(meshes.map((mesh) => Float32Array.from(mesh.instanceMatrix.array)), matricesBefore);
    assert.deepEqual(meshes.map((mesh) => Float32Array.from(mesh.instanceColor.array)), colorsBefore);
  }

  assert.deepEqual(meshes.map((mesh) => mesh.count), [0, 3, 0]);
  assertColorArray(meshes[1].instanceColor.array.slice(0, 9), [
    1, 1, 1,
    1.45, 0.72, 0.48,
    1, 1, 1,
  ]);
  assert.deepEqual(zone.builtForPosition, { x: 40, z: 0 });
  assert.equal(zone.builtForRevision, 1);
});

test('manager LOD queue deduplicates and round-robins without starvation', () => {
  const manager = new GrassManager({}, new Map());
  const calls = [];

  class FakeZone {
    constructor(name) {
      this.name = name;
      this.isDisposed = false;
      this.isGenerating = false;
      this.hasPlacements = true;
      this.hasLODJob = false;
      this.steps = 0;
      this.builtForPosition = null;
      this.builtForRevision = -1;
    }

    startLODJob(playerX, playerZ, _distances, _ratios, revision) {
      this.hasLODJob = true;
      this.target = { x: playerX, z: playerZ, revision };
      return true;
    }

    processLODJob() {
      calls.push(this.name);
      this.steps += 1;

      if (this.steps < 3) return false;

      this.hasLODJob = false;
      this.builtForPosition = { x: this.target.x, z: this.target.z };
      this.builtForRevision = this.target.revision;
      return true;
    }
  }

  const a = new FakeZone('A');
  const b = new FakeZone('B');
  const c = new FakeZone('C');
  manager.lodTarget = { x: 0, z: 0 };

  assert.equal(manager.enqueueLODZone(a), true);
  assert.equal(manager.enqueueLODZone(b), true);
  assert.equal(manager.enqueueLODZone(a), false);
  assert.equal(manager.enqueueLODZone(c), true);

  for (let i = 0; i < 9; i += 1) {
    manager.processLODQueue(1, 1, Infinity);
  }

  assert.deepEqual(calls, ['A', 'B', 'C', 'A', 'B', 'C', 'A', 'B', 'C']);
  assert.equal(manager.lodQueue.length, 0);
  assert.equal(manager.queuedZones.size, 0);
});

test('an in-flight job finishes atomically and is queued once for a newer preset', () => {
  const manager = new GrassManager({}, new Map());
  const revisions = [];
  const fadeDistances = [];
  const zone = {
    isDisposed: false,
    isGenerating: false,
    hasPlacements: true,
    hasLODJob: false,
    builtForPosition: null,
    builtForRevision: -1,
    steps: 0,
    startLODJob(playerX, playerZ, _distances, _ratios, revision, fadeDistance) {
      this.hasLODJob = true;
      this.steps = 0;
      this.target = { x: playerX, z: playerZ, revision };
      revisions.push(revision);
      fadeDistances.push(fadeDistance);
      return true;
    },
    processLODJob() {
      this.steps += 1;

      if (this.steps < 2) return false;

      this.hasLODJob = false;
      this.builtForPosition = { x: this.target.x, z: this.target.z };
      this.builtForRevision = this.target.revision;
      return true;
    },
  };

  manager.zones.set('zone', zone);
  manager.lodTarget = { x: 0, z: 0 };
  manager.enqueueLODZone(zone);
  manager.processLODQueue(1, 1, Infinity);
  manager.setQualityPreset({
    grass: {
      lodDistances: [24, 65, 150],
      keepRatios: [1, 0.4, 0.1],
      fadeDistance: 10,
      updateBudgetMs: 1.25,
    },
  });

  assert.equal(manager.lodQueue.length, 1);
  manager.processLODQueue(1, 1, Infinity);
  assert.equal(manager.lodQueue.length, 1);
  manager.processLODQueue(1, 1, Infinity);
  manager.processLODQueue(1, 1, Infinity);

  assert.deepEqual(revisions, [0, 1]);
  assert.deepEqual(fadeDistances, [8, 10]);
  assert.equal(zone.builtForRevision, 1);
  assert.equal(manager.lodQueue.length, 0);
});

test('zone disposal releases instance buffers once without disposing shared assets', () => {
  const { zone, geometry, material } = createZone([createTestPlacement(0)]);
  const parent = new THREE.Group();
  const meshes = zone.lodGroups.flatMap((group) => group.children);
  const disposeCounts = new Map(meshes.map((mesh) => [mesh, 0]));
  let geometryDisposals = 0;
  let materialDisposals = 0;

  for (const mesh of meshes) {
    mesh.addEventListener('dispose', () => disposeCounts.set(mesh, disposeCounts.get(mesh) + 1));
  }
  geometry.addEventListener('dispose', () => { geometryDisposals += 1; });
  material.addEventListener('dispose', () => { materialDisposals += 1; });
  parent.add(zone.group);

  zone.dispose();
  zone.dispose();

  assert.ok([...disposeCounts.values()].every((count) => count === 1));
  assert.equal(geometryDisposals, 0);
  assert.equal(materialDisposals, 0);
  assert.equal(zone.group.parent, null);
});

test('shared grass uniforms update once and grass preset API accepts preset.grass', () => {
  let playerPositionUpdates = 0;
  const uniforms = {
    uGrassTime: { value: 0 },
    uGrassPlayerPosition: {
      value: {
        set() {
          playerPositionUpdates += 1;
        },
      },
    },
  };
  const material = { userData: { grassUniforms: uniforms } };
  const leaf = { material };
  const variants = new Map([
    ['A', { lods: [[leaf], [leaf], [leaf]] }],
    ['B', { lods: [[leaf], [leaf], [leaf]] }],
  ]);

  updateGrassClumps(variants, { x: 5, z: 6 }, 12);

  assert.equal(uniforms.uGrassTime.value, 12);
  assert.equal(playerPositionUpdates, 1);
  assert.deepEqual(normalizeGrassPreset({
    grass: {
      lodDistances: [24, 65, 150],
      keepRatios: [1, 0.4, 0.1],
      fadeDistance: 10,
      updateBudgetMs: 1.25,
    },
  }), {
    lodDistances: [24, 65, 150],
    keepRatios: [1, 0.4, 0.1],
    fadeDistance: 10,
    updateBudgetMs: 1.25,
  });
  assert.deepEqual(normalizeGrassPreset({ keepRatios: [1, 0.5, 0.2] }), {
    lodDistances: [...DEFAULT_GRASS_PRESET.lodDistances],
    keepRatios: [...DEFAULT_GRASS_PRESET.keepRatios],
    fadeDistance: DEFAULT_GRASS_PRESET.fadeDistance,
    updateBudgetMs: DEFAULT_GRASS_PRESET.updateBudgetMs,
  });
});

test('placement reuses one combined terrain surface sample', () => {
  let sampleCalls = 0;
  const terrain = {
    sampleSurfaceAt(_x, _z, target) {
      sampleCalls += 1;
      Object.assign(target, {
        height: 12,
        normalX: 0,
        normalY: 1,
        normalZ: 0,
        groundMask: 1,
      });
      return target;
    },
  };

  const placement = createPlacement(terrain, 2, 3, 5, 7);

  assert.equal(sampleCalls, 1);
  assert.equal(placement.matrix.elements[13], 12);
});

test('generation and LOD alternate first claim on their shared time budget', () => {
  const manager = new GrassManager({}, new Map());
  const calls = [];

  manager.processGenerations = () => calls.push('generation');
  manager.processLODQueue = () => calls.push('lod');
  manager.processStreamingWork(0, 0);
  manager.processStreamingWork(0, 0);

  assert.deepEqual(calls, ['generation', 'lod', 'lod', 'generation']);
});

test('generation finishes the nearest zone before streaming farther zones', () => {
  const manager = new GrassManager({}, new Map());
  const calls = [];
  const near = {
    isGenerating: true,
    hasPlacements: false,
    centerX: 0,
    centerZ: 0,
    remainingBatches: 3,
    processGeneration(steps) {
      calls.push(['near', steps]);
      this.remainingBatches -= 1;
      this.isGenerating = this.remainingBatches > 0;
      return !this.isGenerating;
    },
  };
  const far = {
    isGenerating: true,
    hasPlacements: false,
    centerX: 100,
    centerZ: 100,
    processGeneration(steps) {
      calls.push(['far', steps]);
      this.isGenerating = false;
      return true;
    },
  };

  manager.zones.set('far', far);
  manager.zones.set('near', near);
  manager.processGenerations(0, 0, Infinity);

  assert.deepEqual(calls.map(([name]) => name), ['near', 'near', 'near', 'far']);
  assert.ok(calls.every(([, steps]) => steps === 256));
});

test('only the near grass material keeps sway uniforms', () => {
  const texture = new THREE.Texture();
  const textures = {
    baseColor: texture,
    normal: texture,
    roughness: texture,
    ao: texture,
    opacity: texture,
    translucency: texture,
    billboardBaseColor: texture,
    billboardNormal: texture,
    billboardOpacity: texture,
  };
  const modelNames = ['VarA', 'VarB', 'VarC', 'VarD', 'VarE', 'VarF'];
  const models = new Map(modelNames.map((name) => [name, [
    createModelRoot(),
    createModelRoot(),
    createModelRoot(),
  ]]));
  const variants = createGrassVariants({ textures, models });
  const lods = variants.get(VARIANT_NAME).lods;

  assert.ok(lods[0][0].material.userData.grassUniforms);
  assert.equal(lods[0][0].material.color.getHex(), 0xa5c77f);
  assert.equal(lods[0][0].material.userData.ribbonGrassMaps.translucency, texture);
  assert.equal(lods[1][0].material.userData.grassUniforms, null);
  assert.equal(lods[1][0].material.color.getHex(), 0xa5c77f);
  assert.equal(lods[2][0].material.userData.grassUniforms, null);
  assert.equal(lods[2][0].material.color.getHex(), 0x82a66a);
  assert.equal(lods[2][0].material.isMeshLambertMaterial, true);
  assert.equal(lods[2][0].material.map, texture);
  assert.equal(lods[2][0].material.alphaMap, texture);
  assert.equal(lods[2][0].material.alphaTest, 0.12);
  assert.notEqual(lods[2][0].geometry, lods[1][0].geometry);

  const nearShader = {
    uniforms: {},
    vertexShader: '#include <common>\n#include <begin_vertex>',
    fragmentShader: '#include <common>\n#include <alphamap_fragment>\n#include <dithering_fragment>',
  };
  const midShader = {
    uniforms: {},
    fragmentShader: '#include <common>\n#include <alphamap_fragment>\n#include <dithering_fragment>',
  };

  lods[0][0].material.onBeforeCompile(nearShader);
  lods[1][0].material.onBeforeCompile(midShader);
  assert.match(nearShader.vertexShader, /attribute float aGrassHeightRatio;/);
  assert.match(nearShader.vertexShader, /smoothstep\(0\.08, 1\.0, grassHeightRatio\) \* grassHeightRatio/);
  assert.match(nearShader.vertexShader, /mat3\(modelMatrix\) \* mat3\(instanceMatrix\)/);
  assert.match(nearShader.vertexShader, /dot\(grassWorldWindDirection, normalize\(grassInstanceTransform\[0\]\)\)/);
  assert.match(nearShader.vertexShader, /grassLocalWindDirection \* grassWave/);
  assert.match(
    nearShader.vertexShader,
    new RegExp(`smoothstep\\(${GRASS_SWAY_FADE_START.toFixed(1)}, ${GRASS_SWAY_FADE_END.toFixed(1)}, grassPlayerDistance\\)\\) \\* ${GRASS_SWAY_REGIONAL_STRENGTH.toFixed(2)}`),
  );
  assert.match(
    nearShader.vertexShader,
    new RegExp(`uGrassTime \\* ${GRASS_SWAY_PRIMARY_FREQUENCY.toFixed(2)}`),
  );
  assert.match(
    nearShader.vertexShader,
    new RegExp(`uGrassTime \\* ${GRASS_SWAY_FLUTTER_FREQUENCY.toFixed(2)}`),
  );
  assert.match(
    nearShader.vertexShader,
    new RegExp(`smoothstep\\(${(GRASS_SWAY_PLAYER_RADIUS - 0.25).toFixed(2)}, ${GRASS_SWAY_PLAYER_RADIUS.toFixed(2)}, grassPlayerDistance\\)`),
  );
  assert.doesNotMatch(nearShader.vertexShader, /uGrassBaseY|uGrassHeight/);
  assert.equal(
    lods[0][0].material.userData.grassUniforms.uGrassSwayStrength.value,
    GRASS_SWAY_STRENGTH,
  );
  assert.match(lods[0][0].material.customProgramCacheKey(), /ribbon-grass-sway-config-v4/);
  assert.match(midShader.fragmentShader, /vAlphaMapUv\)\.r/);
  assert.match(midShader.fragmentShader, /uGrassShadowLiftIntensity/);
});

test('instance-local sway conversion preserves one world wind direction across yaw', () => {
  const worldWind = new THREE.Vector3(0.6, 0, 0.8).normalize();
  const localX = new THREE.Vector3();
  const localZ = new THREE.Vector3();

  for (const yaw of [0, 0.37, Math.PI * 0.5, Math.PI, Math.PI * 1.73]) {
    const instanceMatrix = new THREE.Matrix4().makeRotationY(yaw);
    const elements = instanceMatrix.elements;

    localX.set(elements[0], elements[1], elements[2]).normalize();
    localZ.set(elements[8], elements[9], elements[10]).normalize();

    const localWind = new THREE.Vector2(
      worldWind.dot(localX),
      worldWind.dot(localZ),
    ).normalize();
    const restoredWorldWind = new THREE.Vector3(localWind.x, 0, localWind.y)
      .applyMatrix4(instanceMatrix)
      .normalize();

    assert.ok(restoredWorldWind.distanceTo(worldWind) < 0.000001);
  }
});

test('far grass LOD is one Y-up cross-card geometry', () => {
  const texture = new THREE.Texture();
  const textures = {
    baseColor: texture,
    normal: texture,
    roughness: texture,
    ao: texture,
    opacity: texture,
    translucency: texture,
    billboardBaseColor: texture,
    billboardNormal: texture,
    billboardOpacity: texture,
  };
  const singleCard = new THREE.PlaneGeometry(1, 2);
  singleCard.translate(0, 1, 0);
  const singleCardTriangleCount = singleCard.index.count / 3;
  const modelNames = ['VarA', 'VarB', 'VarC', 'VarD', 'VarE', 'VarF'];
  const models = new Map(modelNames.map((name) => [name, [
    createModelRoot(),
    createModelRoot(),
    createModelRoot(singleCard),
  ]]));
  const variants = createGrassVariants({ textures, models });
  const farLeaves = variants.get(VARIANT_NAME).lods[2];
  const geometry = farLeaves[0].geometry;
  const box = geometry.boundingBox;
  const size = box.getSize(new THREE.Vector3());
  const positionsPerCard = singleCard.getAttribute('position').count;
  const normals = geometry.getAttribute('normal');
  const firstNormal = new THREE.Vector3().fromBufferAttribute(normals, 0).normalize();
  const secondNormal = new THREE.Vector3()
    .fromBufferAttribute(normals, positionsPerCard)
    .normalize();

  assert.equal(farLeaves.length, 1);
  assert.equal(farLeaves[0].material.isMeshLambertMaterial, true);
  assert.equal(geometry.index.count / 3, singleCardTriangleCount * 2);
  assert.equal(geometry.getAttribute('position').count, positionsPerCard * 2);
  assert.equal(geometry.getAttribute('uv').count, positionsPerCard * 2);
  assert.ok(size.x > 0);
  assert.ok(size.y > 0);
  assert.ok(size.z > 0);
  assert.ok(Math.abs(box.min.y + GRASS_ROOT_EMBED_DEPTH) < 0.000001);
  assert.ok(Math.abs(size.y - 2 * 1.35) < 0.000001);
  assert.ok(size.y > size.x);
  assert.ok(size.y > size.z);
  assert.ok(Math.abs(firstNormal.dot(secondNormal)) < 0.000001);

  singleCard.dispose();
});

test('runtime grass loading uses tiered KTX2 maps and Meshopt GLB LODs', async () => {
  const source = await readFile(new URL('../src/grassClumps.js', import.meta.url), 'utf8');
  const textureSpecBlock = source.slice(
    source.indexOf('const textureSpecs = ['),
    source.indexOf('const entries =', source.indexOf('const textureSpecs = [')),
  );

  assert.equal((textureSpecBlock.match(/^\s*\['/gm) ?? []).length, 9);
  assert.match(source, /compressedTextureLoader\.loadAsync/);
  assert.match(source, /\.ktx2/);
  assert.match(source, /GLTFLoader/);
  assert.match(source, /MeshoptDecoder/);
  assert.match(source, /\[0, 1, 2\]/);
});

test('grass textures flip their vertical sampling coordinate', () => {
  const texture = new THREE.Texture();
  const uv = new THREE.Vector2(0.25, 0.2);

  flipGrassTextureVertically(texture);
  uv.applyMatrix3(texture.matrix);

  assert.equal(texture.offset.y, 1);
  assert.equal(texture.repeat.y, -1);
  assert.ok(Math.abs(uv.x - 0.25) < 0.000001);
  assert.ok(Math.abs(uv.y - 0.8) < 0.000001);
});

function createModelRoot(geometry = new THREE.PlaneGeometry(1, 1)) {
  const root = new THREE.Group();

  root.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
  return root;
}

function assertColorArray(actual, expected) {
  assert.equal(actual.length, expected.length);

  for (let index = 0; index < expected.length; index += 1) {
    assert.ok(Math.abs(actual[index] - expected[index]) < 0.000001);
  }
}
