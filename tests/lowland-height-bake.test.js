import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LOWLAND_BAKE_COUNTS,
  LOWLAND_HEIGHT_SETTINGS,
  LOWLAND_HILLS,
  LOWLAND_LAKES,
  LOWLAND_STREAM_DEFINITION,
  LOWLAND_STREAM_DEFINITIONS,
  LOWLAND_STREAM_PLAN,
  MAIN_RIVER_CHANNEL,
  PLUNGE_POOL,
  SOUTHERN_LOWLAND_LAKES,
  TERMINAL_LOWLAND_LAKE,
  getBakedLowlandHeight,
  getLowlandPlanStatistics,
  getLowlandTerrainHeight,
  getLowlandWaterTerrainTarget,
} from '../src/lowlandHeightPlan.js';
import {
  DEFAULT_SOURCE_PATH,
  bakeBlackLowlandsRaw,
  checkLowlandHeightmap,
  loadRawHeightmap,
} from '../tools/bake-black-lowlands.mjs';

test('shared lowland plan preserves ten hills and adds the locked regional counts', () => {
  assert.equal(Object.isFrozen(LOWLAND_HILLS), true);
  assert.equal(LOWLAND_HILLS.length, 28);
  assert.deepEqual(LOWLAND_BAKE_COUNTS, {
    hills: 28,
    preservedHills: 10,
    addedHills: 18,
    northAddedHills: 10,
    eastAddedHills: 2,
    southAddedHills: 6,
    lowlandLakes: 3,
    southernLakes: 4,
    streamBasins: 3,
    streamReaches: 5,
  });

  const additions = LOWLAND_HILLS.filter((hill) => hill.region !== 'preserved');

  assert.ok(additions.every((hill) => hill.height >= 3.5 && hill.height <= 7));
  assert.ok(additions.every((hill) => (
    hill.radiusX >= 35 && hill.radiusX <= 80
    && hill.radiusZ >= 35 && hill.radiusZ <= 80
  )));
});

test('added hills avoid every authored lowland water body', () => {
  const additions = LOWLAND_HILLS.filter((hill) => hill.region !== 'preserved');
  const lakes = [
    ...LOWLAND_LAKES,
    ...SOUTHERN_LOWLAND_LAKES,
    TERMINAL_LOWLAND_LAKE,
    PLUNGE_POOL,
  ];

  for (const hill of additions) {
    const hillRadius = Math.max(hill.radiusX, hill.radiusZ) * (1 + hill.shapeAmp);

    for (const lake of lakes) {
      const lakeRadius = Math.max(lake.radiusX ?? lake.radius, lake.radiusZ ?? lake.radius)
        * (1 + (lake.shapeAmp ?? 0)) + (lake.shoreWidth ?? 0);
      const distance = Math.hypot(hill.cx - lake.cx, hill.cz - lake.cz);

      assert.ok(distance > hillRadius + lakeRadius, `${hill.id} overlaps ${lake.id}`);
    }

    for (let index = 0; index < 16; index += 1) {
      const angle = index / 16 * Math.PI * 2;
      const x = hill.cx + Math.cos(angle) * hill.radiusX * 0.5;
      const z = hill.cz + Math.sin(angle) * hill.radiusZ * 0.5;
      const water = getLowlandWaterTerrainTarget(getLowlandTerrainHeight(x, z), x, z);

      assert.equal(water, null, `${hill.id} inner footprint overlaps ${water?.featureId}`);
    }
  }
});

test('every added hill is centered in the fixed pure-black mask with an intact inner footprint', async () => {
  const source = await loadRawHeightmap(DEFAULT_SOURCE_PATH);
  const additions = LOWLAND_HILLS.filter((hill) => hill.region !== 'preserved');

  for (const hill of additions) {
    const cos = Math.cos(hill.rotation);
    const sin = Math.sin(hill.rotation);
    let innerPixels = 0;
    let innerBlackPixels = 0;

    for (let z = hill.cz - hill.radiusZ * 0.55; z <= hill.cz + hill.radiusZ * 0.55; z += 2) {
      for (let x = hill.cx - hill.radiusX * 0.55; x <= hill.cx + hill.radiusX * 0.55; x += 2) {
        const dx = x - hill.cx;
        const dz = z - hill.cz;
        const localX = dx * cos + dz * sin;
        const localZ = -dx * sin + dz * cos;

        if (Math.hypot(localX / hill.radiusX, localZ / hill.radiusZ) > 0.5) continue;

        const pixelX = Math.round(
          (x + LOWLAND_HEIGHT_SETTINGS.worldSize * 0.5)
          / LOWLAND_HEIGHT_SETTINGS.worldSize
          * (source.width - 1),
        );
        const pixelY = Math.round(
          (1 - (z + LOWLAND_HEIGHT_SETTINGS.worldSize * 0.5)
          / LOWLAND_HEIGHT_SETTINGS.worldSize)
          * (source.height - 1),
        );
        const offset = (pixelY * source.width + pixelX) * source.channels;

        innerPixels += 1;
        if (
          source.data[offset] === 0
          && source.data[offset + 1] === 0
          && source.data[offset + 2] === 0
        ) innerBlackPixels += 1;
      }
    }

    assert.ok(innerBlackPixels / innerPixels >= 0.98, `${hill.id} is clipped by the source mask`);
  }
});

