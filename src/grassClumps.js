import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { isInRiverGrassExclusion } from './riverChannel.js';
import { isInWaterSystemVegetationExclusion } from './waterSystem.js';
import { isInSmallLakeExclusion } from './smallLakes.js';
import { isInMountainTrailGrassExclusion } from './mountainTrailNetwork.js';
import { PLAYER_SPAWN_POSITION } from './spawn.js';
import {
  MAP_SIZE,
  ZONE_SIZE,
  GRASS_ASSET_BASE_PATH,
  GRASS_LOD_DENSITIES as RIBBON_GRASS_LOD_DENSITIES,
  GRASS_ROOT_EMBED_DEPTH,
  GRASS_RIVER_BUFFER,
  GRASS_SWAY_DETAIL_FADE_END,
  GRASS_SWAY_DETAIL_FADE_START,
  GRASS_SWAY_FADE_END,
  GRASS_SWAY_FADE_START,
  GRASS_SWAY_FLUTTER_FREQUENCY,
  GRASS_SWAY_FLUTTER_STRENGTH,
  GRASS_SWAY_PLAYER_RADIUS,
  GRASS_SWAY_PRIMARY_FREQUENCY,
  GRASS_SWAY_REGION_SIZE,
  GRASS_SWAY_REGIONAL_STRENGTH,
  GRASS_SWAY_STRENGTH,
  GRASS_WIND_X,
  GRASS_WIND_Z,
  GRASS_PATCH_COUNT,
  GRASS_PATCH_RADIUS_MIN as PATCH_MIN_RADIUS,
  GRASS_PATCH_RADIUS_MAX as PATCH_MAX_RADIUS,
  GRASS_PATCH_GAP_ACCEPTANCE,
  GRASS_GROUND_MASK_THRESHOLD,
  GRASS_LOWLAND_FADE_START,
  GRASS_LOWLAND_FADE_END,
  GRASS_COMMUNITY_MACRO_SIZE,
  GRASS_COMMUNITY_MICRO_SIZE,
  GRASS_COMMUNITY_GAP_ACCEPTANCE,
  GRASS_COMMUNITY_CORE_ACCEPTANCE,
  GRASS_COMMUNITY_PRIMARY_RATIO,
  GRASS_COMMUNITY_SECONDARY_RATIO,
} from './vegetationConfig.js';

const PLACEMENT_RADIUS = 15;
const CLUMPS_PER_SQUARE_METER = 20;
const CELL_SIZE = Math.sqrt(1 / CLUMPS_PER_SQUARE_METER);
const PATCH_GAP_ACCEPTANCE = GRASS_PATCH_GAP_ACCEPTANCE;
const PATCH_FULL_ACCEPTANCE = 1;
const RIVER_BUFFER = GRASS_RIVER_BUFFER;
const PATCH_COUNT = GRASS_PATCH_COUNT;
const WIND_DIRECTION = new THREE.Vector2(GRASS_WIND_X, GRASS_WIND_Z).normalize();
const UP = new THREE.Vector3(0, 1, 0);
const SURFACE_NORMAL = new THREE.Vector3();
const GRASS_ALPHA_TEST = 0.12;
const GRASS_SHADOW_LIFT_COLOR = 0x647c4a;
const GRASS_SHADOW_LIFT_INTENSITY = 0.24;
const GRASS_EMISSIVE_INTENSITY = 0.06;
const GRASS_COLOR_GRADE = {
  brightness: 0.95,
  saturation: 0.82,
  highlightCompression: 0.28,
};
const GRASS_NEAR_TINT = 0xa5c77f;
const GRASS_FAR_TINT = 0x82a66a;
const GRASS_GREEN_INSTANCE_COLOR = new THREE.Color(1, 1, 1);
const GRASS_DRY_INSTANCE_COLOR = new THREE.Color(1.45, 0.72, 0.48);
const RIBBON_GRASS_VARIANTS = ['VarA', 'VarB', 'VarC', 'VarD', 'VarE', 'VarF'];
const RIBBON_GRASS_OPTIMIZED_TEXTURE_PATH = 'optimized/ktx2';
const RIBBON_GRASS_OPTIMIZED_MODEL_PATH = 'optimized/models';
const RIBBON_GRASS_MODEL_PREFIX = 'Ribbon_Grass_tbdpec3r_High_tbdpec3r';
const RIBBON_GRASS_SCALE = 1.35;
const GRASS_MACRO_ROTATION = 0.39;
const GRASS_MICRO_ROTATION = -0.58;
const GRASS_MACRO_ROTATION_COS = Math.cos(GRASS_MACRO_ROTATION);
const GRASS_MACRO_ROTATION_SIN = Math.sin(GRASS_MACRO_ROTATION);
const GRASS_MICRO_ROTATION_COS = Math.cos(GRASS_MICRO_ROTATION);
const GRASS_MICRO_ROTATION_SIN = Math.sin(GRASS_MICRO_ROTATION);
const GRASS_DRY_MACRO_ROTATION = 0.73;
const GRASS_DRY_DETAIL_ROTATION = -0.31;
const GRASS_DRY_MACRO_ROTATION_COS = Math.cos(GRASS_DRY_MACRO_ROTATION);
const GRASS_DRY_MACRO_ROTATION_SIN = Math.sin(GRASS_DRY_MACRO_ROTATION);
const GRASS_DRY_DETAIL_ROTATION_COS = Math.cos(GRASS_DRY_DETAIL_ROTATION);
const GRASS_DRY_DETAIL_ROTATION_SIN = Math.sin(GRASS_DRY_DETAIL_ROTATION);
const GRASS_SWAY_PROGRAM_KEY = [
  'ribbon-grass-sway-config-v4',
  GRASS_SWAY_PLAYER_RADIUS,
  GRASS_SWAY_FADE_START,
  GRASS_SWAY_FADE_END,
  GRASS_SWAY_REGIONAL_STRENGTH,
  GRASS_SWAY_REGION_SIZE,
  GRASS_SWAY_DETAIL_FADE_START,
  GRASS_SWAY_DETAIL_FADE_END,
  GRASS_SWAY_PRIMARY_FREQUENCY,
  GRASS_SWAY_FLUTTER_FREQUENCY,
  GRASS_SWAY_FLUTTER_STRENGTH,
].join('-');

