import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CENTRAL_PEAK_MAX_HEIGHT,
  CENTRAL_UPLIFT_START_HEIGHT,
  getOuterTerrainDistance,
  getOuterTerrainHeight,
  getOuterTerrainRidgeField,
  HEIGHTMAP_SOURCE_HALF_SIZE,
  HEIGHTMAP_SOURCE_MAX_HEIGHT,
  HEIGHTMAP_SOURCE_WORLD_SIZE,
  isSourceTerrainPosition,
  isTerrainEditableAt,
  OUTER_TERRAIN_BARRIER_END,
  OUTER_TERRAIN_BUFFER_END,
  OUTER_TERRAIN_FOOTHILL_END,
  OUTER_TERRAIN_NOISE_WAVELENGTHS,
  OUTER_TERRAIN_RIDGE_END,
  OUTER_TERRAIN_SEAM_END,
  TERRAIN_WORLD_HALF_SIZE,
  TERRAIN_WORLD_MAX_HEIGHT,
  TERRAIN_WORLD_SIZE,
  upliftCentralHeight,
} from '../src/terrainExpansion.js';

const EDGE_HEIGHT = 220;
const EDGE_SLOPE = 0.25;

test('terrain expansion keeps source and world dimensions distinct', () => {
  assert.equal(HEIGHTMAP_SOURCE_WORLD_SIZE, 2048);
  assert.equal(HEIGHTMAP_SOURCE_HALF_SIZE, 1024);
  assert.equal(HEIGHTMAP_SOURCE_MAX_HEIGHT, 300);
  assert.equal(TERRAIN_WORLD_SIZE, 4096);
  assert.equal(TERRAIN_WORLD_HALF_SIZE, 2048);
  assert.equal(TERRAIN_WORLD_MAX_HEIGHT, 600);
  assert.deepEqual([
    OUTER_TERRAIN_SEAM_END,
    OUTER_TERRAIN_FOOTHILL_END,
    OUTER_TERRAIN_BUFFER_END,
    OUTER_TERRAIN_BARRIER_END,
    OUTER_TERRAIN_RIDGE_END,
  ], [192, 640, 704, 864, 1024]);
  assert.deepEqual(OUTER_TERRAIN_NOISE_WAVELENGTHS, [512, 256, 128, 64]);
});

test('central uplift preserves lowlands and limits highland slope amplification', () => {
  assert.equal(upliftCentralHeight(0), 0);
  assert.equal(upliftCentralHeight(CENTRAL_UPLIFT_START_HEIGHT), 185);
  assert.equal(upliftCentralHeight(300), CENTRAL_PEAK_MAX_HEIGHT);
  assert.equal(upliftCentralHeight(400), CENTRAL_PEAK_MAX_HEIGHT);

  const justBelow = upliftCentralHeight(185 - 1e-3);
  const justAbove = upliftCentralHeight(185 + 1e-3);
  assert.ok(Math.abs(justAbove - justBelow - 2e-3) < 1e-6);
  assert.ok(upliftCentralHeight(240) > 260);
  assert.ok(upliftCentralHeight(240) < 270);
  assert.ok(upliftCentralHeight(280) > 320);
  assert.ok(upliftCentralHeight(280) < 330);
  assert.ok(upliftCentralHeight(280) < CENTRAL_PEAK_MAX_HEIGHT);

  let previousHeight = upliftCentralHeight(CENTRAL_UPLIFT_START_HEIGHT);

  for (let sourceHeight = CENTRAL_UPLIFT_START_HEIGHT + 1; sourceHeight <= 300; sourceHeight += 1) {
    const currentHeight = upliftCentralHeight(sourceHeight);
    assert.ok(currentHeight >= previousHeight, `height inversion at ${sourceHeight}m`);
    assert.ok(currentHeight - previousHeight < 1.66, `slope amplification at ${sourceHeight}m`);
    previousHeight = currentHeight;
  }
});

