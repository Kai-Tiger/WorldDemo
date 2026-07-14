import * as THREE from 'three';
import { RIVER_NETWORK } from './riverNetwork.js';
import {
  RIVER_LAKE_FADE_LENGTH,
  findLakeBoundaryIntersection,
  getLakeBoundary,
  getLakeBoundaryFrame,
  getLakeOutsideFade,
  hasLakeBoundary,
  projectPointToLakeBoundary,
} from '../lakeBoundary.js';

const MAX_TRIANGLES = 12000;
const SLOPE_FADE_START = 18;
const SLOPE_HIDDEN = 32;
const STYLE_TESSELLATION = {
  trunk: { spacing: 0.75, lateralSegments: 8 },
  headwater: { spacing: 2.5, lateralSegments: 3 },
  collector: { spacing: 2, lateralSegments: 4 },
  'lake-outlet': { spacing: 1.75, lateralSegments: 4 },
  'lake-inlet': { spacing: 1.5, lateralSegments: 5 },
};
const DISTURBANCE_TESSELLATION = { spacing: 0.6, lateralSegments: 8 };
const DEFAULT_TESSELLATION = { spacing: 2, lateralSegments: 4 };
const STYLE_VIEW_DISTANCE = {
  trunk: 300,
  headwater: 180,
  collector: 260,
  'lake-outlet': 260,
  'lake-inlet': 300,
};
const DEFAULT_VIEW_DISTANCE = 260;
const CONFLUENCE_ARM_CLEARANCE = 0.75;
const CONFLUENCE_TRIM_STEP = 1;
const CONFLUENCE_ARC_STEP = Math.PI / 24;
const CONFLUENCE_RADIAL_SPACING = 4;
const MAX_CONFLUENCE_RADIAL_SEGMENTS = 6;
const LAKE_LEVEL_BLEND_LENGTH = 12;

