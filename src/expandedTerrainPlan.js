import * as THREE from 'three';
import {
  applyRiverNetworkTerrain,
  compileRiverNetwork,
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
  createCellPlan('northwest', [-2048, 2048], [-2780, 2720], [-1450, 2680], [-2130, 2180], [-1650, 1450], 0.18),
  createCellPlan('north', [0, 2048], [-720, 2780], [690, 2700], [-80, 2200], [360, 1450], -0.22),
  createCellPlan('northeast', [2048, 2048], [1450, 2720], [2780, 2600], [2070, 2170], [1550, 1450], 0.28),
  createCellPlan('west', [-2048, 0], [-2800, 720], [-2750, -650], [-2200, 80], [-1450, -360], -0.16),
  createCellPlan('east', [2048, 0], [2800, 680], [2740, -700], [2200, -40], [1450, 380], 0.2),
  createCellPlan('southwest', [-2048, -2048], [-2780, -1500], [-1550, -2780], [-2200, -2160], [-1450, -1600], -0.24),
  createCellPlan('south', [0, -2048], [-700, -2780], [720, -2700], [80, -2200], [-360, -1450], 0.16),
  createCellPlan('southeast', [2048, -2048], [1500, -2780], [2780, -1580], [2180, -2180], [1500, -1500], -0.3),
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
export const EXPANDED_LAKES = Object.freeze(CELL_PLANS.map((cell) => cell.lake));
export const EXPANDED_RIVER_NETWORK_DEFINITIONS = Object.freeze(
  CELL_PLANS.map((cell) => cell.networkDefinition),
);
export const EXPANDED_RIVER_NETWORKS = Object.freeze(
  EXPANDED_RIVER_NETWORK_DEFINITIONS.map((definition) => compileRiverNetwork(definition)),
);
export const EXPANDED_WATER_BASINS = Object.freeze(CELL_PLANS.map((cell, index) => Object.freeze({
  id: `${cell.id}-outer-basin`,
  lakeId: cell.lake.id,
  sourceId: cell.networkDefinition.id,
  network: EXPANDED_RIVER_NETWORKS[index],
  terminalReachId: `${cell.id}-trunk`,
})));

const WATER_FEATURE_BOUNDS = EXPANDED_RIVER_NETWORKS.flatMap(
  (network) => getRiverNetworkFeatureBounds(network),
);

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
  const cellIndex = getOuterCellIndex(x, z);

  return cellIndex === -1
    ? baseHeight
    : applyRiverNetworkTerrain(baseHeight, x, z, EXPANDED_RIVER_NETWORKS[cellIndex]);
}

export function getExpandedWaterMaterialFrame(x, z) {
  const cellIndex = getOuterCellIndex(x, z);
  let bedMask = 0;
  let wetMask = 0;
  let lakeBedMask = 0;

  if (cellIndex === -1) {
    return { bedMask, wetMask, lakeBedMask, riverWetMask: 0 };
  }

  const network = EXPANDED_RIVER_NETWORKS[cellIndex];
  const reach = getNearestRiverReach(x, z, 32, network);

  if (reach && reach.distance <= reach.influence) {
    bedMask = 1 - smoothstep(reach.halfWidth * 0.58, reach.halfWidth, reach.distance);
    wetMask = (
      1 - smoothstep(reach.halfWidth * 0.82, reach.influence, reach.distance)
    ) * 0.72;
  }

  const riverWetMask = wetMask;
  const lake = EXPANDED_LAKES[cellIndex];
  const frame = getLakeBoundaryFrame(lake, x, z);

  lakeBedMask = 1 - smoothstep(-1, 0.35, frame.signedDistance);
  wetMask = Math.max(
    wetMask,
    frame.signedDistance > 0
      ? 1 - smoothstep(0, lake.shoreWidth, frame.signedDistance)
      : smoothstep(-6, -0.8, frame.signedDistance)
        * (1 - smoothstep(-0.8, 0.15, frame.signedDistance)) * 0.72,
  );

  return {
    bedMask: THREE.MathUtils.clamp(bedMask, 0, 1),
    wetMask: THREE.MathUtils.clamp(wetMask, 0, 1),
    lakeBedMask: THREE.MathUtils.clamp(lakeBedMask, 0, 1),
    riverWetMask: THREE.MathUtils.clamp(riverWetMask, 0, 1),
  };
}

export function isInExpandedWaterVegetationExclusion(x, z, buffer = 0) {
  const cellIndex = getOuterCellIndex(x, z);

  return cellIndex !== -1 && isInRiverNetworkVegetationExclusion(
    x,
    z,
    buffer,
    EXPANDED_RIVER_NETWORKS[cellIndex],
  );
}

export function getExpandedWaterGrassAcceptance(x, z) {
  const cellIndex = getOuterCellIndex(x, z);

  return cellIndex === -1
    ? 1
    : getRiverNetworkGrassAcceptance(x, z, EXPANDED_RIVER_NETWORKS[cellIndex]);
}

export function getExpandedWaterMinimumSegmentsForBounds(bounds) {
  return WATER_FEATURE_BOUNDS.some((feature) => boundsIntersect(bounds, feature))
    ? WATER_FEATURE_SEGMENTS
    : 0;
}

function createCellPlan(id, center, sourceA, sourceB, junction, lakeCenter, rotation) {
  const lake = Object.freeze({
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
  });
  const trunkMidpoint = midpoint(junction, lakeCenter, 0.48, 90 * Math.sign(center[0] || 1));
  const networkDefinition = Object.freeze({
    id: `${id}-outer-network`,
    nodes: Object.freeze([
      Object.freeze({ id: `${id}-source-a`, type: 'source', position: sourceA, waterLevel: 14 }),
      Object.freeze({ id: `${id}-source-b`, type: 'source', position: sourceB, waterLevel: 13.5 }),
      Object.freeze({ id: `${id}-junction`, type: 'confluence', position: junction, waterLevel: 10.5, poolRadius: 15 }),
      Object.freeze({
        id: lake.id,
        type: 'lake',
        position: lakeCenter,
        waterLevel: lake.waterLevel,
        lakeBoundary: lake,
      }),
    ]),
    reaches: Object.freeze([
      createReach(`${id}-tributary-a`, `${id}-source-a`, `${id}-junction`, [
        sourceA,
        midpoint(sourceA, junction, 0.34, 75),
        midpoint(sourceA, junction, 0.7, -55),
        junction,
      ], 14, 10.5, [5, 8], [12, 18]),
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
      ], 10.5, 8, [9, 14], [18, 26], 'lake-inlet'),
    ]),
  });

  return Object.freeze({ id, center: Object.freeze(center), lake, networkDefinition });
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

function boundsIntersect(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX
    && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
