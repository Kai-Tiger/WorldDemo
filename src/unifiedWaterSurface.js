import * as THREE from 'three';
import {
  RIVER_NETWORK,
  compileRiverNetwork,
} from './hydrology/riverNetwork.js';
import { createRiverNetworkWaterGeometry } from './hydrology/riverNetworkWaterGeometry.js';
import {
  HERO_RIVER_NETWORK_DEFINITION,
  SOUTHERN_LOWLAND_LAKES,
  TERMINAL_LOWLAND_LAKE,
} from './lowlandHeightPlan.js';
import {
  LOWLAND_LAKES,
  LOWLAND_STREAM_NETWORKS,
} from './lowlandLandforms.js';
import {
  ALPINE_LAKE_BOUNDARY,
  findLakeBoundaryIntersection,
  getLakeBoundary,
  getLakeBoundaryFrame,
  getLakeBoundaryRadius,
  getLakeCenter,
  projectPointToLakeBoundary,
} from './lakeBoundary.js';
import { createWaterEffects } from './waterSystem.js';

const WATER_SURFACE_OFFSET = 0.045;
const TRANSITION_ROW_COUNT = 5;
const LAKE_TRANSITION_RING_COUNT = 3;
const LAKE_ANGLE_SEGMENTS = 72;
const LAKE_RING_COUNT = 12;
const LAKE_INTERIOR_EPSILON = 1e-4;
const ANGLE_EPSILON = 1e-7;
const TWO_PI = Math.PI * 2;

export const UNIFIED_WATER_ATTRIBUTE_SCHEMA = Object.freeze({
  waterDepth: 1,
  shoreDistanceMeters: 1,
  flowUv: 2,
  flowDirection: 2,
  junctionFlowDirection: 2,
  flowSpeed: 1,
  riverInfluence: 1,
  rapidMask: 1,
  junctionMask: 1,
  disturbanceMask: 1,
  reflectionTier: 1,
});

const HERO_RIVER_NETWORK = compileRiverNetwork(HERO_RIVER_NETWORK_DEFINITION);
const LOWLAND_NETWORK_BY_ID = new Map(
  LOWLAND_STREAM_NETWORKS.map((network) => [network.definition.id, network]),
);
const CIRQUE_TARN = getLakeBoundary(RIVER_NETWORK.nodeById.get('cirque-tarn'));
const LAKE_BY_ID = new Map([
  [ALPINE_LAKE_BOUNDARY.id, ALPINE_LAKE_BOUNDARY],
  [CIRQUE_TARN.id, CIRQUE_TARN],
  ...LOWLAND_LAKES.map((lake) => [lake.id, lake]),
  ...SOUTHERN_LOWLAND_LAKES.map((lake) => [lake.id, lake]),
  [TERMINAL_LOWLAND_LAKE.id, TERMINAL_LOWLAND_LAKE],
]);

export const RIVER_LAKE_INTERFACE_REGISTRY = Object.freeze([
  createInterface('alpine-cirque-inlet', 'alpine-basin', 'alpine-network', 's3-tarn', 'end', 'cirque-tarn'),
  createInterface('alpine-cirque-outlet', 'alpine-basin', 'alpine-network', 'tarn-j3', 'start', 'cirque-tarn'),
  createInterface('alpine-main-inlet', 'alpine-basin', 'alpine-network', 'j4-alpine-lake', 'end', 'alpine-lake'),
  createInterface('alpine-lake-outlet', 'alpine-basin', 'alpine-outlet', 'alpine-outlet', 'start', 'alpine-lake'),
  createInterface('east-pond-outlet', 'hero-east-basin', 'east-lowland-basin', 'east-meadow-outlet', 'start', 'east-meadow-pond'),
  createInterface('east-stream-terminal-inlet', 'hero-east-basin', 'east-lowland-basin', 'east-meadow-outlet', 'end', 'terminal-lake'),
  createInterface('hero-terminal-inlet', 'hero-east-basin', 'hero-network', 'hero-main-lower', 'end', 'terminal-lake'),
  createInterface('northwest-lake-outlet', 'north-lowland-basin', 'north-lowland-basin', 'north-lake-connector', 'start', 'northwest-shallow-lake'),
  createInterface('northeast-lake-inlet', 'north-lowland-basin', 'north-lowland-basin', 'north-lake-connector', 'end', 'northeast-shallow-lake'),
  createInterface('south-northwest-outlet', 'south-lowland-basin', 'south-lowland-basin', 'south-northwest-tributary', 'start', 'south-northwest-lake'),
  createInterface('south-northwest-central-inlet', 'south-lowland-basin', 'south-lowland-basin', 'south-northwest-tributary', 'end', 'south-central-lake'),
  createInterface('south-east-outlet', 'south-lowland-basin', 'south-lowland-basin', 'south-east-tributary', 'start', 'south-east-lake'),
  createInterface('south-east-central-inlet', 'south-lowland-basin', 'south-lowland-basin', 'south-east-tributary', 'end', 'south-central-lake'),
  createInterface('south-central-outlet', 'south-lowland-basin', 'south-lowland-basin', 'south-central-outlet', 'start', 'south-central-lake'),
  createInterface('south-terminal-inlet', 'south-lowland-basin', 'south-lowland-basin', 'south-central-outlet', 'end', 'south-terminal-lake'),
]);

