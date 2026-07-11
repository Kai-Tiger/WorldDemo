import * as THREE from 'three';
import { RIVER_NETWORK } from './riverNetwork.js';

const MAX_TRIANGLES = 12000;
const METERS_PER_U = 24;
const SLOPE_FADE_START = 18;
const SLOPE_HIDDEN = 32;
const STYLE_TESSELLATION = {
  headwater: { spacing: 2.5, lateralSegments: 3 },
  collector: { spacing: 2, lateralSegments: 4 },
  'lake-outlet': { spacing: 1.75, lateralSegments: 4 },
  'lake-inlet': { spacing: 1.5, lateralSegments: 5 },
};
const DEFAULT_TESSELLATION = { spacing: 2, lateralSegments: 4 };
const STYLE_VIEW_DISTANCE = {
  headwater: 180,
  collector: 260,
  'lake-outlet': 260,
  'lake-inlet': 300,
};
const DEFAULT_VIEW_DISTANCE = 260;

export function createRiverNetworkWaterGeometry(network = RIVER_NETWORK) {
  if (!network?.reaches?.length || !network.nodeById) {
    throw new Error('Compiled river network is required to build water geometry.');
  }

  const data = {
    positions: [],
    uvs: [],
    waterFades: [],
    waterEdges: [],
    junctionMasks: [],
    viewDistances: [],
    indices: [],
  };
  const confluenceEndpoints = new Map();
  const trims = createReachTrims(network);
  const nodeFlowCoordinates = createNodeFlowCoordinates(network);
  const reachStats = [];
  let hiddenRowCount = 0;
  let transitionRowCount = 0;

  for (const reach of network.reaches) {
    const tessellation = STYLE_TESSELLATION[reach.style] ?? DEFAULT_TESSELLATION;
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

    for (let rowIndex = 0; rowIndex <= segmentCount; rowIndex += 1) {
      const rowT = rowIndex / segmentCount;
      const distance = THREE.MathUtils.lerp(startDistance, endDistance, rowT);
      const frame = sampleReachAtDistance(reach, distance);
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
      );
      const rowStartVertex = getVertexCount(data);
      const rowVertices = [];

      if (rowFade <= 1e-6) hiddenRowCount += 1;
      else if (rowFade < 1 - 1e-6) transitionRowCount += 1;

      for (let lateralIndex = 0; lateralIndex <= tessellation.lateralSegments; lateralIndex += 1) {
        const lateralT = lateralIndex / tessellation.lateralSegments;
        const lateral = (lateralT - 0.5) * frame.width;
        const vertexIndex = pushVertex(data, {
          x: frame.x + sideX * lateral,
          y: frame.waterLevel,
          z: frame.z + sideZ * lateral,
          u: (nodeFlowCoordinates.get(reach.from) + distance) / METERS_PER_U,
          v: lateralT,
          waterFade: rowFade,
          waterEdge: 1 - Math.abs(lateralT * 2 - 1),
          junctionMask: 0,
          viewDistance,
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
    });
  }

  const stripTriangleCount = data.indices.length / 3;
  const junctionStats = createJunctionPatches(
    data,
    network,
    confluenceEndpoints,
    nodeFlowCoordinates,
  );
  const triangleCount = data.indices.length / 3;

  if (triangleCount >= MAX_TRIANGLES) {
    throw new Error(`River water geometry exceeds its ${MAX_TRIANGLES - 1} triangle budget.`);
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
  geometry.setAttribute('waterFade', new THREE.Float32BufferAttribute(data.waterFades, 1));
  geometry.setAttribute('waterEdge', new THREE.Float32BufferAttribute(data.waterEdges, 1));
  geometry.setAttribute('junctionMask', new THREE.Float32BufferAttribute(data.junctionMasks, 1));
  geometry.setAttribute('viewDistance', new THREE.Float32BufferAttribute(data.viewDistances, 1));
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

function createReachTrims(network) {
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
    const trimRadius = Math.max(4, maxWidth * 1.5);

    for (const reach of connected) {
      const reachTrim = trims.get(reach.id);
      const endpointTrim = Math.min(trimRadius, getReachLength(reach) * 0.22);

      if (reach.from === node.id) reachTrim.start = endpointTrim;
      else reachTrim.end = endpointTrim;
    }
  }

  for (const reach of network.reaches) {
    const trim = trims.get(reach.id);
    const fromNode = network.nodeById.get(reach.from);
    const toNode = network.nodeById.get(reach.to);

    if (fromNode.type === 'lake' && !fromNode.existing && Number.isFinite(fromNode.radius)) {
      trim.start = Math.max(trim.start, Math.max(0, fromNode.radius - 3));
    }
    if (toNode.type === 'lake' && !toNode.existing && Number.isFinite(toNode.radius)) {
      trim.end = Math.max(trim.end, Math.max(0, toNode.radius - 3));
    }
  }

  for (const reach of network.reaches) {
    const trim = trims.get(reach.id);
    const length = getReachLength(reach);
    const total = trim.start + trim.end;

    if (total <= length * 0.7 || total === 0) continue;

    const scale = (length * 0.7) / total;
    trim.start *= scale;
    trim.end *= scale;
  }

  return trims;
}

function createJunctionPatches(data, network, confluenceEndpoints, nodeFlowCoordinates) {
  const stats = [];

  for (const node of network.definition.nodes.filter((entry) => entry.type === 'confluence')) {
    const endpoints = confluenceEndpoints.get(node.id) ?? [];

    if (endpoints.length !== 3) {
      throw new Error(`River confluence ${node.id} requires three trimmed water reaches.`);
    }

    const boundaryVertices = endpoints
      .flatMap((endpoint) => endpoint.vertices)
      .sort((a, b) => getVertexAngle(data, a, node) - getVertexAngle(data, b, node));
    const startIndex = data.indices.length;
    const centerFade = Math.max(...endpoints.map((endpoint) => endpoint.waterFade));
    const viewDistance = Math.max(...endpoints.map((endpoint) => endpoint.viewDistance));
    const centerVertex = pushVertex(data, {
      x: node.position[0],
      y: node.waterLevel,
      z: node.position[1],
      u: nodeFlowCoordinates.get(node.id) / METERS_PER_U,
      v: 0.5,
      waterFade: centerFade,
      waterEdge: 1,
      junctionMask: 1,
      viewDistance,
    });

    for (let index = 0; index < boundaryVertices.length; index += 1) {
      const current = boundaryVertices[index];
      const next = boundaryVertices[(index + 1) % boundaryVertices.length];

      pushUpwardTriangle(data, centerVertex, current, next);
    }

    stats.push({
      nodeId: node.id,
      centerVertex,
      boundaryVertices,
      startIndex,
      indexCount: data.indices.length - startIndex,
      triangleCount: (data.indices.length - startIndex) / 3,
    });
  }

  return stats;
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

function addConfluenceEndpoint(target, node, reach, end, row) {
  if (node?.type !== 'confluence') return;

  const endpoints = target.get(node.id) ?? [];

  endpoints.push({
    reachId: reach.id,
    end,
    vertices: row.vertices,
    waterFade: row.waterFade,
    viewDistance: row.viewDistance,
  });
  target.set(node.id, endpoints);
}

function getRowFade(reach, frame, distance, startDistance, endDistance, network) {
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

  if (fromNode.type === 'lake') {
    endpointFade *= smoothstep(0, Math.max(7, frame.width * 2), distance - startDistance);
  }

  if (toNode.type === 'lake') {
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
  };
}

function sampleToFrame(sample) {
  return {
    x: sample.point.x,
    z: sample.point.z,
    waterLevel: sample.waterLevel,
    width: sample.width,
  };
}

function getReachLength(reach) {
  return reach.samples.at(-1).distance;
}

function pushVertex(data, vertex) {
  const index = getVertexCount(data);

  data.positions.push(vertex.x, vertex.y, vertex.z);
  data.uvs.push(vertex.u, vertex.v);
  data.waterFades.push(vertex.waterFade);
  data.waterEdges.push(vertex.waterEdge);
  data.junctionMasks.push(vertex.junctionMask);
  data.viewDistances.push(vertex.viewDistance);

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

function getVertexAngle(data, vertexIndex, node) {
  const x = data.positions[vertexIndex * 3];
  const z = data.positions[vertexIndex * 3 + 2];

  return Math.atan2(z - node.position[1], x - node.position[0]);
}

function getVertexCount(data) {
  return data.positions.length / 3;
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;

  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}
