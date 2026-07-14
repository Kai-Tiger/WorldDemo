import * as THREE from 'three';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import {
  FLOWING_RIVER_DEEP_COLOR,
  FLOWING_RIVER_FOAM_COLOR,
  FLOWING_RIVER_SHALLOW_COLOR,
  WATER_DEEP_COLOR,
  WATER_FOAM_COLOR,
  WATER_REFLECTION_COLOR,
  WATER_SHALLOW_COLOR,
  WATER_SUN_REFLECTION_COLOR,
} from './waterPalette.js';
import { WATER_NOISE_GLSL } from './waterContext.js';
import { VISUAL_ENVIRONMENT } from './visualEnvironment.js';

export const WATER_INFO_ENCODING_AUTO = 'auto';
export const WATER_INFO_ENCODING_HALF_FLOAT = 'half-float';
export const WATER_INFO_ENCODING_PACKED = 'packed';
export const WATER_INFO_MAX_DEPTH = 8;

let didWarnAboutPackedFallback = false;

const ATTRIBUTE_VERTEX_SHADER = `
  in float waterDepth;
  in float shoreDistanceMeters;
  in vec2 flowUv;
  in vec2 flowDirection;
  in vec2 junctionFlowDirection;
  in float flowSpeed;
  in float riverInfluence;
  in float rapidMask;
  in float junctionMask;
  in float disturbanceMask;
  in float reflectionTier;

  uniform float uTime;

  out vec3 vWorldNormal;
  out float vWaterDepth;
  out float vShoreDistanceMeters;
  out float vRiverInfluence;
  out float vReflectionTier;
  out vec2 vFlowUv;
  out vec2 vFlowDirection;
  out float vFlowSpeed;
  out float vRapidMask;
  out float vJunctionMask;
  out float vDisturbanceMask;

  void main() {
    vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
    vec2 blendedFlow = mix(
      flowDirection,
      junctionFlowDirection,
      clamp(junctionMask, 0.0, 1.0)
    );

    vWorldNormal = worldNormal;
    vWaterDepth = max(waterDepth, 0.0);
    vShoreDistanceMeters = max(shoreDistanceMeters, 0.0);
    vRiverInfluence = clamp(riverInfluence, 0.0, 1.0);
    vReflectionTier = clamp(reflectionTier, 0.0, 1.0);
    vFlowUv = flowUv;
    float flowLength = length(blendedFlow);
    vFlowDirection = flowLength > 0.0001
      ? blendedFlow / flowLength
      : vec2(0.0);
    vFlowSpeed = max(flowSpeed, 0.0);
    vRapidMask = clamp(rapidMask, 0.0, 1.0);
    vJunctionMask = clamp(junctionMask, 0.0, 1.0);
    vDisturbanceMask = clamp(
      max(disturbanceMask, junctionMask * 0.35),
      0.0,
      1.0
    );

    vec3 displacedPosition = position;
    float lakeWaveWeight = 1.0 - smoothstep(0.15, 0.55, vRiverInfluence);
    float mouthWaveSuppression = smoothstep(0.35, 1.5, vShoreDistanceMeters);
    displacedPosition.y += sin(
      dot(position.xz, vec2(0.083, -0.067)) + uTime * 0.42
    ) * 0.016 * lakeWaveWeight * mouthWaveSuppression;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
  }
`;

