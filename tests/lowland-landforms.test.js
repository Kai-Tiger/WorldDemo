import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { getGoldenShotFromLocation, listGoldenShotNames } from '../src/goldenShots.js';
import { createRiverNetworkWaterGeometry } from '../src/hydrology/riverNetworkWaterGeometry.js';
import { RIVER_TERMINAL_LAKE } from '../src/riverChannel.js';
import {
  LOWLAND_HILLS,
  LOWLAND_LAKES,
  LOWLAND_STREAM_DEFINITION,
  LOWLAND_STREAM_NETWORK,
  applyLowlandHillsTerrain,
  applyLowlandMacroTerrain,
  applyLowlandWaterTerrain,
  createLowlandLakeGeometry,
  getLowlandMaterialFrame,
  getLowlandMinimumSegmentsForBounds,
  getLowlandTerminalInletFade,
  isInLowlandVegetationExclusion,
} from '../src/lowlandLandforms.js';
import {
  createWaterSystem,
  getWaterSystemMaterialFrame,
  isInWaterSystemVegetationExclusion,
} from '../src/waterSystem.js';

const MAP_MIN = -1024;
const CHUNK_SIZE = 256;

test('lowland definitions keep one pond-to-terminal stream and varied frozen hill groups', () => {
  assert.equal(Object.isFrozen(LOWLAND_HILLS), true);
  assert.equal(Object.isFrozen(LOWLAND_LAKES), true);
  assert.equal(Object.isFrozen(LOWLAND_STREAM_DEFINITION), true);
  assert.equal(LOWLAND_HILLS.length, 10);
  assert.equal(LOWLAND_LAKES.length, 1);
  assert.equal(LOWLAND_STREAM_DEFINITION.reaches.length, 1);

  const pond = LOWLAND_LAKES[0];
  const reach = LOWLAND_STREAM_DEFINITION.reaches[0];

  assert.deepEqual([pond.cx, pond.cz, pond.waterLevel], [820, -260, -0.2]);
  assert.ok(pond.maxDepth >= 4.5);
  assert.deepEqual(reach.points[0], [820, -260]);
  assert.deepEqual(reach.points.at(-1), [690, -340]);
  assert.equal(reach.waterLevels[0], pond.waterLevel);
  assert.equal(reach.waterLevels.at(-1), -1.28);
  assert.deepEqual(reach.waterLevels.slice(0, 3), Array(3).fill(pond.waterLevel));
  assert.deepEqual(reach.waterLevels.slice(-2), Array(2).fill(-1.28));
  assert.notEqual(pond.radiusX, pond.radiusZ);

  for (let index = 1; index < reach.waterLevels.length; index += 1) {
    assert.ok(reach.waterLevels[index] <= reach.waterLevels[index - 1]);
  }

  const regions = new Set(LOWLAND_HILLS.map((hill) => hill.id.split('-')[0]));

  assert.ok(regions.size >= 3);
  assert.ok(LOWLAND_HILLS.every((hill) => Object.isFrozen(hill)));
  assert.ok(LOWLAND_HILLS.some((hill) => hill.radiusX > hill.radiusZ * 1.5));
  assert.ok(LOWLAND_HILLS.some((hill) => hill.radiusZ > hill.radiusX * 1.4));
});

test('the compiled slow creek descends continuously and stays below both banks', () => {
  const reach = LOWLAND_STREAM_NETWORK.reaches[0];
  let previousLevel = Infinity;

  for (let index = 0; index < reach.samples.length; index += 1) {
    const sample = reach.samples[index];
    const previous = reach.samples[Math.max(index - 1, 0)];
    const next = reach.samples[Math.min(index + 1, reach.samples.length - 1)];
    const tangentX = next.point.x - previous.point.x;
    const tangentZ = next.point.z - previous.point.z;
    const tangentLength = Math.hypot(tangentX, tangentZ) || 1;
    const sideX = -tangentZ / tangentLength;
    const sideZ = tangentX / tangentLength;
    const terrainBase = applyLowlandHillsTerrain(0, sample.point.x, sample.point.z);
    const bed = applyLowlandWaterTerrain(
      terrainBase,
      sample.point.x,
      sample.point.z,
    );
    const bankOffset = sample.influence + 1;
    const leftBank = applyLowlandHillsTerrain(
      0,
      sample.point.x + sideX * bankOffset,
      sample.point.z + sideZ * bankOffset,
    );
    const rightBank = applyLowlandHillsTerrain(
      0,
      sample.point.x - sideX * bankOffset,
      sample.point.z - sideZ * bankOffset,
    );

    assert.ok(sample.waterLevel <= previousLevel + 1e-8);
    if (getLowlandTerminalInletFade(sample.point.x, sample.point.z) > 0.999) {
      assert.ok(bed < sample.waterLevel - 0.35);
    }
    assert.ok(leftBank > sample.waterLevel);
    assert.ok(rightBank > sample.waterLevel);
    previousLevel = sample.waterLevel;
  }
});

