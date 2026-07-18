import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const sourcePath = process.argv[2];
const outputPath = process.argv[3]
  ?? 'public/assets/terrain/nine-grid-height.png';
const outputSize = 1024;
const worldSize = 6144;
const centerHalfSize = 1024;
const transitionWidth = 640;
const edgeHeight = 0.05;

if (!sourcePath) {
  throw new Error('Usage: node tools/build-nine-grid-heightmap.mjs <source> [output]');
}

const { data, info } = await sharp(sourcePath)
  .greyscale()
  .resize(outputSize, outputSize, { fit: 'fill' })
  .blur(1)
  .raw()
  .toBuffer({ resolveWithObject: true });
const sorted = Uint8Array.from(data).sort();
const low = sorted[Math.floor((sorted.length - 1) * 0.01)];
const high = sorted[Math.ceil((sorted.length - 1) * 0.99)];
const output = Buffer.alloc(info.width * info.height);

for (let y = 0; y < info.height; y += 1) {
  const worldZ = worldSize / 2 - (y / (info.height - 1)) * worldSize;

  for (let x = 0; x < info.width; x += 1) {
    const worldX = -worldSize / 2 + (x / (info.width - 1)) * worldSize;
    const deltaX = Math.max(Math.abs(worldX) - centerHalfSize, 0);
    const deltaZ = Math.max(Math.abs(worldZ) - centerHalfSize, 0);
    const centerDistance = Math.hypot(deltaX, deltaZ);
    const edgeDistance = Math.min(
      worldSize / 2 - Math.abs(worldX),
      worldSize / 2 - Math.abs(worldZ),
    );
    const centerBlend = smoothstep(clamp(centerDistance / transitionWidth, 0, 1));
    const edgeBlend = smoothstep(clamp(edgeDistance / transitionWidth, 0, 1));
    const sourceHeight = clamp((data[y * info.width + x] - low) / (high - low), 0, 1);
    const height = edgeHeight
      + (sourceHeight - edgeHeight) * centerBlend * edgeBlend;

    output[y * info.width + x] = Math.round(height * 255);
  }
}

await mkdir(path.dirname(outputPath), { recursive: true });
const png = await sharp(output, {
  raw: {
    width: info.width,
    height: info.height,
    channels: 1,
  },
}).png({ compressionLevel: 9 }).toBuffer();

await writeFile(outputPath, png);

const digest = createHash('sha256').update(png).digest('hex');
console.log(`${outputPath}: ${info.width}x${info.height}, sha256 ${digest}`);

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}