export function createRiverNetworkWaterGeometry(network = RIVER_NETWORK, terrain) {
  if (!network?.reaches?.length || !network.nodeById) {
    throw new Error('Compiled river network is required to build water geometry.');
  }
  if (terrain && typeof terrain.getHeightAt !== 'function') {
    throw new Error('River water terrain must provide getHeightAt(x, z).');
  }

  const data = {
    positions: [],
    uvs: [],
    flowUvs: [],
    waterFades: [],
    waterEdges: [],
    junctionMasks: [],
    viewDistances: [],
    waterDepths: [],
    shoreDistances: [],
    flowSpeeds: [],
    rapidMasks: [],
    flowDirections: [],
    junctionFlowDirections: [],
    disturbanceMasks: [],
    indices: [],
  };
  const confluenceEndpoints = new Map();
  const lakeTransitions = createLakeTransitions(network);
  const trims = createReachTrims(network, lakeTransitions);
  const nodeFlowCoordinates = createNodeFlowCoordinates(network);
  const reachStats = [];
  let hiddenRowCount = 0;
  let transitionRowCount = 0;

  for (const reach of network.reaches) {
    const tessellation = reach.disturbances?.length
      ? DISTURBANCE_TESSELLATION
      : STYLE_TESSELLATION[reach.style] ?? DEFAULT_TESSELLATION;
    const viewDistance = STYLE_VIEW_DISTANCE[reach.style] ?? DEFAULT_VIEW_DISTANCE;
    const length = getReachLength(reach);
    const trim = trims.get(reach.id) ?? { start: 0, end: 0 };
    const startDistance = trim.start;
    const endDistance = Math.max(startDistance, length - trim.end);
    const span = endDistance - startDistance;
    const segmentCount = Math.max(1, Math.ceil(span / tessellation.spacing));
    const rowSize = tessellation.lateralSegments + 1;
    const startVertex = getVertexCount(data);
    const startIndex = data.indices.length;
    const rows = [];
    const reachLakeTransitions = lakeTransitions.get(reach.id) ?? {};

    for (let rowIndex = 0; rowIndex <= segmentCount; rowIndex += 1) {
      const rowT = rowIndex / segmentCount;
      const distance = THREE.MathUtils.lerp(startDistance, endDistance, rowT);
      const frame = sampleReachAtDistance(reach, distance);

      frame.waterLevel = getLakeTransitionWaterLevel(
        frame.waterLevel,
        distance,
        reachLakeTransitions,
      );
      const tangent = getReachTangent(reach, distance);
      const sideX = -tangent.z;
      const sideZ = tangent.x;
      const rowFade = getRowFade(
        reach,
        frame,
        distance,
        startDistance,
        endDistance,
        network,
        reachLakeTransitions,
      );
      const rowStartVertex = getVertexCount(data);
      const rowVertices = [];
      const flowAdjustments = getConfluenceFlowAdjustments(
        reach,
        distance,
        startDistance,
        endDistance,
        network,
        nodeFlowCoordinates,
      );

      if (rowFade <= 1e-6) hiddenRowCount += 1;
      else if (rowFade < 1 - 1e-6) transitionRowCount += 1;

      for (let lateralIndex = 0; lateralIndex <= tessellation.lateralSegments; lateralIndex += 1) {
        const lateralT = lateralIndex / tessellation.lateralSegments;
        const lateral = (lateralT - 0.5) * frame.width;
        let x = frame.x + sideX * lateral;
        let z = frame.z + sideZ * lateral;

        ({ x, z } = projectLakeTransitionVertex(
          x,
          z,
          distance,
          reachLakeTransitions,
        ));
        const vertexLakeFade = getReachLakeFade(reachLakeTransitions, x, z);
        const waterEdge = 1 - Math.abs(lateralT * 2 - 1);
        let flowU = nodeFlowCoordinates.get(reach.from) + distance;
        let flowV = lateral;

        for (const adjustment of flowAdjustments) {
          const deltaX = x - adjustment.x;
          const deltaZ = z - adjustment.z;

          flowU = THREE.MathUtils.lerp(
            flowU,
            adjustment.u + deltaX * adjustment.directionX + deltaZ * adjustment.directionZ,
            adjustment.blend,
          );
          flowV = THREE.MathUtils.lerp(
            flowV,
            deltaX * -adjustment.directionZ + deltaZ * adjustment.directionX,
            adjustment.blend,
          );
        }
        const vertexIndex = pushVertex(data, {
          x,
          y: frame.waterLevel,
          z,
          u: nodeFlowCoordinates.get(reach.from) + distance,
          v: lateralT,
          flowU,
          flowV,
          waterFade: Math.min(rowFade, vertexLakeFade),
          waterEdge,
          junctionMask: 0,
          viewDistance,
          waterDepth: getWaterDepth(frame, waterEdge, x, z, terrain),
          shoreDistance: frame.width * 0.5 * waterEdge,
          flowSpeed: frame.flowSpeed,
          rapidMask: frame.rapidMask,
          flowDirectionX: tangent.x,
          flowDirectionZ: tangent.z,
          disturbanceMask: getDisturbanceMask(reach, distance, lateral, frame.width),
        });

        rowVertices.push(vertexIndex);
      }

      rows.push({
        distance,
        frame,
        rowStartVertex,
        vertices: rowVertices,
        waterFade: rowFade,
        viewDistance,
      });
    }

    for (let rowIndex = 0; rowIndex < segmentCount; rowIndex += 1) {
      const current = rows[rowIndex].rowStartVertex;
      const next = rows[rowIndex + 1].rowStartVertex;

      for (let lateralIndex = 0; lateralIndex < tessellation.lateralSegments; lateralIndex += 1) {
        const a = current + lateralIndex;
        const b = a + 1;
        const c = next + lateralIndex;
        const d = c + 1;

        pushUpwardTriangle(data, a, b, c);
        pushUpwardTriangle(data, b, d, c);
      }
    }

    addConfluenceEndpoint(
      confluenceEndpoints,
      network.nodeById.get(reach.from),
      reach,
      'start',
      rows[0],
    );
    addConfluenceEndpoint(
      confluenceEndpoints,
      network.nodeById.get(reach.to),
      reach,
      'end',
      rows.at(-1),
    );

    reachStats.push({
      id: reach.id,
      style: reach.style,
      startVertex,
      vertexCount: getVertexCount(data) - startVertex,
      startIndex,
      indexCount: data.indices.length - startIndex,
      rowCount: rows.length,
      rowSize,
      lateralSegments: tessellation.lateralSegments,
      targetSpacing: tessellation.spacing,
      flowStart: nodeFlowCoordinates.get(reach.from),
      startDistance,
      endDistance,
      startLakeId: reachLakeTransitions.start?.lake.id,
      startLakeBoundaryDistance: reachLakeTransitions.start?.boundaryDistance,
      endLakeId: reachLakeTransitions.end?.lake.id,
      endLakeBoundaryDistance: reachLakeTransitions.end?.boundaryDistance,
      terminalLakeBoundaryDistance: reachLakeTransitions.end?.terminal
        ? reachLakeTransitions.end.boundaryDistance
        : undefined,
      terminalLakeFadeLength: reachLakeTransitions.end?.terminal
        ? reachLakeTransitions.end.fadeLength
        : undefined,
    });
  }

  const stripTriangleCount = data.indices.length / 3;
  const junctionStats = createJunctionPatches(
    data,
    network,
    confluenceEndpoints,
    nodeFlowCoordinates,
    terrain,
  );
  const triangleCount = data.indices.length / 3;

  if (triangleCount >= MAX_TRIANGLES) {
    throw new Error(`River water geometry exceeds its ${MAX_TRIANGLES - 1} triangle budget.`);
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
  geometry.setAttribute('flowUv', new THREE.Float32BufferAttribute(data.flowUvs, 2));
  geometry.setAttribute('waterFade', new THREE.Float32BufferAttribute(data.waterFades, 1));
  geometry.setAttribute('waterEdge', new THREE.Float32BufferAttribute(data.waterEdges, 1));
  geometry.setAttribute('junctionMask', new THREE.Float32BufferAttribute(data.junctionMasks, 1));
  geometry.setAttribute('viewDistance', new THREE.Float32BufferAttribute(data.viewDistances, 1));
  geometry.setAttribute('waterDepth', new THREE.Float32BufferAttribute(data.waterDepths, 1));
  geometry.setAttribute('shoreDistance', new THREE.Float32BufferAttribute(data.shoreDistances, 1));
  geometry.setAttribute('flowSpeed', new THREE.Float32BufferAttribute(data.flowSpeeds, 1));
  geometry.setAttribute('rapidMask', new THREE.Float32BufferAttribute(data.rapidMasks, 1));
  geometry.setAttribute('flowDirection', new THREE.Float32BufferAttribute(data.flowDirections, 2));
  geometry.setAttribute(
    'junctionFlowDirection',
    new THREE.Float32BufferAttribute(data.junctionFlowDirections, 2),
  );
  geometry.setAttribute(
    'disturbanceMask',
    new THREE.Float32BufferAttribute(data.disturbanceMasks, 1),
  );
  geometry.setIndex(data.indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return {
    geometry,
    stats: {
      reachCount: reachStats.length,
      junctionCount: junctionStats.length,
      vertexCount: getVertexCount(data),
      triangleCount,
      stripTriangleCount,
      junctionTriangleCount: triangleCount - stripTriangleCount,
      hiddenRowCount,
      transitionRowCount,
      maxTriangleBudget: MAX_TRIANGLES,
      reaches: reachStats,
      junctions: junctionStats,
    },
  };
}

function createReachTrims(network, lakeTransitions) {
  const trims = new Map(network.reaches.map((reach) => [reach.id, { start: 0, end: 0 }]));

  for (const node of network.definition.nodes.filter((entry) => entry.type === 'confluence')) {
    const authoredReaches = [
      ...(network.incomingByNode.get(node.id) ?? []),
      ...(network.outgoingByNode.get(node.id) ?? []),
    ];
    const connected = authoredReaches.map((reach) => network.reachById.get(reach.id));
    const maxWidth = Math.max(...connected.map((reach) => {
      const atStart = reach.from === node.id;

      return atStart ? reach.samples[0].width : reach.samples.at(-1).width;
    }));
    const trimRadius = Math.max(4, node.poolRadius ?? maxWidth * (node.poolWidthScale ?? 1.5));

    for (const reach of connected) {
      const reachTrim = trims.get(reach.id);
      const endpointTrim = Math.min(trimRadius, getReachLength(reach) * 0.22);

      if (reach.from === node.id) reachTrim.start = endpointTrim;
      else reachTrim.end = endpointTrim;
    }
  }

  separateConfluenceEndpointRows(network, trims);

  for (const reach of network.reaches) {
    const trim = trims.get(reach.id);
    const length = getReachLength(reach);
    const total = trim.start + trim.end;

    if (total <= length * 0.7 || total === 0) continue;

    const scale = (length * 0.7) / total;
    trim.start *= scale;
    trim.end *= scale;
  }

  for (const reach of network.reaches) {
    const trim = trims.get(reach.id);
    const transitions = lakeTransitions.get(reach.id) ?? {};
    const length = getReachLength(reach);

    if (transitions.start) {
      trim.start = Math.max(trim.start, transitions.start.boundaryDistance);
    }
    if (transitions.end) {
      trim.end = Math.max(trim.end, length - transitions.end.boundaryDistance);
    }
    if (trim.start + trim.end > length + 1e-5) {
      throw new Error(`River reach ${reach.id} has no space between its lake shores.`);
    }
  }

  return trims;
}

function createLakeTransitions(network) {
  const terminalTransition = network.definition.terminalLakeTransition;
  const transitions = new Map();

  for (const reach of network.reaches) {
    const fromNode = network.nodeById.get(reach.from);
    const toNode = network.nodeById.get(reach.to);
    const reachTransitions = {};

    if (fromNode.type === 'lake' && hasLakeBoundary(fromNode)) {
      reachTransitions.start = createLakeTransition(
        reach,
        fromNode,
        'start',
        terminalTransition,
      );
    }
    if (toNode.type === 'lake' && hasLakeBoundary(toNode)) {
      reachTransitions.end = createLakeTransition(
        reach,
        toNode,
        'end',
        terminalTransition,
      );
    }
    if (reachTransitions.start || reachTransitions.end) {
      transitions.set(reach.id, reachTransitions);
    }
  }

  return transitions;
}

function createLakeTransition(reach, node, endpoint, terminalTransition) {
  const terminal = terminalTransition?.nodeId === node.id;
  const lake = getLakeBoundary(node);

  return {
    endpoint,
    lake,
    fadeLength: terminal
      ? terminalTransition.fadeLength
      : RIVER_LAKE_FADE_LENGTH,
    levelBlendLength: terminal
      ? terminalTransition.levelBlendLength
      : LAKE_LEVEL_BLEND_LENGTH,
    waterLevel: lake.waterLevel ?? node.waterLevel,
    boundaryDistance: getLakeBoundaryDistance(reach, lake, endpoint),
    terminal,
  };
}

function getLakeBoundaryDistance(reach, lake, endpoint) {
  let crossing = null;

  for (let index = 0; index < reach.samples.length - 1; index += 1) {
    const start = reach.samples[index];
    const end = reach.samples[index + 1];
    const startSignedDistance = getLakeBoundaryFrame(
      lake,
      start.point.x,
      start.point.z,
    ).signedDistance;
    const endSignedDistance = getLakeBoundaryFrame(
      lake,
      end.point.x,
      end.point.z,
    ).signedDistance;
    const crosses = endpoint === 'start'
      ? startSignedDistance <= 0 && endSignedDistance >= 0
      : startSignedDistance >= 0 && endSignedDistance <= 0;

    if (!crosses) continue;

    const intersection = findLakeBoundaryIntersection(lake, start.point, end.point);

    crossing = THREE.MathUtils.lerp(start.distance, end.distance, intersection.t);
    if (endpoint === 'start') break;
  }

  if (crossing !== null) return crossing;
  throw new Error(`River reach ${reach.id} does not cross lake ${lake.id}'s boundary.`);
}

function getLakeTransitionWaterLevel(waterLevel, distance, transitions) {
  let result = waterLevel;

  if (transitions.start) {
    const transition = transitions.start;
    const levelBlend = 1 - smoothstep(
      transition.boundaryDistance,
      transition.boundaryDistance + transition.levelBlendLength,
      distance,
    );

    result = THREE.MathUtils.lerp(result, transition.waterLevel, levelBlend);
  }
  if (transitions.end) {
    const transition = transitions.end;
    const levelBlend = smoothstep(
      transition.boundaryDistance - transition.levelBlendLength,
      transition.boundaryDistance,
      distance,
    );

    result = THREE.MathUtils.lerp(result, transition.waterLevel, levelBlend);
  }

  return result;
}

function projectLakeTransitionVertex(x, z, distance, transitions) {
  let projected = { x, z };

  for (const transition of [transitions.start, transitions.end]) {
    if (!transition) continue;

    const boundaryRow = Math.abs(distance - transition.boundaryDistance) <= 1e-6;
    const frame = getLakeBoundaryFrame(transition.lake, projected.x, projected.z);

    if (!boundaryRow && frame.signedDistance >= 0) continue;
    projected = projectPointToLakeBoundary(
      transition.lake,
      projected.x,
      projected.z,
    );
  }

  return projected;
}

function getReachLakeFade(transitions, x, z) {
  let fade = 1;

  for (const transition of [transitions.start, transitions.end]) {
    if (!transition) continue;
    fade = Math.min(
      fade,
      getLakeOutsideFade(transition.lake, x, z, transition.fadeLength),
    );
  }

  return fade;
}

function separateConfluenceEndpointRows(network, trims) {
  const confluences = network.definition.nodes.filter((entry) => entry.type === 'confluence');

  for (const node of confluences) {
    const authoredReaches = [
      ...(network.incomingByNode.get(node.id) ?? []),
      ...(network.outgoingByNode.get(node.id) ?? []),
    ];
    const connected = authoredReaches.map((reach) => network.reachById.get(reach.id));

    for (let iteration = 0; iteration < 64; iteration += 1) {
      const endpoints = connected.map((reach) => getTrimmedEndpointDescriptor(
        node,
        reach,
        trims.get(reach.id),
      ));
      const conflicting = new Set();

      for (let left = 0; left < endpoints.length - 1; left += 1) {
        for (let right = left + 1; right < endpoints.length; right += 1) {
          if (!endpointRowsConflict(endpoints[left], endpoints[right])) continue;

          conflicting.add(endpoints[left]);
          conflicting.add(endpoints[right]);
        }
      }

      if (conflicting.size === 0) break;

      let adjusted = false;

      for (const endpoint of conflicting) {
        const trim = trims.get(endpoint.reach.id);
        const current = endpoint.end === 'start' ? trim.start : trim.end;
        const opposite = endpoint.end === 'start' ? trim.end : trim.start;
        const length = getReachLength(endpoint.reach);
        const maximum = Math.max(0, Math.min(
          length * 0.45,
          length * 0.7 - opposite,
          node.poolRadius ?? Infinity,
        ));
        const next = Math.min(current + CONFLUENCE_TRIM_STEP, maximum);

        if (next <= current + 1e-6) continue;

        trim[endpoint.end] = next;
        adjusted = true;
      }

      if (!adjusted) break;
    }
  }
}

function getTrimmedEndpointDescriptor(node, reach, trim) {
  const end = reach.from === node.id ? 'start' : 'end';
  const distance = end === 'start'
    ? trim.start
    : getReachLength(reach) - trim.end;
  const frame = sampleReachAtDistance(reach, distance);
  const tangent = getReachTangent(reach, distance);
  const sideX = -tangent.z;
  const sideZ = tangent.x;
  const halfWidth = frame.width * 0.5;
  const centerAngle = Math.atan2(
    frame.z - node.position[1],
    frame.x - node.position[0],
  );
  const edgeAngles = [-1, 1].map((side) => Math.atan2(
    frame.z + sideZ * halfWidth * side - node.position[1],
    frame.x + sideX * halfWidth * side - node.position[0],
  ));

  return {
    reach,
    end,
    frame,
    centerAngle,
    centerRadius: Math.hypot(
      frame.x - node.position[0],
      frame.z - node.position[1],
    ),
    halfAngle: Math.max(
      ...edgeAngles.map((angle) => Math.abs(normalizeAngleDelta(angle - centerAngle))),
    ),
  };
}

function endpointRowsConflict(a, b) {
  const centerSeparation = Math.hypot(
    a.frame.x - b.frame.x,
    a.frame.z - b.frame.z,
  );
  const requiredSeparation = (a.frame.width + b.frame.width) * 0.5
    + CONFLUENCE_ARM_CLEARANCE;
  const angleSeparation = Math.abs(normalizeAngleDelta(a.centerAngle - b.centerAngle));
  const angularClearance = Math.atan2(
    CONFLUENCE_ARM_CLEARANCE,
    Math.max(Math.min(a.centerRadius, b.centerRadius), 1e-6),
  );

  return centerSeparation < requiredSeparation
    || angleSeparation < a.halfAngle + b.halfAngle + angularClearance;
}

function createJunctionPatches(
  data,
  network,
  confluenceEndpoints,
  nodeFlowCoordinates,
  terrain,
) {
  const stats = [];

  for (const node of network.definition.nodes.filter((entry) => entry.type === 'confluence')) {
    const endpoints = confluenceEndpoints.get(node.id) ?? [];

    if (endpoints.length !== 3) {
      throw new Error(`River confluence ${node.id} requires three trimmed water reaches.`);
    }

    const startIndex = data.indices.length;
    const centerFade = Math.max(...endpoints.map((endpoint) => endpoint.waterFade));
    const viewDistance = Math.max(...endpoints.map((endpoint) => endpoint.viewDistance));
    const outgoingDefinition = network.outgoingByNode.get(node.id)?.[0];
    const outgoingReach = network.reachById.get(outgoingDefinition?.id);

    if (!outgoingReach) {
      throw new Error(`River confluence ${node.id} requires one downstream reach.`);
    }

    const outgoingFrame = sampleReachAtDistance(outgoingReach, 0);
    const outgoingDirection = getReachTangent(outgoingReach, 0);
    const nodeFlowCoordinate = nodeFlowCoordinates.get(node.id);
    const centerDepth = outgoingFrame.depth;
    const centerShoreDistance = outgoingFrame.width * 0.5;
    const firstPatchVertex = getVertexCount(data);

    for (const endpoint of endpoints) {
      for (const vertex of endpoint.vertices) {
        data.junctionFlowDirections[vertex * 2] = outgoingDirection.x;
        data.junctionFlowDirections[vertex * 2 + 1] = outgoingDirection.z;
      }
    }

    const centerVertex = pushVertex(data, {
      x: node.position[0],
      y: node.waterLevel,
      z: node.position[1],
      u: nodeFlowCoordinate,
      v: 0.5,
      waterFade: centerFade,
      waterEdge: 1,
      junctionMask: 1,
      viewDistance,
      waterDepth: terrain
        ? Math.max(node.waterLevel - terrain.getHeightAt(node.position[0], node.position[1]), 0)
        : centerDepth,
      shoreDistance: centerShoreDistance,
      flowSpeed: outgoingFrame.flowSpeed,
      rapidMask: outgoingFrame.rapidMask,
      flowDirectionX: outgoingDirection.x,
      flowDirectionZ: outgoingDirection.z,
      disturbanceMask: 0,
    });
    const boundary = createJunctionBoundary(data, node, endpoints, {
      u: nodeFlowCoordinates.get(node.id),
      waterFade: centerFade,
      viewDistance,
      waterDepth: centerDepth,
      flowSpeed: outgoingFrame.flowSpeed,
      rapidMask: outgoingFrame.rapidMask,
      flowDirectionX: outgoingDirection.x,
      flowDirectionZ: outgoingDirection.z,
    }, terrain);
    const radialSegments = createJunctionRadialMesh(
      data,
      centerVertex,
      boundary.vertices,
      outgoingDirection,
    );

    for (let vertex = firstPatchVertex; vertex < getVertexCount(data); vertex += 1) {
      data.junctionFlowDirections[vertex * 2] = outgoingDirection.x;
      data.junctionFlowDirections[vertex * 2 + 1] = outgoingDirection.z;
    }

    const patchVertexCount = getVertexCount(data) - firstPatchVertex;

    stats.push({
      nodeId: node.id,
      centerVertex,
      boundaryVertices: boundary.vertices,
      endpointBoundaryVertexCount: boundary.endpointVertexCount,
      coreBoundaryVertexCount: boundary.coreVertices.length,
      maxBoundaryAngleStep: boundary.maxAngleStep,
      radialSegments,
      firstPatchVertex,
      patchVertexCount,
      startIndex,
      indexCount: data.indices.length - startIndex,
      triangleCount: (data.indices.length - startIndex) / 3,
    });
  }

  return stats;
}

function createJunctionBoundary(data, node, endpoints, attributes, terrain) {
  const arms = orderEndpointArms(data, node, endpoints);
  const vertices = [];
  const coreVertices = [];

  for (let armIndex = 0; armIndex < arms.length; armIndex += 1) {
    const arm = arms[armIndex];
    const next = arms[(armIndex + 1) % arms.length];
    const nextStartAngle = armIndex === arms.length - 1
      ? next.startAngle + Math.PI * 2
      : next.startAngle;
    const gap = Math.max(nextStartAngle - arm.endAngle, 0);
    const gapSegments = gap > 1e-6
      ? Math.max(2, Math.ceil(gap / CONFLUENCE_ARC_STEP))
      : 1;
    const startVertex = arm.vertices.at(-1);
    const endVertex = next.vertices[0];
    const startX = data.positions[startVertex * 3];
    const startZ = data.positions[startVertex * 3 + 2];
    const endX = data.positions[endVertex * 3];
    const endZ = data.positions[endVertex * 3 + 2];
    const segmentX = endX - startX;
    const segmentZ = endZ - startZ;

    if (gap >= Math.PI - 1e-5) {
      throw new Error(`River confluence ${node.id} bank join must span less than 180 degrees.`);
    }

    vertices.push(...arm.vertices);

    for (let segment = 1; segment < gapSegments; segment += 1) {
      const gapT = segment / gapSegments;
      const angle = arm.endAngle + gap * gapT;
      const directionX = Math.cos(angle);
      const directionZ = Math.sin(angle);
      const relativeStartX = startX - node.position[0];
      const relativeStartZ = startZ - node.position[1];
      const denominator = segmentX * directionZ - segmentZ * directionX;
      const chordT = Math.abs(denominator) > 1e-8
        ? THREE.MathUtils.clamp(
          -(relativeStartX * directionZ - relativeStartZ * directionX) / denominator,
          0,
          1,
        )
        : gapT;
      const chordX = THREE.MathUtils.lerp(startX, endX, chordT);
      const chordZ = THREE.MathUtils.lerp(startZ, endZ, chordT);
      const chordRadius = Math.hypot(
        chordX - node.position[0],
        chordZ - node.position[1],
      );
      const curveInset = Math.min(
        chordRadius * 0.32,
        Math.hypot(segmentX, segmentZ) * 0.16,
      ) * Math.sin(Math.PI * gapT);
      const x = chordX - directionX * curveInset;
      const z = chordZ - directionZ * curveInset;
      const vertex = pushVertex(data, {
        x,
        y: node.waterLevel,
        z,
        u: THREE.MathUtils.lerp(
          data.uvs[startVertex * 2],
          data.uvs[endVertex * 2],
          chordT,
        ),
        v: THREE.MathUtils.lerp(
          data.uvs[startVertex * 2 + 1],
          data.uvs[endVertex * 2 + 1],
          chordT,
        ),
        waterFade: attributes.waterFade,
        waterEdge: 0,
        junctionMask: 0,
        viewDistance: attributes.viewDistance,
        waterDepth: terrain
          ? Math.max(node.waterLevel - terrain.getHeightAt(x, z), 0)
          : attributes.waterDepth * 0.2,
        shoreDistance: 0,
        flowSpeed: attributes.flowSpeed,
        rapidMask: attributes.rapidMask,
        flowDirectionX: attributes.flowDirectionX,
        flowDirectionZ: attributes.flowDirectionZ,
        flowU: attributes.u
          + (x - node.position[0]) * attributes.flowDirectionX
          + (z - node.position[1]) * attributes.flowDirectionZ,
        flowV: (x - node.position[0]) * -attributes.flowDirectionZ
          + (z - node.position[1]) * attributes.flowDirectionX,
        disturbanceMask: 0,
      });

      vertices.push(vertex);
      coreVertices.push(vertex);
    }
  }

  return {
    vertices,
    coreVertices,
    endpointVertexCount: endpoints.reduce((count, endpoint) => count + endpoint.vertices.length, 0),
    maxAngleStep: getMaximumBoundaryAngleStep(data, vertices, node),
  };
}

function orderEndpointArms(data, node, endpoints) {
  const arms = endpoints.map((endpoint) => {
    const center = endpoint.vertices.reduce((sum, vertex) => ({
      x: sum.x + data.positions[vertex * 3],
      z: sum.z + data.positions[vertex * 3 + 2],
    }), { x: 0, z: 0 });

    center.x /= endpoint.vertices.length;
    center.z /= endpoint.vertices.length;

    return {
      endpoint,
      center,
      centerAngle: normalizePositiveAngle(Math.atan2(
        center.z - node.position[1],
        center.x - node.position[0],
      )),
    };
  }).sort((a, b) => a.centerAngle - b.centerAngle);
  let largestGap = -Infinity;
  let cutAngle = 0;

  for (let index = 0; index < arms.length; index += 1) {
    const current = arms[index].centerAngle;
    const next = index === arms.length - 1
      ? arms[0].centerAngle + Math.PI * 2
      : arms[index + 1].centerAngle;
    const gap = next - current;

    if (gap <= largestGap) continue;

    largestGap = gap;
    cutAngle = current + gap * 0.5;
  }

  for (const arm of arms) {
    arm.centerAngle = unwrapAngle(arm.centerAngle, cutAngle);
    const ordered = arm.endpoint.vertices.map((vertex) => {
      const rawAngle = Math.atan2(
        data.positions[vertex * 3 + 2] - node.position[1],
        data.positions[vertex * 3] - node.position[0],
      );

      return {
        vertex,
        angle: arm.centerAngle + normalizeAngleDelta(rawAngle - arm.centerAngle),
      };
    }).sort((a, b) => a.angle - b.angle);

    arm.vertices = ordered.map((entry) => entry.vertex);
    arm.startAngle = ordered[0].angle;
    arm.endAngle = ordered.at(-1).angle;
    arm.centerRadius = Math.hypot(
      arm.center.x - node.position[0],
      arm.center.z - node.position[1],
    );
    arm.width = arm.endpoint.frame.width;
  }

  arms.sort((a, b) => a.centerAngle - b.centerAngle);

  return arms;
}

function createJunctionRadialMesh(data, centerVertex, boundaryVertices, outgoingDirection) {
  const centerX = data.positions[centerVertex * 3];
  const centerZ = data.positions[centerVertex * 3 + 2];
  const maximumRadius = Math.max(...boundaryVertices.map((vertex) => Math.hypot(
    data.positions[vertex * 3] - centerX,
    data.positions[vertex * 3 + 2] - centerZ,
  )));
  const radialSegments = THREE.MathUtils.clamp(
    Math.ceil(maximumRadius / CONFLUENCE_RADIAL_SPACING),
    2,
    MAX_CONFLUENCE_RADIAL_SEGMENTS,
  );
  let previousRing = null;

  for (let radialIndex = 1; radialIndex < radialSegments; radialIndex += 1) {
    const radialT = radialIndex / radialSegments;
    const ring = boundaryVertices.map((boundaryVertex) => pushInterpolatedJunctionVertex(
      data,
      centerVertex,
      boundaryVertex,
      radialT,
      outgoingDirection,
    ));

    if (!previousRing) {
      for (let index = 0; index < ring.length; index += 1) {
        pushUpwardTriangle(data, centerVertex, ring[index], ring[(index + 1) % ring.length]);
      }
    } else {
      connectJunctionRings(data, previousRing, ring);
    }

    previousRing = ring;
  }

  connectJunctionRings(data, previousRing, boundaryVertices);

  return radialSegments;
}

function connectJunctionRings(data, inner, outer) {
  for (let index = 0; index < inner.length; index += 1) {
    const next = (index + 1) % inner.length;

    pushUpwardTriangle(data, inner[index], inner[next], outer[index]);
    pushUpwardTriangle(data, inner[next], outer[next], outer[index]);
  }
}

function pushInterpolatedJunctionVertex(
  data,
  centerVertex,
  boundaryVertex,
  t,
  outgoingDirection,
) {
  const centerPosition = centerVertex * 3;
  const boundaryPosition = boundaryVertex * 3;
  const centerUv = centerVertex * 2;
  const boundaryUv = boundaryVertex * 2;
  const x = THREE.MathUtils.lerp(
    data.positions[centerPosition],
    data.positions[boundaryPosition],
    t,
  );
  const y = THREE.MathUtils.lerp(
    data.positions[centerPosition + 1],
    data.positions[boundaryPosition + 1],
    t,
  );
  const z = THREE.MathUtils.lerp(
    data.positions[centerPosition + 2],
    data.positions[boundaryPosition + 2],
    t,
  );
  const deltaX = x - data.positions[centerPosition];
  const deltaZ = z - data.positions[centerPosition + 2];

  return pushVertex(data, {
    x,
    y,
    z,
    u: THREE.MathUtils.lerp(data.uvs[centerUv], data.uvs[boundaryUv], t),
    v: THREE.MathUtils.lerp(data.uvs[centerUv + 1], data.uvs[boundaryUv + 1], t),
    flowU: data.uvs[centerUv]
      + deltaX * outgoingDirection.x
      + deltaZ * outgoingDirection.z,
    flowV: deltaX * -outgoingDirection.z + deltaZ * outgoingDirection.x,
    waterFade: THREE.MathUtils.lerp(
      data.waterFades[centerVertex],
      data.waterFades[boundaryVertex],
      t,
    ),
    waterEdge: THREE.MathUtils.lerp(
      data.waterEdges[centerVertex],
      data.waterEdges[boundaryVertex],
      t,
    ),
    junctionMask: THREE.MathUtils.lerp(
      data.junctionMasks[centerVertex],
      data.junctionMasks[boundaryVertex],
      t,
    ),
    viewDistance: THREE.MathUtils.lerp(
      data.viewDistances[centerVertex],
      data.viewDistances[boundaryVertex],
      t,
    ),
    waterDepth: THREE.MathUtils.lerp(
      data.waterDepths[centerVertex],
      data.waterDepths[boundaryVertex],
      t,
    ),
    shoreDistance: THREE.MathUtils.lerp(
      data.shoreDistances[centerVertex],
      data.shoreDistances[boundaryVertex],
      t,
    ),
    flowSpeed: THREE.MathUtils.lerp(
      data.flowSpeeds[centerVertex],
      data.flowSpeeds[boundaryVertex],
      t,
    ),
    rapidMask: THREE.MathUtils.lerp(
      data.rapidMasks[centerVertex],
      data.rapidMasks[boundaryVertex],
      t,
    ),
    flowDirectionX: outgoingDirection.x,
    flowDirectionZ: outgoingDirection.z,
    disturbanceMask: THREE.MathUtils.lerp(
      data.disturbanceMasks[centerVertex],
      data.disturbanceMasks[boundaryVertex],
      t,
    ),
  });
}

function createNodeFlowCoordinates(network) {
  const coordinates = new Map();

  for (let index = network.topologicalNodeIds.length - 1; index >= 0; index -= 1) {
    const nodeId = network.topologicalNodeIds[index];
    const outgoing = network.outgoingByNode.get(nodeId) ?? [];

    if (outgoing.length === 0) {
      coordinates.set(nodeId, 0);
      continue;
    }

    const reach = network.reachById.get(outgoing[0].id);
    const downstreamCoordinate = coordinates.get(reach.to);

    coordinates.set(nodeId, downstreamCoordinate - getReachLength(reach));
  }

  return coordinates;
}

function getConfluenceFlowAdjustments(
  reach,
  distance,
  startDistance,
  endDistance,
  network,
  nodeFlowCoordinates,
) {
  const adjustments = [];

  for (const [nodeId, endpointDistance] of [
    [reach.from, startDistance],
    [reach.to, endDistance],
  ]) {
    const node = network.nodeById.get(nodeId);

    if (node?.type !== 'confluence') continue;

    const blend = 1 - smoothstep(
      0,
      Math.max(16, (node.poolRadius ?? 8) * 2),
      Math.abs(distance - endpointDistance),
    );

    if (blend <= 0) continue;

    const outgoingDefinition = network.outgoingByNode.get(nodeId)?.[0];
    const outgoingReach = outgoingDefinition
      ? network.reachById.get(outgoingDefinition.id)
      : null;

    if (!outgoingReach) continue;

    const direction = getReachTangent(outgoingReach, 0);

    adjustments.push({
      x: node.position[0],
      z: node.position[1],
      u: nodeFlowCoordinates.get(nodeId),
      directionX: direction.x,
      directionZ: direction.z,
      blend,
    });
  }

  return adjustments;
}

function addConfluenceEndpoint(target, node, reach, end, row) {
  if (node?.type !== 'confluence') return;

  const endpoints = target.get(node.id) ?? [];

  endpoints.push({
    reachId: reach.id,
    end,
    frame: row.frame,
    vertices: row.vertices,
    waterFade: row.waterFade,
    viewDistance: row.viewDistance,
  });
  target.set(node.id, endpoints);
}

function getRowFade(
  reach,
  frame,
  distance,
  startDistance,
  endDistance,
  network,
  lakeTransitions,
) {
  const fromNode = network.nodeById.get(reach.from);
  const toNode = network.nodeById.get(reach.to);
  const slopeFade = getSlopeFade(reach, distance);
  let endpointFade = 1;

  if (fromNode.type === 'source') {
    endpointFade *= smoothstep(
      0,
      Math.max(5, frame.width * 3),
      distance - startDistance,
    );
  }

  endpointFade *= getReachLakeFade(lakeTransitions, frame.x, frame.z);

  if (fromNode.type === 'lake' && !lakeTransitions.start) {
    endpointFade *= smoothstep(0, Math.max(7, frame.width * 2), distance - startDistance);
  }
  if (toNode.type === 'lake' && !lakeTransitions.end) {
    endpointFade *= smoothstep(0, Math.max(7, frame.width * 2), endDistance - distance);
  }

  return THREE.MathUtils.clamp(slopeFade * endpointFade, 0, 1);
}

function getSlopeFade(reach, distance) {
  const length = getReachLength(reach);
  const window = Math.min(1, length * 0.25);
  const before = sampleReachAtDistance(reach, Math.max(0, distance - window));
  const after = sampleReachAtDistance(reach, Math.min(length, distance + window));
  const horizontalDistance = Math.hypot(after.x - before.x, after.z - before.z);
  const slope = THREE.MathUtils.radToDeg(Math.atan2(
    Math.abs(after.waterLevel - before.waterLevel),
    Math.max(horizontalDistance, 1e-6),
  ));

  return 1 - smoothstep(SLOPE_FADE_START, SLOPE_HIDDEN, slope);
}

function getReachTangent(reach, distance) {
  const length = getReachLength(reach);
  const window = Math.min(0.75, length * 0.25);
  const before = sampleReachAtDistance(reach, Math.max(0, distance - window));
  const after = sampleReachAtDistance(reach, Math.min(length, distance + window));
  const deltaX = after.x - before.x;
  const deltaZ = after.z - before.z;
  const magnitude = Math.hypot(deltaX, deltaZ);

  if (magnitude <= 1e-8) return { x: 1, z: 0 };

  return { x: deltaX / magnitude, z: deltaZ / magnitude };
}

function sampleReachAtDistance(reach, distance) {
  const samples = reach.samples;
  const clamped = THREE.MathUtils.clamp(distance, 0, getReachLength(reach));

  if (clamped <= samples[0].distance) return sampleToFrame(samples[0], clamped);
  if (clamped >= samples.at(-1).distance) return sampleToFrame(samples.at(-1), clamped);

  let low = 0;
  let high = samples.length - 1;

  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);

    if (samples[middle].distance <= clamped) low = middle;
    else high = middle;
  }

  const start = samples[low];
  const end = samples[high];
  const t = (clamped - start.distance) / (end.distance - start.distance);

  return {
    x: THREE.MathUtils.lerp(start.point.x, end.point.x, t),
    z: THREE.MathUtils.lerp(start.point.z, end.point.z, t),
    waterLevel: THREE.MathUtils.lerp(start.waterLevel, end.waterLevel, t),
    width: THREE.MathUtils.lerp(start.width, end.width, t),
    depth: THREE.MathUtils.lerp(start.depth ?? 0.5, end.depth ?? 0.5, t),
    flowSpeed: THREE.MathUtils.lerp(start.flowSpeed ?? 1, end.flowSpeed ?? 1, t),
    rapidMask: THREE.MathUtils.lerp(start.rapidMask ?? 0, end.rapidMask ?? 0, t),
  };
}

