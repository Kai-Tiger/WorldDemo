import * as THREE from 'three';
import { Water as Water2 } from 'three/addons/objects/Water2.js';

export const LAKE_CENTER = new THREE.Vector2(300, -400);
export const LAKE_WATER_LEVEL = 31;
const LAKE_BASE_RADIUS = 47;
const LAKE_SHORE_WIDTH = 9;
const LAKE_BASIN_FLOOR = 24.5;
const LAKE_SHAPE_SEGMENTS = 96;
const LAKE_MESH_SEGMENTS = 22;
const LAKE_NORMAL_SIZE = 256;
const WATER_SYSTEM_MIN_X = 205;
const WATER_SYSTEM_MAX_X = 435;
const WATER_SYSTEM_MIN_Z = -490;
const WATER_SYSTEM_MAX_Z = -355;

const OUTLET_POINTS = [
  new THREE.Vector3(340, 0, -410),
  new THREE.Vector3(365, 0, -417),
  new THREE.Vector3(392, 0, -419),
  new THREE.Vector3(409, 0, -421),
];
const OUTLET_WIDTH = 5.2;
const OUTLET_INFLUENCE = 8.5;
const OUTLET_WATER_OFFSET = 0.35;

const WATERFALL_LIP = new THREE.Vector3(409, LAKE_WATER_LEVEL - 0.6, -421);
const WATERFALL_BASE = new THREE.Vector3(418, 1.5, -424);
const WATERFALL_WIDTH = 7.5;
const WATERFALL_LAYERS = [
  { name: 'WaterfallMainVeil', xOffset: 0, zOffset: 0, width: 0.72, alpha: 0.105, speed: 1.15 },
  { name: 'WaterfallLeftThreads', xOffset: -1.7, zOffset: -0.45, width: 0.3, alpha: 0.052, speed: 1.35 },
  { name: 'WaterfallRightThreads', xOffset: 1.7, zOffset: 0.3, width: 0.32, alpha: 0.056, speed: 1.28 },
  { name: 'WaterfallMistVeil', xOffset: 0.3, zOffset: 0.8, width: 0.82, alpha: 0.024, speed: 0.72 },
];

const PLUNGE_CENTER = new THREE.Vector2(418, -424);
const PLUNGE_RADIUS = 10;
const PLUNGE_FLOOR = -2.2;

const SNOWMELT_PATHS = [
  [
    new THREE.Vector3(250, 0, -472),
    new THREE.Vector3(262, 0, -452),
    new THREE.Vector3(278, 0, -431),
    new THREE.Vector3(294, 0, -411),
  ],
  [
    new THREE.Vector3(314, 0, -474),
    new THREE.Vector3(309, 0, -450),
    new THREE.Vector3(304, 0, -426),
    new THREE.Vector3(299, 0, -406),
  ],
  [
    new THREE.Vector3(224, 0, -430),
    new THREE.Vector3(242, 0, -421),
    new THREE.Vector3(266, 0, -412),
    new THREE.Vector3(292, 0, -402),
  ],
];
const SNOWMELT_WIDTH = 1.25;
const SNOWMELT_INFLUENCE = 5.2;
const SNOWMELT_SURFACE_OFFSET = 0.38;

const outletCurve = new THREE.CatmullRomCurve3(OUTLET_POINTS, false, 'centripetal');
const outletSamples = createPathSamples(outletCurve, 100);
const snowmeltCurves = SNOWMELT_PATHS.map((points) => new THREE.CatmullRomCurve3(points, false, 'centripetal'));
const snowmeltSamples = snowmeltCurves.map((curve) => createPathSamples(curve, 90));

export function applyWaterSystemTerrain(baseHeight, x, z) {
  if (!isNearWaterSystem(x, z)) return baseHeight;

  let height = applyLakeBasin(baseHeight, x, z);
  height = applyOutletChannel(height, x, z);
  height = applySnowmeltChannels(height, x, z);
  height = applyPlungePool(height, x, z);

  return height;
}

