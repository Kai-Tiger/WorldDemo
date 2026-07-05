import * as THREE from 'three';
import {
  applyRiverChannel,
  getRiverMaterialFrame,
  RIVER_BED_TEXTURE_PATH,
  RIVER_BED_TEXTURE_WORLD_SIZE,
  RIVER_BANK_TEXTURE_PATH,
  RIVER_BANK_TEXTURE_WORLD_SIZE,
} from './riverChannel.js';
import { SUN_LIGHT_DIRECTION } from './lighting.js';
import {
  applyWaterSystemTerrain,
  getWaterSystemMaterialFrame,
} from './waterSystem.js';
import { applySmallLakesTerrain, getSmallLakesMaterialMask } from './smallLakes.js';
import { MAP_SIZE } from './vegetationConfig.js';

const HEIGHT_MAP_PATH = '/assets/terrain/height.webp';
const FROZEN_DIRT_TEXTURE_PATH = '/assets/terrain/dirt-frozen.webp';
const ALPINE_SCREE_TEXTURE_PATH = '/assets/terrain/scree-alpine.webp';
const ALPINE_ROCK_TEXTURE_PATH = '/assets/terrain/rock-alpine.webp';
const ALPINE_ROCK_NORMAL_TEXTURE_PATH = '/assets/terrain/rock-alpine-normal.png';
const ALPINE_SNOW_TEXTURE_PATH = '/assets/terrain/snow-alpine.webp';
const GRAVEL_ALBEDO_TEXTURE_PATH = '/assets/terrain/materials/gravel_albedo.png';
const GRAVEL_NORMAL_TEXTURE_PATH = '/assets/terrain/materials/gravel_normal.png';
const HEIGHT_MAP_WORLD_SIZE = 2048;
const CHUNK_SIZE = 256;
const CHUNK_SEGMENTS = 256;
const INITIAL_CHUNK_RADIUS = 1;
const LOAD_CHUNK_RADIUS = 2;
const UNLOAD_CHUNK_RADIUS = 3;
const CHUNK_LOADS_PER_FRAME = 2;
const CHUNK_UNLOADS_PER_FRAME = 2;
const MAX_HEIGHT = 300;
const HALF_MAP_SIZE = MAP_SIZE / 2;
const HALF_HEIGHT_MAP_WORLD_SIZE = HEIGHT_MAP_WORLD_SIZE / 2;
const CHUNKS_PER_SIDE = MAP_SIZE / CHUNK_SIZE;
const NORMAL_SAMPLE_DISTANCE = 1;
const GROUND_MASK_SAMPLE_DISTANCE = 5;
const HEIGHTMAP_SAVE_QUALITY = 0.98;
const GROUND_TEXTURE_WORLD_SIZE = 8;
const GRAVEL_TEXTURE_WORLD_SIZE = 4.5;
const HEIGHT_SMOOTHING_ENABLED = true;
const HEIGHT_DITHER_AMPLITUDE = 0.35;
const HEIGHT_DITHER_FREQUENCY = 0.65;
const HEIGHT_SMOOTHING_KERNEL = [
  [1, 4, 6, 4, 1],
  [4, 16, 24, 16, 4],
  [6, 24, 36, 24, 6],
  [4, 16, 24, 16, 4],
  [1, 4, 6, 4, 1],
];

export class Terrain {
  constructor(heightData, width, height, textures) {
    this.heightData = heightData;
    this.width = width;
    this.height = height;
    this.group = new THREE.Group();
    this.group.name = 'Terrain';
    this.material = createTerrainMaterial(textures);
    this.loadedChunks = new Map();
  }

  static async create() {
    const [
      { data, width, height },
      textures,
    ] = await Promise.all([
      loadHeightMap(HEIGHT_MAP_PATH),
      loadTerrainTextures(),
    ]);

    return new Terrain(data, width, height, textures);
  }

  update(centerPosition) {
    const centerChunkX = this.getChunkCoord(centerPosition.x);
    const centerChunkZ = this.getChunkCoord(centerPosition.z);
    const loadRadius = this.loadedChunks.size === 0 ? INITIAL_CHUNK_RADIUS : LOAD_CHUNK_RADIUS;
    const loadKeys = this.getChunkKeysInRadius(centerChunkX, centerChunkZ, loadRadius);
    const keepKeys = this.getChunkKeysInRadius(centerChunkX, centerChunkZ, UNLOAD_CHUNK_RADIUS);

    this.loadMissingChunks(loadKeys, centerChunkX, centerChunkZ);
    this.unloadDistantChunks(keepKeys);
  }

  getChunkCoord(value) {
    return THREE.MathUtils.clamp(
      Math.floor((value + HALF_MAP_SIZE) / CHUNK_SIZE),
      0,
      CHUNKS_PER_SIDE - 1,
    );
  }

