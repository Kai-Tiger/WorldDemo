import * as THREE from 'three';
import {
  applyRiverNetworkTerrain,
  compileRiverNetwork,
  getNearestRiverReach,
  isInRiverNetworkVegetationExclusion,
} from './hydrology/riverNetwork.js';
import { RIVER_TERMINAL_LAKE } from './riverChannel.js';

const LOWLAND_FEATURE_SEGMENTS = 128;
const LAKE_ANGLE_SEGMENTS = 72;
const LAKE_RADIAL_RINGS = 12;

const hills = [
  { id: 'spawn-meadow-west', cx: 570, cz: -395, radiusX: 25, radiusZ: 18, height: 3.6, rotation: -0.35, shapeAmp: 0.10, phase: 0.4 },
  { id: 'spawn-meadow-east', cx: 615, cz: -410, radiusX: 28, radiusZ: 20, height: 4.6, rotation: 0.25, shapeAmp: 0.08, phase: 1.8 },
  { id: 'northwest-foothill-south', cx: -665, cz: 430, radiusX: 54, radiusZ: 78, height: 8.6, rotation: 0.10, shapeAmp: 0.12, phase: 0.9 },
  { id: 'northwest-foothill-center', cx: -645, cz: 510, radiusX: 62, radiusZ: 86, height: 10.5, rotation: -0.08, shapeAmp: 0.10, phase: 2.2 },
  { id: 'northwest-foothill-north', cx: -620, cz: 590, radiusX: 50, radiusZ: 70, height: 7.8, rotation: 0.14, shapeAmp: 0.13, phase: 3.4 },
  { id: 'north-rolling-west', cx: -320, cz: 640, radiusX: 76, radiusZ: 48, height: 8.5, rotation: -0.20, shapeAmp: 0.11, phase: 1.3 },
  { id: 'north-rolling-east', cx: -205, cz: 675, radiusX: 68, radiusZ: 44, height: 7.0, rotation: 0.24, shapeAmp: 0.09, phase: 2.7 },
  { id: 'southeast-low-hill-west', cx: 770, cz: -855, radiusX: 42, radiusZ: 31, height: 6.2, rotation: 0.18, shapeAmp: 0.12, phase: 0.2 },
  { id: 'southeast-low-hill-center', cx: 830, cz: -875, radiusX: 38, radiusZ: 45, height: 7.4, rotation: -0.30, shapeAmp: 0.10, phase: 1.9 },
  { id: 'southeast-low-hill-east', cx: 875, cz: -825, radiusX: 34, radiusZ: 27, height: 5.2, rotation: 0.35, shapeAmp: 0.13, phase: 3.1 },
];

const lakes = [
  {
    id: 'east-meadow-pond',
    cx: 820,
    cz: -260,
    radiusX: 31,
    radiusZ: 24,
    rotation: -0.24,
    shapeAmp: 0.12,
    phase: 0.75,
    waterLevel: -0.2,
    maxDepth: 2.4,
    edgeDepth: 0.16,
    shoreWidth: 7,
    surfaceOffset: 0.045,
  },
];

const streamNodes = [
  {
    id: 'east-meadow-pond',
    type: 'lake',
    position: [820, -260],
    waterLevel: -0.2,
  },
  {
    id: 'terminal-lake',
    type: 'lake',
    position: [690, -340],
    waterLevel: -1.28,
    existing: true,
  },
];

const streamReaches = [
  {
    id: 'east-meadow-outlet',
    from: 'east-meadow-pond',
    to: 'terminal-lake',
    style: 'lake-outlet',
    points: [
      [820, -260],
      [805, -270],
      [780, -278],
      [758, -296],
      [735, -308],
      [710, -326],
      [690, -340],
    ],
    waterLevels: [-0.2, -0.27, -0.38, -0.55, -0.72, -1.02, -1.28],
    width: [2, 3.2],
    depth: [0.5, 0.9],
    influence: [5.5, 8],
    vegetationBuffer: [1.8, 2.8],
  },
];

