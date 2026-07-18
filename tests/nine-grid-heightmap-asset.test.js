import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';

const HEIGHT_MAP_PATH = fileURLToPath(new URL(
  '../public/assets/terrain/nine-grid-height.png',
  import.meta.url,
));

test('the derived reference heightmap contains eight relief cells and a feathered center', async () => {
  const { data, info } = await sharp(HEIGHT_MAP_PATH)
    .raw()
    .toBuffer({ resolveWithObject: true });

  assert.equal(info.width, 1024);
  assert.equal(info.height, 1024);
  assert.equal(info.channels, 3);

  for (let index = 0; index < data.length; index += info.channels) {
    assert.equal(data[index], data[index + 1]);
    assert.equal(data[index], data[index + 2]);
  }

  const edgeCode = 13;
  const centerStart = Math.ceil(info.width / 3);
  const centerEnd = Math.floor(info.width * 2 / 3);

  for (let coordinate = 0; coordinate < info.width; coordinate += 8) {
    assert.equal(sampleCode(data, info, coordinate, 0), edgeCode);
    assert.equal(sampleCode(data, info, coordinate, info.height - 1), edgeCode);
    assert.equal(sampleCode(data, info, 0, coordinate), edgeCode);
    assert.equal(sampleCode(data, info, info.width - 1, coordinate), edgeCode);
  }

  for (let y = centerStart; y <= centerEnd; y += 16) {
    for (let x = centerStart; x <= centerEnd; x += 16) {
      assert.equal(sampleCode(data, info, x, y), edgeCode);
    }
  }

  for (let cellZ = 0; cellZ < 3; cellZ += 1) {
    for (let cellX = 0; cellX < 3; cellX += 1) {
      if (cellX === 1 && cellZ === 1) continue;

      const values = [];
      const minX = Math.floor(cellX * info.width / 3);
      const maxX = Math.floor((cellX + 1) * info.width / 3);
      const minY = Math.floor(cellZ * info.height / 3);
      const maxY = Math.floor((cellZ + 1) * info.height / 3);

      for (let y = minY; y < maxY; y += 8) {
        for (let x = minX; x < maxX; x += 8) {
          values.push(sampleCode(data, info, x, y));
        }
      }

      const mean = values.reduce((total, value) => total + value, 0) / values.length;
      const variance = values.reduce(
        (total, value) => total + (value - mean) ** 2,
        0,
      ) / values.length;

      assert.ok(
        Math.sqrt(variance) > 20,
        `outer cell ${cellX},${cellZ} lost its reference relief`,
      );
    }
  }
});

function sampleCode(data, info, x, y) {
  return data[(y * info.width + x) * info.channels];
}