export const WATER_BASIN_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'alpine-basin',
    lakeIds: Object.freeze(['cirque-tarn', 'alpine-lake']),
    riverSources: Object.freeze([
      Object.freeze({ id: 'alpine-network', type: 'network', network: RIVER_NETWORK }),
      Object.freeze({ id: 'alpine-outlet', type: 'outlet' }),
    ]),
  }),
  Object.freeze({
    id: 'hero-east-basin',
    lakeIds: Object.freeze(['east-meadow-pond', 'terminal-lake']),
    riverSources: Object.freeze([
      Object.freeze({ id: 'hero-network', type: 'network', network: HERO_RIVER_NETWORK }),
      Object.freeze({
        id: 'east-lowland-basin',
        type: 'network',
        network: LOWLAND_NETWORK_BY_ID.get('east-lowland-basin'),
      }),
    ]),
  }),
  Object.freeze({
    id: 'north-lowland-basin',
    lakeIds: Object.freeze(['northwest-shallow-lake', 'northeast-shallow-lake']),
    riverSources: Object.freeze([
      Object.freeze({
        id: 'north-lowland-basin',
        type: 'network',
        network: LOWLAND_NETWORK_BY_ID.get('north-lowland-basin'),
      }),
    ]),
  }),
  Object.freeze({
    id: 'south-lowland-basin',
    lakeIds: Object.freeze([
      'south-northwest-lake',
      'south-east-lake',
      'south-central-lake',
      'south-terminal-lake',
    ]),
    riverSources: Object.freeze([
      Object.freeze({
        id: 'south-lowland-basin',
        type: 'network',
        network: LOWLAND_NETWORK_BY_ID.get('south-lowland-basin'),
      }),
    ]),
  }),
]);

export function createUnifiedWaterSystem(terrain, sources = {}) {
  validateTerrain(terrain);

  const surfaceRoot = new THREE.Group();
  const batches = WATER_BASIN_DEFINITIONS.map((basin) => (
    createBasinWaterSurfaceBatch(basin, terrain, sources)
  ));
  const effects = sources.effects ?? createWaterEffects(terrain);
  const effectsRoot = effects.group ?? effects;
  let disposed = false;

  surfaceRoot.name = 'UnifiedWaterSurfaceRoot';
  surfaceRoot.userData.excludeFromGtao = true;
  effectsRoot.name = 'UnifiedWaterEffectsRoot';
  effectsRoot.userData.excludeFromGtao = true;
  surfaceRoot.add(...batches);

  const stats = {
    basinCount: batches.length,
    batchCount: batches.length,
    interfaceCount: RIVER_LAKE_INTERFACE_REGISTRY.length,
    transitionPatchCount: batches.reduce(
      (total, batch) => total + batch.userData.transitionPatches.length,
      0,
    ),
    transitionRowCount: batches.reduce(
      (total, batch) => total + batch.userData.transitionPatches.length * TRANSITION_ROW_COUNT,
      0,
    ),
    vertexCount: batches.reduce(
      (total, batch) => total + batch.geometry.getAttribute('position').count,
      0,
    ),
    triangleCount: batches.reduce(
      (total, batch) => total + batch.geometry.index.count / 3,
      0,
    ),
  };

  return {
    group: surfaceRoot,
    surfaceRoot,
    effectsRoot,
    batches,
    basinBatches: batches,
    interfaces: RIVER_LAKE_INTERFACE_REGISTRY,
    stats,
    basinStats: batches.map((batch) => batch.userData.stats),
    update(time, camera) {
      effects.update?.(camera, time);
    },
    setAerialPerspectiveEnabled(enabled) {
      effects.setAerialPerspectiveEnabled?.(enabled);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const batch of batches) {
        batch.geometry.dispose();
        batch.material.dispose();
      }
      effects.dispose?.();
    },
  };
}

export function createBasinWaterSurfaceBatch(basin, terrain, sources = {}) {
  validateTerrain(terrain);
  if (!basin?.id || !Array.isArray(basin.riverSources) || !Array.isArray(basin.lakeIds)) {
    throw new Error('A water basin definition with riverSources and lakeIds is required.');
  }

  const builder = createGeometryBuilder();
  const basinInterfaces = RIVER_LAKE_INTERFACE_REGISTRY.filter(
    (entry) => entry.basinId === basin.id,
  );
  const attachments = [];
  const riverParts = [];
  const transitionPatches = [];

  for (const source of basin.riverSources) {
    const sourceInterfaces = basinInterfaces.filter((entry) => entry.sourceId === source.id);
    const sourceResult = resolveRiverSource(source, terrain, sources);
    const part = appendRiverSource(
      builder,
      source,
      sourceResult,
      sourceInterfaces,
      terrain,
    );

    riverParts.push(part.stats);
    attachments.push(...part.attachments);
    if (sourceResult.owned) sourceResult.geometry.dispose();
  }

  const lakeParts = [];

  for (const lakeId of basin.lakeIds) {
    const lake = LAKE_BY_ID.get(lakeId);

    if (!lake) throw new Error(`Unknown lake ${lakeId} in basin ${basin.id}.`);

    const lakeAttachments = attachments.filter((entry) => entry.lakeId === lakeId);
    const lakePart = appendLakeSurface(
      builder,
      lake,
      lakeAttachments,
      terrain,
      getLakeReflectionTier(lake),
    );

    lakeParts.push(lakePart.stats);
    transitionPatches.push(...lakePart.transitionPatches);
  }

  reorientUpwardTriangles(builder);
  const geometry = finalizeGeometry(builder);
  const stats = {
    basinId: basin.id,
    lakeCount: lakeParts.length,
    riverPartCount: riverParts.length,
    interfaceCount: basinInterfaces.length,
    transitionPatchCount: transitionPatches.length,
    transitionRows: TRANSITION_ROW_COUNT,
    vertexCount: geometry.getAttribute('position').count,
    triangleCount: geometry.index.count / 3,
    riverTriangleCount: riverParts.reduce((sum, entry) => sum + entry.triangleCount, 0),
    lakeTriangleCount: lakeParts.reduce((sum, entry) => sum + entry.triangleCount, 0),
    riverParts,
    lakeParts,
  };
  const material = sources.materialFactory?.(basin, geometry)
    ?? createPlaceholderSurfaceMaterial();
  const batch = new THREE.Mesh(geometry, material);

  batch.name = `BasinWaterSurfaceBatch_${basin.id}`;
  batch.userData.waterSurfaceBatch = true;
  batch.userData.basinId = basin.id;
  batch.userData.attributeSchema = UNIFIED_WATER_ATTRIBUTE_SCHEMA;
  batch.userData.interfaces = basinInterfaces;
  batch.userData.transitionPatches = transitionPatches;
  batch.userData.stats = stats;

  return batch;
}

