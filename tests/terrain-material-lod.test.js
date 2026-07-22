import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
    forestFloorBaseColor: texture,
    forestFloorNormal: texture,
    forestFloorOrm: texture,
    riverBank: texture,
    riverBed: texture,
    riverGravel: texture,
  };
}

function createOptions() {
  return {
    alpineTextureWorldSize: 8,
    forestFloorTextureWorldSize: 2,
    riverBankTextureWorldSize: 6,
    riverBedTextureWorldSize: 5,
    riverGravelTextureWorldSize: 5.5,
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
      riverGravelMasks: new Float32Array(vertexCount),
      riverConfluenceMasks: new Float32Array(vertexCount),
      riverBedCoords: new Float32Array(vertexCount * 2),
      waterSystemMasks: new Float32Array(vertexCount * 4),
      smallLakeMasks: new Float32Array(vertexCount),
      mountainTrailMasks: new Float32Array(vertexCount),
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
  assert.ok(materials.medium.userData.terrainTextureBudget.maximum <= 9);
  assert.ok(materials.far.userData.terrainTextureBudget.maximum <= 6);
  assert.equal(materials.near.userData.terrainReceivesShadow, true);
  assert.equal(materials.medium.userData.terrainReceivesShadow, true);
  assert.equal(materials.far.userData.terrainReceivesShadow, false);
  assert.equal(materials.near.userData.terrainUniforms.uSnowTexture.value, textures.snow);
  assert.equal(materials.medium.userData.terrainUniforms.uSnowTexture.value, textures.snow);
  assert.equal(materials.far.userData.terrainUniforms.uSnowTexture.value, textures.snow);
  assert.equal(
    materials.medium.userData.terrainUniforms.uForestFloorOrmTexture.value,
    textures.forestFloorOrm,
  );
  assert.equal(
    Object.keys(materials.medium.userData.terrainUniforms)
      .filter((name) => name.endsWith('Texture')).length,
    9,
  );
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
    assert.match(mapFragment, /vTerrainRiverBedCoord\.x \/ uRiverBedTextureWorldSize/);
    assert.match(vertexAssignments, /vTerrainMacro = vec4/);
    assert.doesNotMatch(`${fragmentParameters}\n${mapFragment}`, /displacement|applyDetailNormal|applyForestFloorHeightNormal|fbm/i);
  }
});

test('terrain vertex relief is camera-local and leaves water corridors undisplaced', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());

  for (const material of Object.values(materials)) {
    const { vertexParameters, vertexAssignments } = material.userData.terrainShaderSource;
    const shader = {
      uniforms: {},
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    };

    assert.match(vertexParameters, /float terrainVertexRelief\(vec2 worldPosition\)/);
    assert.match(vertexAssignments, /1\.0 - smoothstep\(45\.0, 85\.0, terrainReliefDistance\)/);
    assert.match(vertexAssignments, /max\(riverMask, max\(riverBedMask, riverUnderwaterMask\)\)/);
    assert.match(vertexAssignments, /transformed \+= normalize\(objectNormal\) \* terrainReliefOffset;/);
    assert.doesNotMatch(vertexAssignments, /transformedNormal \* terrainReliefOffset/);

    material.onBeforeCompile(shader);
    assert.ok(
      shader.vertexShader.indexOf('terrainReliefOffset')
        < shader.vertexShader.indexOf('#include <project_vertex>'),
    );
  }
});

