export const HEIGHTMAP_SOURCE_WORLD_SIZE = 2048;
export const HEIGHTMAP_SOURCE_HALF_SIZE = HEIGHTMAP_SOURCE_WORLD_SIZE / 2;
export const HEIGHTMAP_SOURCE_MAX_HEIGHT = 300;
export const TERRAIN_WORLD_SIZE = 4096;
export const TERRAIN_WORLD_HALF_SIZE = TERRAIN_WORLD_SIZE / 2;
export const TERRAIN_WORLD_MAX_HEIGHT = 600;
export const CENTRAL_UPLIFT_START_HEIGHT = 185;
export const CENTRAL_PEAK_MAX_HEIGHT = 350;

export const OUTER_TERRAIN_SEAM_END = 192;
export const OUTER_TERRAIN_FOOTHILL_END = 640;
export const OUTER_TERRAIN_BUFFER_END = 704;
export const OUTER_TERRAIN_BARRIER_END = 864;
export const OUTER_TERRAIN_RIDGE_END = 1024;
export const OUTER_TERRAIN_NOISE_WAVELENGTHS = Object.freeze([512, 256, 128, 64]);

const OUTER_TERRAIN_SEED = 0x6d2b79f5;
const FOOTHILL_BASE_HEIGHT = 244;
const FOOTHILL_DETAIL_HEIGHT = 12;
const RIDGE_MIN_HEIGHT = 520;
const RIDGE_HEIGHT_RANGE = TERRAIN_WORLD_MAX_HEIGHT - RIDGE_MIN_HEIGHT;
const DOMAIN_WARP_LARGE_SCALE = 96;
const DOMAIN_WARP_MEDIUM_SCALE = 32;
const OUTER_HEIGHT_MAP_ANGLE_OFFSET = 0.137;

export function upliftCentralHeight(height) {
  if (height <= CENTRAL_UPLIFT_START_HEIGHT) return height;

  const progress = clamp(
    (height - CENTRAL_UPLIFT_START_HEIGHT)
      / (HEIGHTMAP_SOURCE_MAX_HEIGHT - CENTRAL_UPLIFT_START_HEIGHT),
    0,
    1,
  );
  const upliftRange = CENTRAL_PEAK_MAX_HEIGHT - HEIGHTMAP_SOURCE_MAX_HEIGHT;
  const upliftedHeight = height + upliftRange * smoothstep(progress);

  return Math.min(upliftedHeight, CENTRAL_PEAK_MAX_HEIGHT);
}

export function getOuterTerrainDistance(x, z) {
  const deltaX = Math.max(Math.abs(x) - HEIGHTMAP_SOURCE_HALF_SIZE, 0);
  const deltaZ = Math.max(Math.abs(z) - HEIGHTMAP_SOURCE_HALF_SIZE, 0);

  return Math.hypot(deltaX, deltaZ);
}

export function getOuterTerrainHeight(
  edgeHeight,
  edgeSlope,
  x,
  z,
  sampleRidge = getOuterTerrainRidgeField,
) {
  const outerDistance = getOuterTerrainDistance(x, z);

  if (outerDistance <= 0) return edgeHeight;

  const distance = Math.min(outerDistance, OUTER_TERRAIN_RIDGE_END);
  const ridgeField = sampleRidge(x, z);
  const centeredRidgeField = ridgeField * 2 - 1;
  const foothillStartHeight = clamp(
    edgeHeight + clamp(edgeSlope, -0.65, 0.65) * 96,
    150,
    470,
  );
  const foothillHeight = getFoothillHeight(
    foothillStartHeight,
    centeredRidgeField,
    distance,
  );

  if (distance < OUTER_TERRAIN_SEAM_END) {
    const continuedEdgeHeight = edgeHeight + edgeSlope * distance;
    const seamBlend = smootherstep(distance / OUTER_TERRAIN_SEAM_END);

    return clamp(
      lerp(continuedEdgeHeight, foothillHeight, seamBlend),
      0,
      TERRAIN_WORLD_MAX_HEIGHT,
    );
  }

  if (distance < OUTER_TERRAIN_BUFFER_END) {
    return clamp(foothillHeight, 0, TERRAIN_WORLD_MAX_HEIGHT);
  }

  const ridgeHeight = RIDGE_MIN_HEIGHT + RIDGE_HEIGHT_RANGE * ridgeField;

  if (distance < OUTER_TERRAIN_BARRIER_END) {
    const bufferPoint = projectToOuterDistance(x, z, OUTER_TERRAIN_BUFFER_END);
    const ridgePoint = projectToOuterDistance(x, z, OUTER_TERRAIN_BARRIER_END);
    const bufferField = sampleRidge(bufferPoint.x, bufferPoint.z) * 2 - 1;
    const barrierBaseHeight = FOOTHILL_BASE_HEIGHT
      + bufferField * FOOTHILL_DETAIL_HEIGHT;
    const barrierRidgeHeight = RIDGE_MIN_HEIGHT
      + RIDGE_HEIGHT_RANGE * sampleRidge(ridgePoint.x, ridgePoint.z);
    const barrierProgress = (
      distance - OUTER_TERRAIN_BUFFER_END
    ) / (
      OUTER_TERRAIN_BARRIER_END - OUTER_TERRAIN_BUFFER_END
    );

    return lerp(barrierBaseHeight, barrierRidgeHeight, barrierProgress);
  }

  return ridgeHeight;
}

