import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { ThirdPersonCamera } from '../src/thirdPersonCamera.js';

function createInput(wheelDelta = 0) {
  return {
    consumePointerDelta: () => ({ x: 0, y: 0 }),
    consumeWheelDelta: () => wheelDelta,
  };
}

test('third-person camera keeps the six-meter default and allows an eighteen-meter pullback', () => {
  const camera = new THREE.PerspectiveCamera();
  const target = new THREE.Object3D();
  const controller = new ThirdPersonCamera(camera, target);
  const terrain = { getHeightAt: () => 0 };

  assert.equal(controller.distance, 6);
  assert.equal(controller.minDistance, 3);
  assert.equal(controller.maxDistance, 18);

  controller.update(createInput(10000), terrain);
  assert.equal(controller.distance, 18);
  controller.update(createInput(-10000), terrain);
  assert.equal(controller.distance, 3);
});

test('eighteen-meter camera collision stops before a terrain ridge', () => {
  const camera = new THREE.PerspectiveCamera();
  const target = new THREE.Object3D();
  const controller = new ThirdPersonCamera(camera, target);
  const terrain = {
    getHeightAt(_x, z) {
      return z >= 7 && z <= 9 ? 8 : 0;
    },
  };

  controller.distance = 18;
  controller.pitch = 0.25;
  controller.update(createInput(), terrain);

  assert.ok(camera.position.z < 9);
  assert.ok(camera.position.y >= terrain.getHeightAt(camera.position.x, camera.position.z) + 0.4);
});