const ATTRIBUTE_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uMaxDepth;
  uniform float uNormalDetail;

  in vec3 vWorldNormal;
  in float vWaterDepth;
  in float vShoreDistanceMeters;
  in float vRiverInfluence;
  in float vReflectionTier;
  in vec2 vFlowUv;
  in vec2 vFlowDirection;
  in float vFlowSpeed;
  in float vRapidMask;
  in float vJunctionMask;
  in float vDisturbanceMask;

  layout(location = 0) out vec4 waterOpticsOutput;
  layout(location = 1) out vec4 waterMaterialOutput;

  ${WATER_NOISE_GLSL}

  float getNaturalWaterHeight(vec2 domain) {
    float macroWave = waterNoise(
      domain * vec2(0.16, 0.36) + vec2(3.7, -8.2)
    );
    vec2 warpedDomain = domain + vec2(
      (macroWave - 0.5) * 0.72,
      (macroWave - 0.5) * -0.44
    );
    float middleWave = waterNoise2(
      warpedDomain * vec2(0.52, 1.22) + vec2(-11.3, 6.9)
    );
    float detailWave = waterNoise(
      warpedDomain * vec2(1.31, 2.63)
        + vec2(middleWave * 0.24, middleWave * -0.18)
        + vec2(17.8, 21.4)
    );

    return macroWave * 0.46 + middleWave * 0.37 + detailWave * 0.17;
  }

  vec2 getNaturalWaterSlope(vec2 domain) {
    const float epsilon = 0.11;
    float centerHeight = getNaturalWaterHeight(domain);

    return vec2(
      getNaturalWaterHeight(domain + vec2(epsilon, 0.0)) - centerHeight,
      getNaturalWaterHeight(domain + vec2(0.0, epsilon)) - centerHeight
    ) / epsilon;
  }

  vec2 encodeOctahedron(vec3 normalValue) {
    normalValue /= abs(normalValue.x) + abs(normalValue.y) + abs(normalValue.z);
    vec2 encoded = normalValue.xz;

    if (normalValue.y < 0.0) {
      encoded = (1.0 - abs(encoded.yx)) * sign(encoded.xy);
    }

    return encoded * 0.5 + 0.5;
  }

  void main() {
    float shoreAa = max(fwidth(vShoreDistanceMeters), 0.015);
    float coverage = smoothstep(0.0, shoreAa, vShoreDistanceMeters);
    if (coverage < (1.0 / 255.0)) discard;

    float riverBlend = smoothstep(0.02, 0.72, vRiverInfluence);
    float riverTravel = uTime * mix(
      0.42,
      1.0,
      smoothstep(0.35, 1.8, vFlowSpeed)
    );
    vec2 lakeFlowDomain = vFlowUv + vec2(-uTime * 0.08, uTime * 0.055);
    vec2 riverFlowDomain = vec2(vFlowUv.x - riverTravel, vFlowUv.y);
    vec2 surfaceFlowDomain = mix(
      lakeFlowDomain,
      riverFlowDomain,
      riverBlend
    );
    float surfaceHeight = getNaturalWaterHeight(surfaceFlowDomain);
    vec2 localSlope = getNaturalWaterSlope(surfaceFlowDomain);
    float riverMotion = mix(0.45, 1.0, vRiverInfluence);
    float detailStrength = mix(0.10, 0.18, riverMotion)
      * (1.0 + vRapidMask * 0.9 + vDisturbanceMask * 0.55)
      * uNormalDetail;
    localSlope *= detailStrength;
    float maximumSlope = mix(
      0.09,
      0.18,
      clamp(max(vRapidMask, vDisturbanceMask), 0.0, 1.0)
    );
    localSlope *= min(
      1.0,
      maximumSlope / max(length(localSlope), 0.0001)
    );
    vec2 lakeAxis = normalize(vec2(0.72, 0.69));
    vec2 riverAxis = length(vFlowDirection) > 0.0001
      ? vFlowDirection
      : lakeAxis;
    vec2 lakeAcross = vec2(-lakeAxis.y, lakeAxis.x);
    vec2 riverAcross = vec2(-riverAxis.y, riverAxis.x);
    vec2 lakeWorldSlope = lakeAxis * localSlope.x
      + lakeAcross * localSlope.y;
    vec2 riverWorldSlope = riverAxis * localSlope.x
      + riverAcross * localSlope.y;
    vec3 lakeDetailNormal = normalize(vec3(
      lakeWorldSlope.x,
      1.0,
      lakeWorldSlope.y
    ));
    vec3 riverDetailNormal = normalize(vec3(
      riverWorldSlope.x,
      1.0,
      riverWorldSlope.y
    ));
    vec3 detailNormal = normalize(mix(
      lakeDetailNormal,
      riverDetailNormal,
      vRiverInfluence
    ));
    vec3 worldNormal = normalize(mix(vWorldNormal, detailNormal, 0.72));
    float calmWave = surfaceHeight * 2.0 - 1.0;

    float shoreFoam = 1.0 - smoothstep(0.15, 1.7, vShoreDistanceMeters);
    float mouthBlend = 4.0 * vRiverInfluence * (1.0 - vRiverInfluence);
    float brokenShore = mix(
      0.32,
      1.0,
      smoothstep(0.25, 0.78, calmWave * 0.5 + 0.5)
    );
    shoreFoam *= (1.0 - mouthBlend) * brokenShore;
    float movingFoam = smoothstep(0.58, 0.94, calmWave * 0.5 + 0.5);
    float riverFoamWeight = vRiverInfluence * vRiverInfluence;
    float foam = clamp(
      shoreFoam * 0.18
        + vRapidMask * (0.42 + movingFoam * 0.42) * riverFoamWeight
        + vDisturbanceMask * 0.34 * riverFoamWeight
        + vJunctionMask * 0.22 * riverFoamWeight,
      0.0,
      1.0
    );

    float roughness = clamp(
      mix(0.16, 0.28, vRiverInfluence)
        + vRapidMask * 0.22
        + vDisturbanceMask * 0.12,
      0.08,
      0.72
    );
    float encodedDepth = clamp(vWaterDepth, 0.0, uMaxDepth);

    #ifdef WATER_INFO_PACKED
      encodedDepth /= max(uMaxDepth, 0.0001);
    #endif

    waterOpticsOutput = vec4(
      encodeOctahedron(worldNormal),
      encodedDepth,
      coverage
    );
    waterMaterialOutput = vec4(
      foam,
      roughness,
      clamp(vRiverInfluence, 0.0, 1.0),
      clamp(vReflectionTier, 0.0, 1.0)
    );
  }
