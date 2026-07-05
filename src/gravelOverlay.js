import * as THREE from 'three';
import { isInRiverGrassExclusion } from './riverChannel.js';
import { isInSmallLakeExclusion } from './smallLakes.js';
import { isInWaterSystemVegetationExclusion } from './waterSystem.js';
import {
  GRAVEL_OVERLAY_CHUNK_MUTATIONS,
  GRAVEL_OVERLAY_RADIUS,
  GRAVEL_OVERLAY_TEXTURE_WORLD_SIZE,
  GRAVEL_OVERLAY_VERTEX_SPACING,
  GRAVEL_OVERLAY_Y_OFFSET,
  KEEP_ALIVE_PADDING,
  MAP_SIZE,
  ZONE_SIZE,
} from './vegetationConfig.js';

const GRAVEL_ALBEDO_TEXTURE_PATH = '/assets/terrain/materials/gravel_albedo.png';
const GRAVEL_NORMAL_TEXTURE_PATH = '/assets/terrain/materials/gravel_normal.png';
const HALF_MAP_SIZE = MAP_SIZE / 2;
const WATER_EXCLUSION_BUFFER = 1.5;
const COVERAGE_THRESHOLD = 0.08;

export async function createGravelOverlay(terrain) {
  const textures = await loadGravelOverlayTextures();

  return new GravelOverlayManager(terrain, textures);
}

export class GravelOverlayManager {
  constructor(terrain, textures) {
    this.terrain = terrain;
    this.group = new THREE.Group();
    this.group.name = 'GravelOverlay';
    this.material = createGravelOverlayMaterial(textures);
    this.chunks = new Map();
  }

  update(centerPosition) {
    const centerChunkX = Math.floor((centerPosition.x + HALF_MAP_SIZE) / ZONE_SIZE);
    const centerChunkZ = Math.floor((centerPosition.z + HALF_MAP_SIZE) / ZONE_SIZE);
    const chunkRadius = Math.ceil((GRAVEL_OVERLAY_RADIUS + KEEP_ALIVE_PADDING) / ZONE_SIZE);
    const neededKeys = new Set();

    for (let dz = -chunkRadius; dz <= chunkRadius; dz += 1) {
      for (let dx = -chunkRadius; dx <= chunkRadius; dx += 1) {
        const chunkX = centerChunkX + dx;
        const chunkZ = centerChunkZ + dz;
        const minX = chunkX * ZONE_SIZE - HALF_MAP_SIZE;
        const minZ = chunkZ * ZONE_SIZE - HALF_MAP_SIZE;
        const maxX = minX + ZONE_SIZE;
        const maxZ = minZ + ZONE_SIZE;

        if (maxX < -HALF_MAP_SIZE || minX > HALF_MAP_SIZE) continue;
        if (maxZ < -HALF_MAP_SIZE || minZ > HALF_MAP_SIZE) continue;

        const centerX = minX + ZONE_SIZE / 2;
        const centerZ = minZ + ZONE_SIZE / 2;
        const distance = Math.hypot(centerX - centerPosition.x, centerZ - centerPosition.z);

        if (distance > GRAVEL_OVERLAY_RADIUS + KEEP_ALIVE_PADDING) continue;
        neededKeys.add(`${chunkX},${chunkZ}`);
      }
    }

    const staleKeys = [];
    for (const key of this.chunks.keys()) {
      if (!neededKeys.has(key)) staleKeys.push(key);
    }

    for (let i = 0; i < Math.min(staleKeys.length, GRAVEL_OVERLAY_CHUNK_MUTATIONS); i += 1) {
      this.removeChunk(staleKeys[i]);
    }

    const missing = [];
    for (const key of neededKeys) {
      if (this.chunks.has(key)) continue;
      const [chunkX, chunkZ] = key.split(',').map(Number);
      const centerX = chunkX * ZONE_SIZE - HALF_MAP_SIZE + ZONE_SIZE / 2;
      const centerZ = chunkZ * ZONE_SIZE - HALF_MAP_SIZE + ZONE_SIZE / 2;

      missing.push({
        key,
        chunkX,
        chunkZ,
        distance: Math.hypot(centerX - centerPosition.x, centerZ - centerPosition.z),
      });
    }

    missing.sort((a, b) => a.distance - b.distance);

    for (let i = 0; i < Math.min(missing.length, GRAVEL_OVERLAY_CHUNK_MUTATIONS); i += 1) {
      this.addChunk(missing[i].key, missing[i].chunkX, missing[i].chunkZ);
    }
  }

