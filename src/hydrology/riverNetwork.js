import * as THREE from 'three';
import {
  ALPINE_LAKE_BOUNDARY,
  getLakeBoundary,
  getLakeBoundaryFrame,
  getLakeMaximumRadius,
  getLakeOutsideFadeFromSignedDistance,
  getLakesOutsideFade,
  hasLakeBoundary,
} from '../lakeBoundary.js';

const DEFAULT_SAMPLE_SPACING = 2;
const DEFAULT_SPATIAL_CELL_SIZE = 64;
const DEFAULT_FLOW_SPEED = 1;
const LAKE_LEVEL_BLEND_LENGTH = 12;
const ENDPOINT_EPSILON = 1e-4;
const WATER_LEVEL_EPSILON = 1e-6;
const GRASS_WET_GUARD = 0.6;
const GRASS_MINIMUM_SPARSE_WIDTH = 1.5;
const GRASS_SPARSE_ACCEPTANCE = 0.35;
const GRASS_RECOVERY_WIDTH = 2.5;
const GRASS_LAKE_HARD_BUFFER = 4;
const GRASS_SPATIAL_QUERY_PADDING = GRASS_WET_GUARD
  + GRASS_MINIMUM_SPARSE_WIDTH
  + GRASS_RECOVERY_WIDTH;

const nodes = [
  {
    id: 'source-s0-northwest',
    type: 'source',
    position: [-296, -312],
    waterLevel: 182.8,
  },
  {
    id: 'source-s1-north',
    type: 'source',
    position: [24, -192],
    waterLevel: 181.6,
  },
  {
    id: 'junction-j1',
    type: 'confluence',
    position: [16, -352],
    waterLevel: 50.6,
  },
  {
    id: 'source-s2-southwest',
    type: 'source',
    position: [-208, -556],
    waterLevel: 181.6,
  },
  {
    id: 'junction-j2',
    type: 'confluence',
    position: [92, -420],
    waterLevel: 42.8,
  },
  {
    id: 'source-s3-cirque',
    type: 'source',
    position: [40, -680],
    waterLevel: 182.8,
  },
  {
    id: 'cirque-tarn',
    type: 'lake',
    position: [76, -552],
    center: [76, -552],
    waterLevel: 49.5,
    radius: 18,
    shoreWidth: 5,
    maxDepth: 6,
    edgeDepth: 0.25,
  },
  {
    id: 'junction-j3',
    type: 'confluence',
    position: [172, -444],
    waterLevel: 39.1,
  },
  {
    id: 'source-s4-southeast',
    type: 'source',
    position: [152, -652],
    waterLevel: 182.8,
  },
  {
    id: 'junction-j4',
    type: 'confluence',
    position: [272, -460],
    waterLevel: 31.6,
  },
  {
    id: 'alpine-lake',
    type: 'lake',
    position: [300, -436],
    waterLevel: 31,
    lakeBoundary: ALPINE_LAKE_BOUNDARY,
    existing: true,
  },
];

