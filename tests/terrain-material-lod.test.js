import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { Terrain } from '../src/terrain.js';
import {
  createTerrainMaterials,
  getTerrainMaterialForSegments,
  TERRAIN_MATERIAL_LOD,
} from '../src/terrainMaterial.js';

function createTextures() {
  const texture = new THREE.Texture();

  return {
    rock: texture,
    rockNormal: texture,
    groundDirtAlbedo: texture,
    groundDirtNormal: texture,
    forestFloorBaseColor: texture,
    forestFloorNormal: texture,
    dryGrassAlbedo: texture,
    dryGrassNormal: texture,
    gravelAlbedo: texture,
    gravelNormal: texture,
    blendSplat: texture,
    riverBank: texture,
    riverBed: texture,
  };
}

function createOptions() {
  return {
    mapWorldSize: 2048,
    alpineTextureWorldSize: 8,
    groundDirtTextureWorldSize: 7,
    forestFloorTextureWorldSize: 2,
    dryGrassTextureWorldSize: 6.5,
    gravelTextureWorldSize: 4.5,
    riverBankTextureWorldSize: 6,
    riverBedTextureWorldSize: 5,
  };
}

function createTerrain() {
  const size = 8;
  const heightData = new Uint8ClampedArray(size * size * 4);

  heightData.fill(128);
  return new Terrain(heightData, size, size, createTextures(), {
    minimumSegmentsForChunk: () => 0,
  });
}

function createChunkTask(segments) {
  const verticesPerSide = segments + 1;
  const vertexCount = verticesPerSide * verticesPerSide;

  return {
    key: `0,0-${segments}`,
    chunkX: 0,
    chunkZ: 0,
    minX: -1024,
    minZ: -1024,
    segments,
    revision: 0,
    edgeMinimums: new Float32Array([0, 0, 0, 0]),
    arrays: {
      positions: new Float32Array(vertexCount * 3),
      normals: new Float32Array(vertexCount * 3),
      uvs: new Float32Array(vertexCount * 2),
      groundMasks: new Float32Array(vertexCount),
      riverMasks: new Float32Array(vertexCount),
      riverBedMasks: new Float32Array(vertexCount),
      riverUnderwaterMasks: new Float32Array(vertexCount),
      riverBedCoords: new Float32Array(vertexCount * 2),
      waterSystemMasks: new Float32Array(vertexCount * 4),
      smallLakeMasks: new Float32Array(vertexCount),
      indices: new Uint32Array(segments * segments * 6),
    },
  };
}

test('terrain material factory creates shared Near, Medium and Far variants with locked budgets', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());

  assert.ok(materials.near instanceof THREE.MeshStandardMaterial);
  assert.ok(materials.medium instanceof THREE.MeshStandardMaterial);
  assert.ok(materials.far instanceof THREE.MeshStandardMaterial);
  assert.notEqual(materials.near, materials.medium);
  assert.notEqual(materials.medium, materials.far);
  assert.equal(materials.near.userData.terrainMaterialLod, TERRAIN_MATERIAL_LOD.NEAR);
  assert.equal(materials.medium.userData.terrainMaterialLod, TERRAIN_MATERIAL_LOD.MEDIUM);
  assert.equal(materials.far.userData.terrainMaterialLod, TERRAIN_MATERIAL_LOD.FAR);
  assert.ok(materials.near.userData.terrainTextureBudget.maximum <= 14);
  assert.ok(materials.medium.userData.terrainTextureBudget.maximum <= 8);
  assert.ok(materials.far.userData.terrainTextureBudget.maximum <= 4);
  assert.equal(materials.near.userData.terrainReceivesShadow, true);
  assert.equal(materials.medium.userData.terrainReceivesShadow, true);
  assert.equal(materials.far.userData.terrainReceivesShadow, false);
});

