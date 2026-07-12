import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { TreeManager, TreeZone, distanceToChunkBounds } from '../src/treeManager.js';
import {
  buildTreeInstancedMeshes,
  createTreePlacementIterator,
  createTreeDepthMaterial,
  createTreeMaterial,
  createTreeSwayUniforms,
  getTreeDensity,
  getTreeMeshRole,
  isTreeArea,
  updateTreeSwayUniforms,
} from '../src/treePlacements.js';
import {
  TREE_DENSITY_HIGHLAND,
  TREE_DENSITY_LOWLAND,
  TREE_DENSITY_MIDLAND,
  TREE_GROUND_MASK_THRESHOLD,
  TREE_SWAY_BOUNDS_PADDING,
} from '../src/vegetationConfig.js';
import { isInSmallLakeExclusion, SMALL_LAKES } from '../src/smallLakes.js';

function createPlacement() {
  return {
    matrix: new THREE.Matrix4().makeTranslation(0, 0, 0),
    modelIndex: 0,
    tint: new THREE.Color(1, 1, 1),
  };
}

test('tree placement triples the realized density while preserving terrain and shoreline rules', () => {
  assert.equal(getTreeDensity(100), TREE_DENSITY_LOWLAND * 3);
  assert.equal(getTreeDensity(150), TREE_DENSITY_MIDLAND * 3);
  assert.equal(getTreeDensity(200), TREE_DENSITY_HIGHLAND * 3);

  const terrain = {
    sampleSurfaceAt(_x, _z, target) {
      Object.assign(target, {
        height: 100,
        normalX: 0,
        normalY: 0.92,
        normalZ: 0,
        groundMask: 1,
      });
      return target;
    },
  };
  const windows = [
    [4096, 4096],
    [4608, 4096],
    [4096, 4608],
    [4608, 4608],
    [5120, 5120],
    [5632, 5632],
  ];
  let placementCount = 0;

  for (const [minX, minZ] of windows) {
    const iterator = createTreePlacementIterator(
      terrain,
      minX,
      minZ,
      minX + 256,
      minZ + 256,
    );

    while (!iterator.step(10000)) {}
    placementCount += iterator.getPlacements().length;
  }

  const previousPlacementCount = 1295;
  const placementRatio = placementCount / previousPlacementCount;

  assert.ok(placementRatio >= 2.8 && placementRatio <= 3.2, `placement ratio was ${placementRatio}`);
  assert.equal(isTreeArea(terrain, 800, 800, {
    groundMask: TREE_GROUND_MASK_THRESHOLD - 0.01,
  }), false);

  const lake = SMALL_LAKES.find(({ isTerminal }) => !isTerminal);
  const angle = 0;
  const actualRadius = lake.radius * (1 + lake.shapeAmp * (
    Math.sin(angle * 3 + lake.phase) * 0.5
    + Math.sin(angle * 5 - lake.phase * 0.7) * 0.3
    + Math.sin(angle * 7 + lake.phase * 1.3) * 0.2
  ));
  const shorelineX = lake.cx + actualRadius + 3;

  assert.equal(isInSmallLakeExclusion(shorelineX, lake.cz), false);
  assert.equal(isInSmallLakeExclusion(shorelineX, lake.cz, 5), true);
});

test('tree quality preset applies generation budget and visibility distance', () => {
  const manager = new TreeManager({}, [], {});

  manager.setQualityPreset({
    trees: { updateBudgetMs: 0.75 },
    vegetation: { treeDistance: 260 },
  });

  assert.equal(manager.updateBudgetMs, 0.75);
  assert.equal(manager.treeDistance, 260);
  assert.equal(distanceToChunkBounds({ x: 90, z: 20 }, {
    minX: 0,
    maxX: 64,
    minZ: 0,
    maxZ: 64,
  }), 26);
});

test('tree mesh roles animate only authored branches and leaves', () => {
  assert.equal(getTreeMeshRole('Tree_Trunk_01', 'Tree_Trunk_01'), 'trunk');
  assert.equal(getTreeMeshRole('Tree_Branches_01', 'Tree_Branches_01'), 'canopy');
  assert.equal(getTreeMeshRole('Leaf', ''), 'canopy');
  assert.equal(getTreeMeshRole('', 'leaves'), 'canopy');
  assert.equal(getTreeMeshRole('Rock', 'Bark'), 'static');
});

