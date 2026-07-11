import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  ROAD_ROUTES,
  applyRoadTerrain,
  getRoadMaterialFrame,
  getRoadMinimumSegmentsForBounds,
  isInRoadVegetationExclusion,
} from '../src/roadNetwork.js';
import { getGoldenShotFromLocation } from '../src/goldenShots.js';
import { Terrain } from '../src/terrain.js';

test('road network contains a carriage road and a branching forest trail', () => {
  assert.deepEqual(ROAD_ROUTES.map((route) => route.type), ['cart', 'trail', 'trail']);
  assert.ok(ROAD_ROUTES.every((route) => route.points.length >= 4));
  assert.ok(ROAD_ROUTES[0].width > ROAD_ROUTES[1].width);
  assert.equal(ROAD_ROUTES[2].id, 'mountain-access-trail');
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

test('mountain access trail grades a walkable corridor from the plain to the highland', () => {
  const route = ROAD_ROUTES.find(({ id }) => id === 'mountain-access-trail');
  const curve = new THREE.CatmullRomCurve3(
    route.points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal',
  );
  const heights = [];
  let minimumNormalY = 1;

  for (let index = 0; index <= 100; index += 1) {
    const progress = index / 100;
    const point = curve.getPointAt(progress);
    const tangent = curve.getTangentAt(progress).normalize();
    const height = applyRoadTerrain(100, point.x, point.z);

    heights.push(height);

    for (const offset of [-1.5, 0, 1.5]) {
      const x = point.x - tangent.z * offset;
      const z = point.z + tangent.x * offset;
      const left = applyRoadTerrain(100, x - 1, z);
      const right = applyRoadTerrain(100, x + 1, z);
      const down = applyRoadTerrain(100, x, z - 1);
      const up = applyRoadTerrain(100, x, z + 1);
      const normalY = new THREE.Vector3(left - right, 2, down - up).normalize().y;

      minimumNormalY = Math.min(minimumNormalY, normalY);
    }
  }

  assert.ok(Math.abs(heights[0] - route.terrainProfile.lowHeight) < 0.01);
  assert.ok(Math.abs(heights.at(-1) - route.terrainProfile.highHeight) < 0.01);
  assert.ok(heights.every((height, index) => index === 0 || height >= heights[index - 1]));
  assert.ok(minimumNormalY >= Math.cos(THREE.MathUtils.degToRad(35)));
  assert.ok(getRoadMaterialFrame(...route.points[0]).cartMask > 0.9);
  assert.ok(getRoadMaterialFrame(...route.points.at(-1)).trailMask > 0.9);
  assert.equal(isInRoadVegetationExclusion(417, -374), true);
  assert.equal(applyRoadTerrain(42, 100, 100), 42);
});

test('production terrain pipeline preserves the access slope after water shaping', () => {
  const terrain = Object.create(Terrain.prototype);
  const route = ROAD_ROUTES.find(({ id }) => id === 'mountain-access-trail');
  const curve = new THREE.CatmullRomCurve3(
    route.points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal',
  );
  let minimumNormalY = 1;

  terrain.getBaseHeightAt = () => 100;

  for (let index = 0; index <= 40; index += 1) {
    const progress = index / 40;
    const point = curve.getPointAt(progress);
    const tangent = curve.getTangentAt(progress).normalize();

    for (const offset of [-1.5, 0, 1.5]) {
      const x = point.x - tangent.z * offset;
      const z = point.z + tangent.x * offset;

      minimumNormalY = Math.min(minimumNormalY, terrain.getNormalAt(x, z).y);
    }
  }

  const [startX, startZ] = route.points[0];
  const [endX, endZ] = route.points.at(-1);

  assert.ok(Math.abs(terrain.getHeightAt(startX, startZ) - route.terrainProfile.lowHeight) < 0.01);
  assert.ok(Math.abs(terrain.getHeightAt(endX, endZ) - route.terrainProfile.highHeight) < 0.01);
  assert.ok(minimumNormalY >= Math.cos(THREE.MathUtils.degToRad(35)));
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

test('mountain access slope has a deterministic visual-check camera', () => {
  const shot = getGoldenShotFromLocation({ search: '?shot=mountain-access' });

  assert.equal(shot.key, 'mountain-access');
  assert.deepEqual(shot.player, { x: 444, z: -397 });
  assert.deepEqual(shot.target, { x: 414, z: -372, y: 14 });
});
