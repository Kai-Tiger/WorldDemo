import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import {
  LOWLAND_HEIGHT_SETTINGS,
  encodeTerrainHeight,
  encodeWaterTerrainHeight,
  getBakedLowlandHeightDetails,
  getLowlandPlanStatistics,
  heightmapPixelToWorld,
} from '../src/lowlandHeightPlan.js';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_SOURCE_PATH = resolve(
  scriptDirectory,
  'fixtures/height.before-black-lowlands.webp',
);
export const DEFAULT_OUTPUT_PATH = resolve(
  scriptDirectory,
  '../public/assets/terrain/height.webp',
);

sharp.cache(false);

export function createBlackMaskDistanceField(
  source,
  width,
  height,
  channels,
  options = {},
) {
  validateRawImage(source, width, height, channels);

  const worldSize = options.worldSize ?? LOWLAND_HEIGHT_SETTINGS.worldSize;
  const featherMeters = options.edgeFeatherMeters
    ?? LOWLAND_HEIGHT_SETTINGS.edgeFeatherMeters;
  const pixelWorldSize = worldSize / Math.max(width - 1, height - 1);
  const maximumCode = Math.min(
    252,
    Math.max(4, Math.ceil(featherMeters / pixelWorldSize * 4)),
  );
  const distances = new Uint8Array(width * height);
  let blackPixels = 0;

  for (let pixel = 0, offset = 0; pixel < distances.length; pixel += 1, offset += channels) {
    const isBlack = source[offset] === 0
      && source[offset + 1] === 0
      && source[offset + 2] === 0;

    if (isBlack) {
      distances[pixel] = maximumCode;
      blackPixels += 1;
    }
  }

  for (let y = 0; y < height; y += 1) {
    const row = y * width;

    for (let x = 0; x < width; x += 1) {
      const index = row + x;

      if (distances[index] === 0) continue;

      let distance = distances[index];
      if (x > 0) distance = Math.min(distance, distances[index - 1] + 4);
      if (y > 0) distance = Math.min(distance, distances[index - width] + 4);
      if (x > 0 && y > 0) distance = Math.min(distance, distances[index - width - 1] + 6);
      if (x + 1 < width && y > 0) distance = Math.min(distance, distances[index - width + 1] + 6);
      distances[index] = Math.min(distance, maximumCode);
    }
  }

  for (let y = height - 1; y >= 0; y -= 1) {
    const row = y * width;

    for (let x = width - 1; x >= 0; x -= 1) {
      const index = row + x;

      if (distances[index] === 0) continue;

      let distance = distances[index];
      if (x + 1 < width) distance = Math.min(distance, distances[index + 1] + 4);
      if (y + 1 < height) distance = Math.min(distance, distances[index + width] + 4);
      if (x + 1 < width && y + 1 < height) distance = Math.min(distance, distances[index + width + 1] + 6);
      if (x > 0 && y + 1 < height) distance = Math.min(distance, distances[index + width - 1] + 6);
      distances[index] = Math.min(distance, maximumCode);
    }
  }

  return {
    distances,
    blackPixels,
    maximumCode,
    pixelWorldSize,
  };
}

export function bakeBlackLowlandsRaw(source, width, height, channels, options = {}) {
  validateRawImage(source, width, height, channels);

  const settings = {
    worldSize: options.worldSize ?? LOWLAND_HEIGHT_SETTINGS.worldSize,
    maxHeight: options.maxHeight ?? LOWLAND_HEIGHT_SETTINGS.maxHeight,
    edgeFeatherMeters: options.edgeFeatherMeters
      ?? LOWLAND_HEIGHT_SETTINGS.edgeFeatherMeters,
  };
  const output = Buffer.from(source);
  const distanceField = createBlackMaskDistanceField(
    source,
    width,
    height,
    channels,
    settings,
  );
  const {
    distances,
    blackPixels,
    maximumCode,
    pixelWorldSize,
  } = distanceField;
  let modifiedBlackPixels = 0;
  let coreBlackPixels = 0;
  let modifiedCoreBlackPixels = 0;
  let waterPixels = 0;
  let maximumBakedValue = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const distanceCode = distances[pixel];

      if (distanceCode === 0) continue;

      const offset = pixel * channels;
      const edgeDistanceMeters = Math.min(distanceCode, maximumCode) / 4 * pixelWorldSize;
      const world = heightmapPixelToWorld(x, y, width, height, settings.worldSize);
      const details = getBakedLowlandHeightDetails(world.x, world.z, edgeDistanceMeters);
      const value = details.waterTarget
        ? encodeWaterTerrainHeight(details.height, settings.maxHeight)
        : encodeTerrainHeight(details.height, settings.maxHeight);

      output[offset] = value;
      output[offset + 1] = value;
      output[offset + 2] = value;
      maximumBakedValue = Math.max(maximumBakedValue, value);
      if (details.waterTarget) waterPixels += 1;

      if (value !== 0) modifiedBlackPixels += 1;
      if (distanceCode === maximumCode) {
        coreBlackPixels += 1;
        if (value !== 0) modifiedCoreBlackPixels += 1;
      }
    }
  }

  return {
    data: output,
    stats: {
      width,
      height,
      totalPixels: width * height,
      blackPixels,
      nonBlackPixels: width * height - blackPixels,
      modifiedBlackPixels,
      unchangedBlackPixels: blackPixels - modifiedBlackPixels,
      coreBlackPixels,
      modifiedCoreBlackPixels,
      waterPixels,
      maximumBakedValue,
      maximumBakedHeight: maximumBakedValue / 255 * settings.maxHeight,
      edgeFeatherMeters: settings.edgeFeatherMeters,
      pixelWorldSize,
    },
  };
}