export const LOWLAND_HILLS = Object.freeze(hills.map((hill) => Object.freeze({ ...hill })));
export const LOWLAND_LAKES = Object.freeze(lakes.map((lake) => Object.freeze({ ...lake })));
export const LOWLAND_STREAM_DEFINITION = Object.freeze({
  nodes: Object.freeze(streamNodes.map((node) => Object.freeze({
    ...node,
    position: Object.freeze([...node.position]),
  }))),
  reaches: Object.freeze(streamReaches.map((reach) => Object.freeze({
    ...reach,
    points: Object.freeze(reach.points.map((point) => Object.freeze([...point]))),
    waterLevels: Object.freeze([...reach.waterLevels]),
    width: Object.freeze([...reach.width]),
    depth: Object.freeze([...reach.depth]),
    influence: Object.freeze([...reach.influence]),
    vegetationBuffer: Object.freeze([...reach.vegetationBuffer]),
  }))),
});
export const LOWLAND_STREAM_NETWORK = compileRiverNetwork(LOWLAND_STREAM_DEFINITION);

const streamDetailBounds = createStreamDetailBounds();
const lakeDetailBounds = LOWLAND_LAKES.map(createLakeBounds);

export function applyLowlandHillsTerrain(baseHeight, x, z) {
  let rise = 0;

  for (const hill of LOWLAND_HILLS) {
    rise += getHillRise(hill, x, z);
  }

  return baseHeight + rise;
}

export function applyLowlandWaterTerrain(baseHeight, x, z) {
  const streamHeight = applyRiverNetworkTerrain(baseHeight, x, z, LOWLAND_STREAM_NETWORK);
  let height = THREE.MathUtils.lerp(
    baseHeight,
    streamHeight,
    getLowlandTerminalInletFade(x, z),
  );

  for (const lake of LOWLAND_LAKES) {
    height = applyLakeTerrain(height, lake, x, z);
  }

  return height;
}

export function applyLowlandMacroTerrain(baseHeight, x, z) {
  let height = applyLowlandHillsTerrain(baseHeight, x, z);

  for (const lake of LOWLAND_LAKES) {
    height = applyLakeTerrain(height, lake, x, z);
  }

  return height;
}

export function getLowlandMaterialFrame(x, z) {
  const reach = getNearestRiverReach(x, z, 16, LOWLAND_STREAM_NETWORK);
  let bedMask = 0;
  let wetMask = 0;
  let lakeBedMask = 0;

  if (reach && reach.distance <= reach.influence) {
    const wetOuter = Math.min(reach.influence, reach.halfWidth + 3);
    const inletFade = getLowlandTerminalInletFade(x, z);

    bedMask = (
      1 - smoothstep(reach.halfWidth * 0.58, reach.halfWidth, reach.distance)
    ) * inletFade;
    wetMask = (
      1 - smoothstep(reach.halfWidth * 0.82, wetOuter, reach.distance)
    ) * 0.72 * inletFade;
  }

  for (const lake of LOWLAND_LAKES) {
    const frame = getLakeFrame(lake, x, z);
    const currentBedMask = 1 - smoothstep(-1, 0.35, frame.signedDistance);
    const innerWet = smoothstep(-5, -0.8, frame.signedDistance)
      * (1 - smoothstep(-0.8, 0.15, frame.signedDistance));
    const outerWet = frame.signedDistance > 0
      ? 1 - smoothstep(0, lake.shoreWidth, frame.signedDistance)
      : 0;

    lakeBedMask = Math.max(lakeBedMask, currentBedMask);
    bedMask = Math.max(bedMask, currentBedMask);
    wetMask = Math.max(wetMask, innerWet * 0.72, outerWet);
  }

  return {
    bedMask: THREE.MathUtils.clamp(bedMask, 0, 1),
    wetMask: THREE.MathUtils.clamp(wetMask, 0, 1),
    lakeBedMask: THREE.MathUtils.clamp(lakeBedMask, 0, 1),
  };
}

export function isInLowlandVegetationExclusion(x, z, buffer = 0) {
  if (isInRiverNetworkVegetationExclusion(x, z, buffer, LOWLAND_STREAM_NETWORK)) {
    return true;
  }

  for (const lake of LOWLAND_LAKES) {
    const frame = getLakeFrame(lake, x, z);

    if (frame.signedDistance <= lake.shoreWidth + buffer) return true;
  }

  return false;
}

export function getLowlandMinimumSegmentsForBounds(bounds) {
  if (streamDetailBounds.some((feature) => boundsIntersect(bounds, feature))) {
    return LOWLAND_FEATURE_SEGMENTS;
  }
  if (lakeDetailBounds.some((feature) => boundsIntersect(bounds, feature))) {
    return LOWLAND_FEATURE_SEGMENTS;
  }

  return 0;
}