`;

const RESOLVE_VERTEX_SHADER = `
  out vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const RESOLVE_FRAGMENT_SHADER = `
  uniform sampler2D tSceneColor;
  uniform sampler2D tSceneDepth;
  uniform sampler2D tWaterOptics;
  uniform sampler2D tWaterMaterial;
  uniform sampler2D tWaterDepth;
  uniform sampler2D tEnvironmentMap;
  uniform samplerCube tReflectionProbe;
  uniform sampler2D tPlanarReflection;

  uniform vec2 uResolution;
  uniform mat4 uProjectionMatrixInverse;
  uniform mat4 uCameraWorldMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uPlanarTextureMatrix;
  uniform vec3 uCameraPosition;
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform vec3 uFogColor;
  uniform vec3 uLakeShallowColor;
  uniform vec3 uLakeDeepColor;
  uniform vec3 uRiverShallowColor;
  uniform vec3 uRiverDeepColor;
  uniform vec3 uLakeFoamColor;
  uniform vec3 uRiverFoamColor;
  uniform vec3 uFallbackReflectionColor;

  uniform float uMaxDepth;
  uniform float uRefractionPixels;
  uniform float uReflectionMode;
  uniform float uReflectionStrength;
  uniform float uFogDensity;
  uniform float uHasEnvironmentMap;
  uniform float uHasReflectionProbe;
  uniform float uHasPlanarReflection;

  in vec2 vUv;
  layout(location = 0) out vec4 resolvedColor;

  vec3 decodeOctahedron(vec2 encoded) {
    vec2 value = encoded * 2.0 - 1.0;
    vec3 normalValue = vec3(value.x, 1.0 - abs(value.x) - abs(value.y), value.y);

    if (normalValue.y < 0.0) {
      normalValue.xz = (1.0 - abs(normalValue.zx)) * sign(normalValue.xz);
    }

    return normalize(normalValue);
  }

  vec3 reconstructWorldPosition(vec2 uv, float depth) {
    vec4 viewPosition = uProjectionMatrixInverse * vec4(
      uv * 2.0 - 1.0,
      depth * 2.0 - 1.0,
      1.0
    );
    viewPosition /= viewPosition.w;
    return (uCameraWorldMatrix * vec4(viewPosition.xyz, 1.0)).xyz;
  }

  float reconstructViewDistance(vec2 uv, float depth) {
    vec4 viewPosition = uProjectionMatrixInverse * vec4(
      uv * 2.0 - 1.0,
      depth * 2.0 - 1.0,
      1.0
    );
    viewPosition /= viewPosition.w;
    return -viewPosition.z;
  }

  vec2 equirectangularUv(vec3 direction) {
    vec3 normalizedDirection = normalize(direction);
    return vec2(
      atan(normalizedDirection.z, normalizedDirection.x) / 6.2831853 + 0.5,
      asin(clamp(normalizedDirection.y, -1.0, 1.0)) / 3.14159265 + 0.5
    );
  }

  vec3 sampleReflection(
    vec3 reflectionDirection,
    vec3 worldPosition,
    float reflectionTier
  ) {
    vec3 environmentReflection = uFallbackReflectionColor;

    if (uHasEnvironmentMap > 0.5) {
      environmentReflection = texture(
        tEnvironmentMap,
        equirectangularUv(reflectionDirection)
      ).rgb;
    }

    vec3 probeReflection = environmentReflection;
    if (uHasReflectionProbe > 0.5) {
      probeReflection = texture(tReflectionProbe, reflectionDirection).rgb;
    }

    vec3 planarReflection = probeReflection;
    vec4 projected = uPlanarTextureMatrix * vec4(worldPosition, 1.0);
    vec2 planarUv = projected.xy / max(projected.w, 0.0001);

    if (uHasPlanarReflection > 0.5
      && all(greaterThanEqual(planarUv, vec2(0.0)))
      && all(lessThanEqual(planarUv, vec2(1.0)))) {
      planarReflection = texture(tPlanarReflection, planarUv).rgb;
    }

    float probeWeight = uReflectionMode >= 1.0
      ? smoothstep(0.0, 0.5, reflectionTier)
      : 0.0;
    float planarWeight = uReflectionMode >= 2.0
      ? smoothstep(0.5, 1.0, reflectionTier)
      : 0.0;
    return mix(
      mix(environmentReflection, probeReflection, probeWeight),
      planarReflection,
      planarWeight
    );
  }

  void main() {
    vec4 sceneColor = texture(tSceneColor, vUv);
    float sceneDepth = texture(tSceneDepth, vUv).r;
    vec4 optics = texture(tWaterOptics, vUv);
    vec4 materialInfo = texture(tWaterMaterial, vUv);
    float waterSurfaceDepth = texture(tWaterDepth, vUv).r;
    float coverage = optics.a;

    if (coverage <= (0.5 / 255.0)
      || waterSurfaceDepth >= 0.999999
      || waterSurfaceDepth >= sceneDepth - 0.000001) {
      resolvedColor = sceneColor;
      gl_FragDepth = sceneDepth;
      return;
    }

    float authoredDepth = optics.b;
    #ifdef WATER_INFO_PACKED
      authoredDepth *= uMaxDepth;
    #endif

    vec3 worldNormal = decodeOctahedron(optics.rg);
    vec3 worldPosition = reconstructWorldPosition(vUv, waterSurfaceDepth);
    vec3 viewDirection = normalize(uCameraPosition - worldPosition);
    if (dot(worldNormal, viewDirection) < 0.0) worldNormal = -worldNormal;
    vec3 viewNormal = normalize(mat3(uViewMatrix) * worldNormal);
    float foam = materialInfo.r;
    float roughness = materialInfo.g;
    float riverInfluence = materialInfo.b;
    float reflectionTier = materialInfo.a;

    float refractionScale = uRefractionPixels
      * (1.0 - foam * 0.78)
      * mix(0.72, 1.0, riverInfluence);
    vec2 refractionOffset = viewNormal.xy
      * refractionScale
      / max(uResolution, vec2(1.0));
    vec2 refractedUv = clamp(vUv + refractionOffset, vec2(0.001), vec2(0.999));
    float candidateDepth = texture(tSceneDepth, refractedUv).r;
    float candidateDistance = reconstructViewDistance(refractedUv, candidateDepth);
    float waterDistance = reconstructViewDistance(vUv, waterSurfaceDepth);

    if (candidateDepth <= waterSurfaceDepth
      || candidateDistance <= waterDistance + 0.01) {
      refractedUv = vUv;
      candidateDepth = sceneDepth;
      candidateDistance = reconstructViewDistance(vUv, candidateDepth);
    }

    vec3 refractedColor = texture(tSceneColor, refractedUv).rgb;
    float measuredThickness = max(candidateDistance - waterDistance, 0.0);
    float waterThickness = candidateDepth < 0.999999
      ? min(authoredDepth, measuredThickness)
      : authoredDepth;
    waterThickness = max(waterThickness, min(authoredDepth, 0.02));
    float depthMix = smoothstep(0.0, max(uMaxDepth, 0.0001), waterThickness);
    vec3 shallowColor = mix(uLakeShallowColor, uRiverShallowColor, riverInfluence);
    vec3 deepColor = mix(uLakeDeepColor, uRiverDeepColor, riverInfluence);
    vec3 bodyColor = mix(shallowColor, deepColor, depthMix);
    vec3 transmission = exp(-waterThickness * mix(
      vec3(0.11, 0.065, 0.045),
      vec3(0.15, 0.085, 0.060),
      riverInfluence
    ));
    vec3 waterColor = refractedColor * transmission;
    waterColor += bodyColor * (1.0 - transmission) * 0.92;

    vec3 reflectionDirection = reflect(-viewDirection, worldNormal);
    vec3 reflectionColor = sampleReflection(
      reflectionDirection,
      worldPosition,
      reflectionTier
    );
    float fresnel = 0.02 + 0.98 * pow(
      1.0 - max(dot(worldNormal, viewDirection), 0.0),
      5.0
    );
    float reflectionWeight = clamp(
      fresnel * uReflectionStrength * (1.0 - roughness * 0.56),
      0.0,
      0.82
    );
    waterColor = mix(waterColor, reflectionColor, reflectionWeight);

    vec3 halfDirection = normalize(viewDirection + normalize(uSunDirection));
    float sunSpecular = pow(
      max(dot(worldNormal, halfDirection), 0.0),
      mix(150.0, 34.0, roughness)
    );
    waterColor += uSunColor * sunSpecular * (1.0 - roughness) * 0.72;

    vec3 foamColor = mix(uLakeFoamColor, uRiverFoamColor, riverInfluence);
    waterColor = mix(waterColor, foamColor, foam * 0.88);

    float viewDistance = length(worldPosition - uCameraPosition);
    float fogAmount = 1.0 - exp(-uFogDensity * viewDistance);
    waterColor = mix(waterColor, uFogColor, clamp(fogAmount, 0.0, 0.72));

    resolvedColor = vec4(
      mix(sceneColor.rgb, waterColor, coverage),
      1.0
    );
    gl_FragDepth = sceneDepth;
  }
`;