export { RIBBON_GRASS_LOD_DENSITIES as LOD_DENSITIES };
export { ZONE_SIZE };

const HALF_MAP_SIZE = MAP_SIZE / 2;
const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const grassPatches = createGrassPatches();
const patchCellCache = new Map();

export async function loadGrassModel(compressedTextureLoader, textureTier = '2k') {
  const [textures, models] = await Promise.all([
    loadRibbonGrassTextures(compressedTextureLoader, textureTier),
    loadRibbonGrassModels(),
  ]);

  return { textures, models };
}

export function createGrassVariants(asset) {
  const materials = createRibbonGrassMaterials(asset.textures);

  return new Map(RIBBON_GRASS_VARIANTS.map((variantName) => [
    `RibbonGrass_${variantName}`,
    createRibbonGrassVariant(asset.models.get(variantName), materials),
  ]));
}

async function loadRibbonGrassTextures(compressedTextureLoader, textureTier) {
  const tier = textureTier === '1k' ? '1k' : '2k';
  const textureSpecs = [
    ['baseColor', 'BaseColor', THREE.SRGBColorSpace],
    ['normal', 'Normal', THREE.NoColorSpace],
    ['roughness', 'Roughness', THREE.NoColorSpace],
    ['ao', 'AO', THREE.NoColorSpace],
    ['opacity', 'Opacity', THREE.NoColorSpace],
    ['translucency', 'Translucency', THREE.SRGBColorSpace],
    ['billboardBaseColor', 'Billboard_BaseColor', THREE.SRGBColorSpace],
    ['billboardNormal', 'Billboard_Normal', THREE.NoColorSpace],
    ['billboardOpacity', 'Billboard_Opacity', THREE.NoColorSpace],
  ];
  const entries = await Promise.all(textureSpecs.map(async ([key, name, colorSpace]) => {
    const path = `${GRASS_ASSET_BASE_PATH}/${RIBBON_GRASS_OPTIMIZED_TEXTURE_PATH}/Ribbon_Grass_${name}_${tier}.ktx2`;
    const texture = await compressedTextureLoader.loadAsync(path);

    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = colorSpace;
    texture.anisotropy = 8;
    flipGrassTextureVertically(texture);

    return [key, texture];
  }));

  return Object.fromEntries(entries);
}

export function flipGrassTextureVertically(texture) {
  texture.offset.y = 1;
  texture.repeat.y = -1;
  texture.updateMatrix();
}

async function loadRibbonGrassModels() {
  const entries = await Promise.all(RIBBON_GRASS_VARIANTS.map(async (variantName) => {
    const lods = await Promise.all([0, 1, 2].map(async (lodLevel) => {
      const asset = await gltfLoader.loadAsync(
        `${GRASS_ASSET_BASE_PATH}/${RIBBON_GRASS_OPTIMIZED_MODEL_PATH}/${RIBBON_GRASS_MODEL_PREFIX}_${variantName}_LOD${lodLevel}.glb`,
      );

      return asset.scene;
    }));

    return [variantName, lods];
  }));

  return new Map(entries);
}

function createRibbonGrassMaterials(textures) {
  const near = createRibbonGrassMaterial(textures, {
    useSway: true,
    grade: GRASS_COLOR_GRADE,
    alphaTest: GRASS_ALPHA_TEST,
    tintColor: GRASS_NEAR_TINT,
    translucencyStrength: 0.18,
  });
  const mid = createRibbonGrassMaterial(textures, {
    useSway: false,
    alphaTest: GRASS_ALPHA_TEST,
    tintColor: GRASS_NEAR_TINT,
  });
  const far = createRibbonGrassFarMaterial(textures);

  return {
    lod: [near, mid, far],
  };
}

function createRibbonGrassMaterial(textures, options) {
  const material = new THREE.MeshStandardMaterial({
    map: textures.baseColor,
    normalMap: textures.normal,
    roughnessMap: textures.roughness,
    aoMap: textures.ao,
    alphaMap: textures.opacity,
    roughness: 0.86,
    metalness: 0,
    side: THREE.DoubleSide,
    alphaTest: options.alphaTest,
    transparent: false,
    depthWrite: true,
    depthTest: true,
    alphaToCoverage: false,
    color: options.tintColor,
  });

  material.name = options.useSway ? 'RibbonGrassMaterial' : 'RibbonGrassFarMaterial';
  configureGrassMaterial(material);

  if (options.useSway) {
    return createGrassSwayMaterial(material, null, {
      ...options,
      ribbonGrassMaps: { translucency: textures.translucency },
    });
  }

  material.userData.ribbonGrassMaps = { translucency: textures.translucency };
  material.userData.grassUniforms = null;

  return material;
}