export function getRiverLakeTransitionInfluence(signedDistance, transitionLength) {
  if (!(transitionLength > 0)) {
    throw new Error('River-lake transition length must be greater than zero.');
  }

  return smoothstep(-transitionLength, transitionLength, signedDistance);
}

export function getFiveRowTransitionInfluences() {
  return Object.freeze([1, 0.5, 0, -0.5, -1].map(
    (signedDistance) => getRiverLakeTransitionInfluence(signedDistance, 1),
  ));
}

export function validateUnifiedWaterGeometry(geometry) {
  if (!geometry?.isBufferGeometry || !geometry.index) {
    throw new Error('Unified water geometry must be an indexed BufferGeometry.');
  }

  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const uvs = geometry.getAttribute('uv');

  if (!positions || !normals || !uvs) {
    throw new Error('Unified water geometry requires position, normal, and uv attributes.');
  }

  for (const [name, itemSize] of Object.entries(UNIFIED_WATER_ATTRIBUTE_SCHEMA)) {
    const attribute = geometry.getAttribute(name);

    if (!attribute || attribute.itemSize !== itemSize || attribute.count !== positions.count) {
      throw new Error(`Unified water geometry has an invalid ${name} attribute.`);
    }
  }

  return true;
}

function createInterface(id, basinId, sourceId, reachId, endpoint, lakeId) {
  return Object.freeze({
    id,
    basinId,
    sourceId,
    reachId,
    endpoint,
    lakeId,
    transitionRows: TRANSITION_ROW_COUNT,
  });
}

function resolveRiverSource(source, terrain, sources) {
  const supplied = sources[source.id];

  if (supplied) {
    const result = typeof supplied === 'function' ? supplied(terrain, source) : supplied;

    return normalizeSourceResult(result, source.id, typeof supplied === 'function');
  }

  if (source.type === 'network') {
    const factory = sources.createRiverGeometry ?? createRiverNetworkWaterGeometry;

    return normalizeSourceResult(factory(source.network, terrain), source.id, true);
  }
  if (source.type === 'outlet') {
    const factory = sources.createOutletGeometry ?? createAlpineOutletGeometry;

    return normalizeSourceResult(factory(terrain), source.id, true);
  }

  throw new Error(`Unsupported unified water source type ${source.type}.`);
}

function normalizeSourceResult(result, sourceId, owned) {
  if (result?.isBufferGeometry) {
    return {
      geometry: result,
      stats: result.userData.riverNetworkStats,
      owned,
    };
  }
  if (!result?.geometry?.isBufferGeometry || !result.stats) {
    throw new Error(`Water source ${sourceId} must return geometry and stats.`);
  }

  return { ...result, owned };
}