  getChunkKeysInRadius(centerChunkX, centerChunkZ, radius) {
    const keys = [];

    for (let z = centerChunkZ - radius; z <= centerChunkZ + radius; z += 1) {
      for (let x = centerChunkX - radius; x <= centerChunkX + radius; x += 1) {
        if (x < 0 || x >= CHUNKS_PER_SIDE || z < 0 || z >= CHUNKS_PER_SIDE) continue;
        keys.push(this.getChunkKey(x, z));
      }
    }

    return keys;
  }

  loadMissingChunks(loadKeys, centerChunkX, centerChunkZ) {
    const missing = loadKeys
      .filter((key) => !this.loadedChunks.has(key))
      .map((key) => {
        const { x, z } = this.parseChunkKey(key);
        return {
          key,
          x,
          z,
          distance: Math.max(Math.abs(x - centerChunkX), Math.abs(z - centerChunkZ)),
        };
      })
      .sort((a, b) => a.distance - b.distance);

    const loadCount = this.loadedChunks.size === 0 ? missing.length : CHUNK_LOADS_PER_FRAME;

    for (let i = 0; i < Math.min(missing.length, loadCount); i += 1) {
      const chunk = missing[i];
      const mesh = this.createChunk(chunk.x, chunk.z);

      this.loadedChunks.set(chunk.key, mesh);
      this.group.add(mesh);
    }
  }

  unloadDistantChunks(keepKeys) {
    const keepKeySet = new Set(keepKeys);
    const staleKeys = [];

    for (const key of this.loadedChunks.keys()) {
      if (!keepKeySet.has(key)) {
        staleKeys.push(key);
      }
    }

    for (let i = 0; i < Math.min(staleKeys.length, CHUNK_UNLOADS_PER_FRAME); i += 1) {
      const key = staleKeys[i];
      const mesh = this.loadedChunks.get(key);

      this.group.remove(mesh);
      mesh.geometry.dispose();
      this.loadedChunks.delete(key);
    }
  }

  getChunkKey(chunkX, chunkZ) {
    return `${chunkX},${chunkZ}`;
  }

  parseChunkKey(key) {
    const [x, z] = key.split(',').map(Number);

    return { x, z };
  }

  getHeightMapData() {
    return {
      data: this.heightData,
      width: this.width,
      height: this.height,
      worldSize: HEIGHT_MAP_WORLD_SIZE,
      maxHeight: MAX_HEIGHT,
      saveQuality: HEIGHTMAP_SAVE_QUALITY,
    };
  }

  heightMapPixelToWorld(imageX, imageY) {
    const x = (imageX / (this.width - 1)) * HEIGHT_MAP_WORLD_SIZE - HALF_HEIGHT_MAP_WORLD_SIZE;
    const z = ((this.height - 1 - imageY) / (this.height - 1)) * HEIGHT_MAP_WORLD_SIZE - HALF_HEIGHT_MAP_WORLD_SIZE;

    return { x, z };
  }

  applyHeightBrush(worldX, worldZ, radius, strength) {
    const centerX = ((worldX + HALF_HEIGHT_MAP_WORLD_SIZE) / HEIGHT_MAP_WORLD_SIZE) * (this.width - 1);
    const centerY = (1 - ((worldZ + HALF_HEIGHT_MAP_WORLD_SIZE) / HEIGHT_MAP_WORLD_SIZE)) * (this.height - 1);
    const pixelRadius = Math.max((radius / HEIGHT_MAP_WORLD_SIZE) * (this.width - 1), 1);
    const minX = Math.max(Math.floor(centerX - pixelRadius), 0);
    const maxX = Math.min(Math.ceil(centerX + pixelRadius), this.width - 1);
    const minY = Math.max(Math.floor(centerY - pixelRadius), 0);
    const maxY = Math.min(Math.ceil(centerY + pixelRadius), this.height - 1);
    const delta = (strength / MAX_HEIGHT) * 255;

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy) / pixelRadius;

        if (distance > 1) continue;

        const falloff = 1 - smoothstepRange(0.18, 1, distance);
        const index = (y * this.width + x) * 4;
        const value = THREE.MathUtils.clamp(this.getPixelLuminance(index) + delta * falloff, 0, 255);