const reaches = [
  {
    id: 's0-j1',
    from: 'source-s0-northwest',
    to: 'junction-j1',
    style: 'headwater',
    points: [
      [-296, -312], [-264, -288], [-200, -288], [-144, -316],
      [-116, -339], [-100, -348], [-52, -344], [4, -340], [16, -352],
    ],
    waterLevels: [182.8, 159.6, 107.1, 106.5, 83.5, 79.7, 53.4, 50.7, 50.6],
    width: [1.4, 2.3],
    depth: [0.25, 0.55],
    influence: [4, 6],
    vegetationBuffer: [1.5, 2.2],
  },
  {
    id: 's1-j1',
    from: 'source-s1-north',
    to: 'junction-j1',
    style: 'headwater',
    points: [[24, -192], [52, -220], [80, -256], [68, -288], [36, -308], [16, -352]],
    waterLevels: [181.6, 124.3, 65.9, 55.9, 55.4, 50.6],
    width: [1.2, 1.8],
    depth: [0.2, 0.45],
    influence: [3.5, 5.5],
    vegetationBuffer: [1.4, 2],
  },
  {
    id: 'j1-j2',
    from: 'junction-j1',
    to: 'junction-j2',
    style: 'collector',
    points: [[16, -352], [24, -396], [76, -416], [92, -420]],
    waterLevels: [50.6, 46.8, 43.5, 42.8],
    width: [2.6, 3],
    depth: [0.55, 0.7],
    influence: [6.5, 7.5],
    vegetationBuffer: [2.4, 2.8],
  },
  {
    id: 's2-j2',
    from: 'source-s2-southwest',
    to: 'junction-j2',
    style: 'headwater',
    points: [
      [-208, -556], [-160, -544], [-126, -569], [-116, -572],
      [-76, -548], [-56, -504],
      [-8, -488], [15, -478], [36, -464], [76, -428], [92, -420],
    ],
    waterLevels: [
      181.6, 140.8, 138.3, 138.3, 104.6, 72.7,
      58.8, 47.5, 44.8, 43.1, 42.8,
    ],
    width: [1.3, 2],
    depth: [0.22, 0.5],
    influence: [3.8, 6],
    vegetationBuffer: [1.5, 2.2],
  },
  {
    id: 'j2-j3',
    from: 'junction-j2',
    to: 'junction-j3',
    style: 'collector',
    points: [[92, -420], [132, -436], [152, -440], [172, -444]],
    waterLevels: [42.8, 40.3, 39.4, 39.1],
    width: [3.2, 3.8],
    depth: [0.7, 0.9],
    influence: [7.5, 8.5],
    vegetationBuffer: [2.8, 3.2],
  },
  {
    id: 's3-tarn',
    from: 'source-s3-cirque',
    to: 'cirque-tarn',
    style: 'headwater',
    points: [
      [40, -680], [0, -660], [-8, -612], [28, -580],
      [42, -573], [68, -560], [76, -552],
    ],
    waterLevels: [182.8, 154.3, 102.8, 73.5, 59.3, 50, 49.5],
    width: [1.2, 1.6],
    depth: [0.2, 0.4],
    influence: [3.5, 5],
    vegetationBuffer: [1.4, 1.8],
  },
  {
    id: 'tarn-j3',
    from: 'cirque-tarn',
    to: 'junction-j3',
    style: 'lake-outlet',
    points: [
      [76, -552], [100, -524], [104, -517], [108, -510],
      [120, -480], [152, -452], [172, -444],
    ],
    waterLevels: [49.5, 48.8, 44.7, 42.2, 42.2, 39.3, 39.1],
    width: [2, 2.4],
    depth: [0.45, 0.6],
    influence: [5.5, 6.5],
    vegetationBuffer: [2, 2.5],
  },
  {
    id: 'j3-j4',
    from: 'junction-j3',
    to: 'junction-j4',
    style: 'collector',
    points: [[172, -444], [196, -444], [252, -460], [272, -460]],
    waterLevels: [39.1, 36.2, 32, 31.6],
    width: [4, 4.6],
    depth: [0.9, 1.1],
    influence: [8.5, 9.5],
    vegetationBuffer: [3.2, 3.7],
  },
  {
    id: 's4-j4',
    from: 'source-s4-southeast',
    to: 'junction-j4',
    style: 'headwater',
    points: [
      [152, -652], [184, -620], [208, -588], [220, -548],
      [220, -504], [252, -476], [272, -460],
    ],
    waterLevels: [182.8, 104.7, 71.3, 48.5, 34, 31.9, 31.6],
    width: [1.3, 2.1],
    depth: [0.22, 0.52],
    influence: [3.8, 6.2],
    vegetationBuffer: [1.5, 2.3],
  },
  {
    id: 'j4-alpine-lake',
    from: 'junction-j4',
    to: 'alpine-lake',
    style: 'lake-inlet',
    points: [[272, -460], [286, -454], [298, -450], [302, -444], [300, -436]],
    waterLevels: [31.6, 31.4, 31.2, 31.1, 31],
    width: [4.8, 5.2],
    depth: [1.1, 1.25],
    influence: [9.5, 10.5],
    vegetationBuffer: [3.7, 4],
  },
];

export const RIVER_NETWORK_DEFINITION = Object.freeze({
  nodes: Object.freeze(nodes.map(freezeNode)),
  reaches: Object.freeze(reaches.map(freezeReach)),
});

export function validateRiverNetworkDefinition(definition) {
  buildGraph(definition);
  return true;
}

export function compileRiverNetwork(definition, options = {}) {
  const graph = buildGraph(definition);
  const sampleSpacing = options.sampleSpacing ?? DEFAULT_SAMPLE_SPACING;
  const spatialCellSize = options.spatialCellSize ?? DEFAULT_SPATIAL_CELL_SIZE;

  if (!(sampleSpacing > 0)) throw new Error('River sample spacing must be greater than zero.');
  if (!(spatialCellSize > 0)) throw new Error('River spatial cell size must be greater than zero.');

  const nodeOrder = new Map(graph.topologicalNodeIds.map((id, index) => [id, index]));
  const compiledReaches = definition.reaches
    .map((reach) => compileReach(reach, graph.nodeById, sampleSpacing))
    .sort((a, b) => nodeOrder.get(a.from) - nodeOrder.get(b.from));
  const lakeFeatures = definition.nodes.filter(
    (node) => node.type === 'lake' && hasLakeBoundary(node),
  );
  const featureBounds = createFeatureBounds(compiledReaches, lakeFeatures);

  return {
    definition,
    nodeById: graph.nodeById,
    incomingByNode: graph.incomingByNode,
    outgoingByNode: graph.outgoingByNode,
    topologicalNodeIds: graph.topologicalNodeIds,
    reaches: compiledReaches,
    reachById: new Map(compiledReaches.map((reach) => [reach.id, reach])),
    lakeFeatures,
    featureBounds,
    bounds: combineBounds(featureBounds),
    spatialCellSize,
    spatialIndex: createSpatialIndex(compiledReaches, spatialCellSize),
  };
}

export const RIVER_NETWORK = compileRiverNetwork(RIVER_NETWORK_DEFINITION);

