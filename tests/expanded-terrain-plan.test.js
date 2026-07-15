import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EXPANDED_LAKES,
  EXPANDED_RIVER_NETWORKS,
  EXPANDED_ROLLING_HILLS,
  EXPANDED_TERRAIN_CELLS,
  EXPANDED_TERRAIN_SIZE,
  applyExpandedWaterTerrain,
  getExpandedTerrainBaseHeight,
} from '../src/expandedTerrainPlan.js';

test('the original terrain remains the center cell of a three-by-three world', () => {
  const centerHeight = 137.25;

  assert.equal(EXPANDED_TERRAIN_SIZE, 6144);
  assert.equal(EXPANDED_TERRAIN_CELLS.length, 8);
  assert.equal(getExpandedTerrainBaseHeight(centerHeight, 0, 0), centerHeight);
  assert.equal(getExpandedTerrainBaseHeight(centerHeight, 1024, -1024), centerHeight);
});

test('outer cells use low plains with broad rolling hill groups', () => {
  const plainSamples = EXPANDED_TERRAIN_CELLS.map((cell) => (
    getExpandedTerrainBaseHeight(200, cell.center[0], cell.center[1])
  ));
  const hillPeaks = EXPANDED_ROLLING_HILLS.map((hill) => (
    getExpandedTerrainBaseHeight(200, hill.cx, hill.cz)
  ));

  assert.equal(EXPANDED_ROLLING_HILLS.length, 16);
  assert.ok(plainSamples.every((height) => height >= 10 && height <= 55));
  assert.ok(Math.max(...hillPeaks) >= 38);
  assert.ok(Math.max(...hillPeaks) < 70);
});

test('each outer cell connects the center mountains to two carved lakes', () => {
  assert.equal(EXPANDED_RIVER_NETWORKS.length, 8);
  assert.equal(EXPANDED_LAKES.length, 16);
  assert.equal(
    EXPANDED_RIVER_NETWORKS.reduce((count, network) => count + network.reaches.length, 0),
    48,
  );

  for (let index = 0; index < EXPANDED_RIVER_NETWORKS.length; index += 1) {
    const network = EXPANDED_RIVER_NETWORKS[index];
    const cell = EXPANDED_TERRAIN_CELLS[index];
    const source = network.nodeById.get(`${cell.id}-mountain-source`);
    const sink = network.nodeById.get(cell.lake.id);

    assert.equal(network.reaches.length, 6);
    assert.equal(network.lakeFeatures.length, 2);
    assert.ok(Math.abs(source.position[0]) <= 1024);
    assert.ok(Math.abs(source.position[1]) <= 1024);
    assert.ok(source.waterLevel >= 180);
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
