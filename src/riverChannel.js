import * as THREE from 'three';
import {
  WATER_DUAL_WAVE_GLSL,
  WATER_FOG_FRAGMENT_GLSL,
  WATER_FOG_FRAGMENT_PARS_GLSL,
  WATER_FOG_VERTEX_GLSL,
  WATER_FOG_VERTEX_PARS_GLSL,
  WATER_NOISE_GLSL,
  WATER_REFLECTION_GLSL,
  WATER_RENDER_ORDER,
  createWaterUniforms,
} from './waterContext.js';

export const RIVER_TERMINAL_LAKE = Object.freeze({
  cx: 690,
  cz: -340,
  radius: 20,
  shoreWidth: 6,
  waterLevel: -1.28,
  maxDepth: 3,
  edgeDepth: 0.15,
  surfaceOffset: 0.045,
});

const CHANNEL_POINTS = [
  new THREE.Vector3(420, 0, -423),
  new THREE.Vector3(435, 0, -413),
  new THREE.Vector3(460, 0, -398),
  new THREE.Vector3(489, 0, -388),
  new THREE.Vector3(518, 0, -374),
  new THREE.Vector3(545, 0, -350),
  new THREE.Vector3(575, 0, -336),
  new THREE.Vector3(604, 0, -337),
  new THREE.Vector3(633, 0, -349),
  new THREE.Vector3(662, 0, -351),
  new THREE.Vector3(690, 0, -340),
];

const CHANNEL_WIDTH = 8;
const CHANNEL_DEPTH = 3;
const INFLUENCE_RADIUS = 7;
const HIGHLAND_FADE_START = 10;
const HIGHLAND_FADE_END = 18;
const PATH_SAMPLE_COUNT = 260;
const WATER_WIDTH = 4.8;
const WATER_LEVEL_ABOVE_BED = 1.6;
const WATER_LONGITUDINAL_STEP = 0.3;
const WATER_LATERAL_SEGMENTS = 24;
const WATER_PROFILE_SMOOTH_RADIUS = 10;
const WATER_PROFILE_MAX_STEP = 0.025;
const WET_BANK_WIDTH = 0.85;
const START_TAPER_LENGTH = 10;
const TERMINAL_LAKE_LEVEL_BLEND_LENGTH = 18;
const TERMINAL_LAKE_VISUAL_FADE_LENGTH = 4;
export const RIVER_BED_TEXTURE_PATH = '/assets/terrain/river-bed.webp';
export const RIVER_BED_TEXTURE_WORLD_SIZE = 12;
export const RIVER_BANK_TEXTURE_PATH = '/assets/terrain/river-bank-rock-wet-light-alt.webp';
const RIVER_BANK_UNDERWATER_OVERLAP = 0.22;
const RIVER_BANK_SURFACE_OFFSET = 0.14;
export const RIVER_BANK_TEXTURE_WORLD_SIZE = 3.8;
const RIVER_BED_CORE_HALF_WIDTH = 0.25;
const RIVER_BED_BLEND_HALF_WIDTH = 0.75;
const RIVER_BANK_TEXTURE_FULL_HALF_WIDTH = 3.6;
const RIVER_BANK_TEXTURE_FADE_HALF_WIDTH = 4.4;

const HALF_CHANNEL_WIDTH = CHANNEL_WIDTH * 0.5;
const HALF_WATER_WIDTH = WATER_WIDTH * 0.5;
const RIVER_BANK_INNER_LATERAL = HALF_WATER_WIDTH - RIVER_BANK_UNDERWATER_OVERLAP;
const RIVER_BANK_OUTER_LATERAL = HALF_CHANNEL_WIDTH;
const channelCurve = new THREE.CatmullRomCurve3(CHANNEL_POINTS, false, 'centripetal');
const channelSamples = createChannelSamples();
const channelLength = channelSamples[channelSamples.length - 1].distance;
const terminalLakeEntryDistance = findTerminalLakeEntryDistance();
const channelBounds = createChannelBounds();

export async function loadRiverTextures() {
  const loader = new THREE.TextureLoader();
  const riverBank = await loader.loadAsync(RIVER_BANK_TEXTURE_PATH);

  riverBank.wrapS = THREE.RepeatWrapping;
  riverBank.wrapT = THREE.RepeatWrapping;
  riverBank.colorSpace = THREE.SRGBColorSpace;

  return { riverBank };
}

