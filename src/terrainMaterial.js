import * as THREE from 'three';

export const TERRAIN_MATERIAL_LOD = Object.freeze({
  NEAR: 'near',
  MEDIUM: 'medium',
  FAR: 'far',
});

const TERRAIN_TEXTURE_BUDGETS = Object.freeze({
  [TERRAIN_MATERIAL_LOD.NEAR]: Object.freeze({ typical: 8, maximum: 14 }),
  [TERRAIN_MATERIAL_LOD.MEDIUM]: Object.freeze({ typical: 5, maximum: 9 }),
  [TERRAIN_MATERIAL_LOD.FAR]: Object.freeze({ typical: 4, maximum: 6 }),
});

const TERRAIN_VERTEX_PARAMETERS = `
attribute float groundMask;
attribute float riverMask;
attribute float riverBedMask;
attribute float riverUnderwaterMask;
attribute float riverGravelMask;
attribute vec2 riverBedCoord;
attribute vec4 waterSystemMask;
attribute float smallLakesMask;
attribute float mountainTrailMask;

varying vec2 vTerrainRiverBedCoord;
varying vec3 vTerrainWorldPosition;
varying vec3 vTerrainWorldNormal;
varying float vTerrainGroundMask;
varying float vTerrainRiverMask;
varying float vTerrainRiverBedMask;
varying float vTerrainRiverUnderwaterMask;
varying float vTerrainRiverGravelMask;
varying vec4 vTerrainWaterSystemMask;
varying float vTerrainSmallLakesMask;
varying float vTerrainMountainTrailMask;
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

float terrainVertexRelief(vec2 worldPosition) {
  float broad = terrainVertexNoise(worldPosition * 0.36 + vec2(8.2, -3.7)) - 0.5;
  float detail = terrainVertexNoise(worldPosition * 0.92 + vec2(-5.1, 12.4)) - 0.5;
  float grain = terrainVertexNoise(worldPosition * 2.6 + vec2(17.3, 6.8)) - 0.5;
  return broad * 0.55 + detail * 0.30 + grain * 0.15;
}
`;