function appendRiverSource(builder, source, result, interfaces, terrain) {
  const { geometry, stats } = result;
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  const flowUv = geometry.getAttribute('flowUv');
  const shoreDistance = geometry.getAttribute('shoreDistance');
  const waterEdge = geometry.getAttribute('waterEdge');
  const flowDirection = geometry.getAttribute('flowDirection');
  const junctionFlowDirection = geometry.getAttribute('junctionFlowDirection');
  const flowSpeed = geometry.getAttribute('flowSpeed');
  const rapidMask = geometry.getAttribute('rapidMask');
  const junctionMask = geometry.getAttribute('junctionMask');
  const disturbanceMask = geometry.getAttribute('disturbanceMask');
  const surfaceOffset = source.type === 'network' ? WATER_SURFACE_OFFSET : 0;
  const vertexOffset = builder.vertexCount;
  const interfaceFrames = interfaces.map((entry) => {
    const reach = stats.reaches.find((candidate) => candidate.id === entry.reachId);

    if (!reach) throw new Error(`Missing reach ${entry.reachId} for interface ${entry.id}.`);

    const rowStart = entry.endpoint === 'start'
      ? reach.startVertex
      : reach.startVertex + (reach.rowCount - 1) * reach.rowSize;
    const first = rowStart;
    const last = rowStart + reach.rowSize - 1;
    const width = Math.hypot(
      position.getX(last) - position.getX(first),
      position.getZ(last) - position.getZ(first),
    );

    return {
      ...entry,
      lake: LAKE_BY_ID.get(entry.lakeId),
      reach,
      rowStart,
      width,
      transitionLength: THREE.MathUtils.clamp(width * 0.25, 1, 3),
    };
  });

  for (let vertex = 0; vertex < position.count; vertex += 1) {
    const x = position.getX(vertex);
    const y = position.getY(vertex) + surfaceOffset;
    const z = position.getZ(vertex);
    let influence = 1;
    let interfaceCoverage = false;

    for (const entry of interfaceFrames) {
      const signedDistance = getLakeBoundaryFrame(entry.lake, x, z).signedDistance;
      const { transitionLength } = entry;

      if (signedDistance <= transitionLength + LAKE_INTERIOR_EPSILON) {
        influence = Math.min(
          influence,
          getRiverLakeTransitionInfluence(signedDistance, transitionLength),
        );
      }
      if (Math.abs(signedDistance) <= LAKE_INTERIOR_EPSILON * 4) {
        interfaceCoverage = true;
      }
    }

    const authoredShoreDistance = shoreDistance?.getX(vertex) ?? 1;
    const lateralWeight = smoothstep(0, 0.25, waterEdge?.getX(vertex) ?? 1);

    builder.pushVertex({
      position: [x, y, z],
      uv: uv ? [uv.getX(vertex), uv.getY(vertex)] : [x * 0.05, z * 0.05],
      waterDepth: Math.max(y - terrain.getHeightAt(x, z), 0),
      shoreDistanceMeters: interfaceCoverage
        ? Math.max(authoredShoreDistance, 0.5)
        : authoredShoreDistance,
      flowUv: flowUv ? [flowUv.getX(vertex), flowUv.getY(vertex)] : [0, 0],
      flowDirection: flowDirection
        ? [flowDirection.getX(vertex), flowDirection.getY(vertex)]
        : [0, 0],
      junctionFlowDirection: junctionFlowDirection
        ? [junctionFlowDirection.getX(vertex), junctionFlowDirection.getY(vertex)]
        : [0, 0],
      flowSpeed: flowSpeed?.getX(vertex) ?? 0,
      riverInfluence: influence * lateralWeight,
      rapidMask: rapidMask?.getX(vertex) ?? 0,
      junctionMask: junctionMask?.getX(vertex) ?? 0,
      disturbanceMask: disturbanceMask?.getX(vertex) ?? 0,
      reflectionTier: 0,
    });
  }

  const startIndex = builder.indices.length;
  const index = geometry.index?.array
    ?? Array.from({ length: position.count }, (_, vertex) => vertex);
  let removedLakeInteriorTriangles = 0;

  for (let offset = 0; offset < index.length; offset += 3) {
    const a = index[offset];
    const b = index[offset + 1];
    const c = index[offset + 2];
    const insideLake = interfaceFrames.some((entry) => (
      [a, b, c].every((vertex) => (
        getLakeBoundaryFrame(
          entry.lake,
          position.getX(vertex),
          position.getZ(vertex),
        ).signedDistance < -LAKE_INTERIOR_EPSILON
      ))
    ));

    if (insideLake) {
      removedLakeInteriorTriangles += 1;
      continue;
    }

    builder.pushUpwardTriangle(vertexOffset + a, vertexOffset + b, vertexOffset + c);
  }

  const attachments = interfaceFrames.map((entry) => {
    const { reach, rowStart } = entry;
    const rowVertices = Array.from(
      { length: reach.rowSize },
      (_, lateral) => vertexOffset + rowStart + lateral,
    );
    const shoreRowIndex = entry.endpoint === 'start' ? 0 : reach.rowCount - 1;
    const outsideDirection = entry.endpoint === 'start' ? 1 : -1;
    const halfRowIndex = THREE.MathUtils.clamp(
      shoreRowIndex + outsideDirection,
      0,
      reach.rowCount - 1,
    );
    const fullRowIndex = THREE.MathUtils.clamp(
      shoreRowIndex + outsideDirection * 2,
      0,
      reach.rowCount - 1,
    );
    const getRowVertices = (rowIndex) => Array.from(
      { length: reach.rowSize },
      (_, lateral) => vertexOffset + reach.startVertex + rowIndex * reach.rowSize + lateral,
    );

    const attachment = {
      ...entry,
      rowVertices,
      outsideRows: [
        getRowVertices(fullRowIndex),
        getRowVertices(halfRowIndex),
      ],
    };

    alignRiverLakeTransitionRows(builder, attachment, terrain);
    return attachment;
  });
  const triangleCount = (builder.indices.length - startIndex) / 3;

  return {
    attachments,
    stats: {
      id: source.id,
      startIndex,
      indexCount: triangleCount * 3,
      triangleCount,
      vertexOffset,
      vertexCount: position.count,
      removedLakeInteriorTriangles,
    },
  };
}

