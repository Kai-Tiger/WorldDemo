import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  RIVER_TERMINAL_LAKE,
  applyRiverChannel,
  createRiverWaterMesh,
  createWetBankMesh,
  getRiverWaterGeometryMaxDistance,
} from '../src/riverChannel.js';

const UV_DISTANCE_SCALE = 8;
const MAX_LONGITUDINAL_STEP = 0.3;

function createTerrainStub() {
  return {
    getHeightAt: () => -3,
  };
}

function getRowDistances(geometry) {
  const uvs = geometry.getAttribute('uv');
  const distances = [];

  for (let vertex = 0; vertex < uvs.count; vertex += 1) {
    if (Math.abs(uvs.getY(vertex)) < 1e-6) {
      distances.push(uvs.getX(vertex) * UV_DISTANCE_SCALE);
    }
  }

  return distances;
}

test('runtime river channel leaves the baked main river and terminal basin unchanged', () => {
  assert.equal(RIVER_TERMINAL_LAKE.waterLevel, 1.6);
  assert.equal(applyRiverChannel(8.25, 545, -350), 8.25);
  assert.equal(
    applyRiverChannel(8.25, RIVER_TERMINAL_LAKE.cx, RIVER_TERMINAL_LAKE.cz),
    8.25,
  );
});

test('river water geometry ends exactly where the terminal-lake alpha reaches zero', () => {
  const water = createRiverWaterMesh(createTerrainStub());
  const geometry = water.geometry;
  const positions = geometry.getAttribute('position');
  const uvs = geometry.getAttribute('uv');
  const waterDepths = geometry.getAttribute('waterDepth');
  const entryDistance = water.material.uniforms.uTerminalLakeEntryDistance.value;
  const fadeLength = water.material.uniforms.uTerminalLakeVisualFadeLength.value;
  const maxDistance = getRiverWaterGeometryMaxDistance();
  const rowDistances = getRowDistances(geometry);

  assert.ok(Math.abs(maxDistance - (entryDistance + fadeLength)) < 1e-6);
  assert.ok(Math.abs(rowDistances.at(-1) - maxDistance) < 1e-3);
  assert.equal(waterDepths.count, positions.count);

  for (let row = 1; row < rowDistances.length; row += 1) {
    const step = rowDistances[row] - rowDistances[row - 1];

    assert.ok(step > 0);
    assert.ok(step <= MAX_LONGITUDINAL_STEP + 1e-3);
  }

  const verticesPerRow = uvs.count / rowDistances.length;
  const firstCenterVertex = Math.floor(verticesPerRow / 2);
  const lastCenterVertex = (rowDistances.length - 1) * verticesPerRow
    + Math.floor(verticesPerRow / 2);
  const lakeDistance = Math.hypot(
    positions.getX(lastCenterVertex) - RIVER_TERMINAL_LAKE.cx,
    positions.getZ(lastCenterVertex) - RIVER_TERMINAL_LAKE.cz,
  );
  const expectedSurfaceHeight = RIVER_TERMINAL_LAKE.waterLevel
    + RIVER_TERMINAL_LAKE.surfaceOffset;

  assert.ok(Math.abs(positions.getY(firstCenterVertex) - 3.2) < 1e-5);
  for (let row = 1; row < rowDistances.length; row += 1) {
    const previousCenter = (row - 1) * verticesPerRow + Math.floor(verticesPerRow / 2);
    const center = row * verticesPerRow + Math.floor(verticesPerRow / 2);

    assert.ok(positions.getY(center) <= positions.getY(previousCenter) + 1e-6);
  }
  assert.ok(lakeDistance > 14);
  assert.ok(lakeDistance < RIVER_TERMINAL_LAKE.radius);
  assert.ok(Math.abs(positions.getY(lastCenterVertex) - expectedSurfaceHeight) < 1e-5);

  geometry.dispose();
  water.material.dispose();
});

test('wet-bank geometry keeps the complete channel while water alone is truncated', () => {
  const riverBank = new THREE.Texture();
  const wetBanks = createWetBankMesh(createTerrainStub(), { riverBank });
  const waterMaxDistance = getRiverWaterGeometryMaxDistance();

  for (const bank of wetBanks.children) {
    const rowDistances = getRowDistances(bank.geometry);

    assert.ok(rowDistances.at(-1) > waterMaxDistance);
    bank.geometry.dispose();
  }

  wetBanks.children[0].material.dispose();
  riverBank.dispose();
});