export function supportsHalfFloatWaterInfo(renderer) {
  return renderer?.extensions?.has?.('EXT_color_buffer_float') === true;
}

export function resolveWaterInfoEncoding(renderer, requested = WATER_INFO_ENCODING_AUTO) {
  if (requested === WATER_INFO_ENCODING_HALF_FLOAT
    || requested === WATER_INFO_ENCODING_PACKED) {
    return requested;
  }

  if (requested !== WATER_INFO_ENCODING_AUTO) {
    throw new Error(`Unsupported water info encoding: ${requested}`);
  }

  return supportsHalfFloatWaterInfo(renderer)
    ? WATER_INFO_ENCODING_HALF_FLOAT
    : WATER_INFO_ENCODING_PACKED;
}

export function createWaterInfoRenderTarget(
  width,
  height,
  { renderer = null, encoding = WATER_INFO_ENCODING_AUTO } = {},
) {
  const resolvedWidth = resolveDimension(width);
  const resolvedHeight = resolveDimension(height);
  const resolvedEncoding = resolveWaterInfoEncoding(renderer, encoding);
  const depthTexture = new THREE.DepthTexture(
    resolvedWidth,
    resolvedHeight,
    THREE.UnsignedIntType,
  );

  depthTexture.name = 'UnifiedWaterInfo.depth';
  depthTexture.format = THREE.DepthFormat;
  depthTexture.minFilter = THREE.NearestFilter;
  depthTexture.magFilter = THREE.NearestFilter;
  depthTexture.generateMipmaps = false;

  const target = new THREE.WebGLRenderTarget(resolvedWidth, resolvedHeight, {
    count: 2,
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    internalFormat: 'RGBA8',
    colorSpace: THREE.NoColorSpace,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    generateMipmaps: false,
    depthBuffer: true,
    stencilBuffer: false,
    depthTexture,
    samples: 0,
  });
  const opticsTexture = target.textures[0];
  const materialTexture = target.textures[1];

  opticsTexture.name = 'UnifiedWaterInfo.optics';
  materialTexture.name = 'UnifiedWaterInfo.material';

  if (resolvedEncoding === WATER_INFO_ENCODING_HALF_FLOAT) {
    opticsTexture.type = THREE.HalfFloatType;
    opticsTexture.internalFormat = 'RGBA16F';
  }

  target.name = 'UnifiedWaterInfo';
  target.userData = {};
  target.userData.waterInfoEncoding = resolvedEncoding;
  target.userData.waterInfoMaxDepth = WATER_INFO_MAX_DEPTH;

  return target;
}

