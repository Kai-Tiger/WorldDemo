import * as THREE from 'three';

export const TERRAIN_MATERIAL_LOD = Object.freeze({
  NEAR: 'near',
  MEDIUM: 'medium',
  FAR: 'far',
});

const TERRAIN_TEXTURE_BUDGETS = Object.freeze({
  [TERRAIN_MATERIAL_LOD.NEAR]: Object.freeze({ typical: 8, maximum: 14 }),
  [TERRAIN_MATERIAL_LOD.MEDIUM]: Object.freeze({ typical: 5, maximum: 9 }),
  [TERRAIN_MATERIAL_LOD.FAR]: Object.freeze({ typical: 3, maximum: 5 }),
});

const TERRAIN_VERTEX_PARAMETERS = `
attribute float groundMask;
attribute float riverMask;
attribute float riverBedMask;
attribute float riverUnderwaterMask;
attribute vec2 riverBedCoord;
attribute vec4 waterSystemMask;
attribute float smallLakesMask;
attribute vec4 roadFrame;

varying vec2 vTerrainRiverBedCoord;
varying vec3 vTerrainWorldPosition;
varying vec3 vTerrainWorldNormal;
varying float vTerrainGroundMask;
varying float vTerrainRiverMask;
varying float vTerrainRiverBedMask;
varying float vTerrainRiverUnderwaterMask;
varying vec4 vTerrainWaterSystemMask;
varying float vTerrainSmallLakesMask;
varying vec4 vTerrainRoadFrame;
varying vec4 vTerrainMacro;

float terrainVertexHash(vec2 value) {
  return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
}

float terrainVertexNoise(vec2 value) {
  vec2 cell = floor(value);
  vec2 local = fract(value);
  vec2 blend = local * local * (3.0 - 2.0 * local);
  float a = terrainVertexHash(cell);
  float b = terrainVertexHash(cell + vec2(1.0, 0.0));
  float c = terrainVertexHash(cell + vec2(0.0, 1.0));
  float d = terrainVertexHash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, blend.x), mix(c, d, blend.x), blend.y);
}
`;

const TERRAIN_VERTEX_ASSIGNMENTS = `
vec4 terrainWorldPosition = modelMatrix * vec4(transformed, 1.0);
vTerrainRiverBedCoord = riverBedCoord;
vTerrainWorldPosition = terrainWorldPosition.xyz;
vTerrainWorldNormal = inverseTransformDirection(transformedNormal, viewMatrix);
vTerrainGroundMask = groundMask;
vTerrainRiverMask = riverMask;
vTerrainRiverBedMask = riverBedMask;
vTerrainRiverUnderwaterMask = riverUnderwaterMask;
vTerrainWaterSystemMask = waterSystemMask;
vTerrainSmallLakesMask = smallLakesMask;
vTerrainRoadFrame = roadFrame;
vTerrainMacro = vec4(
  terrainVertexNoise(terrainWorldPosition.xz * 0.012 + vec2(2.8, -7.1)),
  terrainVertexNoise(terrainWorldPosition.xz * 0.0065 + vec2(-8.0, 4.0)),
  terrainVertexNoise(terrainWorldPosition.xz * 0.055 + vec2(-3.0, 12.0)),
  terrainVertexNoise(terrainWorldPosition.xz * 0.003 + vec2(17.0, -11.0))
);
`;