function appendLakeSurface(builder, lake, attachments, terrain, reflectionTier) {
  const center = getLakeCenter(lake);
  const angularSamples = createLakeAngularSamples(builder, lake, attachments);
  const maximumTransitionLength = Math.max(
    1,
    ...attachments.map((entry) => entry.transitionLength),
  );
  const rings = [];
  const transitionPatches = attachments.map((entry) => ({
    id: entry.id,
    basinId: entry.basinId,
    sourceId: entry.sourceId,
    reachId: entry.reachId,
    endpoint: entry.endpoint,
    lakeId: entry.lakeId,
    transitionLength: entry.transitionLength,
    coverage: 1,
    signedDistances: Object.freeze([
      entry.transitionLength,
      entry.transitionLength * 0.5,
      0,
      -entry.transitionLength * 0.5,
      -entry.transitionLength,
    ]),
    rows: [[], [], [], [], []],
  }));
  const patchById = new Map(transitionPatches.map((patch) => [patch.id, patch]));
  const startIndex = builder.indices.length;
  const surfaceY = lake.waterLevel + (lake.surfaceOffset ?? WATER_SURFACE_OFFSET);

  for (let ring = 0; ring < LAKE_RING_COUNT; ring += 1) {
    const row = [];

    for (const sample of angularSamples) {
      const boundaryRadius = getLakeBoundaryRadius(lake, sample.angle);
      const transitionLength = sample.attachment?.transitionLength
        ?? maximumTransitionLength;
      const radius = getLakeRingRadius(
        boundaryRadius,
        ring,
        transitionLength,
      );
      const inset = Math.max(boundaryRadius - radius, 0);
      const x = center.x + Math.cos(sample.angle) * radius;
      const z = center.z + Math.sin(sample.angle) * radius;
      let vertex;

      if (ring === 0 && sample.vertex !== undefined) {
        vertex = sample.vertex;
        const lateralWeight = THREE.MathUtils.clamp(
          builder.getScalar('riverInfluence', vertex) * 2,
          0,
          1,
        );
        const influence = getRiverLakeTransitionInfluence(0, transitionLength)
          * lateralWeight;

        builder.setScalar('shoreDistanceMeters', vertex, Math.max(
          builder.getScalar('shoreDistanceMeters', vertex),
          0.5,
        ));
        builder.setScalar('riverInfluence', vertex, influence);
        builder.setScalar('reflectionTier', vertex, reflectionTier);
      } else {
        vertex = appendLakeVertex(builder, {
          lake,
          terrain,
          x,
          y: surfaceY,
          z,
          center,
          boundaryRadius,
          inset,
          reflectionTier,
          sample,
          ring,
          transitionLength,
        });
      }

      row.push(vertex);
      if (ring < LAKE_TRANSITION_RING_COUNT && sample.attachment) {
        const patch = patchById.get(sample.attachment.id);

        if (ring === 0) {
          patch.rows[0].push(sample.attachment.outsideRows[0][sample.lateral]);
          patch.rows[1].push(sample.attachment.outsideRows[1][sample.lateral]);
        }
        patch.rows[ring + 2].push(vertex);
      }
    }

    rings.push(row);
  }

  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    const outer = rings[ring];
    const inner = rings[ring + 1];

    for (let segment = 0; segment < angularSamples.length; segment += 1) {
      const next = (segment + 1) % angularSamples.length;

      builder.pushUpwardTriangle(outer[segment], inner[segment], outer[next]);
      builder.pushUpwardTriangle(outer[next], inner[segment], inner[next]);
    }
  }

  const centerVertex = appendLakeVertex(builder, {
    lake,
    terrain,
    x: center.x,
    y: surfaceY,
    z: center.z,
    center,
    boundaryRadius: getLakeBoundaryRadius(lake, 0),
    inset: getLakeBoundaryRadius(lake, 0),
    reflectionTier,
    sample: null,
    ring: LAKE_RING_COUNT,
    transitionLength: maximumTransitionLength,
  });
  const inner = rings.at(-1);

  for (let segment = 0; segment < angularSamples.length; segment += 1) {
    const next = (segment + 1) % angularSamples.length;

    builder.pushUpwardTriangle(centerVertex, inner[next], inner[segment]);
  }

  for (const patch of transitionPatches) {
    if (patch.rows.length !== TRANSITION_ROW_COUNT) {
      throw new Error(`Interface ${patch.id} did not produce five transition rows.`);
    }
    patch.rowCount = patch.rows.length;
    patch.vertexCount = patch.rows.reduce((total, row) => total + row.length, 0);
    Object.freeze(patch.rows);
    Object.freeze(patch);
  }

  const triangleCount = (builder.indices.length - startIndex) / 3;

  return {
    transitionPatches,
    stats: {
      id: lake.id,
      startIndex,
      indexCount: triangleCount * 3,
      triangleCount,
      angularSegmentCount: angularSamples.length,
      ringCount: LAKE_RING_COUNT,
      interfaceCount: attachments.length,
    },
  };
}

