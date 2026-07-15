import * as THREE from 'three';
import {
  applyRiverNetworkTerrain,
  compileRiverNetwork,
  fitRiverNetworkWaterLevelsToTerrain,
  getNearestRiverReach,
  getRiverNetworkFeatureBounds,
  getRiverNetworkGrassAcceptance,
  isInRiverNetworkVegetationExclusion,
} from './hydrology/riverNetwork.js';
import { getLakeBoundaryFrame } from './lakeBoundary.js';

export const ORIGINAL_TERRAIN_SIZE = 2048;
export const EXPANDED_TERRAIN_SIZE = ORIGINAL_TERRAIN_SIZE * 3;
export const EXPANDED_CELL_SIZE = ORIGINAL_TERRAIN_SIZE;

const CENTER_HALF_SIZE = ORIGINAL_TERRAIN_SIZE / 2;
const WORLD_HALF_SIZE = EXPANDED_TERRAIN_SIZE / 2;
const CENTER_BLEND_WIDTH = 384;
const WORLD_EDGE_BLEND_WIDTH = 256;
const OUTER_BASE_HEIGHT = 14;
const OUTER_EDGE_HEIGHT = 12;
const WATER_FEATURE_SEGMENTS = 128;

const CELL_PLANS = [
  createCellPlan('northwest', [-2048, 2048], [-2780, 2720], [-1450, 2680], [-2130, 2180], [-1650, 1450], 0.18, [-296, -312, 182.8]),
  createCellPlan('north', [0, 2048], [-720, 2780], [690, 2700], [-80, 2200], [360, 1450], -0.22, [24, -192, 181.6]),
  createCellPlan('northeast', [2048, 2048], [1450, 2720], [2780, 2600], [2070, 2170], [1550, 1450], 0.28, [24, -192, 181.6]),
  createCellPlan('west', [-2048, 0], [-2800, 720], [-2750, -650], [-2200, 80], [-1450, -360], -0.16, [-296, -312, 182.8]),
  createCellPlan('east', [2048, 0], [2800, 680], [2740, -700], [2200, -40], [1450, 380], 0.2, [152, -652, 182.8]),
  createCellPlan('southwest', [-2048, -2048], [-2780, -1500], [-1550, -2780], [-2200, -2160], [-1450, -1600], -0.24, [-208, -556, 181.6]),
  createCellPlan('south', [0, -2048], [-700, -2780], [720, -2700], [80, -2200], [-360, -1450], 0.16, [40, -680, 182.8]),
  createCellPlan('southeast', [2048, -2048], [1500, -2780], [2780, -1580], [2180, -2180], [1500, -1500], -0.3, [152, -652, 182.8]),
];

const ROLLING_HILLS = [
  [-2540, 1760, 520, 340, 31, 0.25], [-2050, 2670, 610, 390, 24, -0.2],
  [-650, 1840, 570, 360, 28, -0.18], [620, 2480, 650, 420, 34, 0.22],
  [1720, 1740, 600, 380, 30, 0.18], [2510, 2470, 540, 350, 25, -0.28],
  [-2500, 480, 640, 400, 27, -0.12], [-1770, -520, 560, 360, 35, 0.26],
  [2450, 520, 620, 390, 32, 0.14], [1780, -520, 580, 380, 26, -0.24],
  [-2480, -2440, 590, 390, 34, 0.2], [-1760, -1770, 650, 420, 28, -0.18],
  [-620, -2460, 620, 400, 30, 0.24], [640, -1760, 570, 360, 25, -0.2],
  [2490, -2450, 610, 410, 33, -0.22], [1770, -1780, 560, 370, 27, 0.26],
].map(([cx, cz, radiusX, radiusZ, height, rotation], index) => Object.freeze({
  id: `outer-rolling-hill-${index + 1}`,
  cx,
  cz,
  radiusX,
  radiusZ,
  height,
  rotation,
}));