test('broad hills remain walkable, affect shadow macro terrain, and stop at their boundaries', () => {
  let maximumSlope = 0;

  for (const hill of LOWLAND_HILLS) {
    assert.ok(applyLowlandHillsTerrain(0, hill.cx, hill.cz) >= hill.height);

    for (let z = hill.cz - hill.radiusZ * 1.2; z <= hill.cz + hill.radiusZ * 1.2; z += 2) {
      for (let x = hill.cx - hill.radiusX * 1.2; x <= hill.cx + hill.radiusX * 1.2; x += 2) {
        const xSlope = (
          applyLowlandHillsTerrain(0, x + 0.5, z)
          - applyLowlandHillsTerrain(0, x - 0.5, z)
        );
        const zSlope = (
          applyLowlandHillsTerrain(0, x, z + 0.5)
          - applyLowlandHillsTerrain(0, x, z - 0.5)
        );
        const slope = THREE.MathUtils.radToDeg(Math.atan(Math.hypot(xSlope, zSlope)));

        maximumSlope = Math.max(maximumSlope, slope);
      }
    }
  }

  assert.ok(maximumSlope < 25, `maximum lowland hill slope was ${maximumSlope}`);
  assert.equal(applyLowlandHillsTerrain(12, 0, 0), 12);
  assert.equal(applyLowlandHillsTerrain(7, 335, -358), 7);
  assert.ok(applyLowlandMacroTerrain(0, -645, 510) > 9);
});

test('pond terrain, masks, geometry, and vegetation share one irregular boundary', () => {
  const pond = LOWLAND_LAKES[0];
  const centerHeight = applyLowlandWaterTerrain(0, pond.cx, pond.cz);
  const streamFrame = getLowlandMaterialFrame(758, -296);
  const pondFrame = getLowlandMaterialFrame(pond.cx, pond.cz);

  assert.ok(centerHeight <= pond.waterLevel - pond.maxDepth + 1e-8);
  assert.equal(applyLowlandWaterTerrain(9, 0, 0), 9);
  assert.ok(pondFrame.lakeBedMask > 0.99);
  assert.ok(streamFrame.bedMask > 0.99);
  assert.equal(getLowlandMaterialFrame(0, 0).bedMask, 0);
  assert.equal(getLowlandMaterialFrame(690, -340).bedMask, 0);
  assert.equal(applyLowlandWaterTerrain(0, 690, -340), 0);
  assert.equal(isInLowlandVegetationExclusion(pond.cx, pond.cz), true);
  assert.equal(isInLowlandVegetationExclusion(758, -296), true);
  assert.equal(isInLowlandVegetationExclusion(0, 0), false);

  const geometry = createLowlandLakeGeometry(pond, {
    getHeightAt(x, z) {
      return applyLowlandWaterTerrain(0, x, z);
    },
  });
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const depths = geometry.getAttribute('lakeDepth');
  const outerStart = positions.count - 72;
  const halfRadiusStart = 1 + 5 * 72;
  const radii = [];

  assert.equal(positions.count, 865);
  assert.equal(geometry.index.count / 3, 1656);
  assert.ok(geometry.getAttribute('lakeDepth'));
  assert.ok(geometry.getAttribute('lakeEdge'));
  assert.ok(geometry.getAttribute('lakeBedVisibility'));
  assert.ok(depths.getX(0) >= 4.5);
  assert.ok(depths.getX(halfRadiusStart) >= 2.8);

  for (let vertex = 0; vertex < normals.count; vertex += 1) {
    assert.ok(normals.getY(vertex) > 0.999);
  }
  for (let vertex = outerStart; vertex < positions.count; vertex += 1) {
    radii.push(Math.hypot(
      positions.getX(vertex) - pond.cx,
      positions.getZ(vertex) - pond.cz,
    ));
  }

  assert.ok(Math.max(...radii) - Math.min(...radii) > 8);
  geometry.dispose();
});

