import { CatmullRomCurve3, Vector3 } from 'three';

const DEFAULT_WORLD_SIZE = 2048;
const DEFAULT_MAX_HEIGHT = 300;

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;

  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export const LOWLAND_HEIGHT_SETTINGS = deepFreeze({
  worldSize: DEFAULT_WORLD_SIZE,
  maxHeight: DEFAULT_MAX_HEIGHT,
  baseHeight: 4.7,
  reliefMax: 2.4,
  edgeFeatherMeters: 24,
  maximumBakedHeight: 18,
});

const preservedHills = [
  { id: 'spawn-meadow-west', region: 'preserved', cx: 570, cz: -395, radiusX: 25, radiusZ: 18, height: 3.6, rotation: -0.35, shapeAmp: 0.10, phase: 0.4 },
  { id: 'spawn-meadow-east', region: 'preserved', cx: 615, cz: -410, radiusX: 28, radiusZ: 20, height: 4.6, rotation: 0.25, shapeAmp: 0.08, phase: 1.8 },
  { id: 'northwest-foothill-south', region: 'preserved', cx: -665, cz: 430, radiusX: 54, radiusZ: 78, height: 8.6, rotation: 0.10, shapeAmp: 0.12, phase: 0.9 },
  { id: 'northwest-foothill-center', region: 'preserved', cx: -645, cz: 510, radiusX: 62, radiusZ: 86, height: 10.5, rotation: -0.08, shapeAmp: 0.10, phase: 2.2 },
  { id: 'northwest-foothill-north', region: 'preserved', cx: -620, cz: 590, radiusX: 50, radiusZ: 70, height: 7.8, rotation: 0.14, shapeAmp: 0.13, phase: 3.4 },
  { id: 'north-rolling-west', region: 'preserved', cx: -320, cz: 640, radiusX: 76, radiusZ: 48, height: 8.5, rotation: -0.20, shapeAmp: 0.11, phase: 1.3 },
  { id: 'north-rolling-east', region: 'preserved', cx: -205, cz: 675, radiusX: 68, radiusZ: 44, height: 7.0, rotation: 0.24, shapeAmp: 0.09, phase: 2.7 },
  { id: 'southeast-low-hill-west', region: 'preserved', cx: 770, cz: -855, radiusX: 42, radiusZ: 31, height: 6.2, rotation: 0.18, shapeAmp: 0.12, phase: 0.2 },
  { id: 'southeast-low-hill-center', region: 'preserved', cx: 830, cz: -875, radiusX: 38, radiusZ: 45, height: 7.4, rotation: -0.30, shapeAmp: 0.10, phase: 1.9 },
  { id: 'southeast-low-hill-east', region: 'preserved', cx: 875, cz: -825, radiusX: 34, radiusZ: 27, height: 5.2, rotation: 0.35, shapeAmp: 0.13, phase: 3.1 },
];

const addedHills = [
  { id: 'north-broad-rise-01', region: 'north', cx: -680, cz: 825, radiusX: 68, radiusZ: 45, height: 5.1, rotation: 0.18, shapeAmp: 0.09, phase: 0.2 },
  { id: 'north-broad-rise-02', region: 'north', cx: -610, cz: 875, radiusX: 58, radiusZ: 38, height: 4.4, rotation: -0.22, shapeAmp: 0.12, phase: 1.1 },
  { id: 'north-broad-rise-03', region: 'north', cx: -430, cz: 930, radiusX: 74, radiusZ: 42, height: 5.8, rotation: 0.12, shapeAmp: 0.10, phase: 2.4 },
  { id: 'north-broad-rise-04', region: 'north', cx: -255, cz: 925, radiusX: 62, radiusZ: 46, height: 4.0, rotation: -0.28, shapeAmp: 0.08, phase: 3.2 },
  { id: 'north-broad-rise-05', region: 'north', cx: 30, cz: 925, radiusX: 78, radiusZ: 50, height: 6.4, rotation: 0.08, shapeAmp: 0.11, phase: 4.1 },
  { id: 'north-broad-rise-06', region: 'north', cx: 180, cz: 855, radiusX: 65, radiusZ: 44, height: 4.8, rotation: -0.18, shapeAmp: 0.09, phase: 5.0 },
  { id: 'north-broad-rise-07', region: 'north', cx: 365, cz: 805, radiusX: 72, radiusZ: 48, height: 5.5, rotation: 0.24, shapeAmp: 0.10, phase: 0.8 },
  { id: 'north-broad-rise-08', region: 'north', cx: 550, cz: 745, radiusX: 60, radiusZ: 40, height: 3.8, rotation: -0.15, shapeAmp: 0.13, phase: 1.7 },
  { id: 'north-broad-rise-09', region: 'north', cx: 735, cz: 660, radiusX: 76, radiusZ: 52, height: 6.8, rotation: 0.20, shapeAmp: 0.09, phase: 2.6 },
  { id: 'north-broad-rise-10', region: 'north', cx: 900, cz: 680, radiusX: 57, radiusZ: 37, height: 4.6, rotation: -0.26, shapeAmp: 0.12, phase: 3.5 },
  { id: 'east-broad-rise-01', region: 'east', cx: 930, cz: 130, radiusX: 58, radiusZ: 42, height: 4.2, rotation: 0.20, shapeAmp: 0.10, phase: 1.4 },
  { id: 'east-broad-rise-02', region: 'east', cx: 930, cz: -185, radiusX: 64, radiusZ: 39, height: 5.7, rotation: -0.18, shapeAmp: 0.12, phase: 3.8 },
  { id: 'south-broad-rise-01', region: 'south', cx: 600, cz: -800, radiusX: 54, radiusZ: 38, height: 3.9, rotation: 0.16, shapeAmp: 0.11, phase: 0.6 },
  { id: 'south-broad-rise-02', region: 'south', cx: 540, cz: -900, radiusX: 67, radiusZ: 43, height: 5.3, rotation: -0.24, shapeAmp: 0.09, phase: 1.9 },
  { id: 'south-broad-rise-03', region: 'south', cx: 650, cz: -850, radiusX: 61, radiusZ: 40, height: 4.5, rotation: 0.22, shapeAmp: 0.13, phase: 2.8 },
  { id: 'south-broad-rise-04', region: 'south', cx: 860, cz: -970, radiusX: 73, radiusZ: 46, height: 6.1, rotation: -0.12, shapeAmp: 0.08, phase: 4.0 },
  { id: 'south-broad-rise-05', region: 'south', cx: 960, cz: -900, radiusX: 55, radiusZ: 36, height: 4.7, rotation: 0.28, shapeAmp: 0.12, phase: 5.1 },
  { id: 'south-broad-rise-06', region: 'south', cx: 970, cz: -540, radiusX: 62, radiusZ: 41, height: 5.9, rotation: -0.19, shapeAmp: 0.10, phase: 2.2 },
];

export const LOWLAND_HILLS = deepFreeze([...preservedHills, ...addedHills]);

export const TERMINAL_LOWLAND_LAKE = deepFreeze({
  id: 'terminal-lake',
  cx: 690,
  cz: -340,
  radius: 20,
  waterLevel: 1.6,
  maxDepth: 1.6,
  edgeDepth: 0.15,
  shoreWidth: 6,
  surfaceOffset: 0.045,
});