        this.heightData[index] = value;
        this.heightData[index + 1] = value;
        this.heightData[index + 2] = value;
        this.heightData[index + 3] = 255;
      }
    }

    const topLeft = this.heightMapPixelToWorld(minX, minY);
    const bottomRight = this.heightMapPixelToWorld(maxX, maxY);
    const bounds = {
      minX: Math.min(topLeft.x, bottomRight.x) - 2,
      maxX: Math.max(topLeft.x, bottomRight.x) + 2,
      minZ: Math.min(topLeft.z, bottomRight.z) - 2,
      maxZ: Math.max(topLeft.z, bottomRight.z) + 2,
    };

    this.refreshChunksInBounds(bounds);

    return {
      minX,
      minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  refreshChunksInBounds(bounds) {
    const minChunkX = this.getChunkCoord(bounds.minX);
    const maxChunkX = this.getChunkCoord(bounds.maxX);
    const minChunkZ = this.getChunkCoord(bounds.minZ);
    const maxChunkZ = this.getChunkCoord(bounds.maxZ);

    for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ += 1) {
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX += 1) {
        const key = this.getChunkKey(chunkX, chunkZ);

        if (!this.loadedChunks.has(key)) continue;

        const previous = this.loadedChunks.get(key);
        const next = this.createChunk(chunkX, chunkZ);

        this.group.remove(previous);
        previous.geometry.dispose();
        this.loadedChunks.set(key, next);
        this.group.add(next);
      }
    }
  }

  createChunk(chunkX, chunkZ) {
    const verticesPerSide = CHUNK_SEGMENTS + 1;
    const vertexCount = verticesPerSide * verticesPerSide;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const groundMasks = new Float32Array(vertexCount);
    const riverMasks = new Float32Array(vertexCount);
    const riverBedMasks = new Float32Array(vertexCount);
    const riverUnderwaterMasks = new Float32Array(vertexCount);
    const riverBedCoords = new Float32Array(vertexCount * 2);
    const waterSystemMasks = new Float32Array(vertexCount * 4);
    const smallLakeMasks = new Float32Array(vertexCount);
    const indices = new Uint32Array(CHUNK_SEGMENTS * CHUNK_SEGMENTS * 6);
    const minX = -HALF_MAP_SIZE + chunkX * CHUNK_SIZE;
    const minZ = -HALF_MAP_SIZE + chunkZ * CHUNK_SIZE;

    let positionOffset = 0;
    let uvOffset = 0;
    let groundMaskOffset = 0;
    let riverMaskOffset = 0;
    let riverBedMaskOffset = 0;
    let riverUnderwaterMaskOffset = 0;
    let riverBedCoordOffset = 0;
    let waterSystemMaskOffset = 0;
    let smallLakeMaskOffset = 0;

    for (let z = 0; z < verticesPerSide; z += 1) {
      for (let x = 0; x < verticesPerSide; x += 1) {
        const worldX = minX + x;
        const worldZ = minZ + z;
        const baseHeight = this.getBaseHeightAt(worldX, worldZ);
        const waterSystemHeight = applyWaterSystemTerrain(baseHeight, worldX, worldZ);
        const smallLakesHeight = applySmallLakesTerrain(waterSystemHeight, worldX, worldZ);
        const height = applyRiverChannel(smallLakesHeight, worldX, worldZ);
        const groundMask = this.getTerrainGroundMask(worldX, worldZ);
        const riverFrame = getRiverMaterialFrame(baseHeight, worldX, worldZ);
        const waterSystemFrame = getWaterSystemMaterialFrame(baseHeight, worldX, worldZ);
        const smallLakesMask = getSmallLakesMaterialMask(worldX, worldZ);

        positions[positionOffset] = worldX;
        positions[positionOffset + 1] = height;
        positions[positionOffset + 2] = worldZ;
        positionOffset += 3;

        groundMasks[groundMaskOffset] = groundMask;
        groundMaskOffset += 1;

        riverMasks[riverMaskOffset] = riverFrame.riverMask;
        riverMaskOffset += 1;

        riverBedMasks[riverBedMaskOffset] = Math.max(riverFrame.riverBedMask, smallLakesMask);
        riverBedMaskOffset += 1;

        riverUnderwaterMasks[riverUnderwaterMaskOffset] = riverFrame.riverUnderwaterMask;
        riverUnderwaterMaskOffset += 1;

        riverBedCoords[riverBedCoordOffset] = riverFrame.riverDistance;
        riverBedCoords[riverBedCoordOffset + 1] = riverFrame.riverLateral;
        riverBedCoordOffset += 2;

        waterSystemMasks[waterSystemMaskOffset] = waterSystemFrame.lakeBedMask;
        waterSystemMasks[waterSystemMaskOffset + 1] = waterSystemFrame.wetShoreMask;
        waterSystemMasks[waterSystemMaskOffset + 2] = waterSystemFrame.snowmeltWetMask;
        waterSystemMasks[waterSystemMaskOffset + 3] = waterSystemFrame.plungeMask;
        waterSystemMaskOffset += 4;

        smallLakeMasks[smallLakeMaskOffset] = smallLakesMask;
        smallLakeMaskOffset += 1;

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
    geometry.setAttribute('groundMask', new THREE.BufferAttribute(groundMasks, 1));
    geometry.setAttribute('riverMask', new THREE.BufferAttribute(riverMasks, 1));
    geometry.setAttribute('riverBedMask', new THREE.BufferAttribute(riverBedMasks, 1));
    geometry.setAttribute('riverUnderwaterMask', new THREE.BufferAttribute(riverUnderwaterMasks, 1));
    geometry.setAttribute('riverBedCoord', new THREE.BufferAttribute(riverBedCoords, 2));
    geometry.setAttribute('waterSystemMask', new THREE.BufferAttribute(waterSystemMasks, 4));
    geometry.setAttribute('smallLakesMask', new THREE.BufferAttribute(smallLakeMasks, 1));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.name = `TerrainChunk_${chunkX}_${chunkZ}`;
    mesh.receiveShadow = true;
    return mesh;
  }

  getHeightAt(x, z) {
    const waterSystemHeight = applyWaterSystemTerrain(this.getBaseHeightAt(x, z), x, z);
    const smallLakesHeight = applySmallLakesTerrain(waterSystemHeight, x, z);

    return applyRiverChannel(smallLakesHeight, x, z);
  }

  getBaseHeightAt(x, z) {
    const u = THREE.MathUtils.clamp((x + HALF_HEIGHT_MAP_WORLD_SIZE) / HEIGHT_MAP_WORLD_SIZE, 0, 1);
    const v = THREE.MathUtils.clamp((z + HALF_HEIGHT_MAP_WORLD_SIZE) / HEIGHT_MAP_WORLD_SIZE, 0, 1);
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
    const height = THREE.MathUtils.lerp(top, bottom, ty) + getHeightDither(x, z);

    return THREE.MathUtils.clamp(height, 0, MAX_HEIGHT);
  }

  getSampledPixelHeight(x, y) {
    if (!HEIGHT_SMOOTHING_ENABLED) {
      return this.getPixelHeight(x, y);
    }

    let weightedHeight = 0;
    let totalWeight = 0;

    const kernelRadius = Math.floor(HEIGHT_SMOOTHING_KERNEL.length / 2);

    for (let offsetY = -kernelRadius; offsetY <= kernelRadius; offsetY += 1) {
      for (let offsetX = -kernelRadius; offsetX <= kernelRadius; offsetX += 1) {
        const sampleX = THREE.MathUtils.clamp(x + offsetX, 0, this.width - 1);
        const sampleY = THREE.MathUtils.clamp(y + offsetY, 0, this.height - 1);
        const weight = HEIGHT_SMOOTHING_KERNEL[offsetY + kernelRadius][offsetX + kernelRadius];

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

  getTerrainGroundMask(x, z) {
    const center = this.getHeightAt(x, z);
    const left = this.getHeightAt(x - GROUND_MASK_SAMPLE_DISTANCE, z);
    const right = this.getHeightAt(x + GROUND_MASK_SAMPLE_DISTANCE, z);
    const down = this.getHeightAt(x, z - GROUND_MASK_SAMPLE_DISTANCE);
    const up = this.getHeightAt(x, z + GROUND_MASK_SAMPLE_DISTANCE);
    const normal = new THREE.Vector3(
      left - right,
      GROUND_MASK_SAMPLE_DISTANCE * 2,
      down - up,
    ).normalize();
    const minHeight = Math.min(center, left, right, down, up);
    const maxHeight = Math.max(center, left, right, down, up);
    const slopeMask = smoothstepRange(0.76, 0.94, normal.y);
    const reliefRatio = (maxHeight - minHeight) / (GROUND_MASK_SAMPLE_DISTANCE * 2);
    const smoothMask = 1 - smoothstepRange(0.22, 0.62, reliefRatio);

    return THREE.MathUtils.clamp(slopeMask * smoothMask, 0, 1);
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
    const luminance = this.getPixelLuminance(index) / 255;

    return luminance * MAX_HEIGHT;
  }

  getPixelLuminance(index) {
    const r = this.heightData[index];
    const g = this.heightData[index + 1];
    const b = this.heightData[index + 2];

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
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

async function loadTerrainTextures() {
  const loader = new THREE.TextureLoader();
  const [
    frozenDirt,
    scree,
    rock,
    rockNormal,
    snow,
    gravelAlbedo,
    gravelNormal,
    riverBank,
    riverBed,
  ] = await Promise.all([
    loader.loadAsync(FROZEN_DIRT_TEXTURE_PATH),
    loader.loadAsync(ALPINE_SCREE_TEXTURE_PATH),
    loader.loadAsync(ALPINE_ROCK_TEXTURE_PATH),
    loader.loadAsync(ALPINE_ROCK_NORMAL_TEXTURE_PATH),
    loader.loadAsync(ALPINE_SNOW_TEXTURE_PATH),
    loader.loadAsync(GRAVEL_ALBEDO_TEXTURE_PATH),
    loader.loadAsync(GRAVEL_NORMAL_TEXTURE_PATH),
    loader.loadAsync(RIVER_BANK_TEXTURE_PATH),
    loader.loadAsync(RIVER_BED_TEXTURE_PATH),
  ]);

  for (const texture of [frozenDirt, scree, rock, snow, gravelAlbedo, riverBank, riverBed]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
  }

  for (const texture of [rockNormal, gravelNormal]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = 8;
  }

  return {
    frozenDirt,
    scree,
    rock,
    rockNormal,
    snow,
    gravelAlbedo,
    gravelNormal,
    riverBank,
    riverBed,
  };
}

function createTerrainMaterial(textures) {
  return new THREE.ShaderMaterial({
    lights: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.lights,
      {
        uFrozenDirtTexture: { value: textures.frozenDirt },
        uScreeTexture: { value: textures.scree },
        uRockTexture: { value: textures.rock },
        uRockNormalTexture: { value: textures.rockNormal },
        uSnowTexture: { value: textures.snow },
        uGravelAlbedoTexture: { value: textures.gravelAlbedo },
        uGravelNormalTexture: { value: textures.gravelNormal },
        uRiverBankTexture: { value: textures.riverBank },
        uRiverBedTexture: { value: textures.riverBed },
        uTextureWorldSize: { value: GROUND_TEXTURE_WORLD_SIZE },
        uGravelTextureWorldSize: { value: GRAVEL_TEXTURE_WORLD_SIZE },
        uRiverBankTextureWorldSize: { value: RIVER_BANK_TEXTURE_WORLD_SIZE },
        uRiverBedTextureWorldSize: { value: RIVER_BED_TEXTURE_WORLD_SIZE },
        uSunDirection: { value: SUN_LIGHT_DIRECTION.clone() },
        uSkyLightColor: { value: new THREE.Color(0xe4f4ff) },
        uGroundLightColor: { value: new THREE.Color(0x8ca46d) },
        uSunLightColor: { value: new THREE.Color(0xfff4d6) },
      },
    ]),
    vertexShader: `
      #include <common>
      #include <shadowmap_pars_vertex>

      uniform float uTextureWorldSize;
      uniform float uRiverBankTextureWorldSize;

      attribute float groundMask;
      attribute float riverMask;
      attribute float riverBedMask;
      attribute float riverUnderwaterMask;
      attribute vec4 waterSystemMask;
      attribute vec2 riverBedCoord;
      attribute float smallLakesMask;

      varying vec2 vWorldUv;
      varying vec2 vRiverBankUv;
      varying vec2 vRiverBedCoord;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying float vWorldHeight;
      varying float vGroundMask;
      varying float vRiverMask;
      varying float vRiverBedMask;
      varying float vRiverUnderwaterMask;
      varying vec4 vWaterSystemMask;
      varying float vSmallLakesMask;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vec3 transformedNormal = normalize(normalMatrix * normal);

        vWorldUv = worldPosition.xz / uTextureWorldSize;
        vRiverBankUv = worldPosition.xz / uRiverBankTextureWorldSize;
        vRiverBedCoord = riverBedCoord;
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vWorldHeight = worldPosition.y;
        vGroundMask = groundMask;
        vRiverMask = riverMask;
        vRiverBedMask = riverBedMask;
        vRiverUnderwaterMask = riverUnderwaterMask;
        vWaterSystemMask = waterSystemMask;
        vSmallLakesMask = smallLakesMask;

        gl_Position = projectionMatrix * viewMatrix * worldPosition;
        #include <shadowmap_vertex>
      }
    `,
    fragmentShader: `
      #include <common>
      #include <packing>
      #include <lights_pars_begin>
      #include <shadowmap_pars_fragment>
      #include <shadowmask_pars_fragment>

      uniform sampler2D uFrozenDirtTexture;
      uniform sampler2D uScreeTexture;
      uniform sampler2D uRockTexture;
      uniform sampler2D uRockNormalTexture;
      uniform sampler2D uSnowTexture;
      uniform sampler2D uGravelAlbedoTexture;
      uniform sampler2D uGravelNormalTexture;
      uniform sampler2D uRiverBankTexture;
      uniform sampler2D uRiverBedTexture;
      uniform float uTextureWorldSize;
      uniform float uGravelTextureWorldSize;
      uniform float uRiverBedTextureWorldSize;
      uniform vec3 uSunDirection;
      uniform vec3 uSkyLightColor;
      uniform vec3 uGroundLightColor;
      uniform vec3 uSunLightColor;

      varying vec2 vWorldUv;
      varying vec2 vRiverBankUv;
      varying vec2 vRiverBedCoord;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying float vWorldHeight;
      varying float vGroundMask;
      varying float vRiverMask;
      varying float vRiverBedMask;
      varying float vRiverUnderwaterMask;
      varying vec4 vWaterSystemMask;
      varying float vSmallLakesMask;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);

        return mix(a, b, u.x)
          + (c - a) * u.y * (1.0 - u.x)
          + (d - b) * u.x * u.y;
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;

        for (int i = 0; i < 4; i += 1) {
          value += noise(p) * amplitude;
          p = p * 2.02 + vec2(7.3, 13.1);
          amplitude *= 0.5;
        }

        return value;
      }

      vec3 applyDetailNormal(vec3 baseNormal, vec2 worldPosition, float groundInfluence, float rockInfluence, float wetInfluence) {
        float detailScale = mix(1.8, 4.2, clamp(rockInfluence, 0.0, 1.0));
        vec2 p = worldPosition * detailScale;
        float sampleOffset = 0.23;
        float hL = fbm((p - vec2(sampleOffset, 0.0)) * 0.92);
        float hR = fbm((p + vec2(sampleOffset, 0.0)) * 0.92);
        float hD = fbm((p - vec2(0.0, sampleOffset)) * 0.92);
        float hU = fbm((p + vec2(0.0, sampleOffset)) * 0.92);
        vec2 gradient = vec2(hR - hL, hU - hD);
        float strength = groundInfluence * 0.13 + rockInfluence * 0.24 + wetInfluence * 0.08;

        return normalize(baseNormal + vec3(-gradient.x, 0.0, -gradient.y) * strength);
      }

      vec3 sampleTriplanarTexture(sampler2D terrainTexture, vec3 worldPosition, vec3 worldNormal, float textureScale, vec2 offset) {
        vec3 blend = pow(abs(worldNormal), vec3(4.0));
        blend /= max(blend.x + blend.y + blend.z, 0.0001);

        vec3 xSample = texture2D(terrainTexture, worldPosition.zy / uTextureWorldSize * textureScale + offset).rgb;
        vec3 ySample = texture2D(terrainTexture, worldPosition.xz / uTextureWorldSize * textureScale + offset).rgb;
        vec3 zSample = texture2D(terrainTexture, worldPosition.xy / uTextureWorldSize * textureScale + offset).rgb;

        return xSample * blend.x + ySample * blend.y + zSample * blend.z;
      }

      vec3 sampleTriplanarNormal(sampler2D normalTexture, vec3 worldPosition, vec3 worldNormal, float textureScale, vec2 offset) {
        vec3 blend = pow(abs(worldNormal), vec3(4.0));
        blend /= max(blend.x + blend.y + blend.z, 0.0001);
        vec3 axisSign = vec3(
          worldNormal.x < 0.0 ? -1.0 : 1.0,
          worldNormal.y < 0.0 ? -1.0 : 1.0,
          worldNormal.z < 0.0 ? -1.0 : 1.0
        );

        vec3 xNormal = texture2D(normalTexture, worldPosition.zy / uTextureWorldSize * textureScale + offset).rgb * 2.0 - 1.0;
        vec3 yNormal = texture2D(normalTexture, worldPosition.xz / uTextureWorldSize * textureScale + offset).rgb * 2.0 - 1.0;
        vec3 zNormal = texture2D(normalTexture, worldPosition.xy / uTextureWorldSize * textureScale + offset).rgb * 2.0 - 1.0;

        vec3 xWorld = normalize(vec3(xNormal.z * axisSign.x, xNormal.y, xNormal.x));
        vec3 yWorld = normalize(vec3(yNormal.x, yNormal.z * axisSign.y, yNormal.y));
        vec3 zWorld = normalize(vec3(zNormal.x, zNormal.y, zNormal.z * axisSign.z));

        return normalize(xWorld * blend.x + yWorld * blend.y + zWorld * blend.z);
      }

      void main() {
        vec3 normal = normalize(vWorldNormal);
        vec2 blendUv = vWorldUv * uTextureWorldSize;

        vec3 frozenDirt = texture2D(uFrozenDirtTexture, vWorldUv * 0.88 + vec2(4.7, -8.2)).rgb;
        vec3 scree = texture2D(uScreeTexture, vWorldUv * 0.78 + vec2(-13.0, 9.4)).rgb;
        vec3 rock = sampleTriplanarTexture(uRockTexture, vWorldPosition, normal, 0.62, vec2(21.0, 6.0));
        vec3 snow = texture2D(uSnowTexture, vWorldUv * 0.82 + vec2(-5.5, -17.0)).rgb;
        vec2 gravelUv = vWorldPosition.xz / uGravelTextureWorldSize;
        float gravelWarp = (fbm(vWorldPosition.xz * 0.038 + vec2(6.0, -11.0)) - 0.5) * 0.08;
        vec3 gravelA = texture2D(uGravelAlbedoTexture, gravelUv + gravelWarp).rgb;
        vec3 gravelB = texture2D(uGravelAlbedoTexture, gravelUv * 0.57 + vec2(17.0, -9.0)).rgb;
        vec3 gravel = mix(gravelA, gravelB, 0.22);
        vec3 riverBank = texture2D(uRiverBankTexture, vRiverBankUv).rgb;
        vec2 lakeBedUv = vWorldUv * uTextureWorldSize / uRiverBedTextureWorldSize;
        float lakeMaskFactor = smoothstep(0.05, 0.95, vSmallLakesMask);
        vec2 riverBedUv = mix(
          vec2(vRiverBedCoord.x / uRiverBedTextureWorldSize, vRiverBedCoord.y / 3.6),
          lakeBedUv,
          lakeMaskFactor
        );
        float riverBedWarp = (fbm(vec2(vRiverBedCoord.x * 0.055, vRiverBedCoord.y * 0.35)) - 0.5) * 0.18;
        riverBedUv += vec2(riverBedWarp, riverBedWarp * 0.45);
        vec3 riverBedA = texture2D(uRiverBedTexture, riverBedUv).rgb;
        vec3 riverBedB = texture2D(uRiverBedTexture, riverBedUv * vec2(0.61, 1.27) + vec2(12.7, -4.4)).rgb;
        vec3 riverBed = mix(riverBedA, riverBedB, 0.28);

        float dryPatch = smoothstep(0.52, 0.82, fbm(blendUv * 0.09 + vec2(-11.0, 3.5)));
        float gravelPatch = smoothstep(0.46, 0.78, fbm(blendUv * 0.13 + vec2(5.4, 18.0)));
        float soilNoise = fbm(blendUv * 0.055 + vec2(3.0, -9.0));
        float fineNoise = fbm(vWorldPosition.xz * 1.75 + vec2(19.0, -6.0));
        vec3 groundColor = mix(vec3(0.28, 0.20, 0.12), vec3(0.42, 0.32, 0.19), soilNoise);
        groundColor = mix(groundColor, vec3(0.50, 0.42, 0.25), dryPatch * 0.28);
        groundColor = mix(groundColor, vec3(0.31, 0.29, 0.24), gravelPatch * 0.18);
        groundColor *= mix(0.92, 1.08, fineNoise);

        float heightNoise = (fbm(blendUv * 0.025 + vec2(8.0, -14.0)) - 0.5) * 34.0;
        float noisyHeight = vWorldHeight + heightNoise;
        float lowGroundFade = 1.0 - smoothstep(130.0, 185.0, noisyHeight);
        float groundMask = smoothstep(0.08, 0.82, vGroundMask) * lowGroundFade;
        float midSlopeMask = smoothstep(0.50, 0.68, normal.y) * (1.0 - smoothstep(0.78, 0.92, normal.y));
        float screeMask = smoothstep(75.0, 120.0, noisyHeight) * (1.0 - smoothstep(235.0, 275.0, noisyHeight));
        screeMask *= smoothstep(0.16, 0.76, max(midSlopeMask, 1.0 - vGroundMask));
        float rockMask = max(
          1.0 - smoothstep(0.48, 0.72, normal.y),
          smoothstep(190.0, 260.0, noisyHeight) * (1.0 - smoothstep(0.74, 0.92, normal.y))
        );
        float snowHeightMask = smoothstep(130.0, 200.0, noisyHeight);
        float snowSlopeMask = smoothstep(0.52, 0.82, normal.y);
        float snowNoiseMask = smoothstep(0.22, 0.88, fbm(blendUv * 0.055 + vec2(-3.0, 12.0)));
        float snowMask = snowHeightMask * snowSlopeMask * mix(0.72, 1.15, snowNoiseMask);

        vec3 alpineColor = mix(frozenDirt, scree, clamp(screeMask, 0.0, 1.0));
        alpineColor = mix(alpineColor, rock, clamp(rockMask, 0.0, 1.0));
        alpineColor = mix(alpineColor, snow, clamp(snowMask, 0.0, 1.0));
        vec3 baseColor = mix(alpineColor, groundColor, groundMask);
        float gravelHeightMask = 1.0 - smoothstep(95.0, 155.0, noisyHeight);
        float gravelFlatMask = smoothstep(0.66, 0.92, normal.y);
        float gravelLayerMask = groundMask * gravelHeightMask * gravelFlatMask * mix(0.32, 1.0, gravelPatch);
        baseColor = mix(baseColor, gravel * vec3(1.08, 1.06, 1.0), clamp(gravelLayerMask * 0.82, 0.0, 1.0));
        float riverSlopeMask = 1.0 - smoothstep(0.90, 0.985, normal.y);
        float riverMaterialMask = smoothstep(0.05, 0.95, vRiverMask);
        float riverUnderwaterMask = smoothstep(0.05, 0.95, vRiverUnderwaterMask);
        float riverMask = riverMaterialMask * max(riverSlopeMask, riverUnderwaterMask);
        baseColor = mix(baseColor, riverBank, riverMask);
        float riverBedMask = smoothstep(0.05, 0.95, vRiverBedMask);
        baseColor = mix(baseColor, riverBed, riverBedMask);
        float lakeBedMask = smoothstep(0.04, 0.92, vWaterSystemMask.x);
        float wetShoreMask = smoothstep(0.05, 0.95, vWaterSystemMask.y);
        float snowmeltWetMask = smoothstep(0.05, 0.92, vWaterSystemMask.z);
        float plungeMask = smoothstep(0.05, 0.9, vWaterSystemMask.w);
        vec3 lakeBedColor = mix(riverBed, riverBank, 0.32);
        vec3 wetRockColor = mix(rock, riverBank, 0.35) * vec3(0.58, 0.66, 0.68);
        vec3 plungeColor = mix(riverBed, vec3(0.74, 0.86, 0.88), 0.35);
        baseColor = mix(baseColor, lakeBedColor, lakeBedMask);
        baseColor = mix(baseColor, riverBank, wetShoreMask * 0.42);
        baseColor = mix(baseColor, plungeColor, plungeMask * 0.78);
        baseColor = mix(baseColor, wetRockColor, max(wetShoreMask * 0.65, snowmeltWetMask * 0.9));

        float detailShade = fbm(blendUv * 3.1 + vec2(19.0, -6.0));
        float materialDetail = groundMask * 0.08 + max(screeMask, rockMask) * 0.12 + wetShoreMask * 0.06;
        baseColor *= mix(1.0 - materialDetail, 1.0 + materialDetail, detailShade);

        float rockInfluence = clamp(max(screeMask, rockMask), 0.0, 1.0);
        float wetInfluence = clamp(max(wetShoreMask, snowmeltWetMask), 0.0, 1.0);
        vec3 surfaceNormal = applyDetailNormal(normal, vWorldPosition.xz, groundMask, rockInfluence, wetInfluence);
        float gravelWaterFade = 1.0 - clamp(max(max(riverMask, riverBedMask), max(lakeBedMask, wetShoreMask)), 0.0, 1.0);
        float gravelNormalMask = gravelLayerMask * gravelWaterFade;
        vec3 gravelNormalSample = texture2D(uGravelNormalTexture, gravelUv).rgb * 2.0 - 1.0;
        vec3 gravelMappedNormal = normalize(vec3(gravelNormalSample.x, gravelNormalSample.z, gravelNormalSample.y));
        surfaceNormal = normalize(mix(surfaceNormal, gravelMappedNormal, gravelNormalMask * 0.55));
        float rockNormalMask = smoothstep(0.42, 0.92, rockMask);
        vec3 rockMappedNormal = sampleTriplanarNormal(uRockNormalTexture, vWorldPosition, normal, 0.62, vec2(21.0, 6.0));
        surfaceNormal = normalize(mix(surfaceNormal, rockMappedNormal, rockNormalMask * 0.48));
        float sunLight = max(dot(surfaceNormal, normalize(uSunDirection)), 0.0);
        float rawShadowMask = getShadowMask();
        float shadowMask = mix(0.18, 1.0, rawShadowMask);
        float ambientShadow = mix(0.72, 1.0, rawShadowMask);
        float skyLight = surfaceNormal.y * 0.5 + 0.5;
        vec3 ambient = mix(uGroundLightColor, uSkyLightColor, skyLight) * 0.78;
        vec3 litColor = baseColor * (ambient * ambientShadow + uSunLightColor * sunLight * shadowMask * 0.62);
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        vec3 halfDir = normalize(normalize(uSunDirection) + viewDir);
        float wetSpec = pow(max(dot(surfaceNormal, halfDir), 0.0), 72.0);
        float glancing = pow(1.0 - max(dot(viewDir, surfaceNormal), 0.0), 3.0);
        float wetReflect = max(wetShoreMask * 0.4, snowmeltWetMask) * max(wetSpec * 0.9, glancing * 0.16) * shadowMask;
        litColor += vec3(0.78, 0.95, 1.0) * wetReflect;

        gl_FragColor = vec4(litColor, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function getHeightDither(x, z) {
  return valueNoise(x * HEIGHT_DITHER_FREQUENCY, z * HEIGHT_DITHER_FREQUENCY)
    * HEIGHT_DITHER_AMPLITUDE;
}

function valueNoise(x, z) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = smoothstep(x - x0);
  const tz = smoothstep(z - z0);
  const a = random2d(x0, z0);
  const b = random2d(x0 + 1, z0);
  const c = random2d(x0, z0 + 1);
  const d = random2d(x0 + 1, z0 + 1);
  const top = THREE.MathUtils.lerp(a, b, tx);
  const bottom = THREE.MathUtils.lerp(c, d, tx);

  return THREE.MathUtils.lerp(top, bottom, tz) * 2 - 1;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function smoothstepRange(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return smoothstep(t);
}

function random2d(x, z) {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;

  return value - Math.floor(value);
}