export function fitRiverNetworkWaterLevelsToTerrain(
  network,
  getBaseHeight,
  options = {},
) {
  if (!network?.reaches?.length || !network.nodeById) {
    throw new Error('Compiled river network is required to fit water levels.');
  }
  if (typeof getBaseHeight !== 'function') {
    throw new Error('River terrain fitting requires a base-height sampler.');
  }

  const surfaceInset = options.surfaceInset ?? 0.2;
  const fitNodes = options.fitNodes ?? false;

  if (!(surfaceInset >= 0)) {
    throw new Error('River terrain fitting surface inset must be non-negative.');
  }

  if (fitNodes) {
    for (const nodeId of network.topologicalNodeIds) {
      const node = network.nodeById.get(nodeId);
      let fittedLevel = Math.min(
        node.waterLevel,
        getBaseHeight(node.position[0], node.position[1]) - surfaceInset,
      );

      for (const authoredReach of network.incomingByNode.get(nodeId)) {
        const reach = network.reachById.get(authoredReach.id);
        const upstreamLevel = network.nodeById.get(reach.from).waterLevel;
        const terrainCeiling = Math.min(...reach.samples.map((sample) => (
          getBaseHeight(sample.point.x, sample.point.z) - surfaceInset
        )));

        fittedLevel = Math.min(fittedLevel, upstreamLevel, terrainCeiling);
      }

      if (!Number.isFinite(fittedLevel)) {
        throw new Error(`River terrain sampler returned an invalid height for node ${node.id}.`);
      }

      node.waterLevel = fittedLevel;
      if (node.lakeBoundary) node.lakeBoundary.waterLevel = fittedLevel;
    }
  }

  for (const reach of network.reaches) {
    const startLevel = network.nodeById.get(reach.from).waterLevel;
    const endLevel = network.nodeById.get(reach.to).waterLevel;
    let previousLevel = startLevel;

    reach.samples[0].waterLevel = startLevel;

    for (let index = 1; index < reach.samples.length - 1; index += 1) {
      const sample = reach.samples[index];
      const terrainCeiling = getBaseHeight(sample.point.x, sample.point.z) - surfaceInset;

      if (!Number.isFinite(terrainCeiling)) {
        throw new Error(`River terrain sampler returned an invalid height for ${reach.id}.`);
      }

      sample.waterLevel = Math.max(
        endLevel,
        Math.min(sample.waterLevel, terrainCeiling, previousLevel),
      );
      previousLevel = sample.waterLevel;
    }

    reach.samples.at(-1).waterLevel = endLevel;
  }

  return network;
}

export function getNearestRiverReach(
  x,
  z,
  maxDistance = Infinity,
  network = RIVER_NETWORK,
) {
  const candidates = Number.isFinite(maxDistance)
    ? getSpatialCandidates(network, x, z, Math.max(maxDistance, 0))
    : network.reaches;
  let closest = null;

  for (const reach of candidates) {
    const frame = getClosestReachFrame(reach, x, z);

    if (!frame || frame.distance > maxDistance) continue;
    if (
      closest
      && frame.distanceSq > closest.distanceSq + Number.EPSILON
    ) continue;
    if (
      closest
      && Math.abs(frame.distanceSq - closest.distanceSq) <= Number.EPSILON
      && frame.width <= closest.width
    ) continue;

    closest = frame;
  }

  return closest;
}

export function getRiverBankGrassAcceptance(frame) {
  const hasAuthoredBankWidths = frame.hasAuthoredBankWidths
    ?? (frame.wetBankWidth > 0 || frame.gravelBankWidth > 0);
  const wetMaterialOuter = hasAuthoredBankWidths
    ? frame.halfWidth + (frame.wetBankWidth ?? 0)
    : Math.min(frame.influence, frame.halfWidth + 3);
  const wetOuter = wetMaterialOuter + GRASS_WET_GUARD;
  const bankOuter = hasAuthoredBankWidths
    ? frame.halfWidth + (frame.wetBankWidth ?? 0) + (frame.gravelBankWidth ?? 0)
    : frame.influence;
  const sparseOuter = Math.max(
    bankOuter,
    wetOuter + GRASS_MINIMUM_SPARSE_WIDTH,
  );

  if (frame.distance <= wetOuter) return 0;
  if (frame.distance <= sparseOuter) {
    return GRASS_SPARSE_ACCEPTANCE
      * smoothstep(wetOuter, sparseOuter, frame.distance);
  }

  return THREE.MathUtils.lerp(
    GRASS_SPARSE_ACCEPTANCE,
    1,
    smoothstep(sparseOuter, sparseOuter + GRASS_RECOVERY_WIDTH, frame.distance),
  );
}

export function getRiverNetworkGrassAcceptance(x, z, network = RIVER_NETWORK) {
  for (const lake of network.lakeFeatures) {
    const boundary = getLakeBoundary(lake);
    const frame = getLakeBoundaryFrame(boundary, x, z);

    if (frame.signedDistance <= (boundary.shoreWidth ?? 0) + GRASS_LAKE_HARD_BUFFER) {
      return 0;
    }
  }

  let acceptance = 1;

  for (const reach of getSpatialCandidates(
    network,
    x,
    z,
    GRASS_SPATIAL_QUERY_PADDING,
  )) {
    const frame = getClosestReachFrame(reach, x, z);

    if (!frame) continue;
    acceptance = Math.min(acceptance, getRiverBankGrassAcceptance(frame));
  }

  return acceptance;
}