const TERRAIN_VERTEX_ASSIGNMENTS = `
vec4 terrainBaseWorldPosition = modelMatrix * vec4(transformed, 1.0);
float terrainReliefDistance = distance(cameraPosition, terrainBaseWorldPosition.xyz);
float terrainReliefDistanceFade = 1.0 - smoothstep(45.0, 85.0, terrainReliefDistance);
float terrainReliefRiverMask = max(riverMask, max(riverBedMask, riverUnderwaterMask));
float terrainReliefWaterSystemMask = max(
  max(waterSystemMask.x, waterSystemMask.y),
  max(waterSystemMask.z, waterSystemMask.w)
);
float terrainReliefWaterMask = max(
  terrainReliefRiverMask,
  max(smallLakesMask, terrainReliefWaterSystemMask)
);
float terrainReliefSurfaceFade = 1.0 - smoothstep(0.02, 0.55, terrainReliefWaterMask);
float terrainReliefTrailFade = 1.0 - smoothstep(0.05, 0.85, mountainTrailMask);
float terrainReliefAmplitude = mix(0.30, 0.15, smoothstep(0.18, 0.82, groundMask));
float terrainReliefOffset = terrainVertexRelief(terrainBaseWorldPosition.xz)
  * terrainReliefAmplitude
  * terrainReliefDistanceFade
  * terrainReliefSurfaceFade
  * terrainReliefTrailFade;
transformed += normalize(objectNormal) * terrainReliefOffset;
vec4 terrainWorldPosition = modelMatrix * vec4(transformed, 1.0);
vTerrainRiverBedCoord = riverBedCoord;
vTerrainWorldPosition = terrainWorldPosition.xyz;
vTerrainWorldNormal = inverseTransformDirection(transformedNormal, viewMatrix);
vTerrainGroundMask = groundMask;
vTerrainRiverMask = riverMask;
vTerrainRiverBedMask = riverBedMask;
vTerrainRiverUnderwaterMask = riverUnderwaterMask;
vTerrainRiverGravelMask = riverGravelMask;
vTerrainWaterSystemMask = waterSystemMask;
vTerrainSmallLakesMask = smallLakesMask;
vTerrainMountainTrailMask = mountainTrailMask;
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
uniform sampler2D uForestFloorBaseColorTexture;
uniform sampler2D uForestFloorNormalTexture;
uniform sampler2D uForestFloorOrmTexture;
uniform sampler2D uRiverBankTexture;
uniform sampler2D uRiverBedTexture;
uniform sampler2D uRiverGravelTexture;

uniform float uAlpineTextureWorldSize;
uniform float uForestFloorTextureWorldSize;
uniform float uRiverBankTextureWorldSize;
uniform float uRiverBedTextureWorldSize;
uniform float uRiverGravelTextureWorldSize;

varying vec2 vTerrainRiverBedCoord;
varying vec3 vTerrainWorldPosition;
varying vec3 vTerrainWorldNormal;
varying float vTerrainGroundMask;
varying float vTerrainRiverMask;
varying float vTerrainRiverBedMask;
varying float vTerrainRiverUnderwaterMask;
varying float vTerrainRiverGravelMask;
varying vec4 vTerrainWaterSystemMask;
varying float vTerrainSmallLakesMask;
varying float vTerrainMountainTrailMask;
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

vec4 sampleTerrainForestFloorTechnical(
  sampler2D terrainTexture,
  vec2 baseUv,
  vec2 baseUvDx,
  vec2 baseUvDy
) {
  vec2 cell = floor(baseUv);
  vec4 weights = terrainForestFloorCellWeights(baseUv);
  vec4 a = sampleTerrainForestFloorCell(
    terrainTexture,
    baseUv,
    baseUvDx,
    baseUvDy,
    cell
  );
  vec4 b = sampleTerrainForestFloorCell(
    terrainTexture,
    baseUv,
    baseUvDx,
    baseUvDy,
    cell + vec2(1.0, 0.0)
  );
  vec4 c = sampleTerrainForestFloorCell(
    terrainTexture,
    baseUv,
    baseUvDx,
    baseUvDy,
    cell + vec2(0.0, 1.0)
  );
  vec4 d = sampleTerrainForestFloorCell(
    terrainTexture,
    baseUv,
    baseUvDx,
    baseUvDy,
    cell + vec2(1.0, 1.0)
  );
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
  vec3 desaturated = mix(vec3(luminance), baseColor, 0.70);
  vec3 forestTint = desaturated * vec3(0.96, 1.04, 0.86);
  return forestTint * 1.16 + vec3(0.006, 0.010, 0.003);
}

vec3 sampleTerrainScreeNormal(vec2 uv, vec3 worldNormal) {
  vec2 encodedNormal = texture2D(uForestFloorOrmTexture, uv).ba;
  vec2 normalXY = encodedNormal * 2.0 - 1.0;
  float normalZ = sqrt(max(1.0 - dot(normalXY, normalXY), 0.04));
  vec3 tangentNormal = normalize(vec3(normalXY, normalZ));
  vec3 tangent = normalize(vec3(
    1.0,
    -worldNormal.x / max(worldNormal.y, 0.08),
    0.0
  ));
  vec3 bitangent = normalize(cross(tangent, worldNormal));
  return normalize(
    tangent * tangentNormal.x
      + bitangent * tangentNormal.y
      + worldNormal * tangentNormal.z
  );
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
  vec3 xWorld = vec3(
    xNormal.z * worldNormal.x,
    xNormal.y + worldNormal.y,
    xNormal.x + worldNormal.z
  );
  vec3 yWorld = vec3(
    yNormal.x + worldNormal.x,
    yNormal.z * worldNormal.y,
    yNormal.y + worldNormal.z
  );
  vec3 zWorld = vec3(
    zNormal.x + worldNormal.x,
    zNormal.y + worldNormal.y,
    zNormal.z * worldNormal.z
  );
  return normalize(xWorld * blend.x + yWorld * blend.y + zWorld * blend.z);
}
`;