test('lowland LOD uses local segment bounds instead of the diagonal reach rectangle', () => {
  const promoted = [];

  for (let chunkZ = 0; chunkZ < 8; chunkZ += 1) {
    for (let chunkX = 0; chunkX < 8; chunkX += 1) {
      const minX = MAP_MIN + chunkX * CHUNK_SIZE;
      const minZ = MAP_MIN + chunkZ * CHUNK_SIZE;
      const minimum = getLowlandMinimumSegmentsForBounds({
        minX,
        maxX: minX + CHUNK_SIZE,
        minZ,
        maxZ: minZ + CHUNK_SIZE,
      });

      if (minimum > 0) promoted.push([chunkX, chunkZ, minimum]);
    }
  }

  assert.deepEqual(promoted, [
    [6, 2, 256],
    [7, 2, 256],
    [7, 3, 256],
  ]);
  assert.equal(getLowlandMinimumSegmentsForBounds({
    minX: 512,
    maxX: 768,
    minZ: -256,
    maxZ: 0,
  }), 0);
});

test('water system reuses one bounded stream mesh and the shared lake material pipeline', () => {
  const system = createWaterSystem({ getHeightAt: () => -4 });
  const { stream, lakes, group } = system.lowlands;
  const waterFrame = getWaterSystemMaterialFrame(0, 820, -260);
  const { geometry, stats } = createRiverNetworkWaterGeometry(LOWLAND_STREAM_NETWORK);

  assert.equal(group.name, 'LowlandWaterFeatures');
  assert.equal(stream.name, 'LowlandStreamSurface');
  assert.equal(lakes.length, 1);
  assert.equal(lakes[0].name, 'LowlandLake_east-meadow-pond');
  assert.equal(stream.userData.waterReflectionModeCap, 1);
  assert.ok(stream.userData.riverNetworkStats.triangleCount < 1000);
  assert.equal(stats.triangleCount, 712);
  assert.ok(waterFrame.lakeBedMask > 0.99);
  assert.equal(isInWaterSystemVegetationExclusion(820, -260), true);
  assert.match(stream.material.vertexShader, /attribute float junctionMask/);

  const positions = stream.geometry.getAttribute('position');
  const waterFades = stream.geometry.getAttribute('waterFade');
  const waterEdges = stream.geometry.getAttribute('waterEdge');
  const pond = LOWLAND_LAKES[0];
  let maximumInnerFade = 0;
  let maximumPondInnerFade = 0;
  let inletOverlapVisible = false;
  let pondShore = null;
  let terminalShore = null;

  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    const distance = Math.hypot(
      positions.getX(vertex) - 690,
      positions.getZ(vertex) + 340,
    );

    if (distance < 12) maximumInnerFade = Math.max(maximumInnerFade, waterFades.getX(vertex));
    if (distance >= 20 && distance <= 23 && waterFades.getX(vertex) > 0.8) {
      inletOverlapVisible = true;
    }

    const pondDistance = Math.hypot(
      positions.getX(vertex) - pond.cx,
      positions.getZ(vertex) - pond.cz,
    );

    if (pondDistance < 12) {
      maximumPondInnerFade = Math.max(maximumPondInnerFade, waterFades.getX(vertex));
    }
    if (waterEdges.getX(vertex) < 0.999) continue;

    pondShore = getCloserWaterVertex(pondShore, positions, waterFades, vertex, 795.46, -273.06);
    terminalShore = getCloserWaterVertex(
      terminalShore,
      positions,
      waterFades,
      vertex,
      706.4,
      -328.55,
    );
  }

  assert.ok(maximumInnerFade < 1e-6);
  assert.ok(maximumPondInnerFade < 1e-6);
  assert.equal(inletOverlapVisible, true);
  assert.ok(pondShore.fade > 0.25 && pondShore.fade < 0.95);
  assert.ok(Math.abs(pondShore.y - (pond.waterLevel + pond.surfaceOffset)) < 0.01);
  assert.ok(Math.abs(
    terminalShore.y
      - (RIVER_TERMINAL_LAKE.waterLevel + RIVER_TERMINAL_LAKE.surfaceOffset),
  ) < 0.01);

  geometry.dispose();
  disposeSystem(system);
});