export const EXPANDED_TERRAIN_CELLS = Object.freeze(CELL_PLANS);
export const EXPANDED_ROLLING_HILLS = Object.freeze(ROLLING_HILLS);
export const EXPANDED_LAKES = Object.freeze(CELL_PLANS.flatMap((cell) => cell.lakes));
export const EXPANDED_RIVER_NETWORK_DEFINITIONS = Object.freeze(
  CELL_PLANS.map((cell) => cell.networkDefinition),
);
export const EXPANDED_RIVER_NETWORKS = Object.freeze(
  EXPANDED_RIVER_NETWORK_DEFINITIONS.map((definition) => compileRiverNetwork(definition)),
);
export const EXPANDED_WATER_BASINS = Object.freeze(CELL_PLANS.map((cell, index) => Object.freeze({
  id: `${cell.id}-outer-basin`,
  lakeId: cell.lake.id,
  lakeIds: Object.freeze(cell.lakes.map((lake) => lake.id)),
  sourceId: cell.networkDefinition.id,
  network: EXPANDED_RIVER_NETWORKS[index],
  terminalReachId: `${cell.id}-trunk`,
  interfaces: Object.freeze([
    Object.freeze({
      id: `${cell.id}-foothill-inlet`,
      reachId: `${cell.id}-mountain-cascade`,
      endpoint: 'end',
      lakeId: cell.foothillLake.id,
    }),
    Object.freeze({
      id: `${cell.id}-foothill-outlet`,
      reachId: `${cell.id}-foothill-outlet`,
      endpoint: 'start',
      lakeId: cell.foothillLake.id,
    }),
    Object.freeze({
      id: `${cell.id}-terminal-inlet`,
      reachId: `${cell.id}-trunk`,
      endpoint: 'end',
      lakeId: cell.lake.id,
    }),
  ]),
})));

export function fitExpandedWaterToTerrain(terrain) {
  if (!terrain || typeof terrain.getBaseHeightAt !== 'function') {
    throw new Error('Expanded water fitting requires terrain.getBaseHeightAt(x, z).');
  }

  for (const network of EXPANDED_RIVER_NETWORKS) {
    fitRiverNetworkWaterLevelsToTerrain(
      network,
      (x, z) => terrain.getBaseHeightAt(x, z),
      { surfaceInset: 0.2, fitNodes: true },
    );
  }
}

const WATER_FEATURE_BOUNDS_BY_NETWORK = EXPANDED_RIVER_NETWORKS.map(
  (network) => getRiverNetworkFeatureBounds(network),
);
const WATER_FEATURE_BOUNDS = WATER_FEATURE_BOUNDS_BY_NETWORK.flat();

export function getExpandedTerrainBaseHeight(centerHeight, x, z) {
  const outsideX = Math.max(Math.abs(x) - CENTER_HALF_SIZE, 0);
  const outsideZ = Math.max(Math.abs(z) - CENTER_HALF_SIZE, 0);

  if (outsideX === 0 && outsideZ === 0) return centerHeight;

  const centerDistance = Math.hypot(outsideX, outsideZ);
  const centerBlend = smoothstep(0, CENTER_BLEND_WIDTH, centerDistance);
  const edgeDistance = WORLD_HALF_SIZE - Math.max(Math.abs(x), Math.abs(z));
  const edgeBlend = smoothstep(0, WORLD_EDGE_BLEND_WIDTH, edgeDistance);
  let outerHeight = OUTER_BASE_HEIGHT
    + Math.sin(x * 0.0041 + z * 0.0017) * 1.4
    + Math.sin(z * 0.0033 - x * 0.0013) * 1.1;
  const cellIndex = getOuterCellIndex(x, z);

  for (const hill of ROLLING_HILLS.slice(cellIndex * 2, cellIndex * 2 + 2)) {
    outerHeight += sampleRollingHill(hill, x, z);
  }

  outerHeight = THREE.MathUtils.lerp(OUTER_EDGE_HEIGHT, outerHeight, edgeBlend);
  return THREE.MathUtils.lerp(centerHeight, outerHeight, centerBlend);
}

export function applyExpandedWaterTerrain(baseHeight, x, z) {
  let height = baseHeight;

  for (const network of getExpandedNetworksNear(x, z)) {
    height = applyRiverNetworkTerrain(height, x, z, network);
  }

  return height;
}

