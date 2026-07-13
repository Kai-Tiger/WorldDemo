import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { getGoldenShotFromLocation } from '../src/goldenShots.js';
import {
  PLUNGE_POOL,
  getBakedLowlandHeight,
} from '../src/lowlandHeightPlan.js';
import { createRiverWaterMesh } from '../src/riverChannel.js';
import {
  applyWaterSystemMacroTerrain,
  applyWaterSystemTerrain,
  createWaterSystem,
  getFlowingWaterGrassAcceptance,
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

test('runtime water terrain keeps baked lowland channels while retaining mountain carving', () => {
  assert.equal(applyWaterSystemTerrain(9, 735, -308), 9);
  const plungeFloor = PLUNGE_POOL.waterLevel - PLUNGE_POOL.maxDepth;

  assert.equal(applyWaterSystemMacroTerrain(30, 418, -424), plungeFloor);
  assert.equal(applyWaterSystemMacroTerrain(plungeFloor, 418, -424), plungeFloor);

  for (let ring = 0; ring <= 9; ring += 1) {
    for (let segment = 0; segment < 24; segment += 1) {
      const radius = ring / 10 * PLUNGE_POOL.radius;
      const angle = segment / 24 * Math.PI * 2;
      const x = PLUNGE_POOL.cx + Math.cos(angle) * radius;
      const z = PLUNGE_POOL.cz + Math.sin(angle) * radius;
      const bakedHeight = getBakedLowlandHeight(x, z);

      assert.ok(Math.abs(
        applyWaterSystemMacroTerrain(bakedHeight, x, z) - bakedHeight,
      ) < 1e-10);
    }
  }
  assert.ok(applyWaterSystemMacroTerrain(80, 300, -400) < 32);
});

test('flowing-water grass acceptance combines rivers with lake and waterfall safety zones', () => {
  for (const [x, z] of [
    [300, -400],
    [PLUNGE_POOL.cx, PLUNGE_POOL.cz],
    [76, -552],
    [820, -260],
    [392, -419],
  ]) {
    assert.equal(getFlowingWaterGrassAcceptance(x, z), 0);
  }

  assert.equal(getFlowingWaterGrassAcceptance(361.4, -400), 0);
  assert.equal(getFlowingWaterGrassAcceptance(361.7, -400), 1);
  assert.equal(getFlowingWaterGrassAcceptance(418, -437.9), 0);
  assert.equal(getFlowingWaterGrassAcceptance(418, -438.1), 1);

  const outletCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(340, 0, -410),
    new THREE.Vector3(365, 0, -417),
    new THREE.Vector3(392, 0, -419),
    new THREE.Vector3(409, 0, -421),
  ], false, 'centripetal');
  const outletCenter = outletCurve.getPoint(2 / 3);
  const outletTangent = outletCurve.getTangent(2 / 3).normalize();
  const outletSide = new THREE.Vector3(-outletTangent.z, 0, outletTangent.x);
  const outletAcceptanceAt = (lateralDistance) => getFlowingWaterGrassAcceptance(
    outletCenter.x + outletSide.x * lateralDistance,
    outletCenter.z + outletSide.z * lateralDistance,
  );

  assert.ok(outletAcceptanceAt(6.2) < 0.001);
  assert.ok(Math.abs(outletAcceptanceAt(8.5) - 0.35) < 0.001);
  assert.equal(outletAcceptanceAt(11), 1);
  assert.equal(getFlowingWaterGrassAcceptance(410.3, -410.1), 0);
  const outletRecovery = getFlowingWaterGrassAcceptance(406.1, -409.6);

  assert.ok(outletRecovery > 0.35 && outletRecovery < 0.7);
  assert.equal(getFlowingWaterGrassAcceptance(404, -409.2), 1);
  assert.equal(getFlowingWaterGrassAcceptance(1000, 1000), 1);

  for (const [x, z] of [
    [518, -374],
    [758, -296],
    [-116, -572],
    [405, -410],
  ]) {
    const acceptance = getFlowingWaterGrassAcceptance(x, z);

    assert.ok(Number.isFinite(acceptance));
    assert.ok(acceptance >= 0 && acceptance <= 1);
  }
});

test('water system exposes one merged tributary surface and keeps the compatibility alias', () => {
  const system = createWaterSystem(createTerrainStub());
  const tributaries = system.tributaries;
  const confluencePositions = system.confluence.geometry.getAttribute('position');

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
  assert.ok(Math.abs(
    confluencePositions.getY(0) - (PLUNGE_POOL.waterLevel + 0.02),
  ) < 1e-6);

  const camera = new THREE.PerspectiveCamera();

  camera.position.set(12, 34, 56);
  updateWaterSystemVisuals(system, camera, 4.25);
  assert.equal(tributaries.material.uniforms.uTime.value, 4.25);
  assert.deepEqual(tributaries.material.uniforms.uCameraPosition.value.toArray(), [12, 34, 56]);

  disposeSystem(system);
});