export function createUnifiedWaterAttributeMaterial({
  encoding = WATER_INFO_ENCODING_HALF_FLOAT,
  maxDepth = WATER_INFO_MAX_DEPTH,
} = {}) {
  assertResolvedEncoding(encoding);

  const material = new THREE.ShaderMaterial({
    name: 'UnifiedWaterAttributeMaterial',
    glslVersion: THREE.GLSL3,
    defines: encoding === WATER_INFO_ENCODING_PACKED
      ? { WATER_INFO_PACKED: 1 }
      : {},
    uniforms: {
      uTime: { value: 0 },
      uMaxDepth: { value: maxDepth },
      uNormalDetail: { value: 1 },
    },
    vertexShader: ATTRIBUTE_VERTEX_SHADER,
    fragmentShader: ATTRIBUTE_FRAGMENT_SHADER,
    side: THREE.DoubleSide,
    transparent: false,
    depthTest: true,
    depthFunc: THREE.LessEqualDepth,
    depthWrite: true,
    blending: THREE.NoBlending,
    toneMapped: false,
  });

  material.defaultAttributeValues = {
    ...material.defaultAttributeValues,
    waterDepth: [1],
    shoreDistanceMeters: [100],
    flowUv: [0, 0],
    flowDirection: [1, 0],
    junctionFlowDirection: [1, 0],
    flowSpeed: [0],
    riverInfluence: [0],
    rapidMask: [0],
    junctionMask: [0],
    disturbanceMask: [0],
    reflectionTier: [0],
  };
  material.userData.waterInfoEncoding = encoding;
  return material;
}

