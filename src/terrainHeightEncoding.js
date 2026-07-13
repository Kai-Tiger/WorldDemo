export const PRECISE_WATER_HEIGHT_MARKER = 254;
export const PRECISE_WATER_HEIGHT_MAX_COARSE = 32;

export function encodePreciseWaterHeight(height, maxHeight) {
  const scaled = clamp(height / maxHeight, 0, 1) * 255;
  let coarse = Math.floor(scaled);
  let fraction = Math.round((scaled - coarse) * 255);

  if (fraction === 255) {
    coarse = Math.min(coarse + 1, 255);
    fraction = 0;
  }

  if (coarse > PRECISE_WATER_HEIGHT_MAX_COARSE) {
    throw new Error('Precise water height exceeds the reserved lowland range.');
  }

  return [coarse, fraction, PRECISE_WATER_HEIGHT_MARKER];
}

export function decodeTerrainHeightCode(r, g, b) {
  if (isPreciseWaterHeightCode(r, b)) {
    return r + g / 255;
  }

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isPreciseWaterHeightCode(r, b) {
  return b === PRECISE_WATER_HEIGHT_MARKER && r <= PRECISE_WATER_HEIGHT_MAX_COARSE;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}
