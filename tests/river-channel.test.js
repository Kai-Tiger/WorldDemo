import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HERO_RIVER_NETWORK,
  RIVER_BED_TEXTURE_WORLD_SIZE,
  RIVER_TERMINAL_LAKE,
  applyRiverChannel,
  createRiverWaterMesh,
  createWetBankMesh,
  getRiverMaterialFrame,
  getRiverWaterGeometryMaxDistance,
  isInRiverGrassExclusion,
} from '../src/riverChannel.js';
import { getHeroRiverCorridorFrame } from '../src/lowlandHeightPlan.js';

function createTerrainStub() {
  return {
    getHeightAt: () => -3,
  };
}

test('runtime river channel leaves the baked hero valley and terminal basin unchanged', () => {
  assert.equal(RIVER_TERMINAL_LAKE.waterLevel, 1.6);
  assert.equal(applyRiverChannel(8.25, 545, -350), 8.25);
  assert.equal(
    applyRiverChannel(8.25, RIVER_TERMINAL_LAKE.cx, RIVER_TERMINAL_LAKE.cz),
    8.25,
  );
  assert.equal(createWetBankMesh().children.length, 0);
});

test('hero river water is one compiled DAG surface with metric downstream attributes', () => {
  const water = createRiverWaterMesh(createTerrainStub());
  const { geometry } = water;
  const positions = geometry.getAttribute('position');
  const uvs = geometry.getAttribute('uv');
  const stats = water.userData.riverNetworkStats;

  assert.equal(HERO_RIVER_NETWORK.topologicalNodeIds.at(-1), 'terminal-lake');
  assert.equal(stats.reachCount, 5);
  assert.equal(stats.junctionCount, 2);
  assert.ok(stats.triangleCount < 12000);
  assert.equal(water.userData.waterReflectionModeCap, 1);
  assert.ok(getRiverWaterGeometryMaxDistance() > 270);

  for (const [attribute, itemSize] of [
    ['waterDepth', 1],
    ['shoreDistance', 1],
    ['flowSpeed', 1],
    ['rapidMask', 1],
    ['flowDirection', 2],
    ['disturbanceMask', 1],
    ['waterFade', 1],
    ['junctionMask', 1],
    ['viewDistance', 1],
  ]) {
    const buffer = geometry.getAttribute(attribute);

    assert.equal(buffer.count, positions.count);
    assert.equal(buffer.itemSize, itemSize);
  }

  for (const reach of stats.reaches) {
    let previousU = -Infinity;
    let previousHeight = Infinity;

    if (reach.id.startsWith('hero-main-')) {
      assert.equal(reach.targetSpacing, 0.75);
      assert.equal(reach.lateralSegments, 8);
    }

    for (let row = 0; row < reach.rowCount; row += 1) {
      const rowStart = reach.startVertex + row * reach.rowSize;
      const center = rowStart + Math.floor(reach.rowSize / 2);
      const u = uvs.getX(center);
      const height = positions.getY(center);

      assert.ok(u > previousU);
      assert.ok(height <= previousHeight + 1e-5);
      for (let lateral = 0; lateral < reach.rowSize; lateral += 1) {
        assert.ok(Math.abs(uvs.getX(rowStart + lateral) - u) < 1e-5);
      }
      previousU = u;
      previousHeight = height;
    }
  }

  const directions = geometry.getAttribute('flowDirection');
  const depths = geometry.getAttribute('waterDepth');
  const flowSpeeds = geometry.getAttribute('flowSpeed');

  for (let vertex = 0; vertex < positions.count; vertex += 23) {
    assert.ok(Math.abs(Math.hypot(
      directions.getX(vertex),
      directions.getY(vertex),
    ) - 1) < 1e-5);
    assert.ok(Math.abs(depths.getX(vertex) - (positions.getY(vertex) + 3)) < 1e-5);
  }

  for (const junction of stats.junctions) {
    assert.ok(flowSpeeds.getX(junction.centerVertex) < Math.max(
      ...junction.boundaryVertices.map((vertex) => flowSpeeds.getX(vertex)),
    ));
  }

  geometry.dispose();
  water.material.dispose();
});

test('hero river material masks separate bed, wet bank, and dry gravel bank', () => {
  const center = getHeroRiverCorridorFrame(518, -374);

  assert.ok(center);
  const bed = getRiverMaterialFrame(3, 518, -374);
  const wetLateral = center.halfWidth + center.wetBankWidth * 0.5;
  const gravelLateral = center.halfWidth
    + center.wetBankWidth
    + center.gravelBankWidth * 0.5;
  const wet = getRiverMaterialFrame(
    3,
    center.center.x + center.side.x * wetLateral,
    center.center.z + center.side.z * wetLateral,
  );
  const gravel = getRiverMaterialFrame(
    3,
    center.center.x + center.side.x * gravelLateral,
    center.center.z + center.side.z * gravelLateral,
  );
  const confluenceGap = getRiverMaterialFrame(0, 574.65, -332.02);

  assert.ok(bed.riverBedMask > 0.9);
  assert.ok(wet.riverMask > 0.5);
  assert.ok(gravel.riverGravelMask > 0.5);
  assert.ok(confluenceGap.riverBedMask > 0.9);
  assert.ok(confluenceGap.riverUnderwaterMask > 0.9);
  assert.equal(isInRiverGrassExclusion(635, -300, 0), true);
  assert.equal(isInRiverGrassExclusion(780, -230, 0), false);
});

test('hero confluences keep river-local bed coordinates continuous across branch switches', () => {
  const confluences = [[575, -336], [633, -349]];

  for (const [centerX, centerZ] of confluences) {
    let maximumStep = 0;

    for (let x = centerX - 30; x <= centerX + 30; x += 1) {
      for (let z = centerZ - 30; z <= centerZ + 30; z += 1) {
        const current = getRiverMaterialFrame(0, x, z);

        for (const neighbor of [
          getRiverMaterialFrame(0, x + 1, z),
          getRiverMaterialFrame(0, x, z + 1),
        ]) {
          if (current.riverBedMask <= 0.9 || neighbor.riverBedMask <= 0.9) continue;
          maximumStep = Math.max(
            maximumStep,
            Math.abs(current.riverDistance - neighbor.riverDistance),
          );
        }
      }
    }

    assert.ok(maximumStep < RIVER_BED_TEXTURE_WORLD_SIZE);
  }
});