test('all flowing water meshes share one probe-capped material and update it once per frame', () => {
  const system = createWaterSystem(createTerrainStub());
  const flowingMeshes = [
    system.outletStream,
    system.tributaries,
    ...system.lowlands.streams,
  ];
  const sharedMaterial = system.tributaries.material;

  assert.equal(flowingMeshes.length, 3);
  assert.ok(flowingMeshes.every((mesh) => mesh.material === sharedMaterial));
  assert.ok(flowingMeshes.every((mesh) => mesh.userData.waterReflectionModeCap === 1));
  for (const mesh of flowingMeshes) {
    for (const [attribute, itemSize] of [
      ['waterDepth', 1],
      ['shoreDistance', 1],
      ['flowSpeed', 1],
      ['rapidMask', 1],
      ['flowDirection', 2],
      ['flowUv', 2],
      ['junctionFlowDirection', 2],
      ['disturbanceMask', 1],
      ['waterFade', 1],
      ['junctionMask', 1],
      ['viewDistance', 1],
    ]) {
      assert.equal(mesh.geometry.getAttribute(attribute).itemSize, itemSize);
    }
  }

  const positions = system.tributaries.geometry.getAttribute('position');
  const waterDepths = system.tributaries.geometry.getAttribute('waterDepth');

  for (let vertex = 0; vertex < positions.count; vertex += 17) {
    assert.ok(Math.abs(
      waterDepths.getX(vertex) - Math.max(positions.getY(vertex) - 24, 0)
    ) < 1e-5);
  }

  const lowlandPositions = system.lowlands.stream.geometry.getAttribute('position');
  const lowlandDepths = system.lowlands.stream.geometry.getAttribute('waterDepth');

  for (let vertex = 0; vertex < lowlandPositions.count; vertex += 11) {
    assert.ok(Math.abs(
      lowlandDepths.getX(vertex) - Math.max(lowlandPositions.getY(vertex) - 24, 0)
    ) < 1e-5);
  }

  const outletUvs = system.outletStream.geometry.getAttribute('uv');
  const outletLastRow = 90 * 11;

  assert.equal(outletUvs.getX(0), 0);
  assert.ok(outletUvs.getX(outletLastRow) > 50);
  assert.equal(outletUvs.getX(outletLastRow), outletUvs.getX(outletLastRow + 10));

  const outletFlowUvs = system.outletStream.geometry.getAttribute('flowUv');
  const outletJunctionDirections = system.outletStream.geometry.getAttribute(
    'junctionFlowDirection',
  );

  for (let vertex = 0; vertex < outletFlowUvs.count; vertex += 17) {
    assert.ok(Number.isFinite(outletFlowUvs.getX(vertex)));
    assert.ok(Number.isFinite(outletFlowUvs.getY(vertex)));
    assert.ok(Math.abs(
      Math.hypot(
        outletJunctionDirections.getX(vertex),
        outletJunctionDirections.getY(vertex),
      ) - 1,
    ) < 1e-5);
  }

  let timeWrites = 0;
  let cameraWrites = 0;
  let elapsedTime = 0;

  Object.defineProperty(sharedMaterial.uniforms.uTime, 'value', {
    configurable: true,
    get: () => elapsedTime,
    set: (value) => {
      elapsedTime = value;
      timeWrites += 1;
    },
  });
  sharedMaterial.uniforms.uCameraPosition.value = {
    copy() {
      cameraWrites += 1;
    },
  };

  updateWaterSystemVisuals(system, new THREE.PerspectiveCamera(), 3.5);

  assert.equal(timeWrites, 1);
  assert.equal(cameraWrites, 1);
  assert.ok(flowingMeshes.reduce(
    (triangles, mesh) => triangles + mesh.geometry.index.count / 3,
    0,
  ) < 40000);

  disposeSystem(system);
});

test('all flowing river surfaces stay within the shared draw-call and triangle budgets', () => {
  const terrain = createTerrainStub();
  const system = createWaterSystem(terrain);
  const heroRiver = createRiverWaterMesh(terrain);
  const flowingMeshes = [
    heroRiver,
    system.outletStream,
    system.tributaries,
    ...system.lowlands.streams,
  ];

  assert.ok(flowingMeshes.length <= 5);
  assert.ok(new Set(flowingMeshes.map((mesh) => mesh.material)).size <= 2);
  assert.ok(flowingMeshes.reduce(
    (triangles, mesh) => triangles + mesh.geometry.index.count / 3,
    0,
  ) < 40000);

  heroRiver.geometry.dispose();
  heroRiver.material.dispose();
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
