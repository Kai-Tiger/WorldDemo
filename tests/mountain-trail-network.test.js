import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { getGoldenShotFromLocation, listGoldenShotNames } from '../src/goldenShots.js';
import { isInRiverGrassExclusion } from '../src/riverChannel.js';
import { isInSmallLakeExclusion } from '../src/smallLakes.js';
import {
  MOUNTAIN_TRAIL_ROUTES,
  MOUNTAIN_TRAIL_SUMMITS,
  applyMountainTrailTerrain,
  getMountainTrailMaterialMask,
  getMountainTrailMinimumSegmentsForBounds,
  isInMountainTrailGrassExclusion,
  isInMountainTrailTreeExclusion,
} from '../src/mountainTrailNetwork.js';
import { isInWaterSystemVegetationExclusion } from '../src/waterSystem.js';

const MAX_DESIGN_SLOPE_NORMAL_Y = Math.cos(THREE.MathUtils.degToRad(35));
const MAP_MIN = -1024;
const CHUNK_SIZE = 256;

test('mountain trail definitions retain one pass, three routes, and six frozen summits', () => {
  assert.equal(Object.isFrozen(MOUNTAIN_TRAIL_ROUTES), true);
  assert.equal(Object.isFrozen(MOUNTAIN_TRAIL_SUMMITS), true);
  assert.deepEqual(MOUNTAIN_TRAIL_ROUTES.map((route) => route.id), [
    'mountain-pass',
    'mountain-east',
    'mountain-west-loop',
    'mountain-south-loop',
  ]);
  assert.deepEqual(MOUNTAIN_TRAIL_SUMMITS.map(({ x, z, height }) => [x, z, height]), [
    [-337, -412, 297],
    [-153, -665, 295],
    [-575, -359, 281],
    [163, -78, 240],
    [-311, 130, 237],
    [-7, -175, 232],
  ]);

  for (const route of MOUNTAIN_TRAIL_ROUTES) {
    assert.equal(Object.isFrozen(route), true);
    assert.equal(Object.isFrozen(route.points), true);
    assert.equal(route.points.every(Object.isFrozen), true);
  }
  assert.equal(MOUNTAIN_TRAIL_SUMMITS.every(Object.isFrozen), true);
});

test('the static elevation profiles keep every trail lane at or below 35 degrees', () => {
  let maximumSlope = 0;
  let worstSample = null;

  for (const route of MOUNTAIN_TRAIL_ROUTES) {
    for (let index = 1; index < route.points.length; index += 1) {
      const start = route.points[index - 1];
      const end = route.points[index];
      const deltaX = end.x - start.x;
      const deltaZ = end.z - start.z;
      const length = Math.hypot(deltaX, deltaZ);
      let previousAlong = 0;
      let previousHeight = getExpectedTrailHeight(start, end, length, 0);

      for (let along = 0.25; along <= length + 0.000001; along += 0.25) {
        const sampledAlong = Math.min(along, length);
        const amount = sampledAlong / length;
        const height = getExpectedTrailHeight(start, end, length, amount);
        const slope = Math.abs(height - previousHeight)
          / (sampledAlong - previousAlong);

        if (slope > maximumSlope) {
          maximumSlope = slope;
          worstSample = { route: route.id, index, along: sampledAlong };
        }

        previousAlong = sampledAlong;
        previousHeight = height;
      }
    }
  }

  assert.ok(
    Math.cos(Math.atan(maximumSlope)) >= MAX_DESIGN_SLOPE_NORMAL_Y - 0.000001,
    `Trail slope exceeded 35 degrees at ${JSON.stringify(worstSample)}`,
  );
});

function getExpectedTrailHeight(start, end, length, amount) {
  const startIsSummit = MOUNTAIN_TRAIL_SUMMITS.some((summit) => (
    summit.x === start.x && summit.z === start.z && summit.height === start.height
  ));
  const endIsSummit = MOUNTAIN_TRAIL_SUMMITS.some((summit) => (
    summit.x === end.x && summit.z === end.z && summit.height === end.height
  ));
  const along = amount * length;

  if (startIsSummit) {
    if (along <= 3) return start.height;
    return THREE.MathUtils.lerp(start.height, end.height, (along - 3) / (length - 3));
  }

  if (endIsSummit) {
    const gradedLength = length - 3;

    if (along >= gradedLength) return end.height;
    return THREE.MathUtils.lerp(start.height, end.height, along / gradedLength);
  }

  return THREE.MathUtils.lerp(start.height, end.height, amount);
}

