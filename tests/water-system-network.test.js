import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { getGoldenShotFromLocation } from '../src/goldenShots.js';
import {
  ALPINE_LAKE_BOUNDARY,
  getLakeBoundaryFrame,
} from '../src/lakeBoundary.js';
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

test('the independent Alpine outlet shares one continuous lake-edge bed', () => {
  const system = createWaterSystem(createTerrainStub());
  const positions = system.outletStream.geometry.getAttribute('position');
  const shoreX = positions.getX(5);
  const shoreZ = positions.getZ(5);
  const directionX = shoreX - ALPINE_LAKE_BOUNDARY.cx;
  const directionZ = shoreZ - ALPINE_LAKE_BOUNDARY.cz;
  const directionLength = Math.hypot(directionX, directionZ);

  for (const distance of [0.01, 0.001]) {
    const offsetX = directionX / directionLength * distance;
    const offsetZ = directionZ / directionLength * distance;
    const outsideHeight = applyWaterSystemMacroTerrain(
      50,
      shoreX + offsetX,
      shoreZ + offsetZ,
    );
    const insideHeight = applyWaterSystemMacroTerrain(
      50,
      shoreX - offsetX,
      shoreZ - offsetZ,
    );

    assert.ok(Math.abs(outsideHeight - insideHeight) < 1e-3);
  }

  disposeSystem(system);
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

  const system = createWaterSystem(createTerrainStub());
  const outletPositions = system.outletStream.geometry.getAttribute('position');
  const outletRowSize = 11;
  const outletRow = 60;
  const outletCenterVertex = outletRow * outletRowSize + 5;
  const outletPreviousVertex = (outletRow - 1) * outletRowSize + 5;
  const outletNextVertex = (outletRow + 1) * outletRowSize + 5;
  const outletCenter = new THREE.Vector3(
    outletPositions.getX(outletCenterVertex),
    0,
    outletPositions.getZ(outletCenterVertex),
  );
  const outletTangent = new THREE.Vector3(
    outletPositions.getX(outletNextVertex) - outletPositions.getX(outletPreviousVertex),
    0,
    outletPositions.getZ(outletNextVertex) - outletPositions.getZ(outletPreviousVertex),
  ).normalize();
  const outletSide = new THREE.Vector3(-outletTangent.z, 0, outletTangent.x);
  const outletAcceptanceAt = (lateralDistance) => getFlowingWaterGrassAcceptance(
    outletCenter.x + outletSide.x * lateralDistance,
    outletCenter.z + outletSide.z * lateralDistance,
  );

  disposeSystem(system);

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

test('water system exposes one merged tributary geometry source and keeps the compatibility alias', () => {
  const system = createWaterSystem(createTerrainStub());
  const tributaries = system.tributaries;
  const confluencePositions = system.confluence.geometry.getAttribute('position');

  assert.equal(system.snowmelt, tributaries);
  assert.equal(tributaries.name, 'AlpineRiverNetworkSurface');
  assert.equal(tributaries.isMesh, true);
  assert.equal(tributaries.visible, false);
  assert.ok(tributaries.userData.riverNetworkStats.triangleCount < 12000);
  assert.equal(tributaries.material.isMeshBasicMaterial, true);
  assert.equal(tributaries.material.visible, false);
  assert.equal(tributaries.material.depthWrite, false);
  assert.equal(tributaries.geometry.getAttribute('junctionMask').itemSize, 1);
  assert.equal(tributaries.geometry.getAttribute('viewDistance').itemSize, 1);
  assert.ok(Math.abs(
    confluencePositions.getY(0) - (PLUNGE_POOL.waterLevel + 0.02),
  ) < 1e-6);

  const camera = new THREE.PerspectiveCamera();
  const waterfallMaterial = system.waterfall.children[0].material;

  camera.position.set(12, 34, 56);
  updateWaterSystemVisuals(system, camera, 4.25);
  assert.equal(waterfallMaterial.uniforms.uTime.value, 4.25);
  assert.deepEqual(waterfallMaterial.uniforms.uCameraPosition.value.toArray(), [12, 34, 56]);

  disposeSystem(system);
});

test('flowing water geometry sources share one non-rendering material', () => {
  const system = createWaterSystem(createTerrainStub());
  const flowingMeshes = [
    system.outletStream,
    system.tributaries,
    ...system.lowlands.streams,
  ];
  const sharedMaterial = system.tributaries.material;

  assert.equal(flowingMeshes.length, 3);
  assert.ok(flowingMeshes.every((mesh) => mesh.material === sharedMaterial));
  assert.ok(flowingMeshes.every((mesh) => mesh.visible === false));
  assert.equal(sharedMaterial.isMeshBasicMaterial, true);
  assert.equal(sharedMaterial.visible, false);
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
  const outletPositions = system.outletStream.geometry.getAttribute('position');
  const outletLastRow = 90 * 11;

  assert.equal(outletUvs.getX(0), 0);
  assert.ok(outletUvs.getX(outletLastRow) > 50);
  assert.equal(outletUvs.getX(outletLastRow), outletUvs.getX(outletLastRow + 10));

  const outletFlowUvs = system.outletStream.geometry.getAttribute('flowUv');
  const outletWaterFades = system.outletStream.geometry.getAttribute('waterFade');
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

  for (let vertex = 0; vertex < 11; vertex += 1) {
    const frame = getLakeBoundaryFrame(
      ALPINE_LAKE_BOUNDARY,
      outletPositions.getX(vertex),
      outletPositions.getZ(vertex),
    );

    assert.ok(Math.abs(frame.signedDistance) < 1e-4);
    assert.equal(outletWaterFades.getX(vertex), 0);
  }

  for (let row = 0; row <= 90; row += 15) {
    const left = row * 11;
    const center = left + 5;
    const right = left + 10;
    const width = Math.hypot(
      outletPositions.getX(right) - outletPositions.getX(left),
      outletPositions.getZ(right) - outletPositions.getZ(left),
    );

    assert.ok(Math.abs(outletFlowUvs.getY(left) + width * 0.5) < 3e-5);
    assert.equal(outletFlowUvs.getY(center), 0);
    assert.ok(Math.abs(outletFlowUvs.getY(right) - width * 0.5) < 3e-5);
  }

  assert.ok(flowingMeshes.reduce(
    (triangles, mesh) => triangles + mesh.geometry.index.count / 3,
    0,
  ) < 40000);

  disposeSystem(system);
});

test('all flowing river geometry sources stay within the triangle budget', () => {
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

test('cirque tarn is an upward circular lake geometry source', () => {
  const system = createWaterSystem(createTerrainStub());
  const tarn = system.cirqueTarn;
  const positions = tarn.geometry.getAttribute('position');
  const normals = tarn.geometry.getAttribute('normal');

  assert.equal(tarn.name, 'CirqueTarnSurface');
  assert.equal(tarn.visible, false);
  assert.equal(tarn.material.isMeshBasicMaterial, true);
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
