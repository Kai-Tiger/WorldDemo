import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {
  PRECISE_WATER_HEIGHT_MARKER,
  decodeTerrainHeightCode,
  encodePreciseWaterHeight,
  isPreciseWaterHeightCode,
} from '../src/terrainHeightEncoding.js';
import { encodeHeightmapForStorage } from '../vite.config.js';

const MAX_HEIGHT = 300;

test('precise water height pixels retain centimeter-scale lowland beds', () => {
  for (const height of [0, 0.15, 0.8, 1.35, 2.2, 3.4, 16]) {
    const encoded = encodePreciseWaterHeight(height, MAX_HEIGHT);
    const decoded = decodeTerrainHeightCode(...encoded) / 255 * MAX_HEIGHT;

    assert.equal(encoded[2], PRECISE_WATER_HEIGHT_MARKER);
    assert.equal(isPreciseWaterHeightCode(encoded[0], encoded[2]), true);
    assert.ok(Math.abs(decoded - height) < 0.005, `${height}m decoded as ${decoded}m`);
  }
});

test('legacy height pixels keep their luminance decoding', () => {
  assert.equal(decodeTerrainHeightCode(12, 12, 12), 12);
  assert.equal(isPreciseWaterHeightCode(254, PRECISE_WATER_HEIGHT_MARKER), false);
  assert.ok(Math.abs(decodeTerrainHeightCode(20, 21, 22) - 20.8596) < 1e-8);
});

test('terrain editor storage preserves precise RGB markers losslessly', async () => {
  const raw = Buffer.from([
    ...encodePreciseWaterHeight(0.15, MAX_HEIGHT),
    ...encodePreciseWaterHeight(1.35, MAX_HEIGHT),
    ...encodePreciseWaterHeight(3.4, MAX_HEIGHT),
  ]);
  const png = await sharp(raw, { raw: { width: 3, height: 1, channels: 3 } })
    .png()
    .toBuffer();
  const stored = await encodeHeightmapForStorage(png);
  const decoded = await sharp(stored).removeAlpha().raw().toBuffer();

  assert.deepEqual(decoded, raw);
});