function createRibbonGrassFarMaterial(textures) {
  const material = new THREE.MeshLambertMaterial({
    map: textures.billboardBaseColor,
    alphaMap: textures.billboardOpacity,
    side: THREE.DoubleSide,
    alphaTest: GRASS_ALPHA_TEST,
    transparent: false,
    depthWrite: true,
    depthTest: true,
    color: GRASS_FAR_TINT,
  });

  configureGrassMaterial(material);
  material.name = 'RibbonGrassFarLambertMaterial';
  material.userData.grassUniforms = null;

  return material;
}

function createRibbonGrassVariant(lodRoots, materials) {
  const modelLods = lodRoots.map((root, index) => (
    buildRibbonGrassLeaves(
      root,
      materials.lod[Math.min(index, materials.lod.length - 1)],
      `LOD${index}`,
      index === 2,
    )
  ));
  return {
    lods: modelLods,
    leaves: modelLods[0],
    billboard: modelLods[2],
  };
}

function buildRibbonGrassLeaves(root, material, suffix, useCrossCard) {
  root.updateMatrixWorld(true);

  const leaves = [];

  root.traverse((child) => {
    if (!child.isMesh) return;

    let geometry = child.geometry.clone();
    const transform = child.matrixWorld.clone();

    geometry.applyMatrix4(transform);
    normalizeRibbonGrassGeometry(geometry);
    ensureAoUv(geometry);

    if (useCrossCard) {
      const rotatedGeometry = geometry.clone().rotateY(Math.PI * 0.5);
      const crossCardGeometry = mergeGeometries([geometry, rotatedGeometry], false);

      geometry.dispose();
      rotatedGeometry.dispose();
      geometry = crossCardGeometry;
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }

    leaves.push({
      name: `${child.name || 'Mesh'}_${suffix}`,
      geometry,
      material,
    });
  });

  return leaves;
}

export function normalizeRibbonGrassGeometry(geometry) {
  geometry.computeBoundingBox();

  const box = geometry.boundingBox;
  const centerX = (box.min.x + box.max.x) * 0.5;
  const centerZ = (box.min.z + box.max.z) * 0.5;

  geometry.translate(-centerX, 0, -centerZ);
  geometry.scale(RIBBON_GRASS_SCALE, RIBBON_GRASS_SCALE, RIBBON_GRASS_SCALE);
  geometry.translate(0, -GRASS_ROOT_EMBED_DEPTH, 0);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const position = geometry.getAttribute('position');
  const height = Math.max(geometry.boundingBox.max.y, 0.001);
  const heightRatios = new Float32Array(position.count);

  for (let index = 0; index < position.count; index += 1) {
    heightRatios[index] = THREE.MathUtils.clamp(
      position.getY(index) / height,
      0,
      1,
    );
  }

  geometry.setAttribute('aGrassHeightRatio', new THREE.BufferAttribute(heightRatios, 1));
}

function ensureAoUv(geometry) {
  const uv = geometry.getAttribute('uv');

  if (uv && !geometry.getAttribute('uv2')) {
    geometry.setAttribute('uv2', uv.clone());
  }
}

