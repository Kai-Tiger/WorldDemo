import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as THREE from 'three';
import {
  createGrassVariants,
  createPlacement,
  normalizeRibbonGrassGeometry,
  updateGrassClumps,
} from '../src/grassClumps.js';
import { GrassZone } from '../src/grassZone.js';
import {
  DEFAULT_GRASS_PRESET,
  GrassManager,
  normalizeGrassPreset,
} from '../src/grassManager.js';

const VARIANT_NAME = 'RibbonGrass_VarA';
const DISTANCES = [10, 50, 100];
const KEEP_ALL = [1, 0.4, 0.1];

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

function createTestPlacement(x, lodRoll = 0) {
  return {
    matrix: new THREE.Matrix4().makeTranslation(x, 0, 0),
    variantName: VARIANT_NAME,
    lodRoll,
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
  assert.equal(zone.startLODJob(playerX, 0, DISTANCES, KEEP_ALL, revision), true);

  while (!zone.processLODJob(steps)) {
    // Drain the deliberately incremental job.
  }
}

function getMesh(zone, lodLevel) {
  return zone.lodMeshes[lodLevel].get(VARIANT_NAME).meshes[0];
}

test('createPlacement assigns a stable lodRoll with nested quality subsets', () => {
  const terrain = {
    getHeightAt: () => 0,
    getNormalAt: () => new THREE.Vector3(0, 1, 0),
  };
  const first = createPlacement(terrain, 1, 2, 7, 9);
  const moved = createPlacement(terrain, 30, 40, 7, 9);

  assert.equal(first.lodRoll, moved.lodRoll);
  assert.ok(first.lodRoll >= 0 && first.lodRoll < 1);

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

test('converted GLB grass is restored to the authored model scale', () => {
  const geometry = new THREE.BoxGeometry(0.70821, 0.54101, 0.72914);

  normalizeRibbonGrassGeometry(geometry);

  const height = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
  assert.equal(geometry.boundingBox.min.y, 0);
  assert.ok(Math.abs(height - 0.7303635) < 0.000001);

  geometry.dispose();
});

test('persistent LOD meshes reuse InstancedMesh and DynamicDrawUsage buffers', () => {
  const { zone } = createZone([
    createTestPlacement(0),
    createTestPlacement(1),
    createTestPlacement(2),
  ]);

  completeJob(zone, 0);

  const meshes = [0, 1, 2].map((lodLevel) => getMesh(zone, lodLevel));
  const attributes = meshes.map((mesh) => mesh.instanceMatrix);
  const arrays = attributes.map((attribute) => attribute.array);
  const childCounts = zone.lodGroups.map((group) => group.children.length);
  let disposeEvents = 0;

  for (const mesh of meshes) {
    mesh.addEventListener('dispose', () => { disposeEvents += 1; });
  }

  assert.deepEqual(meshes.map((mesh) => mesh.count), [3, 0, 0]);
  assert.ok(attributes.every((attribute) => attribute.usage === THREE.DynamicDrawUsage));

  for (let iteration = 0; iteration < 1000; iteration += 1) {
    completeJob(zone, iteration % 2 === 0 ? 40 : 0, iteration + 1);

    for (let lodLevel = 0; lodLevel < 3; lodLevel += 1) {
      assert.equal(getMesh(zone, lodLevel), meshes[lodLevel]);
      assert.equal(getMesh(zone, lodLevel).instanceMatrix, attributes[lodLevel]);
      assert.equal(getMesh(zone, lodLevel).instanceMatrix.array, arrays[lodLevel]);
    }

    assert.deepEqual(zone.lodGroups.map((group) => group.children.length), childCounts);
  }

  assert.equal(disposeEvents, 0);
  assert.deepEqual(meshes[0].instanceMatrix.updateRanges, [{ start: 0, count: 48 }]);
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
    createTestPlacement(1),
    createTestPlacement(2),
  ]);

  completeJob(zone, 0, 0);

  const meshes = [0, 1, 2].map((lodLevel) => getMesh(zone, lodLevel));
  const countsBefore = meshes.map((mesh) => mesh.count);
  const matricesBefore = meshes.map((mesh) => Float32Array.from(mesh.instanceMatrix.array));

  assert.equal(zone.startLODJob(40, 0, DISTANCES, KEEP_ALL, 1), true);
  assert.equal(zone.processLODJob(1), false);
  assert.equal(zone.startLODJob(80, 0, DISTANCES, KEEP_ALL, 2), false);
  assert.deepEqual(meshes.map((mesh) => mesh.count), countsBefore);
  assert.deepEqual(meshes.map((mesh) => Float32Array.from(mesh.instanceMatrix.array)), matricesBefore);
  assert.deepEqual(zone.builtForPosition, { x: 0, z: 0 });
  assert.equal(zone.builtForRevision, 0);

  while (!zone.processLODJob(1)) {
    assert.deepEqual(meshes.map((mesh) => mesh.count), countsBefore);
  }

  assert.deepEqual(meshes.map((mesh) => mesh.count), [0, 3, 0]);
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
  const zone = {
    isDisposed: false,
    isGenerating: false,
    hasPlacements: true,
    hasLODJob: false,
    builtForPosition: null,
    builtForRevision: -1,
    steps: 0,
    startLODJob(playerX, playerZ, _distances, _ratios, revision) {
      this.hasLODJob = true;
      this.steps = 0;
      this.target = { x: playerX, z: playerZ, revision };
      revisions.push(revision);
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
      updateBudgetMs: 1.25,
    },
  });

  assert.equal(manager.lodQueue.length, 1);
  manager.processLODQueue(1, 1, Infinity);
  assert.equal(manager.lodQueue.length, 1);
  manager.processLODQueue(1, 1, Infinity);
  manager.processLODQueue(1, 1, Infinity);

  assert.deepEqual(revisions, [0, 1]);
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
      updateBudgetMs: 1.25,
    },
  }), {
    lodDistances: [24, 65, 150],
    keepRatios: [1, 0.4, 0.1],
    updateBudgetMs: 1.25,
  });
  assert.deepEqual(normalizeGrassPreset({ keepRatios: [1, 0.5, 0.2] }), {
    lodDistances: [...DEFAULT_GRASS_PRESET.lodDistances],
    keepRatios: [...DEFAULT_GRASS_PRESET.keepRatios],
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
  assert.equal(lods[0][0].material.userData.ribbonGrassMaps.translucency, texture);
  assert.equal(lods[1][0].material.userData.grassUniforms, null);
  assert.equal(lods[2][0].material.userData.grassUniforms, null);
  assert.equal(lods[2][0].material.isMeshLambertMaterial, true);
  assert.equal(lods[2][0].material.map, texture);
  assert.equal(lods[2][0].material.alphaMap, texture);
  assert.equal(lods[2][0].material.alphaTest, 0.12);
  assert.notEqual(lods[2][0].geometry, lods[1][0].geometry);

  const midShader = {
    uniforms: {},
    fragmentShader: '#include <common>\n#include <alphamap_fragment>\n#include <dithering_fragment>',
  };
  lods[1][0].material.onBeforeCompile(midShader);
  assert.match(midShader.fragmentShader, /vAlphaMapUv\)\.r/);
  assert.match(midShader.fragmentShader, /uGrassShadowLiftIntensity/);
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

function createModelRoot() {
  const root = new THREE.Group();

  root.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial()));
  return root;
}