export function getRiverNetworkTerrainTarget(
  baseHeight,
  x,
  z,
  network = RIVER_NETWORK,
) {
  let result = null;
  const candidates = getSpatialCandidates(network, x, z, 0);
  const sceneLakeFade = candidates.size > 0
    ? getLakesOutsideFade(network.lakeFeatures, x, z)
    : 1;

  for (const reach of candidates) {
    const frame = getClosestReachFrame(reach, x, z);

    if (!frame || frame.distance > frame.influence || sceneLakeFade <= 0) continue;

    const lakeTransition = getReachLakeTransition(reach, frame, x, z, network);
    const waterLevel = lakeTransition
      ? THREE.MathUtils.lerp(
        lakeTransition.boundary.waterLevel,
        frame.waterLevel,
        smoothstep(0, LAKE_LEVEL_BLEND_LENGTH, lakeTransition.centerlineDistance),
      )
      : frame.waterLevel;

    const coreMask = 1 - smoothstep(frame.halfWidth * 0.65, frame.halfWidth, frame.distance);
    const bankMask = 1 - smoothstep(frame.halfWidth, frame.influence, frame.distance);
    const carveMask = Math.max(coreMask, bankMask * 0.22);
    const riverBedHeight = waterLevel - frame.depth;
    const bedHeight = lakeTransition && lakeTransition.fade < 1
      ? THREE.MathUtils.lerp(
        lakeTransition.boundary.waterLevel - lakeTransition.boundary.edgeDepth,
        riverBedHeight,
        lakeTransition.fade,
      )
      : riverBedHeight;
    const terrainHeight = Math.min(
      baseHeight,
      THREE.MathUtils.lerp(baseHeight, bedHeight, carveMask),
    );

    if (result && terrainHeight >= result.terrainHeight) continue;

    result = {
      featureType: 'reach',
      featureId: reach.id,
      terrainHeight,
      waterLevel,
      bedHeight,
      carveMask,
    };
  }

  for (const lake of network.lakeFeatures) {
    const boundary = getLakeBoundary(lake);
    const frame = getLakeBoundaryFrame(boundary, x, z);

    if (frame.signedDistance > 1e-6) continue;

    const depthT = smoothstep(0.18, 1, frame.normalizedRadius);
    const depth = THREE.MathUtils.lerp(boundary.maxDepth, boundary.edgeDepth, depthT);
    const bedHeight = boundary.waterLevel - depth;
    const terrainHeight = Math.min(baseHeight, bedHeight);

    if (result && terrainHeight >= result.terrainHeight) continue;

    result = {
      featureType: 'lake',
      featureId: boundary.id,
      terrainHeight,
      waterLevel: boundary.waterLevel,
      bedHeight,
      carveMask: 1,
    };
  }

  return result;
}

function getReachLakeTransition(reach, frame, x, z, network) {
  let closest = null;

  for (const nodeId of [reach.from, reach.to]) {
    const node = network.nodeById.get(nodeId);

    if (node?.type !== 'lake' || !hasLakeBoundary(node)) continue;

    const boundary = getLakeBoundary(node);
    const sampleFrame = getLakeBoundaryFrame(boundary, x, z);
    const centerlineFrame = getLakeBoundaryFrame(boundary, frame.x, frame.z);
    const distance = Math.max(centerlineFrame.signedDistance, 0);

    if (closest && distance >= closest.centerlineDistance) continue;

    closest = {
      boundary,
      centerlineDistance: distance,
      fade: getLakeOutsideFadeFromSignedDistance(sampleFrame.signedDistance),
    };
  }

  return closest;
}

export function applyRiverNetworkTerrain(baseHeight, x, z, network = RIVER_NETWORK) {
  return getRiverNetworkTerrainTarget(baseHeight, x, z, network)?.terrainHeight ?? baseHeight;
}

export function isInRiverNetworkVegetationExclusion(
  x,
  z,
  buffer = 0,
  network = RIVER_NETWORK,
) {
  for (const reach of getSpatialCandidates(network, x, z, Math.max(buffer, 0))) {
    const frame = getClosestReachFrame(reach, x, z);

    if (frame && frame.distance <= frame.halfWidth + frame.vegetationBuffer + buffer) {
      return true;
    }
  }

  for (const lake of network.lakeFeatures) {
    const boundary = getLakeBoundary(lake);
    const frame = getLakeBoundaryFrame(boundary, x, z);

    if (frame.signedDistance <= boundary.shoreWidth + buffer) return true;
  }

  return false;
}

export function getRiverNetworkFeatureBounds(network = RIVER_NETWORK) {
  return network.featureBounds.map((bounds) => ({ ...bounds }));
}