function alignRiverLakeTransitionRows(builder, attachment, terrain) {
  const { lake, rowVertices, outsideRows, transitionLength } = attachment;
  const surfaceY = lake.waterLevel + (lake.surfaceOffset ?? WATER_SURFACE_OFFSET);
  const [fullRow, halfRow] = outsideRows;

  for (let lateral = 0; lateral < rowVertices.length; lateral += 1) {
    const shoreVertex = rowVertices[lateral];
    const halfVertex = halfRow[lateral];
    const fullVertex = fullRow[lateral];
    const shorePosition = builder.getPosition(shoreVertex);
    const projected = projectPointToLakeBoundary(
      lake,
      shorePosition[0],
      shorePosition[2],
    );
    const frame = getLakeBoundaryFrame(lake, projected.x, projected.z);
    const directionX = (projected.x - frame.centerX) / frame.boundaryRadius;
    const directionZ = (projected.z - frame.centerZ) / frame.boundaryRadius;
    const fullY = builder.getPosition(fullVertex)[1];
    const halfY = THREE.MathUtils.lerp(surfaceY, fullY, 0.5);
    const lateralWeight = THREE.MathUtils.clamp(
      builder.getScalar('riverInfluence', shoreVertex) * 2,
      0,
      1,
    );

    builder.setPosition(fullVertex, [
      projected.x + directionX * transitionLength,
      fullY,
      projected.z + directionZ * transitionLength,
    ]);
    builder.setPosition(halfVertex, [
      projected.x + directionX * transitionLength * 0.5,
      halfY,
      projected.z + directionZ * transitionLength * 0.5,
    ]);
    builder.setPosition(shoreVertex, [projected.x, surfaceY, projected.z]);

    builder.setScalar(
      'riverInfluence',
      fullVertex,
      getRiverLakeTransitionInfluence(transitionLength, transitionLength)
        * lateralWeight,
    );
    builder.setScalar(
      'riverInfluence',
      halfVertex,
      getRiverLakeTransitionInfluence(transitionLength * 0.5, transitionLength)
        * lateralWeight,
    );
    builder.setScalar(
      'riverInfluence',
      shoreVertex,
      getRiverLakeTransitionInfluence(0, transitionLength) * lateralWeight,
    );
    builder.setScalar(
      'shoreDistanceMeters',
      shoreVertex,
      Math.max(builder.getScalar('shoreDistanceMeters', shoreVertex), 0.5),
    );
    for (const vertex of [fullVertex, halfVertex, shoreVertex]) {
      const position = builder.getPosition(vertex);

      builder.setScalar(
        'waterDepth',
        vertex,
        Math.max(position[1] - terrain.getHeightAt(position[0], position[2]), 0),
      );
    }
  }
}

function appendLakeVertex(builder, {
  lake,
  terrain,
  x,
  y,
  z,
  center,
  boundaryRadius,
  inset,
  reflectionTier,
  sample,
  ring,
  transitionLength,
}) {
  const maxRadius = Math.max(lake.radiusX ?? lake.radius, lake.radiusZ ?? lake.radius);
  const sourceVertex = sample?.vertex;
  const insideTransition = sample?.attachment && ring < LAKE_TRANSITION_RING_COUNT;
  const lateralWeight = sourceVertex !== undefined
    ? THREE.MathUtils.clamp(
      builder.getScalar('riverInfluence', sourceVertex) * 2,
      0,
      1,
    )
    : 0;
  const influence = insideTransition
    ? getRiverLakeTransitionInfluence(-inset, transitionLength) * lateralWeight
    : 0;
  const influenceScale = THREE.MathUtils.clamp(influence * 2, 0, 1);
  const flowUv = sourceVertex !== undefined
    ? builder.getVector('flowUv', sourceVertex)
    : [x - center.x, z - center.z];
  const flowDirection = sourceVertex !== undefined
    ? builder.getVector('flowDirection', sourceVertex)
    : [0, 0];
  const junctionFlowDirection = sourceVertex !== undefined
    ? builder.getVector('junctionFlowDirection', sourceVertex)
    : [0, 0];
  const flowSign = sample?.attachment?.endpoint === 'start' ? -1 : 1;

  if (sourceVertex !== undefined) flowUv[0] += flowSign * inset;

  return builder.pushVertex({
    position: [x, y, z],
    uv: [
      (x - center.x) / (maxRadius * 2) + 0.5,
      (z - center.z) / (maxRadius * 2) + 0.5,
    ],
    waterDepth: Math.max(y - terrain.getHeightAt(x, z), 0),
    shoreDistanceMeters: Math.max(inset, insideTransition ? 0.5 : 0),
    flowUv,
    flowDirection,
    junctionFlowDirection,
    flowSpeed: sourceVertex !== undefined
      ? builder.getScalar('flowSpeed', sourceVertex) * influenceScale
      : 0,
    riverInfluence: influence,
    rapidMask: sourceVertex !== undefined
      ? builder.getScalar('rapidMask', sourceVertex) * influenceScale
      : 0,
    junctionMask: sourceVertex !== undefined
      ? builder.getScalar('junctionMask', sourceVertex) * influenceScale
      : 0,
    disturbanceMask: sourceVertex !== undefined
      ? builder.getScalar('disturbanceMask', sourceVertex) * influenceScale
      : 0,
    reflectionTier,
  });
}