function sampleToFrame(sample) {
  return {
    x: sample.point.x,
    z: sample.point.z,
    waterLevel: sample.waterLevel,
    width: sample.width,
    depth: sample.depth ?? 0.5,
    flowSpeed: sample.flowSpeed ?? 1,
    rapidMask: sample.rapidMask ?? 0,
  };
}

function getWaterDepth(frame, waterEdge, x, z, terrain) {
  if (terrain) return Math.max(frame.waterLevel - terrain.getHeightAt(x, z), 0);

  return Math.max(frame.depth * THREE.MathUtils.lerp(0.2, 1, waterEdge), 0);
}

function getDisturbanceMask(reach, distance, lateral, width) {
  let mask = 0;

  for (const disturbance of reach.disturbances ?? []) {
    const along = distance - disturbance.distanceM;
    const downstreamDistance = Math.max(along, 0);
    const downstreamT = THREE.MathUtils.clamp(
      downstreamDistance / (disturbance.radius * 2.6),
      0,
      1,
    );
    const spawnMask = smoothstep(
      -disturbance.radius * 0.1,
      disturbance.radius * 0.05,
      along,
    );
    const tailMask = 1 - smoothstep(
      disturbance.radius * 1.15,
      disturbance.radius * 2.25,
      along,
    );
    const disturbanceLateral = disturbance.lateral * width * 0.5;
    const lateralExtent = disturbance.radius * THREE.MathUtils.lerp(0.42, 0.72, downstreamT);
    const lateralMask = 1 - smoothstep(
      lateralExtent * 0.18,
      lateralExtent,
      Math.abs(lateral - disturbanceLateral),
    );

    mask = Math.max(mask, disturbance.strength * spawnMask * tailMask * lateralMask);
  }

  return THREE.MathUtils.clamp(mask, 0, 1);
}

