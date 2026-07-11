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
    snow: texture,
    groundDirtAlbedo: texture,
    groundDirtNormal: texture,
    forestFloorBaseColor: texture,
    forestFloorNormal: texture,
    gravelAlbedo: texture,
    gravelNormal: texture,
    riverBank: texture,
    riverBed: texture,
  };
}

function createOptions() {
  return {
    alpineTextureWorldSize: 8,
    groundDirtTextureWorldSize: 7,
    forestFloorTextureWorldSize: 2,
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
      roadFrames: new Float32Array(vertexCount * 4),
      indices: new Uint32Array(segments * segments * 6),
    },
  };
}

test('terrain material factory creates shared Near, Medium and Far variants with locked budgets', () => {
  const textures = createTextures();
  const materials = createTerrainMaterials(textures, createOptions());

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
  assert.equal(materials.near.userData.terrainUniforms.uSnowTexture.value, textures.snow);
  assert.equal(materials.medium.userData.terrainUniforms.uSnowTexture.value, textures.snow);
  assert.equal(materials.far.userData.terrainUniforms.uSnowTexture.value, textures.snow);
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

test('road layers reuse terrain textures between the base surface and snow/water overrides', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());

  for (const material of Object.values(materials)) {
    const { vertexParameters, fragmentParameters, mapFragment } = material.userData.terrainShaderSource;
    const baseSurfaceEnd = mapFragment.indexOf('terrainBaseColor *= mix(');
    const roadStart = mapFragment.indexOf('float terrainRoadBreakup');
    const snowStart = mapFragment.indexOf('if (terrainSnowCoverage > 0.01)');
    const waterStart = mapFragment.indexOf('// River, lake, snowmelt and plunge masks');

    assert.match(vertexParameters, /attribute vec4 roadFrame;/);
    assert.match(fragmentParameters, /varying vec4 vTerrainRoadFrame;/);
    assert.doesNotMatch(fragmentParameters, /uRoadTexture/);
    assert.match(mapFragment, /uGroundDirtAlbedoTexture/);
    assert.match(mapFragment, /uGravelAlbedoTexture/);
    assert.match(mapFragment, /abs\(abs\(vTerrainRoadFrame\.w\) - 0\.45\)/);
    assert.ok(roadStart > baseSurfaceEnd);
    assert.ok(snowStart > roadStart);
    assert.ok(waterStart > snowStart);
  }
});

test('every material LOD uses only forest floor on flat lowland terrain', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());

  for (const material of Object.values(materials)) {
    const source = material.userData.terrainShaderSource.mapFragment;
    const groundStart = source.indexOf('if (terrainGroundMask > 0.38)');
    const rockStart = source.indexOf('else if (terrainAlpineMask > 0.42)');
    const groundSource = source.slice(groundStart, rockStart);

    assert.match(groundSource, /uForestFloorBaseColorTexture/);
    assert.doesNotMatch(groundSource, /uDryGrass|uGravel|uGroundDirt/);
    assert.doesNotMatch(source, /terrainForestFloorWeight|terrainDryGrassWeight|terrainGravelWeight/);
  }
});

test('forest-floor grading is local, texture-neutral and shared by every material LOD', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());

  for (const material of Object.values(materials)) {
    const { fragmentParameters, mapFragment } = material.userData.terrainShaderSource;
    const gradeStart = fragmentParameters.indexOf('vec3 gradeTerrainForestFloor');
    const gradeEnd = fragmentParameters.indexOf('\n}', gradeStart);
    const gradeSource = fragmentParameters.slice(gradeStart, gradeEnd);
    const groundStart = mapFragment.indexOf('if (terrainGroundMask > 0.38)');
    const rockStart = mapFragment.indexOf('else if (terrainAlpineMask > 0.42)');
    const waterOverrideStart = mapFragment.indexOf('// River, lake, snowmelt and plunge masks');

    assert.ok(gradeStart >= 0);
    assert.match(gradeSource, /mix\(vec3\(luminance\), baseColor, 0\.66\)/);
    assert.match(gradeSource, /vec3\(1\.12, 0\.98, 0\.90\)/);
    assert.match(gradeSource, /earthTint \* 1\.24 \+ vec3\(0\.009, 0\.008, 0\.005\)/);
    assert.doesNotMatch(gradeSource, /texture2D|sampleTerrainLayer/);
    assert.equal((mapFragment.match(/gradeTerrainForestFloor\(/g) ?? []).length, 1);
    assert.match(mapFragment.slice(groundStart, rockStart), /uForestFloorBaseColorTexture/);
    assert.match(mapFragment.slice(groundStart, rockStart), /gradeTerrainForestFloor/);
    assert.doesNotMatch(mapFragment.slice(waterOverrideStart), /gradeTerrainForestFloor/);
  }
});

