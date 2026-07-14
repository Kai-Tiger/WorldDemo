import assert from 'node:assert/strict';
import test from 'node:test';
import { RIVER_NETWORK } from '../src/hydrology/riverNetwork.js';
import { createRiverNetworkWaterGeometry } from '../src/hydrology/riverNetworkWaterGeometry.js';
import {
  RIVER_LAKE_FADE_LENGTH,
  getLakeBoundary,
  getLakeBoundaryFrame,
  getLakeBoundaryRadius,
  getLakeCenter,
  getLakeOutsideFade,
  getUniqueLakeBoundaries,
} from '../src/lakeBoundary.js';
import { LOWLAND_STREAM_NETWORKS } from '../src/lowlandLandforms.js';
import { HERO_RIVER_NETWORK } from '../src/riverChannel.js';

const NETWORKS = [
  RIVER_NETWORK,
  ...LOWLAND_STREAM_NETWORKS,
  HERO_RIVER_NETWORK,
];
const LAKES = getUniqueLakeBoundaries(
  NETWORKS.flatMap((network) => network.lakeFeatures),
);
const BOUNDARY_TOLERANCE = 1e-4;

test('all ten river-connected lakes share the four-meter outside-shore fade', () => {
  assert.equal(LAKES.length, 10);

  for (const lake of LAKES) {
    const center = getLakeCenter(lake);

    for (let segment = 0; segment < 24; segment += 1) {
      const angle = segment / 24 * Math.PI * 2;
      const radius = getLakeBoundaryRadius(lake, angle);
      const sampleAt = (signedDistance) => ({
        x: center.x + Math.cos(angle) * (radius + signedDistance),
        z: center.z + Math.sin(angle) * (radius + signedDistance),
      });
      const outsideFour = sampleAt(RIVER_LAKE_FADE_LENGTH);
      const outsideTwo = sampleAt(RIVER_LAKE_FADE_LENGTH * 0.5);
      const shore = sampleAt(0);
      const inside = sampleAt(-1);

      assert.equal(getLakeOutsideFade(lake, outsideFour.x, outsideFour.z), 1);
      assert.ok(Math.abs(
        getLakeOutsideFade(lake, outsideTwo.x, outsideTwo.z) - 0.5,
      ) < 1e-9);
      assert.equal(getLakeOutsideFade(lake, shore.x, shore.z), 0);
      assert.equal(getLakeOutsideFade(lake, inside.x, inside.z), 0);
      assert.ok(Math.abs(
        getLakeBoundaryFrame(lake, shore.x, shore.z).signedDistance,
      ) < 1e-9);
    }

    assert.equal(getLakeOutsideFade(lake, center.x, center.z), 0);
  }
});

test('every lake-connected reach starts or ends on the shared shoreline', () => {
  let endpointCount = 0;
  const endpointLakeIds = new Set();

  for (const network of NETWORKS) {
    const { geometry, stats } = createRiverNetworkWaterGeometry(network);
    const positions = geometry.getAttribute('position');
    const waterFades = geometry.getAttribute('waterFade');

    try {
      for (const reach of stats.reaches) {
        for (const endpoint of ['start', 'end']) {
          const lakeId = reach[`${endpoint}LakeId`];

          if (!lakeId) continue;
          endpointCount += 1;
          endpointLakeIds.add(lakeId);
          const lake = getLakeBoundary(network.nodeById.get(lakeId));
          const boundaryDistance = reach[`${endpoint}LakeBoundaryDistance`];
          const rowStart = endpoint === 'start'
            ? reach.startVertex
            : reach.startVertex + (reach.rowCount - 1) * reach.rowSize;
          const trimmedDistance = endpoint === 'start'
            ? reach.startDistance
            : reach.endDistance;

          assert.ok(Math.abs(trimmedDistance - boundaryDistance) < 1e-6);

          for (let lateral = 0; lateral < reach.rowSize; lateral += 1) {
            const vertex = rowStart + lateral;
            const frame = getLakeBoundaryFrame(
              lake,
              positions.getX(vertex),
              positions.getZ(vertex),
            );

            assert.ok(
              Math.abs(frame.signedDistance) < BOUNDARY_TOLERANCE,
              `${reach.id} ${endpoint} row misses ${lakeId} shore by ${frame.signedDistance}m`,
            );
            assert.equal(waterFades.getX(vertex), 0);
          }

          for (
            let vertex = reach.startVertex;
            vertex < reach.startVertex + reach.vertexCount;
            vertex += 1
          ) {
            const signedDistance = getLakeBoundaryFrame(
              lake,
              positions.getX(vertex),
              positions.getZ(vertex),
            ).signedDistance;

            assert.ok(
              signedDistance >= -BOUNDARY_TOLERANCE,
              `${reach.id} enters ${lakeId} by ${-signedDistance}m`,
            );
          }
        }
      }
    } finally {
      geometry.dispose();
    }
  }

  assert.equal(endpointCount, 14);
  assert.equal(endpointLakeIds.size, 10);
});
