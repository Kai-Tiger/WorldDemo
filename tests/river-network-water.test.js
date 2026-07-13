import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RIVER_NETWORK,
  compileRiverNetwork,
} from '../src/hydrology/riverNetwork.js';
import { createRiverNetworkWaterGeometry } from '../src/hydrology/riverNetworkWaterGeometry.js';
import { HERO_RIVER_NETWORK_DEFINITION } from '../src/lowlandHeightPlan.js';

const result = createRiverNetworkWaterGeometry();
const heroNetwork = compileRiverNetwork(HERO_RIVER_NETWORK_DEFINITION);
const heroResult = createRiverNetworkWaterGeometry(heroNetwork);

test('river network water geometry exposes one bounded mesh with shader attributes', () => {
  const { geometry, stats } = result;
  const position = geometry.getAttribute('position');

  assert.ok(position.count > 0);
  assert.equal(geometry.index.count / 3, stats.triangleCount);
  assert.equal(stats.vertexCount, position.count);
  assert.equal(stats.reachCount, RIVER_NETWORK.reaches.length);
  assert.equal(stats.junctionCount, 4);
  assert.ok(stats.triangleCount < 12000);
  assert.equal(stats.maxTriangleBudget, 12000);

  for (const [name, itemSize] of [
    ['position', 3],
    ['uv', 2],
    ['waterFade', 1],
    ['waterEdge', 1],
    ['junctionMask', 1],
    ['viewDistance', 1],
    ['waterDepth', 1],
    ['shoreDistance', 1],
    ['flowSpeed', 1],
    ['rapidMask', 1],
    ['flowDirection', 2],
    ['disturbanceMask', 1],
  ]) {
    const attribute = geometry.getAttribute(name);

    assert.ok(attribute, `${name} is required`);
    assert.equal(attribute.itemSize, itemSize);
    assert.equal(attribute.count, position.count);
  }

  for (const name of [
    'waterFade',
    'waterEdge',
    'junctionMask',
    'rapidMask',
    'disturbanceMask',
  ]) {
    const attribute = geometry.getAttribute(name);

    for (let index = 0; index < attribute.count; index += 1) {
      assert.ok(attribute.getX(index) >= 0 && attribute.getX(index) <= 1);
    }
  }

  const viewDistance = geometry.getAttribute('viewDistance');
  const waterDepth = geometry.getAttribute('waterDepth');
  const shoreDistance = geometry.getAttribute('shoreDistance');
  const flowSpeed = geometry.getAttribute('flowSpeed');
  const flowDirection = geometry.getAttribute('flowDirection');

  for (let index = 0; index < viewDistance.count; index += 1) {
    assert.ok(viewDistance.getX(index) >= 180 && viewDistance.getX(index) <= 300);
    assert.ok(waterDepth.getX(index) >= 0);
    assert.ok(shoreDistance.getX(index) >= 0);
    assert.ok(flowSpeed.getX(index) > 0);
    assert.ok(Math.abs(Math.hypot(
      flowDirection.getX(index),
      flowDirection.getY(index),
    ) - 1) < 1e-5);
  }
});

test('all indexed water triangles face upward', () => {
  const { geometry } = result;
  const position = geometry.getAttribute('position');
  const indices = geometry.index.array;

  for (let index = 0; index < indices.length; index += 3) {
    const a = indices[index];
    const b = indices[index + 1];
    const c = indices[index + 2];
    const abX = position.getX(b) - position.getX(a);
    const abZ = position.getZ(b) - position.getZ(a);
    const acX = position.getX(c) - position.getX(a);
    const acZ = position.getZ(c) - position.getZ(a);
    const crossY = abZ * acX - abX * acZ;

    assert.ok(crossY > 1e-8, `triangle ${index / 3} must face +Y`);
  }
});