const TERRAIN_FRAGMENT_UNIFORMS = `
uniform sampler2D uRockTexture;
uniform sampler2D uRockNormalTexture;
uniform sampler2D uSnowTexture;
uniform sampler2D uGroundDirtAlbedoTexture;
uniform sampler2D uGroundDirtNormalTexture;
uniform sampler2D uForestFloorBaseColorTexture;
uniform sampler2D uForestFloorNormalTexture;
uniform sampler2D uGravelAlbedoTexture;
uniform sampler2D uGravelNormalTexture;
uniform sampler2D uRiverBankTexture;
uniform sampler2D uRiverBedTexture;

uniform float uAlpineTextureWorldSize;
uniform float uGroundDirtTextureWorldSize;
uniform float uForestFloorTextureWorldSize;
uniform float uGravelTextureWorldSize;
uniform float uRiverBankTextureWorldSize;
uniform float uRiverBedTextureWorldSize;

varying vec2 vTerrainRiverBedCoord;
varying vec3 vTerrainWorldPosition;
varying vec3 vTerrainWorldNormal;
varying float vTerrainGroundMask;
varying float vTerrainRiverMask;
varying float vTerrainRiverBedMask;
varying float vTerrainRiverUnderwaterMask;
varying vec4 vTerrainWaterSystemMask;
varying float vTerrainSmallLakesMask;
varying vec4 vTerrainRoadFrame;
varying vec4 vTerrainMacro;

float terrainHash(vec2 value) {
  return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
}

mat2 terrainRotation(float angle) {
  float sine = sin(angle);
  float cosine = cos(angle);
  return mat2(cosine, -sine, sine, cosine);
}

vec2 terrainRotateQuarter(vec2 value, float turn) {
  if (turn < 0.5) return value;
  if (turn < 1.5) return vec2(-value.y, value.x);
  if (turn < 2.5) return -value;
  return vec2(value.y, -value.x);
}

vec2 terrainRotateQuarterInverse(vec2 value, float turn) {
  if (turn < 0.5) return value;
  if (turn < 1.5) return vec2(value.y, -value.x);
  if (turn < 2.5) return -value;
  return vec2(-value.y, value.x);
}

float terrainForestFloorCellTurn(vec2 cell) {
  return floor(terrainHash(cell + vec2(31.3, 11.7)) * 4.0);
}

vec2 terrainForestFloorCellOffset(vec2 cell) {
  return vec2(
    terrainHash(cell + vec2(5.2, 1.7)),
    terrainHash(cell + vec2(8.3, 2.8))
  ) * 19.0;
}

vec4 terrainForestFloorCellWeights(vec2 baseUv) {
  vec2 blend = smoothstep(vec2(0.18), vec2(0.82), fract(baseUv));
  vec4 weights = vec4(
    (1.0 - blend.x) * (1.0 - blend.y),
    blend.x * (1.0 - blend.y),
    (1.0 - blend.x) * blend.y,
    blend.x * blend.y
  );
  weights *= weights;
  return weights / max(dot(weights, vec4(1.0)), 0.0001);
}

vec4 sampleTerrainForestFloorCell(
  sampler2D terrainTexture,
  vec2 baseUv,
  vec2 baseUvDx,
  vec2 baseUvDy,
  vec2 cell
) {
  float turn = terrainForestFloorCellTurn(cell);
  vec2 uv = terrainRotateQuarter(baseUv, turn) + terrainForestFloorCellOffset(cell);
  vec2 uvDx = terrainRotateQuarter(baseUvDx, turn);
  vec2 uvDy = terrainRotateQuarter(baseUvDy, turn);
  return texture2DGradEXT(terrainTexture, uv, uvDx, uvDy);
}

vec3 sampleTerrainForestFloorColor(
  sampler2D terrainTexture,
  vec2 baseUv,
  vec2 baseUvDx,
  vec2 baseUvDy
) {
  vec2 cell = floor(baseUv);
  vec4 weights = terrainForestFloorCellWeights(baseUv);
  vec3 a = sampleTerrainForestFloorCell(
    terrainTexture,
    baseUv,
    baseUvDx,
    baseUvDy,
    cell
  ).rgb;
  vec3 b = sampleTerrainForestFloorCell(
    terrainTexture,
    baseUv,
    baseUvDx,
    baseUvDy,
    cell + vec2(1.0, 0.0)
  ).rgb;
  vec3 c = sampleTerrainForestFloorCell(
    terrainTexture,
    baseUv,
    baseUvDx,
    baseUvDy,
    cell + vec2(0.0, 1.0)
  ).rgb;
  vec3 d = sampleTerrainForestFloorCell(
    terrainTexture,
    baseUv,
    baseUvDx,
    baseUvDy,
    cell + vec2(1.0, 1.0)
  ).rgb;
  return a * weights.x + b * weights.y + c * weights.z + d * weights.w;
}

vec2 sampleTerrainForestFloorSlopeCell(
  sampler2D normalTexture,
  vec2 baseUv,
  vec2 baseUvDx,
  vec2 baseUvDy,
  vec2 cell
) {
  float turn = terrainForestFloorCellTurn(cell);
  vec3 tangentNormal = sampleTerrainForestFloorCell(
    normalTexture,
    baseUv,
    baseUvDx,
    baseUvDy,
    cell
  ).rgb * 2.0 - 1.0;
  vec2 terrainSlope = -tangentNormal.xy / max(tangentNormal.z, 0.08);
  return terrainRotateQuarterInverse(terrainSlope, turn);
}

vec3 sampleTerrainForestFloorNormal(
  sampler2D normalTexture,
  vec2 baseUv,
  vec2 baseUvDx,
  vec2 baseUvDy
) {
  vec2 cell = floor(baseUv);
  vec4 weights = terrainForestFloorCellWeights(baseUv);
  vec2 terrainSlope = sampleTerrainForestFloorSlopeCell(
    normalTexture,
    baseUv,
    baseUvDx,
    baseUvDy,
    cell
  ) * weights.x;
  terrainSlope += sampleTerrainForestFloorSlopeCell(
    normalTexture,
    baseUv,
    baseUvDx,
    baseUvDy,
    cell + vec2(1.0, 0.0)
  ) * weights.y;
  terrainSlope += sampleTerrainForestFloorSlopeCell(
    normalTexture,
    baseUv,
    baseUvDx,
    baseUvDy,
    cell + vec2(0.0, 1.0)
  ) * weights.z;
  terrainSlope += sampleTerrainForestFloorSlopeCell(
    normalTexture,
    baseUv,
    baseUvDx,
    baseUvDy,
    cell + vec2(1.0, 1.0)
  ) * weights.w;
  vec3 tangentNormal = normalize(vec3(-terrainSlope.x, -terrainSlope.y, 1.0));
  return normalize(vec3(tangentNormal.x, tangentNormal.z, tangentNormal.y));
}

vec3 gradeTerrainForestFloor(vec3 baseColor) {
  float luminance = dot(baseColor, vec3(0.2126, 0.7152, 0.0722));
  vec3 desaturated = mix(vec3(luminance), baseColor, 0.66);
  vec3 earthTint = desaturated * vec3(1.12, 0.98, 0.90);
  return earthTint * 1.24 + vec3(0.009, 0.008, 0.005);
}
`;

