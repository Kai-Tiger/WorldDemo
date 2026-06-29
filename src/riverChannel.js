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
const WATER_HEIGHT_OFFSET = 0.25;
const WATER_LONGITUDINAL_STEP = 0.6;
const WATER_LATERAL_SEGMENTS = 8;
const WET_BANK_WIDTH = 0.85;
const WET_BANK_HEIGHT_OFFSET = 0.08;
const END_TAPER_LENGTH = 10;

const HALF_CHANNEL_WIDTH = CHANNEL_WIDTH * 0.5;
const HALF_WATER_WIDTH = WATER_WIDTH * 0.5;
const channelCurve = new THREE.CatmullRomCurve3(CHANNEL_POINTS, false, 'centripetal');
const channelSamples = createChannelSamples();
const channelLength = channelSamples[channelSamples.length - 1].distance;
const channelBounds = createChannelBounds();

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

export function createRiverWaterMesh(terrain) {
  const geometry = createChannelStripGeometry(
    terrain,
    -HALF_WATER_WIDTH,
    HALF_WATER_WIDTH,
    WATER_LONGITUDINAL_STEP,
    WATER_LATERAL_SEGMENTS,
    WATER_HEIGHT_OFFSET,
  );
  const mesh = new THREE.Mesh(geometry, createRiverWaterMaterial());

  mesh.name = 'RiverWater';
  mesh.renderOrder = 20;

  return mesh;
}

export function createWetBankMesh(terrain) {
  const group = new THREE.Group();
  const material = createWetBankMaterial();
  const left = new THREE.Mesh(
    createChannelStripGeometry(
      terrain,
      -HALF_WATER_WIDTH - WET_BANK_WIDTH,
      -HALF_WATER_WIDTH,
      WATER_LONGITUDINAL_STEP,
      2,
      WET_BANK_HEIGHT_OFFSET,
    ),
    material,
  );
  const right = new THREE.Mesh(
    createChannelStripGeometry(
      terrain,
      HALF_WATER_WIDTH + WET_BANK_WIDTH,
      HALF_WATER_WIDTH,
      WATER_LONGITUDINAL_STEP,
      2,
      WET_BANK_HEIGHT_OFFSET,
    ),
    material,
  );

  left.name = 'RiverWetBankLeft';
  right.name = 'RiverWetBankRight';
  group.name = 'RiverWetBanks';
  group.renderOrder = 15;
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

function createChannelStripGeometry(
  terrain,
  minLateral,
  maxLateral,
  longitudinalStep,
  lateralSegments,
  heightOffset,
) {
  const longitudinalSegments = Math.ceil(channelLength / longitudinalStep);
  const verticesPerRow = lateralSegments + 1;
  const vertexCount = (longitudinalSegments + 1) * verticesPerRow;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = new Uint32Array(longitudinalSegments * lateralSegments * 6);

  let positionOffset = 0;
  let uvOffset = 0;

  for (let i = 0; i <= longitudinalSegments; i += 1) {
    const t = i / longitudinalSegments;
    const center = channelCurve.getPointAt(t);
    const tangent = channelCurve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    for (let j = 0; j <= lateralSegments; j += 1) {
      const lateralT = j / lateralSegments;
      const lateral = THREE.MathUtils.lerp(minLateral, maxLateral, lateralT);
      const x = center.x + side.x * lateral;
      const z = center.z + side.z * lateral;
      const y = terrain.getHeightAt(x, z) + heightOffset;

      positions[positionOffset] = x;
      positions[positionOffset + 1] = y;
      positions[positionOffset + 2] = z;
      positionOffset += 3;

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
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

function createRiverWaterMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uShallowColor: { value: new THREE.Color(0x5f9f86) },
      uDeepColor: { value: new THREE.Color(0x07343e) },
      uFoamColor: { value: new THREE.Color(0xf1fbff) },
      uReflectionColor: { value: new THREE.Color(0x9bc9ee) },
      uSunDirection: { value: new THREE.Vector3(0.35, 0.9, 0.25).normalize() },
      uCameraPosition: { value: new THREE.Vector3() },
    },
    vertexShader: `
      uniform float uTime;

      varying vec2 vUv;
      varying vec3 vWorldPosition;

      void main() {
        vUv = uv;

        float center = 1.0 - abs(uv.y - 0.5) * 2.0;
        vec3 transformed = position;
        transformed.y += (
          sin(uv.x * 4.8 - uTime * 1.4)
          + sin(uv.x * 9.2 + uv.y * 7.0 - uTime * 2.1) * 0.45
        ) * 0.035 * center;

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

      vec3 getWaterNormal(vec2 uv, float center) {
        float w1 = sin(uv.x * 24.0 - uTime * 2.0);
        float w2 = sin(uv.x * 13.0 + uv.y * 18.0 - uTime * 1.3);
        float w3 = sin(uv.x * 42.0 - uv.y * 12.0 - uTime * 2.8);

        return normalize(vec3(
          (w1 + w2 * 0.5) * 0.075 * center,
          1.0,
          w3 * 0.08 * center
        ));
      }

      void main() {
        float edge = min(vUv.y, 1.0 - vUv.y);
        float center = 1.0 - abs(vUv.y - 0.5) * 2.0;
        float edgeAlpha = smoothstep(0.012, 0.18, edge);
        float alpha = mix(0.08, 0.76, edgeAlpha);

        vec3 riverBedColor = vec3(0.34, 0.29, 0.20);
        vec3 waterColor = mix(uShallowColor, uDeepColor, center);
        float shallowMask = 1.0 - smoothstep(0.08, 0.32, edge);
        waterColor = mix(waterColor, riverBedColor, shallowMask * 0.23);

        float flowSpeed = mix(0.15, 0.5, center);
        vec2 waveUv = vUv * vec2(5.0, 2.0);
        waveUv.x -= uTime * flowSpeed;
        vec3 normal = getWaterNormal(waveUv, center);

        vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);
        waterColor = mix(waterColor, uReflectionColor, fresnel * 0.38);

        vec3 lightDir = normalize(uSunDirection);
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 82.0);
        float sparkle = smoothstep(0.62, 1.0, noise(vUv * vec2(78.0, 18.0) + vec2(-uTime * 1.25, uTime * 0.08)));
        waterColor += vec3(1.0, 0.95, 0.78) * spec * (0.36 + sparkle * 0.25);

        float foamBase = 1.0 - smoothstep(0.018, 0.13, edge);
        vec2 bigFoamUv = vUv * vec2(8.0, 28.0);
        bigFoamUv.x -= uTime * 0.18;
        vec2 smallFoamUv = vUv * vec2(32.0, 85.0);
        smallFoamUv.x -= uTime * 0.48;
        float bigFoam = smoothstep(0.45, 0.82, noise(bigFoamUv));
        float smallFoam = smoothstep(0.55, 0.9, noise(smallFoamUv));
        float foam = foamBase * max(bigFoam * 0.72, smallFoam * 0.45);

        waterColor = mix(waterColor, uFoamColor, foam * 0.74);
        alpha = max(alpha, foam * 0.62);

        gl_FragColor = vec4(waterColor, alpha);
      }
    `,
  });
}

function createWetBankMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uWetColor: { value: new THREE.Color(0x252217) },
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
      uniform vec3 uWetColor;

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
        float innerFade = smoothstep(0.0, 1.0, vUv.y);
        float brokenEdge = smoothstep(0.22, 0.82, noise(vWorldPosition.xz * 2.3 + vec2(uTime * 0.03, 0.0)));
        float alpha = innerFade * brokenEdge * 0.22;

        gl_FragColor = vec4(uWetColor, alpha);
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