export const LOWLAND_LAKES = deepFreeze([
  {
    id: 'east-meadow-pond',
    cx: 820,
    cz: -260,
    radiusX: 31,
    radiusZ: 24,
    rotation: -0.24,
    shapeAmp: 0.12,
    phase: 0.75,
    waterLevel: 3.2,
    maxDepth: 2.8,
    edgeDepth: 0.16,
    shoreWidth: 7,
    surfaceOffset: 0.045,
  },
  {
    id: 'northwest-shallow-lake',
    cx: -520,
    cz: 720,
    radiusX: 55,
    radiusZ: 39,
    rotation: 0.18,
    shapeAmp: 0.14,
    phase: 1.35,
    waterLevel: 3.5,
    maxDepth: 3,
    edgeDepth: 0.18,
    shoreWidth: 8,
    surfaceOffset: 0.045,
  },
  {
    id: 'northeast-shallow-lake',
    cx: -120,
    cz: 800,
    radiusX: 48,
    radiusZ: 34,
    rotation: -0.22,
    shapeAmp: 0.13,
    phase: 2.6,
    waterLevel: 2,
    maxDepth: 1.7,
    edgeDepth: 0.15,
    shoreWidth: 8,
    surfaceOffset: 0.045,
  },
]);

export const SOUTHERN_LOWLAND_LAKES = deepFreeze([
  { id: 'south-northwest-lake', cx: 667, cz: -605, radius: 28, shapeAmp: 0.20, phase: 0.7, waterLevel: 3.5, maxDepth: 3, edgeDepth: 0.18, shoreWidth: 6, surfaceOffset: 0.045 },
  { id: 'south-east-lake', cx: 859, cz: -692, radius: 25, shapeAmp: 0.18, phase: 1.8, waterLevel: 3.2, maxDepth: 2.8, edgeDepth: 0.17, shoreWidth: 6, surfaceOffset: 0.045 },
  { id: 'south-central-lake', cx: 755, cz: -657, radius: 35, shapeAmp: 0.28, phase: 2.9, waterLevel: 2.8, maxDepth: 2.5, edgeDepth: 0.16, shoreWidth: 6, surfaceOffset: 0.045 },
  { id: 'south-terminal-lake', cx: 717, cz: -751, radius: 30, shapeAmp: 0.32, phase: 4.1, waterLevel: 1.8, maxDepth: 1.6, edgeDepth: 0.15, shoreWidth: 6, surfaceOffset: 0.045 },
]);

const eastStream = {
  id: 'east-lowland-basin',
  nodes: [
    { id: 'east-meadow-pond', type: 'lake', position: [820, -260], waterLevel: 3.2 },
    { id: 'terminal-lake', type: 'lake', position: [690, -340], waterLevel: 1.6, existing: true },
  ],
  reaches: [
    {
      id: 'east-meadow-outlet',
      from: 'east-meadow-pond',
      to: 'terminal-lake',
      style: 'lake-outlet',
      points: [[820, -260], [805, -270], [780, -278], [758, -296], [735, -308], [710, -326], [690, -340]],
      waterLevels: [3.2, 3.2, 3.2, 2.75, 2.35, 1.6, 1.6],
      width: [2, 3.2],
      depth: [0.65, 1.05],
      influence: [5.5, 8],
      vegetationBuffer: [1.8, 2.8],
    },
  ],
};

const northStream = {
  id: 'north-lowland-basin',
  nodes: [
    { id: 'northwest-shallow-lake', type: 'lake', position: [-520, 720], waterLevel: 3.5 },
    { id: 'northeast-shallow-lake', type: 'lake', position: [-120, 800], waterLevel: 2 },
  ],
  reaches: [
    {
      id: 'north-lake-connector',
      from: 'northwest-shallow-lake',
      to: 'northeast-shallow-lake',
      style: 'lake-outlet',
      points: [[-520, 720], [-465, 742], [-408, 730], [-350, 765], [-290, 750], [-230, 786], [-175, 778], [-120, 800]],
      waterLevels: [3.5, 3.35, 3.15, 2.95, 2.72, 2.45, 2.2, 2],
      width: [2.2, 3.4],
      depth: [0.6, 1],
      influence: [6, 8.5],
      vegetationBuffer: [2, 3],
    },
  ],
};

const southStream = {
  id: 'south-lowland-basin',
  nodes: [
    { id: 'south-northwest-lake', type: 'lake', position: [667, -605], waterLevel: 3.5 },
    { id: 'south-east-lake', type: 'lake', position: [859, -692], waterLevel: 3.2 },
    { id: 'south-central-lake', type: 'lake', position: [755, -657], waterLevel: 2.8 },
    { id: 'south-terminal-lake', type: 'lake', position: [717, -751], waterLevel: 1.8 },
  ],
  reaches: [
    {
      id: 'south-northwest-tributary', from: 'south-northwest-lake', to: 'south-central-lake', style: 'lake-inlet',
      points: [[667, -605], [690, -620], [715, -635], [735, -648], [755, -657]],
      waterLevels: [3.5, 3.35, 3.16, 2.98, 2.8], width: [1.8, 2.8], depth: [0.55, 0.9], influence: [5, 7.5], vegetationBuffer: [1.7, 2.6],
    },
    {
      id: 'south-east-tributary', from: 'south-east-lake', to: 'south-central-lake', style: 'lake-inlet',
      points: [[859, -692], [830, -684], [800, -675], [775, -664], [755, -657]],
      waterLevels: [3.2, 3.1, 3, 2.9, 2.8], width: [1.8, 2.8], depth: [0.55, 0.9], influence: [5, 7.5], vegetationBuffer: [1.7, 2.6],
    },
    {
      id: 'south-central-outlet', from: 'south-central-lake', to: 'south-terminal-lake', style: 'lake-outlet',
      points: [[755, -657], [760, -680], [748, -705], [735, -730], [717, -751]],
      waterLevels: [2.8, 2.56, 2.3, 2.04, 1.8], width: [2.4, 3.6], depth: [0.75, 1.1], influence: [6.5, 9], vegetationBuffer: [2.3, 3.2],
    },
  ],
};

export const LOWLAND_STREAM_DEFINITIONS = deepFreeze([eastStream, northStream, southStream]);

export const LOWLAND_STREAM_DEFINITION = LOWLAND_STREAM_DEFINITIONS[0];

export const LOWLAND_STREAM_PLAN = deepFreeze({
  basins: LOWLAND_STREAM_DEFINITIONS,
  nodes: LOWLAND_STREAM_DEFINITIONS.flatMap((basin) => basin.nodes),
  reaches: LOWLAND_STREAM_DEFINITIONS.flatMap((basin) => basin.reaches),
});