const NEAR_SAMPLING_FUNCTIONS = `
vec3 sampleTerrainLayer(sampler2D terrainTexture, vec2 uv, float seed) {
  vec3 primary = texture2D(terrainTexture, uv).rgb;
  float angle = (terrainHash(floor(vTerrainWorldPosition.xz / 32.0) + seed) - 0.5) * 1.8;
  vec2 rotatedUv = terrainRotation(angle) * (uv * 0.61) + vec2(seed * 3.1, -seed * 1.7);
  vec3 secondary = texture2D(terrainTexture, rotatedUv).rgb;
  return mix(primary, secondary, 0.32);
}

vec3 sampleTerrainNormal(sampler2D normalTexture, vec2 uv) {
  vec3 tangentNormal = texture2D(normalTexture, uv).rgb * 2.0 - 1.0;
  return normalize(vec3(tangentNormal.x, tangentNormal.z, tangentNormal.y));
}

vec3 sampleTerrainRock(vec3 worldPosition, vec3 worldNormal, float textureWorldSize) {
  vec3 blend = pow(abs(worldNormal), vec3(4.0));
  blend /= max(blend.x + blend.y + blend.z, 0.0001);
  vec3 xSample = texture2D(uRockTexture, worldPosition.zy / textureWorldSize + vec2(21.0, 6.0)).rgb;
  vec3 ySample = texture2D(uRockTexture, worldPosition.xz / textureWorldSize + vec2(21.0, 6.0)).rgb;
  vec3 zSample = texture2D(uRockTexture, worldPosition.xy / textureWorldSize + vec2(21.0, 6.0)).rgb;
  return xSample * blend.x + ySample * blend.y + zSample * blend.z;
}

vec3 sampleTerrainRockNormal(vec3 worldPosition, vec3 worldNormal, float textureWorldSize) {
  vec3 blend = pow(abs(worldNormal), vec3(4.0));
  blend /= max(blend.x + blend.y + blend.z, 0.0001);
  vec3 xNormal = texture2D(uRockNormalTexture, worldPosition.zy / textureWorldSize + vec2(21.0, 6.0)).rgb * 2.0 - 1.0;
  vec3 yNormal = texture2D(uRockNormalTexture, worldPosition.xz / textureWorldSize + vec2(21.0, 6.0)).rgb * 2.0 - 1.0;
  vec3 zNormal = texture2D(uRockNormalTexture, worldPosition.xy / textureWorldSize + vec2(21.0, 6.0)).rgb * 2.0 - 1.0;
  vec3 axisSign = sign(worldNormal + vec3(0.0001));
  vec3 xWorld = normalize(vec3(xNormal.z * axisSign.x, xNormal.y, xNormal.x));
  vec3 yWorld = normalize(vec3(yNormal.x, yNormal.z * axisSign.y, yNormal.y));
  vec3 zWorld = normalize(vec3(zNormal.x, zNormal.y, zNormal.z * axisSign.z));
  return normalize(xWorld * blend.x + yWorld * blend.y + zWorld * blend.z);
}
`;

