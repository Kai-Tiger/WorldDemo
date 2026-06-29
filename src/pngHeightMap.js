import { decompressSync } from 'fflate';

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

export async function loadPngHeightMap(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load height map: ${path}`);
  }

  return decodePngHeightMap(new Uint8Array(await response.arrayBuffer()));
}

function decodePngHeightMap(bytes) {
  validateSignature(bytes);

  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < bytes.length) {
    const length = readUint32(bytes, offset);
    const type = readChunkType(bytes, offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (type === 'IHDR') {
      width = readUint32(bytes, dataStart);
      height = readUint32(bytes, dataStart + 4);
      bitDepth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
    } else if (type === 'IDAT') {
      idatChunks.push(bytes.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4;
  }

  if (colorType !== 0 || (bitDepth !== 8 && bitDepth !== 16)) {
    throw new Error('Height map must be an 8-bit or 16-bit grayscale PNG.');
  }

  const bytesPerSample = bitDepth / 8;
  const rowSize = width * bytesPerSample;
  const inflated = decompressSync(concatUint8Arrays(idatChunks));
  const unfiltered = unfilterScanlines(inflated, width, height, bytesPerSample, rowSize);
  const data = new Uint16Array(width * height);

  for (let i = 0; i < data.length; i += 1) {
    if (bitDepth === 16) {
      const byteIndex = i * 2;
      data[i] = (unfiltered[byteIndex] << 8) | unfiltered[byteIndex + 1];
    } else {
      data[i] = unfiltered[i] * 257;
    }
  }

  return {
    data,
    width,
    height,
  };
}

function validateSignature(bytes) {
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (bytes[i] !== PNG_SIGNATURE[i]) {
      throw new Error('Height map is not a PNG file.');
    }
  }
}

function readUint32(bytes, offset) {
  return (
    ((bytes[offset] << 24)
      | (bytes[offset + 1] << 16)
      | (bytes[offset + 2] << 8)
      | bytes[offset + 3]) >>> 0
  );
}

function readChunkType(bytes, offset) {
  return String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3],
  );
}

function concatUint8Arrays(chunks) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

function unfilterScanlines(source, width, height, bytesPerPixel, rowSize) {
  const output = new Uint8Array(rowSize * height);
  let sourceOffset = 0;
  let outputOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = source[sourceOffset];
    sourceOffset += 1;

    for (let x = 0; x < rowSize; x += 1) {
      const raw = source[sourceOffset + x];
      const left = x >= bytesPerPixel ? output[outputOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? output[outputOffset + x - rowSize] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel
        ? output[outputOffset + x - rowSize - bytesPerPixel]
        : 0;

      output[outputOffset + x] = (raw + getFilterValue(filter, left, up, upLeft)) & 255;
    }

    sourceOffset += rowSize;
    outputOffset += rowSize;
  }

  return output;
}

function getFilterValue(filter, left, up, upLeft) {
  switch (filter) {
    case 0:
      return 0;
    case 1:
      return left;
    case 2:
      return up;
    case 3:
      return Math.floor((left + up) / 2);
    case 4:
      return paeth(left, up, upLeft);
    default:
      throw new Error(`Unsupported PNG filter: ${filter}`);
  }
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  if (upDistance <= upLeftDistance) {
    return up;
  }

  return upLeft;
}
