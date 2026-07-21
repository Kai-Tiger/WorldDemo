import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const WIDTH = 4000;
const HEIGHT = 800;
const WORLD_SIZE_METERS = 6144;
const MIN_HEIGHT_METERS = 12;
const MAX_HEIGHT_METERS = 420;
const BAND_DEPTH_METERS = WORLD_SIZE_METERS * (HEIGHT - 1) / (WIDTH - 1);
const OUTER_FADE_PIXELS = 96;
const INNER_FADE_PIXELS = 144;
const SOURCE_BLUR_SIGMA = 22;
const UINT16_MAX = 65535;
const root = resolve(import.meta.dirname, '..');
const sourceDir = resolve(root, 'public/assets/terrain/generated-heightmaps');
const outputDir = resolve(root, 'public/assets/terrain/edge-heightfields');

const heightfields = [
  {
    side: 'north',
    source: 'alpine-glacial-range-5x1.png',
    orientation: 'west-to-east',
    seed: 0x4e4f5254,
    angle: 0.18,
    elongation: 1.35,
    ridgeStrength: 0.27,
    valleyStrength: 0.17,
  },
  {
    side: 'east',
    source: 'folded-sawtooth-range-5x1.png',
    orientation: 'north-to-south',
    seed: 0x45415354,
    angle: -0.42,
    elongation: 2.25,
    ridgeStrength: 0.32,
    valleyStrength: 0.14,
  },
  {
    side: 'south',
    source: 'river-cut-highland-5x1.png',
    orientation: 'east-to-west',
    seed: 0x534f5554,
    angle: 0.55,
    elongation: 1.7,
    ridgeStrength: 0.22,
    valleyStrength: 0.28,
  },
  {
    side: 'west',
    source: 'faulted-mixed-range-5x1.png',
    orientation: 'south-to-north',
    seed: 0x57455354,
    angle: -0.12,
    elongation: 1.55,
    ridgeStrength: 0.29,
    valleyStrength: 0.2,
  },
];

await mkdir(outputDir, { recursive: true });

const entries = [];
for (const spec of heightfields) {
  const sourcePath = resolve(sourceDir, spec.source);
  const sourceBytes = await readFile(sourcePath);
  const macroGuide = await loadMacroGuide(sourcePath);
  const codes = synthesizeHeightfield(macroGuide, spec);
  const packed = packRg16(codes);
  const runtimeName = `${spec.side}.height-rg16.png`;
  const previewName = `${spec.side}.preview.png`;
  const runtimePath = resolve(outputDir, runtimeName);
  const previewPath = resolve(outputDir, previewName);

  const runtimePng = await sharp(packed, {
    raw: { width: WIDTH, height: HEIGHT, channels: 4 },
  }).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
  const previewPng = await sharp(codes, {
    raw: { width: WIDTH, height: HEIGHT, channels: 1 },
  }).toColourspace('grey16').png({
    compressionLevel: 9,
    adaptiveFiltering: true,
  }).toBuffer();

  await Promise.all([
    writeFile(runtimePath, runtimePng),
    writeFile(previewPath, previewPng),
  ]);

  const statistics = summarize(codes);
  const entry = {
    side: spec.side,
    runtimePath: `/assets/terrain/edge-heightfields/${runtimeName}`,
    previewPath: `/assets/terrain/edge-heightfields/${previewName}`,
    width: WIDTH,
    height: HEIGHT,
    encoding: 'rg16be-normalized',
    minHeightMeters: MIN_HEIGHT_METERS,
    maxHeightMeters: MAX_HEIGHT_METERS,
    bandDepthMeters: BAND_DEPTH_METERS,
    orientation: spec.orientation,
    source: `generated-heightmaps/${spec.source}`,
    sourceSha256: sha256(sourceBytes),
    sha256: sha256(runtimePng),
    previewSha256: sha256(previewPng),
    statistics,
  };

  entries.push(entry);
  console.info(JSON.stringify(entry));
}

