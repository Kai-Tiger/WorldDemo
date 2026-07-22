import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createHeroRiverRockInstances, getHeroRiverRockPlacements } from '../src/heroRocks.js';
import { createTreeColliders } from '../src/treePlacements.js';
import { WorldCollision } from '../src/worldCollision.js';

test('cylinder sweep blocks tunneling and permits movement above the volume', () => {
  const collision = new WorldCollision();
  const target = new THREE.Vector2();
  const owner = {};

  collision.replaceOwner(owner, [{
    x: 0,
    z: 0,
    radius: 1,
    minY: 0,
    maxY: 4,
  }]);

  collision.resolveMovement(
    { x: -3, z: 0 },
    { x: 3, z: 0 },
    0,
    1.8,
    0.35,
    target,
  );
  assert.ok(target.x < -1.349 && target.x > -1.352);
  assert.ok(Math.abs(target.y) < 1e-6);

  collision.resolveMovement(
    { x: -3, z: -1 },
    { x: 3, z: 2 },
    0,
    1.8,
    0.35,
    target,
  );
  assert.ok(target.y > 1);
  assert.ok(Math.hypot(target.x, target.y) >= 1.35);

  collision.resolveMovement(
    { x: -3, z: 0 },
    { x: 3, z: 0 },
    4.01,
    5.81,
    0.35,
    target,
  );
  assert.equal(target.x, 3);

  collision.removeOwner(owner);
  collision.resolveMovement(
    { x: -3, z: 0 },
    { x: 3, z: 0 },
    0,
    1.8,
    0.35,
    target,
  );
  assert.equal(target.x, 3);
});

test('tree collider dimensions follow each placement transform', () => {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(7, 11, -5),
    new THREE.Quaternion(),
    new THREE.Vector3(2, 3, 4),
  );
  const colliders = createTreeColliders(
    [{ matrix, modelIndex: 0 }],
    [{ collision: { radius: 0.5, height: 10 } }],
  );

  assert.deepEqual(colliders, [{
    x: 7,
    z: -5,
    radius: 2,
    minY: 11,
    maxY: 41,
  }]);
});

test('instanced river rocks emit one fitted collider per placement', () => {
  const assets = Array.from({ length: 9 }, createRockAsset);
  const colliders = [];
  const terrain = { getHeightAt: () => 6 };

  createHeroRiverRockInstances(assets, terrain, colliders);

  assert.equal(colliders.length, getHeroRiverRockPlacements().length);
  assert.ok(colliders.every((collider) => collider.radius > 0));
  assert.ok(colliders.every((collider) => collider.minY === 6));
  assert.ok(colliders.every((collider) => collider.maxY > collider.minY));
});

function createRockAsset() {
  const scene = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 1),
    new THREE.MeshStandardMaterial(),
  );

  scene.add(mesh);
  return { scene };
}