function getReachLength(reach) {
  return reach.samples.at(-1).distance;
}

function pushVertex(data, vertex) {
  const index = getVertexCount(data);

  data.positions.push(vertex.x, vertex.y, vertex.z);
  data.uvs.push(vertex.u, vertex.v);
  data.flowUvs.push(vertex.flowU ?? vertex.u, vertex.flowV ?? 0);
  data.waterFades.push(vertex.waterFade);
  data.waterEdges.push(vertex.waterEdge);
  data.junctionMasks.push(vertex.junctionMask);
  data.viewDistances.push(vertex.viewDistance);
  data.waterDepths.push(vertex.waterDepth);
  data.shoreDistances.push(vertex.shoreDistance);
  data.flowSpeeds.push(vertex.flowSpeed);
  data.rapidMasks.push(vertex.rapidMask);
  data.flowDirections.push(vertex.flowDirectionX, vertex.flowDirectionZ);
  data.junctionFlowDirections.push(
    vertex.junctionFlowDirectionX ?? vertex.flowDirectionX,
    vertex.junctionFlowDirectionZ ?? vertex.flowDirectionZ,
  );
  data.disturbanceMasks.push(vertex.disturbanceMask);

  return index;
}

function pushUpwardTriangle(data, a, b, c) {
  const crossY = getTriangleCrossY(data.positions, a, b, c);

  if (Math.abs(crossY) <= 1e-10) return;
  if (crossY > 0) data.indices.push(a, b, c);
  else data.indices.push(a, c, b);
}

