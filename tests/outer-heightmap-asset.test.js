import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';
import { createOuterTerrainRidgeSampler } from '../src/terrainExpansion.js';

const OUTER_HEIGHT_MAP_PATH = fileURLToPath(new URL(
  '../public/assets/terrain/outer-mountain-height.png',
  import.meta.url,
));

test('the fused outer heightmap retains grayscale relief and a periodic ring seam', async () => {
  const { data, info } = await sharp(OUTER_HEIGHT_MAP_PATH)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minimum = 255;
  let maximum = 0;
  let maximumSeamDerivativeError = 0;

  assert.equal(info.width, 512);
  assert.equal(info.height, 242);
  assert.equal(info.channels, 3);

  for (let y = 0; y < info.height; y += 1) {
    const rowOffset = y * info.width * info.channels;
    const first = data[rowOffset];
    const second = data[rowOffset + info.channels];
    const penultimate = data[rowOffset + (info.width - 2) * info.channels];
    const last = data[rowOffset + (info.width - 1) * info.channels];

    assert.equal(first, last, `height seam differs on row ${y}`);
    maximumSeamDerivativeError = Math.max(
      maximumSeamDerivativeError,
      Math.abs((second - first) - (last - penultimate)),
    );

    for (let x = 0; x < info.width; x += 1) {
      const offset = rowOffset + x * info.channels;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];

      assert.equal(red, green);
      assert.equal(red, blue);
      minimum = Math.min(minimum, red);
      maximum = Math.max(maximum, red);
    }
  }

  assert.equal(minimum, 0);
  assert.equal(maximum, 255);
  assert.ok(maximumSeamDerivativeError <= 1);

  const rgba = new Uint8ClampedArray(info.width * info.height * 4);

  for (let source = 0, target = 0; source < data.length; source += 3, target += 4) {
    rgba[target] = data[source];
    rgba[target + 1] = data[source + 1];
    rgba[target + 2] = data[source + 2];
    rgba[target + 3] = 255;
  }

  const sampleRidge = createOuterTerrainRidgeSampler({
    data: rgba,
    width: info.width,
    height: info.height,
  });
  const cardinalProfiles = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ].map(([directionX, directionZ]) => {
    const profile = [];

    for (let distance = 192; distance <= 1024; distance += 64) {
      profile.push(Math.round(sampleRidge(
        directionX * (1024 + distance),
        directionZ * (1024 + distance),
      ) * 255));
    }

    return profile.join(',');
  });

  assert.equal(new Set(cardinalProfiles).size, 4);
});
