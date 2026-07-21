import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EXPANDED_LAKES,
  EXPANDED_OUTER_HIGH_HILLS,
  EXPANDED_RIVER_NETWORKS,
  EXPANDED_ROLLING_HILLS,
  EXPANDED_TERRAIN_CELLS,
  EXPANDED_TERRAIN_SIZE,
  applyExpandedWaterTerrain,
  fitExpandedWaterToTerrain,
  getExpandedTerrainBaseHeight,
  getExpandedWaterMaterialFrame,
} from '../src/expandedTerrainPlan.js';

test('the original terrain remains the center cell of a three-by-three world', () => {
  const centerHeight = 137.25;

  assert.equal(EXPANDED_TERRAIN_SIZE, 6144);
  assert.equal(EXPANDED_TERRAIN_CELLS.length, 8);
  assert.equal(getExpandedTerrainBaseHeight(centerHeight, 0, 0), centerHeight);
  assert.equal(getExpandedTerrainBaseHeight(centerHeight, 1024, -1024), centerHeight);
});

test('outer cells use low plains with unique 50-100 meter rolling hill groups', () => {
  const plainSamples = EXPANDED_TERRAIN_CELLS.map((cell) => (
    getExpandedTerrainBaseHeight(200, cell.center[0], cell.center[1])
  ));
  const hillsByCell = EXPANDED_TERRAIN_CELLS.map((cell) => (
    EXPANDED_ROLLING_HILLS.filter((hill) => hill.cellId === cell.id)
  ));
  const groupSignatures = hillsByCell.map((hills) => hills.map((hill) => [
    hill.radiusX,
    hill.radiusZ,
    hill.height,
    hill.rotation,
    hill.lobes,
    hill.profilePower,
  ]).flat().join(':'));

  assert.equal(EXPANDED_ROLLING_HILLS.length, 24);
  assert.ok(plainSamples.every((height) => height >= 10 && height <= 55));
  assert.ok(EXPANDED_ROLLING_HILLS.every((hill) => hill.height >= 50 && hill.height <= 100));
  assert.ok(hillsByCell.every((hills) => hills.length >= 2));
  assert.equal(new Set(groupSignatures).size, EXPANDED_TERRAIN_CELLS.length);
});

test('the outermost terrain uses pointed summits over a continuous mountain ridge', () => {
  const highHillSamples = EXPANDED_OUTER_HIGH_HILLS.map((hill) => (
    getExpandedTerrainBaseHeight(200, hill.cx, hill.cz)
  ));
  const summitDrops = EXPANDED_OUTER_HIGH_HILLS.map((hill, index) => {
    const shoulderDistance = hill.radiusX * 0.06;
    const shoulderX = hill.cx + Math.cos(hill.rotation) * shoulderDistance;
    const shoulderZ = hill.cz + Math.sin(hill.rotation) * shoulderDistance;

    return highHillSamples[index]
      - getExpandedTerrainBaseHeight(200, shoulderX, shoulderZ);
  });
  const centerDistances = EXPANDED_OUTER_HIGH_HILLS.flatMap((hill, index) => (
    EXPANDED_OUTER_HIGH_HILLS.slice(index + 1).map((other) => (
      Math.hypot(other.cx - hill.cx, other.cz - hill.cz)
    ))
  ));
  const worldHalfSize = EXPANDED_TERRAIN_SIZE / 2;
  const perimeterCrests = Array.from({ length: 48 }, (_, index) => {
    const angle = index / 48 * Math.PI * 2;
    const directionX = Math.cos(angle);
    const directionZ = Math.sin(angle);
    const maximumRadius = worldHalfSize
      / Math.max(Math.abs(directionX), Math.abs(directionZ));
    let crest = Number.NEGATIVE_INFINITY;

    for (let radius = 2100; radius <= maximumRadius; radius += 25) {
      crest = Math.max(
        crest,
        getExpandedTerrainBaseHeight(200, directionX * radius, directionZ * radius),
      );
    }

    return crest;
  });
  const protectedWaterSamples = EXPANDED_RIVER_NETWORKS.flatMap((network) => (
    network.reaches.flatMap((reach) => reach.samples.map((sample) => {
      const x = sample.point.x;
      const z = sample.point.z;
      const baseHeight = getExpandedTerrainBaseHeight(200, x, z);

      return {
        x,
        z,
        baseHeight,
        carvedHeight: applyExpandedWaterTerrain(baseHeight, x, z),
        outerDistance: Math.max(Math.abs(x), Math.abs(z)),
      };
    }))
  )).filter(({ baseHeight, outerDistance }) => (
    baseHeight >= 140 && outerDistance > 1600
  ));
  const seamSamples = [
    ['x', -1024, 2620],
    ['x', 1024, 2520],
    ['x', -1024, -2500],
    ['x', 1024, -2450],
    ['z', -2600, 1024],
    ['z', -2500, -1024],
    ['z', 2600, 1024],
    ['z', 2500, -1024],
  ].map(([axis, fixed, along]) => {
    const offset = 0.01;
    const first = axis === 'x'
      ? getExpandedTerrainBaseHeight(200, fixed - offset, along)
      : getExpandedTerrainBaseHeight(200, along, fixed - offset);
    const second = axis === 'x'
      ? getExpandedTerrainBaseHeight(200, fixed + offset, along)
      : getExpandedTerrainBaseHeight(200, along, fixed + offset);

    return Math.abs(first - second);
  });

  assert.equal(EXPANDED_OUTER_HIGH_HILLS.length, 12);
  assert.ok(EXPANDED_OUTER_HIGH_HILLS.every(
    (hill) => hill.elevation >= 200 && hill.elevation <= 300,
  ));
  assert.ok(highHillSamples.every((height) => height >= 200 && height <= 305));
  assert.ok(summitDrops.every((drop) => drop > 5));
  assert.ok(perimeterCrests.every((height) => height >= 135));
  assert.ok(Math.min(...centerDistances) > 950);
  assert.equal(new Set(EXPANDED_OUTER_HIGH_HILLS.map((hill) => (
    [hill.radiusX, hill.radiusZ, hill.elevation, hill.rotation, hill.lobes].join(':')
  ))).size, EXPANDED_OUTER_HIGH_HILLS.length);
  assert.ok(seamSamples.every((difference) => difference < 0.2));
  assert.ok(protectedWaterSamples.length > 100);
  assert.ok(protectedWaterSamples.every(({ x, z, baseHeight, carvedHeight }) => {
    const materialFrame = getExpandedWaterMaterialFrame(x, z);

    return carvedHeight >= baseHeight - 1e-6
      && materialFrame.bedMask <= 1e-6
      && materialFrame.wetMask <= 1e-6
      && materialFrame.riverWetMask <= 1e-6;
  }));
});