export function createUnifiedWaterResolveMaterial({
  encoding = WATER_INFO_ENCODING_HALF_FLOAT,
  maxDepth = WATER_INFO_MAX_DEPTH,
} = {}) {
  assertResolvedEncoding(encoding);

  const material = new THREE.ShaderMaterial({
    name: 'UnifiedWaterResolveMaterial',
    glslVersion: THREE.GLSL3,
    defines: encoding === WATER_INFO_ENCODING_PACKED
      ? { WATER_INFO_PACKED: 1 }
      : {},
    uniforms: {
      tSceneColor: { value: null },
      tSceneDepth: { value: null },
      tWaterOptics: { value: null },
      tWaterMaterial: { value: null },
      tWaterDepth: { value: null },
      tEnvironmentMap: { value: null },
      tReflectionProbe: { value: null },
      tPlanarReflection: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uProjectionMatrixInverse: { value: new THREE.Matrix4() },
      uCameraWorldMatrix: { value: new THREE.Matrix4() },
      uViewMatrix: { value: new THREE.Matrix4() },
      uPlanarTextureMatrix: { value: new THREE.Matrix4() },
      uCameraPosition: { value: new THREE.Vector3() },
      uSunDirection: { value: VISUAL_ENVIRONMENT.sun.direction.clone() },
      uSunColor: { value: new THREE.Color(WATER_SUN_REFLECTION_COLOR) },
      uFogColor: { value: VISUAL_ENVIRONMENT.fog.color.clone() },
      uLakeShallowColor: { value: new THREE.Color(WATER_SHALLOW_COLOR) },
      uLakeDeepColor: { value: new THREE.Color(WATER_DEEP_COLOR) },
      uRiverShallowColor: { value: new THREE.Color(FLOWING_RIVER_SHALLOW_COLOR) },
      uRiverDeepColor: { value: new THREE.Color(FLOWING_RIVER_DEEP_COLOR) },
      uLakeFoamColor: { value: new THREE.Color(WATER_FOAM_COLOR) },
      uRiverFoamColor: { value: new THREE.Color(FLOWING_RIVER_FOAM_COLOR) },
      uFallbackReflectionColor: { value: new THREE.Color(WATER_REFLECTION_COLOR) },
      uMaxDepth: { value: maxDepth },
      uRefractionPixels: { value: 4 },
      uReflectionMode: { value: 0 },
      uReflectionStrength: { value: 0.72 },
      uFogDensity: { value: VISUAL_ENVIRONMENT.fog.density },
      uHasEnvironmentMap: { value: 0 },
      uHasReflectionProbe: { value: 0 },
      uHasPlanarReflection: { value: 0 },
    },
    vertexShader: RESOLVE_VERTEX_SHADER,
    fragmentShader: RESOLVE_FRAGMENT_SHADER,
    transparent: false,
    depthTest: true,
    depthFunc: THREE.AlwaysDepth,
    depthWrite: true,
    blending: THREE.NoBlending,
    toneMapped: false,
  });

  material.userData.waterInfoEncoding = encoding;
  return material;
}

export class UnifiedWaterPass extends Pass {
  constructor({
    renderer = null,
    scene,
    camera,
    surfaceRoots = [],
    effectRoots = [],
    width = 1,
    height = 1,
    encoding = WATER_INFO_ENCODING_AUTO,
    maxDepth = WATER_INFO_MAX_DEPTH,
    attributeMaterial = null,
    resolveMaterial = null,
  } = {}) {
    super();

    if (!scene || !camera) {
      throw new Error('UnifiedWaterPass requires a scene and camera.');
    }

    this.scene = scene;
    this.camera = camera;
    this.surfaceRoots = surfaceRoots.filter(Boolean);
    this.effectRoots = effectRoots.filter(Boolean);
    this.encoding = resolveWaterInfoEncoding(renderer, encoding);
    this.maxDepth = maxDepth;
    this.infoTarget = createWaterInfoRenderTarget(width, height, {
      renderer,
      encoding: this.encoding,
    });
    if (this.encoding === WATER_INFO_ENCODING_HALF_FLOAT) {
      try {
        if (!isWaterInfoTargetComplete(renderer, this.infoTarget)) {
          throw new Error('Water Info framebuffer is incomplete.');
        }
      } catch (error) {
        this.infoTarget.dispose();
        this.encoding = WATER_INFO_ENCODING_PACKED;
        this.infoTarget = createWaterInfoRenderTarget(width, height, {
          renderer,
          encoding: this.encoding,
        });
        if (!didWarnAboutPackedFallback) {
          didWarnAboutPackedFallback = true;
          console.warn(
            'Half-float Water Info MRT is unavailable; using packed RGBA8.',
            error,
          );
        }
      }
    }
    this.attributeMaterial = attributeMaterial ?? createUnifiedWaterAttributeMaterial({
      encoding: this.encoding,
      maxDepth,
    });
    this.resolveMaterial = resolveMaterial ?? createUnifiedWaterResolveMaterial({
      encoding: this.encoding,
      maxDepth,
    });
    this.ownsAttributeMaterial = attributeMaterial === null;
    this.ownsResolveMaterial = resolveMaterial === null;
    this.fullScreenQuad = new FullScreenQuad(this.resolveMaterial);
    this.needsSwap = true;
  }