export function getExpandedWaterMaterialFrame(x, z) {
  let bedMask = 0;
  let wetMask = 0;
  let lakeBedMask = 0;
  const networks = getExpandedNetworksNear(x, z, 32);
  const reach = getNearestExpandedReach(x, z, 32, networks);

  if (reach && reach.distance <= reach.influence) {
    bedMask = 1 - smoothstep(reach.halfWidth * 0.58, reach.halfWidth, reach.distance);
    wetMask = (
      1 - smoothstep(reach.halfWidth * 0.82, reach.influence, reach.distance)
    ) * 0.72;
  }

  const riverWetMask = wetMask;

  for (const network of networks) {
    for (const lakeNode of network.lakeFeatures) {
      const lake = lakeNode.lakeBoundary;
      const frame = getLakeBoundaryFrame(lake, x, z);

      lakeBedMask = Math.max(
        lakeBedMask,
        1 - smoothstep(-1, 0.35, frame.signedDistance),
      );
      wetMask = Math.max(
        wetMask,
        frame.signedDistance > 0
          ? 1 - smoothstep(0, lake.shoreWidth, frame.signedDistance)
          : smoothstep(-6, -0.8, frame.signedDistance)
            * (1 - smoothstep(-0.8, 0.15, frame.signedDistance)) * 0.72,
      );
    }
  }

  return {
    bedMask: THREE.MathUtils.clamp(bedMask, 0, 1),
    wetMask: THREE.MathUtils.clamp(wetMask, 0, 1),
    lakeBedMask: THREE.MathUtils.clamp(lakeBedMask, 0, 1),
    riverWetMask: THREE.MathUtils.clamp(riverWetMask, 0, 1),
  };
}

export function isInExpandedWaterVegetationExclusion(x, z, buffer = 0) {
  return getExpandedNetworksNear(x, z, buffer).some(
    (network) => isInRiverNetworkVegetationExclusion(x, z, buffer, network),
  );
}

export function getExpandedWaterGrassAcceptance(x, z) {
  return getExpandedNetworksNear(x, z, 12).reduce(
    (acceptance, network) => Math.min(
      acceptance,
      getRiverNetworkGrassAcceptance(x, z, network),
    ),
    1,
  );
}

export function getExpandedWaterMinimumSegmentsForBounds(bounds) {
  return WATER_FEATURE_BOUNDS.some((feature) => boundsIntersect(bounds, feature))
    ? WATER_FEATURE_SEGMENTS
    : 0;
}