test('tree canopy surface and shadow materials share one sway deformation', () => {
  const map = new THREE.Texture();
  const alphaMap = new THREE.Texture();
  const sourceMaterial = new THREE.MeshStandardMaterial({
    map,
    alphaMap,
    alphaTest: 0.42,
  });
  const uniforms = createTreeSwayUniforms(0, 25);
  const surfaceMaterial = createTreeMaterial(sourceMaterial, false, uniforms);
  const depthMaterial = createTreeDepthMaterial(surfaceMaterial, uniforms);
  const createShader = () => ({
    uniforms: {},
    vertexShader: '#include <common>\n#include <begin_vertex>',
  });
  const surfaceShader = createShader();
  const depthShader = createShader();

  surfaceMaterial.onBeforeCompile(surfaceShader);
  depthMaterial.onBeforeCompile(depthShader);

  assert.equal(surfaceMaterial.userData.treeSwayUniforms, uniforms);
  assert.equal(depthMaterial.userData.treeSwayUniforms, uniforms);
  assert.equal(depthMaterial.depthPacking, THREE.RGBADepthPacking);
  assert.equal(depthMaterial.map, map);
  assert.equal(depthMaterial.alphaMap, alphaMap);
  assert.equal(depthMaterial.alphaTest, 0.42);
  assert.equal(surfaceShader.uniforms.uTreeTime, uniforms.uTreeTime);
  assert.equal(depthShader.uniforms.uTreeTime, uniforms.uTreeTime);
  assert.equal(surfaceShader.vertexShader, depthShader.vertexShader);
  assert.match(surfaceShader.vertexShader, /smoothstep\(0\.18, 1\.0, treeHeightRatio\)/);
  assert.match(surfaceShader.vertexShader, /mat3\(modelMatrix\) \* mat3\(instanceMatrix\)/);
  assert.match(surfaceShader.vertexShader, /smoothstep\(80\.0, 180\.0, treeViewerDistance\)/);
  assert.match(surfaceShader.vertexShader, /uTreeTime \* 0\.28/);
  assert.match(surfaceShader.vertexShader, /uTreeTime \* 0\.43/);
  assert.match(surfaceMaterial.customProgramCacheKey(), /surface/);
  assert.match(depthMaterial.customProgramCacheKey(), /depth/);

  sourceMaterial.dispose();
  surfaceMaterial.dispose();
  depthMaterial.dispose();
  map.dispose();
  alphaMap.dispose();
});

test('tree sway uniforms update once per shared model and keep the legacy time default', () => {
  let viewerPositionUpdates = 0;
  const uniforms = {
    uTreeTime: { value: -1 },
    uTreeViewerPosition: {
      value: {
        set(x, z) {
          viewerPositionUpdates += 1;
          this.x = x;
          this.y = z;
        },
      },
    },
  };

  updateTreeSwayUniforms(
    [{ swayUniforms: uniforms }, { swayUniforms: uniforms }],
    { x: 7, z: 9 },
    12,
  );

  assert.equal(uniforms.uTreeTime.value, 12);
  assert.equal(uniforms.uTreeViewerPosition.value.x, 7);
  assert.equal(uniforms.uTreeViewerPosition.value.y, 9);
  assert.equal(viewerPositionUpdates, 1);

  const manager = new TreeManager(
    { getLoadedChunkBounds: () => [] },
    [{ swayUniforms: uniforms }],
    {},
  );

  manager.shadowNeedsUpdate = false;
  manager.update({ x: 2, z: 3 });
  assert.equal(uniforms.uTreeTime.value, 0);
  assert.equal(uniforms.uTreeViewerPosition.value.x, 2);
  assert.equal(uniforms.uTreeViewerPosition.value.y, 3);
});

test('only swaying tree instances receive depth deformation and padded bounds', () => {
  const geometry = new THREE.PlaneGeometry(2, 4);
  const canopyMaterial = new THREE.MeshBasicMaterial();
  const trunkMaterial = new THREE.MeshBasicMaterial();
  const depthMaterial = new THREE.MeshDepthMaterial();
  const parent = new THREE.Group();

  buildTreeInstancedMeshes(
    [createPlacement()],
    [{
      meshes: [
        {
          geometry,
          material: canopyMaterial,
          depthMaterial,
          role: 'canopy',
        },
        {
          geometry,
          material: trunkMaterial,
          depthMaterial: null,
          role: 'trunk',
        },
      ],
    }],
    parent,
  );

  const canopy = parent.children.find((child) => child.userData.treeRole === 'canopy');
  const trunk = parent.children.find((child) => child.userData.treeRole === 'trunk');

  assert.equal(canopy.customDepthMaterial, depthMaterial);
  assert.equal(trunk.customDepthMaterial, undefined);
  assert.equal(canopy.castShadow, true);
  assert.equal(trunk.castShadow, true);
  assert.ok(Math.abs(
    canopy.boundingBox.min.x - (geometry.boundingBox.min.x - TREE_SWAY_BOUNDS_PADDING),
  ) < 0.000001);
  assert.equal(trunk.boundingBox.min.x, geometry.boundingBox.min.x);

  canopy.dispose();
  trunk.dispose();
  geometry.dispose();
  canopyMaterial.dispose();
  trunkMaterial.dispose();
  depthMaterial.dispose();
});