export function createGrassSwayMaterial(sourceMaterial, geometry, options = {}) {
  const material = sourceMaterial.clone();
  material.userData.ribbonGrassMaps = options.ribbonGrassMaps
    ?? sourceMaterial.userData.ribbonGrassMaps;
  const uniforms = {
    uGrassTime: { value: 0 },
    uGrassWindDirection: { value: WIND_DIRECTION },
    uGrassSwayStrength: { value: GRASS_SWAY_STRENGTH },
    uGrassPlayerPosition: { value: new THREE.Vector2(PLAYER_SPAWN_POSITION.x, PLAYER_SPAWN_POSITION.z) },
  };

  configureGrassMaterial(material);
  material.userData.grassUniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uGrassTime;
uniform vec2 uGrassWindDirection;
uniform float uGrassSwayStrength;
uniform vec2 uGrassPlayerPosition;
attribute float aGrassHeightRatio;
varying float vGrassHeightRatio;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
float grassHeightRatio = clamp(aGrassHeightRatio, 0.0, 1.0);
vGrassHeightRatio = grassHeightRatio;
float grassTipMask = smoothstep(0.08, 1.0, grassHeightRatio) * grassHeightRatio;
vec3 grassInstanceWorld = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
mat3 grassInstanceTransform = mat3(modelMatrix);
#ifdef USE_INSTANCING
grassInstanceWorld = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
grassInstanceTransform = mat3(modelMatrix) * mat3(instanceMatrix);
#endif
vec3 grassWorldWindDirection = vec3(uGrassWindDirection.x, 0.0, uGrassWindDirection.y);
vec2 grassLocalWindDirection = vec2(
  dot(grassWorldWindDirection, normalize(grassInstanceTransform[0])),
  dot(grassWorldWindDirection, normalize(grassInstanceTransform[2]))
);
grassLocalWindDirection /= max(length(grassLocalWindDirection), 0.001);
vec2 grassWorldSideDirection = vec2(-uGrassWindDirection.y, uGrassWindDirection.x);
vec2 grassLocalSideDirection = vec2(-grassLocalWindDirection.y, grassLocalWindDirection.x);
float grassPlayerDistance = distance(grassInstanceWorld.xz, uGrassPlayerPosition);
float grassPlayerSwayMask = 1.0 - smoothstep(${(GRASS_SWAY_PLAYER_RADIUS - 0.25).toFixed(2)}, ${GRASS_SWAY_PLAYER_RADIUS.toFixed(2)}, grassPlayerDistance);
float grassWindSwayMask = (1.0 - smoothstep(${GRASS_SWAY_FADE_START.toFixed(1)}, ${GRASS_SWAY_FADE_END.toFixed(1)}, grassPlayerDistance)) * ${GRASS_SWAY_REGIONAL_STRENGTH.toFixed(2)};
float grassSwayMask = max(grassPlayerSwayMask, grassWindSwayMask);
float grassNearDetailMask = 1.0 - smoothstep(${GRASS_SWAY_DETAIL_FADE_START.toFixed(1)}, ${GRASS_SWAY_DETAIL_FADE_END.toFixed(1)}, grassPlayerDistance);
vec2 grassWindRegion = floor(grassInstanceWorld.xz / ${GRASS_SWAY_REGION_SIZE.toFixed(1)} + 0.5) * ${GRASS_SWAY_REGION_SIZE.toFixed(1)};
vec2 grassLocalOffset = grassInstanceWorld.xz - grassWindRegion;
float grassRegionalPhase = dot(grassWindRegion, uGrassWindDirection) * 0.08;
float grassLocalPhase = dot(grassLocalOffset, uGrassWindDirection) * 0.05 * grassNearDetailMask;
float grassWave = sin(grassRegionalPhase + grassLocalPhase + uGrassTime * ${GRASS_SWAY_PRIMARY_FREQUENCY.toFixed(2)} + position.y * 1.15);
float grassFlutter = sin(dot(grassWindRegion, grassWorldSideDirection) * 0.1 + uGrassTime * ${GRASS_SWAY_FLUTTER_FREQUENCY.toFixed(2)} + position.y * 1.7) * grassNearDetailMask;
transformed.xz += (
  grassLocalWindDirection * grassWave
  + grassLocalSideDirection * grassFlutter * ${GRASS_SWAY_FLUTTER_STRENGTH.toFixed(2)}
) * uGrassSwayStrength * grassTipMask * grassSwayMask;`,
      );
    applyGrassColorGrade(shader, options.grade || GRASS_COLOR_GRADE, true, material.userData.ribbonGrassMaps, options.translucencyStrength || 0.14);
  };
  material.customProgramCacheKey = () => `${GRASS_SWAY_PROGRAM_KEY}-${options.translucencyStrength || 0.14}`;

  return material;
}

function configureGrassMaterial(material) {
  material.transparent = false;
  material.alphaTest = GRASS_ALPHA_TEST;
  material.depthWrite = true;
  material.depthTest = true;
  material.alphaToCoverage = false;
  if ('emissive' in material) {
    material.emissive = new THREE.Color(GRASS_SHADOW_LIFT_COLOR);
    material.emissiveIntensity = Math.min(material.emissiveIntensity || GRASS_EMISSIVE_INTENSITY, GRASS_EMISSIVE_INTENSITY);
  }
  material.onBeforeCompile = (shader) => {
    applyGrassAlphaMap(shader);
    applyGrassShadowLift(shader);
  };
  material.customProgramCacheKey = () => 'ribbon-grass-readable-alpha-red-v2';
  material.needsUpdate = true;
}

function applyGrassColorGrade(shader, grade, useHeightShading, maps = {}, translucencyStrength = 0.1) {
  shader.uniforms.uGrassShadowLiftColor = { value: new THREE.Color(GRASS_SHADOW_LIFT_COLOR) };
  shader.uniforms.uGrassShadowLiftIntensity = { value: GRASS_SHADOW_LIFT_INTENSITY };
  shader.uniforms.uGrassBrightness = { value: grade.brightness };
  shader.uniforms.uGrassSaturation = { value: grade.saturation };
  shader.uniforms.uGrassHighlightCompression = { value: grade.highlightCompression };
  shader.uniforms.uGrassTranslucencyMap = { value: maps.translucency || null };
  shader.uniforms.uGrassTranslucencyStrength = { value: translucencyStrength };
  shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
uniform vec3 uGrassShadowLiftColor;
uniform float uGrassShadowLiftIntensity;
uniform float uGrassBrightness;
uniform float uGrassSaturation;
uniform float uGrassHighlightCompression;
uniform sampler2D uGrassTranslucencyMap;
uniform float uGrassTranslucencyStrength;
${useHeightShading ? 'varying float vGrassHeightRatio;' : ''}`,
    );
  applyGrassAlphaMap(shader);
  shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `float grassHeightShade = ${useHeightShading ? 'vGrassHeightRatio' : '0.62'};
	float grassRootMask = 1.0 - smoothstep(0.04, 0.42, grassHeightShade);
	float grassTipMask = smoothstep(0.54, 1.0, grassHeightShade);
	vec3 grassTranslucency = texture2D(uGrassTranslucencyMap, vMapUv).rgb;
	gl_FragColor.rgb *= mix(1.0, 0.72, grassRootMask);
	gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb + vec3(0.035, 0.045, 0.018), grassTipMask * 0.24);
	gl_FragColor.rgb += grassTranslucency * grassTipMask * uGrassTranslucencyStrength;
float grassLuminance = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
float grassShadowMask = 1.0 - smoothstep(0.14, 0.52, grassLuminance);
gl_FragColor.rgb = max(gl_FragColor.rgb, diffuseColor.rgb * grassShadowMask * 0.38);
gl_FragColor.rgb += uGrassShadowLiftColor * grassShadowMask * uGrassShadowLiftIntensity;
grassLuminance = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
vec3 grassGray = vec3(grassLuminance);
float grassHighlightMask = smoothstep(0.42, 0.92, grassLuminance);
gl_FragColor.rgb = mix(grassGray, gl_FragColor.rgb, uGrassSaturation);
gl_FragColor.rgb *= uGrassBrightness;
gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * (1.0 - uGrassHighlightCompression), grassHighlightMask);
#include <dithering_fragment>`,
    );
}