const MEDIUM_SAMPLING_FUNCTIONS = `
vec3 sampleTerrainLayer(sampler2D terrainTexture, vec2 uv, float seed) {
  return texture2D(terrainTexture, uv + vec2(seed * 0.37, -seed * 0.21)).rgb;
}

vec3 sampleTerrainNormal(sampler2D normalTexture, vec2 uv) {
  vec3 tangentNormal = texture2D(normalTexture, uv).rgb * 2.0 - 1.0;
  return normalize(vec3(tangentNormal.x, tangentNormal.z, tangentNormal.y));
}

vec3 sampleTerrainRock(vec3 worldPosition, vec3 worldNormal, float textureWorldSize) {
  return texture2D(uRockTexture, worldPosition.xz / textureWorldSize).rgb;
}
`;

const FAR_SAMPLING_FUNCTIONS = `
vec3 sampleTerrainLayer(sampler2D terrainTexture, vec2 uv, float seed) {
  return texture2D(terrainTexture, uv + vec2(seed * 0.19, -seed * 0.11)).rgb;
}
`;

function createTerrainMapFragment(level) {
  const isNear = level === TERRAIN_MATERIAL_LOD.NEAR;
  const isMedium = level === TERRAIN_MATERIAL_LOD.MEDIUM;
  const sampleNormal = isNear || isMedium;
  const rockColor = isNear || isMedium
    ? 'sampleTerrainRock(vTerrainWorldPosition, terrainBaseNormal, uAlpineTextureWorldSize / 0.62)'
    : 'sampleTerrainLayer(uRockTexture, terrainAlpineUv * 0.62, 7.0)';
  const rockNormal = isNear
    ? `terrainSurfaceNormal = normalize(mix(
    terrainSurfaceNormal,
    sampleTerrainRockNormal(vTerrainWorldPosition, terrainBaseNormal, uAlpineTextureWorldSize / 0.62),
    0.5
  ));`
    : '';
  const rockTransitionNormal = isNear
    ? `normalize(mix(
    terrainBaseNormal,
    sampleTerrainRockNormal(vTerrainWorldPosition, terrainBaseNormal, uAlpineTextureWorldSize / 0.62),
    0.5
  ))`
    : 'terrainBaseNormal';
  const normalDeclarations = sampleNormal
    ? 'vec3 terrainSurfaceNormal = terrainBaseNormal;'
    : 'vec3 terrainSurfaceNormal = terrainBaseNormal;';
  const groundBranches = createGroundBranches({ sampleNormal });
  const groundTransition = createGroundTransition({
    sampleNormal,
    rockColor,
    rockTransitionNormal,
  });
  const roadOverlay = createRoadOverlay({ sampleNormal });

  return `
#include <map_fragment>

// Compute all cheap masks before entering any texture-heavy material branch.
vec3 terrainBaseNormal = normalize(vTerrainWorldNormal);
float terrainHeight = vTerrainWorldPosition.y;
float terrainNoisyHeight = terrainHeight + (vTerrainMacro.x - 0.5) * 30.0;
float terrainFlatMask = smoothstep(0.56, 0.92, terrainBaseNormal.y);
float terrainLowlandMask = 1.0 - smoothstep(55.0, 90.0, terrainNoisyHeight);
float terrainGroundMask = smoothstep(0.08, 0.82, vTerrainGroundMask)
  * terrainFlatMask
  * terrainLowlandMask;
float terrainGrassBlend = smoothstep(0.18, 0.62, terrainGroundMask);
float terrainSnowLineHeight = terrainHeight
  + (vTerrainMacro.x - 0.5) * 24.0
  + (vTerrainMacro.z - 0.5) * 8.0;
float terrainSnowElevation = smoothstep(55.0, 130.0, terrainSnowLineHeight);
float terrainSnowSlope = smoothstep(0.30, 0.78, terrainBaseNormal.y);
float terrainSnowCoverage = smoothstep(
  0.12,
  0.88,
  terrainSnowElevation * terrainSnowSlope
    + (vTerrainMacro.z - 0.5) * 0.22
);
float terrainRiverMaterialMask = smoothstep(0.05, 0.95, vTerrainRiverMask);
float terrainRiverUnderwaterMask = smoothstep(0.05, 0.95, vTerrainRiverUnderwaterMask);
float terrainRiverSlopeMask = 1.0 - smoothstep(0.9, 0.985, terrainBaseNormal.y);
float terrainRiverMask = terrainRiverMaterialMask
  * max(terrainRiverSlopeMask, terrainRiverUnderwaterMask);
float terrainRiverBedMask = smoothstep(0.05, 0.95, vTerrainRiverBedMask);
float terrainLakeBedMask = smoothstep(0.04, 0.92, vTerrainWaterSystemMask.x);
float terrainWetShoreMask = smoothstep(0.05, 0.95, vTerrainWaterSystemMask.y);
float terrainSnowmeltWetMask = smoothstep(0.05, 0.92, vTerrainWaterSystemMask.z);
float terrainPlungeMask = smoothstep(0.05, 0.9, vTerrainWaterSystemMask.w);
float terrainWaterBankMask = max(
  terrainRiverMask,
  max(terrainWetShoreMask, terrainSnowmeltWetMask)
);
float terrainWaterBedMask = max(
  terrainRiverBedMask,
  max(terrainLakeBedMask, terrainPlungeMask)
);

vec2 terrainDirtUv = vTerrainWorldPosition.xz / uGroundDirtTextureWorldSize;
vec2 terrainForestFloorUv = vTerrainWorldPosition.xz / uForestFloorTextureWorldSize;
vec2 terrainForestFloorUvDx = dFdx(terrainForestFloorUv);
vec2 terrainForestFloorUvDy = dFdy(terrainForestFloorUv);
vec2 terrainGravelUv = vTerrainWorldPosition.xz / uGravelTextureWorldSize + vec2(4.7, 12.8);
vec2 terrainAlpineUv = vTerrainWorldPosition.xz / uAlpineTextureWorldSize;
vec2 terrainSnowUv = vTerrainWorldPosition.xz / (uAlpineTextureWorldSize * 1.35)
  + vec2(6.4, -3.7);
${normalDeclarations}
vec3 terrainBaseColor;
float terrainRoughness = 0.9;
float terrainOcclusion = 1.0;
float terrainGroundMacroWeight = 0.0;

${groundBranches}
${groundTransition}
else {
  terrainBaseColor = ${rockColor} * vec3(0.66, 0.71, 0.73);
  ${rockNormal}
  terrainRoughness = 0.76;
  terrainOcclusion = 0.96;
}

terrainBaseColor *= mix(
  1.0,
  mix(0.96, 1.05, vTerrainMacro.w),
  terrainGroundMacroWeight * (1.0 - max(terrainWaterBankMask, terrainWaterBedMask))
);

${roadOverlay}

if (terrainSnowCoverage > 0.01) {
  vec3 terrainSnowColor = texture2D(uSnowTexture, terrainSnowUv).rgb
    * vec3(0.90, 0.94, 1.0);
  terrainBaseColor = mix(terrainBaseColor, terrainSnowColor, terrainSnowCoverage);
  terrainSurfaceNormal = normalize(mix(
    terrainSurfaceNormal,
    terrainBaseNormal,
    terrainSnowCoverage * 0.55
  ));
  terrainRoughness = mix(terrainRoughness, 0.94, terrainSnowCoverage);
  terrainOcclusion = mix(terrainOcclusion, 1.0, terrainSnowCoverage);
}

// River, lake, snowmelt and plunge masks stay active in every material LOD.
if (max(terrainWaterBankMask, terrainWaterBedMask) > 0.01) {
  vec3 terrainBankColor = terrainBaseColor;
  vec3 terrainBedColor = terrainBaseColor;
  if (terrainWaterBankMask > 0.01) {
    terrainBankColor = sampleTerrainLayer(
      uRiverBankTexture,
      vTerrainWorldPosition.xz / uRiverBankTextureWorldSize,
      8.0
    );
  }
  if (terrainWaterBedMask > 0.01) {
    float terrainSmallLakeBlend = smoothstep(0.05, 0.95, vTerrainSmallLakesMask);
    vec2 terrainRiverBedUv = mix(
      vec2(vTerrainRiverBedCoord.x / uRiverBedTextureWorldSize, vTerrainRiverBedCoord.y / 3.6),
      vTerrainWorldPosition.xz / uRiverBedTextureWorldSize,
      terrainSmallLakeBlend
    );
    terrainBedColor = sampleTerrainLayer(uRiverBedTexture, terrainRiverBedUv, 9.0);
  }
  terrainBaseColor = mix(terrainBaseColor, terrainBankColor, clamp(terrainWaterBankMask, 0.0, 1.0));
  terrainBaseColor = mix(terrainBaseColor, terrainBedColor, clamp(terrainWaterBedMask, 0.0, 1.0));
  terrainBaseColor *= mix(
    vec3(1.0),
    vec3(0.62, 0.70, 0.74),
    terrainSnowmeltWetMask * 0.34
  );
  terrainRoughness = mix(terrainRoughness, 0.36, max(terrainWaterBankMask, terrainWaterBedMask));
}

diffuseColor.rgb *= terrainBaseColor;
`;
}

