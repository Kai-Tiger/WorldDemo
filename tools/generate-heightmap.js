import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { deflateSync } from 'node:zlib';

const WIDTH = 2049;
const HEIGHT = 2049;
const OUTPUT_PATH = 'public/assets/terrain/height.png';
const MAX_HEIGHT_METERS = 300;
const SEED = 1337;

const MAIN_RIVERS = [
  {
    width: 22,
    valleyWidth: 90,
    bed: 23,
    points: [[-900, -760], [-620, -420], [-360, -180], [-120, -20], [170, 85], [430, 210]],
  },
  {
    width: 18,
    valleyWidth: 72,
    bed: 27,
    points: [[820, -850], [610, -560], [380, -310], [190, -120], [35, 15], [-170, 80]],
  },
  {
    width: 16,
    valleyWidth: 68,
    bed: 29,
    points: [[-820, 790], [-610, 560], [-415, 365], [-245, 190], [-80, 80], [105, 30]],
  },
  {
    width: 14,
    valleyWidth: 62,
    bed: 31,
    points: [[720, 835], [540, 610], [390, 430], [235, 265], [60, 145], [-110, 75]],
  },
];

const TRIBUTARIES = [
  [[-980, -240], [-740, -190], [-505, -245], [-310, -185]],
  [[-970, 260], [-760, 205], [-575, 170], [-375, 165]],
  [[950, -270], [730, -215], [540, -175], [335, -135]],
  [[930, 330], [705, 285], [510, 240], [295, 190]],
  [[-420, -930], [-345, -690], [-280, -455], [-245, -245]],
  [[360, 930], [300, 690], [240, 470], [185, 260]],
];

const LAKES = [
  { x: -245, z: 70, radiusX: 175, radiusZ: 115, level: 22 },
  { x: 215, z: -155, radiusX: 125, radiusZ: 78, level: 25 },
  { x: 330, z: 155, radiusX: 92, radiusZ: 56, level: 28 },
];

const SANDBARS = [
  { x: -175, z: 80, radiusX: 70, radiusZ: 15, height: 5, angle: -0.35 },
  { x: 30, z: 22, radiusX: 84, radiusZ: 12, height: 4, angle: 0.18 },
  { x: 280, z: -115, radiusX: 48, radiusZ: 10, height: 3.5, angle: -0.55 },
  { x: 390, z: 195, radiusX: 42, radiusZ: 8, height: 3, angle: 0.45 },
];

const heightData = new Uint16Array(WIDTH * HEIGHT);

for (let y = 0; y < HEIGHT; y += 1) {
  const z = mapPixelToWorld(y, HEIGHT);

  for (let x = 0; x < WIDTH; x += 1) {
    const worldX = mapPixelToWorld(x, WIDTH);
    let height = getBaseHeight(worldX, z);

    for (const river of MAIN_RIVERS) {
      height = carveRiver(height, worldX, z, river);
    }

    for (const points of TRIBUTARIES) {
      height = carveRiver(height, worldX, z, {
        width: 8,
        valleyWidth: 38,
        bed: 34,
        points,
      });
    }

    for (const lake of LAKES) {
      height = carveLake(height, worldX, z, lake);
    }

    for (const sandbar of SANDBARS) {
      height = addSandbar(height, worldX, z, sandbar);
    }

    height += fbm(worldX * 0.018 + 400, z * 0.018 - 300, 3) * 2.2;
    height = clamp(height, 0, MAX_HEIGHT_METERS);
    heightData[y * WIDTH + x] = Math.round((height / MAX_HEIGHT_METERS) * 65535);
  }
}

writePng16Grayscale(OUTPUT_PATH, WIDTH, HEIGHT, heightData);

console.log(`Generated ${OUTPUT_PATH} (${WIDTH}x${HEIGHT}, 16-bit grayscale)`);

function getBaseHeight(x, z) {
  const nx = x / 1024;
  const nz = z / 1024;
  const radius = Math.sqrt(nx * nx + nz * nz);
  const mountainRing = smoothstep(0.44, 1.02, radius);
  const rim = smoothstep(0.74, 1.08, radius);
  const ridgeNoise = fbm(x * 0.004, z * 0.004, 5);
  const detailNoise = fbm(x * 0.012 + 120, z * 0.012 - 80, 4);
  const basin = 34 + smoothstep(0.12, 0.58, radius) * 35;
  const ridges = Math.max(0, ridgeNoise) * 52 + detailNoise * 16;

  return basin + mountainRing * 130 + rim * 80 + ridges * (0.35 + mountainRing);
}