function buildGraph(definition) {
  if (!definition || !Array.isArray(definition.nodes) || !Array.isArray(definition.reaches)) {
    throw new Error('River network requires node and reach arrays.');
  }

  const nodeById = new Map();
  const incomingByNode = new Map();
  const outgoingByNode = new Map();
  const reachIds = new Set();

  for (const node of definition.nodes) {
    if (!node.id || nodeById.has(node.id)) throw new Error(`Duplicate river node: ${node.id}`);
    if (!isPoint(node.position)) throw new Error(`River node ${node.id} has an invalid position.`);
    if (!Number.isFinite(node.waterLevel)) throw new Error(`River node ${node.id} has an invalid water level.`);
    validateOptionalNonNegative(node.poolRadius, `River node ${node.id} pool radius`);
    validateOptionalNonNegative(node.poolDepth, `River node ${node.id} pool depth`);
    if (
      node.poolWidthScale !== undefined
      && (!Number.isFinite(node.poolWidthScale) || node.poolWidthScale <= 0)
    ) {
      throw new Error(`River node ${node.id} pool width scale must be greater than zero.`);
    }

    nodeById.set(node.id, node);
    incomingByNode.set(node.id, []);
    outgoingByNode.set(node.id, []);
  }

  for (const reach of definition.reaches) {
    if (!reach.id || reachIds.has(reach.id)) throw new Error(`Duplicate river reach: ${reach.id}`);

    reachIds.add(reach.id);
    const from = nodeById.get(reach.from);
    const to = nodeById.get(reach.to);

    if (!from || !to) throw new Error(`River reach ${reach.id} references an unknown node.`);
    if (from === to) throw new Error(`River reach ${reach.id} cannot loop to the same node.`);
    if (!Array.isArray(reach.points) || reach.points.length < 2 || !reach.points.every(isPoint)) {
      throw new Error(`River reach ${reach.id} requires at least two valid points.`);
    }
    if (reach.waterLevels) {
      if (
        !Array.isArray(reach.waterLevels)
        || reach.waterLevels.length !== reach.points.length
        || !reach.waterLevels.every(Number.isFinite)
      ) {
        throw new Error(`River reach ${reach.id} water levels must match its control points.`);
      }
      if (
        Math.abs(reach.waterLevels[0] - from.waterLevel) > WATER_LEVEL_EPSILON
        || Math.abs(reach.waterLevels.at(-1) - to.waterLevel) > WATER_LEVEL_EPSILON
      ) {
        throw new Error(`River reach ${reach.id} water levels must match its nodes.`);
      }
      for (let index = 1; index < reach.waterLevels.length; index += 1) {
        if (reach.waterLevels[index] > reach.waterLevels[index - 1] + WATER_LEVEL_EPSILON) {
          throw new Error(`River reach ${reach.id} authored water levels rise downstream.`);
        }
      }
    }
    if (!pointsMatch(reach.points[0], from.position)) {
      throw new Error(`River reach ${reach.id} must start at node ${from.id}.`);
    }
    if (!pointsMatch(reach.points.at(-1), to.position)) {
      throw new Error(`River reach ${reach.id} must end at node ${to.id}.`);
    }
    if (from.waterLevel + WATER_LEVEL_EPSILON < to.waterLevel) {
      throw new Error(`River reach ${reach.id} rises downstream.`);
    }
    validateOptionalRange(reach.wetBankWidth, `River reach ${reach.id} wet bank width`);
    validateOptionalRange(reach.gravelBankWidth, `River reach ${reach.id} gravel bank width`);
    validateOptionalRange(reach.terrainBlendWidth, `River reach ${reach.id} terrain blend width`);
    validateOptionalRange(reach.flowSpeed, `River reach ${reach.id} flow speed`);
    validateRiffles(reach.riffles, reach.id);
    validateDisturbances(reach.disturbances, reach.id);

    incomingByNode.get(to.id).push(reach);
    outgoingByNode.get(from.id).push(reach);
  }

  const indegree = new Map(
    definition.nodes.map((node) => [node.id, incomingByNode.get(node.id).length]),
  );
  const queue = definition.nodes
    .filter((node) => indegree.get(node.id) === 0)
    .map((node) => node.id);
  const topologicalNodeIds = [];

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const nodeId = queue[cursor];

    topologicalNodeIds.push(nodeId);

    for (const reach of outgoingByNode.get(nodeId)) {
      const nextIndegree = indegree.get(reach.to) - 1;

      indegree.set(reach.to, nextIndegree);
      if (nextIndegree === 0) queue.push(reach.to);
    }
  }

  if (topologicalNodeIds.length !== definition.nodes.length) {
    throw new Error('River network must be acyclic.');
  }

  const sinks = definition.nodes.filter((node) => outgoingByNode.get(node.id).length === 0);

  if (sinks.length !== 1) throw new Error('River network must have exactly one downstream sink.');

  for (const node of definition.nodes) {
    const incoming = incomingByNode.get(node.id).length;
    const outgoing = outgoingByNode.get(node.id).length;

    if (outgoing > 1) throw new Error(`River node ${node.id} has more than one downstream reach.`);
    if (node.type === 'source' && incoming !== 0) {
      throw new Error(`River source ${node.id} cannot have an incoming reach.`);
    }
    if (node.type === 'confluence' && incoming < 2) {
      throw new Error(`River confluence ${node.id} requires at least two incoming reaches.`);
    }
  }

  return {
    nodeById,
    incomingByNode,
    outgoingByNode,
    topologicalNodeIds,
  };
}