export function getWaterSystemMaterialFrame(baseHeight, x, z) {
  if (!isNearWaterSystem(x, z)) return createEmptyWaterSystemMaterialFrame();

  const lake = getLakeFrame(x, z);
  const outlet = getPathFrame(outletSamples, x, z);
  const snowmelt = getClosestSnowmeltFrame(x, z);
  const plungeDistance = new THREE.Vector2(x, z).distanceTo(PLUNGE_CENTER);
  const lakeBedMask = lake.inside * smoothstep(LAKE_BASE_RADIUS * 0.95, LAKE_BASE_RADIUS * 0.25, lake.radius);
  const lakeShoreMask = (1 - lake.inside) * (1 - smoothstep(LAKE_BASE_RADIUS, LAKE_BASE_RADIUS + LAKE_SHORE_WIDTH, lake.radius));
  const outletMask = outlet ? 1 - smoothstep(OUTLET_WIDTH * 0.5, OUTLET_INFLUENCE, Math.abs(outlet.lateral)) : 0;
  const snowmeltMask = snowmelt ? 1 - smoothstep(SNOWMELT_WIDTH * 0.4, SNOWMELT_INFLUENCE, Math.abs(snowmelt.lateral)) : 0;
  const plungeMask = 1 - smoothstep(PLUNGE_RADIUS * 0.45, PLUNGE_RADIUS, plungeDistance);
  const wetShoreMask = Math.max(lakeShoreMask, outletMask * 0.65, snowmeltMask * 0.8, plungeMask * 0.8);

  return {
    lakeBedMask: THREE.MathUtils.clamp(lakeBedMask, 0, 1),
    wetShoreMask: THREE.MathUtils.clamp(wetShoreMask, 0, 1),
    snowmeltWetMask: THREE.MathUtils.clamp(snowmeltMask, 0, 1),
    outletMask: THREE.MathUtils.clamp(outletMask, 0, 1),
    plungeMask: THREE.MathUtils.clamp(plungeMask, 0, 1),
    lakeDistance: lake.radius,
  };
}

function createEmptyWaterSystemMaterialFrame() {
  return {
    lakeBedMask: 0,
    wetShoreMask: 0,
    snowmeltWetMask: 0,
    outletMask: 0,
    plungeMask: 0,
    lakeDistance: 0,
  };
}

export function createWaterSystem(terrain) {
  const lake = createLakeWater();
  const outletStream = createOutletStream(terrain);
  const snowmelt = createSnowmeltGroup(terrain);
  const waterfall = createWaterfallGroup();
  const confluence = createConfluenceFoam();
  const group = new THREE.Group();

  group.name = 'WaterSystem';
  group.add(lake, outletStream, snowmelt, waterfall, confluence);

  return {
    group,
    lake,
    outletStream,
    snowmelt,
    waterfall,
    confluence,
  };
}

export function updateWaterSystemVisuals(system, camera, elapsedTime) {
  if (!system) return;

  updateShaderGroup(system.group, camera, elapsedTime);
}

function applyLakeBasin(baseHeight, x, z) {
  const frame = getLakeFrame(x, z);
  const shoreOuter = LAKE_BASE_RADIUS + LAKE_SHORE_WIDTH;

  if (frame.radius > shoreOuter) return baseHeight;

  const basinMask = 1 - smoothstep(LAKE_BASE_RADIUS * 0.2, shoreOuter, frame.radius);
  const shoreShelf = THREE.MathUtils.lerp(LAKE_WATER_LEVEL - 1.2, LAKE_BASIN_FLOOR, basinMask);
  const target = frame.radius < LAKE_BASE_RADIUS
    ? shoreShelf
    : THREE.MathUtils.lerp(baseHeight, LAKE_WATER_LEVEL - 0.25, 1 - smoothstep(LAKE_BASE_RADIUS, shoreOuter, frame.radius));

  return Math.min(baseHeight, THREE.MathUtils.lerp(baseHeight, target, basinMask));
}

function applyOutletChannel(height, x, z) {
  const frame = getPathFrame(outletSamples, x, z);

  if (!frame) return height;

  const lateralDistance = Math.abs(frame.lateral);
  if (lateralDistance > OUTLET_INFLUENCE) return height;

  const bedMask = 1 - smoothstep(0, OUTLET_WIDTH * 0.5, lateralDistance);
  const bankMask = 1 - smoothstep(OUTLET_WIDTH * 0.5, OUTLET_INFLUENCE, lateralDistance);
  const flowT = frame.distance / outletSamples[outletSamples.length - 1].distance;
  const target = THREE.MathUtils.lerp(LAKE_WATER_LEVEL - 1.7, 4.0, flowT);
  const carveMask = Math.max(bedMask, bankMask * 0.45);

  return Math.min(height, THREE.MathUtils.lerp(height, target, carveMask));
}

