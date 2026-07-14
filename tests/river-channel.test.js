import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HERO_RIVER_NETWORK,
  RIVER_BED_TEXTURE_WORLD_SIZE,
  RIVER_TERMINAL_LAKE,
  applyRiverChannel,
  createRiverWaterMesh,
  createWetBankMesh,
  getRiverGrassAcceptance,
  getRiverMaterialFrame,
  getRiverWaterGeometryMaxDistance,
  isInRiverGrassExclusion,
} from '../src/riverChannel.js';
import {
  HERO_RIVER_NETWORK_DEFINITION,
  getHeroRiverConfluenceMask,
  getHeroRiverCorridorFrame,
  getHeroRiverTerrainTarget,
} from '../src/lowlandHeightPlan.js';
import { getWaterSystemMaterialFrame } from '../src/waterSystem.js';

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
  assert.equal(water.visible, false);
  assert.equal(water.material.isMeshBasicMaterial, true);
  assert.equal(water.material.visible, false);
  assert.ok(getRiverWaterGeometryMaxDistance() > 270);

  for (const [attribute, itemSize] of [
    ['waterDepth', 1],
    ['shoreDistance', 1],
    ['flowSpeed', 1],
    ['rapidMask', 1],
    ['flowDirection', 2],
    ['flowUv', 2],
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

    assert.equal(reach.targetSpacing, 0.6);
    assert.equal(reach.lateralSegments, 8);

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
    const outgoing = HERO_RIVER_NETWORK.outgoingByNode.get(junction.nodeId)[0];
    const outgoingReach = HERO_RIVER_NETWORK.reachById.get(outgoing.id);

    assert.ok(Math.abs(
      flowSpeeds.getX(junction.centerVertex)
        - outgoingReach.samples[0].flowSpeed,
    ) < 1e-5);
  }

  geometry.dispose();
  water.material.dispose();
});

test('hero lower river geometry grounds bank edges while preserving the center surface', () => {
  const terrainHeight = 1.4;
  const terrain = { getHeightAt: () => terrainHeight };
  const water = createRiverWaterMesh(terrain);
  const position = water.geometry.getAttribute('position');
  const waterDepth = water.geometry.getAttribute('waterDepth');
  const stats = water.userData.riverNetworkStats.reaches.find(
    (entry) => entry.id === 'hero-main-lower',
  );
  const expectedBankHeight = terrainHeight + 0.02;
  let groundedEdgeCount = 0;

  for (let row = 0; row < stats.rowCount; row += 1) {
    const rowStart = stats.startVertex + row * stats.rowSize;
    const center = rowStart + Math.floor(stats.rowSize / 2);

    assert.ok(position.getY(center) >= RIVER_TERMINAL_LAKE.waterLevel);
    assert.ok(Math.abs(
      waterDepth.getX(center) - (position.getY(center) - terrainHeight)
    ) < 1e-5);

    for (const edge of [rowStart, rowStart + stats.rowSize - 1]) {
      const lakeDistance = Math.hypot(
        position.getX(edge) - RIVER_TERMINAL_LAKE.cx,
        position.getZ(edge) - RIVER_TERMINAL_LAKE.cz,
      );

      if (lakeDistance < RIVER_TERMINAL_LAKE.radius) continue;

      groundedEdgeCount += 1;
      assert.ok(Math.abs(position.getY(edge) - expectedBankHeight) < 1e-5);
      assert.ok(Math.abs(waterDepth.getX(edge) - 0.02) < 1e-5);
    }
  }

  const finalCenter = stats.startVertex
    + (stats.rowCount - 1) * stats.rowSize
    + Math.floor(stats.rowSize / 2);
  const expectedLakeSurface = RIVER_TERMINAL_LAKE.waterLevel
    + RIVER_TERMINAL_LAKE.surfaceOffset;

  assert.ok(groundedEdgeCount > 0);
  assert.ok(Math.abs(position.getY(finalCenter) - expectedLakeSurface) < 1e-5);

  water.geometry.dispose();
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
  const confluenceCenter = getRiverMaterialFrame(0, 575, -336);
  const confluenceWedge = getRiverMaterialFrame(0, 574.65, -332.02);
  const innerEdge = getRiverMaterialFrame(
    3,
    center.center.x + center.side.x * (center.halfWidth - 0.5),
    center.center.z + center.side.z * (center.halfWidth - 0.5),
  );
  const outerEdge = getRiverMaterialFrame(
    3,
    center.center.x + center.side.x * (center.halfWidth + 0.5),
    center.center.z + center.side.z * (center.halfWidth + 0.5),
  );

  assert.ok(bed.riverBedMask > 0.9);
  assert.ok(innerEdge.riverBedMask > 0 && innerEdge.riverBedMask < 1);
  assert.ok(outerEdge.riverBedMask > 0 && outerEdge.riverBedMask < 1);
  assert.ok(innerEdge.riverBedMask > outerEdge.riverBedMask);
  assert.ok(wet.riverMask > 0.5);
  assert.ok(gravel.riverGravelMask > 0.4);
  assert.ok(confluenceCenter.riverBedMask > 0.9);
  assert.ok(confluenceCenter.riverUnderwaterMask > 0.9);
  assert.ok(confluenceWedge.riverBedMask < 0.9);
  assert.equal(isInRiverGrassExclusion(635, -300, 0), true);
  assert.equal(isInRiverGrassExclusion(780, -230, 0), false);
});