function compileReach(reach, nodeById, sampleSpacing) {
  const from = nodeById.get(reach.from);
  const to = nodeById.get(reach.to);
  const curve = new THREE.CatmullRomCurve3(
    reach.points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal',
  );
  const width = normalizeRange(reach.width, `River reach ${reach.id} width`);
  const depth = normalizeRange(reach.depth, `River reach ${reach.id} depth`);
  const influence = normalizeRange(reach.influence, `River reach ${reach.id} influence`);
  const vegetationBuffer = normalizeRange(
    reach.vegetationBuffer ?? 0,
    `River reach ${reach.id} vegetation buffer`,
  );
  const wetBankWidth = normalizeRange(
    reach.wetBankWidth ?? 0,
    `River reach ${reach.id} wet bank width`,
  );
  const gravelBankWidth = normalizeRange(
    reach.gravelBankWidth ?? 0,
    `River reach ${reach.id} gravel bank width`,
  );
  const terrainBlendWidth = normalizeRange(
    reach.terrainBlendWidth ?? 0,
    `River reach ${reach.id} terrain blend width`,
  );
  const flowSpeed = normalizeRange(
    reach.flowSpeed ?? DEFAULT_FLOW_SPEED,
    `River reach ${reach.id} flow speed`,
  );
  const riffles = reach.riffles ?? [];
  const disturbances = reach.disturbances ?? [];
  const hasAuthoredBankWidths = reach.wetBankWidth !== undefined
    || reach.gravelBankWidth !== undefined;
  const waterLevelProfile = createWaterLevelProfile(reach, from, to);
  const sampleCount = Math.max(1, Math.ceil(curve.getLength() / sampleSpacing));
  const samples = [];
  let distance = 0;

  for (let index = 0; index <= sampleCount; index += 1) {
    const t = index / sampleCount;
    const point = curve.getPointAt(t);

    if (index > 0) distance += point.distanceTo(samples[index - 1].point);

    samples.push({
      point,
      t,
      distance,
      width: THREE.MathUtils.lerp(width[0], width[1], t),
      depth: THREE.MathUtils.lerp(depth[0], depth[1], t),
      influence: THREE.MathUtils.lerp(influence[0], influence[1], t),
      vegetationBuffer: THREE.MathUtils.lerp(vegetationBuffer[0], vegetationBuffer[1], t),
      wetBankWidth: THREE.MathUtils.lerp(wetBankWidth[0], wetBankWidth[1], t),
      gravelBankWidth: THREE.MathUtils.lerp(gravelBankWidth[0], gravelBankWidth[1], t),
      terrainBlendWidth: THREE.MathUtils.lerp(terrainBlendWidth[0], terrainBlendWidth[1], t),
    });
  }

  for (const riffle of riffles) {
    if (riffle.endM > distance + ENDPOINT_EPSILON) {
      throw new Error(`River reach ${reach.id} riffle extends beyond the compiled reach.`);
    }
  }
  for (const disturbance of disturbances) {
    if (disturbance.distanceM > distance + ENDPOINT_EPSILON) {
      throw new Error(`River reach ${reach.id} disturbance lies beyond the compiled reach.`);
    }
  }

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    const distanceT = distance > 0 ? sample.distance / distance : 0;
    const authoredLevel = sampleProfile(waterLevelProfile, distanceT);
    const previousLevel = index > 0 ? samples[index - 1].waterLevel : from.waterLevel;
    const baseFlowSpeed = THREE.MathUtils.lerp(flowSpeed[0], flowSpeed[1], distanceT);
    const riffleSample = sampleRiffles(riffles, sample.distance, baseFlowSpeed);

    sample.waterLevel = THREE.MathUtils.clamp(authoredLevel, to.waterLevel, previousLevel);
    sample.flowSpeed = riffleSample.flowSpeed;
    sample.rapidMask = riffleSample.rapidMask;
  }
  samples[0].waterLevel = from.waterLevel;
  samples.at(-1).waterLevel = to.waterLevel;

  const maxPadding = Math.max(
    ...samples.map((sample) => Math.max(
      sample.influence,
      sample.width * 0.5 + sample.vegetationBuffer,
      sample.width * 0.5
        + sample.wetBankWidth
        + sample.gravelBankWidth
        + sample.terrainBlendWidth,
    )),
  );

  return {
    ...reach,
    wetBankWidth,
    gravelBankWidth,
    terrainBlendWidth,
    flowSpeed,
    riffles,
    disturbances,
    hasAuthoredBankWidths,
    curve,
    samples,
    length: distance,
    bounds: createReachBounds(samples, maxPadding),
  };
}

