import assert from 'node:assert/strict';
import test from 'node:test';
import { compileRiverNetwork } from '../src/hydrology/riverNetwork.js';
import { getLakeBoundaryFrame } from '../src/lakeBoundary.js';
import {
  HERO_RIVER_NETWORK_DEFINITION,
  PLUNGE_POOL,
  WATERFALL_HYDRAULIC_FRAME,
  applyWaterfallTerrainProfile,
  getLowlandTerrainHeight,
  getLowlandWaterTerrainTarget,
} from '../src/lowlandHeightPlan.js';

test('the waterfall hydraulic frame is the frozen source of lip and plunge-pool elevations', () => {
  const frame = WATERFALL_HYDRAULIC_FRAME;

  assert.equal(Object.isFrozen(frame), true);
  assert.equal(Object.isFrozen(frame.lip), true);
  assert.equal(frame.crestWidth, 5.2);
  assert.equal(frame.lipBlendLength, 2.1);
  assert.equal(frame.lipOverlapLength, 0.65);
  assert.equal(PLUNGE_POOL.shapeKind, 'rugged');
  assert.equal(PLUNGE_POOL.shapeAmp, 0.1);
  assert.ok(Math.abs(frame.lip.y - frame.lipBedY - frame.outletWaterOffset) < 1e-12);
  assert.equal(frame.poolSurfaceY, PLUNGE_POOL.waterLevel + PLUNGE_POOL.surfaceOffset);
  assert.ok(Math.abs(
    frame.poolFloorY - (PLUNGE_POOL.waterLevel - PLUNGE_POOL.maxDepth),
  ) < 1e-12);
  assert.deepEqual(
    [frame.impact.x, frame.impact.y, frame.impact.z],
    [PLUNGE_POOL.cx, frame.poolSurfaceY, PLUNGE_POOL.cz],
  );
  assert.ok(Math.abs(Math.hypot(frame.fallDirection.x, frame.fallDirection.z) - 1) < 1e-12);
  assert.ok(Math.abs(Math.hypot(frame.outflowDirection.x, frame.outflowDirection.z) - 1) < 1e-12);
});

test('the authored waterfall profile preserves the complete crest before carving downstream', () => {
  const frame = WATERFALL_HYDRAULIC_FRAME;
  const previous = frame.outletPoints.at(-2);
  const final = frame.outletPoints.at(-1);
  const tangentX = final[0] - previous[0];
  const tangentZ = final[1] - previous[1];
  const tangentLength = Math.hypot(tangentX, tangentZ);
  const sideX = -tangentZ / tangentLength;
  const sideZ = tangentX / tangentLength;
  const crestHeights = [];

  for (let index = 0; index <= 16; index += 1) {
    const lateral = (index / 16 - 0.5) * frame.crestWidth;
    const x = frame.lip.x + sideX * lateral;
    const z = frame.lip.z + sideZ * lateral;

    crestHeights.push(applyWaterfallTerrainProfile(2.75, x, z));
  }

  assert.ok(crestHeights.every((height) => Math.abs(height - frame.lipBedY) < 1e-10));
  assert.ok(Math.max(...crestHeights) - Math.min(...crestHeights) < 1e-10);
  assert.equal(
    applyWaterfallTerrainProfile(50, frame.lip.x, frame.lip.z),
    frame.lipBedY,
  );

  const protectedX = frame.lip.x
    + frame.fallDirection.x * frame.lipProtectionLength;
  const protectedZ = frame.lip.z
    + frame.fallDirection.z * frame.lipProtectionLength;

  assert.ok(Math.abs(
    applyWaterfallTerrainProfile(2.75, protectedX, protectedZ) - frame.lipBedY,
  ) < 1e-10);
});

test('the directional plunge profile reaches the fixed floor without changing distant terrain', () => {
  const frame = WATERFALL_HYDRAULIC_FRAME;

  assert.equal(
    applyWaterfallTerrainProfile(50, frame.impact.x, frame.impact.z),
    frame.poolFloorY,
  );
  assert.ok(Math.abs(
    applyWaterfallTerrainProfile(0.5, frame.impact.x, frame.impact.z) - frame.poolFloorY,
  ) < 1e-12);
  assert.equal(applyWaterfallTerrainProfile(12, 300, -300), 12);

  const target = getLowlandWaterTerrainTarget(
    getLowlandTerrainHeight(frame.impact.x, frame.impact.z),
    frame.impact.x,
    frame.impact.z,
  );

  assert.equal(target.featureId, PLUNGE_POOL.id);
  assert.equal(target.height, frame.poolFloorY);
});

test('the hero river starts from the plunge-pool lake node', () => {
  const frame = WATERFALL_HYDRAULIC_FRAME;
  const node = HERO_RIVER_NETWORK_DEFINITION.nodes.find(
    (candidate) => candidate.id === 'hero-plunge-outlet',
  );
  const reach = HERO_RIVER_NETWORK_DEFINITION.reaches.find(
    (candidate) => candidate.id === 'hero-main-upper',
  );

  assert.equal(node.type, 'lake');
  assert.equal(node.lakeBoundary, PLUNGE_POOL);
  assert.deepEqual(node.position, [frame.outflowStart.x, frame.outflowStart.z]);
  assert.equal(getLakeBoundaryFrame(
    PLUNGE_POOL,
    node.position[0],
    node.position[1],
  ).inside, true);
  assert.deepEqual(reach.points[0], node.position);
  assert.equal(reach.waterLevels[0], node.waterLevel);

  const network = compileRiverNetwork(HERO_RIVER_NETWORK_DEFINITION);

  assert.equal(network.nodeById.get(node.id), node);
  assert.ok(network.lakeFeatures.includes(node));
});
