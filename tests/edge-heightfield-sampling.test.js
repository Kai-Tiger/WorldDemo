import assert from 'node:assert/strict';
import test from 'node:test';
import { MAP_SIZE } from '../src/vegetationConfig.js';
import { getGoldenShotFromLocation } from '../src/goldenShots.js';
import {
  EDGE_HEIGHTFIELD_MAX_HEIGHT,
  EDGE_HEIGHTFIELD_MIN_HEIGHT,
  createEdgeHeightFieldSet,
  decodeRg16HeightData,
  getEdgeHeightFieldCoordinates,
  sampleEdgeHeightField,
  sampleEdgeHeightFields,
} from '../src/edgeHeightFields.js';

const HALF_MAP_SIZE = MAP_SIZE / 2;

test('RG16 height data keeps both bytes of elevation precision', () => {
  const decoded = decodeRg16HeightData(new Uint8ClampedArray([
    0x00, 0x00, 0, 255,
    0x12, 0x34, 0, 255,
    0xff, 0xff, 0, 255,
  ]), 3, 1);

  assert.deepEqual([...decoded], [0, 0x1234, 0xffff]);
});

test('height fields bilinearly interpolate one scalar elevation surface', () => {
  const field = createField('north', 2, 2, (x, y) => (
    [[0, 0.25], [0.75, 1]][y][x]
  ));
  const height = sampleEdgeHeightField(field, 0.5, 0.5);
  const expected = EDGE_HEIGHTFIELD_MIN_HEIGHT
    + (EDGE_HEIGHTFIELD_MAX_HEIGHT - EDGE_HEIGHTFIELD_MIN_HEIGHT) * 0.5;

  assert.ok(Math.abs(height - expected) < 0.01);
});

test('north, east, south, and west advance clockwise along their long axes', () => {
  const fields = createEdgeHeightFieldSet(Object.fromEntries(
    ['north', 'east', 'south', 'west'].map((side) => [
      side,
      createField(side, 5, 2, (x) => x / 4),
    ]),
  ));
  const bandDepth = fields.bandDepth;
  const samples = [
    ['north', -HALF_MAP_SIZE / 2, HALF_MAP_SIZE - bandDepth * 0.25],
    ['east', HALF_MAP_SIZE - bandDepth * 0.25, HALF_MAP_SIZE / 2],
    ['south', HALF_MAP_SIZE / 2, -HALF_MAP_SIZE + bandDepth * 0.25],
    ['west', -HALF_MAP_SIZE + bandDepth * 0.25, -HALF_MAP_SIZE / 2],
  ];

  for (const [side, x, z] of samples) {
    const coordinates = getEdgeHeightFieldCoordinates(side, x, z, bandDepth);

    assert.ok(Math.abs(coordinates.u - 0.25) < 1e-9, side);
    assert.ok(Math.abs(coordinates.v - 0.25) < 1e-9, side);
  }
});

test('edge bands preserve square world-space texels and fade in at the inner edge', () => {
  const fields = createConstantFieldSet(1, 4000, 800);
  const longitudinalStep = MAP_SIZE / (fields.width - 1);
  const radialStep = fields.bandDepth / (fields.height - 1);
  const inside = sampleEdgeHeightFields(fields, 0, HALF_MAP_SIZE - fields.bandDepth + 300);
  const innerBoundary = sampleEdgeHeightFields(fields, 0, HALF_MAP_SIZE - fields.bandDepth);
  const center = sampleEdgeHeightFields(fields, 0, 0);

  assert.ok(Math.abs(longitudinalStep - radialStep) < 1e-12);
  assert.ok(inside?.influence > 0.99);
  assert.equal(innerBoundary?.influence ?? 0, 0);
  assert.equal(center, null);
});

test('overlapping side bands cross-fade continuously instead of adding heights', () => {
  const fields = createEdgeHeightFieldSet({
    north: createField('north', 5, 2, () => 1),
    east: createField('east', 5, 2, () => 0.25),
    south: createField('south', 5, 2, () => 0.5),
    west: createField('west', 5, 2, () => 0.75),
  });
  const coordinate = HALF_MAP_SIZE - fields.bandDepth * 0.35;
  const first = sampleEdgeHeightFields(fields, coordinate - 0.01, coordinate + 0.01);
  const second = sampleEdgeHeightFields(fields, coordinate + 0.01, coordinate - 0.01);

  assert.ok(first && second);
  assert.ok(Math.abs(first.height - second.height) < 0.1);
  assert.ok(first.height < EDGE_HEIGHTFIELD_MAX_HEIGHT);
  assert.ok(first.height > EDGE_HEIGHTFIELD_MIN_HEIGHT);
});

test('height sampling clamps normal probes to the playable world edge', () => {
  const fields = createConstantFieldSet(0.5, 4000, 800);
  const boundary = sampleEdgeHeightFields(fields, HALF_MAP_SIZE, 0);
  const outsideProbe = sampleEdgeHeightFields(fields, HALF_MAP_SIZE + 1, 0);

  assert.deepEqual(outsideProbe, boundary);
});

test('each imported edge has a deterministic close-range visual check', () => {
  for (const side of ['north', 'east', 'south', 'west']) {
    const shot = getGoldenShotFromLocation({ search: `?shot=edge-${side}` });

    assert.equal(shot?.key, `edge-${side}`);
    assert.ok(Math.max(Math.abs(shot.player.x), Math.abs(shot.player.z)) >= 2000);
  }
});

function createConstantFieldSet(value, width = 5, height = 2) {
  return createEdgeHeightFieldSet(Object.fromEntries(
    ['north', 'east', 'south', 'west'].map((side) => [
      side,
      createField(side, width, height, () => value),
    ]),
  ));
}

function createField(side, width, height, sample) {
  const values = new Uint16Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      values[y * width + x] = Math.round(sample(x, y) * 0xffff);
    }
  }

  return { side, width, height, values };
}