test('outer distance follows the nearest point on the old square boundary', () => {
  assert.equal(getOuterTerrainDistance(1024, 0), 0);
  assert.equal(getOuterTerrainDistance(0, -1024), 0);
  assert.equal(getOuterTerrainDistance(1024, -1024), 0);
  assert.equal(getOuterTerrainDistance(1216, 100), 192);
  assert.equal(getOuterTerrainDistance(-2048, -2048), Math.hypot(1024, 1024));
});

test('Hermite seam preserves edge height and outward first derivative', () => {
  const heightAtEdge = getOuterTerrainHeight(EDGE_HEIGHT, EDGE_SLOPE, 1024, 137);
  const epsilon = 1e-3;
  const heightJustOutside = getOuterTerrainHeight(
    EDGE_HEIGHT,
    EDGE_SLOPE,
    1024 + epsilon,
    137,
  );
  const numericalSlope = (heightJustOutside - heightAtEdge) / epsilon;

  assert.equal(heightAtEdge, EDGE_HEIGHT);
  assert.ok(Math.abs(numericalSlope - EDGE_SLOPE) < 1e-5);
});

test('all outer bands meet continuously', () => {
  const epsilon = 1e-4;
  const boundaries = [
    OUTER_TERRAIN_SEAM_END,
    OUTER_TERRAIN_FOOTHILL_END,
    OUTER_TERRAIN_BUFFER_END,
    OUTER_TERRAIN_BARRIER_END,
  ];

  for (const boundary of boundaries) {
    const before = getOuterTerrainHeight(
      EDGE_HEIGHT,
      EDGE_SLOPE,
      HEIGHTMAP_SOURCE_HALF_SIZE + boundary - epsilon,
      211,
    );
    const after = getOuterTerrainHeight(
      EDGE_HEIGHT,
      EDGE_SLOPE,
      HEIGHTMAP_SOURCE_HALF_SIZE + boundary + epsilon,
      211,
    );

    assert.ok(Math.abs(after - before) < 1e-2, `discontinuity at ${boundary}m`);
  }
});

test('foothills stay walkable at the macro scale before the barrier', () => {
  const sampleStep = 32;
  let previousHeight = getOuterTerrainHeight(
    EDGE_HEIGHT,
    EDGE_SLOPE,
    HEIGHTMAP_SOURCE_HALF_SIZE + OUTER_TERRAIN_SEAM_END,
    320,
  );

  for (
    let distance = OUTER_TERRAIN_SEAM_END + sampleStep;
    distance <= OUTER_TERRAIN_FOOTHILL_END;
    distance += sampleStep
  ) {
    const height = getOuterTerrainHeight(
      EDGE_HEIGHT,
      EDGE_SLOPE,
      HEIGHTMAP_SOURCE_HALF_SIZE + distance,
      320,
    );
    const slope = Math.abs(height - previousHeight) / sampleStep;

    assert.ok(slope < Math.tan(35 * Math.PI / 180), `foothill slope ${slope}`);
    previousHeight = height;
  }

  const gradientStep = 4;

  for (let along = -1024; along <= 1024; along += 64) {
    for (
      let distance = OUTER_TERRAIN_SEAM_END;
      distance <= OUTER_TERRAIN_FOOTHILL_END;
      distance += 32
    ) {
      const points = [
        [HEIGHTMAP_SOURCE_HALF_SIZE + distance, along],
        [-HEIGHTMAP_SOURCE_HALF_SIZE - distance, along],
        [along, HEIGHTMAP_SOURCE_HALF_SIZE + distance],
        [along, -HEIGHTMAP_SOURCE_HALF_SIZE - distance],
      ];

      for (const [x, z] of points) {
        const gradientX = (
          getOuterTerrainHeight(EDGE_HEIGHT, EDGE_SLOPE, x + gradientStep, z)
            - getOuterTerrainHeight(EDGE_HEIGHT, EDGE_SLOPE, x - gradientStep, z)
        ) / (gradientStep * 2);
        const gradientZ = (
          getOuterTerrainHeight(EDGE_HEIGHT, EDGE_SLOPE, x, z + gradientStep)
            - getOuterTerrainHeight(EDGE_HEIGHT, EDGE_SLOPE, x, z - gradientStep)
        ) / (gradientStep * 2);

        assert.ok(
          Math.hypot(gradientX, gradientZ) < Math.tan(35 * Math.PI / 180),
          `foothill gradient at ${x},${z}`,
        );
      }
    }
  }
});