function applyGrassAlphaMap(shader) {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <alphamap_fragment>',
    `#ifdef USE_ALPHAMAP
diffuseColor.a *= texture2D(alphaMap, vAlphaMapUv).r;
#endif`,
  );
}

function applyGrassShadowLift(shader) {
  shader.uniforms.uGrassShadowLiftColor = { value: new THREE.Color(GRASS_SHADOW_LIFT_COLOR) };
  shader.uniforms.uGrassShadowLiftIntensity = { value: GRASS_SHADOW_LIFT_INTENSITY };
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
uniform vec3 uGrassShadowLiftColor;
uniform float uGrassShadowLiftIntensity;`,
    )
    .replace(
      '#include <dithering_fragment>',
      `float grassLuminance = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
float grassShadowMask = 1.0 - smoothstep(0.14, 0.52, grassLuminance);
gl_FragColor.rgb = max(gl_FragColor.rgb, diffuseColor.rgb * grassShadowMask * 0.38);
gl_FragColor.rgb += uGrassShadowLiftColor * grassShadowMask * uGrassShadowLiftIntensity;
#include <dithering_fragment>`,
    );
}

export function isGrassArea(terrain, x, z, surface = null) {
  const sample = surface ?? sampleTerrainSurface(terrain, x, z);
  const vGroundMask = sample.groundMask;
  const height = sample.height;
  const lowGroundFade = 1 - smoothstep(GRASS_LOWLAND_FADE_START, GRASS_LOWLAND_FADE_END, height);
  const groundMask = smoothstepRange(0.08, 0.82, vGroundMask) * lowGroundFade;

  return groundMask > GRASS_GROUND_MASK_THRESHOLD;
}

export function generatePlacementsInRect(terrain, minX, minZ, maxX, maxZ, density) {
  const cellSize = Math.sqrt(1 / density);
  const placements = [];

  for (
    let worldZ = minZ - cellSize * 0.5;
    worldZ <= maxZ + cellSize * 0.5;
    worldZ += cellSize
  ) {
    for (
      let worldX = minX - cellSize * 0.5;
      worldX <= maxX + cellSize * 0.5;
      worldX += cellSize
    ) {
      const gridX = Math.round(worldX / cellSize);
      const gridZ = Math.round(worldZ / cellSize);

      const jitterX = (hash2(gridX, gridZ) - 0.5) * cellSize;
      const jitterZ = (hash2(gridX + 17.31, gridZ - 9.73) - 0.5) * cellSize;
      const x = worldX + jitterX;
      const z = worldZ + jitterZ;

      if (x < minX || x > maxX || z < minZ || z > maxZ) continue;

      const patches = getPatchesForPoint(x, z);
      const patchInfluence = getPatchInfluenceAt(x, z, patches);
      if (!shouldPlaceInPatch(x, z, gridX, gridZ, patchInfluence)) continue;
      if (!isGrassArea(terrain, x, z)) continue;
      if (isInRiverGrassExclusion(x, z, RIVER_BUFFER)) continue;
      if (isInWaterSystemVegetationExclusion(x, z, RIVER_BUFFER)) continue;
      if (isInSmallLakeExclusion(x, z)) continue;
      if (isInMountainTrailGrassExclusion(x, z)) continue;

      const clustered = getClusteredOffset(x, z, gridX, gridZ, patches);

      if (isInRiverGrassExclusion(clustered.x, clustered.z, RIVER_BUFFER)) continue;
      if (isInWaterSystemVegetationExclusion(clustered.x, clustered.z, RIVER_BUFFER)) continue;
      if (isInSmallLakeExclusion(clustered.x, clustered.z)) continue;
      if (isInMountainTrailGrassExclusion(clustered.x, clustered.z)) continue;

      const clusteredInfluence = getPatchInfluenceAt(clustered.x, clustered.z, patches);
      placements.push(createPlacement(terrain, clustered.x, clustered.z, gridX, gridZ, clusteredInfluence));
    }
  }

  return placements;
}

export function buildInstancedMeshes(placements, variants, parent, lodLevel = 0) {
  for (const [variantName, variant] of variants) {
    const variantPlacements = placements.filter((p) => p.variantName === variantName);
    const leaves = lodLevel >= 3
      ? variant.billboard
      : variant.lods[Math.min(lodLevel, variant.lods.length - 1)];

    if (variantPlacements.length === 0) continue;

    for (const leaf of leaves) {
      const mesh = new THREE.InstancedMesh(
        leaf.geometry,
        leaf.material,
        variantPlacements.length,
      );

      mesh.name = `${variantName}_${leaf.name}_Instances`;
      mesh.castShadow = false;
      mesh.receiveShadow = lodLevel === 0;

      for (let i = 0; i < variantPlacements.length; i += 1) {
        mesh.setMatrixAt(i, variantPlacements[i].matrix);
        mesh.setColorAt(i, getGrassInstanceColor(variantPlacements[i].isDry));
      }

      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      parent.add(mesh);
    }
  }
}

export function hash2(x, z) {
  const value = Math.sin((x * 127.1) + (z * 311.7)) * 43758.5453123;

  return value - Math.floor(value);
}

