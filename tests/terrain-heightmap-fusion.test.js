import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { Terrain } from '../src/terrain.js';
import {
  HEIGHTMAP_SOURCE_HALF_SIZE,
  TERRAIN_WORLD_MAX_HEIGHT,
  createOuterTerrainRidgeSampler,
  getOuterTerrainHeight,
} from '../src/terrainExpansion.js';

const EDGE_HEIGHT = 210;
const EDGE_SLOPE = 0.15;

test('the supplied grayscale heightmap drives a continuous outer-ring sampler', () => {
  const lowSampler = createOuterTerrainRidgeSampler(createSolidHeightMap(0));
  const highSampler = createOuterTerrainRidgeSampler(createSolidHeightMap(255));
  const periodicSampler = createOuterTerrainRidgeSampler(createRgbaHeightMap([
    [128, 160, 200, 96, 128],
    [128, 160, 200, 96, 128],
  ]));
  const radius = 1800;
  const samples = 1440;
  let previous = sampleAtAngle(periodicSampler, radius, -Math.PI);
  let largestStep = 0;

  assert.equal(lowSampler(radius, 0), 0);
  assert.equal(highSampler(radius, 0), 1);

  for (let index = 1; index <= samples; index += 1) {
    const angle = -Math.PI + (index / samples) * Math.PI * 2;
    const current = sampleAtAngle(periodicSampler, radius, angle);

    largestStep = Math.max(largestStep, Math.abs(current - previous));
    previous = current;
  }

  assert.ok(largestStep < 0.01, `angular heightmap seam step ${largestStep}`);
  assert.ok(Math.abs(
    sampleAtAngle(periodicSampler, radius, -Math.PI)
      - sampleAtAngle(periodicSampler, radius, Math.PI),
  ) < 1e-12);
});

test('the fused heightmap controls the ridge inside its 520-600 meter envelope', () => {
  const lowSampler = createOuterTerrainRidgeSampler(createSolidHeightMap(0));
  const highSampler = createOuterTerrainRidgeSampler(createSolidHeightMap(255));
  const ridgeX = HEIGHTMAP_SOURCE_HALF_SIZE + 900;
  const lowHeight = getOuterTerrainHeight(
    EDGE_HEIGHT,
    EDGE_SLOPE,
    ridgeX,
    0,
    lowSampler,
  );
  const highHeight = getOuterTerrainHeight(
    EDGE_HEIGHT,
    EDGE_SLOPE,
    ridgeX,
    0,
    highSampler,
  );

  assert.equal(lowHeight, 520);
  assert.equal(highHeight, TERRAIN_WORLD_MAX_HEIGHT);
});

test('fusing outer height data preserves central terrain and feeds every terrain sampler', () => {
  const lowOuterTerrain = createTerrain(createSolidHeightMap(0));
  const highOuterTerrain = createTerrain(createSolidHeightMap(255));
  const centralPoints = [
    [0, 0],
    [1024, 0],
    [-1024, 733],
    [611, -1024],
    [-1024, -1024],
  ];

  for (const [x, z] of centralPoints) {
    assert.equal(
      lowOuterTerrain.getBaseHeightAt(x, z),
      highOuterTerrain.getBaseHeightAt(x, z),
      `central height changed at ${x},${z}`,
    );
  }

  const ridgeX = HEIGHTMAP_SOURCE_HALF_SIZE + 900;

  assert.equal(lowOuterTerrain.getBaseHeightAt(ridgeX, 0), 520);
  assert.equal(highOuterTerrain.getBaseHeightAt(ridgeX, 0), 600);
  assert.ok(
    highOuterTerrain.getHeightAt(ridgeX, 0)
      > lowOuterTerrain.getHeightAt(ridgeX, 0),
  );
  assert.ok(
    highOuterTerrain.getShadowProxyHeightAt(ridgeX, 0)
      > lowOuterTerrain.getShadowProxyHeightAt(ridgeX, 0),
  );

  lowOuterTerrain.dispose();
  highOuterTerrain.dispose();
});

function createTerrain(outerHeightMap) {
  const size = 32;
  const heightData = new Uint8ClampedArray(size * size * 4);
  const texture = new THREE.Texture();

  for (let index = 0; index < heightData.length; index += 4) {
    heightData[index] = 96;
    heightData[index + 1] = 96;
    heightData[index + 2] = 96;
    heightData[index + 3] = 255;
  }

  return new Terrain(heightData, size, size, {
    rock: texture,
    rockNormal: texture,
    forestFloorBaseColor: texture,
    forestFloorNormal: texture,
    riverBank: texture,
    riverBed: texture,
    riverGravel: texture,
  }, {
    minimumSegmentsForChunk: () => 0,
    outerHeightMap,
  });
}

function createSolidHeightMap(value) {
  return createRgbaHeightMap([
    [value, value],
    [value, value],
  ]);
}

function createRgbaHeightMap(rows) {
  const height = rows.length;
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const value = rows[y][x];

      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }

  return { data, width, height };
}

function sampleAtAngle(sampler, radius, angle) {
  return sampler(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
  );
}
