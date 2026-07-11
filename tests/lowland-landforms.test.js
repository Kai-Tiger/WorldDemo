import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { getGoldenShotFromLocation, listGoldenShotNames } from '../src/goldenShots.js';
import { createRiverNetworkWaterGeometry } from '../src/hydrology/riverNetworkWaterGeometry.js';
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
  assert.deepEqual(reach.points[0], [820, -260]);
  assert.deepEqual(reach.points.at(-1), [690, -340]);
  assert.equal(reach.waterLevels[0], pond.waterLevel);
  assert.equal(reach.waterLevels.at(-1), -1.28);
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
  const outerStart = positions.count - 72;
  const radii = [];

  assert.equal(positions.count, 865);
  assert.equal(geometry.index.count / 3, 1656);
  assert.ok(geometry.getAttribute('lakeDepth'));
  assert.ok(geometry.getAttribute('lakeEdge'));
  assert.ok(geometry.getAttribute('lakeBedVisibility'));

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
    [6, 2, 128],
    [7, 2, 128],
    [7, 3, 128],
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
  let maximumInnerFade = 0;
  let inletOverlapVisible = false;

  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    const distance = Math.hypot(
      positions.getX(vertex) - 690,
      positions.getZ(vertex) + 340,
    );

    if (distance < 12) maximumInnerFade = Math.max(maximumInnerFade, waterFades.getX(vertex));
    if (distance >= 20 && distance <= 23 && waterFades.getX(vertex) > 0.8) {
      inletOverlapVisible = true;
    }
  }

  assert.ok(maximumInnerFade < 1e-6);
  assert.equal(inletOverlapVisible, true);

  geometry.dispose();
  disposeSystem(system);
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