test('summit landings are flat while excluded peaks and distant terrain stay unchanged', () => {
  for (const summit of MOUNTAIN_TRAIL_SUMMITS) {
    for (const [offsetX, offsetZ] of [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
      assert.equal(
        applyMountainTrailTerrain(1000, summit.x + offsetX, summit.z + offsetZ),
        summit.height,
      );
    }
  }

  assert.equal(applyMountainTrailTerrain(77, -695, -66), 77);
  assert.equal(applyMountainTrailTerrain(77, -5, 223), 77);
  assert.equal(applyMountainTrailTerrain(77, 900, 900), 77);
});

test('trail material and vegetation bands remain narrow', () => {
  const route = MOUNTAIN_TRAIL_ROUTES.find(({ id }) => id === 'mountain-east');
  const start = route.points[1];
  const end = route.points[2];
  const deltaX = end.x - start.x;
  const deltaZ = end.z - start.z;
  const length = Math.hypot(deltaX, deltaZ);
  const centerX = (start.x + end.x) * 0.5;
  const centerZ = (start.z + end.z) * 0.5;
  const normalX = -deltaZ / length;
  const normalZ = deltaX / length;
  const sample = (offset) => [centerX + normalX * offset, centerZ + normalZ * offset];

  assert.ok(getMountainTrailMaterialMask(centerX, centerZ) > 0.9);
  assert.equal(getMountainTrailMaterialMask(...sample(2.5)), 0);
  assert.equal(isInMountainTrailGrassExclusion(centerX, centerZ), true);
  assert.equal(isInMountainTrailGrassExclusion(...sample(2.1)), false);
  assert.equal(isInMountainTrailTreeExclusion(...sample(3.8)), true);
  assert.equal(isInMountainTrailTreeExclusion(...sample(4.2)), false);
});

test('all three trail treads remain clear of rivers and lakes', () => {
  for (const route of MOUNTAIN_TRAIL_ROUTES.slice(1)) {
    for (let index = 1; index < route.points.length; index += 1) {
      const start = route.points[index - 1];
      const end = route.points[index];
      const deltaX = end.x - start.x;
      const deltaZ = end.z - start.z;
      const length = Math.hypot(deltaX, deltaZ);
      const normalX = -deltaZ / length;
      const normalZ = deltaX / length;

      for (let along = 0; along <= length; along += 2) {
        const amount = Math.min(along / length, 1);
        const centerX = THREE.MathUtils.lerp(start.x, end.x, amount);
        const centerZ = THREE.MathUtils.lerp(start.z, end.z, amount);

        for (const offset of [-1.6, 0, 1.6]) {
          const x = centerX + normalX * offset;
          const z = centerZ + normalZ * offset;

          assert.equal(isInWaterSystemVegetationExclusion(x, z, 0), false);
          assert.equal(isInSmallLakeExclusion(x, z), false);
          assert.equal(isInRiverGrassExclusion(x, z, 0), false);
        }
      }
    }
  }
});

test('route detail floors touch only the intended fixed terrain chunks', () => {
  let promotedChunks = 0;
  let highDetailChunks = 0;

  for (let chunkZ = 0; chunkZ < 8; chunkZ += 1) {
    for (let chunkX = 0; chunkX < 8; chunkX += 1) {
      const minX = MAP_MIN + chunkX * CHUNK_SIZE;
      const minZ = MAP_MIN + chunkZ * CHUNK_SIZE;
      const minimum = getMountainTrailMinimumSegmentsForBounds({
        minX,
        maxX: minX + CHUNK_SIZE,
        minZ,
        maxZ: minZ + CHUNK_SIZE,
      });

      if (minimum > 0) promotedChunks += 1;
      if (minimum === 256) highDetailChunks += 1;
    }
  }

  assert.ok(promotedChunks <= 18);
  assert.ok(highDetailChunks <= 8);
  assert.equal(getMountainTrailMinimumSegmentsForBounds({
    minX: 768,
    maxX: 1024,
    minZ: 768,
    maxZ: 1024,
  }), 0);
});

test('deterministic visual checks expose the three mountain routes and retain the pass', () => {
  const expectedShots = [
    'mountain-pass',
    'mountain-east',
    'mountain-west-loop',
    'mountain-south-loop',
  ];
  const shotNames = listGoldenShotNames();

  for (const shotName of expectedShots) {
    assert.equal(getGoldenShotFromLocation({ search: `?shot=${shotName}` }).key, shotName);
    assert.equal(shotNames.includes(shotName), true);
  }

  assert.equal(getGoldenShotFromLocation({ search: '?shot=carriage-road' }), null);
  assert.equal(getGoldenShotFromLocation({ search: '?shot=mountain-access' }), null);
});