export function applyRiverChannel(baseHeight, x, z) {
  const frame = getChannelFrameAt(x, z);

  if (!frame) return baseHeight;

  const heightMask = 1 - smoothstep(HIGHLAND_FADE_START, HIGHLAND_FADE_END, baseHeight);

  if (heightMask <= 0) return baseHeight;

  const lateralDistance = Math.abs(frame.lateral);
  const bedShape = 1 - smoothstep(0, HALF_CHANNEL_WIDTH, lateralDistance);
  const bankShape = 1 - smoothstep(HALF_CHANNEL_WIDTH, INFLUENCE_RADIUS, lateralDistance);
  const carveStrength = Math.max(bedShape, bankShape * 0.22)
    * heightMask
    * getStartMask(frame.distance);

  if (isInsideTerminalLake(x, z)) {
    const lakeBedTarget = RIVER_TERMINAL_LAKE.waterLevel - RIVER_TERMINAL_LAKE.maxDepth;
    const riverBedTarget = THREE.MathUtils.lerp(baseHeight, lakeBedTarget, carveStrength);

    return Math.min(baseHeight, riverBedTarget);
  }

  return baseHeight - CHANNEL_DEPTH * carveStrength;
}

export function getRiverMaterialMask(baseHeight, x, z) {
  return getRiverMaterialFrame(baseHeight, x, z).riverMask;
}

export function getRiverBedMaterialMask(baseHeight, x, z) {
  return getRiverMaterialFrame(baseHeight, x, z).riverBedMask;
}

export function getRiverMaterialFrame(baseHeight, x, z) {
  const frame = getChannelFrameAt(x, z);

  if (!frame) return createEmptyRiverMaterialFrame();

  const heightMask = 1 - smoothstep(HIGHLAND_FADE_START, HIGHLAND_FADE_END, baseHeight);

  if (heightMask <= 0) return createEmptyRiverMaterialFrame();

  const lateralDistance = Math.abs(frame.lateral);
  const channelMask = 1 - smoothstep(
    RIVER_BANK_TEXTURE_FULL_HALF_WIDTH,
    RIVER_BANK_TEXTURE_FADE_HALF_WIDTH,
    lateralDistance,
  );
  const bedMask = 1 - smoothstep(RIVER_BED_CORE_HALF_WIDTH, RIVER_BED_BLEND_HALF_WIDTH, lateralDistance);
  const underwaterMask = 1 - smoothstep(HALF_WATER_WIDTH - 0.2, HALF_WATER_WIDTH + 0.2, lateralDistance);
  const mask = heightMask * getStartMask(frame.distance);

  return {
    riverMask: THREE.MathUtils.clamp(channelMask * mask, 0, 1),
    riverBedMask: THREE.MathUtils.clamp(bedMask * mask, 0, 1),
    riverUnderwaterMask: THREE.MathUtils.clamp(underwaterMask * mask, 0, 1),
    riverDistance: frame.distance,
    riverLateral: frame.lateral,
  };
}

export function createRiverWaterMesh(terrain) {
  const waterProfile = createWaterHeightProfile(terrain, WATER_LONGITUDINAL_STEP);
  const geometry = createChannelStripGeometry(
    terrain,
    -HALF_WATER_WIDTH,
    HALF_WATER_WIDTH,
    WATER_LONGITUDINAL_STEP,
    WATER_LATERAL_SEGMENTS,
    getFlatWaterHeight,
    (_terrain, _x, _z, distance) => getWaterProfileHeight(waterProfile, distance),
    true,
    getRiverWaterGeometryMaxDistance(),
  );
  const mesh = new THREE.Mesh(geometry, createRiverWaterMaterial());

  mesh.name = 'RiverWater';
  mesh.renderOrder = WATER_RENDER_ORDER.surface;

  return mesh;
}

export function getRiverWaterGeometryMaxDistance() {
  return Math.min(
    channelLength,
    terminalLakeEntryDistance + TERMINAL_LAKE_VISUAL_FADE_LENGTH,
  );
}