function createRoadOverlay({ sampleNormal }) {
  const roadNormal = sampleNormal
    ? `vec3 terrainTrailNormal = sampleTerrainNormal(uGroundDirtNormalTexture, terrainDirtUv);
  vec3 terrainCartNormal = normalize(mix(
    terrainTrailNormal,
    sampleTerrainNormal(uGravelNormalTexture, terrainGravelUv),
    0.48
  ));
  vec3 terrainRoadNormal = normalize(mix(
    terrainTrailNormal,
    terrainCartNormal,
    terrainCartBlend
  ));
  terrainSurfaceNormal = normalize(mix(
    terrainSurfaceNormal,
    terrainRoadNormal,
    terrainRoadMask * 0.58
  ));`
    : '';

  return `float terrainRoadBreakup = mix(0.86, 1.12, vTerrainMacro.z);
float terrainTrailMask = smoothstep(0.06, 0.82, vTerrainRoadFrame.x * terrainRoadBreakup);
float terrainCartMask = smoothstep(0.05, 0.78, vTerrainRoadFrame.y * terrainRoadBreakup);
float terrainRoadMask = max(terrainTrailMask, terrainCartMask);
if (terrainRoadMask > 0.01) {
  float terrainTrailCenter = 1.0 - smoothstep(0.18, 0.92, abs(vTerrainRoadFrame.z));
  float terrainCartRuts = 1.0 - smoothstep(
    0.055,
    0.145,
    abs(abs(vTerrainRoadFrame.w) - 0.45)
  );
  float terrainCartCenter = 1.0 - smoothstep(0.04, 0.25, abs(vTerrainRoadFrame.w));
  vec3 terrainRoadDirt = sampleTerrainLayer(
    uGroundDirtAlbedoTexture,
    terrainDirtUv,
    10.0
  ) * vec3(0.73, 0.66, 0.55);
  vec3 terrainRoadGravel = sampleTerrainLayer(
    uGravelAlbedoTexture,
    terrainGravelUv,
    11.0
  ) * vec3(0.74, 0.70, 0.62);
  vec3 terrainTrailColor = terrainRoadDirt
    * mix(1.0, 0.78, terrainTrailCenter * 0.34);
  vec3 terrainCartColor = mix(terrainRoadDirt, terrainRoadGravel, 0.46);
  terrainCartColor *= mix(vec3(1.0), vec3(0.62, 0.56, 0.47), terrainCartRuts * 0.72);
  terrainCartColor = mix(
    terrainCartColor,
    terrainCartColor * vec3(0.76, 0.88, 0.68),
    terrainCartCenter * 0.2
  );
  float terrainCartBlend = terrainCartMask / max(terrainTrailMask + terrainCartMask, 0.0001);
  vec3 terrainRoadColor = mix(terrainTrailColor, terrainCartColor, terrainCartBlend);

  terrainBaseColor = mix(terrainBaseColor, terrainRoadColor, terrainRoadMask);
  ${roadNormal}
  terrainRoughness = mix(terrainRoughness, mix(0.9, 0.78, terrainCartRuts), terrainRoadMask);
  terrainOcclusion = mix(terrainOcclusion, mix(0.94, 0.86, terrainCartRuts), terrainCartMask);
}`;
}