  addChunk(key, chunkX, chunkZ) {
    const minX = chunkX * ZONE_SIZE - HALF_MAP_SIZE;
    const minZ = chunkZ * ZONE_SIZE - HALF_MAP_SIZE;
    const mesh = createGravelChunkMesh(this.terrain, this.material, minX, minZ);

    if (!mesh) {
      this.chunks.set(key, null);
      return;
    }

    this.chunks.set(key, mesh);
    this.group.add(mesh);
  }

  removeChunk(key) {
    const mesh = this.chunks.get(key);

    if (mesh) {
      this.group.remove(mesh);
      mesh.geometry.dispose();
    }

    this.chunks.delete(key);
  }

  dispose() {
    for (const key of this.chunks.keys()) {
      this.removeChunk(key);
    }

    this.material.dispose();
  }
}

async function loadGravelOverlayTextures() {
  const loader = new THREE.TextureLoader();
  const [albedo, normal] = await Promise.all([
    loader.loadAsync(GRAVEL_ALBEDO_TEXTURE_PATH),
    loader.loadAsync(GRAVEL_NORMAL_TEXTURE_PATH),
  ]);

  for (const texture of [albedo]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
  }

  for (const texture of [normal]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = 8;
  }

  return { albedo, normal };
}

function createGravelChunkMesh(terrain, material, minX, minZ) {
  const segments = Math.ceil(ZONE_SIZE / GRAVEL_OVERLAY_VERTEX_SPACING);
  const verticesPerSide = segments + 1;
  const vertexCount = verticesPerSide * verticesPerSide;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const coverages = new Float32Array(vertexCount);
  const indices = [];
  let positionOffset = 0;
  let uvOffset = 0;
  let coverageOffset = 0;

  for (let z = 0; z <= segments; z += 1) {
    for (let x = 0; x <= segments; x += 1) {
      const worldX = minX + x * GRAVEL_OVERLAY_VERTEX_SPACING;
      const worldZ = minZ + z * GRAVEL_OVERLAY_VERTEX_SPACING;
      const height = terrain.getHeightAt(worldX, worldZ);
      const coverage = getGravelCoverage(terrain, worldX, worldZ);

      positions[positionOffset] = worldX;
      positions[positionOffset + 1] = height + GRAVEL_OVERLAY_Y_OFFSET;
      positions[positionOffset + 2] = worldZ;
      positionOffset += 3;

      uvs[uvOffset] = worldX / GRAVEL_OVERLAY_TEXTURE_WORLD_SIZE;
      uvs[uvOffset + 1] = worldZ / GRAVEL_OVERLAY_TEXTURE_WORLD_SIZE;
      uvOffset += 2;

      coverages[coverageOffset] = coverage;
      coverageOffset += 1;
    }
  }

  for (let z = 0; z < segments; z += 1) {
    for (let x = 0; x < segments; x += 1) {
      const topLeft = z * verticesPerSide + x;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + verticesPerSide;
      const bottomRight = bottomLeft + 1;
      const coverage = (
        coverages[topLeft]
        + coverages[topRight]
        + coverages[bottomLeft]
        + coverages[bottomRight]
      ) * 0.25;

      if (coverage < COVERAGE_THRESHOLD) continue;

      indices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight);
    }
  }

  if (indices.length === 0) return null;

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('coverage', new THREE.BufferAttribute(coverages, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `GravelOverlay_${minX}_${minZ}`;
  mesh.receiveShadow = true;
  mesh.renderOrder = 2;

  return mesh;
}

function getGravelCoverage(terrain, x, z) {
  if (isInRiverGrassExclusion(x, z, WATER_EXCLUSION_BUFFER)) return 0;
  if (isInWaterSystemVegetationExclusion(x, z, WATER_EXCLUSION_BUFFER)) return 0;
  if (isInSmallLakeExclusion(x, z)) return 0;

  const height = terrain.getHeightAt(x, z);
  const normal = terrain.getNormalAt(x, z);
  const groundMask = smoothstep(0.08, 0.82, terrain.getTerrainGroundMask(x, z));
  const heightMask = 1 - smoothstep(95, 155, height);
  const flatMask = smoothstep(0.66, 0.92, normal.y);
  const gravelPatch = smoothstep(0.46, 0.78, fbm(x * 0.13 + 5.4, z * 0.13 + 18.0));
  const breakup = smoothstep(0.22, 0.64, fbm(x * 0.19 - 8.0, z * 0.19 + 3.0));

  return THREE.MathUtils.clamp(
    groundMask * heightMask * flatMask * THREE.MathUtils.lerp(0.28, 1.0, gravelPatch) * breakup,
    0,
    1,
  );
}

function createGravelOverlayMaterial(textures) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x8c8373,
    map: textures.albedo,
    normalMap: textures.normal,
    normalScale: new THREE.Vector2(0.46, 0.46),
    roughness: 0.94,
    metalness: 0,
    alphaTest: 0.3,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  material.name = 'GravelOverlayMaterial';
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float coverage;
varying float vGravelCoverage;
varying vec3 vGravelWorldPosition;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vGravelCoverage = coverage;`,
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
vGravelWorldPosition = worldPosition.xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying float vGravelCoverage;
varying vec3 vGravelWorldPosition;

float gravelHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float gravelNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = gravelHash(i);
  float b = gravelHash(i + vec2(1.0, 0.0));
  float c = gravelHash(i + vec2(0.0, 1.0));
  float d = gravelHash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(a, b, u.x)
    + (c - a) * u.y * (1.0 - u.x)
    + (d - b) * u.x * u.y;
}

float gravelFbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 4; i += 1) {
    value += gravelNoise(p) * amplitude;
    p = p * 2.02 + vec2(7.3, 13.1);
    amplitude *= 0.5;
  }

  return value;
}`,
      )
      .replace(
        '#include <alphatest_fragment>',
        `float gravelEdgeNoise = gravelFbm(vGravelWorldPosition.xz * 0.45);
float gravelAlpha = smoothstep(0.16, 0.58, vGravelCoverage + (gravelEdgeNoise - 0.5) * 0.42);
diffuseColor.a *= gravelAlpha;
#include <alphatest_fragment>`,
      )
      .replace(
        '#include <dithering_fragment>',
        `float gravelToneNoise = gravelFbm(vGravelWorldPosition.xz * 1.15);
gl_FragColor.rgb *= mix(0.72, 1.02, gravelToneNoise);
#include <dithering_fragment>`,
      );
  };
  material.customProgramCacheKey = () => 'terrain-following-gravel-overlay-v1';

  return material;
}

function fbm(x, z) {
  let value = 0;
  let amplitude = 0.5;
  let px = x;
  let pz = z;

  for (let i = 0; i < 4; i += 1) {
    value += noise(px, pz) * amplitude;
    const nextX = px * 2.02 + 7.3;
    const nextZ = pz * 2.02 + 13.1;

    px = nextX;
    pz = nextZ;
    amplitude *= 0.5;
  }

  return value;
}

function noise(x, z) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = x - x0;
  const tz = z - z0;
  const a = hash2(x0, z0);
  const b = hash2(x0 + 1, z0);
  const c = hash2(x0, z0 + 1);
  const d = hash2(x0 + 1, z0 + 1);
  const ux = tx * tx * (3 - 2 * tx);
  const uz = tz * tz * (3 - 2 * tz);

  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(a, b, ux),
    THREE.MathUtils.lerp(c, d, ux),
    uz,
  );
}

function hash2(x, z) {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;

  return value - Math.floor(value);
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}