test('each outer cell contains one headwater network and two carved lakes', () => {
  assert.equal(EXPANDED_RIVER_NETWORKS.length, 8);
  assert.equal(EXPANDED_LAKES.length, 16);
  assert.equal(
    EXPANDED_RIVER_NETWORKS.reduce((count, network) => count + network.reaches.length, 0),
    48,
  );

  for (let index = 0; index < EXPANDED_RIVER_NETWORKS.length; index += 1) {
    const network = EXPANDED_RIVER_NETWORKS[index];
    const cell = EXPANDED_TERRAIN_CELLS[index];
    const source = network.nodeById.get(`${cell.id}-outer-source`);
    const sink = network.nodeById.get(cell.lake.id);

    assert.equal(network.reaches.length, 6);
    assert.equal(network.lakeFeatures.length, 2);
    assert.ok(Math.max(Math.abs(source.position[0]), Math.abs(source.position[1])) > 1024);
    assert.equal(source.waterLevel, 14);
    assert.equal(sink.type, 'lake');
    assert.deepEqual(
      network.lakeFeatures.map((node) => node.id).sort(),
      cell.lakes.map((lake) => lake.id).sort(),
    );

    for (const lake of cell.lakes) {
      assert.ok(applyExpandedWaterTerrain(80, lake.cx, lake.cz) < lake.waterLevel);
      assert.equal(lake.angularSegments, 48);
      assert.equal(lake.ringCount, 8);
    }
    for (const reach of network.definition.reaches) {
      assert.ok(reach.waterLevels.every((level, levelIndex) => (
        levelIndex === 0 || level <= reach.waterLevels[levelIndex - 1]
      )), reach.id);
    }
  }
});

test('expanded water never enters or carves the original center terrain', () => {
  assert.equal(applyExpandedWaterTerrain(73, 0, 0), 73);
  assert.equal(applyExpandedWaterTerrain(73, 1024, 0), 73);
  assert.equal(applyExpandedWaterTerrain(73, 0, -1024), 73);

  for (const network of EXPANDED_RIVER_NETWORKS) {
    for (const reach of network.reaches) {
      for (const sample of reach.samples) {
        const outsideDistance = Math.max(
          Math.abs(sample.point.x),
          Math.abs(sample.point.z),
        ) - 1024;

        assert.ok(outsideDistance >= sample.influence - 1e-6, reach.id);
      }
    }
  }
});

test('expanded river surfaces are fitted to terrain before terrain carving', () => {
  const terrain = {
    getBaseHeightAt(x, z) {
      return Math.abs(x) <= 1024 && Math.abs(z) <= 1024 ? 200 : 15;
    },
  };

  fitExpandedWaterToTerrain(terrain);

  for (const network of EXPANDED_RIVER_NETWORKS) {
    for (const reach of network.reaches) {
      for (let index = 1; index < reach.samples.length - 1; index += 1) {
        const sample = reach.samples[index];
        const baseHeight = terrain.getBaseHeightAt(sample.point.x, sample.point.z);
        const carvedHeight = applyExpandedWaterTerrain(
          baseHeight,
          sample.point.x,
          sample.point.z,
        );

        assert.ok(sample.waterLevel <= baseHeight - 0.2 + 1e-6, reach.id);
        assert.ok(sample.waterLevel <= reach.samples[index - 1].waterLevel, reach.id);
        assert.ok(carvedHeight < sample.waterLevel, reach.id);
      }
    }
  }
});