export function sampleGrassCommunity(worldX, worldZ, gridX, gridZ) {
  const macro = sampleRotatedValueNoise(
    worldX,
    worldZ,
    GRASS_COMMUNITY_MACRO_SIZE,
    GRASS_MACRO_ROTATION_COS,
    GRASS_MACRO_ROTATION_SIN,
    17.3,
    -41.9,
  );
  const micro = sampleRotatedValueNoise(
    worldX,
    worldZ,
    GRASS_COMMUNITY_MICRO_SIZE,
    GRASS_MICRO_ROTATION_COS,
    GRASS_MICRO_ROTATION_SIN,
    -63.7,
    28.1,
  );
  const macroInfluence = smoothstep(0.34, 0.68, macro.value);
  const influence = THREE.MathUtils.clamp(
    macroInfluence * THREE.MathUtils.lerp(0.72, 1, micro.value),
    0,
    1,
  );
  const acceptanceInfluence = smoothstep(0, 0.9, Math.sqrt(influence));
  const acceptance = THREE.MathUtils.lerp(
    GRASS_COMMUNITY_GAP_ACCEPTANCE,
    GRASS_COMMUNITY_CORE_ACCEPTANCE,
    acceptanceInfluence,
  );
  const communityX = Math.round(macro.x);
  const communityZ = Math.round(macro.z);
  const primaryVariantIndex = Math.min(
    Math.floor(hash2(communityX + 83.4, communityZ - 19.7) * RIBBON_GRASS_VARIANTS.length),
    RIBBON_GRASS_VARIANTS.length - 1,
  );
  const secondaryOffset = 1 + Math.min(
    Math.floor(hash2(communityX - 27.1, communityZ + 64.2) * (RIBBON_GRASS_VARIANTS.length - 1)),
    RIBBON_GRASS_VARIANTS.length - 2,
  );
  const secondaryVariantIndex = (primaryVariantIndex + secondaryOffset) % RIBBON_GRASS_VARIANTS.length;
  const roleRoll = hash2(gridX + 41.6, gridZ - 93.2);
  let variantIndex = primaryVariantIndex;

  if (roleRoll >= GRASS_COMMUNITY_PRIMARY_RATIO) {
    if (roleRoll < GRASS_COMMUNITY_PRIMARY_RATIO + GRASS_COMMUNITY_SECONDARY_RATIO) {
      variantIndex = secondaryVariantIndex;
    } else {
      let remainingIndex = Math.min(
        Math.floor(hash2(gridX - 18.5, gridZ + 72.4) * (RIBBON_GRASS_VARIANTS.length - 2)),
        RIBBON_GRASS_VARIANTS.length - 3,
      );

      for (let index = 0; index < RIBBON_GRASS_VARIANTS.length; index += 1) {
        if (index === primaryVariantIndex || index === secondaryVariantIndex) continue;
        if (remainingIndex === 0) {
          variantIndex = index;
          break;
        }
        remainingIndex -= 1;
      }
    }
  }

  return {
    influence,
    acceptance,
    accepted: hash2(gridX - 54.8, gridZ + 16.9) < acceptance,
    communityX,
    communityZ,
    primaryVariantName: getGrassVariantName(primaryVariantIndex / RIBBON_GRASS_VARIANTS.length),
    secondaryVariantName: getGrassVariantName(secondaryVariantIndex / RIBBON_GRASS_VARIANTS.length),
    variantName: getGrassVariantName(variantIndex / RIBBON_GRASS_VARIANTS.length),
    isDry: sampleDryGrass(worldX, worldZ, gridX, gridZ),
  };
}

export function getGrassInstanceColor(isDry) {
  return isDry ? GRASS_DRY_INSTANCE_COLOR : GRASS_GREEN_INSTANCE_COLOR;
}

export function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}

function sampleRotatedValueNoise(worldX, worldZ, scale, cos, sin, seedX, seedZ) {
  const x = (worldX * cos - worldZ * sin) / scale;
  const z = (worldX * sin + worldZ * cos) / scale;
  const cellX = Math.floor(x);
  const cellZ = Math.floor(z);
  const localX = x - cellX;
  const localZ = z - cellZ;
  const blendX = localX * localX * (3 - 2 * localX);
  const blendZ = localZ * localZ * (3 - 2 * localZ);
  const bottom = THREE.MathUtils.lerp(
    hash2(cellX + seedX, cellZ + seedZ),
    hash2(cellX + 1 + seedX, cellZ + seedZ),
    blendX,
  );
  const top = THREE.MathUtils.lerp(
    hash2(cellX + seedX, cellZ + 1 + seedZ),
    hash2(cellX + 1 + seedX, cellZ + 1 + seedZ),
    blendX,
  );

  return {
    value: THREE.MathUtils.lerp(bottom, top, blendZ),
    x,
    z,
  };
}

function smoothstepRange(edge0, edge1, value) {
  return smoothstep(edge0, edge1, value);
}

