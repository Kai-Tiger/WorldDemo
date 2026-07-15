import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const sourcePath = process.argv[2];
const outputPath = process.argv[3]
  ?? 'public/assets/terrain/outer-mountain-height.png';
const outputWidth = 512;

if (!sourcePath) {
  throw new Error('Usage: node tools/build-outer-mountain-height.mjs <source> [output]');
}

const { data, info } = await sharp(sourcePath)
  .greyscale()
  .resize({ width: outputWidth })
  .blur(4)
  .raw()
  .toBuffer({ resolveWithObject: true });
const field = new Float32Array(info.width * info.height);
const seamBand = Math.round(info.width / 32);

for (let y = 0; y < info.height; y += 1) {
  const rowOffset = y * info.width;
  const seamValue = (
    data[rowOffset]
    + data[rowOffset + info.width - 1]
  ) / 2;

  for (let x = 0; x < info.width; x += 1) {
    let blend = 1;

    if (x < seamBand) {
      blend = smootherstep(x / seamBand);
    } else if (x > info.width - 1 - seamBand) {
      blend = smootherstep((info.width - 1 - x) / seamBand);
    }

    field[rowOffset + x] = seamValue
      + (data[rowOffset + x] - seamValue) * blend;
  }
}

const sorted = Float32Array.from(field).sort();
const low = sorted[Math.floor((sorted.length - 1) * 0.01)];
const high = sorted[Math.ceil((sorted.length - 1) * 0.99)];
const output = Buffer.alloc(field.length);

for (let index = 0; index < field.length; index += 1) {
  output[index] = Math.round(clamp((field[index] - low) / (high - low), 0, 1) * 255);
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

function smootherstep(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}
