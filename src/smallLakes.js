import * as THREE from 'three';

const LAKES = [
  { cx: 755, cz: -657, radius: 18, maxDepth: 2.8, waterDrop: 2.0, shapeAmp: 0.30 },
  { cx: 735, cz: -640, radius: 15, maxDepth: 2.2, waterDrop: 1.5, shapeAmp: 0.20 },
  { cx: 778, cz: -668, radius: 14, maxDepth: 2.5, waterDrop: 1.8, shapeAmp: 0.18 },
  { cx: 742, cz: -678, radius: 20, maxDepth: 3.0, waterDrop: 2.2, shapeAmp: 0.38 },
];

const SHORE_WIDTH = 8;
const VEG_BUFFER = 6;
const ANGLE_SEGMENTS = 64;
const RADIAL_RINGS = 12;

export function applySmallLakesTerrain(baseHeight, x, z) {
  let height = baseHeight;

  for (let i = 0; i < LAKES.length; i += 1) {
    const lake = LAKES[i];
    const dx = x - lake.cx;
    const dz = z - lake.cz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);
    const actualRadius = lakeRadiusAt(angle, lake);

    if (dist > actualRadius + SHORE_WIDTH) continue;

    const basinShape = 1 - smoothstep(0, actualRadius, dist);
    const bankShape = 1 - smoothstep(actualRadius, actualRadius + SHORE_WIDTH, dist);
    const carveDepth = lake.maxDepth * Math.max(basinShape, bankShape * 0.15);
    const lakeBase = baseHeight - carveDepth;

    height = Math.min(height, lakeBase);
  }

  return height;
}

export function isInSmallLakeExclusion(x, z) {
  for (let i = 0; i < LAKES.length; i += 1) {
    const lake = LAKES[i];
    const dx = x - lake.cx;
    const dz = z - lake.cz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);
    const actualRadius = lakeRadiusAt(angle, lake);

    if (dist < actualRadius + SHORE_WIDTH + VEG_BUFFER) return true;
  }

  return false;
}

export function createSmallLakes(terrain) {
  const group = new THREE.Group();
  group.name = 'SmallLakes';
  group.renderOrder = 25;

  for (let i = 0; i < LAKES.length; i += 1) {
    const lake = LAKES[i];
    const terrainHeight = terrain.getHeightAt(lake.cx, lake.cz);
    const waterLevel = terrainHeight - lake.waterDrop;
    const lr = lakeRadiusAt;

    const geometry = createLakeGeometry(lake, waterLevel, lr);
    const material = createLakeMaterial();
    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = `SmallLake_${i}`;

    group.add(mesh);
  }

  return group;
}

export function updateSmallLakes(group, camera, elapsedTime) {
  for (let i = 0; i < group.children.length; i += 1) {
    const child = group.children[i];

    if (child.material && child.material.uniforms) {
      child.material.uniforms.uTime.value = elapsedTime;
      child.material.uniforms.uCameraPosition.value.copy(camera.position);
    }
  }
}

function lakeRadiusAt(angle, lake) {
  return lake.radius * (1 + lake.shapeAmp * (
    Math.sin(angle * 3.0 + 0.7) * 0.5
    + Math.sin(angle * 5.0 - 1.1) * 0.3
    + Math.sin(angle * 7.0 + 2.2) * 0.2
  ));
}