function createGroundBranches({ sampleNormal }) {
  const forestFloorNormal = sampleNormal
    ? `terrainSurfaceNormal = normalize(mix(
    terrainBaseNormal,
    sampleTerrainForestFloorNormal(
      uForestFloorNormalTexture,
      terrainForestFloorUv,
      terrainForestFloorUvDx,
      terrainForestFloorUvDy
    ),
    0.55
  ));`
    : '';

  return `if (terrainGroundMask >= 0.62) {
  terrainBaseColor = sampleTerrainForestFloorColor(
    uForestFloorBaseColorTexture,
    terrainForestFloorUv,
    terrainForestFloorUvDx,
    terrainForestFloorUvDy
  );
  terrainBaseColor = gradeTerrainForestFloor(terrainBaseColor)
    * mix(1.0, 1.06, vTerrainMacro.x);
  terrainGroundMacroWeight = 1.0;
  ${forestFloorNormal}
  terrainRoughness = 0.92;
  terrainOcclusion = 0.96;
}`;
}

function createGroundTransition({ sampleNormal, rockColor, rockTransitionNormal }) {
  const grassNormal = sampleNormal
    ? `vec3 terrainGrassNormal = normalize(mix(
    terrainBaseNormal,
    sampleTerrainForestFloorNormal(
      uForestFloorNormalTexture,
      terrainForestFloorUv,
      terrainForestFloorUvDx,
      terrainForestFloorUvDy
    ),
    0.55
  ));`
    : 'vec3 terrainGrassNormal = terrainBaseNormal;';

  return `else if (terrainGroundMask > 0.18) {
  vec3 terrainGrassColor = sampleTerrainForestFloorColor(
    uForestFloorBaseColorTexture,
    terrainForestFloorUv,
    terrainForestFloorUvDx,
    terrainForestFloorUvDy
  );
  terrainGrassColor = gradeTerrainForestFloor(terrainGrassColor)
    * mix(1.0, 1.06, vTerrainMacro.x);
  vec3 terrainRockColor = ${rockColor} * vec3(0.66, 0.71, 0.73);
  terrainBaseColor = mix(terrainRockColor, terrainGrassColor, terrainGrassBlend);
  ${grassNormal}
  terrainSurfaceNormal = normalize(mix(
    ${rockTransitionNormal},
    terrainGrassNormal,
    terrainGrassBlend
  ));
  terrainGroundMacroWeight = terrainGrassBlend;
  terrainRoughness = mix(0.76, 0.92, terrainGrassBlend);
  terrainOcclusion = 0.96;
}`;
}