function getClosestReachFrame(reach, x, z) {
  let closest = null;

  for (let index = 0; index < reach.samples.length - 1; index += 1) {
    const start = reach.samples[index];
    const end = reach.samples[index + 1];
    const segmentX = end.point.x - start.point.x;
    const segmentZ = end.point.z - start.point.z;
    const lengthSq = segmentX * segmentX + segmentZ * segmentZ;
    const segmentT = lengthSq > 0
      ? THREE.MathUtils.clamp(
        ((x - start.point.x) * segmentX + (z - start.point.z) * segmentZ) / lengthSq,
        0,
        1,
      )
      : 0;
    const nearestX = start.point.x + segmentX * segmentT;
    const nearestZ = start.point.z + segmentZ * segmentT;
    const deltaX = x - nearestX;
    const deltaZ = z - nearestZ;
    const distanceSq = deltaX * deltaX + deltaZ * deltaZ;

    if (closest && distanceSq >= closest.distanceSq) continue;

    const segmentLength = Math.sqrt(lengthSq) || 1;
    const width = THREE.MathUtils.lerp(start.width, end.width, segmentT);

    closest = {
      reachId: reach.id,
      from: reach.from,
      to: reach.to,
      distanceSq,
      distance: Math.sqrt(distanceSq),
      lateral: deltaX * (-segmentZ / segmentLength) + deltaZ * (segmentX / segmentLength),
      along: THREE.MathUtils.lerp(start.distance, end.distance, segmentT),
      t: THREE.MathUtils.lerp(start.t, end.t, segmentT),
      x: nearestX,
      z: nearestZ,
      waterLevel: THREE.MathUtils.lerp(start.waterLevel, end.waterLevel, segmentT),
      width,
      halfWidth: width * 0.5,
      depth: THREE.MathUtils.lerp(start.depth, end.depth, segmentT),
      influence: THREE.MathUtils.lerp(start.influence, end.influence, segmentT),
      vegetationBuffer: THREE.MathUtils.lerp(
        start.vegetationBuffer,
        end.vegetationBuffer,
        segmentT,
      ),
      wetBankWidth: THREE.MathUtils.lerp(start.wetBankWidth, end.wetBankWidth, segmentT),
      gravelBankWidth: THREE.MathUtils.lerp(
        start.gravelBankWidth,
        end.gravelBankWidth,
        segmentT,
      ),
      hasAuthoredBankWidths: reach.hasAuthoredBankWidths,
      terrainBlendWidth: THREE.MathUtils.lerp(
        start.terrainBlendWidth,
        end.terrainBlendWidth,
        segmentT,
      ),
      flowSpeed: THREE.MathUtils.lerp(start.flowSpeed, end.flowSpeed, segmentT),
      rapidMask: THREE.MathUtils.lerp(start.rapidMask, end.rapidMask, segmentT),
    };
  }

  return closest;
}

function createSpatialIndex(compiledReaches, cellSize) {
  const index = new Map();

  for (const reach of compiledReaches) {
    visitCells(reach.bounds, cellSize, (cellX, cellZ) => {
      const key = getCellKey(cellX, cellZ);
      const cell = index.get(key) ?? [];

      cell.push(reach);
      index.set(key, cell);
    });
  }

  return index;
}

function getSpatialCandidates(network, x, z, radius) {
  const bounds = {
    minX: x - radius,
    maxX: x + radius,
    minZ: z - radius,
    maxZ: z + radius,
  };
  const candidates = new Set();

  visitCells(bounds, network.spatialCellSize, (cellX, cellZ) => {
    for (const reach of network.spatialIndex.get(getCellKey(cellX, cellZ)) ?? []) {
      candidates.add(reach);
    }
  });

  return candidates;
}

function createFeatureBounds(compiledReaches, lakeFeatures) {
  const bounds = compiledReaches.map((reach) => ({
    id: reach.id,
    type: 'reach',
    ...reach.bounds,
  }));

  for (const lake of lakeFeatures) {
    const boundary = getLakeBoundary(lake);
    const center = boundary.center ?? boundary.position;
    const centerX = boundary.cx ?? center[0];
    const centerZ = boundary.cz ?? center[1];
    const radius = getLakeMaximumRadius(boundary) + boundary.shoreWidth;

    bounds.push({
      id: lake.id,
      type: 'lake',
      minX: centerX - radius,
      maxX: centerX + radius,
      minZ: centerZ - radius,
      maxZ: centerZ + radius,
    });
  }

  return bounds;
}

function createReachBounds(samples, padding) {
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };

  for (const sample of samples) {
    bounds.minX = Math.min(bounds.minX, sample.point.x - padding);
    bounds.maxX = Math.max(bounds.maxX, sample.point.x + padding);
    bounds.minZ = Math.min(bounds.minZ, sample.point.z - padding);
    bounds.maxZ = Math.max(bounds.maxZ, sample.point.z + padding);
  }

  return bounds;
}

function combineBounds(boundsList) {
  return boundsList.reduce((combined, bounds) => ({
    minX: Math.min(combined.minX, bounds.minX),
    maxX: Math.max(combined.maxX, bounds.maxX),
    minZ: Math.min(combined.minZ, bounds.minZ),
    maxZ: Math.max(combined.maxZ, bounds.maxZ),
  }), {
    minX: Infinity,
    maxX: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  });
}

function visitCells(bounds, cellSize, callback) {
  const minCellX = Math.floor(bounds.minX / cellSize);
  const maxCellX = Math.floor(bounds.maxX / cellSize);
  const minCellZ = Math.floor(bounds.minZ / cellSize);
  const maxCellZ = Math.floor(bounds.maxZ / cellSize);

  for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
    for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
      callback(cellX, cellZ);
    }
  }
}

function getCellKey(cellX, cellZ) {
  return `${cellX}:${cellZ}`;
}

function normalizeRange(value, label) {
  const range = Array.isArray(value) ? value : [value, value];

  if (range.length !== 2 || !range.every((entry) => Number.isFinite(entry) && entry >= 0)) {
    throw new Error(`${label} must be a non-negative number or pair.`);
  }

  return range;
}

function validateOptionalRange(value, label) {
  if (value !== undefined) normalizeRange(value, label);
}

function validateOptionalNonNegative(value, label) {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
    throw new Error(`${label} must be a non-negative number.`);
  }
}