test('tree zone disposal releases each instance buffer once and preserves shared tree assets', () => {
  const treeGeometry = new THREE.PlaneGeometry(1, 2);
  const treeMaterial = new THREE.MeshBasicMaterial();
  const leafTexture = new THREE.Texture();
  const zone = new TreeZone(
    {
      sampleSurfaceAt(_x, _z, target) {
        Object.assign(target, {
          height: 0,
          normalX: 0,
          normalY: 1,
          normalZ: 0,
          groundMask: 1,
        });
        return target;
      },
    },
    [{ meshes: [{ geometry: treeGeometry, material: treeMaterial }] }],
    { leaf1Texture: leafTexture, leaf2Texture: leafTexture },
    { key: '0,0', minX: 0, minZ: 0, maxX: 64, maxZ: 64 },
  );

  zone.iterator = {
    step: () => true,
    getPlacements: () => [createPlacement()],
  };
  zone.processGeneration(1);

  const instanceMeshes = [];
  zone.group.traverse((child) => {
    if (child.isInstancedMesh) instanceMeshes.push(child);
  });
  const disposeCounts = new Map(instanceMeshes.map((mesh) => [mesh, 0]));
  let treeGeometryDisposals = 0;
  let treeMaterialDisposals = 0;

  for (const mesh of instanceMeshes) {
    mesh.addEventListener('dispose', () => {
      disposeCounts.set(mesh, disposeCounts.get(mesh) + 1);
    });
  }
  treeGeometry.addEventListener('dispose', () => { treeGeometryDisposals += 1; });
  treeMaterial.addEventListener('dispose', () => { treeMaterialDisposals += 1; });

  zone.dispose();
  zone.dispose();

  assert.ok([...disposeCounts.values()].every((count) => count === 1));
  assert.equal(treeGeometryDisposals, 0);
  assert.equal(treeMaterialDisposals, 0);

  treeGeometry.dispose();
  treeMaterial.dispose();
  leafTexture.dispose();
});

test('visible tree zones keep complete shadow casting outside the old shadow tier', () => {
  const chunk = { key: '0,0', minX: 0, minZ: 0, maxX: 256, maxZ: 256 };
  const treeGeometry = new THREE.PlaneGeometry(1, 2);
  const treeMaterial = new THREE.MeshBasicMaterial();
  const leafTexture = new THREE.Texture();
  const terrain = {
    getLoadedChunkBounds: () => [chunk],
    sampleSurfaceAt(_x, _z, target) {
      Object.assign(target, {
        height: 0,
        normalX: 0,
        normalY: 1,
        normalZ: 0,
        groundMask: 1,
      });
      return target;
    },
  };
  const zone = new TreeZone(
    terrain,
    [{ meshes: [{ geometry: treeGeometry, material: treeMaterial }] }],
    { leaf1Texture: leafTexture, leaf2Texture: leafTexture },
    chunk,
  );

  zone.iterator = {
    step: () => true,
    getPlacements: () => [createPlacement()],
  };
  zone.processGeneration(1);

  const manager = new TreeManager(terrain, [], {});
  manager.setQualityPreset({
    trees: { updateBudgetMs: 1 },
    vegetation: { treeDistance: 260 },
  });
  manager.zones.set(chunk.key, zone);
  manager.group.add(zone.group);
  manager.update({ x: 500, y: 0, z: 128 });

  const treeInstances = [];
  zone.group.traverse((child) => {
    if (child.isInstancedMesh && child.name.startsWith('Tree')) treeInstances.push(child);
  });

  assert.equal(zone.group.visible, true);
  assert.ok(treeInstances.length > 0);
  assert.ok(treeInstances.every((mesh) => mesh.castShadow));

  zone.dispose();
  treeGeometry.dispose();
  treeMaterial.dispose();
  leafTexture.dispose();
});
