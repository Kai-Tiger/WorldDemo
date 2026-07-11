import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RIVER_NETWORK,
  RIVER_NETWORK_DEFINITION,
  applyRiverNetworkTerrain,
  getNearestRiverReach,
  getRiverNetworkFeatureBounds,
  getRiverNetworkTerrainTarget,
  isInRiverNetworkVegetationExclusion,
  validateRiverNetworkDefinition,
} from '../src/hydrology/riverNetwork.js';

test('river network is one upstream-to-downstream DAG with five sources and four confluences', () => {
  assert.equal(validateRiverNetworkDefinition(RIVER_NETWORK_DEFINITION), true);

  const sources = RIVER_NETWORK_DEFINITION.nodes.filter((node) => node.type === 'source');
  const confluences = RIVER_NETWORK_DEFINITION.nodes.filter((node) => node.type === 'confluence');
  const sinks = RIVER_NETWORK_DEFINITION.nodes.filter(
    (node) => RIVER_NETWORK.outgoingByNode.get(node.id).length === 0,
  );
  const topologicalIndex = new Map(
    RIVER_NETWORK.topologicalNodeIds.map((id, index) => [id, index]),
  );

  assert.equal(sources.length, 5);
  assert.equal(confluences.length, 4);
  assert.deepEqual(sinks.map((node) => node.id), ['alpine-lake']);

  for (const reach of RIVER_NETWORK.reaches) {
    assert.ok(topologicalIndex.get(reach.from) < topologicalIndex.get(reach.to));
  }

  for (const confluence of confluences) {
    assert.equal(RIVER_NETWORK.incomingByNode.get(confluence.id).length, 2);
    assert.equal(RIVER_NETWORK.outgoingByNode.get(confluence.id).length, 1);
  }
});

test('river network validation rejects directed cycles', () => {
  assert.throws(() => validateRiverNetworkDefinition({
    nodes: [
      { id: 'a', type: 'junction', position: [0, 0], waterLevel: 10 },
      { id: 'b', type: 'junction', position: [1, 0], waterLevel: 10 },
    ],
    reaches: [
      {
        id: 'a-b',
        from: 'a',
        to: 'b',
        points: [[0, 0], [1, 0]],
      },
      {
        id: 'b-a',
        from: 'b',
        to: 'a',
        points: [[1, 0], [0, 0]],
      },
    ],
  }), /acyclic/);
});

test('compiled curves run from authored upstream nodes to downstream nodes with non-rising water', () => {
  for (const reach of RIVER_NETWORK.reaches) {
    const from = RIVER_NETWORK.nodeById.get(reach.from);
    const to = RIVER_NETWORK.nodeById.get(reach.to);
    const first = reach.samples[0];
    const last = reach.samples.at(-1);

    assert.ok(Math.abs(first.point.x - from.position[0]) < 1e-6);
    assert.ok(Math.abs(first.point.z - from.position[1]) < 1e-6);
    assert.ok(Math.abs(last.point.x - to.position[0]) < 1e-6);
    assert.ok(Math.abs(last.point.z - to.position[1]) < 1e-6);
    assert.equal(first.waterLevel, from.waterLevel);
    assert.equal(last.waterLevel, to.waterLevel);

    for (let index = 1; index < reach.samples.length; index += 1) {
      assert.ok(reach.samples[index].distance > reach.samples[index - 1].distance);
      assert.ok(reach.samples[index].waterLevel <= reach.samples[index - 1].waterLevel);
    }
  }

  const northwestValley = getNearestRiverReach(-200, -288, 5);

  assert.equal(northwestValley.reachId, 's0-j1');
  assert.ok(northwestValley.waterLevel > 105 && northwestValley.waterLevel < 110);
});

test('confluences share one water level and nearest-reach ties favor the wider downstream reach', () => {
  for (const node of RIVER_NETWORK_DEFINITION.nodes.filter((entry) => entry.type === 'confluence')) {
    const incoming = RIVER_NETWORK.incomingByNode.get(node.id);
    const outgoing = RIVER_NETWORK.outgoingByNode.get(node.id)[0];

    for (const authoredReach of incoming) {
      const compiledReach = RIVER_NETWORK.reachById.get(authoredReach.id);

      assert.equal(compiledReach.samples.at(-1).waterLevel, node.waterLevel);
    }

    assert.equal(RIVER_NETWORK.reachById.get(outgoing.id).samples[0].waterLevel, node.waterLevel);
  }

  const junction = RIVER_NETWORK.nodeById.get('junction-j4');
  const nearest = getNearestRiverReach(junction.position[0], junction.position[1]);

  assert.equal(nearest.reachId, 'j4-alpine-lake');
  assert.equal(nearest.waterLevel, junction.waterLevel);
});

test('spatial queries find channels and lakes without affecting terrain away from the basin', () => {
  const nearest = getNearestRiverReach(-116, -572, 5);
  const terrainTarget = getRiverNetworkTerrainTarget(220, -116, -572);
  const tarnTarget = getRiverNetworkTerrainTarget(70, 76, -552);

  assert.equal(nearest.reachId, 's2-j2');
  assert.ok(nearest.distance < 0.05);
  assert.equal(isInRiverNetworkVegetationExclusion(-116, -572), true);
  assert.equal(terrainTarget.featureId, 's2-j2');
  assert.ok(terrainTarget.terrainHeight < 220);
  assert.equal(tarnTarget.featureId, 'cirque-tarn');
  assert.equal(tarnTarget.featureType, 'lake');

  assert.equal(getNearestRiverReach(700, 700, 20), null);
  assert.equal(isInRiverNetworkVegetationExclusion(700, 700), false);
  assert.equal(getRiverNetworkTerrainTarget(12, 700, 700), null);
  assert.equal(applyRiverNetworkTerrain(12, 700, 700), 12);

  const featureBounds = getRiverNetworkFeatureBounds();

  assert.equal(featureBounds.length, RIVER_NETWORK.reaches.length + 2);
  assert.ok(RIVER_NETWORK.bounds.minX < -296);
  assert.ok(RIVER_NETWORK.bounds.maxX >= 356);
  assert.ok(RIVER_NETWORK.bounds.minZ < -680);
});