function createLakeGeometry(lake, waterLevel, lr) {
  const vertices = [];
  const uvs = [];
  const depths = [];
  const edges = [];

  vertices.push(0, waterLevel, 0);
  uvs.push(0.5, 0.5);
  depths.push(lake.maxDepth);
  edges.push(0);

  for (let ring = 1; ring <= RADIAL_RINGS; ring += 1) {
    const t = ring / RADIAL_RINGS;

    for (let a = 0; a < ANGLE_SEGMENTS; a += 1) {
      const angle = (a / ANGLE_SEGMENTS) * Math.PI * 2;
      const r = t * (lake.radius * 1.05) * lr(angle, lake) / lake.radius;
      const x = lake.cx + Math.cos(angle) * r;
      const z = lake.cz + Math.sin(angle) * r;

      vertices.push(x, waterLevel, z);
      uvs.push(0.5 + Math.cos(angle) * t * 0.5, 0.5 + Math.sin(angle) * t * 0.5);

      depths.push(Math.max(waterLevel - 4, 0));
      edges.push(t);
    }
  }

  const geometry = new THREE.BufferGeometry();
  const vertexCount = 1 + RADIAL_RINGS * ANGLE_SEGMENTS;
  const positions = new Float32Array(vertexCount * 3);
  const uvArray = new Float32Array(vertexCount * 2);
  const depthArray = new Float32Array(vertexCount);
  const edgeArray = new Float32Array(vertexCount);

  for (let i = 0; i < vertexCount; i += 1) {
    positions[i * 3] = vertices[i * 3];
    positions[i * 3 + 1] = vertices[i * 3 + 1];
    positions[i * 3 + 2] = vertices[i * 3 + 2];
    uvArray[i * 2] = uvs[i * 2];
    uvArray[i * 2 + 1] = uvs[i * 2 + 1];
    depthArray[i] = depths[i];
    edgeArray[i] = edges[i];
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
  geometry.setAttribute('lakeDepth', new THREE.BufferAttribute(depthArray, 1));
  geometry.setAttribute('lakeEdge', new THREE.BufferAttribute(edgeArray, 1));

  const indices = [];
  for (let ring = 0; ring < RADIAL_RINGS; ring += 1) {
    for (let a = 0; a < ANGLE_SEGMENTS; a += 1) {
      const curr = 1 + ring * ANGLE_SEGMENTS + a;
      const next = 1 + ring * ANGLE_SEGMENTS + (a + 1) % ANGLE_SEGMENTS;
      const currInner = ring === 0 ? 0 : 1 + (ring - 1) * ANGLE_SEGMENTS + a;
      const nextInner = ring === 0 ? 0 : 1 + (ring - 1) * ANGLE_SEGMENTS + (a + 1) % ANGLE_SEGMENTS;

      if (ring === 0) {
        indices.push(0, next, curr);
      } else {
        indices.push(currInner, curr, nextInner);
        indices.push(nextInner, curr, next);
      }
    }
  }

  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

function createLakeMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uShallowColor: { value: new THREE.Color(0x66c7b7) },
      uDeepColor: { value: new THREE.Color(0x0d5b77) },
      uFoamColor: { value: new THREE.Color(0xf1fbff) },
      uReflectionColor: { value: new THREE.Color(0x8ed8ff) },
      uHorizonReflectionColor: { value: new THREE.Color(0xd7f3ff) },
      uSunReflectionColor: { value: new THREE.Color(0xfff1bd) },
      uSunDirection: { value: new THREE.Vector3(0.35, 0.9, 0.25).normalize() },
      uCameraPosition: { value: new THREE.Vector3() },
    },
    vertexShader: `
      attribute float lakeDepth;
      attribute float lakeEdge;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vLakeDepth;
      varying float vLakeEdge;

      void main() {
        vUv = uv;
        vLakeDepth = lakeDepth;
        vLakeEdge = lakeEdge;

        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
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
      uniform vec3 uHorizonReflectionColor;
      uniform vec3 uSunReflectionColor;
      uniform vec3 uSunDirection;
      uniform vec3 uCameraPosition;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vLakeDepth;
      varying float vLakeEdge;

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

      vec3 getWaterNormal(vec2 worldUv, float strength) {
        float broad = fbm(worldUv * 0.45 + vec2(uTime * 0.015, uTime * 0.008));
        float rippleA = fbm(worldUv * vec2(0.9, 1.2) + vec2(-uTime * 0.12, uTime * 0.06));
        float rippleB = fbm(worldUv.yx * vec2(1.1, 0.8) + vec2(uTime * 0.08, -uTime * 0.04));

        vec2 slope = vec2(
          (broad - 0.5) * 0.025 + (rippleA - 0.5) * 0.055,
          (rippleB - 0.5) * 0.06
        ) * strength;

        return normalize(vec3(slope.x, 1.0, slope.y));
      }

      float getCaustics(vec2 worldUv) {
        vec2 driftA = worldUv * 0.72 + vec2(uTime * 0.06, -uTime * 0.03);
        vec2 driftB = worldUv * 0.96 + vec2(-uTime * 0.04, uTime * 0.05);
        float nA = fbm(driftA);
        float nB = fbm(driftB + vec2(nA * 0.8, -nA * 0.45));
        float ridges = 1.0 - abs(nA - nB) * 6.0;
        float broken = fbm(worldUv * 0.22 + vec2(6.4, -3.1));

        return smoothstep(0.72, 0.96, ridges) * smoothstep(0.35, 0.82, broken);
      }

      void main() {
        float edge = vLakeEdge;
        float centerMask = smoothstep(0.02, 0.46, edge);
        float depthMask = smoothstep(0.15, 1.6, vLakeDepth);
        float deepMask = centerMask * depthMask;

        float edgeBreakup = fbm(vWorldPosition.xz * 0.52 + vec2(uTime * 0.02, -uTime * 0.008));
        float edgeAlpha = smoothstep(0.02, 0.20, edge + (edgeBreakup - 0.5) * 0.035);
        float depthAlpha = mix(0.58, 1.0, depthMask);
        float alpha = edgeAlpha * depthAlpha * 0.35;

        vec3 waterColor = mix(uShallowColor, uDeepColor, deepMask);
        float bottomVisibility = mix(0.98, 0.54, depthMask);

        vec3 normal = getWaterNormal(vWorldPosition.xz * 0.2, mix(0.55, 0.9, deepMask));

        float caustics = getCaustics(vWorldPosition.xz);
        float shallowDetail = 1.0 - smoothstep(0.65, 1.8, vLakeDepth);
        float causticMask = bottomVisibility * edgeAlpha * shallowDetail;
        waterColor += vec3(0.74, 0.96, 1.0) * caustics * causticMask * 0.16;

        vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);
        float glancingReflection = smoothstep(0.08, 0.82, fresnel);
        vec3 skyReflection = mix(uHorizonReflectionColor, uReflectionColor, smoothstep(0.18, 0.92, normal.y));
        waterColor = mix(waterColor, skyReflection, 0.15 + glancingReflection * 0.35);
        alpha = max(alpha, glancingReflection * 0.25);

        vec3 lightDir = normalize(uSunDirection);
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 118.0);
        float broadSpec = pow(max(dot(normal, halfDir), 0.0), 32.0);
        float sparkle = smoothstep(0.5, 0.9, fbm(vWorldPosition.xz * 0.95 + vec2(-uTime * 0.3, uTime * 0.05)));
        waterColor += uSunReflectionColor * (spec * sparkle * 0.6 + broadSpec * glancingReflection * 0.08);

        float foamBase = 1.0 - smoothstep(0.008, 0.06, edge);
        foamBase *= 1.0 - smoothstep(0.65, 1.45, vLakeDepth);
        vec2 bigFoamUv = vWorldPosition.xz * 0.3 + vec2(-uTime * 0.08, uTime * 0.04);
        vec2 smallFoamUv = vWorldPosition.xz * 1.2 + vec2(-uTime * 0.16, uTime * 0.1);
        float bigFoam = smoothstep(0.62, 0.88, fbm(bigFoamUv));
        float smallFoam = smoothstep(0.72, 0.93, fbm(smallFoamUv));
        float foam = foamBase * max(bigFoam * 0.45, smallFoam * 0.28) * 0.2;
        waterColor = mix(waterColor, uFoamColor, foam * 0.18);
        alpha = max(alpha, foam * 0.12);

        gl_FragColor = vec4(waterColor, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}
