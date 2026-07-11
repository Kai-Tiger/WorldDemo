import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { getGoldenShotFromLocation, listGoldenShotNames } from '../src/goldenShots.js';
import {
  NATURAL_MOUNTAIN_PASS,
  applyNaturalMountainPassTerrain,
  getNaturalMountainPassMinimumSegmentsForBounds,
} from '../src/naturalMountainPass.js';
import { Terrain } from '../src/terrain.js';

function createPassCurve() {
  return new THREE.CatmullRomCurve3(
    NATURAL_MOUNTAIN_PASS.points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal',
  );
}

test('natural mountain pass retains only terrain-shaping data', () => {
  assert.equal(Object.isFrozen(NATURAL_MOUNTAIN_PASS), true);
  assert.equal(Object.isFrozen(NATURAL_MOUNTAIN_PASS.points), true);
  assert.equal(Object.isFrozen(NATURAL_MOUNTAIN_PASS.profile), true);
  assert.equal(NATURAL_MOUNTAIN_PASS.id, undefined);
  assert.equal(NATURAL_MOUNTAIN_PASS.type, undefined);
  assert.equal(NATURAL_MOUNTAIN_PASS.width, undefined);
  assert.deepEqual(NATURAL_MOUNTAIN_PASS.profile, {
    lowHeight: 0,
    highHeight: 28,
    innerHalfWidth: 3,
    outerHalfWidth: 18,
  });
});

test('natural mountain pass grades a walkable corridor from the plain to the highland', () => {
  const curve = createPassCurve();
  const heights = [];
  let minimumNormalY = 1;

  for (let index = 0; index <= 100; index += 1) {
    const progress = index / 100;
    const point = curve.getPointAt(progress);
    const tangent = curve.getTangentAt(progress).normalize();
    const height = applyNaturalMountainPassTerrain(100, point.x, point.z);

    heights.push(height);

    for (const offset of [-1.5, 0, 1.5]) {
      const x = point.x - tangent.z * offset;
      const z = point.z + tangent.x * offset;
      const left = applyNaturalMountainPassTerrain(100, x - 1, z);
      const right = applyNaturalMountainPassTerrain(100, x + 1, z);
      const down = applyNaturalMountainPassTerrain(100, x, z - 1);
      const up = applyNaturalMountainPassTerrain(100, x, z + 1);
      const normalY = new THREE.Vector3(left - right, 2, down - up).normalize().y;

      minimumNormalY = Math.min(minimumNormalY, normalY);
    }
  }

  assert.ok(Math.abs(heights[0] - NATURAL_MOUNTAIN_PASS.profile.lowHeight) < 0.01);
  assert.ok(Math.abs(heights.at(-1) - NATURAL_MOUNTAIN_PASS.profile.highHeight) < 0.01);
  assert.ok(heights.every((height, index) => index === 0 || height >= heights[index - 1]));
  assert.ok(minimumNormalY >= Math.cos(THREE.MathUtils.degToRad(35)));
  assert.equal(applyNaturalMountainPassTerrain(42, 100, 100), 42);
});

test('production terrain pipeline preserves the natural pass after water shaping', () => {
  const terrain = Object.create(Terrain.prototype);
  const curve = createPassCurve();
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

  const [startX, startZ] = NATURAL_MOUNTAIN_PASS.points[0];
  const [endX, endZ] = NATURAL_MOUNTAIN_PASS.points.at(-1);

  assert.ok(
    Math.abs(terrain.getHeightAt(startX, startZ) - NATURAL_MOUNTAIN_PASS.profile.lowHeight) < 0.01,
  );
  assert.ok(
    Math.abs(terrain.getHeightAt(endX, endZ) - NATURAL_MOUNTAIN_PASS.profile.highHeight) < 0.01,
  );
  assert.ok(minimumNormalY >= Math.cos(THREE.MathUtils.degToRad(35)));
});

test('mountain-pass chunks retain one-meter terrain vertices', () => {
  assert.equal(getNaturalMountainPassMinimumSegmentsForBounds({
    minX: 256,
    maxX: 512,
    minZ: -512,
    maxZ: -256,
  }), 256);
  assert.equal(getNaturalMountainPassMinimumSegmentsForBounds({
    minX: -768,
    maxX: -512,
    minZ: 512,
    maxZ: 768,
  }), 0);
});

test('visual checks retain the natural pass camera without road-named shots', () => {
  const shot = getGoldenShotFromLocation({ search: '?shot=mountain-pass' });
  const shotNames = listGoldenShotNames();

  assert.equal(shot.key, 'mountain-pass');
  assert.deepEqual(shot.player, { x: 444, z: -397 });
  assert.deepEqual(shot.target, { x: 414, z: -372, y: 14 });
  assert.equal(getGoldenShotFromLocation({ search: '?shot=carriage-road' }), null);
  assert.equal(getGoldenShotFromLocation({ search: '?shot=mountain-access' }), null);
  assert.equal(shotNames.some((name) => /road|trail|carriage/i.test(name)), false);
});