function createCellPlan(
  id,
  center,
  sourceA,
  sourceB,
  junction,
  lakeCenter,
  rotation,
  mountainSource,
) {
  const lake = {
    id: `${id}-outer-lake`,
    cx: lakeCenter[0],
    cz: lakeCenter[1],
    radiusX: 118,
    radiusZ: 82,
    rotation,
    shapeAmp: 0.12,
    phase: center[0] * 0.001 + center[1] * 0.0017,
    waterLevel: 8,
    maxDepth: 4.2,
    edgeDepth: 0.45,
    shoreWidth: 18,
    surfaceOffset: 0.045,
    angularSegments: 48,
    ringCount: 8,
  };
  const bendSign = rotation >= 0 ? 1 : -1;
  const centerXSign = Math.sign(center[0]);
  const centerZSign = Math.sign(center[1]);
  const diagonalOffset = centerXSign !== 0 && centerZSign !== 0
    ? 320 * bendSign * (id === 'northwest' ? -1 : 1)
    : 0;
  const foothillLakeCenter = [
    centerXSign * 1180 - centerZSign * diagonalOffset
      + (center[0] === 0 ? rotation * 260 : 0),
    centerZSign * 1180 + centerXSign * diagonalOffset
      + (center[1] === 0 ? rotation * 260 : 0),
  ];
  const foothillLake = {
    id: `${id}-foothill-lake`,
    cx: foothillLakeCenter[0],
    cz: foothillLakeCenter[1],
    radiusX: 76,
    radiusZ: 52,
    rotation: -rotation * 0.7,
    shapeAmp: 0.1,
    phase: center[0] * 0.0013 - center[1] * 0.0011,
    waterLevel: 12.5,
    maxDepth: 3.6,
    edgeDepth: 0.4,
    shoreWidth: 14,
    surfaceOffset: 0.045,
    angularSegments: 48,
    ringCount: 8,
  };
  const mountainSourcePosition = mountainSource.slice(0, 2);
  const mountainSourceLevel = mountainSource[2];
  const mountainApproachOffset = id === 'southwest' ? 240 : 90;
  const mountainCascadePoints = createMountainCascadePoints(
    id,
    mountainSourcePosition,
    foothillLakeCenter,
    bendSign,
    mountainApproachOffset,
  );
  const upperJunction = midpoint(foothillLakeCenter, junction, 0.68, 55 * bendSign);
  const trunkMidpoint = midpoint(junction, lakeCenter, 0.48, 90 * Math.sign(center[0] || 1));
  const networkDefinition = Object.freeze({
    id: `${id}-outer-network`,
    nodes: Object.freeze([
      {
        id: `${id}-mountain-source`,
        type: 'source',
        position: mountainSourcePosition,
        waterLevel: mountainSourceLevel,
      },
      {
        id: foothillLake.id,
        type: 'lake',
        position: foothillLakeCenter,
        waterLevel: foothillLake.waterLevel,
        lakeBoundary: foothillLake,
      },
      { id: `${id}-source-a`, type: 'source', position: sourceA, waterLevel: 14 },
      { id: `${id}-source-b`, type: 'source', position: sourceB, waterLevel: 13.5 },
      {
        id: `${id}-upper-junction`,
        type: 'confluence',
        position: upperJunction,
        waterLevel: 11.1,
        poolRadius: 13,
      },
      { id: `${id}-junction`, type: 'confluence', position: junction, waterLevel: 10.5, poolRadius: 15 },
      {
        id: lake.id,
        type: 'lake',
        position: lakeCenter,
        waterLevel: lake.waterLevel,
        lakeBoundary: lake,
      },
    ]),
    reaches: Object.freeze([
      createReach(
        `${id}-mountain-cascade`,
        `${id}-mountain-source`,
        foothillLake.id,
        mountainCascadePoints,
        mountainSourceLevel,
        foothillLake.waterLevel,
        [2.5, 6],
        [8, 16],
        'continental-lake',
      ),
      createReach(`${id}-foothill-outlet`, foothillLake.id, `${id}-upper-junction`, [
        foothillLakeCenter,
        midpoint(foothillLakeCenter, upperJunction, 0.38, -80 * bendSign),
        upperJunction,
      ], foothillLake.waterLevel, 11.1, [6, 9], [15, 20], 'continental-lake'),
      createReach(`${id}-tributary-a`, `${id}-source-a`, `${id}-upper-junction`, [
        sourceA,
        midpoint(sourceA, upperJunction, 0.34, 75),
        midpoint(sourceA, upperJunction, 0.7, -55),
        upperJunction,
      ], 14, 11.1, [5, 8], [12, 18]),
      createReach(`${id}-upper-collector`, `${id}-upper-junction`, `${id}-junction`, [
        upperJunction,
        [
          THREE.MathUtils.lerp(upperJunction[0], sourceB[0], 0.16),
          THREE.MathUtils.lerp(upperJunction[1], sourceB[1], 0.16),
        ],
        midpoint(upperJunction, junction, 0.55, 45 * bendSign),
        [
          THREE.MathUtils.lerp(junction[0], sourceA[0], 0.12),
          THREE.MathUtils.lerp(junction[1], sourceA[1], 0.12),
        ],
        junction,
      ], 11.1, 10.5, [8, 11], [18, 23], 'continental'),
      createReach(`${id}-tributary-b`, `${id}-source-b`, `${id}-junction`, [
        sourceB,
        midpoint(sourceB, junction, 0.32, -70),
        midpoint(sourceB, junction, 0.68, 60),
        junction,
      ], 13.5, 10.5, [5, 8], [12, 18]),
      createReach(`${id}-trunk`, `${id}-junction`, lake.id, [
        junction,
        trunkMidpoint,
        midpoint(junction, lakeCenter, 0.76, -65 * Math.sign(center[1] || 1)),
        lakeCenter,
      ], 10.5, 8, [9, 14], [18, 26], 'continental'),
    ]),
  });

  return Object.freeze({
    id,
    center: Object.freeze(center),
    lake,
    foothillLake,
    lakes: Object.freeze([foothillLake, lake]),
    networkDefinition,
  });
}