test('hero terminal lake fades every river mask outside and owns the full interior', () => {
  const transition = HERO_RIVER_NETWORK_DEFINITION.terminalLakeTransition;
  const reach = HERO_RIVER_NETWORK_DEFINITION.reaches.find(
    (entry) => entry.id === 'hero-main-lower',
  );
  const approach = reach.points.at(-2);
  const approachX = approach[0] - transition.center[0];
  const approachZ = approach[1] - transition.center[1];
  const approachLength = Math.hypot(approachX, approachZ);
  const pointAtLakeRadius = (radius) => ({
    x: transition.center[0] + approachX / approachLength * radius,
    z: transition.center[1] + approachZ / approachLength * radius,
  });
  const fadeStart = pointAtLakeRadius(transition.radius + transition.fadeLength);
  const midpoint = pointAtLakeRadius(transition.radius + transition.fadeLength * 0.5);
  const shore = pointAtLakeRadius(transition.radius);
  const inside = pointAtLakeRadius(transition.radius - 1);
  const lakeCenter = pointAtLakeRadius(0);
  const fadeStartMaterial = getRiverMaterialFrame(0, fadeStart.x, fadeStart.z);
  const shoreMaterial = getRiverMaterialFrame(0, shore.x, shore.z);
  const midpointMaterial = getRiverMaterialFrame(0, midpoint.x, midpoint.z);
  const insideMaterial = getRiverMaterialFrame(0, inside.x, inside.z);
  const centerMaterial = getRiverMaterialFrame(0, lakeCenter.x, lakeCenter.z);
  const waterSystemMaterial = getWaterSystemMaterialFrame(
    0,
    lakeCenter.x,
    lakeCenter.z,
  );
  const assertNoRiverMasks = (material) => {
    assert.equal(material.riverMask, 0);
    assert.equal(material.riverBedMask, 0);
    assert.equal(material.riverUnderwaterMask, 0);
    assert.equal(material.riverGravelMask, 0);
  };

  assert.ok(fadeStartMaterial.riverBedMask > 0.999999);
  assert.ok(fadeStartMaterial.riverUnderwaterMask > 0.999999);
  assert.ok(Math.abs(midpointMaterial.riverBedMask - 0.5) < 1e-8);
  assert.ok(Math.abs(midpointMaterial.riverUnderwaterMask - 0.5) < 1e-8);
  assertNoRiverMasks(shoreMaterial);
  assertNoRiverMasks(insideMaterial);
  assertNoRiverMasks(centerMaterial);
  assert.equal(getHeroRiverCorridorFrame(shore.x, shore.z), null);
  assert.equal(getHeroRiverCorridorFrame(inside.x, inside.z), null);
  assert.equal(getHeroRiverTerrainTarget(10, shore.x, shore.z), null);
  assert.equal(getHeroRiverTerrainTarget(10, lakeCenter.x, lakeCenter.z), null);
  assert.equal(waterSystemMaterial.riverNetworkBedMask, 0);
});