export function compareRawImages(expected, actual, source, width, height, channels) {
  validateRawImage(expected, width, height, channels);
  validateRawImage(actual, width, height, channels);
  validateRawImage(source, width, height, channels);

  let mismatchedPixels = 0;
  let changedNonBlackPixels = 0;
  let changedBlackPixels = 0;

  for (let pixel = 0, offset = 0; pixel < width * height; pixel += 1, offset += channels) {
    const sourceIsBlack = source[offset] === 0
      && source[offset + 1] === 0
      && source[offset + 2] === 0;
    let mismatch = false;
    let changedFromSource = false;

    for (let channel = 0; channel < channels; channel += 1) {
      mismatch ||= expected[offset + channel] !== actual[offset + channel];
      changedFromSource ||= source[offset + channel] !== actual[offset + channel];
    }

    if (mismatch) mismatchedPixels += 1;
    if (changedFromSource && sourceIsBlack) changedBlackPixels += 1;
    if (changedFromSource && !sourceIsBlack) changedNonBlackPixels += 1;
  }

  return { mismatchedPixels, changedNonBlackPixels, changedBlackPixels };
}

export async function loadRawHeightmap(path) {
  const file = await readFile(path);
  const { data, info } = await sharp(file)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.depth !== 'uchar' || info.channels !== 3) {
    throw new Error(`Expected an 8-bit RGB heightmap at ${path}.`);
  }

  return {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
    sourceBytes: file.length,
    sourceSha256: createHash('sha256').update(file).digest('hex'),
  };
}

export async function bakeLowlandHeightmap(options = {}) {
  const sourcePath = resolve(options.sourcePath ?? DEFAULT_SOURCE_PATH);
  const outputPath = resolve(options.outputPath ?? DEFAULT_OUTPUT_PATH);
  const source = await loadRawHeightmap(sourcePath);
  const baked = bakeBlackLowlandsRaw(
    source.data,
    source.width,
    source.height,
    source.channels,
    options,
  );
  const output = await sharp(baked.data, {
    raw: {
      width: source.width,
      height: source.height,
      channels: source.channels,
    },
  })
    .webp({ lossless: true, effort: 6 })
    .toFile(outputPath);

  return {
    mode: 'write',
    sourcePath,
    outputPath,
    sourceSha256: source.sourceSha256,
    outputBytes: output.size,
    ...baked.stats,
    plan: getLowlandPlanStatistics(),
  };
}

export async function checkLowlandHeightmap(options = {}) {
  const sourcePath = resolve(options.sourcePath ?? DEFAULT_SOURCE_PATH);
  const outputPath = resolve(options.outputPath ?? DEFAULT_OUTPUT_PATH);
  const [source, actual] = await Promise.all([
    loadRawHeightmap(sourcePath),
    loadRawHeightmap(outputPath),
  ]);

  if (
    source.width !== actual.width
    || source.height !== actual.height
    || source.channels !== actual.channels
  ) {
    throw new Error(
      `Heightmap dimensions differ: source=${source.width}x${source.height}x${source.channels}, `
      + `output=${actual.width}x${actual.height}x${actual.channels}.`,
    );
  }

  const expected = bakeBlackLowlandsRaw(
    source.data,
    source.width,
    source.height,
    source.channels,
    options,
  );
  const comparison = compareRawImages(
    expected.data,
    actual.data,
    source.data,
    source.width,
    source.height,
    source.channels,
  );
  const coreCoverage = expected.stats.coreBlackPixels > 0
    ? expected.stats.modifiedCoreBlackPixels / expected.stats.coreBlackPixels
    : 1;

  if (comparison.mismatchedPixels !== 0) {
    throw new Error(`Baked heightmap differs from the deterministic result at ${comparison.mismatchedPixels} pixels.`);
  }
  if (comparison.changedNonBlackPixels !== 0) {
    throw new Error(`Baked heightmap changed ${comparison.changedNonBlackPixels} non-black source pixels.`);
  }
  if (coreCoverage < 0.99) {
    throw new Error(`Only ${(coreCoverage * 100).toFixed(2)}% of black lowland core pixels changed.`);
  }
  if (expected.stats.maximumBakedHeight > LOWLAND_HEIGHT_SETTINGS.maximumBakedHeight + 1e-8) {
    throw new Error(`Baked lowland height exceeds ${LOWLAND_HEIGHT_SETTINGS.maximumBakedHeight}m.`);
  }
  if (getLowlandPlanStatistics().minimumAuthoredBedHeight < 0) {
    throw new Error('At least one authored water bed is below 0m.');
  }

  return {
    mode: 'check',
    sourcePath,
    outputPath,
    sourceSha256: source.sourceSha256,
    outputSha256: actual.sourceSha256,
    coreCoverage,
    ...expected.stats,
    ...comparison,
    plan: getLowlandPlanStatistics(),
  };
}

function validateRawImage(data, width, height, channels) {
  if (!Number.isInteger(width) || width < 2 || !Number.isInteger(height) || height < 2) {
    throw new Error('Raw heightmap width and height must be integers greater than one.');
  }
  if (!Number.isInteger(channels) || channels < 3) {
    throw new Error('Raw heightmap must contain at least RGB channels.');
  }
  if (!data || data.length !== width * height * channels) {
    throw new Error('Raw heightmap buffer size does not match its dimensions.');
  }
}

async function main() {
  const mode = process.argv.includes('--check') ? 'check' : 'write';
  const result = mode === 'check'
    ? await checkLowlandHeightmap()
    : await bakeLowlandHeightmap();

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const entryPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;

if (entryPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