export function createWetBankMesh(terrain, textures) {
  const group = new THREE.Group();
  const material = createWetBankMaterial(textures.riverBank);
  const left = new THREE.Mesh(
    createChannelStripGeometry(
      terrain,
      -RIVER_BANK_OUTER_LATERAL,
      -RIVER_BANK_INNER_LATERAL,
      WATER_LONGITUDINAL_STEP,
      4,
      getWetBankHeight,
    ),
    material,
  );
  const right = new THREE.Mesh(
    createChannelStripGeometry(
      terrain,
      RIVER_BANK_OUTER_LATERAL,
      RIVER_BANK_INNER_LATERAL,
      WATER_LONGITUDINAL_STEP,
      4,
      getWetBankHeight,
    ),
    material,
  );

  left.name = 'RiverWetBankLeft';
  right.name = 'RiverWetBankRight';
  left.renderOrder = WATER_RENDER_ORDER.wetBank;
  right.renderOrder = WATER_RENDER_ORDER.wetBank;
  group.name = 'RiverWetBanks';
  group.add(left, right);

  return group;
}

export function updateRiverVisuals(water, wetBanks, camera, elapsedTime) {
  if (water?.material?.uniforms) {
    water.material.uniforms.uTime.value = elapsedTime;
    water.material.uniforms.uCameraPosition.value.copy(camera.position);
  }

  for (const bank of wetBanks?.children ?? []) {
    if (bank.material?.uniforms) {
      bank.material.uniforms.uTime.value = elapsedTime;
    }
  }
}

export function isInRiverGrassExclusion(x, z, buffer = 2) {
  const frame = getChannelFrameAt(x, z);

  if (!frame) return false;

  return Math.abs(frame.lateral) <= HALF_WATER_WIDTH + WET_BANK_WIDTH + buffer;
}

function createEmptyRiverMaterialFrame() {
  return {
    riverMask: 0,
    riverBedMask: 0,
    riverUnderwaterMask: 0,
    riverDistance: 0,
    riverLateral: 0,
  };
}

