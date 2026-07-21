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
const OUTER_MOUNTAIN_HEIGHT_SCALE = 1.5;
const OUTER_MOUNTAIN_RIDGE_MIN_HEIGHT = 20;
const OUTER_MOUNTAIN_RIDGE_ANCHOR_WIDTH = 0.27;
const OUTER_MOUNTAIN_RIDGE_SHOULDER_SCALE = 0.56;
const WATER_FEATURE_SEGMENTS = 128;
const OUTER_HEADWATER_COORDINATE = CENTER_HALF_SIZE + 32;

const CELL_PLANS = [
  createCellPlan('northwest', [-2048, 2048], [-2780, 2720], [-1450, 2680], [-2130, 2180], [-1650, 1450], 0.18),
  createCellPlan('north', [0, 2048], [-720, 2780], [690, 2700], [-80, 2200], [360, 1450], -0.22),
  createCellPlan('northeast', [2048, 2048], [1450, 2720], [2780, 2600], [2070, 2170], [1550, 1450], 0.28),
  createCellPlan('west', [-2048, 0], [-2800, 720], [-2750, -650], [-2200, 80], [-1450, -360], -0.16),
  createCellPlan('east', [2048, 0], [2800, 680], [2740, -700], [2200, -40], [1450, 380], 0.2),
  createCellPlan('southwest', [-2048, -2048], [-2780, -1500], [-1550, -2780], [-2200, -2160], [-1450, -1600], -0.24),
  createCellPlan('south', [0, -2048], [-700, -2780], [720, -2700], [80, -2200], [-360, -1450], 0.16),
  createCellPlan('southeast', [2048, -2048], [1500, -2780], [2780, -1580], [2180, -2180], [1500, -1500], -0.3),
];

const ROLLING_HILL_GROUPS = [
  createRollingHillGroup('northwest', [
    [-2550, 2200, 620, 360, 84, 0.42, 0.13, 5, 0.35, 1.65],
    [-2020, 2700, 430, 300, 63, -0.28, 0.09, 4, 1.4, 2.1],
    [-1580, 1740, 390, 300, 55, 0.16, 0.16, 7, 2.3, 1.45],
  ]),
  createRollingHillGroup('north', [
    [-650, 2020, 300, 410, 58, -0.18, 0.11, 6, 0.8, 1.85],
    [80, 2540, 820, 360, 92, 0.06, 0.08, 5, 2.1, 1.35],
    [720, 1820, 260, 480, 69, 0.34, 0.14, 7, 3, 2.25],
  ]),
  createRollingHillGroup('northeast', [
    [1590, 1900, 430, 330, 62, -0.42, 0.15, 7, 0.2, 1.55],
    [2100, 2500, 700, 390, 78, 0.26, 0.1, 4, 1.2, 1.8],
    [2690, 1810, 300, 560, 89, -0.12, 0.12, 6, 2.5, 1.3],
    [2600, 2700, 300, 260, 53, 0.48, 0.17, 8, 4.1, 2.35],
  ]),
  createRollingHillGroup('west', [
    [-2600, 620, 380, 340, 72, -0.08, 0.08, 4, 0.5, 1.25],
    [-2180, -350, 520, 500, 96, 0.31, 0.14, 6, 2.7, 2.2],
  ]),
  createRollingHillGroup('east', [
    [2520, 420, 470, 480, 88, -0.24, 0.12, 7, 1.1, 1.5],
    [1840, -180, 650, 310, 57, 0.18, 0.16, 5, 3.7, 2.4],
    [2670, -650, 300, 320, 73, 0.44, 0.09, 8, 2.2, 1.75],
  ]),
  createRollingHillGroup('southwest', [
    [-2620, -1760, 440, 600, 65, 0.22, 0.15, 5, 0.9, 1.4],
    [-2300, -2560, 720, 350, 86, -0.34, 0.1, 7, 2, 1.95],
    [-1650, -2100, 360, 310, 52, 0.08, 0.18, 8, 3.2, 2.5],
    [-2720, -2700, 280, 300, 76, 0.46, 0.07, 4, 4.5, 1.2],
  ]),
  createRollingHillGroup('south', [
    [-650, -1760, 300, 330, 61, 0.36, 0.13, 6, 0.4, 2.15],
    [-80, -2600, 800, 390, 79, -0.04, 0.09, 5, 1.8, 1.45],
    [650, -1950, 280, 610, 93, -0.3, 0.15, 7, 3.5, 1.8],
  ]),
  createRollingHillGroup('southeast', [
    [1760, -2540, 700, 430, 98, 0.27, 0.11, 6, 0.7, 1.3],
    [2600, -1900, 400, 600, 67, -0.38, 0.17, 9, 2.9, 2.3],
  ]),
];
const ROLLING_HILLS = ROLLING_HILL_GROUPS.flat();
const OUTER_HIGH_HILL_GROUPS = [
  createOuterHighHillGroup('northwest', [
    [-2580, 2100, 450, 360, 260, 0.28, 0.14, 5, 0.4, 1.55],
    [-1700, 2700, 420, 320, 225, -0.22, 0.1, 7, 1.7, 1.9],
  ]),
  createOuterHighHillGroup('north', [
    [-600, 2620, 430, 350, 290, -0.12, 0.12, 6, 0.9, 1.45],
    [650, 2520, 500, 330, 240, 0.18, 0.16, 8, 2.4, 1.8],
  ]),
  createOuterHighHillGroup('northeast', [
    [2390, 2400, 550, 400, 278, 0.36, 0.11, 5, 3.2, 1.35],
  ]),
  createOuterHighHillGroup('west', [
    [-2600, 500, 420, 520, 295, -0.18, 0.15, 7, 1.2, 1.65],
  ]),
  createOuterHighHillGroup('east', [
    [2640, 650, 360, 450, 250, 0.2, 0.09, 6, 2.1, 1.3],
    [2500, -650, 450, 340, 285, -0.34, 0.17, 9, 4.3, 1.9],
  ]),
  createOuterHighHillGroup('southwest', [
    [-2500, -2300, 560, 450, 270, 0.24, 0.13, 5, 2.8, 1.4],
  ]),
  createOuterHighHillGroup('south', [
    [-650, -2600, 450, 350, 235, -0.26, 0.16, 8, 0.6, 1.85],
    [650, -2500, 400, 400, 300, 0.14, 0.1, 6, 3.5, 1.25],
  ]),
  createOuterHighHillGroup('southeast', [
    [2400, -2400, 550, 430, 280, -0.3, 0.14, 7, 1.9, 1.55],
  ]),
];
const OUTER_HIGH_HILLS = OUTER_HIGH_HILL_GROUPS.flat();
const OUTER_MOUNTAIN_RIDGE_ANCHORS = Object.freeze(OUTER_HIGH_HILLS.map((hill) => (
  Object.freeze({
    angle: Math.atan2(hill.cz, hill.cx),
    radius: getOuterMountainRidgeRadius(hill.cx, hill.cz),
    shoulderHeight: hill.elevation * OUTER_MOUNTAIN_RIDGE_SHOULDER_SCALE,
  })
)));
const OUTER_HIGH_HILLS_BY_CELL = CELL_PLANS.map((cell) => Object.freeze(
  OUTER_HIGH_HILLS.filter((hill) => highHillOverlapsCell(hill, cell)),
));