export function createPlacement(terrain, x, z, seedX, seedZ, community = 1, surface = null) {
  const sample = surface ?? sampleTerrainSurface(terrain, x, z);
  const y = sample.height;
  const normal = SURFACE_NORMAL.set(sample.normalX, sample.normalY, sample.normalZ);
  const communityInfluence = typeof community === 'number' ? community : community.influence;
  const yaw = hash2(seedX - 41.8, seedZ + 12.6) * Math.PI * 2;
  const edgeStrength = smoothstep(0.12, 0.88, communityInfluence);
  const scaleValue = THREE.MathUtils.lerp(0.82, 1.05, edgeStrength) * THREE.MathUtils.lerp(0.92, 1.12, hash2(seedX + 5.7, seedZ + 33.1));
  const variantRoll = hash2(seedX + 91.2, seedZ - 11.4);
  const lodRoll = hash2(seedX - 73.6, seedZ + 48.9);
  const transitionRoll = hash2(seedX + 28.4, seedZ - 67.3);
  const tilt = new THREE.Quaternion().setFromUnitVectors(UP, normal);
  const rotation = new THREE.Quaternion().setFromAxisAngle(normal, yaw).multiply(tilt);
  const scale = new THREE.Vector3(scaleValue, scaleValue, scaleValue);
  const matrix = new THREE.Matrix4();

  matrix.compose(new THREE.Vector3(x, y, z), rotation, scale);

  return {
    matrix,
    variantName: typeof community === 'number'
      ? getGrassVariantName(variantRoll)
      : community.variantName,
    isDry: typeof community === 'number' || typeof community.isDry !== 'boolean'
      ? sampleDryGrass(x, z, seedX, seedZ)
      : community.isDry,
    lodRoll,
    transitionRoll,
  };
}

function sampleDryGrass(worldX, worldZ, gridX, gridZ) {
  const macro = sampleRotatedValueNoise(
    worldX,
    worldZ,
    3.6,
    GRASS_DRY_MACRO_ROTATION_COS,
    GRASS_DRY_MACRO_ROTATION_SIN,
    127.4,
    -88.2,
  );
  const detail = sampleRotatedValueNoise(
    worldX,
    worldZ,
    1,
    GRASS_DRY_DETAIL_ROTATION_COS,
    GRASS_DRY_DETAIL_ROTATION_SIN,
    -35.6,
    146.8,
  );
  const field = macro.value * 0.82 + detail.value * 0.18;
  const dryProbability = smoothstep(0.665, 0.785, field);

  return hash2(gridX + 203.7, gridZ - 119.4) < dryProbability;
}

export function sampleTerrainSurface(terrain, x, z, target = {}) {
  if (typeof terrain.sampleSurfaceAt === 'function') {
    return terrain.sampleSurfaceAt(x, z, target);
  }

  const normal = terrain.getNormalAt(x, z);
  target.height = terrain.getHeightAt(x, z);
  target.normalX = normal.x;
  target.normalY = normal.y;
  target.normalZ = normal.z;
  target.groundMask = terrain.getTerrainGroundMask?.(x, z) ?? 1;
  return target;
}

function getGrassVariantName(roll) {
  const variantIndex = Math.min(Math.floor(roll * RIBBON_GRASS_VARIANTS.length), RIBBON_GRASS_VARIANTS.length - 1);

  return `RibbonGrass_${RIBBON_GRASS_VARIANTS[variantIndex]}`;
}

function getPatchesForPoint(worldX, worldZ) {
  const gridX = Math.floor((worldX + HALF_MAP_SIZE) / ZONE_SIZE);
  const gridZ = Math.floor((worldZ + HALF_MAP_SIZE) / ZONE_SIZE);
  const patches = [];

  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const key = `${gridX + dx},${gridZ + dz}`;
      if (!patchCellCache.has(key)) {
        const minX = (gridX + dx) * ZONE_SIZE - HALF_MAP_SIZE;
        const minZ = (gridZ + dz) * ZONE_SIZE - HALF_MAP_SIZE;
        patchCellCache.set(key, createPatchCell(minX, minZ, ZONE_SIZE));
      }
      patches.push(...patchCellCache.get(key));
    }
  }

  return patches;
}

function createPatchCell(minX, minZ, size) {
  const patches = [];
  const maxX = minX + size;
  const maxZ = minZ + size;

  patches.push({
    x: (minX + maxX) / 2,
    z: (minZ + maxZ) / 2,
    radius: size * 0.35,
  });

  const patchCount = 8;
  for (let i = 1; i < patchCount; i += 1) {
    const angle = hash2(minX + i * 9.4, minZ + i * -2.8) * Math.PI * 2;
    const distance = Math.sqrt(hash2(minX + i * -4.7, minZ + i * 15.2)) * (size * 0.4);
    const radius = THREE.MathUtils.lerp(1.5, 4.0, hash2(minX + i * 31.6, minZ + i * -18.9));

    patches.push({
      x: (minX + maxX) / 2 + Math.cos(angle) * distance,
      z: (minZ + maxZ) / 2 + Math.sin(angle) * distance,
      radius,
    });
  }

  return patches;
}

function shouldPlaceInPatch(worldX, worldZ, gridX, gridZ, patchInfluence) {
  const edgeNoise = hash2(gridX * 1.73 + 19.2, gridZ * -2.11 - 7.4);
  const fineBreakup = 0.5 + 0.5 * Math.sin(worldX * 2.1 + Math.sin(worldZ * 1.7) * 1.6);
  const localAcceptance = THREE.MathUtils.lerp(
    Math.min(PATCH_GAP_ACCEPTANCE, 0.12),
    PATCH_FULL_ACCEPTANCE,
    smoothstep(0.16, 0.88, patchInfluence),
  );

  return edgeNoise < localAcceptance - ((1 - patchInfluence) * 0.2) + ((fineBreakup - 0.5) * 0.14);
}