function getTriangleCrossY(positions, a, b, c) {
  const ax = positions[a * 3];
  const az = positions[a * 3 + 2];
  const abX = positions[b * 3] - ax;
  const abZ = positions[b * 3 + 2] - az;
  const acX = positions[c * 3] - ax;
  const acZ = positions[c * 3 + 2] - az;

  return abZ * acX - abX * acZ;
}

function getMaximumBoundaryAngleStep(data, vertices, node) {
  let maximum = 0;

  for (let index = 0; index < vertices.length; index += 1) {
    const current = Math.atan2(
      data.positions[vertices[index] * 3 + 2] - node.position[1],
      data.positions[vertices[index] * 3] - node.position[0],
    );
    const next = Math.atan2(
      data.positions[vertices[(index + 1) % vertices.length] * 3 + 2] - node.position[1],
      data.positions[vertices[(index + 1) % vertices.length] * 3] - node.position[0],
    );

    maximum = Math.max(maximum, normalizePositiveAngle(next - current));
  }

  return maximum;
}

function normalizePositiveAngle(angle) {
  const fullTurn = Math.PI * 2;

  return ((angle % fullTurn) + fullTurn) % fullTurn;
}

function normalizeAngleDelta(angle) {
  const normalized = normalizePositiveAngle(angle + Math.PI) - Math.PI;

  return normalized <= -Math.PI ? Math.PI : normalized;
}

function unwrapAngle(angle, cutAngle) {
  let unwrapped = angle;

  while (unwrapped < cutAngle) unwrapped += Math.PI * 2;
  while (unwrapped >= cutAngle + Math.PI * 2) unwrapped -= Math.PI * 2;

  return unwrapped;
}

function getVertexCount(data) {
  return data.positions.length / 3;
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;

  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}