export function createOuterTerrainRidgeSampler({ data, width, height }) {
  const field = new Float32Array(width * height);

  for (let index = 0; index < field.length; index += 1) {
    const pixelIndex = index * 4;
    field[index] = (
      data[pixelIndex]
      + data[pixelIndex + 1]
      + data[pixelIndex + 2]
    ) / (255 * 3);
  }

  return (x, z) => {
    const angle = Math.atan2(z, x) / (Math.PI * 2);
    const u = fract(angle + OUTER_HEIGHT_MAP_ANGLE_OFFSET);
    const v = clamp(
      getOuterTerrainDistance(x, z) / OUTER_TERRAIN_RIDGE_END,
      0,
      1,
    );
    const imageX = u * width;
    const imageY = v * (height - 1);
    const x0 = Math.floor(imageX) % width;
    const x1 = (x0 + 1) % width;
    const y0 = Math.floor(imageY);
    const y1 = Math.min(y0 + 1, height - 1);
    const tx = imageX - Math.floor(imageX);
    const ty = imageY - y0;
    const top = lerp(
      field[y0 * width + x0],
      field[y0 * width + x1],
      tx,
    );
    const bottom = lerp(
      field[y1 * width + x0],
      field[y1 * width + x1],
      tx,
    );

    return lerp(top, bottom, ty);
  };
}

export function getOuterTerrainRidgeField(x, z) {
  const warpX = sampleValueNoise(x + 137.2, z - 91.7, 512, OUTER_TERRAIN_SEED)
      * DOMAIN_WARP_LARGE_SCALE
    + sampleValueNoise(x - 411.8, z + 283.4, 256, OUTER_TERRAIN_SEED ^ 0x9e3779b9)
      * DOMAIN_WARP_MEDIUM_SCALE;
  const warpZ = sampleValueNoise(x - 229.5, z + 347.1, 512, OUTER_TERRAIN_SEED ^ 0x85ebca6b)
      * DOMAIN_WARP_LARGE_SCALE
    + sampleValueNoise(x + 173.6, z - 519.3, 256, OUTER_TERRAIN_SEED ^ 0xc2b2ae35)
      * DOMAIN_WARP_MEDIUM_SCALE;
  const warpedX = x + warpX;
  const warpedZ = z + warpZ;
  const weights = [0.52, 0.26, 0.14, 0.08];
  let field = 0;

  for (let index = 0; index < OUTER_TERRAIN_NOISE_WAVELENGTHS.length; index += 1) {
    const wavelength = OUTER_TERRAIN_NOISE_WAVELENGTHS[index];
    const noise = sampleValueNoise(
      warpedX,
      warpedZ,
      wavelength,
      OUTER_TERRAIN_SEED + Math.imul(index + 1, 0x27d4eb2d),
    );

    field += (1 - Math.abs(noise)) * weights[index];
  }

  return clamp(field, 0, 1);
}

export function isSourceTerrainPosition(x, z) {
  return Math.abs(x) <= HEIGHTMAP_SOURCE_HALF_SIZE
    && Math.abs(z) <= HEIGHTMAP_SOURCE_HALF_SIZE;
}

export function isTerrainEditableAt(x, z) {
  return isSourceTerrainPosition(x, z);
}

function getFoothillHeight(startHeight, centeredRidgeField, distance) {
  if (distance <= OUTER_TERRAIN_FOOTHILL_END) {
    const progress = clamp(
      (distance - OUTER_TERRAIN_SEAM_END)
        / (OUTER_TERRAIN_FOOTHILL_END - OUTER_TERRAIN_SEAM_END),
      0,
      1,
    );
    const detailHeight = FOOTHILL_DETAIL_HEIGHT
      * (1 + Math.sin(Math.PI * progress));

    return lerp(startHeight, FOOTHILL_BASE_HEIGHT, progress)
      + centeredRidgeField * detailHeight;
  }

  return FOOTHILL_BASE_HEIGHT + centeredRidgeField * FOOTHILL_DETAIL_HEIGHT;
}

function sampleValueNoise(x, z, wavelength, seed) {
  const sampleX = x / wavelength;
  const sampleZ = z / wavelength;
  const x0 = Math.floor(sampleX);
  const z0 = Math.floor(sampleZ);
  const x1 = x0 + 1;
  const z1 = z0 + 1;
  const tx = smootherstep(sampleX - x0);
  const tz = smootherstep(sampleZ - z0);
  const top = lerp(hashCoordinate(x0, z0, seed), hashCoordinate(x1, z0, seed), tx);
  const bottom = lerp(hashCoordinate(x0, z1, seed), hashCoordinate(x1, z1, seed), tx);

  return lerp(top, bottom, tz) * 2 - 1;
}

function projectToOuterDistance(x, z, targetDistance) {
  const edgeX = clamp(
    x,
    -HEIGHTMAP_SOURCE_HALF_SIZE,
    HEIGHTMAP_SOURCE_HALF_SIZE,
  );
  const edgeZ = clamp(
    z,
    -HEIGHTMAP_SOURCE_HALF_SIZE,
    HEIGHTMAP_SOURCE_HALF_SIZE,
  );
  const deltaX = x - edgeX;
  const deltaZ = z - edgeZ;
  const distance = Math.hypot(deltaX, deltaZ);
  const scale = targetDistance / distance;

  return {
    x: edgeX + deltaX * scale,
    z: edgeZ + deltaZ * scale,
  };
}

function hashCoordinate(x, z, seed) {
  let hash = seed >>> 0;

  hash ^= Math.imul(x, 0x1f123bb5);
  hash ^= Math.imul(z, 0x5f356495);
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  hash ^= hash >>> 16;

  return (hash >>> 0) / 0xffffffff;
}

function smootherstep(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function fract(value) {
  return value - Math.floor(value);
}
