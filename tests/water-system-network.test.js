import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { getGoldenShotFromLocation } from '../src/goldenShots.js';
import {
  createWaterSystem,
  updateWaterSystemVisuals,
} from '../src/waterSystem.js';

function createTerrainStub() {
  return {
    getHeightAt: () => 24,
  };
}

function disposeSystem(system) {
  const materials = new Set();

  system.group.traverse((object) => {
    object.geometry?.dispose();
    if (object.material) materials.add(object.material);
  });
  materials.forEach((material) => material.dispose());
}

test('water system exposes one merged tributary surface and keeps the compatibility alias', () => {
  const system = createWaterSystem(createTerrainStub());
  const tributaries = system.tributaries;

  assert.equal(system.snowmelt, tributaries);
  assert.equal(tributaries.name, 'AlpineRiverNetworkSurface');
  assert.equal(tributaries.isMesh, true);
  assert.equal(tributaries.userData.waterReflectionModeCap, 1);
  assert.ok(tributaries.userData.riverNetworkStats.triangleCount < 12000);
  assert.equal(tributaries.material.transparent, true);
  assert.equal(tributaries.material.depthWrite, false);
  assert.match(tributaries.material.vertexShader, /attribute float junctionMask/);
  assert.match(tributaries.material.vertexShader, /attribute float viewDistance/);
  assert.match(tributaries.material.fragmentShader, /vViewDistance - 55\.0/);
  assert.doesNotMatch(tributaries.material.fragmentShader, /smoothstep\(6\.9, 8\.0, vUv\.x\)/);

  const camera = new THREE.PerspectiveCamera();

  camera.position.set(12, 34, 56);
  updateWaterSystemVisuals(system, camera, 4.25);
  assert.equal(tributaries.material.uniforms.uTime.value, 4.25);
  assert.deepEqual(tributaries.material.uniforms.uCameraPosition.value.toArray(), [12, 34, 56]);

  disposeSystem(system);
});

test('cirque tarn is an upward circular lake surface capped at probe reflections', () => {
  const system = createWaterSystem(createTerrainStub());
  const tarn = system.cirqueTarn;
  const positions = tarn.geometry.getAttribute('position');
  const normals = tarn.geometry.getAttribute('normal');

  assert.equal(tarn.name, 'CirqueTarnSurface');
  assert.equal(tarn.userData.waterReflectionModeCap, 1);
  assert.ok(Math.abs(positions.getX(0) - 76) < 1e-6);
  assert.ok(Math.abs(positions.getY(0) - 49.545) < 1e-4);
  assert.ok(Math.abs(positions.getZ(0) + 552) < 1e-6);

  for (let vertex = 0; vertex < normals.count; vertex += 1) {
    assert.ok(normals.getY(vertex) > 0.999);
  }

  disposeSystem(system);
});

test('tree-river confluence, tarn, and inlet have deterministic visual-check cameras', () => {
  const j1 = getGoldenShotFromLocation({ search: '?shot=river-tree-j1' });
  const tarn = getGoldenShotFromLocation({ search: '?shot=river-tree-tarn' });
  const inlet = getGoldenShotFromLocation({ search: '?shot=river-tree-inlet' });

  assert.deepEqual(j1.target, { x: 16, z: -352, y: 50.6 });
  assert.deepEqual(tarn.target, { x: 76, z: -552, y: 49.5 });
  assert.deepEqual(inlet.target, { x: 278, z: -458, y: 31.6 });
});