test('barrier forces an unclimbable rise on every side and at every corner', () => {
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  for (const [directionX, directionZ] of directions) {
    let shallowestSlope = Infinity;
    let previousHeight = sampleRadialHeight(directionX, directionZ, OUTER_TERRAIN_BUFFER_END);

    for (
      let distance = OUTER_TERRAIN_BUFFER_END + 4;
      distance <= OUTER_TERRAIN_BARRIER_END;
      distance += 4
    ) {
      const height = sampleRadialHeight(directionX, directionZ, distance);
      shallowestSlope = Math.min(shallowestSlope, (height - previousHeight) / 4);
      previousHeight = height;
    }

    assert.ok(shallowestSlope > 1.6, `barrier slope ${shallowestSlope}`);
  }
});

test('the outer border is a deterministic 520-600m ridge without side or corner gaps', () => {
  let minimumHeight = Infinity;
  const samples = [];

  for (let coordinate = -TERRAIN_WORLD_HALF_SIZE; coordinate <= TERRAIN_WORLD_HALF_SIZE; coordinate += 64) {
    samples.push([coordinate, -TERRAIN_WORLD_HALF_SIZE]);
    samples.push([coordinate, TERRAIN_WORLD_HALF_SIZE]);
    samples.push([-TERRAIN_WORLD_HALF_SIZE, coordinate]);
    samples.push([TERRAIN_WORLD_HALF_SIZE, coordinate]);
  }

  for (const [x, z] of samples) {
    const height = getOuterTerrainHeight(EDGE_HEIGHT, EDGE_SLOPE, x, z);
    minimumHeight = Math.min(minimumHeight, height);
    assert.ok(height <= TERRAIN_WORLD_MAX_HEIGHT);
    assert.equal(height, getOuterTerrainHeight(EDGE_HEIGHT, EDGE_SLOPE, x, z));
  }

  assert.ok(minimumHeight >= 520);
  assert.notEqual(samples[0], samples.at(-1));
  assert.notEqual(
    getOuterTerrainRidgeField(2048, 257),
    getOuterTerrainRidgeField(-2048, 257),
  );
  assert.notEqual(
    getOuterTerrainRidgeField(257, 2048),
    getOuterTerrainRidgeField(257, -2048),
  );
});

test('only the original heightmap domain is editable', () => {
  assert.equal(isSourceTerrainPosition(1024, -1024), true);
  assert.equal(isTerrainEditableAt(0, 0), true);
  assert.equal(isTerrainEditableAt(1024.001, 0), false);
  assert.equal(isTerrainEditableAt(0, -1024.001), false);
});

function sampleRadialHeight(directionX, directionZ, outerDistance) {
  const directionLength = Math.hypot(directionX, directionZ);
  const edgeX = directionX === 0
    ? 317
    : directionX * HEIGHTMAP_SOURCE_HALF_SIZE;
  const edgeZ = directionZ === 0
    ? -283
    : directionZ * HEIGHTMAP_SOURCE_HALF_SIZE;
  const x = edgeX + directionX / directionLength * outerDistance;
  const z = edgeZ + directionZ / directionLength * outerDistance;

  return getOuterTerrainHeight(EDGE_HEIGHT, EDGE_SLOPE, x, z);
}