export const HERO_RIVER_NETWORK_DEFINITION = deepFreeze({
  id: 'hero-river-network',
  terminalLakeId: 'terminal-lake',
  nodes: [
    { id: 'hero-plunge-outlet', type: 'source', position: [420, -423], waterLevel: 3.2 },
    { id: 'hero-west-source', type: 'source', position: [635, -300], waterLevel: 3.15 },
    { id: 'hero-east-source', type: 'source', position: [700, -270], waterLevel: 3.4 },
    {
      id: 'hero-j1', type: 'confluence', position: [575, -336], waterLevel: 2.2,
      poolRadius: 10, poolDepth: 1.5, poolWidthScale: 1.4,
    },
    {
      id: 'hero-j2', type: 'confluence', position: [633, -349], waterLevel: 1.88,
      poolRadius: 12, poolDepth: 1.35, poolWidthScale: 1.5,
    },
    { id: 'terminal-lake', type: 'lake', position: [690, -340], waterLevel: 1.6 },
  ],
  reaches: [
    {
      id: 'hero-main-upper',
      role: 'main',
      style: 'trunk',
      from: 'hero-plunge-outlet',
      to: 'hero-j1',
      points: [[420, -423], [435, -413], [460, -398], [489, -388], [518, -374], [545, -350], [575, -336]],
      waterLevels: [3.2, 3.05, 2.9, 2.72, 2.55, 2.38, 2.2],
      width: [5.2, 7],
      depth: [0.8, 1],
      wetBankWidth: [1.2, 1.8],
      gravelBankWidth: [2, 8],
      terrainBlendWidth: [5, 5],
      flowSpeed: [0.55, 0.75],
      riffles: [
        { startM: 32, endM: 55, strength: 0.82, speed: 1.55 },
        { startM: 112, endM: 137, strength: 0.72, speed: 1.4 },
      ],
      disturbances: [
        { distanceM: 41, lateral: -0.78, radius: 1.8, strength: 0.75, model: 'rock_05.glb', height: 1.4, yaw: 0.4 },
        { distanceM: 86, lateral: 0.92, radius: 2.1, strength: 0.62, model: 'rock_02.glb', height: 1.6, yaw: 2.1 },
        { distanceM: 124, lateral: -0.66, radius: 2.4, strength: 0.85, model: 'rock_08.glb', height: 1.9, yaw: -0.8 },
      ],
      influence: [10.8, 23.5],
      vegetationBuffer: [3.2, 9.8],
    },
    {
      id: 'hero-main-middle',
      role: 'main',
      style: 'trunk',
      from: 'hero-j1',
      to: 'hero-j2',
      points: [[575, -336], [602, -352], [633, -349]],
      waterLevels: [2.2, 2.05, 1.88],
      width: [7, 8.2],
      depth: [1, 1.15],
      wetBankWidth: [1.8, 2],
      gravelBankWidth: [8, 10],
      terrainBlendWidth: [5, 5],
      flowSpeed: [0.65, 0.8],
      riffles: [{ startM: 9, endM: 31, strength: 0.88, speed: 1.7 }],
      disturbances: [
        { distanceM: 18, lateral: 0.72, radius: 2.2, strength: 0.9, model: 'rock_08.glb', height: 2, yaw: 1.3 },
        { distanceM: 42, lateral: -0.9, radius: 1.7, strength: 0.68, model: 'rock_02.glb', height: 1.3, yaw: -1.7 },
      ],
      influence: [23.5, 27.3],
      vegetationBuffer: [9.8, 12],
    },
    {
      id: 'hero-main-lower',
      role: 'main',
      style: 'trunk',
      from: 'hero-j2',
      to: 'terminal-lake',
      points: [[633, -349], [662, -351], [690, -340]],
      waterLevels: [1.88, 1.72, 1.6],
      width: [8.2, 6.4],
      depth: [1.15, 1],
      wetBankWidth: [2, 1.5],
      gravelBankWidth: [10, 6],
      terrainBlendWidth: [5, 5],
      flowSpeed: [0.7, 0.55],
      riffles: [],
      disturbances: [
        { distanceM: 31, lateral: 0.84, radius: 2, strength: 0.7, model: 'rock_05.glb', height: 1.7, yaw: 0.9 },
      ],
      influence: [27.3, 19.9],
      vegetationBuffer: [12, 7.5],
    },
    {
      id: 'hero-west-tributary',
      role: 'tributary',
      style: 'headwater',
      from: 'hero-west-source',
      to: 'hero-j1',
      points: [[635, -300], [625, -315], [610, -326], [592, -334], [575, -336]],
      waterLevels: [3.15, 2.95, 2.68, 2.38, 2.2],
      width: [2, 3.3],
      depth: [0.35, 0.65],
      wetBankWidth: [0.7, 1.2],
      gravelBankWidth: [3, 5],
      terrainBlendWidth: [3, 3],
      flowSpeed: [0.75, 1],
      riffles: [{ startM: 12, endM: 32, strength: 0.78, speed: 1.55 }],
      disturbances: [
        { distanceM: 24, lateral: -0.73, radius: 1.6, strength: 0.72, model: 'rock_02.glb', height: 1.2, yaw: -0.3 },
      ],
      influence: [9.8, 13.95],
      vegetationBuffer: [3.7, 6.2],
    },
    {
      id: 'hero-east-tributary',
      role: 'tributary',
      style: 'headwater',
      from: 'hero-east-source',
      to: 'hero-j2',
      points: [[700, -270], [690, -292], [675, -315], [655, -337], [633, -349]],
      waterLevels: [3.4, 3.1, 2.68, 2.18, 1.88],
      width: [2.2, 3.6],
      depth: [0.4, 0.75],
      wetBankWidth: [0.8, 1.3],
      gravelBankWidth: [3.5, 5.5],
      terrainBlendWidth: [3, 3],
      flowSpeed: [0.7, 1],
      riffles: [
        { startM: 28, endM: 55, strength: 0.8, speed: 1.6 },
        { startM: 72, endM: 91, strength: 0.72, speed: 1.45 },
      ],
      disturbances: [
        { distanceM: 41, lateral: 0.78, radius: 2.1, strength: 0.82, model: 'rock_08.glb', height: 1.8, yaw: 2.5 },
        { distanceM: 70, lateral: -0.88, radius: 1.8, strength: 0.74, model: 'rock_05.glb', height: 1.5, yaw: -2.2 },
      ],
      influence: [10.75, 14.95],
      vegetationBuffer: [4.3, 6.8],
    },
  ],
  confluences: [
    {
      id: 'hero-j1',
      position: [575, -336],
      waterLevel: 2.2,
      incoming: ['hero-main-upper', 'hero-west-tributary'],
      outgoing: 'hero-main-middle',
      poolRadius: 10,
      poolDepth: 1.5,
      poolWidthScale: 1.4,
    },
    {
      id: 'hero-j2',
      position: [633, -349],
      waterLevel: 1.88,
      incoming: ['hero-main-middle', 'hero-east-tributary'],
      outgoing: 'hero-main-lower',
      poolRadius: 12,
      poolDepth: 1.35,
      poolWidthScale: 1.5,
    },
  ],
});

export const MAIN_RIVER_CHANNEL = deepFreeze({
  id: 'main-river-channel',
  points: [[420, -423], [435, -413], [460, -398], [489, -388], [518, -374], [545, -350], [575, -336], [604, -337], [633, -349], [662, -351], [690, -340]],
  waterLevels: [3.2, 3.05, 2.9, 2.72, 2.55, 2.38, 2.2, 2.05, 1.88, 1.72, 1.6],
  width: [8, 8],
  depth: [1.6, 1.6],
  influence: [7, 7],
  vegetationBuffer: [2, 2.8],
});

export const PLUNGE_POOL = deepFreeze({
  id: 'waterfall-plunge-pool',
  cx: 418,
  cz: -424,
  radius: 10,
  waterLevel: 3.2,
  maxDepth: 1.7,
  edgeDepth: 0.2,
  shoreWidth: 4,
});

export const LOWLAND_BAKE_COUNTS = deepFreeze({
  hills: LOWLAND_HILLS.length,
  preservedHills: preservedHills.length,
  addedHills: addedHills.length,
  northAddedHills: addedHills.filter((hill) => hill.region === 'north').length,
  eastAddedHills: addedHills.filter((hill) => hill.region === 'east').length,
  southAddedHills: addedHills.filter((hill) => hill.region === 'south').length,
  lowlandLakes: LOWLAND_LAKES.length,
  southernLakes: SOUTHERN_LOWLAND_LAKES.length,
  streamBasins: LOWLAND_STREAM_DEFINITIONS.length,
  streamReaches: LOWLAND_STREAM_PLAN.reaches.length,
  heroRiverReaches: HERO_RIVER_NETWORK_DEFINITION.reaches.length,
  heroRiverConfluences: HERO_RIVER_NETWORK_DEFINITION.confluences.length,
  heroRiverDisturbances: HERO_RIVER_NETWORK_DEFINITION.reaches
    .reduce((count, reach) => count + reach.disturbances.length, 0),
});