function createLakeAngularSamples(builder, lake, attachments) {
  const center = getLakeCenter(lake);
  const attachmentFrames = attachments.map((attachment) => {
    const vertices = attachment.rowVertices.map((vertex, lateral) => {
      const position = builder.getPosition(vertex);

      return {
        vertex,
        lateral,
        angle: normalizeAngle(Math.atan2(position[2] - center.z, position[0] - center.x)),
      };
    });
    const centerAngle = normalizeAngle(Math.atan2(
      vertices.reduce((sum, sample) => sum + Math.sin(sample.angle), 0),
      vertices.reduce((sum, sample) => sum + Math.cos(sample.angle), 0),
    ));
    const sorted = vertices
      .map((sample) => ({ ...sample, delta: signedAngle(sample.angle - centerAngle) }))
      .sort((a, b) => a.delta - b.delta);

    return {
      attachment,
      centerAngle,
      minDelta: sorted[0].delta,
      maxDelta: sorted.at(-1).delta,
      samples: sorted,
    };
  });
  const samples = [];

  for (let segment = 0; segment < LAKE_ANGLE_SEGMENTS; segment += 1) {
    const angle = segment / LAKE_ANGLE_SEGMENTS * TWO_PI;
    const insideInterface = attachmentFrames.some((frame) => {
      const delta = signedAngle(angle - frame.centerAngle);

      return delta > frame.minDelta + ANGLE_EPSILON
        && delta < frame.maxDelta - ANGLE_EPSILON;
    });

    if (!insideInterface) samples.push({ angle });
  }

  for (const frame of attachmentFrames) {
    for (const sample of frame.samples) {
      samples.push({
        angle: sample.angle,
        vertex: sample.vertex,
        lateral: sample.lateral,
        attachment: frame.attachment,
      });
    }
  }

  samples.sort((a, b) => a.angle - b.angle);

  const unique = [];

  for (const sample of samples) {
    const previous = unique.at(-1);

    if (previous && Math.abs(sample.angle - previous.angle) < ANGLE_EPSILON) {
      if (sample.vertex !== undefined) unique[unique.length - 1] = sample;
      continue;
    }
    unique.push(sample);
  }

  return unique;
}

function getLakeRingRadius(boundaryRadius, ring, transitionLength) {
  if (ring < LAKE_TRANSITION_RING_COUNT) {
    return Math.max(
      boundaryRadius - transitionLength * ring / (LAKE_TRANSITION_RING_COUNT - 1),
      0,
    );
  }

  const remainingRings = LAKE_RING_COUNT - LAKE_TRANSITION_RING_COUNT + 1;
  const innerT = (ring - (LAKE_TRANSITION_RING_COUNT - 1)) / remainingRings;

  return Math.max((boundaryRadius - transitionLength) * (1 - innerT), 0);
}

function getLakeReflectionTier(lake) {
  return lake.id === ALPINE_LAKE_BOUNDARY.id ? 1 : 0.5;
}

function createPlaceholderSurfaceMaterial() {
  const material = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });

  material.name = 'UnifiedWaterSurfacePlaceholderMaterial';
  material.userData.unifiedWaterPlaceholder = true;

  return material;
}

