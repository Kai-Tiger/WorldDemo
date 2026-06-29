import * as THREE from 'three';

const HEIGHT_MAP_PATH = '/assets/terrain/height.webp';
const MAP_SIZE = 2048;
const CHUNK_SIZE = 256;
const CHUNK_SEGMENTS = 256;
const MAX_HEIGHT = 300;
const HALF_MAP_SIZE = MAP_SIZE / 2;
const CHUNKS_PER_SIDE = MAP_SIZE / CHUNK_SIZE;
const NORMAL_SAMPLE_DISTANCE = 1;
const HEIGHT_SMOOTHING_ENABLED = true;
const HEIGHT_SMOOTHING_KERNEL = [
  [1, 2, 1],
  [2, 4, 2],
  [1, 2, 1],
];

export class Terrain {
  constructor(heightData, width, height) {
    this.heightData = heightData;
    this.width = width;
    this.height = height;
    this.group = new THREE.Group();
    this.group.name = 'Terrain';
    this.material = new THREE.MeshStandardMaterial({
      color: 0x6f8f54,
      roughness: 0.85,
      metalness: 0,
    });

    this.createChunks();
  }

  static async create() {
    const { data, width, height } = await loadHeightMap(HEIGHT_MAP_PATH);
    return new Terrain(data, width, height);
  }

  createChunks() {
    for (let z = 0; z < CHUNKS_PER_SIDE; z += 1) {
      for (let x = 0; x < CHUNKS_PER_SIDE; x += 1) {
        this.group.add(this.createChunk(x, z));
      }
    }
  }

  createChunk(chunkX, chunkZ) {
    const verticesPerSide = CHUNK_SEGMENTS + 1;
    const vertexCount = verticesPerSide * verticesPerSide;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = new Uint32Array(CHUNK_SEGMENTS * CHUNK_SEGMENTS * 6);
    const minX = -HALF_MAP_SIZE + chunkX * CHUNK_SIZE;
    const minZ = -HALF_MAP_SIZE + chunkZ * CHUNK_SIZE;

    let positionOffset = 0;
    let uvOffset = 0;

    for (let z = 0; z < verticesPerSide; z += 1) {
      for (let x = 0; x < verticesPerSide; x += 1) {
        const worldX = minX + x;
        const worldZ = minZ + z;
        const height = this.getHeightAt(worldX, worldZ);

        positions[positionOffset] = worldX;
        positions[positionOffset + 1] = height;
        positions[positionOffset + 2] = worldZ;
        positionOffset += 3;

        uvs[uvOffset] = (worldX + HALF_MAP_SIZE) / MAP_SIZE;
        uvs[uvOffset + 1] = (worldZ + HALF_MAP_SIZE) / MAP_SIZE;
        uvOffset += 2;
      }
    }

    let indexOffset = 0;

    for (let z = 0; z < CHUNK_SEGMENTS; z += 1) {
      for (let x = 0; x < CHUNK_SEGMENTS; x += 1) {
        const topLeft = z * verticesPerSide + x;
        const topRight = topLeft + 1;
        const bottomLeft = topLeft + verticesPerSide;
        const bottomRight = bottomLeft + 1;

        indices[indexOffset] = topLeft;
        indices[indexOffset + 1] = bottomLeft;
        indices[indexOffset + 2] = topRight;
        indices[indexOffset + 3] = topRight;
        indices[indexOffset + 4] = bottomLeft;
        indices[indexOffset + 5] = bottomRight;
        indexOffset += 6;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.name = `TerrainChunk_${chunkX}_${chunkZ}`;
    mesh.receiveShadow = true;
    return mesh;
  }

  getHeightAt(x, z) {
    const u = THREE.MathUtils.clamp((x + HALF_MAP_SIZE) / MAP_SIZE, 0, 1);
    const v = THREE.MathUtils.clamp((z + HALF_MAP_SIZE) / MAP_SIZE, 0, 1);
    const imageX = u * (this.width - 1);
    const imageY = (1 - v) * (this.height - 1);
    const x0 = Math.floor(imageX);
    const y0 = Math.floor(imageY);
    const x1 = Math.min(x0 + 1, this.width - 1);
    const y1 = Math.min(y0 + 1, this.height - 1);
    const tx = imageX - x0;
    const ty = imageY - y0;

    const h00 = this.getSampledPixelHeight(x0, y0);
    const h10 = this.getSampledPixelHeight(x1, y0);
    const h01 = this.getSampledPixelHeight(x0, y1);
    const h11 = this.getSampledPixelHeight(x1, y1);
    const top = THREE.MathUtils.lerp(h00, h10, tx);
    const bottom = THREE.MathUtils.lerp(h01, h11, tx);

    return THREE.MathUtils.lerp(top, bottom, ty);
  }

  getSampledPixelHeight(x, y) {
    if (!HEIGHT_SMOOTHING_ENABLED) {
      return this.getPixelHeight(x, y);
    }

    let weightedHeight = 0;
    let totalWeight = 0;

    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        const sampleX = THREE.MathUtils.clamp(x + offsetX, 0, this.width - 1);
        const sampleY = THREE.MathUtils.clamp(y + offsetY, 0, this.height - 1);
        const weight = HEIGHT_SMOOTHING_KERNEL[offsetY + 1][offsetX + 1];

        weightedHeight += this.getPixelHeight(sampleX, sampleY) * weight;
        totalWeight += weight;
      }
    }

    return weightedHeight / totalWeight;
  }

  getNormalAt(x, z) {
    const left = this.getHeightAt(x - NORMAL_SAMPLE_DISTANCE, z);
    const right = this.getHeightAt(x + NORMAL_SAMPLE_DISTANCE, z);
    const down = this.getHeightAt(x, z - NORMAL_SAMPLE_DISTANCE);
    const up = this.getHeightAt(x, z + NORMAL_SAMPLE_DISTANCE);

    return new THREE.Vector3(
      left - right,
      NORMAL_SAMPLE_DISTANCE * 2,
      down - up,
    ).normalize();
  }

  getMaxHeightInRadius(x, z, radius) {
    const diagonal = radius * Math.SQRT1_2;
    const samplePoints = [
      [0, 0],
      [radius, 0],
      [-radius, 0],
      [0, radius],
      [0, -radius],
      [diagonal, diagonal],
      [diagonal, -diagonal],
      [-diagonal, diagonal],
      [-diagonal, -diagonal],
    ];

    let maxHeight = -Infinity;

    for (const [offsetX, offsetZ] of samplePoints) {
      maxHeight = Math.max(maxHeight, this.getHeightAt(x + offsetX, z + offsetZ));
    }

    return maxHeight;
  }

  getPixelHeight(x, y) {
    const index = (y * this.width + x) * 4;
    const r = this.heightData[index];
    const g = this.heightData[index + 1];
    const b = this.heightData[index + 2];
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

    return luminance * MAX_HEIGHT;
  }
}

async function loadHeightMap(path) {
  const image = new Image();
  image.src = path;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  return {
    data: imageData.data,
    width: canvas.width,
    height: canvas.height,
  };
}
