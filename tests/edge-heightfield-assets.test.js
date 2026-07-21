import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const manifestPath = resolve(
  root,
  'public/assets/terrain/edge-heightfields/manifest.json',
);
const expected = {
  north: {
    source: 'generated-heightmaps/alpine-glacial-range-5x1.png',
    orientation: 'west-to-east',
  },
  east: {
    source: 'generated-heightmaps/folded-sawtooth-range-5x1.png',
    orientation: 'north-to-south',
  },
  south: {
    source: 'generated-heightmaps/river-cut-highland-5x1.png',
    orientation: 'east-to-west',
  },
  west: {
    source: 'generated-heightmaps/faulted-mixed-range-5x1.png',
    orientation: 'south-to-north',
  },
};

test('edge heightfield manifest keeps the fixed four-side RG16 contract', async () => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  assert.equal(manifest.width, 4000);
  assert.equal(manifest.height, 800);
  assert.equal(manifest.encoding, 'rg16be-normalized');
  assert.equal(manifest.minHeightMeters, 12);
  assert.equal(manifest.maxHeightMeters, 420);
  assert.equal(manifest.bandDepthMeters, 6144 * (800 - 1) / (4000 - 1));
  assert.equal(manifest.verticalAxis, 'v=0 outer edge, v=1 inner edge');
  assert.equal(manifest.margins.outerPixels, 96);
  assert.equal(manifest.margins.innerPixels, 144);
  assert.deepEqual(
    manifest.heightfields.map(({ side }) => side),
    ['north', 'east', 'south', 'west'],
  );

  for (const entry of manifest.heightfields) {
    assert.equal(entry.source, expected[entry.side].source);
    assert.equal(entry.orientation, expected[entry.side].orientation);
    assert.equal(entry.width, manifest.width);
    assert.equal(entry.height, manifest.height);
    assert.equal(entry.encoding, manifest.encoding);
    assert.equal(entry.minHeightMeters, manifest.minHeightMeters);
    assert.equal(entry.maxHeightMeters, manifest.maxHeightMeters);
  }
});

test('packed heightfields and previews contain the same scalar uint16 values', async () => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  for (const entry of manifest.heightfields) {
    const runtimePath = resolve(root, `public${entry.runtimePath}`);
    const previewPath = resolve(root, `public${entry.previewPath}`);
    const sourcePath = resolve(root, `public/assets/terrain/${entry.source}`);
    const [runtimeBytes, previewBytes, sourceBytes] = await Promise.all([
      readFile(runtimePath),
      readFile(previewPath),
      readFile(sourcePath),
    ]);
    const [runtimeMetadata, previewMetadata] = await Promise.all([
      sharp(runtimeBytes).metadata(),
      sharp(previewBytes).metadata(),
    ]);

    assert.equal(runtimeMetadata.width, 4000, entry.side);
    assert.equal(runtimeMetadata.height, 800, entry.side);
    assert.equal(runtimeMetadata.channels, 4, entry.side);
    assert.equal(runtimeMetadata.bitsPerSample, 8, entry.side);
    assert.equal(previewMetadata.width, 4000, entry.side);
    assert.equal(previewMetadata.height, 800, entry.side);
    assert.equal(previewMetadata.channels, 1, entry.side);
    assert.equal(previewMetadata.bitsPerSample, 16, entry.side);
    assert.equal(sha256(runtimeBytes), entry.sha256, entry.side);
    assert.equal(sha256(previewBytes), entry.previewSha256, entry.side);
    assert.equal(sha256(sourceBytes), entry.sourceSha256, entry.side);

    const [rgba, preview] = await Promise.all([
      sharp(runtimeBytes).raw().toBuffer(),
      sharp(previewBytes)
        .toColourspace('grey16')
        .raw({ depth: 'ushort' })
        .toBuffer(),
    ]);
    const distinctCodes = new Uint8Array(65536);
    let minimum = 65535;
    let maximum = 0;
    let badBlue = 0;
    let badAlpha = 0;
    let previewMismatch = 0;

    for (let index = 0; index < entry.width * entry.height; index += 1) {
      const rgbaOffset = index * 4;
      const code = rgba[rgbaOffset] << 8 | rgba[rgbaOffset + 1];

      badBlue += rgba[rgbaOffset + 2] !== 0;
      badAlpha += rgba[rgbaOffset + 3] !== 255;
      previewMismatch += code !== preview.readUInt16LE(index * 2);
      distinctCodes[code] = 1;
      minimum = Math.min(minimum, code);
      maximum = Math.max(maximum, code);
    }

    assert.equal(badBlue, 0, entry.side);
    assert.equal(badAlpha, 0, entry.side);
    assert.equal(previewMismatch, 0, entry.side);
    assert.equal(minimum, 0, entry.side);
    assert.equal(maximum, 65535, entry.side);
    assert.ok(countNonzero(distinctCodes) > 60000, entry.side);

    for (let x = 0; x < entry.width; x += 1) {
      const outerOffset = x * 4;
      const innerOffset = ((entry.height - 1) * entry.width + x) * 4;

      assert.equal(rgba[outerOffset] | rgba[outerOffset + 1], 0, entry.side);
      assert.equal(rgba[innerOffset] | rgba[innerOffset + 1], 0, entry.side);
    }
  }
});

