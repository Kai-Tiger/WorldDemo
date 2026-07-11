import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ROAD_ROUTES,
  getRoadMaterialFrame,
  getRoadMinimumSegmentsForBounds,
  isInRoadVegetationExclusion,
} from '../src/roadNetwork.js';
import { getGoldenShotFromLocation } from '../src/goldenShots.js';

test('road network contains a carriage road and a branching forest trail', () => {
  assert.deepEqual(ROAD_ROUTES.map((route) => route.type), ['cart', 'trail']);
  assert.ok(ROAD_ROUTES.every((route) => route.points.length >= 4));
  assert.ok(ROAD_ROUTES[0].width > ROAD_ROUTES[1].width);
});

test('road material frames distinguish the two authored surfaces', () => {
  const cart = getRoadMaterialFrame(539, -342);
  const trail = getRoadMaterialFrame(360, -325);
  const away = getRoadMaterialFrame(100, 100);

  assert.ok(cart.cartMask > 0.9);
  assert.ok(cart.trailMask < 0.05);
  assert.ok(Math.abs(cart.cartLateral) < 0.15);
  assert.ok(trail.trailMask > 0.9);
  assert.ok(trail.cartMask < 0.05);
  assert.ok(Math.abs(trail.trailLateral) < 0.15);
  assert.deepEqual(away, {
    trailMask: 0,
    cartMask: 0,
    trailLateral: 0,
    cartLateral: 0,
  });
});

test('road vegetation exclusion follows the route and supports edge buffers', () => {
  assert.equal(isInRoadVegetationExclusion(539, -342), true);
  assert.equal(isInRoadVegetationExclusion(539, -337), false);
  assert.equal(isInRoadVegetationExclusion(539, -337, 3), true);
  assert.equal(isInRoadVegetationExclusion(100, 100, 3), false);
});

test('road-bearing chunks keep one-meter terrain vertices for narrow trails', () => {
  assert.equal(getRoadMinimumSegmentsForBounds({
    minX: 256,
    maxX: 512,
    minZ: -512,
    maxZ: -256,
  }), 256);
  assert.equal(getRoadMinimumSegmentsForBounds({
    minX: -768,
    maxX: -512,
    minZ: 512,
    maxZ: 768,
  }), 0);
});

test('carriage road has a deterministic visual-check camera', () => {
  const shot = getGoldenShotFromLocation({ search: '?shot=carriage-road' });

  assert.equal(shot.key, 'carriage-road');
  assert.deepEqual(shot.player, { x: 545, z: -339 });
  assert.deepEqual(shot.target, { x: 580, z: -326, heightOffset: 1.3 });
});