function createReach(id, from, to, points, startLevel, endLevel, width, influence, style = 'headwater') {
  return Object.freeze({
    id,
    from,
    to,
    style,
    points: Object.freeze(points.map((point) => Object.freeze(point))),
    waterLevels: Object.freeze(points.map((_, index) => THREE.MathUtils.lerp(
      startLevel,
      endLevel,
      index / (points.length - 1),
    ))),
    width: Object.freeze(width),
    depth: Object.freeze([1.1, 1.8]),
    influence: Object.freeze(influence),
    vegetationBuffer: Object.freeze([3, 6]),
    wetBankWidth: Object.freeze([1.5, 2.5]),
    gravelBankWidth: Object.freeze([2.5, 4]),
    terrainBlendWidth: Object.freeze([4, 6]),
    flowSpeed: Object.freeze([0.4, 0.7]),
    riffles: Object.freeze([]),
    disturbances: Object.freeze([]),
  });
}

function createMountainCascadePoints(
  id,
  mountainSource,
  foothillLakeCenter,
  bendSign,
  approachOffset,
) {
  if (id === 'north') {
    return [
      mountainSource,
      [330, -188],
      [350, 240],
      midpoint(mountainSource, foothillLakeCenter, 0.7, 90),
      foothillLakeCenter,
    ];
  }
  if (id === 'northeast') {
    return [
      mountainSource,
      [330, -188],
      [440, 260],
      midpoint(mountainSource, foothillLakeCenter, 0.7, -90),
      foothillLakeCenter,
    ];
  }
  if (id === 'northwest') {
    return [
      mountainSource,
      [268, -100],
      [300, -20],
      foothillLakeCenter,
    ];
  }
  if (id === 'west') {
    return [
      mountainSource,
      [-180, -312],
      [-116, -376],
      [12, -600],
      [44, -728],
      [-20, -792],
      [-84, -776],
      [-196, -728],
      foothillLakeCenter,
    ];
  }
  if (id === 'southwest') {
    return [
      mountainSource,
      [-192, -544],
      [-32, -544],
      [0, -576],
      [32, -704],
      [32, -736],
      [-16, -784],
      foothillLakeCenter,
    ];
  }

  return [
    mountainSource,
    midpoint(mountainSource, foothillLakeCenter, 0.34, 140 * bendSign),
    midpoint(
      mountainSource,
      foothillLakeCenter,
      0.7,
      -approachOffset * bendSign,
    ),
    foothillLakeCenter,
  ];
}

function midpoint(start, end, t, lateralOffset) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const length = Math.hypot(dx, dz) || 1;

  return [
    THREE.MathUtils.lerp(start[0], end[0], t) - dz / length * lateralOffset,
    THREE.MathUtils.lerp(start[1], end[1], t) + dx / length * lateralOffset,
  ];
}

function sampleRollingHill(hill, x, z) {
  const dx = x - hill.cx;
  const dz = z - hill.cz;
  const cosine = Math.cos(hill.rotation);
  const sine = Math.sin(hill.rotation);
  const localX = (dx * cosine + dz * sine) / hill.radiusX;
  const localZ = (-dx * sine + dz * cosine) / hill.radiusZ;
  const radius = Math.hypot(localX, localZ);

  if (radius >= 1) return 0;

  const dome = 1 - smoothstep(0.08, 1, radius);
  return hill.height * dome * dome;
}

function getOuterCellIndex(x, z) {
  return CELL_PLANS.findIndex((cell) => (
    Math.abs(x - cell.center[0]) <= EXPANDED_CELL_SIZE / 2
    && Math.abs(z - cell.center[1]) <= EXPANDED_CELL_SIZE / 2
  ));
}

function getExpandedNetworksNear(x, z, padding = 0) {
  return EXPANDED_RIVER_NETWORKS.filter((network, index) => (
    WATER_FEATURE_BOUNDS_BY_NETWORK[index].some((bounds) => (
      x >= bounds.minX - padding
      && x <= bounds.maxX + padding
      && z >= bounds.minZ - padding
      && z <= bounds.maxZ + padding
    ))
  ));
}

function getNearestExpandedReach(
  x,
  z,
  maxDistance,
  networks = getExpandedNetworksNear(x, z, maxDistance),
) {
  let closest = null;

  for (const network of networks) {
    const reach = getNearestRiverReach(x, z, maxDistance, network);

    if (!reach || (closest && reach.distance >= closest.distance)) continue;
    closest = reach;
  }

  return closest;
}

function boundsIntersect(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX
    && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