export function getLowlandTerminalInletFade(x, z) {
  const distance = Math.hypot(
    x - RIVER_TERMINAL_LAKE.cx,
    z - RIVER_TERMINAL_LAKE.cz,
  );

  return smoothstep(
    RIVER_TERMINAL_LAKE.radius - 4,
    RIVER_TERMINAL_LAKE.radius,
    distance,
  );
}

export function createLowlandLakeGeometry(lake, terrain) {
  const vertexCount = 1 + LAKE_RADIAL_RINGS * LAKE_ANGLE_SEGMENTS;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const lakeDepths = new Float32Array(vertexCount);
  const lakeEdges = new Float32Array(vertexCount);
  const lakeBedVisibilities = new Float32Array(vertexCount);
  const indices = [];

  writeLakeVertex(
    positions,
    uvs,
    lakeDepths,
    lakeEdges,
    lakeBedVisibilities,
    0,
    lake,
    terrain,
    lake.cx,
    lake.cz,
    0,
  );

  for (let ring = 1; ring <= LAKE_RADIAL_RINGS; ring += 1) {
    const radiusT = ring / LAKE_RADIAL_RINGS;

    for (let segment = 0; segment < LAKE_ANGLE_SEGMENTS; segment += 1) {
      const angle = segment / LAKE_ANGLE_SEGMENTS * Math.PI * 2;
      const shapeScale = getLakeShapeScale(lake, angle);
      const localX = Math.cos(angle) * lake.radiusX * shapeScale * radiusT;
      const localZ = Math.sin(angle) * lake.radiusZ * shapeScale * radiusT;
      const world = rotateLocalPoint(lake, localX, localZ);
      const vertex = 1 + (ring - 1) * LAKE_ANGLE_SEGMENTS + segment;

      writeLakeVertex(
        positions,
        uvs,
        lakeDepths,
        lakeEdges,
        lakeBedVisibilities,
        vertex,
        lake,
        terrain,
        world.x,
        world.z,
        radiusT,
      );
    }
  }

  for (let ring = 0; ring < LAKE_RADIAL_RINGS; ring += 1) {
    for (let segment = 0; segment < LAKE_ANGLE_SEGMENTS; segment += 1) {
      const current = 1 + ring * LAKE_ANGLE_SEGMENTS + segment;
      const next = 1 + ring * LAKE_ANGLE_SEGMENTS
        + (segment + 1) % LAKE_ANGLE_SEGMENTS;
      const currentInner = ring === 0
        ? 0
        : 1 + (ring - 1) * LAKE_ANGLE_SEGMENTS + segment;
      const nextInner = ring === 0
        ? 0
        : 1 + (ring - 1) * LAKE_ANGLE_SEGMENTS
          + (segment + 1) % LAKE_ANGLE_SEGMENTS;

      if (ring === 0) indices.push(0, next, current);
      else {
        indices.push(currentInner, nextInner, current);
        indices.push(nextInner, next, current);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('lakeDepth', new THREE.BufferAttribute(lakeDepths, 1));
  geometry.setAttribute('lakeEdge', new THREE.BufferAttribute(lakeEdges, 1));
  geometry.setAttribute('lakeBedVisibility', new THREE.BufferAttribute(lakeBedVisibilities, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.userData.lowlandLakeId = lake.id;

  return geometry;
}

function getHillRise(hill, x, z) {
  const local = toLocalPoint(hill, x, z);
  const normalizedX = local.x / hill.radiusX;
  const normalizedZ = local.z / hill.radiusZ;
  const angle = Math.atan2(normalizedZ, normalizedX);
  const shapeScale = getShapeScale(hill.shapeAmp, hill.phase, angle);
  const distance = Math.hypot(normalizedX, normalizedZ) / shapeScale;

  if (distance >= 1) return 0;

  return hill.height * (1 - smoothstep(0.08, 1, distance));
}

function applyLakeTerrain(baseHeight, lake, x, z) {
  const frame = getLakeFrame(lake, x, z);

  if (frame.signedDistance > lake.shoreWidth) return baseHeight;

  if (frame.normalizedDistance <= 1) {
    const depthT = smoothstep(0.14, 1, frame.normalizedDistance);
    const depth = THREE.MathUtils.lerp(lake.maxDepth, lake.edgeDepth, depthT);

    return Math.min(baseHeight, lake.waterLevel - depth);
  }

  const shoreT = smoothstep(0, lake.shoreWidth, frame.signedDistance);
  const shoreTarget = THREE.MathUtils.lerp(
    lake.waterLevel - lake.edgeDepth,
    baseHeight,
    shoreT,
  );

  return Math.min(baseHeight, shoreTarget);
}

function getLakeFrame(lake, x, z) {
  const local = toLocalPoint(lake, x, z);
  const normalizedX = local.x / lake.radiusX;
  const normalizedZ = local.z / lake.radiusZ;
  const angle = Math.atan2(normalizedZ, normalizedX);
  const normalizedDistance = Math.hypot(normalizedX, normalizedZ)
    / getLakeShapeScale(lake, angle);
  const meanRadius = (lake.radiusX + lake.radiusZ) * 0.5;

  return {
    normalizedDistance,
    signedDistance: (normalizedDistance - 1) * meanRadius,
  };
}

function getLakeShapeScale(lake, angle) {
  return getShapeScale(lake.shapeAmp, lake.phase, angle);
}

function getShapeScale(amplitude, phase, angle) {
  return 1 + amplitude * (
    Math.sin(angle * 3 + phase) * 0.58
    + Math.sin(angle * 5 - phase * 0.7) * 0.28
    + Math.sin(angle * 7 + phase * 1.3) * 0.14
  );
}

function toLocalPoint(feature, x, z) {
  const dx = x - feature.cx;
  const dz = z - feature.cz;
  const cosine = Math.cos(feature.rotation);
  const sine = Math.sin(feature.rotation);

  return {
    x: dx * cosine + dz * sine,
    z: -dx * sine + dz * cosine,
  };
}

function rotateLocalPoint(feature, localX, localZ) {
  const cosine = Math.cos(feature.rotation);
  const sine = Math.sin(feature.rotation);

  return {
    x: feature.cx + localX * cosine - localZ * sine,
    z: feature.cz + localX * sine + localZ * cosine,
  };
}

function writeLakeVertex(
  positions,
  uvs,
  lakeDepths,
  lakeEdges,
  lakeBedVisibilities,
  vertex,
  lake,
  terrain,
  x,
  z,
  radiusT,
) {
  const positionOffset = vertex * 3;
  const uvOffset = vertex * 2;
  const local = toLocalPoint(lake, x, z);
  const depth = Math.max(lake.waterLevel - terrain.getHeightAt(x, z), 0);

  positions[positionOffset] = x;
  positions[positionOffset + 1] = lake.waterLevel + lake.surfaceOffset;
  positions[positionOffset + 2] = z;
  uvs[uvOffset] = local.x / (lake.radiusX * 2) + 0.5;
  uvs[uvOffset + 1] = local.z / (lake.radiusZ * 2) + 0.5;
  lakeDepths[vertex] = depth;
  lakeEdges[vertex] = 1 - radiusT;
  lakeBedVisibilities[vertex] = THREE.MathUtils.clamp(
    1 - smoothstep(1.4, 8.5, depth),
    0,
    1,
  );
}

function createStreamDetailBounds() {
  const bounds = [];

  for (const reach of LOWLAND_STREAM_NETWORK.reaches) {
    for (let index = 0; index < reach.samples.length - 1; index += 1) {
      const start = reach.samples[index];
      const end = reach.samples[index + 1];
      const padding = Math.max(start.influence, end.influence);

      bounds.push({
        minX: Math.min(start.point.x, end.point.x) - padding,
        maxX: Math.max(start.point.x, end.point.x) + padding,
        minZ: Math.min(start.point.z, end.point.z) - padding,
        maxZ: Math.max(start.point.z, end.point.z) + padding,
      });
    }
  }

  return bounds;
}

function createLakeBounds(lake) {
  const radius = Math.max(lake.radiusX, lake.radiusZ)
    * (1 + lake.shapeAmp)
    + lake.shoreWidth;

  return {
    minX: lake.cx - radius,
    maxX: lake.cx + radius,
    minZ: lake.cz - radius,
    maxZ: lake.cz + radius,
  };
}

function boundsIntersect(a, b) {
  return a.minX <= b.maxX
    && a.maxX >= b.minX
    && a.minZ <= b.maxZ
    && a.maxZ >= b.minZ;
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;

  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}