const hillBounds = LOWLAND_HILLS.map((hill) => ({
  minX: hill.cx - Math.max(hill.radiusX, hill.radiusZ) * (1 + hill.shapeAmp),
  maxX: hill.cx + Math.max(hill.radiusX, hill.radiusZ) * (1 + hill.shapeAmp),
  minZ: hill.cz - Math.max(hill.radiusX, hill.radiusZ) * (1 + hill.shapeAmp),
  maxZ: hill.cz + Math.max(hill.radiusX, hill.radiusZ) * (1 + hill.shapeAmp),
}));
const reachMetadata = new WeakMap(
  [
    MAIN_RIVER_CHANNEL,
    ...LOWLAND_STREAM_PLAN.reaches,
    ...HERO_RIVER_NETWORK_DEFINITION.reaches,
  ].map((reach) => [
    reach,
    createReachMetadata(reach),
  ]),
);
const heroReachById = new Map(
  HERO_RIVER_NETWORK_DEFINITION.reaches.map((reach) => [reach.id, reach]),
);
const heroNodeById = new Map(
  HERO_RIVER_NETWORK_DEFINITION.nodes.map((node) => [node.id, node]),
);
const heroJ1Distance = reachMetadata.get(heroReachById.get('hero-main-upper')).length;
const heroJ2Distance = heroJ1Distance
  + reachMetadata.get(heroReachById.get('hero-main-middle')).length;
const heroMaterialDistanceOffsets = new Map([
  ['hero-main-upper', 0],
  ['hero-main-middle', heroJ1Distance],
  ['hero-main-lower', heroJ2Distance],
  [
    'hero-west-tributary',
    heroJ1Distance - reachMetadata.get(heroReachById.get('hero-west-tributary')).length,
  ],
  [
    'hero-east-tributary',
    heroJ2Distance - reachMetadata.get(heroReachById.get('hero-east-tributary')).length,
  ],
]);
const heroConfluenceMaterialMetadata = HERO_RIVER_NETWORK_DEFINITION.confluences.map(
  (confluence) => {
    const outgoing = HERO_RIVER_NETWORK_DEFINITION.reaches.find(
      (reach) => reach.from === confluence.id,
    );
    const directionX = outgoing.points[1][0] - outgoing.points[0][0];
    const directionZ = outgoing.points[1][1] - outgoing.points[0][1];
    const directionLength = Math.hypot(directionX, directionZ) || 1;

    return {
      ...confluence,
      tangentX: directionX / directionLength,
      tangentZ: directionZ / directionLength,
      materialDistance: heroMaterialDistanceOffsets.get(outgoing.id),
      materialBlendWidth: Math.min(4, confluence.poolRadius * 0.4),
    };
  },
);

export function getLowlandBaseHeight(x, z) {
  const broad = valueNoise2D(x / 260, z / 260, 0x51f2a3d7);
  const local = valueNoise2D(x / 110, z / 110, 0x2c9277b5);

  return LOWLAND_HEIGHT_SETTINGS.baseHeight + broad * 1.55 + local * 0.85;
}

export function getLowlandHillRise(x, z) {
  let rise = 0;

  for (let index = 0; index < LOWLAND_HILLS.length; index += 1) {
    const bounds = hillBounds[index];

    if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) continue;
    rise += getHillRise(LOWLAND_HILLS[index], x, z);
  }
  return rise;
}

export function getLowlandTerrainHeight(x, z) {
  return Math.min(
    getLowlandBaseHeight(x, z) + getLowlandHillRise(x, z),
    LOWLAND_HEIGHT_SETTINGS.maximumBakedHeight,
  );
}

export function getHeroRiverCorridorFrame(baseHeightOrX, xOrZ, maybeZ) {
  const x = maybeZ === undefined ? baseHeightOrX : xOrZ;
  const z = maybeZ === undefined ? xOrZ : maybeZ;
  let strongest = null;
  let disturbanceMask = 0;
  let bedMask = 0;
  let wetBankMask = 0;
  let gravelBankMask = 0;
  let underwaterMask = 0;
  let vegetationMask = 0;

  for (const reach of HERO_RIVER_NETWORK_DEFINITION.reaches) {
    const frame = getHeroReachFrame(reach, x, z);

    if (!frame) continue;
    disturbanceMask = Math.max(disturbanceMask, frame.disturbanceMask);
    bedMask = Math.max(bedMask, frame.bedMask);
    wetBankMask = Math.max(wetBankMask, frame.wetBankMask);
    gravelBankMask = Math.max(gravelBankMask, frame.gravelBankMask);
    underwaterMask = Math.max(underwaterMask, frame.underwaterMask);
    vegetationMask = Math.max(vegetationMask, frame.vegetationMask);
    const strength = Math.max(
      frame.bedMask,
      frame.wetMask,
      frame.gravelMask,
      frame.vegetationMask,
    );

    if (
      !strongest
      || strength > strongest.strength
      || (strength === strongest.strength && Math.abs(frame.signedLateral) < Math.abs(strongest.frame.signedLateral))
    ) strongest = { frame, strength };
  }

  return strongest
    ? {
      ...strongest.frame,
      bedMask,
      wetMask: wetBankMask,
      wetBankMask,
      gravelMask: gravelBankMask,
      gravelBankMask,
      underwaterMask,
      vegetationMask,
      flowMask: underwaterMask,
      disturbanceMask,
    }
    : null;
}

export function getHeroRiverTerrainTarget(baseHeight, x, z) {
  let target = null;
  let waterOverrideMask = 0;

  for (const reach of HERO_RIVER_NETWORK_DEFINITION.reaches) {
    const frame = getHeroReachFrame(reach, x, z);

    if (!frame) continue;

    const candidate = getHeroReachTerrainTarget(baseHeight, frame);

    if (!candidate) continue;
    waterOverrideMask = Math.max(waterOverrideMask, getBakedWaterOverrideMask(candidate));
    if (!target || candidate.height < target.height) target = candidate;
  }

  for (const confluence of heroConfluenceMaterialMetadata) {
    const candidate = getHeroConfluenceTerrainTarget(baseHeight, confluence, x, z);

    if (!candidate) continue;
    waterOverrideMask = Math.max(waterOverrideMask, getBakedWaterOverrideMask(candidate));
    if (!target || candidate.height < target.height) target = candidate;
  }

  return target ? { ...target, waterOverrideMask } : null;
}

export function getHeroRiverConfluenceMask(x, z) {
  let mask = 0;

  for (const confluence of heroConfluenceMaterialMetadata) {
    const distance = Math.hypot(x - confluence.position[0], z - confluence.position[1]);
    const coreRadius = confluence.poolRadius * 0.58;

    mask = Math.max(
      mask,
      1 - smoothstep(coreRadius - 1, coreRadius, distance),
    );
  }

  return mask;
}

export function getHeroRiverConfluenceMaterialFrame(x, z) {
  let strongest = null;

  for (const confluence of heroConfluenceMaterialMetadata) {
    const dx = x - confluence.position[0];
    const dz = z - confluence.position[1];
    const distance = Math.hypot(dx, dz);

    const blendWidth = confluence.materialBlendWidth;

    if (distance > confluence.poolRadius + blendWidth) continue;

    const mask = 1 - smoothstep(
      confluence.poolRadius,
      confluence.poolRadius + blendWidth,
      distance,
    );
    const candidate = {
      mask,
      riverDistance: confluence.materialDistance
        + dx * confluence.tangentX + dz * confluence.tangentZ,
      riverLateral: dx * -confluence.tangentZ + dz * confluence.tangentX,
    };

    if (!strongest || candidate.mask > strongest.mask) strongest = candidate;
  }

  return strongest;
}