  setSize(width, height) {
    const resolvedWidth = resolveDimension(width);
    const resolvedHeight = resolveDimension(height);

    this.infoTarget.setSize(resolvedWidth, resolvedHeight);
    this.infoTarget.depthTexture.image.width = resolvedWidth;
    this.infoTarget.depthTexture.image.height = resolvedHeight;
    this.resolveMaterial.uniforms.uResolution?.value.set(
      resolvedWidth,
      resolvedHeight,
    );
  }

  setTime(time) {
    if (this.attributeMaterial.uniforms.uTime) {
      this.attributeMaterial.uniforms.uTime.value = Number.isFinite(time) ? time : 0;
    }
  }

  setSurfaceRoots(surfaceRoots) {
    this.surfaceRoots = surfaceRoots.filter(Boolean);
  }

  setEffectRoots(effectRoots) {
    this.effectRoots = effectRoots.filter(Boolean);
  }

  setQuality({
    refractionPixels,
    reflectionMode,
    reflectionStrength,
    fogDensity,
    normalDetail,
  } = {}) {
    const uniforms = this.resolveMaterial.uniforms;

    setFiniteUniform(uniforms.uRefractionPixels, refractionPixels);
    setFiniteUniform(uniforms.uReflectionMode, reflectionMode);
    setFiniteUniform(uniforms.uReflectionStrength, reflectionStrength);
    setFiniteUniform(uniforms.uFogDensity, fogDensity);
    if (this.attributeMaterial.uniforms.uNormalDetail && normalDetail) {
      this.attributeMaterial.uniforms.uNormalDetail.value = getNormalDetailScale(
        normalDetail,
      );
    }
  }

  setReflectionTextures({
    environmentMap = null,
    reflectionProbe = null,
    planarReflection = null,
    planarTextureMatrix = null,
  } = {}) {
    const uniforms = this.resolveMaterial.uniforms;

    uniforms.tEnvironmentMap.value = environmentMap;
    uniforms.tReflectionProbe.value = reflectionProbe;
    uniforms.tPlanarReflection.value = planarReflection;
    uniforms.uHasEnvironmentMap.value = environmentMap ? 1 : 0;
    uniforms.uHasReflectionProbe.value = reflectionProbe ? 1 : 0;
    uniforms.uHasPlanarReflection.value = planarReflection ? 1 : 0;
    if (planarTextureMatrix) {
      uniforms.uPlanarTextureMatrix.value.copy(planarTextureMatrix);
    }
  }