function applySnowmeltChannels(height, x, z) {
  let nextHeight = height;

  for (const samples of snowmeltSamples) {
    const frame = getPathFrame(samples, x, z);

    if (!frame) continue;

    const lateralDistance = Math.abs(frame.lateral);
    if (lateralDistance > SNOWMELT_INFLUENCE) continue;

    const groove = 1 - smoothstep(0, SNOWMELT_WIDTH * 0.6, lateralDistance);
    nextHeight -= groove * 0.35;
  }

  return nextHeight;
}

function applyPlungePool(height, x, z) {
  const distance = new THREE.Vector2(x, z).distanceTo(PLUNGE_CENTER);

  if (distance > PLUNGE_RADIUS) return height;

  const poolMask = 1 - smoothstep(PLUNGE_RADIUS * 0.25, PLUNGE_RADIUS, distance);

  return Math.min(height, THREE.MathUtils.lerp(height, PLUNGE_FLOOR, poolMask));
}

function createLakeWater() {
  const geometry = createLakeGeometry();
  const reflectionGeometry = geometry.clone();
  const lake = new THREE.Group();
  const reflector = new Water2(reflectionGeometry, {
    color: 0x6abfd0,
    scale: 5.5,
    flowSpeed: 0.018,
    reflectivity: 0.16,
    textureWidth: 512,
    textureHeight: 512,
    normalMap0: createWaterNormalTexture(0),
    normalMap1: createWaterNormalTexture(17),
  });
  const surface = new THREE.Mesh(geometry, createLakeSurfaceMaterial());

  lake.name = 'AlpineLakeWater';
  reflector.name = 'AlpineLakeReflector';
  reflector.renderOrder = 18;
  reflector.material.depthWrite = false;
  reflector.material.transparent = true;
  reflector.material.side = THREE.DoubleSide;
  surface.name = 'AlpineLakeSurface';
  surface.renderOrder = 19;
  lake.add(reflector, surface);

  return lake;
}

function createLakeGeometry() {
  const shape = new THREE.Shape();
  const points = createLakeOutline();

  shape.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    shape.lineTo(points[i].x, points[i].y);
  }
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(Math.PI * 0.5);
  geometry.translate(0, LAKE_WATER_LEVEL, 0);
  geometry.computeVertexNormals();

  return geometry;
}

function createOutletStream(terrain) {
  const geometry = createPathStripGeometry(
    outletCurve,
    terrain,
    OUTLET_WIDTH,
    90,
    10,
    (_x, _z, t) => THREE.MathUtils.lerp(LAKE_WATER_LEVEL - 0.35, 3.2, t) + OUTLET_WATER_OFFSET,
  );
  const stream = new THREE.Mesh(geometry, createStreamMaterial({
    shallow: 0x8ee9df,
    deep: 0x186a83,
    foam: 0xf5fcff,
    speed: 0.9,
    alpha: 0.62,
  }));

  stream.name = 'LakeOutletStream';
  stream.renderOrder = 21;

  return stream;
}

function createSnowmeltGroup(terrain) {
  const group = new THREE.Group();
  group.name = 'SnowmeltSystem';

  for (let i = 0; i < snowmeltCurves.length; i += 1) {
    const geometry = createPathStripGeometry(
      snowmeltCurves[i],
      terrain,
      SNOWMELT_WIDTH,
      72,
      5,
      (x, z) => terrain.getHeightAt(x, z) + SNOWMELT_SURFACE_OFFSET,
    );
    const mesh = new THREE.Mesh(geometry, createSnowmeltMaterial());

    mesh.name = `SnowmeltRunoff_${i + 1}`;
    mesh.renderOrder = 22;
    group.add(mesh);
  }

  group.add(createInflowRipples());

  return group;
}

function createWaterfallGroup() {
  const group = new THREE.Group();
  group.name = 'WaterfallSystem';

  for (const layer of WATERFALL_LAYERS) {
    const mesh = new THREE.Mesh(createWaterfallGeometry(layer), createWaterfallMaterial(layer));
    mesh.name = layer.name;
    mesh.renderOrder = 30;
    group.add(mesh);
  }

  group.add(createMistParticles());

  return group;
}