export function getLowlandWaterTerrainTarget(baseHeight, x, z) {
  let height = baseHeight;
  let strongest = null;
  let waterOverrideMask = 0;
  const reaches = LOWLAND_STREAM_PLAN.reaches;

  for (const reach of reaches) {
    const frame = getReachFrame(reach, x, z);

    if (!frame || frame.distance > frame.influence) continue;

    const smoothingPadding = 1.5;
    const bedOuter = Math.min(frame.halfWidth + smoothingPadding, frame.influence - 0.5);
    const mask = frame.distance <= bedOuter
      ? 1
      : 1 - smoothstep(bedOuter, frame.influence, frame.distance);
    const bedHeight = Math.max(0, frame.waterLevel - frame.depth);

    height = Math.min(height, lerp(height, bedHeight, mask));
    const candidate = {
      featureType: 'reach', featureId: reach.id, mask, bedHeight, waterLevel: frame.waterLevel,
    };

    waterOverrideMask = Math.max(waterOverrideMask, getBakedWaterOverrideMask(candidate));
    strongest = chooseStrongerTarget(strongest, candidate);
  }

  const lakes = [
    PLUNGE_POOL,
    TERMINAL_LOWLAND_LAKE,
    ...LOWLAND_LAKES,
    ...SOUTHERN_LOWLAND_LAKES,
  ];

  for (const lake of lakes) {
    const target = getLakeTerrainTarget(lake, height, x, z);

    if (!target) continue;

    height = Math.min(height, target.height);
    waterOverrideMask = Math.max(waterOverrideMask, getBakedWaterOverrideMask(target));
    strongest = chooseStrongerTarget(strongest, target);
  }

  const heroRiver = getHeroRiverTerrainTarget(height, x, z);

  if (heroRiver) {
    height = Math.min(height, heroRiver.height);
    waterOverrideMask = Math.max(waterOverrideMask, getBakedWaterOverrideMask(heroRiver));
    strongest = chooseStrongerTarget(strongest, heroRiver);
  }

  if (!strongest) return null;
  return { ...strongest, height: Math.max(0, height), waterOverrideMask };
}

export function getBakedLowlandHeight(x, z, edgeDistanceMeters = Infinity) {
  return getBakedLowlandHeightDetails(x, z, edgeDistanceMeters).height;
}

export function getBakedLowlandHeightDetails(x, z, edgeDistanceMeters = Infinity) {
  const terrainHeight = getLowlandTerrainHeight(x, z);
  const waterTarget = getLowlandWaterTerrainTarget(terrainHeight, x, z);
  const feather = smoothstep(0, LOWLAND_HEIGHT_SETTINGS.edgeFeatherMeters, edgeDistanceMeters);
  const waterOverrideMask = getBakedWaterOverrideMask(waterTarget);
  const coverage = 1 - (1 - feather) * (1 - waterOverrideMask);
  const height = Math.min(
    Math.max((waterTarget?.height ?? terrainHeight) * coverage, 0),
    LOWLAND_HEIGHT_SETTINGS.maximumBakedHeight,
  );

  return { height, terrainHeight, feather, waterTarget, waterOverrideMask };
}

function getBakedWaterOverrideMask(target) {
  if (!target) return 0;
  if (target.waterOverrideMask !== undefined) return target.waterOverrideMask;
  if (target.featureType === 'hero-river-reach') {
    const lateralMask = 1 - smoothstep(
      target.frame.halfWidth + 0.75,
      target.frame.corridorOuter,
      target.frame.lateralDistance,
    );

    return lateralMask * target.frame.endpointCapFade;
  }

  return clamp(target.mask ?? 0, 0, 1);
}

export function getLowlandLakeFrame(lake, x, z) {
  const rotation = lake.rotation ?? 0;
  const dx = x - lake.cx;
  const dz = z - lake.cz;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const localX = dx * cos + dz * sin;
  const localZ = -dx * sin + dz * cos;
  const radiusX = lake.radiusX ?? lake.radius;
  const radiusZ = lake.radiusZ ?? lake.radius;
  const angle = Math.atan2(localZ / radiusZ, localX / radiusX);
  const shapeScale = getShapeScale(lake.shapeAmp ?? 0, lake.phase ?? 0, angle);
  const normalizedRadius = Math.hypot(localX / radiusX, localZ / radiusZ) / shapeScale;
  const averageRadius = (radiusX + radiusZ) * 0.5;

  return {
    normalizedRadius,
    signedDistance: (normalizedRadius - 1) * averageRadius,
    angle,
  };
}

export function heightmapPixelToWorld(pixelX, pixelY, width, height, worldSize = DEFAULT_WORLD_SIZE) {
  return {
    x: pixelX / (width - 1) * worldSize - worldSize * 0.5,
    z: (1 - pixelY / (height - 1)) * worldSize - worldSize * 0.5,
  };
}

export function worldToHeightmapPixel(x, z, width, height, worldSize = DEFAULT_WORLD_SIZE) {
  return {
    x: (x + worldSize * 0.5) / worldSize * (width - 1),
    y: (1 - (z + worldSize * 0.5) / worldSize) * (height - 1),
  };
}

export function encodeTerrainHeight(height, maxHeight = DEFAULT_MAX_HEIGHT) {
  return Math.round(clamp(height / maxHeight, 0, 1) * 255);
}

export function decodeTerrainHeight(value, maxHeight = DEFAULT_MAX_HEIGHT) {
  return value / 255 * maxHeight;
}

export function getLowlandPlanStatistics() {
  const waterFeatures = [
    PLUNGE_POOL,
    TERMINAL_LOWLAND_LAKE,
    ...LOWLAND_LAKES,
    ...SOUTHERN_LOWLAND_LAKES,
  ];
  const reachMinimums = [
    ...HERO_RIVER_NETWORK_DEFINITION.reaches,
    ...LOWLAND_STREAM_PLAN.reaches,
  ]
    .flatMap((reach) => reach.waterLevels.map((level, index) => {
      const t = reach.waterLevels.length > 1 ? index / (reach.waterLevels.length - 1) : 0;
      return level - interpolateRange(reach.depth, t);
    }));
  const confluenceMinimums = HERO_RIVER_NETWORK_DEFINITION.confluences
    .map((confluence) => confluence.waterLevel - confluence.poolDepth);
  const lakeMinimums = waterFeatures.map((lake) => lake.waterLevel - lake.maxDepth);

  return {
    ...LOWLAND_BAKE_COUNTS,
    minimumAuthoredBedHeight: Math.min(...reachMinimums, ...confluenceMinimums, ...lakeMinimums),
    maximumAuthoredBedHeight: Math.max(...reachMinimums, ...confluenceMinimums, ...lakeMinimums),
    maximumBakedHeight: LOWLAND_HEIGHT_SETTINGS.maximumBakedHeight,
  };
}

function getHillRise(hill, x, z) {
  const cos = Math.cos(hill.rotation);
  const sin = Math.sin(hill.rotation);
  const dx = x - hill.cx;
  const dz = z - hill.cz;
  const localX = dx * cos + dz * sin;
  const localZ = -dx * sin + dz * cos;
  const normalizedX = localX / hill.radiusX;
  const normalizedZ = localZ / hill.radiusZ;
  const angle = Math.atan2(normalizedZ, normalizedX);
  const shapeScale = getShapeScale(hill.shapeAmp, hill.phase, angle);
  const distance = Math.hypot(normalizedX, normalizedZ) / shapeScale;

  if (distance >= 1) return 0;
  return hill.height * (1 - smoothstep(0.08, 1, distance));
}