const manifest = {
  version: 1,
  algorithm: 'lowpass-macro-ridged-valley-v1',
  sourceLowPassSigmaPixels: SOURCE_BLUR_SIGMA,
  encoding: 'rg16be-normalized',
  decodeMeters: '12 + uint16 / 65535 * 408',
  width: WIDTH,
  height: HEIGHT,
  minHeightMeters: MIN_HEIGHT_METERS,
  maxHeightMeters: MAX_HEIGHT_METERS,
  bandDepthMeters: BAND_DEPTH_METERS,
  verticalAxis: 'v=0 outer edge, v=1 inner edge',
  margins: {
    outerPixels: OUTER_FADE_PIXELS,
    outerNormalized: OUTER_FADE_PIXELS / (HEIGHT - 1),
    outerMeters: OUTER_FADE_PIXELS / (HEIGHT - 1) * BAND_DEPTH_METERS,
    innerPixels: INNER_FADE_PIXELS,
    innerNormalized: INNER_FADE_PIXELS / (HEIGHT - 1),
    innerMeters: INNER_FADE_PIXELS / (HEIGHT - 1) * BAND_DEPTH_METERS,
    baselineHeightMeters: MIN_HEIGHT_METERS,
  },
  heightfields: entries,
};

await writeFile(
  resolve(outputDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

async function loadMacroGuide(sourcePath) {
  const { data } = await sharp(sourcePath)
    .greyscale()
    .blur(SOURCE_BLUR_SIGMA)
    .resize(WIDTH, HEIGHT, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [low, high] = bytePercentileRange(data, 0.01, 0.99);
  const normalized = new Float32Array(data.length);
  const scale = 1 / Math.max(high - low, 1);

  for (let index = 0; index < data.length; index += 1) {
    normalized[index] = Math.pow(clamp((data[index] - low) * scale), 1.05);
  }

  return normalized;
}

function synthesizeHeightfield(macroGuide, spec) {
  const raw = new Float32Array(WIDTH * HEIGHT);
  const cosine = Math.cos(spec.angle);
  const sine = Math.sin(spec.angle);
  let rawMinimum = Infinity;
  let rawMaximum = -Infinity;

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const index = y * WIDTH + x;
      const macro = macroGuide[index];
      const warpX = (valueNoise(x / 620, y / 620, spec.seed + 1) - 0.5) * 180;
      const warpY = (valueNoise(x / 510, y / 510, spec.seed + 2) - 0.5) * 130;
      const sampleX = x + warpX;
      const sampleY = y + warpY;
      const ridge = ridgedFractal(
        sampleX,
        sampleY,
        spec.seed + 10,
        cosine,
        sine,
        spec.elongation,
      );
      const valleys = valleyFractal(
        sampleX,
        sampleY,
        spec.seed + 30,
        cosine,
        sine,
        spec.elongation,
      );
      const detail = detailFractal(sampleX, sampleY, spec.seed + 50);
      const highlandMask = 0.24 + macro * 0.76;
      const value = macro * 0.72
        + ridge * spec.ridgeStrength * highlandMask
        - valleys * spec.valleyStrength * highlandMask
        + detail * 0.055;

      raw[index] = value;
      rawMinimum = Math.min(rawMinimum, value);
      rawMaximum = Math.max(rawMaximum, value);
    }
  }

  const codes = new Uint16Array(raw.length);
  const inverseRange = 1 / Math.max(rawMaximum - rawMinimum, Number.EPSILON);
  const outerFade = OUTER_FADE_PIXELS / (HEIGHT - 1);
  const innerFade = INNER_FADE_PIXELS / (HEIGHT - 1);

  for (let y = 0; y < HEIGHT; y += 1) {
    const v = y / (HEIGHT - 1);
    const envelope = smootherstep(clamp(v / outerFade))
      * smootherstep(clamp((1 - v) / innerFade));

    for (let x = 0; x < WIDTH; x += 1) {
      const index = y * WIDTH + x;
      const normalized = Math.pow(
        clamp((raw[index] - rawMinimum) * inverseRange),
        1.12,
      );
      codes[index] = Math.round(normalized * envelope * UINT16_MAX);
    }
  }

  return codes;
}

function ridgedFractal(x, y, seed, cosine, sine, elongation) {
  const scales = [440, 210, 96, 44, 20];
  const weights = [0.38, 0.27, 0.18, 0.11, 0.06];
  let sum = 0;

  for (let octave = 0; octave < scales.length; octave += 1) {
    const rotatedX = (x * cosine - y * sine) / scales[octave];
    const rotatedY = (x * sine + y * cosine) / (scales[octave] * elongation);
    const noise = valueNoise(rotatedX, rotatedY, seed + octave);
    const ridge = 1 - Math.abs(noise * 2 - 1);
    sum += ridge * ridge * weights[octave];
  }

  return sum;
}

function valleyFractal(x, y, seed, cosine, sine, elongation) {
  const scales = [720, 330, 150, 68];
  const weights = [0.44, 0.3, 0.18, 0.08];
  let sum = 0;

  for (let octave = 0; octave < scales.length; octave += 1) {
    const rotatedX = (x * cosine + y * sine) / scales[octave];
    const rotatedY = (-x * sine + y * cosine)
      / (scales[octave] * Math.max(1, elongation * 0.8));
    const distanceToChannel = Math.abs(valueNoise(
      rotatedX,
      rotatedY,
      seed + octave,
    ) - 0.5) * 5;
    const valley = 1 - smootherstep(clamp(distanceToChannel));
    sum += valley * valley * weights[octave];
  }

  return sum;
}

function detailFractal(x, y, seed) {
  const scales = [180, 86, 40, 19, 9];
  const weights = [0.52, 0.25, 0.13, 0.07, 0.03];
  let sum = 0;

  for (let octave = 0; octave < scales.length; octave += 1) {
    sum += (valueNoise(x / scales[octave], y / scales[octave], seed + octave) - 0.5)
      * 2
      * weights[octave];
  }

  return sum;
}

function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = quintic(x - x0);
  const ty = quintic(y - y0);
  const top = lerp(hash2d(x0, y0, seed), hash2d(x0 + 1, y0, seed), tx);
  const bottom = lerp(hash2d(x0, y0 + 1, seed), hash2d(x0 + 1, y0 + 1, seed), tx);

  return lerp(top, bottom, ty);
}

