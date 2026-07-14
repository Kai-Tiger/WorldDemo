import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  createHeroRiverRockInstances,
  getHeroRiverRockPlacements,
  HERO_RIVER_ROCK_SEED,
} from '../src/heroRocks.js';
import {
  getHeroRiverCorridorFrame,
  HERO_RIVER_NETWORK_DEFINITION,
} from '../src/lowlandHeightPlan.js';

test('hero river rock placements deterministically mirror the authored disturbances', () => {
  const first = getHeroRiverRockPlacements();
  const second = getHeroRiverRockPlacements();
  const modelCounts = new Map();

  for (const placement of first) {
    modelCounts.set(placement.model, (modelCounts.get(placement.model) ?? 0) + 1);
  }

  assert.deepEqual(first, second);
  assert.equal(first.length, 9);
  assert.deepEqual(
    [...modelCounts.entries()].sort(),
    [['rock_02.glb', 3], ['rock_05.glb', 3], ['rock_08.glb', 3]],
  );
  assert.deepEqual(
    Object.fromEntries(
      ['hero-main-upper', 'hero-main-middle', 'hero-main-lower', 'hero-west-tributary', 'hero-east-tributary']
        .map((reachId) => [reachId, first.filter((placement) => placement.reachId === reachId).length]),
    ),
    {
      'hero-main-upper': 3,
      'hero-main-middle': 2,
      'hero-main-lower': 1,
      'hero-west-tributary': 1,
      'hero-east-tributary': 2,
    },
  );

  for (const placement of first) {
    assert.equal(placement.seed, HERO_RIVER_ROCK_SEED);
    assert.ok(Number.isFinite(placement.x));
    assert.ok(Number.isFinite(placement.z));
    assert.ok(placement.modelIndex === 1 || placement.modelIndex === 4 || placement.modelIndex === 7);

    const frame = getHeroRiverCorridorFrame(placement.x, placement.z);
    const reach = HERO_RIVER_NETWORK_DEFINITION.reaches.find(
      (candidate) => candidate.id === placement.reachId,
    );
    const disturbance = reach.disturbances.find(
      (candidate) => candidate.distanceM === placement.distanceM,
    );
    const wakeFrame = getHeroRiverCorridorFrame(
      placement.x + frame.flowDirection.x * disturbance.radius * 0.75,
      placement.z + frame.flowDirection.z * disturbance.radius * 0.75,
    );
    const upstreamFrame = getHeroRiverCorridorFrame(
      placement.x - frame.flowDirection.x * disturbance.radius * 0.25,
      placement.z - frame.flowDirection.z * disturbance.radius * 0.25,
    );
    const tailFrame = getHeroRiverCorridorFrame(
      placement.x + frame.flowDirection.x * disturbance.radius * 2.6,
      placement.z + frame.flowDirection.z * disturbance.radius * 2.6,
    );

    assert.ok(frame.disturbanceMask > disturbance.strength * 0.55);
    assert.equal(upstreamFrame.disturbanceMask, 0);
    assert.ok(wakeFrame.disturbanceMask > disturbance.strength * 0.9);
    assert.equal(tailFrame.disturbanceMask, 0);
    assert.ok(frame.bedMask > 0.5);
  }

  for (let left = 0; left < first.length; left += 1) {
    for (let right = left + 1; right < first.length; right += 1) {
      assert.ok(Math.hypot(
        first[left].x - first[right].x,
        first[left].z - first[right].z,
      ) >= 18);
    }
  }
});

test('hero river rocks use one instanced draw call per authored model and land on terrain', () => {
  const assets = Array.from({ length: 9 }, createRockAsset);
  const placements = getHeroRiverRockPlacements();
  const sampledGround = [];
  const terrain = {
    getHeightAt(x, z) {
      sampledGround.push([x, z]);
      return x * 0.001 + z * 0.002;
    },
  };
  const group = createHeroRiverRockInstances(assets, terrain);
  const meshes = group.children.filter((child) => child.isInstancedMesh);

  assert.equal(group.name, 'HeroRiverRockSetDressing');
  assert.equal(meshes.length, 3);
  assert.equal(meshes.reduce((sum, mesh) => sum + mesh.count, 0), placements.length);
  assert.equal(sampledGround.length, placements.length);
  assert.deepEqual(
    meshes.map((mesh) => mesh.name).sort(),
    ['HeroRiverRockInstances_02', 'HeroRiverRockInstances_05', 'HeroRiverRockInstances_08'],
  );

  for (const mesh of meshes) {
    const modelIndex = Number(mesh.name.slice(-2)) - 1;
    const modelPlacements = placements.filter((placement) => placement.modelIndex === modelIndex);

    assert.equal(mesh.count, modelPlacements.length);
    assert.equal(mesh.castShadow, true);
    assert.equal(mesh.receiveShadow, true);
    assert.equal(mesh.material.roughness, 0.72);
    assert.equal(mesh.material.metalness, 0);

    for (let index = 0; index < mesh.count; index += 1) {
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      const placement = modelPlacements[index];

      mesh.getMatrixAt(index, matrix);
      matrix.decompose(position, quaternion, scale);
      assert.ok(Math.abs(position.x - placement.x) < 1e-4);
      assert.ok(Math.abs(position.z - placement.z) < 1e-4);
      assert.ok(Math.abs(position.y - terrain.getHeightAt(placement.x, placement.z)) < 1e-4);
      assert.ok(Math.abs(scale.y * 2 - placement.height) < 1e-5);
    }
  }
});

function createRockAsset() {
  const scene = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.4 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), material);

  scene.add(mesh);
  return { scene };
}