function getLakeTerrainTarget(lake, baseHeight, x, z) {
  const outerRadius = Math.max(lake.radiusX ?? lake.radius, lake.radiusZ ?? lake.radius)
    * (1 + (lake.shapeAmp ?? 0)) + lake.shoreWidth;

  if (Math.abs(x - lake.cx) > outerRadius || Math.abs(z - lake.cz) > outerRadius) return null;

  const frame = getLowlandLakeFrame(lake, x, z);

  if (frame.signedDistance > lake.shoreWidth) return null;

  if (frame.normalizedRadius <= 1) {
    const depthT = smoothstep(0.18, 1, frame.normalizedRadius);
    const depth = lerp(lake.maxDepth, lake.edgeDepth, depthT);
    const bedHeight = Math.max(0, lake.waterLevel - depth);

    return {
      featureType: 'lake', featureId: lake.id, height: bedHeight, mask: 1, bedHeight, waterLevel: lake.waterLevel,
    };
  }

  const shoreT = smoothstep(0, lake.shoreWidth, frame.signedDistance);
  const bedHeight = Math.max(0, lake.waterLevel - lake.edgeDepth);

  return {
    featureType: 'lake',
    featureId: lake.id,
    height: lerp(bedHeight, baseHeight, shoreT),
    mask: 1 - shoreT,
    bedHeight,
    waterLevel: lake.waterLevel,
  };
}

function getHeroReachFrame(reach, x, z) {
  const metadata = reachMetadata.get(reach);

  if (
    !metadata
    || x < metadata.minX
    || x > metadata.maxX
    || z < metadata.minZ
    || z > metadata.maxZ
  ) return null;

  let closest = null;

  for (let index = 0; index < metadata.samples.length - 1; index += 1) {
    const start = metadata.samples[index];
    const end = metadata.samples[index + 1];
    const segmentX = end.x - start.x;
    const segmentZ = end.z - start.z;
    const segmentLengthSq = segmentX * segmentX + segmentZ * segmentZ;
    const segmentT = segmentLengthSq > 0
      ? clamp(((x - start.x) * segmentX + (z - start.z) * segmentZ) / segmentLengthSq, 0, 1)
      : 0;
    const centerX = start.x + segmentX * segmentT;
    const centerZ = start.z + segmentZ * segmentT;
    const offsetX = x - centerX;
    const offsetZ = z - centerZ;
    const distanceToCenterline = Math.hypot(offsetX, offsetZ);

    if (closest && distanceToCenterline >= closest.distanceToCenterline) continue;

    let tangentX = lerp(start.tangentX, end.tangentX, segmentT);
    let tangentZ = lerp(start.tangentZ, end.tangentZ, segmentT);
    const tangentLength = Math.hypot(tangentX, tangentZ) || 1;

    tangentX /= tangentLength;
    tangentZ /= tangentLength;
    const sideX = -tangentZ;
    const sideZ = tangentX;
    const signedLateral = offsetX * sideX + offsetZ * sideZ;
    const distance = lerp(start.distance, end.distance, segmentT);
    const t = metadata.length > 0 ? distance / metadata.length : 0;

    closest = {
      centerX,
      centerZ,
      tangentX,
      tangentZ,
      sideX,
      sideZ,
      signedLateral,
      distanceToCenterline,
      distance,
      t,
      waterLevel: lerp(start.waterLevel, end.waterLevel, segmentT),
      curvature: lerp(start.curvature, end.curvature, segmentT),
    };
  }

  if (!closest) return null;

  const endpointLongitudinal = (x - closest.centerX) * closest.tangentX
    + (z - closest.centerZ) * closest.tangentZ;
  const beyondStart = closest.distance <= 1e-6 && endpointLongitudinal < 0;
  const beyondEnd = metadata.length - closest.distance <= 1e-6 && endpointLongitudinal > 0;
  const fromNode = heroNodeById.get(reach.from);
  const toNode = heroNodeById.get(reach.to);

  if (beyondStart && !['source', 'confluence'].includes(fromNode?.type)) return null;
  if (beyondEnd && toNode?.type !== 'confluence') return null;

  const waterWidth = interpolateRange(reach.width, closest.t);
  const halfWidth = waterWidth * 0.5;
  const wetBankWidth = interpolateRange(reach.wetBankWidth, closest.t);
  const baseGravelWidth = interpolateRange(reach.gravelBankWidth, closest.t);
  const terrainBlendWidth = interpolateRange(reach.terrainBlendWidth, closest.t);
  const authoredDepth = interpolateRange(reach.depth, closest.t);
  const waterLevel = closest.waterLevel;
  const sideSign = closest.signedLateral >= 0 ? 1 : -1;
  const bendStrength = smoothstep(0.0015, 0.02, Math.abs(closest.curvature));
  const bendSide = Math.sign(closest.curvature);
  const bendScale = bendSide === 0
    ? 1
    : lerp(1, sideSign === bendSide ? 1.5 : 0.7, bendStrength);
  const noiseAmplitude = reach.role === 'main' ? 1.2 : 0.6;
  const gravelNoise = getDeterministicBankNoise(
    reach.id,
    closest.distance,
    sideSign,
    noiseAmplitude,
  );
  const networkDistance = heroMaterialDistanceOffsets.get(reach.id) + closest.distance;
  const corridorFade = reach.role === 'main'
    ? smoothstep(12, 38, networkDistance)
    : 1;
  let confluenceBankBlend = 1;

  if (fromNode?.type === 'confluence') {
    confluenceBankBlend = Math.min(
      confluenceBankBlend,
      smoothstep(0, fromNode.poolRadius, closest.distance),
    );
  }
  if (toNode?.type === 'confluence') {
    confluenceBankBlend = Math.min(
      confluenceBankBlend,
      smoothstep(0, toNode.poolRadius, metadata.length - closest.distance),
    );
  }

  const gravelBankWidth = Math.max(
    0,
    (
      baseGravelWidth * lerp(1, bendScale, confluenceBankBlend)
      + gravelNoise * confluenceBankBlend
    ) * corridorFade,
  );
  const waterOuter = halfWidth;
  const wetOuter = waterOuter + wetBankWidth;
  const gravelOuter = wetOuter + gravelBankWidth;
  const blendOuter = gravelOuter + terrainBlendWidth;
  const lateralDistance = Math.abs(closest.signedLateral);
  let endpointCapFade = 1;

  if (beyondStart) {
    const capLength = fromNode.type === 'source'
      ? halfWidth + 1.25
      : Math.max(4, fromNode.poolRadius * 0.5);

    endpointCapFade = 1 - smoothstep(0, capLength, -endpointLongitudinal);
  } else if (beyondEnd) {
    endpointCapFade = 1 - smoothstep(
      0,
      Math.max(4, toNode.poolRadius * 0.5),
      endpointLongitudinal,
    );
  }

  if (endpointCapFade <= 0 || lateralDistance > blendOuter + 0.5) return null;

  const waterMask = (
    1 - smoothstep(halfWidth - 0.2, halfWidth + 0.15, lateralDistance)
  ) * endpointCapFade;
  const wetGravelOverlap = Math.min(1.6, Math.max(0.45, gravelBankWidth * 0.22));
  const wetMask = getBandMask(
    lateralDistance,
    waterOuter - 0.3,
    wetOuter + wetGravelOverlap,
    clamp(wetBankWidth * 0.45, 0.45, 1.1),
  ) * endpointCapFade;
  const gravelMaterialInner = wetOuter + wetGravelOverlap * 0.35;
  const gravelBandMask = gravelBankWidth > 0
    ? getBandMask(
      lateralDistance,
      gravelMaterialInner,
      gravelOuter,
      clamp(gravelBankWidth * 0.28, 0.8, 2.4),
    )
    : 0;
  const gravelCoverage = 0.3
    + valueNoise2D(x / 48, z / 48, 0x3571b2c9) * 0.32
    + valueNoise2D(x / 19, z / 19, 0x71a23dc5) * 0.18;
  const gravelMask = gravelBandMask * gravelCoverage * endpointCapFade;
  const vegetationMask = (1 - smoothstep(
    gravelOuter,
    gravelOuter + Math.min(terrainBlendWidth, 1.5),
    lateralDistance,
  )) * endpointCapFade;
  const baseFlowSpeed = interpolateRange(reach.flowSpeed, closest.t);
  const riffleSample = getRiffleSample(reach.riffles, closest.distance, baseFlowSpeed);
  const longitudinalRapidMask = riffleSample.rapidMask;
  const rapidMask = longitudinalRapidMask * waterMask;
  const disturbanceMask = getHeroDisturbanceMask(
    reach,
    closest.distance,
    closest.signedLateral,
    waterWidth,
  ) * waterMask;
  const depth = authoredDepth * (1 - 0.4 * longitudinalRapidMask);
  const edgeDepth = lerp(0.15, 0.25, clamp(authoredDepth / 1.5, 0, 1));
  const curvatureScale = clamp(closest.curvature * 35, -1, 1);
  const thalwegOffset = -curvatureScale * waterWidth * 0.25;
  const thalwegSpan = closest.signedLateral >= thalwegOffset
    ? halfWidth - thalwegOffset
    : halfWidth + thalwegOffset;
  const crossT = clamp(
    Math.abs(closest.signedLateral - thalwegOffset) / Math.max(thalwegSpan, 0.001),
    0,
    1,
  );
  const waterDepth = lateralDistance <= halfWidth
    ? lerp(depth, edgeDepth, smoothstep(0.05, 1, crossT))
    : 0;

  return {
    featureType: 'hero-river-reach',
    featureId: reach.id,
    reachId: reach.id,
    reach,
    center: { x: closest.centerX, z: closest.centerZ },
    tangent: { x: closest.tangentX, z: closest.tangentZ },
    side: { x: closest.sideX, z: closest.sideZ },
    distance: closest.distance,
    distanceM: closest.distance,
    networkDistance,
    normalizedDistance: closest.t,
    signedLateral: closest.signedLateral,
    lateralM: closest.signedLateral,
    lateralDistance,
    curvature: closest.curvature,
    waterLevel,
    waterWidth,
    halfWidth,
    authoredDepth,
    depth,
    waterDepth,
    edgeDepth,
    wetBankWidth,
    gravelBankWidth,
    terrainBlendWidth,
    corridorFade,
    endpointCapFade,
    corridorOuter: blendOuter,
    corridorHalfWidth: gravelOuter,
    absLateralM: lateralDistance,
    signedCorridorDistance: lateralDistance - gravelOuter,
    thalwegOffset,
    shoreDistance: halfWidth - lateralDistance,
    flowDirection: { x: closest.tangentX, z: closest.tangentZ },
    flowSpeed: riffleSample.flowSpeed,
    bedMask: waterMask,
    wetMask,
    wetBankMask: wetMask,
    gravelMask,
    gravelBankMask: gravelMask,
    underwaterMask: waterMask,
    vegetationMask,
    flowMask: waterMask,
    rapidMask,
    disturbanceMask,
  };
}