function carveRiver(height, x, z, river) {
  const { distance, progress } = distanceToPath(x, z, river.points);
  const bedHeight = river.bed + progress * 17;
  const channel = smoothstep(river.width, 0, distance);
  const valley = smoothstep(river.valleyWidth, river.width, distance);
  const braided = Math.sin(progress * Math.PI * 28 + fbm(x * 0.03, z * 0.03, 2) * 1.8);
  const channelWidth = river.width * (1 + braided * 0.18);
  const bankHeight = bedHeight + Math.pow(distance / channelWidth, 1.8) * 10;
  let carved = height;

  carved = lerp(carved, Math.min(carved, bankHeight), channel);
  carved -= valley * (river.valleyWidth - distance) * 0.13;

  return Math.max(carved, bedHeight - 1.5);
}

function carveLake(height, x, z, lake) {
  const dx = (x - lake.x) / lake.radiusX;
  const dz = (z - lake.z) / lake.radiusZ;
  const distance = Math.sqrt(dx * dx + dz * dz);
  const lakeBed = lake.level + Math.max(0, distance) * 2.5;
  const inside = smoothstep(1.05, 0.82, distance);
  const shore = smoothstep(1.28, 0.92, distance);
  let carved = lerp(height, Math.min(height, lakeBed), inside);

  carved -= shore * Math.max(0, 1.25 - distance) * 7;

  return Math.max(carved, lake.level - 1);
}

function addSandbar(height, x, z, sandbar) {
  const cos = Math.cos(sandbar.angle);
  const sin = Math.sin(sandbar.angle);
  const dx = x - sandbar.x;
  const dz = z - sandbar.z;
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  const distance = Math.sqrt(
    (localX / sandbar.radiusX) ** 2 + (localZ / sandbar.radiusZ) ** 2,
  );

  return height + smoothstep(1, 0, distance) * sandbar.height;
}

function distanceToPath(x, z, points) {
  let closestDistance = Infinity;
  let closestProgress = 0;
  let totalLength = 0;
  const lengths = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    const length = distance(points[i], points[i + 1]);
    lengths.push(length);
    totalLength += length;
  }

  let traveled = 0;

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const segmentX = end[0] - start[0];
    const segmentZ = end[1] - start[1];
    const segmentLengthSq = segmentX * segmentX + segmentZ * segmentZ;
    const t = clamp(((x - start[0]) * segmentX + (z - start[1]) * segmentZ) / segmentLengthSq, 0, 1);
    const closestX = start[0] + segmentX * t;
    const closestZ = start[1] + segmentZ * t;
    const d = Math.hypot(x - closestX, z - closestZ);

    if (d < closestDistance) {
      closestDistance = d;
      closestProgress = (traveled + lengths[i] * t) / totalLength;
    }

    traveled += lengths[i];
  }

  return {
    distance: closestDistance,
    progress: closestProgress,
  };
}

function mapPixelToWorld(value, size) {
  return (value / (size - 1)) * 2048 - 1024;
}

function fbm(x, y, octaves) {
  let total = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let normalizer = 0;

  for (let i = 0; i < octaves; i += 1) {
    total += valueNoise(x * frequency, y * frequency) * amplitude;
    normalizer += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return total / normalizer;
}

function valueNoise(x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(0, 1, x - x0);
  const ty = smoothstep(0, 1, y - y0);
  const a = random2d(x0, y0);
  const b = random2d(x0 + 1, y0);
  const c = random2d(x0, y0 + 1);
  const d = random2d(x0 + 1, y0 + 1);

  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty) * 2 - 1;
}

function random2d(x, y) {
  let value = x * 374761393 + y * 668265263 + SEED * 69069;
  value = (value ^ (value >> 13)) * 1274126177;
  return ((value ^ (value >> 16)) >>> 0) / 4294967295;
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function writePng16Grayscale(path, width, height, data) {
  mkdirSync(dirname(path), { recursive: true });

  const scanlineSize = width * 2 + 1;
  const raw = Buffer.alloc(scanlineSize * height);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * scanlineSize;
    raw[rowOffset] = 0;

    for (let x = 0; x < width; x += 1) {
      const value = data[y * width + x];
      const byteOffset = rowOffset + 1 + x * 2;

      raw[byteOffset] = value >> 8;
      raw[byteOffset + 1] = value & 255;
    }
  }

  const chunks = [
    createChunk('IHDR', createIhdr(width, height)),
    createChunk('IDAT', deflateSync(raw, { level: 9 })),
    createChunk('IEND', Buffer.alloc(0)),
  ];

  writeFileSync(path, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    ...chunks,
  ]));
}

function createIhdr(width, height) {
  const ihdr = Buffer.alloc(13);

  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 16;
  ihdr[9] = 0;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return ihdr;
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);

  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