function getClusteredOffset(worldX, worldZ, gridX, gridZ, patches) {
  const patch = getStrongestPatch(worldX, worldZ, patches);

  if (!patch) return { x: worldX, z: worldZ };

  const dx = patch.x - worldX;
  const dz = patch.z - worldZ;
  const distance = Math.sqrt(dx * dx + dz * dz);
  const influence = 1 - smoothstep(patch.radius * 0.2, patch.radius, distance);
  const pull = influence * THREE.MathUtils.lerp(0.12, 0.24, hash2(gridX - 14.2, gridZ + 55.8));

  return {
    x: worldX + dx * pull,
    z: worldZ + dz * pull,
  };
}

function getStrongestPatch(worldX, worldZ, patches) {
  let strongest = null;
  let strongestInfluence = 0;

  for (const patch of patches) {
    const dx = worldX - patch.x;
    const dz = worldZ - patch.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const influence = 1 - smoothstep(patch.radius * 0.28, patch.radius, distance);

    if (influence <= strongestInfluence) continue;

    strongestInfluence = influence;
    strongest = patch;
  }

  return strongest;
}

function getPatchInfluenceAt(worldX, worldZ, patches) {
  let influence = 0;
  let layeredInfluence = 0;

  for (const patch of patches) {
    const dx = worldX - patch.x;
    const dz = worldZ - patch.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const patchInfluence = 1 - smoothstep(patch.radius * 0.42, patch.radius * 1.22, distance);

    influence = Math.max(influence, patchInfluence);
    layeredInfluence += patchInfluence * 0.42;
  }

  const broadBreakup = 0.5 + 0.5 * Math.sin(worldX * 0.72 + worldZ * 0.41);
  const edgeBreakup = 0.5 + 0.5 * Math.sin(worldX * 1.37 - worldZ * 1.91);

  return THREE.MathUtils.clamp(
    Math.max(influence, layeredInfluence) * 0.84 + broadBreakup * 0.1 + edgeBreakup * 0.06,
    0,
    1,
  );
}

function createGrassPatches() {
  const patches = [{ x: 0, z: 0, radius: 2.4 }];

  for (let i = 0; i < PATCH_COUNT - 1; i += 1) {
    const angle = hash2(i + 9.4, i - 2.8) * Math.PI * 2;
    const distance = Math.sqrt(hash2(i - 4.7, i + 15.2)) * (PLACEMENT_RADIUS - PATCH_MAX_RADIUS);
    const radius = THREE.MathUtils.lerp(PATCH_MIN_RADIUS, PATCH_MAX_RADIUS, hash2(i + 31.6, i - 18.9));

    patches.push({
      x: Math.cos(angle) * distance,
      z: Math.sin(angle) * distance,
      radius,
    });
  }

  return patches;
}

export async function createGrassClumps(terrain) {
  const asset = await loadGrassModel();
  const variants = createGrassVariants(asset);
  const placements = createGrassPlacements(terrain);
  const group = new THREE.Group();

  group.name = 'GrassClumps';
  buildInstancedMeshes(placements, variants, group);

  return group;
}

export function updateGrassClumps(variants, playerPosition, elapsedTime) {
  const updatedUniforms = new Set();

  for (const variant of variants?.values?.() ?? []) {
    for (const leaves of variant.lods ?? []) {
      for (const leaf of leaves) {
        const uniforms = leaf.material?.userData?.grassUniforms;

        if (!uniforms || updatedUniforms.has(uniforms)) continue;

        uniforms.uGrassTime.value = elapsedTime;
        uniforms.uGrassPlayerPosition.value.set(playerPosition.x, playerPosition.z);
        updatedUniforms.add(uniforms);
      }
    }
  }
}

function createGrassPlacements(terrain) {
  const placements = [];
  const radiusInCells = Math.ceil(PLACEMENT_RADIUS / CELL_SIZE);

  for (let gridZ = -radiusInCells; gridZ <= radiusInCells; gridZ += 1) {
    for (let gridX = -radiusInCells; gridX <= radiusInCells; gridX += 1) {
      const jitterX = hash2(gridX, gridZ) - 0.5;
      const jitterZ = hash2(gridX + 17.31, gridZ - 9.73) - 0.5;
      const offsetX = (gridX + jitterX) * CELL_SIZE;
      const offsetZ = (gridZ + jitterZ) * CELL_SIZE;

      if ((offsetX * offsetX) + (offsetZ * offsetZ) > PLACEMENT_RADIUS * PLACEMENT_RADIUS) {
        continue;
      }

      const patches = grassPatches;
      const patchInfluence = getPatchInfluenceAt(offsetX, offsetZ, patches);
      if (!shouldPlaceInPatch(offsetX, offsetZ, gridX, gridZ, patchInfluence)) continue;

      const clusteredOffset = getClusteredOffset(offsetX, offsetZ, gridX, gridZ, patches);
      const x = PLAYER_SPAWN_POSITION.x + clusteredOffset.x;
      const z = PLAYER_SPAWN_POSITION.z + clusteredOffset.z;

      if (isInRiverGrassExclusion(x, z, RIVER_BUFFER)) continue;
      if (isInWaterSystemVegetationExclusion(x, z, RIVER_BUFFER)) continue;
      if (isInSmallLakeExclusion(x, z)) continue;
      if (isInMountainTrailGrassExclusion(x, z)) continue;

      const clusteredInfluence = getPatchInfluenceAt(clusteredOffset.x, clusteredOffset.z, patches);
      placements.push(createPlacement(terrain, x, z, gridX, gridZ, clusteredInfluence));
    }
  }

  return placements;
}