test('each edge heightfield keeps a player-walkable corridor through the mountain band', async () => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const metersPerPixel = 6144 / (manifest.width - 1);
  const maximumGrade = Math.tan(50 * Math.PI / 180);

  for (const entry of manifest.heightfields) {
    const runtimePath = resolve(root, `public${entry.runtimePath}`);
    const rgba = await sharp(runtimePath).raw().toBuffer();
    const heights = decodeHeights(rgba, entry.width, entry.height);
    const walkable = new Uint8Array(heights.length);

    for (let y = 1; y < entry.height - 1; y += 1) {
      for (let x = 1; x < entry.width - 1; x += 1) {
        const index = y * entry.width + x;
        const slopeX = (heights[index + 1] - heights[index - 1])
          / (metersPerPixel * 2);
        const slopeY = (heights[index + entry.width] - heights[index - entry.width])
          / (metersPerPixel * 2);

        walkable[index] = Math.hypot(slopeX, slopeY) <= maximumGrade;
      }
    }

    assert.ok(
      reachesOuterEdge(walkable, entry.width, entry.height),
      `${entry.side} must keep a continuous route at or below the player's 50 degree limit`,
    );
  }
});

function decodeHeights(rgba, width, height) {
  const values = new Float32Array(width * height);

  for (let index = 0; index < values.length; index += 1) {
    const sourceOffset = index * 4;
    const code = rgba[sourceOffset] << 8 | rgba[sourceOffset + 1];

    values[index] = 12 + code / 65535 * 408;
  }

  return values;
}

function reachesOuterEdge(walkable, width, height) {
  const visited = new Uint8Array(walkable.length);
  const queue = new Int32Array(walkable.length);
  let queueStart = 0;
  let queueEnd = 0;

  for (let x = 1; x < width - 1; x += 1) {
    const index = (height - 2) * width + x;

    if (!walkable[index]) continue;
    visited[index] = 1;
    queue[queueEnd] = index;
    queueEnd += 1;
  }

  while (queueStart < queueEnd) {
    const index = queue[queueStart];
    const y = Math.floor(index / width);

    queueStart += 1;
    if (y <= 1) return true;

    for (const neighbor of [index - 1, index + 1, index - width, index + width]) {
      if (visited[neighbor] || !walkable[neighbor]) continue;
      visited[neighbor] = 1;
      queue[queueEnd] = neighbor;
      queueEnd += 1;
    }
  }

  return false;
}

function countNonzero(values) {
  let total = 0;
  for (const value of values) total += value !== 0;
  return total;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