function createAlpineOutletGeometry(terrain) {
  const shore = findLakeBoundaryIntersection(
    ALPINE_LAKE_BOUNDARY,
    { x: 340, z: -410 },
    { x: 365, z: -417 },
  );
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(shore.x, 0, shore.z),
    new THREE.Vector3(365, 0, -417),
    new THREE.Vector3(392, 0, -419),
    new THREE.Vector3(409, 0, -421),
  ], false, 'centripetal');
  const longitudinalSegments = 90;
  const lateralSegments = 10;
  const rowSize = lateralSegments + 1;
  const vertexCount = (longitudinalSegments + 1) * rowSize;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const flowUvs = new Float32Array(vertexCount * 2);
  const waterDepths = new Float32Array(vertexCount);
  const shoreDistances = new Float32Array(vertexCount);
  const waterEdges = new Float32Array(vertexCount);
  const flowSpeeds = new Float32Array(vertexCount);
  const rapidMasks = new Float32Array(vertexCount);
  const flowDirections = new Float32Array(vertexCount * 2);
  const junctionFlowDirections = new Float32Array(vertexCount * 2);
  const disturbanceMasks = new Float32Array(vertexCount);
  const waterFades = new Float32Array(vertexCount);
  const junctionMasks = new Float32Array(vertexCount);
  const indices = new Uint32Array(longitudinalSegments * lateralSegments * 6);
  const pathLength = curve.getLength();

  for (let row = 0; row <= longitudinalSegments; row += 1) {
    const t = row / longitudinalSegments;
    const center = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const localWidth = 5.2 + Math.sin(row * 1.71) * 0.18 + Math.sin(row * 0.39) * 0.24;

    for (let lateral = 0; lateral <= lateralSegments; lateral += 1) {
      const lateralT = lateral / lateralSegments;
      const distance = (lateralT - 0.5) * localWidth;
      let x = center.x + side.x * distance;
      let z = center.z + side.z * distance;

      if (row === 0) ({ x, z } = projectPointToLakeBoundary(ALPINE_LAKE_BOUNDARY, x, z));

      const signedDistance = getLakeBoundaryFrame(ALPINE_LAKE_BOUNDARY, x, z).signedDistance;
      const lakeSurface = ALPINE_LAKE_BOUNDARY.waterLevel + WATER_SURFACE_OFFSET;
      const riverSurface = terrain.getHeightAt(x, z) + 0.35;
      const y = THREE.MathUtils.lerp(
        lakeSurface,
        riverSurface,
        smoothstep(0, 12, signedDistance),
      );
      const vertex = row * rowSize + lateral;

      positions[vertex * 3] = x;
      positions[vertex * 3 + 1] = y;
      positions[vertex * 3 + 2] = z;
      uvs[vertex * 2] = t * pathLength;
      uvs[vertex * 2 + 1] = lateralT;
      flowUvs[vertex * 2] = t * pathLength;
      flowUvs[vertex * 2 + 1] = distance;
      waterDepths[vertex] = Math.max(y - terrain.getHeightAt(x, z), 0);
      shoreDistances[vertex] = (1 - Math.abs(lateralT * 2 - 1)) * localWidth * 0.5;
      waterEdges[vertex] = 1 - Math.abs(lateralT * 2 - 1);
      flowSpeeds[vertex] = 0.9;
      rapidMasks[vertex] = smoothstep(0.58, 0.94, t);
      flowDirections[vertex * 2] = tangent.x;
      flowDirections[vertex * 2 + 1] = tangent.z;
      junctionFlowDirections[vertex * 2] = tangent.x;
      junctionFlowDirections[vertex * 2 + 1] = tangent.z;
      disturbanceMasks[vertex] = 0;
      waterFades[vertex] = (row === 0 ? 0 : 1) * (1 - smoothstep(0.93, 1, t));
      junctionMasks[vertex] = 0;
    }
  }

  let indexOffset = 0;

  for (let row = 0; row < longitudinalSegments; row += 1) {
    for (let lateral = 0; lateral < lateralSegments; lateral += 1) {
      const a = row * rowSize + lateral;
      const b = a + 1;
      const c = a + rowSize;
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
  geometry.setAttribute('flowUv', new THREE.BufferAttribute(flowUvs, 2));
  geometry.setAttribute('waterDepth', new THREE.BufferAttribute(waterDepths, 1));
  geometry.setAttribute('shoreDistance', new THREE.BufferAttribute(shoreDistances, 1));
  geometry.setAttribute('waterEdge', new THREE.BufferAttribute(waterEdges, 1));
  geometry.setAttribute('flowSpeed', new THREE.BufferAttribute(flowSpeeds, 1));
  geometry.setAttribute('rapidMask', new THREE.BufferAttribute(rapidMasks, 1));
  geometry.setAttribute('flowDirection', new THREE.BufferAttribute(flowDirections, 2));
  geometry.setAttribute(
    'junctionFlowDirection',
    new THREE.BufferAttribute(junctionFlowDirections, 2),
  );
  geometry.setAttribute('disturbanceMask', new THREE.BufferAttribute(disturbanceMasks, 1));
  geometry.setAttribute('waterFade', new THREE.BufferAttribute(waterFades, 1));
  geometry.setAttribute('junctionMask', new THREE.BufferAttribute(junctionMasks, 1));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  return {
    geometry,
    stats: {
      reaches: [{
        id: 'alpine-outlet',
        startVertex: 0,
        rowCount: longitudinalSegments + 1,
        rowSize,
      }],
    },
  };
}

function createGeometryBuilder() {
  const vectorSizes = {
    position: 3,
    uv: 2,
    ...UNIFIED_WATER_ATTRIBUTE_SCHEMA,
  };
  const data = Object.fromEntries(Object.keys(vectorSizes).map((name) => [name, []]));
  const builder = {
    data,
    indices: [],
    get vertexCount() {
      return data.position.length / 3;
    },
    pushVertex(values) {
      const vertex = this.vertexCount;

      for (const [name, itemSize] of Object.entries(vectorSizes)) {
        const value = values[name];

        if (itemSize === 1) data[name].push(value ?? 0);
        else data[name].push(...(value ?? Array(itemSize).fill(0)));
      }

      return vertex;
    },
    getPosition(vertex) {
      const offset = vertex * 3;

      return data.position.slice(offset, offset + 3);
    },
    setPosition(vertex, value) {
      const offset = vertex * 3;

      data.position.splice(offset, 3, ...value);
    },
    getScalar(name, vertex) {
      return data[name][vertex];
    },
    setScalar(name, vertex, value) {
      data[name][vertex] = value;
    },
    getVector(name, vertex) {
      const size = vectorSizes[name];
      const offset = vertex * size;

      return data[name].slice(offset, offset + size);
    },
    pushUpwardTriangle(a, b, c) {
      const pa = this.getPosition(a);
      const pb = this.getPosition(b);
      const pc = this.getPosition(c);
      const crossY = (pb[2] - pa[2]) * (pc[0] - pa[0])
        - (pb[0] - pa[0]) * (pc[2] - pa[2]);

      if (crossY >= 0) this.indices.push(a, b, c);
      else this.indices.push(a, c, b);
    },
  };

  return builder;
}

function reorientUpwardTriangles(builder) {
  for (let offset = 0; offset < builder.indices.length; offset += 3) {
    const a = builder.indices[offset];
    const b = builder.indices[offset + 1];
    const c = builder.indices[offset + 2];
    const pa = builder.getPosition(a);
    const pb = builder.getPosition(b);
    const pc = builder.getPosition(c);
    const crossY = (pb[2] - pa[2]) * (pc[0] - pa[0])
      - (pb[0] - pa[0]) * (pc[2] - pa[2]);

    if (crossY < 0) {
      builder.indices[offset + 1] = c;
      builder.indices[offset + 2] = b;
    }
  }
}

function finalizeGeometry(builder) {
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(builder.data.position, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(builder.data.uv, 2));

  for (const [name, itemSize] of Object.entries(UNIFIED_WATER_ATTRIBUTE_SCHEMA)) {
    geometry.setAttribute(
      name,
      new THREE.Float32BufferAttribute(builder.data[name], itemSize),
    );
  }

  geometry.setIndex(new THREE.Uint32BufferAttribute(builder.indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  validateUnifiedWaterGeometry(geometry);

  return geometry;
}

function validateTerrain(terrain) {
  if (!terrain || typeof terrain.getHeightAt !== 'function') {
    throw new Error('Unified water terrain must provide getHeightAt(x, z).');
  }
}

function normalizeAngle(angle) {
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

function signedAngle(angle) {
  return ((angle + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}