test('three stream basins use the locked lake levels and never rise downstream', () => {
  assert.equal(Object.isFrozen(LOWLAND_STREAM_DEFINITIONS), true);
  assert.deepEqual(LOWLAND_STREAM_DEFINITIONS.map((basin) => basin.id), [
    'east-lowland-basin',
    'north-lowland-basin',
    'south-lowland-basin',
  ]);
  assert.deepEqual(LOWLAND_STREAM_DEFINITIONS.map((basin) => basin.reaches.length), [1, 1, 3]);

  const eastLevels = LOWLAND_STREAM_DEFINITIONS[0].reaches[0].waterLevels;
  const northLevels = LOWLAND_STREAM_DEFINITIONS[1].reaches[0].waterLevels;
  const southLevels = LOWLAND_STREAM_DEFINITIONS[2].reaches.map((reach) => [
    reach.waterLevels[0],
    reach.waterLevels.at(-1),
  ]);

  assert.deepEqual(eastLevels.slice(0, 3), [3.2, 3.2, 3.2]);
  assert.deepEqual(eastLevels.slice(-2), [1.6, 1.6]);
  assert.deepEqual([northLevels[0], northLevels.at(-1)], [3.5, 2]);
  assert.deepEqual(southLevels, [[3.5, 2.8], [3.2, 2.8], [2.8, 1.8]]);

  assert.equal(LOWLAND_STREAM_DEFINITION, LOWLAND_STREAM_DEFINITIONS[0]);
  assert.equal(LOWLAND_STREAM_PLAN.reaches.length, 5);

  for (const reach of [MAIN_RIVER_CHANNEL, ...LOWLAND_STREAM_PLAN.reaches]) {
    for (let index = 1; index < reach.waterLevels.length; index += 1) {
      assert.ok(
        reach.waterLevels[index] <= reach.waterLevels[index - 1],
        `${reach.id} rises downstream`,
      );
    }
  }
});

test('all authored beds are non-negative and remain below their water surfaces', () => {
  const lakes = [
    ...LOWLAND_LAKES,
    ...SOUTHERN_LOWLAND_LAKES,
    TERMINAL_LOWLAND_LAKE,
    PLUNGE_POOL,
  ];

  assert.equal(getLowlandPlanStatistics().minimumAuthoredBedHeight, 0);

  for (const lake of lakes) {
    const bed = getBakedLowlandHeight(lake.cx, lake.cz);

    assert.ok(bed >= 0, `${lake.id} bed is below 0m`);
    assert.ok(bed < lake.waterLevel, `${lake.id} bed is not below its water level`);
  }
});

test('synthetic baking changes exact black only, feathers inward, and is deterministic', () => {
  const width = 65;
  const height = 65;
  const channels = 3;
  const source = Buffer.alloc(width * height * channels);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x !== 0 && x !== width - 1 && y !== 0 && y !== height - 1) continue;

      const offset = (y * width + x) * channels;

      source[offset] = 20;
      source[offset + 1] = 21;
      source[offset + 2] = 22;
    }
  }

  const first = bakeBlackLowlandsRaw(source, width, height, channels, { worldSize: 64 });
  const second = bakeBlackLowlandsRaw(source, width, height, channels, { worldSize: 64 });

  assert.deepEqual(first.data, second.data);
  assert.equal(first.stats.nonBlackPixels, width * 4 - 4);
  assert.ok(first.stats.modifiedCoreBlackPixels > 0);

  for (let pixel = 0, offset = 0; pixel < width * height; pixel += 1, offset += channels) {
    const sourceIsBlack = source[offset] === 0
      && source[offset + 1] === 0
      && source[offset + 2] === 0;

    if (!sourceIsBlack) {
      assert.deepEqual(
        [...first.data.subarray(offset, offset + channels)],
        [...source.subarray(offset, offset + channels)],
      );
    }
  }

  const sample = (x, y = 32) => first.data[(y * width + x) * channels];

  assert.equal(sample(1), 0);
  assert.ok(sample(13) > sample(1));
  assert.ok(sample(32) >= sample(13));
});

test('tracked heightmap exactly matches the fixed source and deterministic bake', async () => {
  const result = await checkLowlandHeightmap();

  assert.equal(result.mismatchedPixels, 0);
  assert.equal(result.changedNonBlackPixels, 0);
  assert.ok(result.coreCoverage >= 0.99);
  assert.ok(result.maximumBakedHeight <= LOWLAND_HEIGHT_SETTINGS.maximumBakedHeight);
});