test('reach strips preserve metric downstream UVs, monotonic water levels, and authored width', () => {
  const { geometry, stats } = result;
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');

  for (const reachStats of stats.reaches) {
    const reach = RIVER_NETWORK.reachById.get(reachStats.id);
    let previousU = -Infinity;
    let previousWaterLevel = Infinity;

    assert.ok(reachStats.targetSpacing >= 1.5 && reachStats.targetSpacing <= 2.5);
    assert.ok(reachStats.lateralSegments >= 3 && reachStats.lateralSegments <= 5);

    for (let row = 0; row < reachStats.rowCount; row += 1) {
      const rowStart = reachStats.startVertex + row * reachStats.rowSize;
      const u = uv.getX(rowStart);
      const waterLevel = position.getY(rowStart);

      assert.ok(u > previousU);
      assert.ok(waterLevel <= previousWaterLevel + 1e-5);

      for (let lateral = 0; lateral < reachStats.rowSize; lateral += 1) {
        const vertex = rowStart + lateral;

        assert.ok(Math.abs(uv.getX(vertex) - u) < 1e-6);
        assert.ok(Math.abs(position.getY(vertex) - waterLevel) < 1e-6);
      }

      previousU = u;
      previousWaterLevel = waterLevel;
    }

    const firstVertex = reachStats.startVertex;
    const lastVertex = firstVertex + reachStats.vertexCount - 1;
    const metricUvSpan = uv.getX(lastVertex) - uv.getX(firstVertex);

    assert.ok(Math.abs(
      metricUvSpan - (reachStats.endDistance - reachStats.startDistance)
    ) < 1e-4);

    for (const [distance, rowStart] of [
      [reachStats.startDistance, firstVertex],
      [reachStats.endDistance, lastVertex - reachStats.rowSize + 1],
    ]) {
      const rowEnd = rowStart + reachStats.rowSize - 1;
      const actualWidth = Math.hypot(
        position.getX(rowEnd) - position.getX(rowStart),
        position.getZ(rowEnd) - position.getZ(rowStart),
      );
      const expected = sampleCompiledReach(reach, distance);

      assert.ok(Math.abs(actualWidth - expected.width) < 1e-4);
      assert.ok(Math.abs(position.getY(rowStart) - expected.waterLevel) < 1e-4);
    }
  }
});

test('authored fallback depth shallows toward each shore in metric distance', () => {
  const { geometry, stats } = result;
  const waterDepth = geometry.getAttribute('waterDepth');
  const shoreDistance = geometry.getAttribute('shoreDistance');
  const reach = stats.reaches[0];
  const rowStart = reach.startVertex + Math.floor(reach.rowCount / 2) * reach.rowSize;
  const rowEnd = rowStart + reach.rowSize - 1;
  const inner = rowStart + Math.floor(reach.rowSize / 2);

  assert.equal(shoreDistance.getX(rowStart), 0);
  assert.equal(shoreDistance.getX(rowEnd), 0);
  assert.ok(shoreDistance.getX(inner) > 0);
  assert.ok(waterDepth.getX(inner) > waterDepth.getX(rowStart));
  assert.ok(waterDepth.getX(inner) > waterDepth.getX(rowEnd));
});

test('terrain-aware depth uses the actual water-to-terrain clearance', () => {
  const terrainHeight = 1;
  const { geometry } = createRiverNetworkWaterGeometry(RIVER_NETWORK, {
    getHeightAt: () => terrainHeight,
  });
  const position = geometry.getAttribute('position');
  const waterDepth = geometry.getAttribute('waterDepth');

  for (let index = 0; index < position.count; index += 1) {
    assert.ok(Math.abs(waterDepth.getX(index) - Math.max(
      position.getY(index) - terrainHeight,
      0,
    )) < 1e-5);
  }

  assert.throws(
    () => createRiverNetworkWaterGeometry(RIVER_NETWORK, {}),
    /getHeightAt/,
  );
});

test('trunk tessellation uses eight lateral segments and about 0.75 meter rows', () => {
  const trunk = createRiverNetworkWaterGeometry(createSingleReachNetwork(0, 'trunk'));
  const reach = trunk.stats.reaches[0];

  assert.equal(reach.targetSpacing, 0.75);
  assert.equal(reach.lateralSegments, 8);
  assert.equal(reach.rowSize, 9);
  assert.ok((reach.endDistance - reach.startDistance) / (reach.rowCount - 1) <= 0.75);
  assert.ok(trunk.stats.triangleCount < 12000);
});

