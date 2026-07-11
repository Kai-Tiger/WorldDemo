import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { TreeManager, TreeZone, distanceToChunkBounds } from '../src/treeManager.js';

function createPlacement() {
  return {
    matrix: new THREE.Matrix4().makeTranslation(0, 0, 0),
    modelIndex: 0,
    tint: new THREE.Color(1, 1, 1),
  };
}

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