function getSamplingFunctions(level) {
  if (level === TERRAIN_MATERIAL_LOD.NEAR) return NEAR_SAMPLING_FUNCTIONS;
  if (level === TERRAIN_MATERIAL_LOD.MEDIUM) return MEDIUM_SAMPLING_FUNCTIONS;
  return FAR_SAMPLING_FUNCTIONS;
}

function createTerrainUniforms(textures, options) {
  return {
    uRockTexture: { value: textures.rock },
    uRockNormalTexture: { value: textures.rockNormal },
    uSnowTexture: { value: textures.snow },
    uGroundDirtAlbedoTexture: { value: textures.groundDirtAlbedo },
    uGroundDirtNormalTexture: { value: textures.groundDirtNormal },
    uForestFloorBaseColorTexture: { value: textures.forestFloorBaseColor },
    uForestFloorNormalTexture: { value: textures.forestFloorNormal },
    uGravelAlbedoTexture: { value: textures.gravelAlbedo },
    uGravelNormalTexture: { value: textures.gravelNormal },
    uRiverBankTexture: { value: textures.riverBank },
    uRiverBedTexture: { value: textures.riverBed },
    uAlpineTextureWorldSize: { value: options.alpineTextureWorldSize },
    uGroundDirtTextureWorldSize: { value: options.groundDirtTextureWorldSize },
    uForestFloorTextureWorldSize: { value: options.forestFloorTextureWorldSize },
    uGravelTextureWorldSize: { value: options.gravelTextureWorldSize },
    uRiverBankTextureWorldSize: { value: options.riverBankTextureWorldSize },
    uRiverBedTextureWorldSize: { value: options.riverBedTextureWorldSize },
  };
}