test('authored disturbances produce a smooth downstream-biased wake mask', () => {
  const disturbance = { distanceM: 50, lateral: 0, radius: 0.3, strength: 0.9 };
  const wake = createRiverNetworkWaterGeometry(
    createSingleReachNetwork(0, 'trunk', [disturbance]),
  );
  const reach = wake.stats.reaches[0];
  const mask = wake.geometry.getAttribute('disturbanceMask');
  const obstacleRow = Math.round(
    (disturbance.distanceM - reach.startDistance)
    / (reach.endDistance - reach.startDistance)
    * (reach.rowCount - 1),
  );
  const center = reach.startVertex + obstacleRow * reach.rowSize + 4;
  const upstream = center - reach.rowSize;
  const downstream = center + reach.rowSize;
  const leftEdge = center - 4;

  assert.ok(Math.abs(mask.getX(center) - disturbance.strength) < 1e-5);
  assert.equal(mask.getX(upstream), 0);
  assert.ok(mask.getX(downstream) > 0);
  assert.equal(mask.getX(leftEdge), 0);
});

test('source and lake-entry ends fade while steep reaches transition out', () => {
  const { geometry, stats } = result;
  const waterFade = geometry.getAttribute('waterFade');

  for (const reachStats of stats.reaches) {
    const reach = RIVER_NETWORK.reachById.get(reachStats.id);
    const from = RIVER_NETWORK.nodeById.get(reach.from);
    const to = RIVER_NETWORK.nodeById.get(reach.to);

    if (from.type === 'source') {
      assert.equal(waterFade.getX(reachStats.startVertex), 0);
    }

    if (to.type === 'lake') {
      assert.equal(waterFade.getX(reachStats.startVertex + reachStats.vertexCount - 1), 0);
    }
    if (from.type === 'lake') {
      assert.equal(waterFade.getX(reachStats.startVertex), 0);
    }
  }

  const steep = createRiverNetworkWaterGeometry(createSingleReachNetwork(45));
  const moderate = createRiverNetworkWaterGeometry(createSingleReachNetwork(25));
  const steepFade = steep.geometry.getAttribute('waterFade');
  const moderateFade = moderate.geometry.getAttribute('waterFade');
  const moderateMiddle = Math.floor(moderateFade.count / 2);

  for (let index = 0; index < steepFade.count; index += 1) {
    assert.equal(steepFade.getX(index), 0);
  }

  assert.ok(moderateFade.getX(moderateMiddle) > 0);
  assert.ok(moderateFade.getX(moderateMiddle) < 1);
});

test('the alpine inlet fades only after overlapping the lake surface', () => {
  const lake = RIVER_NETWORK.nodeById.get('alpine-lake');
  const inlet = RIVER_NETWORK.reachById.get('j4-alpine-lake');
  const endpoint = inlet.samples.at(-1);
  const lakeCenter = lake.center ?? lake.position;
  const endpointRadius = Math.hypot(
    endpoint.point.x - lakeCenter[0],
    endpoint.point.z - lakeCenter[1],
  );
  const fadeLength = Math.max(7, endpoint.width * 2);

  assert.ok(endpointRadius <= lake.radius - fadeLength);
});