export const EXPANDED_TERRAIN_CELLS = Object.freeze(CELL_PLANS);
export const EXPANDED_ROLLING_HILLS = Object.freeze(ROLLING_HILLS);
export const EXPANDED_OUTER_HIGH_HILLS = Object.freeze(OUTER_HIGH_HILLS);
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
      reachId: `${cell.id}-outer-headwater`,
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

  for (const hill of ROLLING_HILL_GROUPS[cellIndex] ?? []) {
    outerHeight += sampleRollingHill(hill, x, z);
  }

  outerHeight = applyOuterMountainRidge(outerHeight, x, z);
  const ridgeFoundation = outerHeight;

  for (const hill of OUTER_HIGH_HILLS_BY_CELL[cellIndex] ?? []) {
    outerHeight = Math.max(
      outerHeight,
      sampleOuterHighHillElevation(hill, ridgeFoundation, x, z),
    );
  }

  outerHeight = THREE.MathUtils.lerp(OUTER_EDGE_HEIGHT, outerHeight, edgeBlend);
  return THREE.MathUtils.lerp(centerHeight, outerHeight, centerBlend);
}

export function applyExpandedWaterTerrain(baseHeight, x, z) {
  let height = baseHeight;

  for (const network of getExpandedNetworksNear(x, z)) {
    height = applyRiverNetworkTerrain(height, x, z, network);
  }

  const highHillProtection = smoothstep(0.01, 0.05, getOuterHighHillMask(x, z))
    * smoothstep(20, 50, baseHeight);
  return THREE.MathUtils.lerp(height, baseHeight, highHillProtection);
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

  const highHillWaterFade = 1 - smoothstep(0.01, 0.05, getOuterHighHillMask(x, z));

  return {
    bedMask: THREE.MathUtils.clamp(bedMask * highHillWaterFade, 0, 1),
    wetMask: THREE.MathUtils.clamp(wetMask * highHillWaterFade, 0, 1),
    lakeBedMask: THREE.MathUtils.clamp(lakeBedMask * highHillWaterFade, 0, 1),
    riverWetMask: THREE.MathUtils.clamp(riverWetMask * highHillWaterFade, 0, 1),
  };
}