function validateRiffles(riffles, reachId) {
  if (riffles === undefined) return;
  if (!Array.isArray(riffles)) {
    throw new Error(`River reach ${reachId} riffles must be an array.`);
  }

  for (const riffle of riffles) {
    if (
      !riffle
      || !Number.isFinite(riffle.startM)
      || !Number.isFinite(riffle.endM)
      || riffle.startM < 0
      || riffle.endM <= riffle.startM
    ) {
      throw new Error(`River reach ${reachId} has an invalid riffle distance range.`);
    }
    if (!Number.isFinite(riffle.strength) || riffle.strength < 0 || riffle.strength > 1) {
      throw new Error(`River reach ${reachId} riffle strength must be between zero and one.`);
    }
    if (!Number.isFinite(riffle.speed) || riffle.speed < 0) {
      throw new Error(`River reach ${reachId} riffle speed must be a non-negative number.`);
    }
  }
}

function validateDisturbances(disturbances, reachId) {
  if (disturbances === undefined) return;
  if (!Array.isArray(disturbances)) {
    throw new Error(`River reach ${reachId} disturbances must be an array.`);
  }

  for (const disturbance of disturbances) {
    if (
      !disturbance
      || !Number.isFinite(disturbance.distanceM)
      || disturbance.distanceM < 0
    ) {
      throw new Error(`River reach ${reachId} has an invalid disturbance distance.`);
    }
    if (
      !Number.isFinite(disturbance.lateral)
      || disturbance.lateral < -1
      || disturbance.lateral > 1
    ) {
      throw new Error(`River reach ${reachId} disturbance lateral must be between -1 and one.`);
    }
    if (!Number.isFinite(disturbance.radius) || disturbance.radius <= 0) {
      throw new Error(`River reach ${reachId} disturbance radius must be greater than zero.`);
    }
    if (
      !Number.isFinite(disturbance.strength)
      || disturbance.strength < 0
      || disturbance.strength > 1
    ) {
      throw new Error(`River reach ${reachId} disturbance strength must be between zero and one.`);
    }
  }
}

function sampleRiffles(riffles, distance, baseFlowSpeed) {
  let flowSpeed = baseFlowSpeed;
  let rapidMask = 0;

  for (const riffle of riffles) {
    const transition = Math.min(2, (riffle.endM - riffle.startM) * 0.25);
    const window = smoothstep(riffle.startM, riffle.startM + transition, distance)
      * (1 - smoothstep(riffle.endM - transition, riffle.endM, distance));

    rapidMask = Math.max(rapidMask, riffle.strength * window);
    flowSpeed = Math.max(flowSpeed, THREE.MathUtils.lerp(baseFlowSpeed, riffle.speed, window));
  }

  return { flowSpeed, rapidMask };
}

function createWaterLevelProfile(reach, from, to) {
  if (!reach.waterLevels) {
    return [
      { t: 0, value: from.waterLevel },
      { t: 1, value: to.waterLevel },
    ];
  }

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

function sampleProfile(profile, t) {
  for (let index = 1; index < profile.length; index += 1) {
    const end = profile[index];

    if (t > end.t) continue;

    const start = profile[index - 1];
    const localT = end.t > start.t ? (t - start.t) / (end.t - start.t) : 0;

    return THREE.MathUtils.lerp(start.value, end.value, localT);
  }

  return profile.at(-1).value;
}

function isPoint(point) {
  return Array.isArray(point)
    && point.length === 2
    && point.every((value) => Number.isFinite(value));
}

function pointsMatch(a, b) {
  return Math.abs(a[0] - b[0]) <= ENDPOINT_EPSILON
    && Math.abs(a[1] - b[1]) <= ENDPOINT_EPSILON;
}

function freezeNode(node) {
  return Object.freeze({
    ...node,
    position: Object.freeze([...node.position]),
    ...(node.center ? { center: Object.freeze([...node.center]) } : {}),
  });
}

function freezeReach(reach) {
  return Object.freeze({
    ...reach,
    points: Object.freeze(reach.points.map((point) => Object.freeze([...point]))),
    width: Object.freeze([...reach.width]),
    depth: Object.freeze([...reach.depth]),
    influence: Object.freeze([...reach.influence]),
    vegetationBuffer: Object.freeze([...reach.vegetationBuffer]),
    ...(reach.wetBankWidth !== undefined
      ? { wetBankWidth: freezeRange(reach.wetBankWidth) }
      : {}),
    ...(reach.gravelBankWidth !== undefined
      ? { gravelBankWidth: freezeRange(reach.gravelBankWidth) }
      : {}),
    ...(reach.terrainBlendWidth !== undefined
      ? { terrainBlendWidth: freezeRange(reach.terrainBlendWidth) }
      : {}),
    ...(reach.flowSpeed !== undefined
      ? { flowSpeed: freezeRange(reach.flowSpeed) }
      : {}),
    ...(reach.riffles
      ? { riffles: Object.freeze(reach.riffles.map((riffle) => Object.freeze({ ...riffle }))) }
      : {}),
    ...(reach.disturbances
      ? {
        disturbances: Object.freeze(
          reach.disturbances.map((disturbance) => Object.freeze({ ...disturbance })),
        ),
      }
      : {}),
    ...(reach.waterLevels
      ? { waterLevels: Object.freeze([...reach.waterLevels]) }
      : {}),
  });
}

function freezeRange(value) {
  return Object.freeze(Array.isArray(value) ? [...value] : [value, value]);
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;

  const amount = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return amount * amount * (3 - 2 * amount);
}