test('four trimmed confluences use non-overlapping upward Y patches', () => {
  const { geometry, stats } = result;
  const position = geometry.getAttribute('position');
  const junctionMask = geometry.getAttribute('junctionMask');
  const indices = geometry.index.array;
  const uv = geometry.getAttribute('uv');
  const flowDirection = geometry.getAttribute('flowDirection');

  assert.equal(stats.junctions.length, 4);
  assert.ok(stats.junctionTriangleCount > 0);

  for (const reachStats of stats.reaches) {
    const reach = RIVER_NETWORK.reachById.get(reachStats.id);
    const from = RIVER_NETWORK.nodeById.get(reach.from);
    const to = RIVER_NETWORK.nodeById.get(reach.to);
    const length = reach.samples.at(-1).distance;

    if (from.type === 'confluence') assert.ok(reachStats.startDistance > 0);
    if (to.type === 'confluence') assert.ok(reachStats.endDistance < length);
  }

  for (const junction of stats.junctions) {
    assert.equal(junctionMask.getX(junction.centerVertex), 1);
    assert.equal(new Set(junction.boundaryVertices).size, junction.boundaryVertices.length);
    assert.equal(
      junction.triangleCount,
      junction.boundaryVertices.length * (junction.radialSegments * 2 - 1),
    );
    assert.equal(
      junction.boundaryVertices.length,
      junction.endpointBoundaryVertexCount + junction.coreBoundaryVertexCount,
    );
    assert.ok(junction.coreBoundaryVertexCount > 0);
    assert.ok(junction.radialSegments >= 2 && junction.radialSegments <= 6);
    assert.ok(junction.maxBoundaryAngleStep < 12 * Math.PI / 180);
    assert.equal(
      junction.patchVertexCount,
      1
        + junction.coreBoundaryVertexCount
        + junction.boundaryVertices.length * (junction.radialSegments - 1),
    );

    const nodeU = uv.getX(junction.centerVertex);
    const incoming = RIVER_NETWORK.incomingByNode.get(junction.nodeId);
    const outgoing = RIVER_NETWORK.outgoingByNode.get(junction.nodeId)[0];

    for (const reach of incoming) {
      const reachStats = stats.reaches.find((entry) => entry.id === reach.id);
      const lastVertex = reachStats.startVertex + reachStats.vertexCount - reachStats.rowSize;

      assert.ok(uv.getX(lastVertex) < nodeU);
    }

    const outgoingStats = stats.reaches.find((entry) => entry.id === outgoing.id);

    assert.ok(uv.getX(outgoingStats.startVertex) > nodeU);

    const outgoingReach = RIVER_NETWORK.reachById.get(outgoing.id);
    const first = outgoingReach.samples[0].point;
    const second = outgoingReach.samples[1].point;
    const magnitude = Math.hypot(second.x - first.x, second.z - first.z);
    const expectedX = (second.x - first.x) / magnitude;
    const expectedZ = (second.z - first.z) / magnitude;
    const actualX = flowDirection.getX(junction.centerVertex);
    const actualZ = flowDirection.getY(junction.centerVertex);

    assert.ok(actualX * expectedX + actualZ * expectedZ > 0.99);

    for (
      let vertex = junction.firstPatchVertex;
      vertex < junction.firstPatchVertex + junction.patchVertexCount;
      vertex += 1
    ) {
      assert.ok(
        flowDirection.getX(vertex) * expectedX
          + flowDirection.getY(vertex) * expectedZ
          > 0.99,
      );
    }

    let polygonAreaTwice = 0;
    let patchArea = 0;

    for (let index = 0; index < junction.boundaryVertices.length; index += 1) {
      const a = junction.boundaryVertices[index];
      const b = junction.boundaryVertices[(index + 1) % junction.boundaryVertices.length];
      const aX = position.getX(a);
      const aZ = position.getZ(a);
      const bX = position.getX(b);
      const bZ = position.getZ(b);

      polygonAreaTwice += aX * bZ - aZ * bX;
    }

    for (let offset = junction.startIndex; offset < junction.startIndex + junction.indexCount; offset += 3) {
      const a = indices[offset];
      const b = indices[offset + 1];
      const c = indices[offset + 2];

      patchArea += Math.abs(
        (position.getX(b) - position.getX(a)) * (position.getZ(c) - position.getZ(a))
          - (position.getZ(b) - position.getZ(a)) * (position.getX(c) - position.getX(a)),
      ) * 0.5;
    }

    assert.ok(Math.abs(patchArea - Math.abs(polygonAreaTwice) * 0.5) < 1e-3);
  }
});