test('the required lowland terrain mesh cannot bridge across the visible creek', () => {
  const pond = LOWLAND_LAKES[0];
  const target = { x: 749.0390014648438, z: -300.90869140625 };
  const bounds = getChunkBounds(target.x, target.z);
  const segments = getLowlandMinimumSegmentsForBounds(bounds);
  const terrainHeight = sampleRenderedLowlandTerrain(target.x, target.z, bounds, segments);
  const { geometry, stats } = createRiverNetworkWaterGeometry(LOWLAND_STREAM_NETWORK);
  const center = getClosestReachCenterVertex(geometry, stats.reaches[0], target.x, target.z);
  const waterHeight = center.y + pond.surfaceOffset;

  assert.ok(
    terrainHeight < waterHeight,
    `terrain ${terrainHeight} bridged creek water ${waterHeight} at ${target.x},${target.z}`,
  );
  geometry.dispose();
});

test('pond, creek, and hill groups have deterministic visual-check cameras', () => {
  const names = listGoldenShotNames();
  const creek = getGoldenShotFromLocation({ search: '?shot=lowland-creek' });
  const lake = getGoldenShotFromLocation({ search: '?shot=lowland-lake' });
  const hills = getGoldenShotFromLocation({ search: '?shot=lowland-hills' });

  assert.ok(names.includes('lowland-creek'));
  assert.ok(names.includes('lowland-lake'));
  assert.ok(names.includes('lowland-hills'));
  assert.deepEqual(creek.target, { x: 735, z: -308, y: -0.7 });
  assert.deepEqual(lake.target, { x: 820, z: -260, y: -0.2 });
  assert.deepEqual(hills.target, { x: -650, z: 510, y: 8 });
});

function disposeSystem(system) {
  const geometries = new Set();
  const materials = new Set();

  system.group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) materials.add(object.material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function getCloserWaterVertex(current, positions, waterFades, vertex, x, z) {
  const distance = Math.hypot(positions.getX(vertex) - x, positions.getZ(vertex) - z);

  if (current && current.distance <= distance) return current;

  return {
    distance,
    fade: waterFades.getX(vertex),
    y: positions.getY(vertex),
  };
}

function getClosestReachCenterVertex(geometry, stats, x, z) {
  const positions = geometry.getAttribute('position');
  let closest = null;

  for (let row = 0; row < stats.rowCount; row += 1) {
    const vertex = stats.startVertex + row * stats.rowSize + Math.floor(stats.rowSize / 2);
    const distance = Math.hypot(positions.getX(vertex) - x, positions.getZ(vertex) - z);

    if (closest && closest.distance <= distance) continue;
    closest = { distance, y: positions.getY(vertex) };
  }

  return closest;
}

function getChunkBounds(x, z) {
  const chunkX = Math.floor((x - MAP_MIN) / CHUNK_SIZE);
  const chunkZ = Math.floor((z - MAP_MIN) / CHUNK_SIZE);
  const minX = MAP_MIN + chunkX * CHUNK_SIZE;
  const minZ = MAP_MIN + chunkZ * CHUNK_SIZE;

  return {
    minX,
    maxX: minX + CHUNK_SIZE,
    minZ,
    maxZ: minZ + CHUNK_SIZE,
  };
}

function sampleRenderedLowlandTerrain(x, z, bounds, segments) {
  const step = CHUNK_SIZE / segments;
  const cellX = Math.floor((x - bounds.minX) / step);
  const cellZ = Math.floor((z - bounds.minZ) / step);
  const x0 = bounds.minX + cellX * step;
  const z0 = bounds.minZ + cellZ * step;
  const tx = (x - x0) / step;
  const tz = (z - z0) / step;
  const topLeft = sampleLowlandHeight(x0, z0);
  const topRight = sampleLowlandHeight(x0 + step, z0);
  const bottomLeft = sampleLowlandHeight(x0, z0 + step);
  const bottomRight = sampleLowlandHeight(x0 + step, z0 + step);

  if (tx + tz <= 1) {
    return topLeft * (1 - tx - tz) + topRight * tx + bottomLeft * tz;
  }

  return topRight * (1 - tz)
    + bottomLeft * (1 - tx)
    + bottomRight * (tx + tz - 1);
}

function sampleLowlandHeight(x, z) {
  return applyLowlandWaterTerrain(applyLowlandHillsTerrain(0, x, z), x, z);
}