test('all material variants compute masks before sampling branches and preserve water masks', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());

  for (const material of Object.values(materials)) {
    const { vertexAssignments, fragmentParameters, mapFragment } = material.userData.terrainShaderSource;
    const firstMaterialSample = mapFragment.indexOf('sampleTerrainLayer(');

    assert.ok(mapFragment.indexOf('float terrainWaterBedMask') < firstMaterialSample);
    assert.match(mapFragment, /vTerrainRiverMask/);
    assert.match(mapFragment, /vTerrainRiverBedMask/);
    assert.match(mapFragment, /vTerrainWaterSystemMask/);
    assert.match(mapFragment, /vTerrainSmallLakesMask/);
    assert.match(mapFragment, /uRiverBankTexture/);
    assert.match(mapFragment, /uRiverBedTexture/);
    assert.match(vertexAssignments, /vTerrainMacro = vec4/);
    assert.doesNotMatch(`${fragmentParameters}\n${mapFragment}`, /displacement|applyDetailNormal|applyForestFloorHeightNormal|fbm/i);
  }
});

test('Near restores the baked forest floor while lower material LODs keep branch-limited sampling', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());
  const nearSource = materials.near.userData.terrainShaderSource.mapFragment;
  const mediumSource = materials.medium.userData.terrainShaderSource.mapFragment;
  const farSource = materials.far.userData.terrainShaderSource.mapFragment;

  assert.match(nearSource, /uForestFloorBaseColorTexture/);
  assert.match(nearSource, /uForestFloorNormalTexture/);
  assert.doesNotMatch(nearSource, /terrainForestFloorWeight >=/);
  assert.match(mediumSource, /terrainForestFloorWeight >=/);
  assert.match(mediumSource, /uForestFloorNormalTexture/);
  assert.match(farSource, /uForestFloorBaseColorTexture/);
  assert.doesNotMatch(farSource, /uForestFloorNormalTexture/);
});

test('material selection follows chunk geometry resolution', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());

  assert.equal(getTerrainMaterialForSegments(materials, 256), materials.near);
  assert.equal(getTerrainMaterialForSegments(materials, 128), materials.medium);
  assert.equal(getTerrainMaterialForSegments(materials, 64), materials.far);
});

test('Terrain assigns material LOD and disables shadow receiving on Far chunks', () => {
  const terrain = createTerrain();
  const near = terrain.createChunkRecord(createChunkTask(256));
  const medium = terrain.createChunkRecord(createChunkTask(128));
  const far = terrain.createChunkRecord(createChunkTask(64));

  assert.equal(near.surface.material, terrain.materials.near);
  assert.equal(medium.surface.material, terrain.materials.medium);
  assert.equal(far.surface.material, terrain.materials.far);
  assert.equal(near.surface.userData.terrainMaterialLod, TERRAIN_MATERIAL_LOD.NEAR);
  assert.equal(medium.surface.userData.terrainMaterialLod, TERRAIN_MATERIAL_LOD.MEDIUM);
  assert.equal(far.surface.userData.terrainMaterialLod, TERRAIN_MATERIAL_LOD.FAR);
  assert.equal(near.surface.receiveShadow, true);
  assert.equal(medium.surface.receiveShadow, true);
  assert.equal(far.surface.receiveShadow, false);

  near.surface.geometry.dispose();
  near.skirt.geometry.dispose();
  medium.surface.geometry.dispose();
  medium.skirt.geometry.dispose();
  far.surface.geometry.dispose();
  far.skirt.geometry.dispose();
  terrain.dispose();
});

test('Terrain owns and disposes shared material variants exactly once', () => {
  const terrain = createTerrain();
  const disposeCounts = new Map();

  for (const material of Object.values(terrain.materials)) {
    disposeCounts.set(material, 0);
    material.addEventListener('dispose', () => {
      disposeCounts.set(material, disposeCounts.get(material) + 1);
    });
  }

  terrain.dispose();
  assert.deepEqual([...disposeCounts.values()], [1, 1, 1]);
});