function createConfluenceFoam() {
  const shape = new THREE.Shape();
  const length = 24;
  const width = 9;
  const segments = 48;

  for (let i = 0; i < segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    const forward = Math.cos(a) * length * 0.5;
    const side = Math.sin(a) * width * 0.5;
    const x = PLUNGE_CENTER.x + forward * 0.7 + side * 0.25;
    const z = PLUNGE_CENTER.y + forward * 0.2 + side * 0.95;

    if (i === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  }
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(Math.PI * 0.5);
  geometry.translate(0, 1.0, 0);

  const mesh = new THREE.Mesh(geometry, createFoamOverlayMaterial());
  mesh.name = 'WaterfallConfluenceFoam';
  mesh.renderOrder = 31;

  return mesh;
}

function createPathStripGeometry(curve, terrain, width, longitudinalSegments, lateralSegments, getHeight) {
  const verticesPerRow = lateralSegments + 1;
  const positions = new Float32Array((longitudinalSegments + 1) * verticesPerRow * 3);
  const uvs = new Float32Array((longitudinalSegments + 1) * verticesPerRow * 2);
  const indices = new Uint32Array(longitudinalSegments * lateralSegments * 6);
  let positionOffset = 0;
  let uvOffset = 0;

  for (let i = 0; i <= longitudinalSegments; i += 1) {
    const t = i / longitudinalSegments;
    const center = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const edgeNoise = Math.sin(i * 1.71) * 0.18 + Math.sin(i * 0.39) * 0.24;

    for (let j = 0; j <= lateralSegments; j += 1) {
      const lateralT = j / lateralSegments;
      const lateral = (lateralT - 0.5) * (width + edgeNoise);
      const x = center.x + side.x * lateral;
      const z = center.z + side.z * lateral;
      const y = getHeight(x, z, t, terrain);

      positions[positionOffset] = x;
      positions[positionOffset + 1] = y;
      positions[positionOffset + 2] = z;
      positionOffset += 3;

      uvs[uvOffset] = t * 8;
      uvs[uvOffset + 1] = lateralT;
      uvOffset += 2;
    }
  }

  let indexOffset = 0;
  for (let i = 0; i < longitudinalSegments; i += 1) {
    for (let j = 0; j < lateralSegments; j += 1) {
      const a = i * verticesPerRow + j;
      const b = a + 1;
      const c = a + verticesPerRow;
      const d = c + 1;

      indices[indexOffset] = a;
      indices[indexOffset + 1] = c;
      indices[indexOffset + 2] = b;
      indices[indexOffset + 3] = b;
      indices[indexOffset + 4] = c;
      indices[indexOffset + 5] = d;
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

function createWaterfallGeometry(layer) {
  const verticalSegments = 28;
  const lateralSegments = 7;
  const verticesPerRow = lateralSegments + 1;
  const positions = new Float32Array((verticalSegments + 1) * verticesPerRow * 3);
  const uvs = new Float32Array((verticalSegments + 1) * verticesPerRow * 2);
  const indices = new Uint32Array(verticalSegments * lateralSegments * 6);
  const right = new THREE.Vector3(1, 0, 0);
  let positionOffset = 0;
  let uvOffset = 0;

  for (let i = 0; i <= verticalSegments; i += 1) {
    const t = i / verticalSegments;
    const eased = t * t * (3 - 2 * t);
    const center = new THREE.Vector3().lerpVectors(WATERFALL_LIP, WATERFALL_BASE, eased);
    center.x += Math.sin(t * Math.PI) * 2.8 + layer.xOffset;
    center.z += Math.sin(t * Math.PI * 0.7) * 1.4 + layer.zOffset;
    const width = WATERFALL_WIDTH * layer.width * THREE.MathUtils.lerp(0.62, 1.28, t);

    for (let j = 0; j <= lateralSegments; j += 1) {
      const lateralT = j / lateralSegments;
      const lateral = (lateralT - 0.5) * width;
      const breakup = Math.sin(i * 1.9 + j * 2.7) * 0.18 * t;
      const point = center.clone().addScaledVector(right, lateral + breakup);

      positions[positionOffset] = point.x;
      positions[positionOffset + 1] = point.y;
      positions[positionOffset + 2] = point.z;
      positionOffset += 3;

      uvs[uvOffset] = lateralT;
      uvs[uvOffset + 1] = t;
      uvOffset += 2;
    }
  }

  let indexOffset = 0;
  for (let i = 0; i < verticalSegments; i += 1) {
    for (let j = 0; j < lateralSegments; j += 1) {
      const a = i * verticesPerRow + j;
      const b = a + 1;
      const c = a + verticesPerRow;
      const d = c + 1;
      indices[indexOffset] = a;
      indices[indexOffset + 1] = c;
      indices[indexOffset + 2] = b;
      indices[indexOffset + 3] = b;
      indices[indexOffset + 4] = c;
      indices[indexOffset + 5] = d;
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

function createLakeSurfaceMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
    },
    vertexShader: `
      varying vec3 vWorldPosition;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uCameraPosition;

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

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i += 1) {
          value += noise(p) * amplitude;
          p = p * 2.0 + vec2(6.7, -4.1);
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 p = vWorldPosition.xz;
        vec2 flowA = p * 0.075 + vec2(uTime * 0.018, -uTime * 0.012);
        vec2 flowB = p * 0.14 + vec2(-uTime * 0.014, uTime * 0.02);
        float ripple = fbm(flowA) * 0.65 + fbm(flowB) * 0.35;
        vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - abs(dot(viewDir, vec3(0.0, 1.0, 0.0))), 2.4);
        float glint = smoothstep(0.78, 0.98, ripple) * (0.35 + fresnel * 0.65);
        vec3 shallow = vec3(0.34, 0.78, 0.82);
        vec3 deep = vec3(0.04, 0.29, 0.39);
        vec3 reflection = mix(vec3(0.44, 0.66, 0.72), vec3(0.88, 0.97, 1.0), fresnel);
        vec3 color = mix(deep, shallow, smoothstep(0.18, 0.82, ripple));
        color = mix(color, reflection, 0.28 + fresnel * 0.36);
        color += vec3(0.42, 0.8, 0.92) * glint * 0.18;
        float alpha = 0.5 + fresnel * 0.24 + glint * 0.08;

        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function createStreamMaterial(options) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
      uShallowColor: { value: new THREE.Color(options.shallow) },
      uDeepColor: { value: new THREE.Color(options.deep) },
      uFoamColor: { value: new THREE.Color(options.foam) },
      uFlowSpeed: { value: options.speed },
      uBaseAlpha: { value: options.alpha },
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
      uniform float uFlowSpeed;
      uniform float uBaseAlpha;
      uniform vec3 uShallowColor;
      uniform vec3 uDeepColor;
      uniform vec3 uFoamColor;
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

      void main() {
        float edge = min(vUv.y, 1.0 - vUv.y);
        float center = smoothstep(0.03, 0.45, edge);
        vec2 flowUv = vec2(vUv.x - uTime * uFlowSpeed, vUv.y);
        float streak = smoothstep(0.46, 0.88, noise(flowUv * vec2(9.0, 34.0)));
        float foamEdge = (1.0 - smoothstep(0.02, 0.12, edge)) * smoothstep(0.42, 0.86, noise(flowUv * vec2(18.0, 68.0)));
        vec3 color = mix(uShallowColor, uDeepColor, center);
        color = mix(color, uFoamColor, max(foamEdge * 0.75, streak * 0.18));
        float alpha = uBaseAlpha * smoothstep(0.01, 0.14, edge) + foamEdge * 0.28;

        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function createSnowmeltMaterial() {
  return createStreamMaterial({
    shallow: 0xb9ffff,
    deep: 0x4ab4c6,
    foam: 0xf4fdff,
    speed: 0.5,
    alpha: 0.34,
  });
}

function createWaterfallMaterial(layer) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
      uLayerAlpha: { value: layer.alpha },
      uFallSpeed: { value: layer.speed },
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
      uniform float uLayerAlpha;
      uniform float uFallSpeed;
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

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i += 1) {
          value += noise(p) * amplitude;
          p = p * 2.05 + vec2(8.1, -3.2);
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        float edge = smoothstep(0.0, 0.16, vUv.x) * (1.0 - smoothstep(0.84, 1.0, vUv.x));
        float fallUv = vUv.y * 6.0 - uTime * uFallSpeed * 2.4;
        float longStreak = smoothstep(0.42, 0.86, fbm(vec2(vUv.x * 12.0, fallUv * 1.8)));
        float fineStreak = smoothstep(0.56, 0.92, fbm(vec2(vUv.x * 38.0 + 3.0, fallUv * 3.2)));
        float lowerBreakup = smoothstep(0.35, 1.0, vUv.y);
        float broken = mix(1.0, smoothstep(0.26, 0.78, fbm(vec2(vUv.x * 7.0 + uTime * 0.25, vUv.y * 9.0))), lowerBreakup);
        vec3 color = mix(vec3(0.3, 0.62, 0.76), vec3(0.72, 0.9, 0.94), max(longStreak, fineStreak * 0.85));
        float alpha = edge * broken * uLayerAlpha * mix(0.42, 1.0, max(longStreak, fineStreak));
        alpha += smoothstep(0.78, 1.0, vUv.y) * fineStreak * 0.012;

        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function createFoamOverlayMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
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

      varying vec2 vUv;

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
        vec2 centered = vUv - vec2(0.5);
        float radial = 1.0 - smoothstep(0.12, 0.5, length(centered));
        float broken = smoothstep(0.35, 0.82, noise(vUv * vec2(18.0, 9.0) + vec2(-uTime * 0.35, uTime * 0.06)));
        float tail = 1.0 - smoothstep(0.45, 1.0, vUv.x);
        float alpha = radial * broken * mix(0.035, 0.11, tail);

        gl_FragColor = vec4(vec3(0.68, 0.9, 0.96), alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function createInflowRipples() {
  const group = new THREE.Group();
  group.name = 'SnowmeltInflowRipples';

  for (let i = 0; i < SNOWMELT_PATHS.length; i += 1) {
    const end = SNOWMELT_PATHS[i][SNOWMELT_PATHS[i].length - 1];
    const geometry = new THREE.CircleGeometry(5.5, 40);
    geometry.rotateX(Math.PI * 0.5);
    geometry.translate(end.x, LAKE_WATER_LEVEL + 0.035, end.z);
    const mesh = new THREE.Mesh(geometry, createFoamOverlayMaterial());

    mesh.name = `SnowmeltInflowRipple_${i + 1}`;
    mesh.renderOrder = 29;
    group.add(mesh);
  }

  return group;
}

function createMistParticles() {
  const count = 120;
  const positions = new Float32Array(count * 3);
  const randoms = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const r = pseudoRandom(i * 12.2);
    const angle = pseudoRandom(i * 4.7) * Math.PI * 2;
    const radius = 1.2 + pseudoRandom(i * 9.3) * 5.8;
    positions[i * 3] = WATERFALL_BASE.x + Math.cos(angle) * radius;
    positions[i * 3 + 1] = WATERFALL_BASE.y + pseudoRandom(i * 2.1) * 6.2;
    positions[i * 3 + 2] = WATERFALL_BASE.z + Math.sin(angle) * radius * 0.55;
    randoms[i] = r;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('randomSeed', new THREE.BufferAttribute(randoms, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
    },
    vertexShader: `
      uniform float uTime;

      attribute float randomSeed;

      varying float vAlpha;

      void main() {
        vec3 animated = position;
        animated.x += sin(uTime * 0.7 + randomSeed * 11.0) * 1.2;
        animated.y += fract(uTime * 0.08 + randomSeed) * 2.8;
        animated.z += cos(uTime * 0.62 + randomSeed * 9.0) * 0.8;
        vec4 mvPosition = modelViewMatrix * vec4(animated, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = (18.0 + randomSeed * 16.0) * (300.0 / -mvPosition.z);
        vAlpha = 0.015 + randomSeed * 0.026;
      }
    `,
    fragmentShader: `
      varying float vAlpha;

      void main() {
        vec2 centered = gl_PointCoord - vec2(0.5);
        float d = length(centered);
        float alpha = (1.0 - smoothstep(0.12, 0.5, d)) * vAlpha;
        gl_FragColor = vec4(0.72, 0.92, 0.98, alpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'WaterfallMistParticles';
  points.renderOrder = 34;

  return points;
}

function createWaterNormalTexture(seed) {
  const canvas = document.createElement('canvas');
  canvas.width = LAKE_NORMAL_SIZE;
  canvas.height = LAKE_NORMAL_SIZE;
  const context = canvas.getContext('2d');
  const imageData = context.createImageData(LAKE_NORMAL_SIZE, LAKE_NORMAL_SIZE);

  for (let y = 0; y < LAKE_NORMAL_SIZE; y += 1) {
    for (let x = 0; x < LAKE_NORMAL_SIZE; x += 1) {
      const nx = x / LAKE_NORMAL_SIZE;
      const ny = y / LAKE_NORMAL_SIZE;
      const waveA = Math.sin((nx * 18 + ny * 4 + seed) * Math.PI * 2);
      const waveB = Math.sin((nx * -7 + ny * 15 + seed * 0.37) * Math.PI * 2);
      const valueX = 128 + waveA * 34 + waveB * 14;
      const valueY = 128 + waveB * 32 - waveA * 10;
      const offset = (y * LAKE_NORMAL_SIZE + x) * 4;
      imageData.data[offset] = THREE.MathUtils.clamp(valueX, 0, 255);
      imageData.data[offset + 1] = THREE.MathUtils.clamp(valueY, 0, 255);
      imageData.data[offset + 2] = 210;
      imageData.data[offset + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;

  return texture;
}

function createLakeOutline() {
  const points = [];

  for (let i = 0; i < LAKE_SHAPE_SEGMENTS; i += 1) {
    const angle = (i / LAKE_SHAPE_SEGMENTS) * Math.PI * 2;
    const radius = lakeRadiusAt(angle);
    points.push(new THREE.Vector2(
      LAKE_CENTER.x + Math.cos(angle) * radius,
      LAKE_CENTER.y + Math.sin(angle) * radius,
    ));
  }

  return points;
}

function getLakeFrame(x, z) {
  const dx = x - LAKE_CENTER.x;
  const dz = z - LAKE_CENTER.y;
  const angle = Math.atan2(dz, dx);
  const radius = Math.sqrt(dx * dx + dz * dz);
  const lakeRadius = lakeRadiusAt(angle);

  return {
    radius,
    lakeRadius,
    inside: radius <= lakeRadius ? 1 : 0,
    normalized: radius / lakeRadius,
  };
}

function lakeRadiusAt(angle) {
  const radius = LAKE_BASE_RADIUS
    + Math.sin(angle * 3.0 + 0.7) * 4.4
    + Math.sin(angle * 5.0 - 1.1) * 3.1
    + Math.sin(angle * 9.0 + 2.2) * 1.8;

  return THREE.MathUtils.clamp(radius, 39, 56);
}

function createPathSamples(curve, count) {
  const samples = [];
  let distance = 0;
  let previous = curve.getPointAt(0);

  for (let i = 0; i <= count; i += 1) {
    const point = curve.getPointAt(i / count);

    if (i > 0) {
      distance += point.distanceTo(previous);
    }

    samples.push({
      x: point.x,
      z: point.z,
      distance,
    });
    previous = point;
  }

  return samples;
}

function getClosestSnowmeltFrame(x, z) {
  let closest = null;

  for (const samples of snowmeltSamples) {
    const frame = getPathFrame(samples, x, z);

    if (!frame) continue;
    if (!closest || Math.abs(frame.lateral) < Math.abs(closest.lateral)) {
      closest = frame;
    }
  }

  return closest;
}

function getPathFrame(samples, x, z) {
  let closest = null;
  let minDistanceSq = Infinity;

  for (let i = 0; i < samples.length - 1; i += 1) {
    const start = samples[i];
    const end = samples[i + 1];
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

  if (!closest || minDistanceSq > 16 * 16) return null;

  return closest;
}

function updateShaderGroup(object, camera, elapsedTime) {
  object.traverse((child) => {
    if (!child.material?.uniforms) return;

    if (child.material.uniforms.uTime) {
      child.material.uniforms.uTime.value = elapsedTime;
    }
    if (child.material.uniforms.uCameraPosition) {
      child.material.uniforms.uCameraPosition.value.copy(camera.position);
    }
  });
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}

function pseudoRandom(value) {
  const random = Math.sin(value * 127.1) * 43758.5453123;

  return random - Math.floor(random);
}

function isNearWaterSystem(x, z) {
  return x >= WATER_SYSTEM_MIN_X
    && x <= WATER_SYSTEM_MAX_X
    && z >= WATER_SYSTEM_MIN_Z
    && z <= WATER_SYSTEM_MAX_Z;
}