const MEDIUM_SAMPLING_FUNCTIONS = `
vec3 sampleTerrainLayer(sampler2D terrainTexture, vec2 uv, float seed) {
  return texture2D(terrainTexture, uv + vec2(seed * 0.37, -seed * 0.21)).rgb;
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
  vec3 xWorld = vec3(
    xNormal.z * worldNormal.x,
    xNormal.y + worldNormal.y,
    xNormal.x + worldNormal.z
  );
  vec3 yWorld = vec3(
    yNormal.x + worldNormal.x,
    yNormal.z * worldNormal.y,
    yNormal.y + worldNormal.z
  );
  vec3 zWorld = vec3(
    zNormal.x + worldNormal.x,
    zNormal.y + worldNormal.y,
    zNormal.z * worldNormal.z
  );
  return normalize(xWorld * blend.x + yWorld * blend.y + zWorld * blend.z);
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
  const rockNormal = sampleNormal
    ? `terrainSurfaceNormal = normalize(mix(
    terrainSurfaceNormal,
    sampleTerrainRockNormal(vTerrainWorldPosition, terrainBaseNormal, uAlpineTextureWorldSize / 0.62),
    0.5
  ));`
    : '';
  const rockTransitionNormal = sampleNormal
    ? `normalize(mix(
    terrainBaseNormal,
    sampleTerrainRockNormal(vTerrainWorldPosition, terrainBaseNormal, uAlpineTextureWorldSize / 0.62),
    0.5
  ))`
    : 'terrainBaseNormal';
  const gravelNormal = sampleNormal
    ? `terrainSurfaceNormal = normalize(mix(
    terrainSurfaceNormal,
    sampleTerrainScreeNormal(
      vTerrainWorldPosition.xz / uRiverGravelTextureWorldSize + vec2(3.7, -2.1),
      terrainBaseNormal
    ),
    terrainRiverGravelMask * 0.38
  ));`
    : '';
  const normalDeclarations = sampleNormal
    ? 'vec3 terrainSurfaceNormal = terrainBaseNormal;'
    : 'vec3 terrainSurfaceNormal = terrainBaseNormal;';
  const groundBranches = createGroundBranches({ sampleNormal });
  const groundTransition = createGroundTransition({
    sampleNormal,
    rockColor,
    rockTransitionNormal,
  });

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
float terrainGrassBlendMask = clamp(
  terrainGroundMask + (vTerrainMacro.z - 0.5) * 0.10,
  0.0,
  1.0
);
float terrainGrassBlend = smoothstep(0.10, 0.74, terrainGrassBlendMask);
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
float terrainRiverMaterialMask = clamp(vTerrainRiverMask, 0.0, 1.0);
float terrainRiverMask = terrainRiverMaterialMask;
float terrainRiverBedMask = clamp(vTerrainRiverBedMask, 0.0, 1.0);
float terrainRiverGravelMacro = mix(
  0.72,
  1.0,
  smoothstep(0.18, 0.82, vTerrainMacro.y)
);
float terrainRiverGravelMask = clamp(vTerrainRiverGravelMask, 0.0, 1.0)
  * terrainRiverGravelMacro;
float terrainLakeBedMask = smoothstep(0.04, 0.92, vTerrainWaterSystemMask.x);
float terrainWetShoreMask = smoothstep(0.05, 0.95, vTerrainWaterSystemMask.y);
float terrainSnowmeltWetMask = smoothstep(0.05, 0.92, vTerrainWaterSystemMask.z);
float terrainPlungeMask = smoothstep(0.05, 0.9, vTerrainWaterSystemMask.w);
float terrainWaterBankMask = max(
  terrainRiverMask,
  max(terrainWetShoreMask, terrainSnowmeltWetMask)
);
float terrainHeroWetRoughness = mix(
  0.55,
  0.26,
  smoothstep(0.05, 0.95, terrainRiverMaterialMask)
);
float terrainWaterBankRoughness = mix(
  0.32,
  terrainHeroWetRoughness,
  terrainRiverMaterialMask
);
float terrainWaterBedMask = max(
  terrainRiverBedMask,
  max(terrainLakeBedMask, terrainPlungeMask)
);

vec2 terrainForestFloorUv = vTerrainWorldPosition.xz / uForestFloorTextureWorldSize;
vec2 terrainForestFloorUvDx = dFdx(terrainForestFloorUv);
vec2 terrainForestFloorUvDy = dFdy(terrainForestFloorUv);
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
  terrainBaseColor = ${rockColor} * vec3(0.80, 0.79, 0.76);
  ${rockNormal}
  terrainRoughness = 0.80;
  terrainOcclusion = 0.96;
}

terrainBaseColor *= mix(
  1.0,
  mix(0.96, 1.05, vTerrainMacro.w),
  terrainGroundMacroWeight * (
    1.0 - max(terrainRiverGravelMask, max(terrainWaterBankMask, terrainWaterBedMask))
  )
);

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

float terrainMountainTrailMask = smoothstep(0.05, 0.95, vTerrainMountainTrailMask);
if (terrainMountainTrailMask > 0.01) {
  float terrainTrailLuminance = dot(terrainBaseColor, vec3(0.2126, 0.7152, 0.0722));
  vec3 terrainTrailColor = mix(
    vec3(terrainTrailLuminance),
    terrainBaseColor,
    0.72
  ) * vec3(0.91, 0.89, 0.85);
  terrainBaseColor = mix(
    terrainBaseColor,
    terrainTrailColor,
    terrainMountainTrailMask * 0.62
  );
  terrainSurfaceNormal = normalize(mix(
    terrainSurfaceNormal,
    terrainBaseNormal,
    terrainMountainTrailMask * 0.26
  ));
  terrainRoughness = mix(
    terrainRoughness,
    min(1.0, terrainRoughness + 0.04),
    terrainMountainTrailMask
  );
  terrainOcclusion = mix(terrainOcclusion, 0.98, terrainMountainTrailMask);
}

// River, lake, snowmelt and plunge masks stay active in every material LOD; gravel is scoped here.
if (max(terrainRiverGravelMask, max(terrainWaterBankMask, terrainWaterBedMask)) > 0.01) {
  vec3 terrainGravelColor = terrainBaseColor;
  vec3 terrainBankColor = terrainBaseColor;
  vec3 terrainBedColor = terrainBaseColor;
  if (terrainRiverGravelMask > 0.01) {
    vec3 terrainRawGravelColor = sampleTerrainLayer(
      uRiverGravelTexture,
      vTerrainWorldPosition.xz / uRiverGravelTextureWorldSize,
      10.0
    );
    float terrainGravelLuminance = dot(
      terrainRawGravelColor,
      vec3(0.2126, 0.7152, 0.0722)
    );
    vec3 terrainMutedGravelColor = mix(
      vec3(terrainGravelLuminance),
      terrainRawGravelColor,
      0.52
    ) * vec3(0.86, 0.84, 0.79);
    terrainGravelColor = mix(
      terrainBaseColor,
      terrainMutedGravelColor,
      0.58
    );
  }
  if (terrainWaterBankMask > 0.01) {
    vec3 terrainRawBankColor = sampleTerrainLayer(
      uRiverBankTexture,
      vTerrainWorldPosition.xz / uRiverBankTextureWorldSize,
      8.0
    );
    float terrainBankLuminance = dot(
      terrainRawBankColor,
      vec3(0.2126, 0.7152, 0.0722)
    );
    vec3 terrainMutedBankColor = mix(
      vec3(terrainBankLuminance),
      terrainRawBankColor,
      0.62
    ) * vec3(0.82, 0.87, 0.86);
    terrainBankColor = mix(
      terrainBaseColor,
      terrainMutedBankColor,
      0.86
    );
    vec3 terrainHeroWetBankColor = terrainBankColor * vec3(0.82, 0.84, 0.74);
    terrainBankColor = mix(
      terrainBankColor,
      terrainHeroWetBankColor,
      terrainRiverMaterialMask
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
  terrainBaseColor = mix(terrainBaseColor, terrainGravelColor, clamp(terrainRiverGravelMask, 0.0, 1.0));
  terrainBaseColor = mix(terrainBaseColor, terrainBankColor, clamp(terrainWaterBankMask, 0.0, 1.0));
  terrainBaseColor = mix(terrainBaseColor, terrainBedColor, clamp(terrainWaterBedMask, 0.0, 1.0));
  terrainBaseColor *= mix(
    vec3(1.0),
    vec3(0.62, 0.70, 0.74),
    terrainSnowmeltWetMask * 0.34
  );
  terrainRoughness = mix(terrainRoughness, 0.72, terrainRiverGravelMask);
  terrainRoughness = mix(
    terrainRoughness,
    terrainWaterBankRoughness,
    terrainWaterBankMask
  );
  terrainRoughness = mix(terrainRoughness, 0.42, terrainWaterBedMask);
  ${gravelNormal}
}

diffuseColor.rgb *= terrainBaseColor;
`;
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
  const forestFloorTechnical = sampleNormal
    ? `vec2 terrainForestTechnical = sampleTerrainForestFloorTechnical(
    uForestFloorOrmTexture,
    terrainForestFloorUv,
    terrainForestFloorUvDx,
    terrainForestFloorUvDy
  ).rg;`
    : 'vec2 terrainForestTechnical = vec2(0.84, 1.0);';

  return `if (terrainGrassBlendMask >= 0.74) {
  terrainBaseColor = sampleTerrainForestFloorColor(
    uForestFloorBaseColorTexture,
    terrainForestFloorUv,
    terrainForestFloorUvDx,
    terrainForestFloorUvDy
  );
  terrainBaseColor = gradeTerrainForestFloor(terrainBaseColor)
    * mix(1.0, 1.06, vTerrainMacro.x);
  ${forestFloorTechnical}
  terrainGroundMacroWeight = 1.0;
  ${forestFloorNormal}
  terrainRoughness = mix(0.55, 0.92, terrainForestTechnical.g);
  terrainOcclusion = mix(0.75, 1.0, terrainForestTechnical.r);
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
  const grassTechnical = sampleNormal
    ? `vec2 terrainGrassTechnical = sampleTerrainForestFloorTechnical(
    uForestFloorOrmTexture,
    terrainForestFloorUv,
    terrainForestFloorUvDx,
    terrainForestFloorUvDy
  ).rg;`
    : 'vec2 terrainGrassTechnical = vec2(0.84, 1.0);';

  return `else if (terrainGrassBlendMask > 0.10) {
  vec3 terrainGrassColor = sampleTerrainForestFloorColor(
    uForestFloorBaseColorTexture,
    terrainForestFloorUv,
    terrainForestFloorUvDx,
    terrainForestFloorUvDy
  );
  terrainGrassColor = gradeTerrainForestFloor(terrainGrassColor)
    * mix(1.0, 1.06, vTerrainMacro.x);
  ${grassTechnical}
  vec3 terrainRockColor = ${rockColor} * vec3(0.80, 0.79, 0.76);
  terrainBaseColor = mix(terrainRockColor, terrainGrassColor, terrainGrassBlend);
  ${grassNormal}
  terrainSurfaceNormal = normalize(mix(
    ${rockTransitionNormal},
    terrainGrassNormal,
    terrainGrassBlend
  ));
  terrainGroundMacroWeight = terrainGrassBlend;
  float terrainGrassRoughness = mix(0.55, 0.92, terrainGrassTechnical.g);
  float terrainGrassOcclusion = mix(0.75, 1.0, terrainGrassTechnical.r);
  terrainRoughness = mix(0.80, terrainGrassRoughness, terrainGrassBlend);
  terrainOcclusion = mix(0.96, terrainGrassOcclusion, terrainGrassBlend);
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
    uForestFloorBaseColorTexture: { value: textures.forestFloorBaseColor },
    uForestFloorNormalTexture: { value: textures.forestFloorNormal },
    uForestFloorOrmTexture: { value: textures.forestFloorOrm },
    uRiverBankTexture: { value: textures.riverBank },
    uRiverBedTexture: { value: textures.riverBed },
    uRiverGravelTexture: { value: textures.riverGravel },
    uAlpineTextureWorldSize: { value: options.alpineTextureWorldSize },
    uForestFloorTextureWorldSize: { value: options.forestFloorTextureWorldSize },
    uRiverBankTextureWorldSize: { value: options.riverBankTextureWorldSize },
    uRiverBedTextureWorldSize: { value: options.riverBedTextureWorldSize },
    uRiverGravelTextureWorldSize: { value: options.riverGravelTextureWorldSize },
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
      .replace('#include <project_vertex>', `${TERRAIN_VERTEX_ASSIGNMENTS}\n#include <project_vertex>`);
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
  material.customProgramCacheKey = () => `layered-terrain-pbr-v13-${level}`;

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