function createChannelStripGeometry(
  terrain,
  minLateral,
  maxLateral,
  longitudinalStep,
  lateralSegments,
  getVertexHeight,
  getRowHeight = getWaterRowHeight,
  includeWaterDepth = false,
  maxDistance = channelLength,
) {
  const geometryLength = Math.min(maxDistance, channelLength);
  const longitudinalSegments = Math.max(1, Math.ceil(geometryLength / longitudinalStep));
  const verticesPerRow = lateralSegments + 1;
  const vertexCount = (longitudinalSegments + 1) * verticesPerRow;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const waterDepths = includeWaterDepth ? new Float32Array(vertexCount) : null;
  const indices = new Uint32Array(longitudinalSegments * lateralSegments * 6);

  let positionOffset = 0;
  let uvOffset = 0;
  let depthOffset = 0;

  for (let i = 0; i <= longitudinalSegments; i += 1) {
    const t = i / longitudinalSegments;
    const distance = t * geometryLength;
    const pathT = distance / channelLength;
    const center = channelCurve.getPointAt(pathT);
    const tangent = channelCurve.getTangentAt(pathT).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const rowHeight = getRowHeight(terrain, center.x, center.z, distance);

    for (let j = 0; j <= lateralSegments; j += 1) {
      const lateralT = j / lateralSegments;
      const lateral = THREE.MathUtils.lerp(minLateral, maxLateral, lateralT);
      const x = center.x + side.x * lateral;
      const z = center.z + side.z * lateral;
      const y = getVertexHeight(terrain, x, z, rowHeight, lateralT);
      const terrainHeight = includeWaterDepth ? terrain.getHeightAt(x, z) : 0;

      positions[positionOffset] = x;
      positions[positionOffset + 1] = y;
      positions[positionOffset + 2] = z;
      positionOffset += 3;

      if (waterDepths) {
        waterDepths[depthOffset] = Math.max(rowHeight - terrainHeight, 0);
        depthOffset += 1;
      }

      uvs[uvOffset] = distance / 8;
      uvs[uvOffset + 1] = lateralT;
      uvOffset += 2;
    }
  }

  let indexOffset = 0;

  for (let i = 0; i < longitudinalSegments; i += 1) {
    for (let j = 0; j < lateralSegments; j += 1) {
      const topLeft = i * verticesPerRow + j;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + verticesPerRow;
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
  if (waterDepths) {
    geometry.setAttribute('waterDepth', new THREE.BufferAttribute(waterDepths, 1));
  }
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

function getFlatWaterHeight(_terrain, _x, _z, rowHeight) {
  return rowHeight;
}

function getWetBankHeight(terrain, x, z) {
  return terrain.getHeightAt(x, z) + RIVER_BANK_SURFACE_OFFSET;
}

function getWaterRowHeight(terrain, x, z) {
  return terrain.getHeightAt(x, z) + WATER_LEVEL_ABOVE_BED;
}

function createWaterHeightProfile(terrain, longitudinalStep) {
  const longitudinalSegments = Math.ceil(channelLength / longitudinalStep);
  const rawHeights = new Float32Array(longitudinalSegments + 1);

  for (let i = 0; i <= longitudinalSegments; i += 1) {
    const center = channelCurve.getPointAt(i / longitudinalSegments);
    rawHeights[i] = getWaterRowHeight(terrain, center.x, center.z);
  }

  const smoothedHeights = smoothWaterProfile(rawHeights);
  const clampedHeights = clampWaterProfileSteps(smoothedHeights, WATER_PROFILE_MAX_STEP);

  return {
    step: channelLength / longitudinalSegments,
    heights: clampedHeights,
  };
}

function smoothWaterProfile(heights) {
  const smoothed = new Float32Array(heights.length);

  for (let i = 0; i < heights.length; i += 1) {
    let total = 0;
    let weightTotal = 0;
    const start = Math.max(0, i - WATER_PROFILE_SMOOTH_RADIUS);
    const end = Math.min(heights.length - 1, i + WATER_PROFILE_SMOOTH_RADIUS);

    for (let j = start; j <= end; j += 1) {
      const distance = Math.abs(i - j);
      const weight = WATER_PROFILE_SMOOTH_RADIUS + 1 - distance;
      total += heights[j] * weight;
      weightTotal += weight;
    }

    smoothed[i] = total / weightTotal;
  }

  return smoothed;
}

function clampWaterProfileSteps(heights, maxStep) {
  const clamped = Float32Array.from(heights);

  for (let i = 1; i < clamped.length; i += 1) {
    const previous = clamped[i - 1];
    clamped[i] = THREE.MathUtils.clamp(clamped[i], previous - maxStep, previous + maxStep);
  }

  for (let i = clamped.length - 2; i >= 0; i -= 1) {
    const next = clamped[i + 1];
    clamped[i] = THREE.MathUtils.clamp(clamped[i], next - maxStep, next + maxStep);
  }

  return clamped;
}

function getWaterProfileHeight(profile, distance) {
  const index = THREE.MathUtils.clamp(distance / profile.step, 0, profile.heights.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.min(profile.heights.length - 1, lowerIndex + 1);
  const t = THREE.MathUtils.smoothstep(index - lowerIndex, 0, 1);
  const profileHeight = THREE.MathUtils.lerp(
    profile.heights[lowerIndex],
    profile.heights[upperIndex],
    t,
  );
  const lakeBlend = smoothstep(
    terminalLakeEntryDistance - TERMINAL_LAKE_LEVEL_BLEND_LENGTH,
    terminalLakeEntryDistance,
    distance,
  );
  const lakeSurfaceHeight = RIVER_TERMINAL_LAKE.waterLevel + RIVER_TERMINAL_LAKE.surfaceOffset;

  return THREE.MathUtils.lerp(profileHeight, lakeSurfaceHeight, lakeBlend);
}

function createRiverWaterMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    forceSinglePass: true,
    depthWrite: false,
    depthTest: true,
    uniforms: createWaterUniforms({
      uTerminalLakeEntryDistance: { value: terminalLakeEntryDistance },
      uTerminalLakeLevelBlendLength: { value: TERMINAL_LAKE_LEVEL_BLEND_LENGTH },
      uTerminalLakeVisualFadeLength: { value: TERMINAL_LAKE_VISUAL_FADE_LENGTH },
    }),
    vertexShader: `
      uniform float uTime;

      attribute float waterDepth;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vWaterDepth;
      ${WATER_FOG_VERTEX_PARS_GLSL}

      void main() {
        vUv = uv;
        vWaterDepth = waterDepth;

        vec3 transformed = position;

        vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
        vWorldPosition = worldPosition.xyz;
        ${WATER_FOG_VERTEX_GLSL}
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uShallowColor;
      uniform vec3 uDeepColor;
      uniform vec3 uFoamColor;
      uniform vec3 uReflectionColor;
      uniform vec3 uHorizonReflectionColor;
      uniform vec3 uBankReflectionColor;
      uniform vec3 uSunReflectionColor;
      uniform vec3 uSunDirection;
      uniform vec3 uCameraPosition;
      uniform float uTerminalLakeEntryDistance;
      uniform float uTerminalLakeLevelBlendLength;
      uniform float uTerminalLakeVisualFadeLength;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vWaterDepth;
      ${WATER_FOG_FRAGMENT_PARS_GLSL}

      ${WATER_NOISE_GLSL}
      ${WATER_DUAL_WAVE_GLSL}
      ${WATER_REFLECTION_GLSL}

      float getCaustics(vec2 worldUv) {
        float a = sin((worldUv.x + worldUv.y) * 1.6 + uTime * 1.4);
        float b = sin((worldUv.x - worldUv.y) * 2.1 - uTime * 1.1);
        float ridges = max(a * b, 0.0);
        float broken = waterNoise2(worldUv * 0.22 + vec2(6.4, -3.1));

        return ridges * ridges * smoothstep(0.35, 0.82, broken);
      }

      void main() {
        float riverDistance = vUv.x * 8.0;
        float terminalFade = 1.0 - smoothstep(
          uTerminalLakeEntryDistance,
          uTerminalLakeEntryDistance + uTerminalLakeVisualFadeLength,
          riverDistance
        );
        float terminalApproach = smoothstep(
          uTerminalLakeEntryDistance - uTerminalLakeLevelBlendLength,
          uTerminalLakeEntryDistance,
          riverDistance
        );
        float edge = min(vUv.y, 1.0 - vUv.y);
        float centerMask = smoothstep(0.04, 0.46, edge);
        float depthMask = smoothstep(0.12, 1.45, vWaterDepth);
        float riverDeepMask = max(centerMask * depthMask, depthMask * 0.18);
        float lakeDeepMask = smoothstep(2.2, 12.0, vWaterDepth);
        float deepMask = mix(riverDeepMask, lakeDeepMask, terminalApproach);
        float edgeBreakup = waterNoise2(vWorldPosition.xz * 0.52 + vec2(uTime * 0.025, -uTime * 0.01));
        float edgeAlpha = smoothstep(0.018, 0.18, edge + (edgeBreakup - 0.5) * 0.035);
        float depthAlpha = mix(0.58, 1.0, depthMask);
        depthAlpha = mix(
          depthAlpha,
          smoothstep(0.025, 0.9, vWaterDepth),
          uDepthShorelineEnabled
        );
        float surfaceAlpha = mix(0.12, 0.52, max(centerMask * 0.72, depthMask));
        float startFade = smoothstep(0.08, 1.35, vUv.x);
        float alpha = edgeAlpha * surfaceAlpha * depthAlpha;

        vec3 waterColor = mix(uShallowColor, uDeepColor, deepMask);
        float bottomVisibility = mix(0.92, 0.5, depthMask);
        vec2 bedUv = vWorldPosition.xz;

        float flowSpeed = mix(0.18, 0.42, deepMask) * terminalFade;
        vec2 waveUv = vec2(vUv.x * 0.52, vUv.y * 2.4);
        waveUv.x -= uTime * flowSpeed;
        vec3 normal = getDualWaveNormal(waveUv, vWorldPosition.xz * 0.2, uTime, mix(0.68, 1.12, deepMask));
        float surfaceRipple = waterNoise2(waveUv * vec2(3.4, 2.1) + vWorldPosition.xz * 0.035);
        waterColor *= mix(0.84, 1.12, surfaceRipple);

        float caustics = getCaustics(bedUv);
        float shallowDetail = 1.0 - smoothstep(0.65, 1.8, vWaterDepth);
        float causticMask = bottomVisibility * edgeAlpha * shallowDetail;
        waterColor += vec3(0.74, 0.96, 1.0) * caustics * causticMask * 0.18;

        vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);
        float glancingReflection = smoothstep(0.08, 0.82, fresnel);
        vec3 skyReflection = getTieredWaterReflection(
          mix(uHorizonReflectionColor, uReflectionColor, smoothstep(0.18, 0.92, normal.y)),
          vWorldPosition,
          normal,
          viewDir
        );
        float bankNoise = waterNoise2(vWorldPosition.xz * 0.18 + vec2(uTime * 0.018, -uTime * 0.012));
        float bankReflection = (1.0 - centerMask) * edgeAlpha * smoothstep(0.32, 0.86, bankNoise);
        waterColor = mix(waterColor, skyReflection, 0.16 + glancingReflection * 0.38);
        waterColor = mix(waterColor, uBankReflectionColor, bankReflection * 0.2);
        alpha = max(alpha, glancingReflection * 0.32);

        vec3 lightDir = normalize(uSunDirection);
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 118.0);
        float broadSpec = pow(max(dot(normal, halfDir), 0.0), 32.0);
        float sparkle = smoothstep(0.5, 0.9, waterNoise(vWorldPosition.xz * 0.95 + vec2(-uTime * 0.46, uTime * 0.08)));
        waterColor += uSunReflectionColor * (spec * sparkle * 0.8 + broadSpec * glancingReflection * 0.12);
        waterColor = mix(waterColor, uDeepColor * 0.9, terminalApproach * 0.55);

        float foamBase = 1.0 - smoothstep(0.006, 0.055, edge);
        foamBase *= 1.0 - smoothstep(0.65, 1.45, vWaterDepth);
        vec2 bigFoamUv = vec2(vUv.x * 6.5 - uTime * 0.16, vUv.y * 32.0);
        vec2 smallFoamUv = vec2(vUv.x * 18.0 - uTime * 0.34, vUv.y * 92.0);
        float bigFoam = smoothstep(0.58, 0.84, waterNoise2(bigFoamUv));
        float smallFoam = smoothstep(0.66, 0.9, waterNoise2(smallFoamUv));
        float foam = foamBase * max(bigFoam * 0.72, smallFoam * 0.42) * 0.72 * terminalFade;
        float startFoam = (1.0 - smoothstep(0.08, 1.55, vUv.x))
          * smoothstep(0.08, 0.62, centerMask)
          * smoothstep(0.28, 0.82, waterNoise2(vec2(vUv.x * 8.0 - uTime * 0.18, vUv.y * 18.0)));

        waterColor = mix(waterColor, uFoamColor, max(foam * 0.58, startFoam * 0.3));
        alpha = max(alpha, foam * 0.34);
        alpha = max(alpha, startFoam * 0.12);
        alpha *= startFade * terminalFade * mix(1.0, 0.55, terminalApproach);

        gl_FragColor = vec4(waterColor, alpha);
        ${WATER_FOG_FRAGMENT_GLSL}
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function createWetBankMaterial(riverBankTexture) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    forceSinglePass: true,
    depthWrite: false,
    depthTest: true,
    uniforms: createWaterUniforms({
      uRiverBankTexture: { value: riverBankTexture },
      uTextureWorldSize: { value: RIVER_BANK_TEXTURE_WORLD_SIZE },
    }),
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      ${WATER_FOG_VERTEX_PARS_GLSL}

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        ${WATER_FOG_VERTEX_GLSL}
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform sampler2D uRiverBankTexture;
      uniform float uTextureWorldSize;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      ${WATER_FOG_FRAGMENT_PARS_GLSL}

      ${WATER_NOISE_GLSL}

      void main() {
        vec3 bankColor = texture2D(uRiverBankTexture, vWorldPosition.xz / uTextureWorldSize).rgb;
        float outerFade = smoothstep(0.04, 0.28, vUv.y);
        float underwaterFade = mix(1.0, 0.18, smoothstep(0.82, 1.0, vUv.y));
        float brokenEdge = mix(0.62, 1.0, smoothstep(0.18, 0.78, waterNoise2(vWorldPosition.xz * 1.7)));
        float sediment = waterNoise(vWorldPosition.xz * 0.72 + vec2(4.7, -2.1));
        vec3 wetColor = bankColor * mix(vec3(0.48, 0.52, 0.48), vec3(0.68, 0.72, 0.66), sediment);
        float alpha = outerFade * underwaterFade * brokenEdge * 0.34;

        gl_FragColor = vec4(wetColor, alpha);
        ${WATER_FOG_FRAGMENT_GLSL}
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function getChannelFrameAt(x, z) {
  if (
    x < channelBounds.minX
    || x > channelBounds.maxX
    || z < channelBounds.minZ
    || z > channelBounds.maxZ
  ) {
    return null;
  }

  let closest = null;
  let minDistanceSq = Infinity;

  for (let i = 0; i < channelSamples.length - 1; i += 1) {
    const start = channelSamples[i];
    const end = channelSamples[i + 1];
    const segmentX = end.x - start.x;
    const segmentZ = end.z - start.z;
    const segmentLengthSq = segmentX * segmentX + segmentZ * segmentZ;
    const t = THREE.MathUtils.clamp(
      ((x - start.x) * segmentX + (z - start.z) * segmentZ) / segmentLengthSq,
      0,
      1,
    );
    const closestX = start.x + segmentX * t;
    const closestZ = start.z + segmentZ * t;
    const dx = x - closestX;
    const dz = z - closestZ;
    const distanceSq = dx * dx + dz * dz;

    if (distanceSq >= minDistanceSq) continue;

    const segmentLength = Math.sqrt(segmentLengthSq);
    const sideX = -segmentZ / segmentLength;
    const sideZ = segmentX / segmentLength;

    minDistanceSq = distanceSq;
    closest = {
      distance: start.distance + segmentLength * t,
      lateral: dx * sideX + dz * sideZ,
    };
  }

  if (!closest || minDistanceSq > INFLUENCE_RADIUS * INFLUENCE_RADIUS) return null;

  return closest;
}

function createChannelSamples() {
  const samples = [];
  let distance = 0;
  let previous = null;

  for (let i = 0; i <= PATH_SAMPLE_COUNT; i += 1) {
    const point = channelCurve.getPoint(i / PATH_SAMPLE_COUNT);

    if (previous) {
      distance += point.distanceTo(previous);
    }

    samples.push({ x: point.x, z: point.z, distance });
    previous = point;
  }

  return samples;
}

function findTerminalLakeEntryDistance() {
  const radiusSq = RIVER_TERMINAL_LAKE.radius * RIVER_TERMINAL_LAKE.radius;

  for (let i = 0; i < channelSamples.length - 1; i += 1) {
    const start = channelSamples[i];
    const end = channelSamples[i + 1];
    const startDx = start.x - RIVER_TERMINAL_LAKE.cx;
    const startDz = start.z - RIVER_TERMINAL_LAKE.cz;
    const endDx = end.x - RIVER_TERMINAL_LAKE.cx;
    const endDz = end.z - RIVER_TERMINAL_LAKE.cz;
    const startInside = startDx * startDx + startDz * startDz <= radiusSq;
    const endInside = endDx * endDx + endDz * endDz <= radiusSq;

    if (startInside) return start.distance;
    if (!endInside) continue;

    let outsideT = 0;
    let insideT = 1;

    for (let iteration = 0; iteration < 20; iteration += 1) {
      const t = (outsideT + insideT) * 0.5;
      const x = THREE.MathUtils.lerp(start.x, end.x, t);
      const z = THREE.MathUtils.lerp(start.z, end.z, t);
      const dx = x - RIVER_TERMINAL_LAKE.cx;
      const dz = z - RIVER_TERMINAL_LAKE.cz;

      if (dx * dx + dz * dz <= radiusSq) {
        insideT = t;
      } else {
        outsideT = t;
      }
    }

    return THREE.MathUtils.lerp(start.distance, end.distance, insideT);
  }

  return channelLength;
}

function isInsideTerminalLake(x, z) {
  const dx = x - RIVER_TERMINAL_LAKE.cx;
  const dz = z - RIVER_TERMINAL_LAKE.cz;

  return dx * dx + dz * dz <= RIVER_TERMINAL_LAKE.radius * RIVER_TERMINAL_LAKE.radius;
}

function createChannelBounds() {
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };

  for (const sample of channelSamples) {
    bounds.minX = Math.min(bounds.minX, sample.x - INFLUENCE_RADIUS);
    bounds.maxX = Math.max(bounds.maxX, sample.x + INFLUENCE_RADIUS);
    bounds.minZ = Math.min(bounds.minZ, sample.z - INFLUENCE_RADIUS);
    bounds.maxZ = Math.max(bounds.maxZ, sample.z + INFLUENCE_RADIUS);
  }

  return bounds;
}

function getStartMask(distance) {
  return smoothstep(0, START_TAPER_LENGTH, distance);
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}