test('every material LOD uses one world-space snow sample over an alpine rock base', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());

  for (const material of Object.values(materials)) {
    const { fragmentParameters, mapFragment } = material.userData.terrainShaderSource;
    const alpineStart = mapFragment.indexOf('else if (terrainAlpineMask > 0.42)');
    const fallbackDirtStart = mapFragment.indexOf('} else {', alpineStart);
    const macroStart = mapFragment.indexOf('terrainBaseColor *= mix(');
    const snowOverlayStart = mapFragment.indexOf('if (terrainSnowCoverage > 0.01)');
    const waterOverrideStart = mapFragment.indexOf('// River, lake, snowmelt and plunge masks');

    assert.match(fragmentParameters, /uniform sampler2D uSnowTexture;/);
    assert.match(mapFragment, /float terrainSnowLineHeight = terrainHeight/);
    assert.match(mapFragment, /1\.0 - smoothstep\(55\.0, 90\.0, terrainNoisyHeight\)/);
    assert.match(mapFragment, /smoothstep\(55\.0, 130\.0, terrainSnowLineHeight\)/);
    assert.match(mapFragment, /smoothstep\(0\.30, 0\.78, terrainBaseNormal\.y\)/);
    assert.match(mapFragment, /smoothstep\(45\.0, 80\.0, terrainNoisyHeight\)/);
    assert.match(mapFragment, /uAlpineTextureWorldSize \* 1\.35/);
    assert.equal((mapFragment.match(/texture2D\(uSnowTexture, terrainSnowUv\)/g) ?? []).length, 1);
    assert.doesNotMatch(mapFragment, /sampleTerrainLayer\(uSnowTexture/);
    assert.ok(alpineStart >= 0);
    assert.ok(fallbackDirtStart > alpineStart);
    assert.ok(macroStart > fallbackDirtStart);
    assert.ok(snowOverlayStart > macroStart);
    assert.ok(waterOverrideStart > snowOverlayStart);
    assert.doesNotMatch(
      mapFragment.slice(alpineStart, fallbackDirtStart),
      /terrainGroundMacroWeight = 1\.0;/,
    );
  }
});

test('snowline coverage keeps low terrain and cliffs bare while covering high gentle slopes', () => {
  assert.equal(getSnowlineCoverage(35, 0.9), 0);
  assert.ok(getSnowlineCoverage(90, 0.9) >= 0.4);
  assert.ok(getSnowlineCoverage(90, 0.9) <= 0.55);
  assert.equal(getSnowlineCoverage(140, 0.9), 1);
  assert.equal(getSnowlineCoverage(140, 0.25), 0);
  assert.ok(getSnowlineCoverage(140, 0.5) >= 0.2);
  assert.ok(getSnowlineCoverage(140, 0.5) <= 0.35);
});

test('terrain macro midtone lift only affects supported ground layers before water overrides', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());

  for (const material of Object.values(materials)) {
    const source = material.userData.terrainShaderSource.mapFragment;
    const alpineStart = source.indexOf('else if (terrainAlpineMask > 0.42)');
    const fallbackDirtStart = source.indexOf('} else {', alpineStart);
    const macroStart = source.indexOf('terrainBaseColor *= mix(');
    const waterOverrideStart = source.indexOf('// River, lake, snowmelt and plunge masks');

    assert.match(source, /float terrainGroundMacroWeight = 0\.0;/);
    assert.match(source, /mix\(1\.0, 1\.06, vTerrainMacro\.x\)/);
    assert.match(source, /mix\(0\.96, 1\.05, vTerrainMacro\.w\)/);
    assert.match(source, /terrainGroundMacroWeight = 1\.0;/);
    assert.match(
      source,
      /terrainGroundMacroWeight \* \(1\.0 - max\(terrainWaterBankMask, terrainWaterBedMask\)\)/,
    );
    assert.doesNotMatch(source, /mix\(0\.90, 1\.06, vTerrainMacro\.w\)/);
    assert.ok(alpineStart >= 0);
    assert.ok(fallbackDirtStart > alpineStart);
    assert.doesNotMatch(source.slice(alpineStart, fallbackDirtStart), /terrainGroundMacroWeight = 1\.0;/);
    assert.ok(macroStart > fallbackDirtStart);
    assert.ok(waterOverrideStart > macroStart);
    assert.doesNotMatch(source.slice(waterOverrideStart), /mix\(0\.96, 1\.05, vTerrainMacro\.w\)/);
  }
});

function getSnowlineCoverage(height, normalY, macroX = 0.5, macroZ = 0.5) {
  const snowLineHeight = height + (macroX - 0.5) * 24 + (macroZ - 0.5) * 8;
  const elevation = smoothstep(55, 130, snowLineHeight);
  const slope = smoothstep(0.3, 0.78, normalY);

  return smoothstep(0.12, 0.88, elevation * slope + (macroZ - 0.5) * 0.22);
}

function smoothstep(edge0, edge1, value) {
  const amount = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return amount * amount * (3 - 2 * amount);
}

test('all chunk geometry resolutions share one global terrain material', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());

  assert.equal(getTerrainMaterialForSegments(materials, 256), materials.medium);
  assert.equal(getTerrainMaterialForSegments(materials, 128), materials.medium);
  assert.equal(getTerrainMaterialForSegments(materials, 64), materials.medium);
});

test('Terrain assigns the same material and shadow behavior to every geometry LOD', () => {
  const terrain = createTerrain();
  const near = terrain.createChunkRecord(createChunkTask(256));
  const medium = terrain.createChunkRecord(createChunkTask(128));
  const far = terrain.createChunkRecord(createChunkTask(64));

  assert.equal(near.surface.material, terrain.materials.medium);
  assert.equal(medium.surface.material, terrain.materials.medium);
  assert.equal(far.surface.material, terrain.materials.medium);
  assert.equal(near.surface.userData.terrainMaterialLod, TERRAIN_MATERIAL_LOD.MEDIUM);
  assert.equal(medium.surface.userData.terrainMaterialLod, TERRAIN_MATERIAL_LOD.MEDIUM);
  assert.equal(far.surface.userData.terrainMaterialLod, TERRAIN_MATERIAL_LOD.MEDIUM);
  assert.equal(near.surface.geometry.getAttribute('roadFrame').itemSize, 4);
  assert.equal(medium.surface.geometry.getAttribute('roadFrame').itemSize, 4);
  assert.equal(far.surface.geometry.getAttribute('roadFrame').itemSize, 4);
  assert.equal(near.surface.receiveShadow, true);
  assert.equal(medium.surface.receiveShadow, true);
  assert.equal(far.surface.receiveShadow, true);

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
