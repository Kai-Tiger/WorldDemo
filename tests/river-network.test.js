import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RIVER_NETWORK,
  RIVER_NETWORK_DEFINITION,
  applyRiverNetworkTerrain,
  compileRiverNetwork,
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

test('optional channel ranges, confluence pools, and smooth riffles survive compilation', () => {
  const definition = createExtendedDefinition();
  const network = compileRiverNetwork(definition, { sampleSpacing: 0.25 });
  const confluence = network.nodeById.get('junction');
  const reach = network.reachById.get('source-a-junction');
  const rapidSample = reach.samples.reduce((closest, sample) => (
    Math.abs(sample.distance - 10) < Math.abs(closest.distance - 10) ? sample : closest
  ));
  const nearest = getNearestRiverReach(
    rapidSample.point.x,
    rapidSample.point.z,
    1,
    network,
  );

  assert.equal(confluence.poolRadius, 7);
  assert.equal(confluence.poolDepth, 1.4);
  assert.equal(confluence.poolWidthScale, 1.6);
  assert.deepEqual(reach.wetBankWidth, [1, 2]);
  assert.deepEqual(reach.gravelBankWidth, [3, 5]);
  assert.deepEqual(reach.terrainBlendWidth, [2, 4]);
  assert.deepEqual(reach.flowSpeed, [0.6, 0.8]);
  assert.deepEqual(reach.riffles, [
    { startM: 5, endM: 15, strength: 0.8, speed: 1.6 },
  ]);
  assert.deepEqual(reach.disturbances, [
    { distanceM: 12, lateral: -0.25, radius: 1.5, strength: 0.7 },
  ]);
  assert.equal(reach.samples[0].rapidMask, 0);
  assert.equal(reach.samples.at(-1).rapidMask, 0);
  assert.ok(rapidSample.rapidMask > 0.79 && rapidSample.rapidMask <= 0.8);
  assert.ok(rapidSample.flowSpeed > 1.5 && rapidSample.flowSpeed <= 1.6);
  assert.equal(nearest.rapidMask, rapidSample.rapidMask);
  assert.equal(nearest.flowSpeed, rapidSample.flowSpeed);
  assert.ok(nearest.wetBankWidth > 1 && nearest.wetBankWidth < 2);
  assert.ok(nearest.gravelBankWidth > 3 && nearest.gravelBankWidth < 5);
  assert.ok(nearest.terrainBlendWidth > 2 && nearest.terrainBlendWidth < 4);
});

test('legacy reaches receive neutral flow and bank defaults', () => {
  for (const reach of RIVER_NETWORK.reaches) {
    assert.deepEqual(reach.wetBankWidth, [0, 0]);
    assert.deepEqual(reach.gravelBankWidth, [0, 0]);
    assert.deepEqual(reach.terrainBlendWidth, [0, 0]);
    assert.deepEqual(reach.flowSpeed, [1, 1]);
    assert.deepEqual(reach.riffles, []);
    assert.deepEqual(reach.disturbances, []);

    for (const sample of reach.samples) {
      assert.equal(sample.flowSpeed, 1);
      assert.equal(sample.rapidMask, 0);
    }
  }
});

test('optional river parameters reject invalid ranges and riffles', () => {
  const invalidRange = createExtendedDefinition();
  const invalidRiffle = createExtendedDefinition();
  const invalidDisturbance = createExtendedDefinition();

  invalidRange.reaches[0].flowSpeed = [-1, 1];
  invalidRiffle.reaches[0].riffles[0].strength = 1.1;
  invalidDisturbance.reaches[0].disturbances[0].lateral = 1.1;

  assert.throws(() => compileRiverNetwork(invalidRange), /flow speed/);
  assert.throws(() => compileRiverNetwork(invalidRiffle), /strength/);
  assert.throws(() => compileRiverNetwork(invalidDisturbance), /lateral/);
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

function createExtendedDefinition() {
  const nodes = [
    { id: 'source-a', type: 'source', position: [-20, -5], waterLevel: 10 },
    { id: 'source-b', type: 'source', position: [-20, 5], waterLevel: 9 },
    {
      id: 'junction',
      type: 'confluence',
      position: [0, 0],
      waterLevel: 5,
      poolRadius: 7,
      poolDepth: 1.4,
      poolWidthScale: 1.6,
    },
    { id: 'lake', type: 'lake', position: [40, 0], waterLevel: 0 },
  ];
  const channelDefaults = {
    style: 'headwater',
    width: [2, 3],
    depth: [0.4, 0.8],
    influence: [4, 6],
    vegetationBuffer: [1, 2],
  };

  return {
    nodes,
    reaches: [
      {
        ...channelDefaults,
        id: 'source-a-junction',
        from: 'source-a',
        to: 'junction',
        points: [[-20, -5], [-10, -2], [0, 0]],
        wetBankWidth: [1, 2],
        gravelBankWidth: [3, 5],
        terrainBlendWidth: [2, 4],
        flowSpeed: [0.6, 0.8],
        riffles: [{ startM: 5, endM: 15, strength: 0.8, speed: 1.6 }],
        disturbances: [{ distanceM: 12, lateral: -0.25, radius: 1.5, strength: 0.7 }],
      },
      {
        ...channelDefaults,
        id: 'source-b-junction',
        from: 'source-b',
        to: 'junction',
        points: [[-20, 5], [-10, 2], [0, 0]],
      },
      {
        ...channelDefaults,
        id: 'junction-lake',
        from: 'junction',
        to: 'lake',
        style: 'trunk',
        points: [[0, 0], [20, 2], [40, 0]],
      },
    ],
  };
}