function getHeroReachTerrainTarget(baseHeight, frame) {
  const lateralDistance = frame.lateralDistance;
  const wetOuter = frame.halfWidth + frame.wetBankWidth;
  const gravelOuter = wetOuter + frame.gravelBankWidth;
  let height;
  let region;

  if (lateralDistance <= frame.halfWidth) {
    height = Math.max(0, frame.waterLevel - frame.waterDepth);
    region = 'bed';
  } else if (lateralDistance <= wetOuter) {
    const wetT = frame.wetBankWidth > 0
      ? (lateralDistance - frame.halfWidth) / frame.wetBankWidth
      : 1;

    height = lerp(
      frame.waterLevel - frame.edgeDepth,
      frame.waterLevel + 0.12,
      smoothstep(0, 1, wetT),
    );
    region = 'wet-bank';
  } else if (lateralDistance <= gravelOuter && frame.gravelBankWidth > 0) {
    const gravelT = (lateralDistance - wetOuter) / frame.gravelBankWidth;

    height = lerp(
      frame.waterLevel + 0.12,
      frame.waterLevel + 1.35,
      smoothstep(0, 1, gravelT),
    );
    region = 'gravel-bank';
  } else {
    const blendT = frame.terrainBlendWidth > 0
      ? (lateralDistance - gravelOuter) / frame.terrainBlendWidth
      : 1;
    const bankCrest = frame.waterLevel + (frame.gravelBankWidth > 0 ? 1.35 : 0.12);

    height = lerp(bankCrest, baseHeight, smoothstep(0, 1, blendT));
    region = 'terrain-blend';
  }

  height = Math.min(baseHeight, Math.max(0, height));
  height = lerp(baseHeight, height, frame.endpointCapFade);

  return {
    featureType: frame.featureType,
    featureId: frame.featureId,
    region,
    height,
    bedHeight: height,
    waterLevel: frame.waterLevel,
    mask: Math.max(frame.bedMask, frame.wetMask, frame.gravelMask, frame.vegetationMask),
    bedMask: frame.bedMask,
    wetMask: frame.wetMask,
    gravelMask: frame.gravelMask,
    vegetationMask: frame.vegetationMask,
    flowMask: frame.flowMask,
    rapidMask: frame.rapidMask,
    disturbanceMask: frame.disturbanceMask,
    frame,
  };
}

function getHeroConfluenceTerrainTarget(baseHeight, confluence, x, z) {
  const distance = Math.hypot(x - confluence.position[0], z - confluence.position[1]);
  const terrainInnerRadius = confluence.poolRadius;
  const terrainOuterRadius = terrainInnerRadius + 4;

  if (distance > terrainOuterRadius) return null;

  const radialT = clamp(distance / confluence.poolRadius, 0, 1);
  const edgeDepth = 0.2;
  const depth = lerp(
    confluence.poolDepth,
    edgeDepth,
    smoothstep(0.15, 1, radialT),
  );
  const bedHeight = Math.max(0, confluence.waterLevel - depth);
  const mask = 1 - smoothstep(terrainInnerRadius, terrainOuterRadius, distance);

  return {
    featureType: 'hero-river-confluence',
    featureId: confluence.id,
    region: 'scour-pool',
    height: Math.min(baseHeight, lerp(baseHeight, bedHeight, mask)),
    bedHeight,
    waterLevel: confluence.waterLevel,
    mask,
    bedMask: mask,
    wetMask: 0,
    gravelMask: 0,
    vegetationMask: mask,
    flowMask: mask,
    rapidMask: mask * 0.6,
    poolRadius: confluence.poolRadius,
    poolWidthScale: confluence.poolWidthScale,
  };
}

function getRiffleSample(riffles, distance, baseFlowSpeed) {
  let rapidMask = 0;
  let flowSpeed = baseFlowSpeed;

  for (const riffle of riffles ?? []) {
    const transition = Math.min(2, (riffle.endM - riffle.startM) * 0.25);
    const window = smoothstep(riffle.startM, riffle.startM + transition, distance)
      * (1 - smoothstep(riffle.endM - transition, riffle.endM, distance));
    const mask = window * riffle.strength;

    rapidMask = Math.max(rapidMask, mask);
    flowSpeed = Math.max(flowSpeed, lerp(baseFlowSpeed, riffle.speed, window));
  }

  return { rapidMask, flowSpeed };
}

