import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const forestSource = resolve(root, 'public/assets/terrain/forest-floor');
const terrainSource = resolve(root, 'public/assets/terrain');
const outputDir = resolve(forestSource, 'optimized');
const toktx = process.env.TOKTX || 'toktx';
const validationDir = process.env.TERRAIN_PBR_VALIDATION_DIR
  ? resolve(process.env.TERRAIN_PBR_VALIDATION_DIR)
  : null;
const temporaryDir = await mkdtemp(join(tmpdir(), 'terrain-pbr-'));

try {
  await mkdir(outputDir, { recursive: true });
  if (validationDir) await mkdir(validationDir, { recursive: true });

  for (const [tier, size] of [['1k', 1024], ['2k', 2048]]) {
    const ao = await loadGray(
      resolve(forestSource, 'Forest_Floor_sfjmafua_4K_AO.jpg'),
      size,
    );
    const roughness = await loadGray(
      resolve(forestSource, 'Forest_Floor_sfjmafua_4K_Roughness.jpg'),
      size,
    );
    const screeHeight = await loadGray(
      resolve(terrainSource, 'scree-alpine.webp'),
      size,
      0.7,
    );
    const normal = createTileableNormal(screeHeight, size, 4.2);
    const packed = packTechnicalMap(ao, roughness, normal, size);
    const packedPng = resolve(temporaryDir, `forest_floor_orm_${tier}.png`);
    const normalPng = resolve(temporaryDir, `scree_alpine_normal_${tier}.png`);

    await Promise.all([
      sharp(packed, { raw: { width: size, height: size, channels: 4 } })
        .png()
        .toFile(packedPng),
      sharp(normal.rgba, { raw: { width: size, height: size, channels: 4 } })
        .png()
        .toFile(normalPng),
    ]);

    await Promise.all([
      encodeKtx2(
        packedPng,
        resolve(outputDir, `forest_floor_orm_${tier}.ktx2`),
      ),
      encodeKtx2(
        normalPng,
        resolve(outputDir, `scree_alpine_normal_${tier}.ktx2`),
      ),
    ]);

    if (validationDir) {
      await Promise.all([
        writeTiledPreview(
          packed,
          size,
          resolve(validationDir, `forest_floor_orm_${tier}_4x4.png`),
        ),
        writeTiledPreview(
          normal.rgba,
          size,
          resolve(validationDir, `scree_alpine_normal_${tier}_4x4.png`),
        ),
      ]);
    }

    console.info(JSON.stringify({
      tier,
      normalLengthError: normal.maxLengthError,
      normalEdgeError: normal.edgeError,
    }));
  }
} finally {
  await rm(temporaryDir, { recursive: true, force: true });
}

async function loadGray(path, size, blur = 0) {
  let pipeline = sharp(path).resize(size, size, { kernel: sharp.kernel.lanczos3 }).greyscale();
  if (blur > 0) pipeline = pipeline.blur(blur);
  return pipeline.raw().toBuffer();
}

function createTileableNormal(height, size, strength) {
  const vectors = new Float32Array(size * size * 3);

  for (let y = 0; y < size; y += 1) {
    const previousY = (y + size - 1) % size;
    const nextY = (y + 1) % size;

    for (let x = 0; x < size; x += 1) {
      const previousX = (x + size - 1) % size;
      const nextX = (x + 1) % size;
      const dx = (height[y * size + nextX] - height[y * size + previousX]) / 255;
      const dy = (height[nextY * size + x] - height[previousY * size + x]) / 255;
      writeNormalized(vectors, y * size + x, -dx * strength, -dy * strength, 1);
    }
  }

  const seamWidth = Math.max(4, Math.round(size / 64));
  for (let offset = 0; offset < seamWidth; offset += 1) {
    const opposite = size - 1 - offset;
    for (let y = 0; y < size; y += 1) {
      averageNormals(vectors, y * size + offset, y * size + opposite);
    }
    for (let x = 0; x < size; x += 1) {
      averageNormals(vectors, offset * size + x, opposite * size + x);
    }
  }

  const rgba = Buffer.allocUnsafe(size * size * 4);
  let maxLengthError = 0;

  for (let index = 0; index < size * size; index += 1) {
    const vectorOffset = index * 3;
    const outputOffset = index * 4;
    const x = vectors[vectorOffset];
    const y = vectors[vectorOffset + 1];
    const z = vectors[vectorOffset + 2];
    const length = Math.hypot(x, y, z);

    maxLengthError = Math.max(maxLengthError, Math.abs(1 - length));
    rgba[outputOffset] = encodeNormal(x);
    rgba[outputOffset + 1] = encodeNormal(y);
    rgba[outputOffset + 2] = encodeNormal(z);
    rgba[outputOffset + 3] = 255;
  }

  return {
    vectors,
    rgba,
    maxLengthError,
    edgeError: getNormalEdgeError(vectors, size),
  };
}

