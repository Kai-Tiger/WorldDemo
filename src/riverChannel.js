import * as THREE from 'three';

const CHANNEL_POINTS = [
  new THREE.Vector3(420, 0, -423),
  new THREE.Vector3(430, 0, -417),
  new THREE.Vector3(455, 0, -398),
  new THREE.Vector3(500, 0, -375),
  new THREE.Vector3(560, 0, -335),
  new THREE.Vector3(590, 0, -302),
  new THREE.Vector3(605, 0, -284),
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
const END_TAPER_LENGTH = 10;
export const RIVER_BANK_TEXTURE_PATH = '/assets/terrain/river-bank-rock-wet-light-alt.webp';
const RIVER_BANK_UNDERWATER_OVERLAP = 0.22;
const RIVER_BANK_SURFACE_OFFSET = 0.14;
export const RIVER_BANK_TEXTURE_WORLD_SIZE = 3.8;

const HALF_CHANNEL_WIDTH = CHANNEL_WIDTH * 0.5;
const HALF_WATER_WIDTH = WATER_WIDTH * 0.5;
const RIVER_BANK_INNER_LATERAL = HALF_WATER_WIDTH - RIVER_BANK_UNDERWATER_OVERLAP;
const RIVER_BANK_OUTER_LATERAL = HALF_CHANNEL_WIDTH;
const channelCurve = new THREE.CatmullRomCurve3(CHANNEL_POINTS, false, 'centripetal');
const channelSamples = createChannelSamples();
const channelLength = channelSamples[channelSamples.length - 1].distance;
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
  const endMask = getEndMask(frame.distance);
  const carveDepth = CHANNEL_DEPTH * Math.max(bedShape, bankShape * 0.22) * heightMask * endMask;

  return baseHeight - carveDepth;
}

export function getRiverMaterialMask(baseHeight, x, z) {
  const frame = getChannelFrameAt(x, z);

  if (!frame) return 0;

  const heightMask = 1 - smoothstep(HIGHLAND_FADE_START, HIGHLAND_FADE_END, baseHeight);

  if (heightMask <= 0) return 0;

  const lateralDistance = Math.abs(frame.lateral);
  const channelMask = 1 - smoothstep(HALF_CHANNEL_WIDTH, INFLUENCE_RADIUS, lateralDistance);
  const endMask = getEndMask(frame.distance);

  return THREE.MathUtils.clamp(channelMask * heightMask * endMask, 0, 1);
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
  );
  const mesh = new THREE.Mesh(geometry, createRiverWaterMaterial());

  mesh.name = 'RiverWater';
  mesh.renderOrder = 20;

  return mesh;
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
  left.renderOrder = 15;
  right.renderOrder = 15;
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

function createChannelStripGeometry(
  terrain,
  minLateral,
  maxLateral,
  longitudinalStep,
  lateralSegments,
  getVertexHeight,
  getRowHeight = getWaterRowHeight,
  includeWaterDepth = false,
) {
  const longitudinalSegments = Math.ceil(channelLength / longitudinalStep);
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
    const center = channelCurve.getPointAt(t);
    const tangent = channelCurve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const distance = t * channelLength;
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

      uvs[uvOffset] = (t * channelLength) / 8;
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

  return THREE.MathUtils.lerp(profile.heights[lowerIndex], profile.heights[upperIndex], t);
}

function createRiverWaterMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uShallowColor: { value: new THREE.Color(0xbdeeff) },
      uDeepColor: { value: new THREE.Color(0x167fa6) },
      uFoamColor: { value: new THREE.Color(0xf1fbff) },
      uReflectionColor: { value: new THREE.Color(0xb8e8ff) },
      uSunDirection: { value: new THREE.Vector3(0.35, 0.9, 0.25).normalize() },
      uCameraPosition: { value: new THREE.Vector3() },
    },
    vertexShader: `
      uniform float uTime;

      attribute float waterDepth;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vWaterDepth;

      void main() {
        vUv = uv;
        vWaterDepth = waterDepth;

        vec3 transformed = position;

        vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uShallowColor;
      uniform vec3 uDeepColor;
      uniform vec3 uFoamColor;
      uniform vec3 uReflectionColor;
      uniform vec3 uSunDirection;
      uniform vec3 uCameraPosition;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vWaterDepth;

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
          p = p * 2.03 + vec2(11.7, 4.8);
          amplitude *= 0.5;
        }

        return value;
      }

      vec3 getWaterNormal(vec2 flowUv, vec2 worldUv, float strength) {
        float broad = fbm(worldUv * 0.55 + vec2(-uTime * 0.035, uTime * 0.015));
        float rippleA = fbm(flowUv * vec2(1.25, 1.8) + vec2(-uTime * 0.22, 0.07));
        float rippleB = fbm((flowUv.yx + worldUv * 0.16) * vec2(1.75, 0.95) + vec2(uTime * 0.12, -uTime * 0.1));

        vec2 slope = vec2(
          (broad - 0.5) * 0.035 + (rippleA - 0.5) * 0.075,
          (rippleB - 0.5) * 0.08
        ) * strength;

        return normalize(vec3(slope.x, 1.0, slope.y));
      }

      float getCaustics(vec2 worldUv) {
        vec2 driftA = worldUv * 0.72 + vec2(uTime * 0.12, -uTime * 0.045);
        vec2 driftB = worldUv * 0.96 + vec2(-uTime * 0.08, uTime * 0.07);
        float nA = fbm(driftA);
        float nB = fbm(driftB + vec2(nA * 0.8, -nA * 0.45));
        float ridges = 1.0 - abs(nA - nB) * 6.0;
        float broken = fbm(worldUv * 0.22 + vec2(6.4, -3.1));

        return smoothstep(0.72, 0.96, ridges) * smoothstep(0.35, 0.82, broken);
      }

      void main() {
        float edge = min(vUv.y, 1.0 - vUv.y);
        float centerMask = smoothstep(0.04, 0.46, edge);
        float depthMask = smoothstep(0.15, 1.6, vWaterDepth);
        float deepMask = centerMask * depthMask;
        float edgeBreakup = fbm(vWorldPosition.xz * 0.52 + vec2(uTime * 0.025, -uTime * 0.01));
        float edgeAlpha = smoothstep(0.018, 0.18, edge + (edgeBreakup - 0.5) * 0.035);
        float depthAlpha = mix(0.58, 1.0, depthMask);
        float alpha = mix(0.015, 0.28, edgeAlpha * depthAlpha);

        vec3 waterColor = mix(uShallowColor, uDeepColor, deepMask);
        float bottomVisibility = mix(0.98, 0.54, depthMask);
        vec2 bedUv = vWorldPosition.xz;

        float flowSpeed = mix(0.18, 0.42, deepMask);
        vec2 waveUv = vec2(vUv.x * 0.52, vUv.y * 2.4);
        waveUv.x -= uTime * flowSpeed;
        vec3 normal = getWaterNormal(waveUv, vWorldPosition.xz * 0.2, mix(0.45, 0.82, deepMask));

        float caustics = getCaustics(bedUv);
        float shallowDetail = 1.0 - smoothstep(0.65, 1.8, vWaterDepth);
        float causticMask = bottomVisibility * edgeAlpha * shallowDetail;
        waterColor += vec3(0.74, 0.96, 1.0) * caustics * causticMask * 0.18;

        vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);
        waterColor = mix(waterColor, uReflectionColor, 0.1 + fresnel * 0.3);
        alpha = max(alpha, fresnel * 0.18);

        vec3 lightDir = normalize(uSunDirection);
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 86.0);
        float sparkle = smoothstep(0.58, 0.92, fbm(vWorldPosition.xz * 0.75 + vec2(-uTime * 0.38, uTime * 0.05)));
        waterColor += vec3(0.92, 0.98, 1.0) * spec * sparkle * 0.28;

        float foamBase = 1.0 - smoothstep(0.006, 0.055, edge);
        foamBase *= 1.0 - smoothstep(0.65, 1.45, vWaterDepth);
        vec2 bigFoamUv = vec2(vUv.x * 6.5 - uTime * 0.16, vUv.y * 32.0);
        vec2 smallFoamUv = vec2(vUv.x * 18.0 - uTime * 0.34, vUv.y * 92.0);
        float bigFoam = smoothstep(0.62, 0.88, fbm(bigFoamUv));
        float smallFoam = smoothstep(0.72, 0.93, fbm(smallFoamUv));
        float foam = foamBase * max(bigFoam * 0.45, smallFoam * 0.28) * 0.2;

        waterColor = mix(waterColor, uFoamColor, foam * 0.22);
        alpha = max(alpha, foam * 0.16);

        gl_FragColor = vec4(waterColor, alpha);
      }
    `,
  });
}

function createWetBankMaterial(riverBankTexture) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uRiverBankTexture: { value: riverBankTexture },
      uTextureWorldSize: { value: RIVER_BANK_TEXTURE_WORLD_SIZE },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform sampler2D uRiverBankTexture;
      uniform float uTextureWorldSize;

      varying vec2 vUv;
      varying vec3 vWorldPosition;

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

      void main() {
        vec3 bankColor = texture2D(uRiverBankTexture, vWorldPosition.xz / uTextureWorldSize).rgb;
        float outerFade = smoothstep(0.04, 0.28, vUv.y);
        float underwaterFade = mix(1.0, 0.18, smoothstep(0.82, 1.0, vUv.y));
        float brokenEdge = mix(0.72, 1.0, smoothstep(0.18, 0.78, noise(vWorldPosition.xz * 1.7)));
        float alpha = outerFade * underwaterFade * brokenEdge * 0.26;

        gl_FragColor = vec4(bankColor, alpha);
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

function getEndMask(distance) {
  return smoothstep(0, END_TAPER_LENGTH, distance)
    * (1 - smoothstep(channelLength - END_TAPER_LENGTH, channelLength, distance));
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}