test('the globally used Medium material cell-bombs triplanar rock color and normal together', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());
  const medium = getTerrainMaterialForSegments(materials, 64);
  const { fragmentParameters, mapFragment } = medium.userData.terrainShaderSource;
  const bombOffsetSource = getShaderFunction(fragmentParameters, 'terrainAlpineBombOffset');
  const bombedColorSource = getShaderFunction(
    fragmentParameters,
    'sampleTerrainAlpineBombed',
  );
  const rockColorSource = getShaderFunction(fragmentParameters, 'sampleTerrainRock');
  const rockNormalSource = getShaderFunction(fragmentParameters, 'sampleTerrainRockNormal');

  assert.equal((bombOffsetSource.match(/terrainAlpineCellNoise\(/g) ?? []).length, 4);
  assert.match(bombedColorSource, /terrainAlpineBombOffset\(baseUv, seed\)/);
  assert.match(
    bombedColorSource,
    /texture2DGradEXT\(terrainTexture, uv, baseUvDx, baseUvDy\)/,
  );
  assert.doesNotMatch(bombedColorSource, /texture2D\(/);
  assert.equal((rockColorSource.match(/sampleTerrainAlpineBombed\(/g) ?? []).length, 3);
  assert.equal((rockNormalSource.match(/sampleTerrainAlpineBombed\(/g) ?? []).length, 3);
  assert.match(rockColorSource, /worldPosition\.zy/);
  assert.match(rockColorSource, /worldPosition\.xz/);
  assert.match(rockColorSource, /worldPosition\.xy/);
  assert.doesNotMatch(rockColorSource, /texture2D\(/);
  assert.match(rockNormalSource, /uRockNormalTexture/);
  assert.doesNotMatch(rockNormalSource, /texture2D\(/);
  for (const seed of ['3.0', '5.0', '7.0']) {
    assert.ok(rockColorSource.includes(seed));
    assert.ok(rockNormalSource.includes(seed));
  }
  assert.match(rockNormalSource, /xNormal\.z \* worldNormal\.x/);
  assert.match(rockNormalSource, /yNormal\.z \* worldNormal\.y/);
  assert.match(rockNormalSource, /zNormal\.z \* worldNormal\.z/);
  assert.doesNotMatch(rockNormalSource, /axisSign/);
  assert.match(mapFragment, /sampleTerrainRockNormal\(\s*vTerrainWorldPosition/);
  assert.ok(
    mapFragment.indexOf('vec3 terrainWorldPositionDx = dFdx')
      < mapFragment.indexOf('if (terrainGrassBlendMask >= 0.74)'),
  );
});

test('terrain materials keep river gravel scoped outside the natural ground branches', () => {
  const textures = createTextures();
  const materials = createTerrainMaterials(textures, createOptions());

  for (const material of Object.values(materials)) {
    const {
      vertexParameters,
      vertexAssignments,
      fragmentParameters,
      mapFragment,
    } = material.userData.terrainShaderSource;
    const baseSurfaceStart = mapFragment.indexOf('if (terrainGrassBlendMask >= 0.74)');
    const baseSurfaceEnd = mapFragment.indexOf('terrainBaseColor *= mix(');
    const snowStart = mapFragment.indexOf('if (terrainSnowCoverage > 0.01)');
    const mountainTrailStart = mapFragment.indexOf('float terrainMountainTrailMask');
    const waterStart = mapFragment.indexOf('// River, lake, snowmelt and plunge masks');
    const baseSurfaceSource = mapFragment.slice(baseSurfaceStart, baseSurfaceEnd);

    assert.doesNotMatch(vertexParameters, /roadFrame|RoadFrame/);
    assert.doesNotMatch(vertexAssignments, /roadFrame|RoadFrame/);
    assert.doesNotMatch(fragmentParameters, /road/i);
    assert.doesNotMatch(mapFragment, /road/i);
    assert.match(fragmentParameters, /uRiverGravelTexture/);
    assert.match(mapFragment, /terrainRiverGravelMask/);
    assert.doesNotMatch(baseSurfaceSource, /RiverGravel|riverGravel/);
    assert.doesNotMatch(baseSurfaceSource, /GroundDirt|groundDirt/);
    assert.match(vertexParameters, /attribute float mountainTrailMask;/);
    assert.match(vertexAssignments, /vTerrainMountainTrailMask = mountainTrailMask;/);
    assert.match(fragmentParameters, /varying float vTerrainMountainTrailMask;/);
    assert.match(mapFragment, /terrainMountainTrailMask \* 0\.62/);
    assert.equal(
      Object.keys(material.userData.terrainUniforms).some((name) => /road/i.test(name)),
      false,
    );
    assert.equal(material.userData.terrainUniforms.uRiverGravelTexture.value, textures.riverGravel);
    assert.ok(baseSurfaceStart >= 0);
    assert.ok(snowStart > baseSurfaceEnd);
    assert.ok(mountainTrailStart > snowStart);
    assert.ok(waterStart > mountainTrailStart);
  }
});

test('hero river banks keep wet gravel readable and dry gravel muted over natural ground', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());

  for (const material of Object.values(materials)) {
    const source = material.userData.terrainShaderSource.mapFragment;
    const gravelBlend = source.indexOf(
      'terrainBaseColor = mix(terrainBaseColor, terrainGravelColor',
    );
    const wetBlend = source.indexOf(
      'terrainBaseColor = mix(terrainBaseColor, terrainBankColor',
    );
    const bedBlend = source.indexOf(
      'terrainBaseColor = mix(terrainBaseColor, terrainBedColor',
    );

    assert.match(source, /float terrainRiverBankBreakup = clamp\(/);
    assert.match(
      source,
      /mix\(0\.03, 0\.18, terrainRiverBankBreakup\)/,
    );
    assert.match(source, /float terrainRiverMask = terrainRiverMaterialMask;/);
    assert.match(
      source,
      /float terrainRiverBedMask = clamp\(vTerrainRiverBedMask, 0\.0, 1\.0\);/,
    );
    assert.doesNotMatch(source, /smoothstep\(0\.05, 0\.95, vTerrainRiverBedMask\)/);
    assert.doesNotMatch(source, /terrainRiverSlopeMask/);
    assert.match(source, /float terrainRiverGravelMacro = mix\(/);
    assert.match(source, /float terrainRiverGravelBreakup = clamp\(/);
    assert.match(
      source,
      /mix\(0\.02, 0\.14, terrainRiverGravelBreakup\)/,
    );
    assert.match(
      source,
      /clamp\(vTerrainRiverGravelMask, 0\.0, 1\.0\)[\s\S]*\* terrainRiverGravelMacro/,
    );
    assert.match(source, /vec3 terrainMutedGravelColor = mix\(/);
    assert.match(source, /terrainRawGravelColor,\s*0\.52/);
    assert.match(source, /vec3\(0\.86, 0\.84, 0\.79\)/);
    assert.match(
      source,
      /terrainGravelColor = mix\(\s*terrainBaseColor,\s*terrainMutedGravelColor,\s*0\.58/,
    );
    assert.match(source, /vec3 terrainMutedBankColor = mix\(/);
    assert.match(source, /vec3\(0\.82, 0\.87, 0\.86\)/);
    assert.match(
      source,
      /terrainBankColor = mix\(\s*terrainBaseColor,\s*terrainMutedBankColor,\s*0\.86/,
    );
    assert.match(
      source,
      /terrainHeroWetBankColor = terrainBankColor \* vec3\(0\.82, 0\.84, 0\.74\)/,
    );
    assert.match(
      source,
      /float terrainHeroWetRoughness = mix\(\s*0\.55,\s*0\.26/,
    );
    assert.ok(gravelBlend >= 0);
    assert.ok(wetBlend > gravelBlend);
    assert.ok(bedBlend > wetBlend);
  }
});

test('every material LOD softly blends forest floor into the rock fallback', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());

  for (const material of Object.values(materials)) {
    const source = material.userData.terrainShaderSource.mapFragment;
    const groundStart = source.indexOf('if (terrainGrassBlendMask >= 0.74)');
    const transitionStart = source.indexOf('else if (terrainGrassBlendMask > 0.10)', groundStart);
    const rockStart = source.indexOf('\nelse {', transitionStart);
    const baseSurfaceEnd = source.indexOf('terrainBaseColor *= mix(');
    const grassSource = source.slice(groundStart, transitionStart);
    const transitionSource = source.slice(transitionStart, rockStart);
    const rockSource = source.slice(rockStart, baseSurfaceEnd);
    const naturalSurfaceSource = source.slice(groundStart, baseSurfaceEnd);

    assert.match(source, /float terrainGrassBlendMask = clamp\(/);
    assert.match(source, /terrainGroundMask \+ \(vTerrainMacro\.z - 0\.5\) \* 0\.10/);
    assert.match(source, /float terrainGrassBlend = smoothstep\(0\.10, 0\.74, terrainGrassBlendMask\);/);
    assert.match(grassSource, /uForestFloorBaseColorTexture/);
    assert.doesNotMatch(grassSource, /sampleTerrainRock|uRockTexture/);
    assert.doesNotMatch(grassSource, /uDryGrass|uGravel|GroundDirt/);
    assert.match(transitionSource, /vec3 terrainGrassColor/);
    assert.match(transitionSource, /vec3 terrainRockColor/);
    assert.match(transitionSource, /sampleTerrainForestFloorColor\(/);
    assert.match(
      transitionSource,
      /sampleTerrainRock\(|sampleTerrainAlpineBombed\(\s*uRockTexture/,
    );
    assert.match(
      transitionSource,
      /mix\(terrainRockColor, terrainGrassColor, terrainGrassBlend\)/,
    );
    assert.match(transitionSource, /terrainSurfaceNormal = normalize\(mix\(/);
    assert.match(transitionSource, /vec3\(0\.80, 0\.79, 0\.76\)/);
    assert.match(transitionSource, /mix\(0\.55, 0\.92, terrainGrassTechnical\.g\)/);
    assert.match(
      rockSource,
      /sampleTerrainRock\(|sampleTerrainAlpineBombed\(\s*uRockTexture/,
    );
    assert.match(rockSource, /vec3\(0\.80, 0\.79, 0\.76\)/);
    assert.match(rockSource, /terrainRoughness = 0\.80/);
    assert.doesNotMatch(rockSource, /sampleTerrainForestFloor|uForestFloor/);
    assert.doesNotMatch(
      naturalSurfaceSource,
      /GroundDirt|groundDirt/,
    );
    assert.doesNotMatch(source, /terrainRockMask|terrainAlpineMask/);
    assert.doesNotMatch(source, /terrainForestFloorWeight|terrainDryGrassWeight|terrainGravelWeight/);
    assert.ok(groundStart >= 0);
    assert.ok(transitionStart > groundStart);
    assert.ok(rockStart > transitionStart);
    assert.ok(baseSurfaceEnd > rockStart);
  }
});

test('forest-floor grading is local, texture-neutral and shared by every material LOD', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());

  for (const material of Object.values(materials)) {
    const { fragmentParameters, mapFragment } = material.userData.terrainShaderSource;
    const gradeStart = fragmentParameters.indexOf('vec3 gradeTerrainForestFloor');
    const gradeEnd = fragmentParameters.indexOf('\n}', gradeStart);
    const gradeSource = fragmentParameters.slice(gradeStart, gradeEnd);
    const groundStart = mapFragment.indexOf('if (terrainGrassBlendMask >= 0.74)');
    const baseSurfaceEnd = mapFragment.indexOf('terrainBaseColor *= mix(');
    const waterOverrideStart = mapFragment.indexOf('// River, lake, snowmelt and plunge masks');

    assert.ok(gradeStart >= 0);
    assert.match(gradeSource, /mix\(vec3\(luminance\), baseColor, 0\.70\)/);
    assert.match(gradeSource, /vec3\(0\.96, 1\.04, 0\.86\)/);
    assert.match(gradeSource, /forestTint \* 1\.16 \+ vec3\(0\.006, 0\.010, 0\.003\)/);
    assert.doesNotMatch(gradeSource, /texture2D|sampleTerrainLayer/);
    assert.equal((mapFragment.match(/gradeTerrainForestFloor\(/g) ?? []).length, 2);
    assert.match(mapFragment.slice(groundStart, baseSurfaceEnd), /uForestFloorBaseColorTexture/);
    assert.match(mapFragment.slice(groundStart, baseSurfaceEnd), /gradeTerrainForestFloor/);
    assert.doesNotMatch(mapFragment.slice(waterOverrideStart), /gradeTerrainForestFloor/);
  }
});

test('forest-floor color and normal share four-cell world-space bombing with stable gradients', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());

  for (const [level, material] of Object.entries(materials)) {
    const { fragmentParameters, mapFragment } = material.userData.terrainShaderSource;
    const groundStart = mapFragment.indexOf('if (terrainGrassBlendMask >= 0.74)');
    const transitionStart = mapFragment.indexOf('else if (terrainGrassBlendMask > 0.10)', groundStart);
    const groundSource = mapFragment.slice(groundStart, transitionStart);
    const derivativeStart = mapFragment.indexOf('vec2 terrainForestFloorUvDx = dFdx');
    const cellSource = getShaderFunction(fragmentParameters, 'sampleTerrainForestFloorCell');
    const colorSource = getShaderFunction(fragmentParameters, 'sampleTerrainForestFloorColor');
    const slopeCellSource = getShaderFunction(
      fragmentParameters,
      'sampleTerrainForestFloorSlopeCell',
    );
    const normalSource = getShaderFunction(fragmentParameters, 'sampleTerrainForestFloorNormal');

    assert.equal(
      (colorSource.match(/sampleTerrainForestFloorCell\(/g) ?? []).length,
      4,
    );
    assert.equal(
      (normalSource.match(/sampleTerrainForestFloorSlopeCell\(/g) ?? []).length,
      4,
    );
    assert.match(colorSource, /cell \+ vec2\(1\.0, 0\.0\)/);
    assert.match(colorSource, /cell \+ vec2\(0\.0, 1\.0\)/);
    assert.match(colorSource, /cell \+ vec2\(1\.0, 1\.0\)/);
    assert.match(cellSource, /texture2DGradEXT\(terrainTexture, uv, uvDx, uvDy\)/);
    assert.doesNotMatch(cellSource, /texture2D\(/);
    assert.equal((slopeCellSource.match(/sampleTerrainForestFloorCell\(/g) ?? []).length, 1);
    assert.doesNotMatch(slopeCellSource, /texture2D(?:GradEXT)?\(/);
    assert.match(
      slopeCellSource,
      /vec2 terrainSlope = -tangentNormal\.xy \/ max\(tangentNormal\.z, 0\.08\)/,
    );
    assert.match(slopeCellSource, /terrainRotateQuarterInverse\(terrainSlope, turn\)/);
    assert.match(normalSource, /vec3\(-terrainSlope\.x, -terrainSlope\.y, 1\.0\)/);
    assert.match(colorSource, /terrainForestFloorCellWeights/);
    assert.match(normalSource, /terrainForestFloorCellWeights/);
    assert.ok(derivativeStart >= 0);
    assert.ok(derivativeStart < groundStart);
    assert.equal((mapFragment.match(/sampleTerrainForestFloorColor\(/g) ?? []).length, 2);
    assert.match(groundSource, /sampleTerrainForestFloorColor/);
    assert.doesNotMatch(
      groundSource,
      /sampleTerrainLayer\(\s*uForestFloorBaseColorTexture/,
    );

    if (level === TERRAIN_MATERIAL_LOD.FAR) {
      assert.equal((mapFragment.match(/sampleTerrainForestFloorNormal\(/g) ?? []).length, 0);
    } else {
      assert.equal((mapFragment.match(/sampleTerrainForestFloorNormal\(/g) ?? []).length, 2);
    }

    assert.equal(
      material.customProgramCacheKey(),
      `layered-terrain-pbr-v15-raised-snowline-${level}`,
    );
  }
});

test('packed terrain technical map drives bounded forest ORM and scree normals with one sampler', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());
  const medium = materials.medium.userData.terrainShaderSource;
  const far = materials.far.userData.terrainShaderSource;
  const technicalSource = getShaderFunction(
    medium.fragmentParameters,
    'sampleTerrainForestFloorTechnical',
  );
  const screeSource = getShaderFunction(
    medium.fragmentParameters,
    'sampleTerrainScreeNormal',
  );

  assert.equal(
    (technicalSource.match(/sampleTerrainForestFloorCell\(/g) ?? []).length,
    4,
  );
  assert.match(medium.mapFragment, /mix\(0\.55, 0\.92, terrainForestTechnical\.g\)/);
  assert.match(medium.mapFragment, /mix\(0\.75, 1\.0, terrainForestTechnical\.r\)/);
  assert.match(screeSource, /texture2D\(uForestFloorOrmTexture, uv\)\.ba/);
  assert.match(screeSource, /sqrt\(max\(1\.0 - dot\(normalXY, normalXY\), 0\.04\)\)/);
  assert.match(medium.mapFragment, /sampleTerrainScreeNormal\(/);
  assert.doesNotMatch(far.mapFragment, /sampleTerrainForestFloorTechnical\(/);
  assert.doesNotMatch(far.mapFragment, /sampleTerrainScreeNormal\(/);
});

test('derived terrain PBR assets are tiered linear KTX2 textures', async () => {
  const identifier = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];

  for (const tier of ['1k', '2k']) {
    for (const name of ['forest_floor_orm', 'scree_alpine_normal']) {
      const data = await readFile(new URL(
        `../public/assets/terrain/forest-floor/optimized/${name}_${tier}.ktx2`,
        import.meta.url,
      ));

      assert.deepEqual([...data.subarray(0, identifier.length)], identifier);
      assert.ok(data.byteLength > 1024);
    }
  }
});

test('every material LOD cell-bombs one snow layer over the grass-or-rock base', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());

  for (const material of Object.values(materials)) {
    const {
      vertexParameters,
      vertexAssignments,
      fragmentParameters,
      mapFragment,
    } = material.userData.terrainShaderSource;
    const groundStart = mapFragment.indexOf('if (terrainGrassBlendMask >= 0.74)');
    const transitionStart = mapFragment.indexOf('else if (terrainGrassBlendMask > 0.10)', groundStart);
    const rockStart = mapFragment.indexOf('\nelse {', transitionStart);
    const macroStart = mapFragment.indexOf('terrainBaseColor *= mix(');
    const snowOverlayStart = mapFragment.indexOf('if (terrainSnowCoverage > 0.01)');
    const mountainTrailStart = mapFragment.indexOf('float terrainMountainTrailMask');
    const waterOverrideStart = mapFragment.indexOf('// River, lake, snowmelt and plunge masks');
    const rockSource = mapFragment.slice(rockStart, macroStart);
    const snowSource = mapFragment.slice(snowOverlayStart, mountainTrailStart);
    const waterSource = mapFragment.slice(waterOverrideStart);

    assert.match(vertexParameters, /attribute float edgeMountainMask;/);
    assert.match(vertexAssignments, /vTerrainEdgeMountainMask = edgeMountainMask;/);
    assert.match(fragmentParameters, /varying float vTerrainEdgeMountainMask;/);
    assert.match(fragmentParameters, /uniform sampler2D uSnowTexture;/);
    assert.match(mapFragment, /float terrainSnowLineHeight = terrainHeight/);
    assert.match(mapFragment, /1\.0 - smoothstep\(55\.0, 90\.0, terrainNoisyHeight\)/);
    assert.match(mapFragment, /vTerrainEdgeMountainMask \* 100\.0/);
    assert.match(mapFragment, /smoothstep\(55\.0, 130\.0, terrainSnowLineHeight\)/);
    assert.match(mapFragment, /smoothstep\(0\.30, 0\.78, terrainBaseNormal\.y\)/);
    assert.match(mapFragment, /float terrainSnowMacroCoverage = smoothstep\(/);
    assert.match(
      mapFragment,
      /distance\(cameraPosition, vTerrainWorldPosition\)/,
    );
    assert.match(
      mapFragment,
      /mix\(\s*terrainSnowDetailedCoverage,\s*terrainSnowMacroCoverage,\s*terrainSnowDistanceFade/,
    );
    assert.match(mapFragment, /uAlpineTextureWorldSize \* 1\.35/);
    assert.equal((snowSource.match(/sampleTerrainAlpineBombed\(/g) ?? []).length, 1);
    assert.match(snowSource, /uSnowTexture/);
    assert.doesNotMatch(snowSource, /texture2D\(/);
    assert.doesNotMatch(mapFragment, /sampleTerrainLayer\(uSnowTexture/);
    assert.doesNotMatch(waterSource, /sampleTerrainAlpineBombed/);
    assert.ok(groundStart >= 0);
    assert.ok(transitionStart > groundStart);
    assert.ok(rockStart > transitionStart);
    assert.ok(macroStart > rockStart);
    assert.ok(snowOverlayStart > macroStart);
    assert.ok(mountainTrailStart > snowOverlayStart);
    assert.ok(waterOverrideStart > snowOverlayStart);
    assert.doesNotMatch(rockSource, /GroundDirt|terrainGroundMacroWeight = 1\.0;/);
  }
});

test('snowline coverage keeps central low terrain and cliffs bare', () => {
  assert.equal(getSnowlineCoverage(35, 0.9), 0);
  assert.ok(getSnowlineCoverage(90, 0.9) >= 0.4);
  assert.ok(getSnowlineCoverage(90, 0.9) <= 0.55);
  assert.equal(getSnowlineCoverage(140, 0.9), 1);
  assert.equal(getSnowlineCoverage(140, 0.25), 0);
  assert.ok(getSnowlineCoverage(140, 0.5) >= 0.2);
  assert.ok(getSnowlineCoverage(140, 0.5) <= 0.35);
});

test('perimeter mountain mask raises the physical snowline by exactly 100 meters', () => {
  assert.equal(
    getSnowlineCoverage(190, 0.9, 0.5, 0.5, 1),
    getSnowlineCoverage(90, 0.9),
  );
  assert.equal(getSnowlineCoverage(135, 0.9, 0.5, 0.5, 1), 0);
  assert.equal(getSnowlineCoverage(240, 0.9, 0.5, 0.5, 1), 1);
  assert.equal(getSnowlineCoverage(240, 0.25, 0.5, 0.5, 1), 0);
});

test('terrain macro midtone lift affects grass but not the rock fallback or water overrides', () => {
  const materials = createTerrainMaterials(createTextures(), createOptions());

  for (const material of Object.values(materials)) {
    const source = material.userData.terrainShaderSource.mapFragment;
    const groundStart = source.indexOf('if (terrainGrassBlendMask >= 0.74)');
    const transitionStart = source.indexOf('else if (terrainGrassBlendMask > 0.10)', groundStart);
    const rockStart = source.indexOf('\nelse {', transitionStart);
    const macroStart = source.indexOf('terrainBaseColor *= mix(');
    const waterOverrideStart = source.indexOf('// River, lake, snowmelt and plunge masks');
    const rockSource = source.slice(rockStart, macroStart);

    assert.match(source, /float terrainGroundMacroWeight = 0\.0;/);
    assert.match(source, /mix\(1\.0, 1\.06, vTerrainMacro\.x\)/);
    assert.match(source, /mix\(0\.96, 1\.05, vTerrainMacro\.w\)/);
    assert.equal((source.match(/terrainGroundMacroWeight = 1\.0;/g) ?? []).length, 1);
    assert.match(
      source,
      /1\.0 - max\(terrainRiverGravelMask, max\(terrainWaterBankMask, terrainWaterBedMask\)\)/,
    );
    assert.doesNotMatch(source, /mix\(0\.90, 1\.06, vTerrainMacro\.w\)/);
    assert.ok(groundStart >= 0);
    assert.ok(transitionStart > groundStart);
    assert.ok(rockStart > transitionStart);
    assert.doesNotMatch(rockSource, /terrainGroundMacroWeight = 1\.0;/);
    assert.ok(macroStart > rockStart);
    assert.ok(waterOverrideStart > macroStart);
    assert.doesNotMatch(source.slice(waterOverrideStart), /mix\(0\.96, 1\.05, vTerrainMacro\.w\)/);
  }
});

function getSnowlineCoverage(
  height,
  normalY,
  macroX = 0.5,
  macroZ = 0.5,
  edgeMountainMask = 0,
) {
  const snowLineHeight = height - edgeMountainMask * 100
    + (macroX - 0.5) * 24
    + (macroZ - 0.5) * 8;
  const elevation = smoothstep(55, 130, snowLineHeight);
  const slope = smoothstep(0.3, 0.78, normalY);

  return smoothstep(0.12, 0.88, elevation * slope + (macroZ - 0.5) * 0.22);
}

function getShaderFunction(source, name) {
  const nameStart = source.indexOf(`${name}(`);
  const bodyStart = source.indexOf('{', nameStart);
  let depth = 0;

  assert.ok(nameStart >= 0, `Missing shader function ${name}`);
  assert.ok(bodyStart >= 0, `Missing shader function body ${name}`);

  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] !== '}') continue;
    depth -= 1;
    if (depth === 0) return source.slice(nameStart, index + 1);
  }

  assert.fail(`Unclosed shader function ${name}`);
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
  assert.equal(near.surface.geometry.getAttribute('roadFrame'), undefined);
  assert.equal(medium.surface.geometry.getAttribute('roadFrame'), undefined);
  assert.equal(far.surface.geometry.getAttribute('roadFrame'), undefined);
  assert.equal(near.surface.geometry.getAttribute('mountainTrailMask').itemSize, 1);
  assert.equal(medium.surface.geometry.getAttribute('mountainTrailMask').itemSize, 1);
  assert.equal(far.surface.geometry.getAttribute('mountainTrailMask').itemSize, 1);
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