function getHeroDisturbanceMask(reach, distance, lateral, width) {
  let mask = 0;

  for (const disturbance of reach.disturbances ?? []) {
    const along = distance - disturbance.distanceM;
    const alongExtent = along < 0 ? disturbance.radius : disturbance.radius * 3;
    const alongMask = 1 - smoothstep(0, alongExtent, Math.abs(along));
    const disturbanceLateral = disturbance.lateral * width * 0.5;
    const lateralMask = 1 - smoothstep(
      0,
      disturbance.radius,
      Math.abs(lateral - disturbanceLateral),
    );

    mask = Math.max(mask, disturbance.strength * alongMask * lateralMask);
  }

  return clamp(mask, 0, 1);
}

function getBandMask(distance, start, end, feather) {
  if (end <= start) return 0;

  return smoothstep(start - feather, start + feather, distance)
    * (1 - smoothstep(end - feather, end + feather, distance));
}

function getDeterministicBankNoise(id, distance, sideSign, amplitude) {
  const phase = stringHash(`${id}:${sideSign}`) / 0xffffffff * Math.PI * 2;

  return amplitude * (
    Math.sin(distance / 18 * Math.PI * 2 + phase) * 0.6
    + Math.sin(distance / 43 * Math.PI * 2 - phase * 0.73) * 0.4
  );
}

function getReachFrame(reach, x, z) {
  const metadata = reachMetadata.get(reach) ?? createReachMetadata(reach);

  if (
    x < metadata.minX
    || x > metadata.maxX
    || z < metadata.minZ
    || z > metadata.maxZ
  ) return null;

  let closest = null;

  for (let index = 0; index < metadata.samples.length - 1; index += 1) {
    const start = metadata.samples[index];
    const end = metadata.samples[index + 1];
    const segmentX = end.x - start.x;
    const segmentZ = end.z - start.z;
    const segmentLengthSq = segmentX * segmentX + segmentZ * segmentZ;
    const segmentT = segmentLengthSq > 0
      ? clamp(((x - start.x) * segmentX + (z - start.z) * segmentZ) / segmentLengthSq, 0, 1)
      : 0;
    const nearestX = start.x + segmentX * segmentT;
    const nearestZ = start.z + segmentZ * segmentT;
    const distance = Math.hypot(x - nearestX, z - nearestZ);

    if (!closest || distance < closest.distance) {
      const width = lerp(start.width, end.width, segmentT);

      closest = {
        distance,
        halfWidth: width * 0.5,
        waterLevel: lerp(start.waterLevel, end.waterLevel, segmentT),
        depth: lerp(start.depth, end.depth, segmentT),
        influence: lerp(start.influence, end.influence, segmentT),
      };
    }
  }

  return closest;
}

function chooseStrongerTarget(current, candidate) {
  if (!current || candidate.mask > current.mask) return candidate;
  if (candidate.mask === current.mask && candidate.bedHeight < current.bedHeight) return candidate;
  return current;
}

function createReachMetadata(reach) {
  const padding = Array.isArray(reach.influence)
    ? Math.max(...reach.influence)
    : reach.influence;
  const curve = new CatmullRomCurve3(
    reach.points.map(([x, z]) => new Vector3(x, 0, z)),
    false,
    'centripetal',
  );
  const sampleCount = Math.max(1, Math.ceil(curve.getLength() / 2));
  const samples = [];
  let distance = 0;

  for (let index = 0; index <= sampleCount; index += 1) {
    const t = index / sampleCount;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();

    if (index > 0) distance += point.distanceTo(samples[index - 1].point);
    samples.push({
      point,
      x: point.x,
      z: point.z,
      t,
      distance,
      tangentX: tangent.x,
      tangentZ: tangent.z,
    });
  }

  for (let index = 0; index < samples.length; index += 1) {
    const previous = samples[Math.max(0, index - 1)];
    const next = samples[Math.min(samples.length - 1, index + 1)];
    const cross = previous.tangentX * next.tangentZ - previous.tangentZ * next.tangentX;
    const dot = clamp(
      previous.tangentX * next.tangentX + previous.tangentZ * next.tangentZ,
      -1,
      1,
    );
    const arcLength = Math.max(next.distance - previous.distance, 0.001);

    samples[index].curvature = Math.atan2(cross, dot) / arcLength;
  }

  const levelProfile = createReachLevelProfile(reach);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    const distanceT = distance > 0 ? sample.distance / distance : 0;

    sample.width = interpolateRange(reach.width, sample.t);
    sample.depth = interpolateRange(reach.depth, sample.t);
    sample.influence = interpolateRange(reach.influence, sample.t);
    sample.waterLevel = sampleReachLevelProfile(levelProfile, distanceT);
    if (index > 0) sample.waterLevel = Math.min(sample.waterLevel, samples[index - 1].waterLevel);
  }
  samples[0].waterLevel = reach.waterLevels[0];
  samples.at(-1).waterLevel = reach.waterLevels.at(-1);

  return {
    length: distance,
    samples,
    levelProfile,
    minX: Math.min(...samples.map((sample) => sample.x)) - padding,
    maxX: Math.max(...samples.map((sample) => sample.x)) + padding,
    minZ: Math.min(...samples.map((sample) => sample.z)) - padding,
    maxZ: Math.max(...samples.map((sample) => sample.z)) + padding,
  };
}

function createReachLevelProfile(reach) {
  const distances = [0];
  let totalDistance = 0;

  for (let index = 1; index < reach.points.length; index += 1) {
    totalDistance += Math.hypot(
      reach.points[index][0] - reach.points[index - 1][0],
      reach.points[index][1] - reach.points[index - 1][1],
    );
    distances.push(totalDistance);
  }

  return reach.waterLevels.map((value, index) => ({
    t: totalDistance > 0 ? distances[index] / totalDistance : 0,
    value,
  }));
}

function sampleReachLevelProfile(profile, t) {
  for (let index = 1; index < profile.length; index += 1) {
    const end = profile[index];

    if (t > end.t) continue;

    const start = profile[index - 1];
    const localT = end.t > start.t ? (t - start.t) / (end.t - start.t) : 0;

    return lerp(start.value, end.value, localT);
  }

  return profile.at(-1).value;
}

function interpolateRange(range, t) {
  return Array.isArray(range) ? lerp(range[0], range.at(-1), t) : range;
}

function getShapeScale(amplitude, phase, angle) {
  return 1 + amplitude * (
    Math.sin(angle * 3 + phase) * 0.5
    + Math.sin(angle * 5 - phase * 0.7) * 0.3
    + Math.sin(angle * 7 + phase * 1.3) * 0.2
  );
}

function valueNoise2D(x, z, seed) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = smootherstep(x - x0);
  const tz = smootherstep(z - z0);
  const top = lerp(hash2D(x0, z0, seed), hash2D(x0 + 1, z0, seed), tx);
  const bottom = lerp(hash2D(x0, z0 + 1, seed), hash2D(x0 + 1, z0 + 1, seed), tx);

  return lerp(top, bottom, tz);
}

function hash2D(x, z, seed) {
  let value = (Math.imul(x, 0x1f123bb5) ^ Math.imul(z, 0x5f356495) ^ seed) >>> 0;

  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  value ^= value >>> 16;
  return (value >>> 0) / 0xffffffff;
}

function stringHash(value) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash >>> 0;
}

function smoothstep(edge0, edge1, value) {
  if (value <= edge0) return 0;
  if (value >= edge1) return 1;

  const t = (value - edge0) / (edge1 - edge0);
  return t * t * (3 - 2 * t);
}

function smootherstep(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}
