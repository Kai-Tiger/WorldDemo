import { MAP_SIZE } from './vegetationConfig.js';

export const EDGE_HEIGHTFIELD_MIN_HEIGHT = 12;
export const EDGE_HEIGHTFIELD_MAX_HEIGHT = 420;
export const EDGE_HEIGHTFIELD_INNER_BLEND_WIDTH = 256;

const HALF_MAP_SIZE = MAP_SIZE / 2;
const CORNER_BLEND_DISTANCE = 384;
const SIDES = Object.freeze(['north', 'east', 'south', 'west']);

export const EDGE_HEIGHTFIELD_PATHS = Object.freeze({
  north: '/assets/terrain/edge-heightfields/north.height-rg16.png',
  east: '/assets/terrain/edge-heightfields/east.height-rg16.png',
  south: '/assets/terrain/edge-heightfields/south.height-rg16.png',
  west: '/assets/terrain/edge-heightfields/west.height-rg16.png',
});

let activeEdgeHeightFields = null;

export async function loadEdgeHeightFields(loadImage = loadPackedHeightImage) {
  const entries = await Promise.all(SIDES.map(async (side) => {
    const path = EDGE_HEIGHTFIELD_PATHS[side];

    try {
      const image = await loadImage(path, side);
      const values = image.values ?? decodeRg16HeightData(
        image.data,
        image.width,
        image.height,
      );

      return [side, {
        side,
        width: image.width,
        height: image.height,
        values,
      }];
    } catch (error) {
      throw new Error(`Failed to load ${side} edge heightfield at ${path}: ${error.message}`);
    }
  }));

  return createEdgeHeightFieldSet(Object.fromEntries(entries));
}

export function createEdgeHeightFieldSet(fields) {
  const normalized = {};
  let width = null;
  let height = null;

  for (const side of SIDES) {
    const field = fields?.[side];

    if (!field) throw new Error(`Missing ${side} edge heightfield`);
    if (!Number.isInteger(field.width) || field.width < 2) {
      throw new Error(`${side} edge heightfield width must be at least 2`);
    }
    if (!Number.isInteger(field.height) || field.height < 2) {
      throw new Error(`${side} edge heightfield height must be at least 2`);
    }
    if (!(field.values instanceof Uint16Array)) {
      throw new Error(`${side} edge heightfield must use Uint16Array values`);
    }
    if (field.values.length !== field.width * field.height) {
      throw new Error(`${side} edge heightfield data length does not match its dimensions`);
    }

    width ??= field.width;
    height ??= field.height;

    if (field.width !== width || field.height !== height) {
      throw new Error('All edge heightfields must have identical dimensions');
    }

    normalized[side] = Object.freeze({
      side,
      width: field.width,
      height: field.height,
      values: field.values,
    });
  }

  const bandDepth = MAP_SIZE * (height - 1) / (width - 1);

  return Object.freeze({
    fields: Object.freeze(normalized),
    width,
    height,
    bandDepth,
  });
}

export function setActiveEdgeHeightFields(fields) {
  activeEdgeHeightFields = fields;
}

export function getActiveEdgeHeightFields() {
  return activeEdgeHeightFields;
}

export function decodeRg16HeightData(data, width, height) {
  if (!data || data.length !== width * height * 4) {
    throw new Error('Packed edge heightfield must contain four bytes per pixel');
  }

  const values = new Uint16Array(width * height);

  for (let index = 0; index < values.length; index += 1) {
    const sourceIndex = index * 4;

    values[index] = (data[sourceIndex] << 8) | data[sourceIndex + 1];
  }

  return values;
}

export function sampleEdgeHeightField(field, u, v) {
  const imageX = clamp(u, 0, 1) * (field.width - 1);
  const imageY = clamp(v, 0, 1) * (field.height - 1);
  const x0 = Math.floor(imageX);
  const y0 = Math.floor(imageY);
  const x1 = Math.min(x0 + 1, field.width - 1);
  const y1 = Math.min(y0 + 1, field.height - 1);
  const tx = imageX - x0;
  const ty = imageY - y0;
  const top = lerp(
    field.values[y0 * field.width + x0],
    field.values[y0 * field.width + x1],
    tx,
  );
  const bottom = lerp(
    field.values[y1 * field.width + x0],
    field.values[y1 * field.width + x1],
    tx,
  );
  const normalizedHeight = lerp(top, bottom, ty) / 0xffff;

  return lerp(
    EDGE_HEIGHTFIELD_MIN_HEIGHT,
    EDGE_HEIGHTFIELD_MAX_HEIGHT,
    normalizedHeight,
  );
}

export function getEdgeHeightFieldCoordinates(side, x, z, bandDepth) {
  switch (side) {
    case 'north':
      return {
        u: (x + HALF_MAP_SIZE) / MAP_SIZE,
        v: (HALF_MAP_SIZE - z) / bandDepth,
      };
    case 'east':
      return {
        u: (HALF_MAP_SIZE - z) / MAP_SIZE,
        v: (HALF_MAP_SIZE - x) / bandDepth,
      };
    case 'south':
      return {
        u: (HALF_MAP_SIZE - x) / MAP_SIZE,
        v: (z + HALF_MAP_SIZE) / bandDepth,
      };
    case 'west':
      return {
        u: (z + HALF_MAP_SIZE) / MAP_SIZE,
        v: (x + HALF_MAP_SIZE) / bandDepth,
      };
    default:
      throw new Error(`Unknown edge heightfield side: ${side}`);
  }
}

export function sampleEdgeHeightFields(fields, x, z) {
  if (!fields) return null;

  const sampleX = clamp(x, -HALF_MAP_SIZE, HALF_MAP_SIZE);
  const sampleZ = clamp(z, -HALF_MAP_SIZE, HALF_MAP_SIZE);
  const candidates = [];

  for (const side of SIDES) {
    const coordinates = getEdgeHeightFieldCoordinates(
      side,
      sampleX,
      sampleZ,
      fields.bandDepth,
    );

    if (
      coordinates.u < 0
      || coordinates.u > 1
      || coordinates.v < 0
      || coordinates.v > 1
    ) {
      continue;
    }

    const distance = coordinates.v * fields.bandDepth;
    const influence = 1 - smoothstep(
      fields.bandDepth - EDGE_HEIGHTFIELD_INNER_BLEND_WIDTH,
      fields.bandDepth,
      distance,
    );

    if (influence <= 0) continue;

    candidates.push({
      height: sampleEdgeHeightField(fields.fields[side], coordinates.u, coordinates.v),
      influence,
      weight: influence * Math.exp(-distance / CORNER_BLEND_DISTANCE),
    });
  }

  if (candidates.length === 0) return null;

  const totalWeight = candidates.reduce((total, candidate) => total + candidate.weight, 0);
  const height = candidates.reduce(
    (total, candidate) => total + candidate.height * candidate.weight,
    0,
  ) / totalWeight;
  const influence = Math.max(...candidates.map((candidate) => candidate.influence));

  return {
    height,
    influence,
    protection: influence * smoothstep(45, 90, height),
  };
}

export function getEdgeMountainProtection(x, z, fields = activeEdgeHeightFields) {
  return sampleEdgeHeightFields(fields, x, z)?.protection ?? 0;
}

async function loadPackedHeightImage(path) {
  const image = new Image();
  image.src = path;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  return {
    data: imageData.data,
    width: canvas.width,
    height: canvas.height,
  };
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