function createTerrainMaterialVariant(level, terrainUniforms) {
  const samplingFunctions = getSamplingFunctions(level);
  const mapFragment = createTerrainMapFragment(level);
  const budget = TERRAIN_TEXTURE_BUDGETS[level];
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: level === TERRAIN_MATERIAL_LOD.FAR ? 0.72 : 0.9,
  });

  material.name = `LayeredTerrainPBR_${level}`;
  material.userData.terrainMaterialLod = level;
  material.userData.terrainTextureBudget = budget;
  material.userData.terrainReceivesShadow = level !== TERRAIN_MATERIAL_LOD.FAR;
  material.userData.terrainUniforms = terrainUniforms;
  material.userData.terrainShaderSource = {
    vertexParameters: TERRAIN_VERTEX_PARAMETERS,
    vertexAssignments: TERRAIN_VERTEX_ASSIGNMENTS,
    fragmentParameters: `${TERRAIN_FRAGMENT_UNIFORMS}\n${samplingFunctions}`,
    mapFragment,
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, terrainUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${TERRAIN_VERTEX_PARAMETERS}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${TERRAIN_VERTEX_ASSIGNMENTS}`);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\n${TERRAIN_FRAGMENT_UNIFORMS}\n${samplingFunctions}`,
      )
      .replace('#include <map_fragment>', mapFragment)
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = clamp(terrainRoughness, 0.18, 1.0);',
      )
      .replace(
        '#include <normal_fragment_maps>',
        '#include <normal_fragment_maps>\nnormal = normalize(mat3(viewMatrix) * terrainSurfaceNormal);\nnonPerturbedNormal = normal;',
      )
      .replace(
        '#include <aomap_fragment>',
        '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= terrainOcclusion;\nreflectedLight.indirectSpecular *= mix(terrainOcclusion, 1.0, 0.35);',
      );
  };
  material.customProgramCacheKey = () => `layered-terrain-pbr-v6-${level}`;

  return material;
}

export function createTerrainMaterials(textures, options) {
  const terrainUniforms = createTerrainUniforms(textures, options);

  return Object.freeze({
    near: createTerrainMaterialVariant(TERRAIN_MATERIAL_LOD.NEAR, terrainUniforms),
    medium: createTerrainMaterialVariant(TERRAIN_MATERIAL_LOD.MEDIUM, terrainUniforms),
    far: createTerrainMaterialVariant(TERRAIN_MATERIAL_LOD.FAR, terrainUniforms),
  });
}

export function getTerrainMaterialForSegments(materials) {
  return materials.medium;
}