test('hero J1/J2 use smooth non-overlapping Y patches within the mesh budget', () => {
  const { geometry, stats } = heroResult;
  const position = geometry.getAttribute('position');
  const indices = geometry.index.array;

  assert.equal(stats.junctions.length, 2);
  assert.ok(stats.triangleCount < 12000);

  for (const reachStats of stats.reaches.filter((reach) => reach.id.startsWith('hero-main-'))) {
    assert.equal(reachStats.targetSpacing, 0.75);
    assert.equal(reachStats.lateralSegments, 8);
  }

  const west = stats.reaches.find((reach) => reach.id === 'hero-west-tributary');
  const middle = stats.reaches.find((reach) => reach.id === 'hero-main-middle');
  const westReach = heroNetwork.reachById.get(west.id);

  assert.ok(westReach.length - west.endDistance >= 26);
  assert.ok(middle.startDistance >= 26);
  assert.ok(middle.endDistance - middle.startDistance > 20);

  const westRow = getReachRowFrame(position, west, 'end');
  const middleRow = getReachRowFrame(position, middle, 'start');

  assert.ok(
    Math.hypot(westRow.x - middleRow.x, westRow.z - middleRow.z)
      > (westRow.width + middleRow.width) * 0.5,
  );

  for (const junction of stats.junctions) {
    assert.ok(junction.coreBoundaryVertexCount > 0);
    assert.ok(junction.maxBoundaryAngleStep < 8 * Math.PI / 180);

    for (
      let offset = junction.startIndex;
      offset < junction.startIndex + junction.indexCount;
      offset += 3
    ) {
      const a = indices[offset];
      const b = indices[offset + 1];
      const c = indices[offset + 2];
      const crossY = (position.getZ(b) - position.getZ(a))
        * (position.getX(c) - position.getX(a))
        - (position.getX(b) - position.getX(a))
        * (position.getZ(c) - position.getZ(a));

      assert.ok(crossY > 1e-8);
    }
  }
});

function getReachRowFrame(position, reach, end) {
  const rowStart = end === 'start'
    ? reach.startVertex
    : reach.startVertex + reach.vertexCount - reach.rowSize;
  let x = 0;
  let z = 0;

  for (let index = 0; index < reach.rowSize; index += 1) {
    x += position.getX(rowStart + index);
    z += position.getZ(rowStart + index);
  }

  return {
    x: x / reach.rowSize,
    z: z / reach.rowSize,
    width: Math.hypot(
      position.getX(rowStart + reach.rowSize - 1) - position.getX(rowStart),
      position.getZ(rowStart + reach.rowSize - 1) - position.getZ(rowStart),
    ),
  };
}

function sampleCompiledReach(reach, distance) {
  const samples = reach.samples;

  if (distance <= samples[0].distance) return samples[0];
  if (distance >= samples.at(-1).distance) return samples.at(-1);

  const endIndex = samples.findIndex((sample) => sample.distance >= distance);
  const start = samples[endIndex - 1];
  const end = samples[endIndex];
  const t = (distance - start.distance) / (end.distance - start.distance);

  return {
    width: start.width + (end.width - start.width) * t,
    waterLevel: start.waterLevel + (end.waterLevel - start.waterLevel) * t,
  };
}

function createSingleReachNetwork(slopeDegrees, style = 'headwater', disturbances = []) {
  const length = 100;
  const drop = Math.tan(slopeDegrees * Math.PI / 180) * length;
  const source = {
    id: 'source',
    type: 'source',
    position: [0, 0],
    waterLevel: drop,
  };
  const lake = {
    id: 'lake',
    type: 'lake',
    position: [length, 0],
    waterLevel: 0,
  };
  const reach = {
    id: 'reach',
    from: source.id,
    to: lake.id,
    style,
    disturbances,
    samples: [
      createSample(0, 0, drop),
      createSample(length, length, 0),
    ],
  };
  const nodeById = new Map([[source.id, source], [lake.id, lake]]);

  return {
    definition: { nodes: [source, lake], reaches: [reach] },
    nodes: [source, lake],
    nodeById,
    reaches: [reach],
    reachById: new Map([[reach.id, reach]]),
    topologicalNodeIds: [source.id, lake.id],
    incomingByNode: new Map([[source.id, []], [lake.id, [reach]]]),
    outgoingByNode: new Map([[source.id, [reach]], [lake.id, []]]),
  };
}

function createSample(x, distance, waterLevel) {
  return {
    point: { x, z: 0 },
    distance,
    waterLevel,
    width: 2,
    depth: 0.5,
    flowSpeed: 1,
    rapidMask: 0,
  };
}