function hash2d(x, y, seed) {
  let hash = Math.imul(x, 0x1f123bb5) ^ Math.imul(y, 0x5f356495) ^ seed;
  hash = Math.imul(hash ^ hash >>> 15, 0x2c1b3c6d);
  hash = Math.imul(hash ^ hash >>> 12, 0x297a2d39);
  return ((hash ^ hash >>> 15) >>> 0) / 0xffffffff;
}

function packRg16(codes) {
  const packed = Buffer.allocUnsafe(codes.length * 4);

  for (let index = 0; index < codes.length; index += 1) {
    const offset = index * 4;
    packed[offset] = codes[index] >>> 8;
    packed[offset + 1] = codes[index] & 0xff;
    packed[offset + 2] = 0;
    packed[offset + 3] = 255;
  }

  return packed;
}

function summarize(codes) {
  const histogram = new Uint32Array(UINT16_MAX + 1);
  for (const code of codes) histogram[code] += 1;

  const percentiles = {};
  for (const percentile of [0, 1, 5, 10, 25, 50, 75, 90, 95, 99, 100]) {
    const code = histogramPercentile(histogram, codes.length, percentile / 100);
    percentiles[`p${String(percentile).padStart(2, '0')}`] = {
      uint16: code,
      normalized: code / UINT16_MAX,
      meters: decodeMeters(code),
    };
  }

  return {
    minimum: percentiles.p00,
    maximum: percentiles.p100,
    percentiles,
    outerEdge: summarizeRow(codes, 0),
    innerEdge: summarizeRow(codes, HEIGHT - 1),
  };
}

function summarizeRow(codes, row) {
  let minimum = UINT16_MAX;
  let maximum = 0;
  let sum = 0;
  const offset = row * WIDTH;

  for (let x = 0; x < WIDTH; x += 1) {
    const code = codes[offset + x];
    minimum = Math.min(minimum, code);
    maximum = Math.max(maximum, code);
    sum += code;
  }

  return {
    minimumUint16: minimum,
    maximumUint16: maximum,
    meanUint16: sum / WIDTH,
    maximumMeters: decodeMeters(maximum),
  };
}

function bytePercentileRange(data, lowPercentile, highPercentile) {
  const histogram = new Uint32Array(256);
  for (const value of data) histogram[value] += 1;
  return [
    histogramPercentile(histogram, data.length, lowPercentile),
    histogramPercentile(histogram, data.length, highPercentile),
  ];
}

function histogramPercentile(histogram, total, percentile) {
  const target = Math.floor((total - 1) * percentile);
  let count = 0;

  for (let value = 0; value < histogram.length; value += 1) {
    count += histogram[value];
    if (count > target) return value;
  }

  return histogram.length - 1;
}

function decodeMeters(code) {
  return MIN_HEIGHT_METERS
    + code / UINT16_MAX * (MAX_HEIGHT_METERS - MIN_HEIGHT_METERS);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function quintic(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function smootherstep(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function clamp(value) {
  return Math.min(Math.max(value, 0), 1);
}