export function isInExpandedWaterVegetationExclusion(x, z, buffer = 0) {
  if (getOuterHighHillMask(x, z) >= 0.01) return false;

  return getExpandedNetworksNear(x, z, buffer).some(
    (network) => isInRiverNetworkVegetationExclusion(x, z, buffer, network),
  );
}

export function getExpandedWaterGrassAcceptance(x, z) {
  if (getOuterHighHillMask(x, z) >= 0.01) return 1;

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
  const outerSourcePosition = createOuterHeadwaterSource(center);
  const outerHeadwaterPoints = createOuterHeadwaterPoints(
    outerSourcePosition,
    foothillLakeCenter,
    bendSign,
  );
  const upperJunction = midpoint(foothillLakeCenter, junction, 0.68, 55 * bendSign);
  const trunkMidpoint = midpoint(junction, lakeCenter, 0.48, 90 * Math.sign(center[0] || 1));
  const networkDefinition = Object.freeze({
    id: `${id}-outer-network`,
    nodes: Object.freeze([
      {
        id: `${id}-outer-source`,
        type: 'source',
        position: outerSourcePosition,
        waterLevel: 14,
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
        `${id}-outer-headwater`,
        `${id}-outer-source`,
        foothillLake.id,
        outerHeadwaterPoints,
        14,
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

function createOuterHeadwaterSource(center) {
  return [
    Math.sign(center[0]) * OUTER_HEADWATER_COORDINATE,
    Math.sign(center[1]) * OUTER_HEADWATER_COORDINATE,
  ];
}

function createOuterHeadwaterPoints(source, foothillLakeCenter, bendSign) {
  return [
    source,
    midpoint(source, foothillLakeCenter, 0.48, 36 * bendSign),
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
  return hill.height * sampleHillMask(hill, x, z);
}

function applyOuterMountainRidge(height, x, z) {
  return sampleOuterMountainRidge(height, x, z, false);
}

function getOuterMountainProtectionMask(x, z) {
  return sampleOuterMountainRidge(0, x, z, true);
}

function sampleOuterMountainRidge(height, x, z, protectionOnly) {
  const superellipseRadius = getOuterMountainRidgeRadius(x, z);

  if (superellipseRadius <= 2065 || superellipseRadius >= 3095) {
    return protectionOnly ? 0 : height;
  }

  const angle = Math.atan2(z, x);
  const primaryPeak = Math.pow(1 - Math.abs(Math.sin(angle * 6 + 0.4)), 2);
  const secondaryPeak = Math.pow(1 - Math.abs(Math.sin(angle * 13 - 0.9)), 3);
  let crestHeight = OUTER_MOUNTAIN_RIDGE_MIN_HEIGHT
    + primaryPeak * (125 + secondaryPeak * 40);
  let crestRadius = 2580
    + Math.sin(angle * 3 + 0.35) * 60
    + Math.sin(angle * 7 - 1.1) * 35;
  let weightedAnchorRadius = 0;
  let totalAnchorWeight = 0;
  let strongestAnchorInfluence = 0;

  for (const anchor of OUTER_MOUNTAIN_RIDGE_ANCHORS) {
    let angularDistance = Math.abs(angle - anchor.angle);

    if (angularDistance > Math.PI) angularDistance = Math.PI * 2 - angularDistance;
    if (angularDistance >= OUTER_MOUNTAIN_RIDGE_ANCHOR_WIDTH) continue;

    const influence = 1 - smoothstep(
      0,
      OUTER_MOUNTAIN_RIDGE_ANCHOR_WIDTH,
      angularDistance,
    );
    const weight = influence * influence;

    crestHeight = Math.max(
      crestHeight,
      THREE.MathUtils.lerp(
        OUTER_MOUNTAIN_RIDGE_MIN_HEIGHT,
        anchor.shoulderHeight,
        influence,
      ),
    );
    weightedAnchorRadius += anchor.radius * weight;
    totalAnchorWeight += weight;
    strongestAnchorInfluence = Math.max(strongestAnchorInfluence, influence);
  }

  if (totalAnchorWeight > 0) {
    const radiusAnchorBlend = 1 - (1 - strongestAnchorInfluence) ** 2;

    crestRadius = THREE.MathUtils.lerp(
      crestRadius,
      weightedAnchorRadius / totalAnchorWeight,
      radiusAnchorBlend,
    );
  }

  const ridgeMask = getOuterMountainRidgeMaskAt(
    superellipseRadius,
    crestRadius,
  );

  if (protectionOnly) {
    const localRidgeHeight = THREE.MathUtils.lerp(
      OUTER_BASE_HEIGHT,
      crestHeight,
      ridgeMask,
    );

    return ridgeMask * smoothstep(
      OUTER_MOUNTAIN_RIDGE_MIN_HEIGHT,
      50,
      localRidgeHeight,
    );
  }

  return height + Math.max(crestHeight - height, 0) * ridgeMask;
}

function getOuterMountainRidgeRadius(x, z) {
  const xSquared = x * x;
  const zSquared = z * z;
  const xFourth = xSquared * xSquared;
  const zFourth = zSquared * zSquared;

  return Math.pow(xFourth * xFourth + zFourth * zFourth, 1 / 8);
}

function getOuterMountainRidgeMaskAt(superellipseRadius, crestRadius) {
  return Math.pow(
    Math.max(1 - Math.abs(superellipseRadius - crestRadius) / 420, 0),
    1.55,
  );
}

function sampleOuterHighHillElevation(hill, foundationHeight, x, z) {
  return foundationHeight + Math.max(hill.elevation - foundationHeight, 0)
    * sampleOuterHighHillMask(hill, x, z);
}

function sampleOuterHighHillMask(hill, x, z) {
  const dx = x - hill.cx;
  const dz = z - hill.cz;
  const cosine = Math.cos(hill.rotation);
  const sine = Math.sin(hill.rotation);
  const localX = (dx * cosine + dz * sine) / hill.radiusX;
  const localZ = (-dx * sine + dz * cosine) / hill.radiusZ;
  const angle = Math.atan2(localZ, localX);
  const outlineVariation = Math.sin(angle * hill.lobes + hill.phase) * hill.shapeAmp
    + Math.sin(angle * (hill.lobes + 3) - hill.phase * 0.7) * hill.shapeAmp * 0.45;
  const baseRadius = Math.hypot(localX, localZ);
  const outlineFade = smoothstep(0.18, 0.5, baseRadius);
  const radius = baseRadius * (1 + outlineVariation * outlineFade);

  if (radius >= 1) return 0;

  return Math.pow(1 - radius, hill.profilePower);
}

function sampleHillMask(hill, x, z) {
  const dx = x - hill.cx;
  const dz = z - hill.cz;
  const cosine = Math.cos(hill.rotation);
  const sine = Math.sin(hill.rotation);
  const localX = (dx * cosine + dz * sine) / hill.radiusX;
  const localZ = (-dx * sine + dz * cosine) / hill.radiusZ;
  const angle = Math.atan2(localZ, localX);
  const outlineVariation = Math.sin(angle * hill.lobes + hill.phase) * hill.shapeAmp
    + Math.sin(angle * (hill.lobes + 3) - hill.phase * 0.7) * hill.shapeAmp * 0.45;
  const radius = Math.hypot(localX, localZ) * (1 + outlineVariation);

  if (radius >= 1) return 0;

  const dome = 1 - smoothstep(0.08, 1, radius);
  return Math.pow(dome, hill.profilePower);
}

function createRollingHillGroup(cellId, definitions) {
  return Object.freeze(definitions.map(([
    cx,
    cz,
    radiusX,
    radiusZ,
    height,
    rotation,
    shapeAmp,
    lobes,
    phase,
    profilePower,
  ], index) => Object.freeze({
    id: `${cellId}-rolling-hill-${index + 1}`,
    cellId,
    cx,
    cz,
    radiusX,
    radiusZ,
    height,
    rotation,
    shapeAmp,
    lobes,
    phase,
    profilePower,
  })));
}

function createOuterHighHillGroup(cellId, definitions) {
  return Object.freeze(definitions.map(([
    cx,
    cz,
    radiusX,
    radiusZ,
    elevation,
    rotation,
    shapeAmp,
    lobes,
    phase,
    profilePower,
  ], index) => Object.freeze({
    id: `${cellId}-outer-high-hill-${index + 1}`,
    cellId,
    cx,
    cz,
    radiusX,
    radiusZ,
    elevation: elevation * OUTER_MOUNTAIN_HEIGHT_SCALE,
    rotation,
    shapeAmp,
    lobes,
    phase,
    profilePower,
  })));
}

function getOuterHighHillMask(x, z) {
  const cellIndex = getOuterCellIndex(x, z);

  return (OUTER_HIGH_HILLS_BY_CELL[cellIndex] ?? []).reduce(
    (mask, hill) => Math.max(mask, sampleOuterHighHillMask(hill, x, z)),
    getOuterMountainProtectionMask(x, z),
  );
}

function highHillOverlapsCell(hill, cell) {
  const halfSize = EXPANDED_CELL_SIZE / 2;
  const outlineScale = 1.4;

  return hill.cx - hill.radiusX * outlineScale <= cell.center[0] + halfSize
    && hill.cx + hill.radiusX * outlineScale >= cell.center[0] - halfSize
    && hill.cz - hill.radiusZ * outlineScale <= cell.center[1] + halfSize
    && hill.cz + hill.radiusZ * outlineScale >= cell.center[1] - halfSize;
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