function writeNormalized(vectors, index, x, y, z) {
  const length = Math.hypot(x, y, z) || 1;
  const offset = index * 3;

  vectors[offset] = x / length;
  vectors[offset + 1] = y / length;
  vectors[offset + 2] = z / length;
}

function averageNormals(vectors, firstIndex, secondIndex) {
  const first = firstIndex * 3;
  const second = secondIndex * 3;
  const x = vectors[first] + vectors[second];
  const y = vectors[first + 1] + vectors[second + 1];
  const z = vectors[first + 2] + vectors[second + 2];
  const length = Math.hypot(x, y, z) || 1;

  for (const offset of [first, second]) {
    vectors[offset] = x / length;
    vectors[offset + 1] = y / length;
    vectors[offset + 2] = z / length;
  }
}

function getNormalEdgeError(vectors, size) {
  let error = 0;
  let samples = 0;

  for (let index = 0; index < size; index += 1) {
    error += normalDistance(vectors, index * size, index * size + size - 1);
    error += normalDistance(vectors, index, (size - 1) * size + index);
    samples += 2;
  }

  return error / samples;
}

function normalDistance(vectors, firstIndex, secondIndex) {
  const first = firstIndex * 3;
  const second = secondIndex * 3;

  return Math.hypot(
    vectors[first] - vectors[second],
    vectors[first + 1] - vectors[second + 1],
    vectors[first + 2] - vectors[second + 2],
  );
}

function packTechnicalMap(ao, roughness, normal, size) {
  const packed = Buffer.allocUnsafe(size * size * 4);

  for (let index = 0; index < size * size; index += 1) {
    const outputOffset = index * 4;
    const normalOffset = index * 4;

    packed[outputOffset] = ao[index];
    packed[outputOffset + 1] = roughness[index];
    packed[outputOffset + 2] = normal.rgba[normalOffset];
    packed[outputOffset + 3] = normal.rgba[normalOffset + 1];
  }

  return packed;
}

function encodeNormal(value) {
  return Math.round(Math.max(0, Math.min(1, value * 0.5 + 0.5)) * 255);
}

async function encodeKtx2(input, output) {
  await execFileAsync(toktx, [
    '--t2',
    '--encode', 'uastc',
    '--uastc_quality', '1',
    '--zcmp', '3',
    '--genmipmap',
    '--lower_left_maps_to_s0t0',
    '--assign_oetf', 'linear',
    output,
    input,
  ]);
}

async function writeTiledPreview(data, size, output) {
  const tile = 4;
  const tiled = Buffer.allocUnsafe(size * tile * size * tile * 4);
  const tiledWidth = size * tile;

  for (let y = 0; y < size * tile; y += 1) {
    for (let x = 0; x < size * tile; x += 1) {
      const source = ((y % size) * size + (x % size)) * 4;
      const target = (y * tiledWidth + x) * 4;

      data.copy(tiled, target, source, source + 4);
    }
  }

  await sharp(tiled, {
    raw: { width: tiledWidth, height: size * tile, channels: 4 },
  }).resize(1024, 1024).png().toFile(output);
}