test('hero river grass acceptance keeps wet water features clear and restores dry ground', () => {
  const frame = getHeroRiverCorridorFrame(518, -374);
  const bankFrame = getHeroRiverCorridorFrame(
    frame.center.x + frame.side.x * 0.25,
    frame.center.z + frame.side.z * 0.25,
  );
  const wetOuter = bankFrame.halfWidth + bankFrame.wetBankWidth + 0.6;
  const sparseOuter = Math.max(
    bankFrame.halfWidth + bankFrame.wetBankWidth + bankFrame.gravelBankWidth,
    wetOuter + 1.5,
  );
  const bankDistances = [
    wetOuter,
    sparseOuter,
    sparseOuter + 2.5,
  ];
  const bankAcceptance = bankDistances.map((distance) => getRiverGrassAcceptance(
    bankFrame.center.x + bankFrame.side.x * distance,
    bankFrame.center.z + bankFrame.side.z * distance,
  ));

  assert.equal(getRiverGrassAcceptance(518, -374), 0);
  assert.equal(getRiverGrassAcceptance(575, -336), 0);
  assert.equal(getRiverGrassAcceptance(
    RIVER_TERMINAL_LAKE.cx,
    RIVER_TERMINAL_LAKE.cz,
  ), 0);
  assert.equal(bankAcceptance[0], 0);
  assert.ok(Math.abs(bankAcceptance[1] - 0.35) < 0.01);
  assert.ok(Math.abs(bankAcceptance[2] - 1) < 0.01);
  assert.equal(getRiverGrassAcceptance(780, -230), 1);
});

test('hero Y confluences keep wet arms clear and dry wedges sparsely grassed', () => {
  const confluences = HERO_RIVER_NETWORK_DEFINITION.nodes.filter(
    (node) => node.type === 'confluence',
  );

  for (const confluence of confluences) {
    const dryWedgeAcceptances = [];

    for (let step = 0; step < 72; step += 1) {
      const angle = step / 72 * Math.PI * 2;
      const radius = confluence.poolRadius * 0.85;
      const x = confluence.position[0] + Math.cos(angle) * radius;
      const z = confluence.position[1] + Math.sin(angle) * radius;
      const acceptance = getRiverGrassAcceptance(x, z);

      if (getHeroRiverConfluenceMask(x, z) > 0.02) {
        assert.equal(acceptance, 0);
      } else {
        dryWedgeAcceptances.push(acceptance);
      }
    }

    assert.ok(dryWedgeAcceptances.some((acceptance) => acceptance > 0));
    assert.ok(dryWedgeAcceptances.every((acceptance) => acceptance <= 0.35));
  }
});

test('hero Y confluence bed material feathers across the water boundary', () => {
  for (const confluence of HERO_RIVER_NETWORK_DEFINITION.confluences) {
    const partialMasks = [];

    for (let angleStep = 0; angleStep < 72; angleStep += 1) {
      const angle = angleStep / 72 * Math.PI * 2;

      for (let radius = 1; radius <= confluence.poolRadius + 5; radius += 0.25) {
        const mask = getRiverMaterialFrame(
          0,
          confluence.position[0] + Math.cos(angle) * radius,
          confluence.position[1] + Math.sin(angle) * radius,
        ).riverBedMask;

        if (mask > 0.05 && mask < 0.95) partialMasks.push(mask);
      }
    }

    assert.ok(partialMasks.length > 20, `${confluence.id} bed edge must be anti-aliased`);
  }
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