  render(renderer, writeBuffer, readBuffer) {
    if (!readBuffer?.depthTexture) {
      throw new Error('UnifiedWaterPass requires a readable scene depth texture.');
    }

    if (!this.renderToScreen && !writeBuffer?.depthTexture) {
      throw new Error('UnifiedWaterPass requires a writable composer depth texture.');
    }

    const previousTarget = renderer.getRenderTarget();
    const previousAutoClear = renderer.autoClear;
    const previousBackground = this.scene.background;
    const previousOverrideMaterial = this.scene.overrideMaterial;
    const previousMatrixWorldAutoUpdate = this.scene.matrixWorldAutoUpdate;
    const previousShadowAutoUpdate = renderer.shadowMap?.autoUpdate;
    const childVisibility = this.scene.children.map((child) => child.visible);
    const previousClearColor = renderer.getClearColor
      ? renderer.getClearColor(new THREE.Color()).clone()
      : null;
    const previousClearAlpha = renderer.getClearAlpha?.();

    try {
      renderer.autoClear = false;
      this.scene.background = null;
      this.scene.matrixWorldAutoUpdate = false;
      if (renderer.shadowMap) renderer.shadowMap.autoUpdate = false;

      applyExclusiveRootVisibility(
        this.scene,
        childVisibility,
        this.surfaceRoots,
      );
      this.scene.overrideMaterial = this.attributeMaterial;
      renderer.setRenderTarget(this.infoTarget);
      renderer.setClearColor?.(0x000000, 0);
      renderer.clear(true, true, true);
      renderer.render(this.scene, this.camera);

      this.bindResolveInputs(readBuffer);
      restoreRootVisibility(this.scene, childVisibility);
      this.scene.overrideMaterial = previousOverrideMaterial;
      renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
      this.fullScreenQuad.render(renderer);

      if (this.effectRoots.length > 0) {
        applyExclusiveRootVisibility(
          this.scene,
          childVisibility,
          this.effectRoots,
        );
        renderer.render(this.scene, this.camera);
      }
    } finally {
      if (renderer.shadowMap) {
        renderer.shadowMap.autoUpdate = previousShadowAutoUpdate;
      }
      this.scene.matrixWorldAutoUpdate = previousMatrixWorldAutoUpdate;
      this.scene.overrideMaterial = previousOverrideMaterial;
      this.scene.background = previousBackground;
      restoreRootVisibility(this.scene, childVisibility);
      renderer.autoClear = previousAutoClear;
      if (previousClearColor) {
        renderer.setClearColor(previousClearColor, previousClearAlpha);
      }
      renderer.setRenderTarget(previousTarget);
    }
  }

  bindResolveInputs(readBuffer) {
    const uniforms = this.resolveMaterial.uniforms;
    const width = this.infoTarget.width;
    const height = this.infoTarget.height;

    uniforms.tSceneColor.value = readBuffer.texture;
    uniforms.tSceneDepth.value = readBuffer.depthTexture;
    uniforms.tWaterOptics.value = this.infoTarget.textures[0];
    uniforms.tWaterMaterial.value = this.infoTarget.textures[1];
    uniforms.tWaterDepth.value = this.infoTarget.depthTexture;
    uniforms.uResolution.value.set(width, height);
    uniforms.uProjectionMatrixInverse.value.copy(
      this.camera.projectionMatrixInverse,
    );
    uniforms.uCameraWorldMatrix.value.copy(this.camera.matrixWorld);
    uniforms.uViewMatrix.value.copy(this.camera.matrixWorldInverse);
    uniforms.uCameraPosition.value.setFromMatrixPosition(this.camera.matrixWorld);
  }

  dispose() {
    this.infoTarget.dispose();
    if (this.ownsAttributeMaterial) this.attributeMaterial.dispose();
    if (this.ownsResolveMaterial) this.resolveMaterial.dispose();
    this.fullScreenQuad.dispose();
  }
}

function applyExclusiveRootVisibility(scene, originalVisibility, roots) {
  const selectedRoots = new Set(roots.map((root) => getSceneRoot(scene, root)));

  scene.children.forEach((child, index) => {
    child.visible = originalVisibility[index] && selectedRoots.has(child);
  });
}

function getSceneRoot(scene, object) {
  let root = object;

  while (root?.parent && root.parent !== scene) root = root.parent;
  return root?.parent === scene ? root : object;
}

function restoreRootVisibility(scene, visibility) {
  scene.children.forEach((child, index) => {
    child.visible = visibility[index];
  });
}

function resolveDimension(value) {
  return Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));
}

function isWaterInfoTargetComplete(renderer, target) {
  if (!renderer?.initRenderTarget) return true;

  const previousTarget = renderer.getRenderTarget?.() ?? null;
  const previousFace = renderer.getActiveCubeFace?.() ?? 0;
  const previousLevel = renderer.getActiveMipmapLevel?.() ?? 0;

  try {
    renderer.initRenderTarget(target);
    const gl = renderer.getContext?.();

    if (!gl?.checkFramebufferStatus || !renderer.setRenderTarget) return true;
    renderer.setRenderTarget(target);
    return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  } finally {
    renderer.setRenderTarget?.(previousTarget, previousFace, previousLevel);
  }
}

function assertResolvedEncoding(encoding) {
  if (encoding !== WATER_INFO_ENCODING_HALF_FLOAT
    && encoding !== WATER_INFO_ENCODING_PACKED) {
    throw new Error(`Water materials require a resolved encoding, received: ${encoding}`);
  }
}

function setFiniteUniform(uniform, value) {
  if (uniform && Number.isFinite(value)) uniform.value = value;
}

function getNormalDetailScale(detail) {
  if (detail === 'low') return 0.55;
  if (detail === 'high') return 1.25;
  return 1;
}
