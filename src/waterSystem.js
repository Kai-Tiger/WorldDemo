import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createFlowingRiverMaterial } from './flowingRiverMaterial.js';
import {
  WATER_DUAL_WAVE_GLSL,
  WATER_FOG_FRAGMENT_GLSL,
  WATER_FOG_FRAGMENT_PARS_GLSL,
  WATER_FOG_VERTEX_GLSL,
  WATER_FOG_VERTEX_PARS_GLSL,
  WATER_NOISE_GLSL,
  WATER_REFLECTION_GLSL,
  WATER_RENDER_ORDER,
  createWaterUniforms,
} from './waterContext.js';
import {
  RIVER_NETWORK,
  applyRiverNetworkTerrain,
  getNearestRiverReach,
  getRiverBankGrassAcceptance,
  getRiverNetworkFeatureBounds,
  getRiverNetworkGrassAcceptance,
  isInRiverNetworkVegetationExclusion,
} from './hydrology/riverNetwork.js';
import { createRiverNetworkWaterGeometry } from './hydrology/riverNetworkWaterGeometry.js';
import { PLUNGE_POOL } from './lowlandHeightPlan.js';
import { getRiverGrassAcceptance } from './riverChannel.js';
import {
  LOWLAND_LAKES,
  LOWLAND_STREAM_NETWORKS,
  createLowlandLakeGeometry,
  getLowlandMaterialFrame,
  getLowlandStreamGrassAcceptance,
  getLowlandStreamLakeFade,
  isInLowlandVegetationExclusion,
} from './lowlandLandforms.js';

export const LAKE_CENTER = new THREE.Vector2(300, -400);
export const LAKE_WATER_LEVEL = 31;
const LAKE_BASE_RADIUS = 47;
const LAKE_SHORE_WIDTH = 9;
const LAKE_BASIN_FLOOR = 24.5;
const LAKE_SHAPE_SEGMENTS = 96;
const LAKE_MESH_SEGMENTS = 22;
const SOUTHWEST_SHORE_CENTER_X = 289;
const SOUTHWEST_SHORE_CENTER_Z = -462;
const SOUTHWEST_SHORE_RADIUS_X = 68;
const SOUTHWEST_SHORE_RADIUS_Z = 24;
const SOUTHWEST_SHORE_INNER_OFFSET = -9;
const SOUTHWEST_SHORE_OUTER_OFFSET = 24;
const WATER_SYSTEM_MIN_X = 130;
const WATER_SYSTEM_MAX_X = 435;
const WATER_SYSTEM_MIN_Z = -640;
const WATER_SYSTEM_MAX_Z = -330;
const WATER_FEATURE_MIN_SEGMENTS = 128;
const NARROW_WATER_FEATURE_BOUNDS = [
  { minX: 140, maxX: 320, minZ: -640, maxZ: -418 },
  { minX: 330, maxX: 420, minZ: -432, maxZ: -400 },
  { minX: 410, maxX: 705, minZ: -440, maxZ: -320 },
];
const WIDE_WATER_FEATURE_BOUNDS = [
  { minX: 235, maxX: 365, minZ: -465, maxZ: -335 },
  { minX: 625, maxX: 710, minZ: -650, maxZ: -560 },
  { minX: 655, maxX: 725, minZ: -375, maxZ: -305 },
];
const RIVER_NETWORK_FEATURE_BOUNDS = getRiverNetworkFeatureBounds();

const OUTLET_POINTS = [
  new THREE.Vector3(340, 0, -410),
  new THREE.Vector3(365, 0, -417),
  new THREE.Vector3(392, 0, -419),
  new THREE.Vector3(409, 0, -421),
];
const OUTLET_WIDTH = 5.2;
const OUTLET_INFLUENCE = 8.5;
const OUTLET_GRASS_FULL_WIDTH = OUTLET_INFLUENCE + 2.5;
const OUTLET_GRASS_BOUNDS = {
  minX: Math.min(...OUTLET_POINTS.map((point) => point.x)) - OUTLET_GRASS_FULL_WIDTH,
  maxX: Math.max(...OUTLET_POINTS.map((point) => point.x)) + OUTLET_GRASS_FULL_WIDTH,
  minZ: Math.min(...OUTLET_POINTS.map((point) => point.z)) - OUTLET_GRASS_FULL_WIDTH,
  maxZ: Math.max(...OUTLET_POINTS.map((point) => point.z)) + OUTLET_GRASS_FULL_WIDTH,
};
const OUTLET_WATER_OFFSET = 0.35;
const WATERFALL_LIP_FOAM_LENGTH = 4.2;
const WATERFALL_LIP_FOAM_WIDTH = 7.2;

const WATERFALL_LIP = new THREE.Vector3(409, LAKE_WATER_LEVEL - 0.6, -421);
const WATERFALL_BASE = new THREE.Vector3(418, 1.5, -424);
const WATERFALL_WIDTH = 7.5;
const WATERFALL_LAYERS = [
  { name: 'WaterfallMainVeil', xOffset: 0, zOffset: 0, width: 0.72, alpha: 0.22, speed: 1.15 },
  { name: 'WaterfallLeftThreads', xOffset: -1.7, zOffset: -0.45, width: 0.3, alpha: 0.1, speed: 1.35 },
  { name: 'WaterfallRightThreads', xOffset: 1.7, zOffset: 0.3, width: 0.32, alpha: 0.11, speed: 1.28 },
  { name: 'WaterfallMistVeil', xOffset: 0.3, zOffset: 0.8, width: 0.82, alpha: 0.05, speed: 0.72 },
];

const PLUNGE_CENTER = new THREE.Vector2(PLUNGE_POOL.cx, PLUNGE_POOL.cz);
const PLUNGE_RADIUS = PLUNGE_POOL.radius;
const PLUNGE_OUTFLOW_DIRECTION = new THREE.Vector2(0.82, 0.57).normalize();
const PLUNGE_OUTFLOW_LENGTH = 24;
const PLUNGE_OUTFLOW_START_WIDTH = 8.5;
const PLUNGE_OUTFLOW_END_WIDTH = 4.2;

const outletCurve = new THREE.CatmullRomCurve3(OUTLET_POINTS, false, 'centripetal');
const outletSamples = createPathSamples(outletCurve, 100);

export function applyWaterSystemTerrain(baseHeight, x, z) {
  let height = applyWaterSystemMacroTerrain(baseHeight, x, z);

  height = applyRiverNetworkTerrain(height, x, z);

  return height;
}

export function applyWaterSystemMacroTerrain(baseHeight, x, z) {
  if (!isNearWaterSystem(x, z)) return baseHeight;

  let height = applyLakeBasin(baseHeight, x, z);

  height = applyOutletChannel(height, x, z);
  height = applyPlungePool(height, x, z);

  return height;
}

export function getWaterSystemMaterialFrame(baseHeight, x, z) {
  const riverNetwork = getRiverNetworkMaterialFrame(x, z);
  const lowland = getLowlandMaterialFrame(x, z);
  const networkBedMask = Math.max(riverNetwork.bedMask, lowland.bedMask);
  const networkWetMask = Math.max(riverNetwork.wetMask, lowland.wetMask);

  if (!isNearWaterSystem(x, z)) {
    return {
      ...createEmptyWaterSystemMaterialFrame(),
      lakeBedMask: lowland.lakeBedMask,
      wetShoreMask: networkWetMask,
      snowmeltWetMask: Math.max(networkWetMask, networkBedMask),
      riverNetworkBedMask: networkBedMask,
    };
  }

  const lake = getLakeFrame(x, z);
  const outlet = getPathFrame(outletSamples, x, z);
  const plungeDistance = new THREE.Vector2(x, z).distanceTo(PLUNGE_CENTER);
  const lakeBedMask = lake.inside * (1 - smoothstep(lake.lakeRadius - 1.2, lake.lakeRadius + 0.4, lake.radius));
  const lakeInnerShoreMask = lake.inside * smoothstep(lake.lakeRadius - 8, lake.lakeRadius - 1.4, lake.radius);
  const lakeOuterShoreMask = (1 - lake.inside) * (1 - smoothstep(lake.lakeRadius, lake.lakeRadius + LAKE_SHORE_WIDTH, lake.radius));
  const outletMask = outlet ? 1 - smoothstep(OUTLET_WIDTH * 0.5, OUTLET_INFLUENCE, Math.abs(outlet.lateral)) : 0;
  const plungeMask = 1 - smoothstep(PLUNGE_RADIUS * 0.45, PLUNGE_RADIUS, plungeDistance);
  const wetShoreMask = Math.max(
    lakeInnerShoreMask * 0.68,
    lakeOuterShoreMask,
    outletMask * 0.65,
    networkWetMask,
    plungeMask * 0.8,
  );

  return {
    lakeBedMask: THREE.MathUtils.clamp(Math.max(lakeBedMask, lowland.lakeBedMask), 0, 1),
    wetShoreMask: THREE.MathUtils.clamp(wetShoreMask, 0, 1),
    snowmeltWetMask: Math.max(networkWetMask, networkBedMask),
    outletMask: THREE.MathUtils.clamp(outletMask, 0, 1),
    plungeMask: THREE.MathUtils.clamp(plungeMask, 0, 1),
    lakeDistance: lake.radius,
    riverNetworkBedMask: networkBedMask,
  };
}

export function isInWaterSystemVegetationExclusion(x, z, buffer = 2) {
  if (isInRiverNetworkVegetationExclusion(x, z, buffer)) return true;
  if (isInLowlandVegetationExclusion(x, z, buffer)) return true;
  if (!isNearWaterSystem(x, z, buffer + 12)) return false;

  const lake = getLakeFrame(x, z);
  if (lake.radius <= lake.lakeRadius + LAKE_SHORE_WIDTH + buffer) return true;

  const outlet = getPathFrame(outletSamples, x, z);
  if (outlet && Math.abs(outlet.lateral) <= OUTLET_WIDTH * 0.5 + buffer + 1.5) return true;

  const plungeDistance = new THREE.Vector2(x, z).distanceTo(PLUNGE_CENTER);

  return plungeDistance <= PLUNGE_RADIUS + buffer;
}

export function getFlowingWaterGrassAcceptance(x, z) {
  const lake = getLakeFrame(x, z);

  if (lake.radius <= lake.lakeRadius + LAKE_SHORE_WIDTH + 4) return 0;

  const plungeDistance = Math.hypot(x - PLUNGE_CENTER.x, z - PLUNGE_CENTER.y);

  if (plungeDistance <= PLUNGE_RADIUS + 4) return 0;

  let acceptance = Math.min(
    getRiverGrassAcceptance(x, z),
    getRiverNetworkGrassAcceptance(x, z, RIVER_NETWORK),
    getLowlandStreamGrassAcceptance(x, z),
  );
  const outlet = x >= OUTLET_GRASS_BOUNDS.minX
    && x <= OUTLET_GRASS_BOUNDS.maxX
    && z >= OUTLET_GRASS_BOUNDS.minZ
    && z <= OUTLET_GRASS_BOUNDS.maxZ
    ? getPathFrame(outletSamples, x, z)
    : null;

  if (outlet) {
    const lateralDistance = Math.abs(outlet.lateral);
    const outletAcceptance = getRiverBankGrassAcceptance({
      distance: lateralDistance,
      halfWidth: OUTLET_WIDTH * 0.5,
      influence: OUTLET_INFLUENCE,
    });
    const outletLength = outletSamples.at(-1).distance;
    const distanceToLip = outletLength - outlet.distance;
    const lipAcceptance = lateralDistance <= OUTLET_GRASS_FULL_WIDTH
      ? smoothstep(3, 5.5, distanceToLip)
      : 1;

    acceptance = Math.min(acceptance, outletAcceptance, lipAcceptance);
  }

  return acceptance;
}

export function getWaterSystemMinimumSegmentsForBounds(bounds) {
  let minimum = 0;

  if (NARROW_WATER_FEATURE_BOUNDS.some((feature) => boundsIntersect(bounds, feature))) {
    minimum = 256;
  } else if (WIDE_WATER_FEATURE_BOUNDS.some((feature) => boundsIntersect(bounds, feature))) {
    minimum = WATER_FEATURE_MIN_SEGMENTS;
  }

  for (const feature of RIVER_NETWORK_FEATURE_BOUNDS) {
    if (!boundsIntersect(bounds, feature)) continue;

    minimum = Math.max(minimum, feature.type === 'reach' ? 256 : WATER_FEATURE_MIN_SEGMENTS);
  }

  return minimum;
}

function createEmptyWaterSystemMaterialFrame() {
  return {
    lakeBedMask: 0,
    wetShoreMask: 0,
    snowmeltWetMask: 0,
    outletMask: 0,
    plungeMask: 0,
    lakeDistance: 0,
    riverNetworkBedMask: 0,
  };
}

export function createWaterSystem(terrain) {
  const flowingRiverMaterial = createFlowingRiverMaterial();
  const lake = createLakeWater(terrain);
  const outletStream = createOutletStream(terrain, flowingRiverMaterial);
  const tributaries = createRiverNetworkWaterSurface(terrain, flowingRiverMaterial);
  const cirqueTarn = createCirqueTarn(terrain);
  const waterfall = createWaterfallGroup(terrain);
  const waterfallLipFoam = createWaterfallLipFoam(terrain);
  const confluence = createConfluenceFoam();
  const lowlands = createLowlandWaterFeatures(terrain, flowingRiverMaterial);
  const group = new THREE.Group();

  group.name = 'WaterSystem';
  group.add(
    lake,
    outletStream,
    tributaries,
    cirqueTarn,
    waterfall,
    waterfallLipFoam,
    confluence,
    lowlands.group,
  );

  return {
    group,
    lake,
    outletStream,
    tributaries,
    snowmelt: tributaries,
    cirqueTarn,
    waterfall,
    waterfallLipFoam,
    confluence,
    lowlands,
  };
}

export function updateWaterSystemVisuals(system, camera, elapsedTime) {
  if (!system) return;

  updateShaderGroup(system.group, camera, elapsedTime);
}

function applyLakeBasin(baseHeight, x, z) {
  const frame = getLakeFrame(x, z);
  const lakeRadius = frame.lakeRadius;
  const shoreOuter = lakeRadius + LAKE_SHORE_WIDTH;

  if (frame.radius > shoreOuter) {
    return applySouthwestShoreRaise(baseHeight, frame, x, z);
  }

  let height;

  if (frame.radius <= lakeRadius) {
    const basinT = smoothstep(lakeRadius * 0.18, lakeRadius, frame.radius);
    const target = THREE.MathUtils.lerp(LAKE_BASIN_FLOOR, LAKE_WATER_LEVEL - 1.35, basinT);

    height = Math.min(baseHeight, target);
  } else {
    const shoreT = smoothstep(lakeRadius, shoreOuter, frame.radius);
    const target = THREE.MathUtils.lerp(LAKE_WATER_LEVEL - 0.45, baseHeight, shoreT);

    height = Math.min(baseHeight, target);
  }

  return applySouthwestShoreRaise(height, frame, x, z);
}

function applySouthwestShoreRaise(height, frame, x, z) {
  const localX = (x - SOUTHWEST_SHORE_CENTER_X) / SOUTHWEST_SHORE_RADIUS_X;
  const localZ = (z - SOUTHWEST_SHORE_CENTER_Z) / SOUTHWEST_SHORE_RADIUS_Z;
  const localMask = 1 - smoothstep(0.58, 1, Math.sqrt(localX * localX + localZ * localZ));
  const shoreOffset = frame.radius - frame.lakeRadius;
  const shoreBand = smoothstep(SOUTHWEST_SHORE_INNER_OFFSET, -2, shoreOffset)
    * (1 - smoothstep(16, SOUTHWEST_SHORE_OUTER_OFFSET, shoreOffset));
  const bankT = smoothstep(-4, 14, shoreOffset);
  const target = THREE.MathUtils.lerp(LAKE_WATER_LEVEL - 0.35, LAKE_WATER_LEVEL + 1.15, bankT);
  const raised = THREE.MathUtils.lerp(height, target, localMask * shoreBand);

  return Math.max(height, raised);
}

function applyOutletChannel(height, x, z) {
  const frame = getPathFrame(outletSamples, x, z);

  if (!frame) return height;

  const lateralDistance = Math.abs(frame.lateral);
  if (lateralDistance > OUTLET_INFLUENCE) return height;

  const bedMask = 1 - smoothstep(0, OUTLET_WIDTH * 0.5, lateralDistance);
  const bankMask = 1 - smoothstep(OUTLET_WIDTH * 0.5, OUTLET_INFLUENCE, lateralDistance);
  const flowT = frame.distance / outletSamples[outletSamples.length - 1].distance;
  const target = THREE.MathUtils.lerp(LAKE_WATER_LEVEL - 1.7, WATERFALL_LIP.y - 1.1, flowT);
  const carveMask = Math.max(bedMask, bankMask * 0.45);

  return Math.min(height, THREE.MathUtils.lerp(height, target, carveMask));
}

function applyPlungePool(height, x, z) {
  const distance = new THREE.Vector2(x, z).distanceTo(PLUNGE_CENTER);

  if (distance > PLUNGE_RADIUS) return height;

  const radiusT = distance / PLUNGE_RADIUS;
  const depthT = smoothstep(0.18, 1, radiusT);
  const depth = THREE.MathUtils.lerp(
    PLUNGE_POOL.maxDepth,
    PLUNGE_POOL.edgeDepth,
    depthT,
  );
  const target = PLUNGE_POOL.waterLevel - depth;

  return Math.min(height, target);
}

function createLakeWater(terrain) {
  const geometry = createLakeGeometry(terrain);
  const lake = new THREE.Group();
  const surface = new THREE.Mesh(geometry, createLakeSurfaceMaterial());

  lake.name = 'AlpineLakeWater';
  surface.name = 'AlpineLakeSurface';
  surface.renderOrder = WATER_RENDER_ORDER.surface;
  lake.add(surface);

  return lake;
}

function createRiverNetworkWaterSurface(terrain, material) {
  const { geometry, stats } = createRiverNetworkWaterGeometry(RIVER_NETWORK, terrain);
  const water = new THREE.Mesh(geometry, material);

  water.name = 'AlpineRiverNetworkSurface';
  water.renderOrder = WATER_RENDER_ORDER.surface;
  water.userData.waterReflectionModeCap = 1;
  water.userData.riverNetworkStats = stats;

  return water;
}

function createLowlandWaterFeatures(terrain, streamMaterial) {
  const streamParts = LOWLAND_STREAM_NETWORKS.map((network) => {
    const { geometry, stats } = createRiverNetworkWaterGeometry(network, terrain);
    const surfaceOffset = LOWLAND_LAKES[0].surfaceOffset;
    const positions = geometry.getAttribute('position');
    const waterDepths = geometry.getAttribute('waterDepth');

    geometry.translate(0, surfaceOffset, 0);
    for (let vertex = 0; vertex < waterDepths.count; vertex += 1) {
      waterDepths.setX(vertex, Math.max(
        positions.getY(vertex) - terrain.getHeightAt(positions.getX(vertex), positions.getZ(vertex)),
        0,
      ));
    }
    waterDepths.needsUpdate = true;
    blendLowlandStreamIntoLakes(geometry);

    return { geometry, stats };
  });
  const streamGeometry = mergeGeometries(
    streamParts.map((part) => part.geometry),
    false,
  );
  const stream = new THREE.Mesh(streamGeometry, streamMaterial);
  const streams = [stream];

  stream.name = 'LowlandStreamSurface';
  stream.renderOrder = WATER_RENDER_ORDER.surface;
  stream.userData.waterReflectionModeCap = 1;
  stream.userData.riverNetworkStats = mergeRiverNetworkStats(streamParts);
  streamParts.forEach((part) => part.geometry.dispose());

  const lakeMaterial = createLakeSurfaceMaterial();
  const lakes = LOWLAND_LAKES.map((lake) => {
    const mesh = new THREE.Mesh(
      createLowlandLakeGeometry(lake, terrain),
      lakeMaterial,
    );

    mesh.name = `LowlandLake_${lake.id}`;
    mesh.renderOrder = WATER_RENDER_ORDER.surface;
    mesh.userData.waterReflectionModeCap = 1;
    return mesh;
  });
  const group = new THREE.Group();

  group.name = 'LowlandWaterFeatures';
  group.add(...streams, ...lakes);

  return { group, stream, streams, lakes };
}

function mergeRiverNetworkStats(parts) {
  let vertexOffset = 0;
  let indexOffset = 0;
  const reaches = [];
  const junctions = [];

  for (const part of parts) {
    reaches.push(...part.stats.reaches.map((reach) => ({
      ...reach,
      startVertex: reach.startVertex + vertexOffset,
      startIndex: reach.startIndex + indexOffset,
    })));
    junctions.push(...part.stats.junctions.map((junction) => ({
      ...junction,
      centerVertex: junction.centerVertex + vertexOffset,
      boundaryVertices: junction.boundaryVertices.map((vertex) => vertex + vertexOffset),
      startIndex: junction.startIndex + indexOffset,
    })));
    vertexOffset += part.stats.vertexCount;
    indexOffset += part.stats.triangleCount * 3;
  }

  return {
    reachCount: reaches.length,
    junctionCount: junctions.length,
    vertexCount: vertexOffset,
    triangleCount: parts.reduce((total, part) => total + part.stats.triangleCount, 0),
    stripTriangleCount: parts.reduce((total, part) => total + part.stats.stripTriangleCount, 0),
    junctionTriangleCount: parts.reduce(
      (total, part) => total + part.stats.junctionTriangleCount,
      0,
    ),
    hiddenRowCount: parts.reduce((total, part) => total + part.stats.hiddenRowCount, 0),
    transitionRowCount: parts.reduce(
      (total, part) => total + part.stats.transitionRowCount,
      0,
    ),
    maxTriangleBudget: parts.reduce(
      (total, part) => total + part.stats.maxTriangleBudget,
      0,
    ),
    reaches,
    junctions,
  };
}

function blendLowlandStreamIntoLakes(geometry) {
  const positions = geometry.getAttribute('position');
  const waterFades = geometry.getAttribute('waterFade');

  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    const x = positions.getX(vertex);
    const z = positions.getZ(vertex);
    const lakeFade = getLowlandStreamLakeFade(x, z);

    waterFades.setX(vertex, waterFades.getX(vertex) * lakeFade);
  }

  waterFades.needsUpdate = true;
}

function createCirqueTarn(terrain) {
  const tarn = RIVER_NETWORK.nodeById.get('cirque-tarn');
  const water = new THREE.Mesh(
    createCircularLakeGeometry(terrain, tarn),
    createLakeSurfaceMaterial(),
  );

  water.name = 'CirqueTarnSurface';
  water.renderOrder = WATER_RENDER_ORDER.surface;
  water.userData.waterReflectionModeCap = 1;

  return water;
}

function createCircularLakeGeometry(terrain, lake) {
  const radialSegments = 64;
  const ringCount = 10;
  const vertexCount = 1 + radialSegments * ringCount;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const lakeDepths = new Float32Array(vertexCount);
  const lakeEdges = new Float32Array(vertexCount);
  const lakeBedVisibilities = new Float32Array(vertexCount);
  const indices = new Uint32Array(
    radialSegments * 3 + (ringCount - 1) * radialSegments * 6,
  );
  const center = lake.center ?? lake.position;
  let vertex = 0;
  let indexOffset = 0;

  writeCircularLakeVertex(
    positions,
    uvs,
    lakeDepths,
    lakeEdges,
    lakeBedVisibilities,
    vertex,
    terrain,
    lake,
    center[0],
    center[1],
    1,
  );
  vertex += 1;

  for (let ring = 1; ring <= ringCount; ring += 1) {
    const radiusT = ring / ringCount;

    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2;

      writeCircularLakeVertex(
        positions,
        uvs,
        lakeDepths,
        lakeEdges,
        lakeBedVisibilities,
        vertex,
        terrain,
        lake,
        center[0] + Math.cos(angle) * lake.radius * radiusT,
        center[1] + Math.sin(angle) * lake.radius * radiusT,
        1 - radiusT,
      );
      vertex += 1;
    }
  }

  for (let segment = 0; segment < radialSegments; segment += 1) {
    indices[indexOffset] = 0;
    indices[indexOffset + 1] = 1 + ((segment + 1) % radialSegments);
    indices[indexOffset + 2] = 1 + segment;
    indexOffset += 3;
  }

  for (let ring = 1; ring < ringCount; ring += 1) {
    const innerStart = 1 + (ring - 1) * radialSegments;
    const outerStart = 1 + ring * radialSegments;

    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      const a = innerStart + segment;
      const b = innerStart + next;
      const c = outerStart + segment;
      const d = outerStart + next;

      indices[indexOffset] = a;
      indices[indexOffset + 1] = b;
      indices[indexOffset + 2] = d;
      indices[indexOffset + 3] = a;
      indices[indexOffset + 4] = d;
      indices[indexOffset + 5] = c;
      indexOffset += 6;
    }
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('lakeDepth', new THREE.BufferAttribute(lakeDepths, 1));
  geometry.setAttribute('lakeEdge', new THREE.BufferAttribute(lakeEdges, 1));
  geometry.setAttribute('lakeBedVisibility', new THREE.BufferAttribute(lakeBedVisibilities, 1));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

function writeCircularLakeVertex(
  positions,
  uvs,
  lakeDepths,
  lakeEdges,
  lakeBedVisibilities,
  vertex,
  terrain,
  lake,
  x,
  z,
  edge,
) {
  const positionOffset = vertex * 3;
  const uvOffset = vertex * 2;
  const center = lake.center ?? lake.position;
  const depth = Math.max(lake.waterLevel - terrain.getHeightAt(x, z), 0);

  positions[positionOffset] = x;
  positions[positionOffset + 1] = lake.waterLevel + 0.045;
  positions[positionOffset + 2] = z;
  uvs[uvOffset] = (x - center[0]) / (lake.radius * 2) + 0.5;
  uvs[uvOffset + 1] = (z - center[1]) / (lake.radius * 2) + 0.5;
  lakeDepths[vertex] = depth;
  lakeEdges[vertex] = THREE.MathUtils.clamp(edge, 0, 1);
  lakeBedVisibilities[vertex] = 1 - smoothstep(1.2, 6, depth);
}

function createLakeGeometry(terrain) {
  const radialSegments = LAKE_SHAPE_SEGMENTS;
  const ringCount = LAKE_MESH_SEGMENTS;
  const vertexCount = 1 + radialSegments * ringCount;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const lakeDepths = new Float32Array(vertexCount);
  const lakeEdges = new Float32Array(vertexCount);
  const lakeBedVisibilities = new Float32Array(vertexCount);
  const indices = new Uint32Array(radialSegments * 3 + (ringCount - 1) * radialSegments * 6);
  let positionOffset = 0;
  let uvOffset = 0;
  let attributeOffset = 0;
  let indexOffset = 0;

  writeLakeVertex(
    positions,
    uvs,
    lakeDepths,
    lakeEdges,
    lakeBedVisibilities,
    positionOffset,
    uvOffset,
    attributeOffset,
    terrain,
    LAKE_CENTER.x,
    LAKE_CENTER.y,
    1,
  );
  positionOffset += 3;
  uvOffset += 2;
  attributeOffset += 1;

  for (let ring = 1; ring <= ringCount; ring += 1) {
    const radiusT = ring / ringCount;

    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2;
      const radius = lakeRadiusAt(angle) * radiusT;
      const x = LAKE_CENTER.x + Math.cos(angle) * radius;
      const z = LAKE_CENTER.y + Math.sin(angle) * radius;

      writeLakeVertex(
        positions,
        uvs,
        lakeDepths,
        lakeEdges,
        lakeBedVisibilities,
        positionOffset,
        uvOffset,
        attributeOffset,
        terrain,
        x,
        z,
        1 - radiusT,
      );
      positionOffset += 3;
      uvOffset += 2;
      attributeOffset += 1;
    }
  }

  for (let segment = 0; segment < radialSegments; segment += 1) {
    indices[indexOffset] = 0;
    indices[indexOffset + 1] = 1 + segment;
    indices[indexOffset + 2] = 1 + ((segment + 1) % radialSegments);
    indexOffset += 3;
  }

  for (let ring = 1; ring < ringCount; ring += 1) {
    const innerStart = 1 + (ring - 1) * radialSegments;
    const outerStart = 1 + ring * radialSegments;

    for (let segment = 0; segment < radialSegments; segment += 1) {
      const nextSegment = (segment + 1) % radialSegments;
      const a = innerStart + segment;
      const b = innerStart + nextSegment;
      const c = outerStart + segment;
      const d = outerStart + nextSegment;

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
  geometry.setAttribute('lakeDepth', new THREE.BufferAttribute(lakeDepths, 1));
  geometry.setAttribute('lakeEdge', new THREE.BufferAttribute(lakeEdges, 1));
  geometry.setAttribute('lakeBedVisibility', new THREE.BufferAttribute(lakeBedVisibilities, 1));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

function writeLakeVertex(
  positions,
  uvs,
  lakeDepths,
  lakeEdges,
  lakeBedVisibilities,
  positionOffset,
  uvOffset,
  attributeOffset,
  terrain,
  x,
  z,
  edge,
) {
  const depth = Math.max(LAKE_WATER_LEVEL - terrain.getHeightAt(x, z), 0);
  const bedVisibility = 1 - smoothstep(1.4, 8.5, depth);

  positions[positionOffset] = x;
  positions[positionOffset + 1] = LAKE_WATER_LEVEL + 0.045;
  positions[positionOffset + 2] = z;

  uvs[uvOffset] = (x - LAKE_CENTER.x) / (LAKE_BASE_RADIUS * 2) + 0.5;
  uvs[uvOffset + 1] = (z - LAKE_CENTER.y) / (LAKE_BASE_RADIUS * 2) + 0.5;

  lakeDepths[attributeOffset] = depth;
  lakeEdges[attributeOffset] = THREE.MathUtils.clamp(edge, 0, 1);
  lakeBedVisibilities[attributeOffset] = THREE.MathUtils.clamp(bedVisibility, 0, 1);
}

function createOutletStream(terrain, material) {
  const geometry = createPathStripGeometry(
    outletCurve,
    terrain,
    OUTLET_WIDTH,
    90,
    10,
    (x, z, _t, terrain) => getOutletSurfaceHeight(terrain, x, z),
    (_x, _z, t) => smoothstep(0.08, 0.24, t) * (1 - smoothstep(0.93, 1, t)),
    {
      flowSpeed: 0.9,
      getRapidMask: (_x, _z, t) => smoothstep(0.58, 0.94, t),
    },
  );
  const stream = new THREE.Mesh(geometry, material);

  stream.name = 'LakeOutletStream';
  stream.renderOrder = WATER_RENDER_ORDER.surface;
  stream.userData.waterReflectionModeCap = 1;

  return stream;
}

function getOutletSurfaceHeight(terrain, x, z) {
  return terrain.getHeightAt(x, z) + OUTLET_WATER_OFFSET;
}

function getWaterfallLip(terrain) {
  const point = outletCurve.getPointAt(1);

  return new THREE.Vector3(
    point.x,
    getOutletSurfaceHeight(terrain, point.x, point.z),
    point.z,
  );
}

function getOutletLipSide() {
  const tangent = outletCurve.getTangentAt(1).normalize();

  return new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
}

function getOutletLipForward() {
  const tangent = outletCurve.getTangentAt(1).normalize();

  return new THREE.Vector3(tangent.x, 0, tangent.z).normalize();
}

function createWaterfallGroup(terrain) {
  const group = new THREE.Group();
  group.name = 'WaterfallSystem';

  WATERFALL_LAYERS.forEach((layer, index) => {
    const mesh = new THREE.Mesh(createWaterfallGeometry(layer, terrain), createWaterfallMaterial(layer));
    mesh.name = layer.name;
    mesh.renderOrder = WATER_RENDER_ORDER.waterfall + index * 0.01;
    group.add(mesh);
  });

  group.add(createMistParticles());

  return group;
}

function createWaterfallLipFoam(terrain) {
  const geometry = createWaterfallLipFoamGeometry(terrain);
  const mesh = new THREE.Mesh(geometry, createWaterfallLipFoamMaterial());

  mesh.name = 'WaterfallLipFoam';
  mesh.renderOrder = WATER_RENDER_ORDER.foam;

  return mesh;
}

function createConfluenceFoam() {
  const geometry = createConfluenceFoamGeometry();
  const mesh = new THREE.Mesh(geometry, createFoamOverlayMaterial());
  mesh.name = 'WaterfallConfluenceFoam';
  mesh.renderOrder = WATER_RENDER_ORDER.foam;

  return mesh;
}

function createConfluenceFoamGeometry() {
  const longitudinalSegments = 14;
  const lateralSegments = 8;
  const verticesPerRow = lateralSegments + 1;
  const positions = new Float32Array((longitudinalSegments + 1) * verticesPerRow * 3);
  const uvs = new Float32Array((longitudinalSegments + 1) * verticesPerRow * 2);
  const indices = new Uint32Array(longitudinalSegments * lateralSegments * 6);
  const forward = new THREE.Vector3(PLUNGE_OUTFLOW_DIRECTION.x, 0, PLUNGE_OUTFLOW_DIRECTION.y);
  const side = new THREE.Vector3(-forward.z, 0, forward.x);
  const start = new THREE.Vector3(
    PLUNGE_CENTER.x,
    PLUNGE_POOL.waterLevel + 0.02,
    PLUNGE_CENTER.y,
  );
  let positionOffset = 0;
  let uvOffset = 0;

  for (let i = 0; i <= longitudinalSegments; i += 1) {
    const t = i / longitudinalSegments;
    const width = THREE.MathUtils.lerp(PLUNGE_OUTFLOW_START_WIDTH, PLUNGE_OUTFLOW_END_WIDTH, t);
    const center = start.clone().addScaledVector(forward, t * PLUNGE_OUTFLOW_LENGTH - 3.5);
    const edgeNoise = Math.sin(i * 1.37) * 0.45 + Math.sin(i * 2.41) * 0.22;

    for (let j = 0; j <= lateralSegments; j += 1) {
      const lateralT = j / lateralSegments;
      const edgeT = Math.abs(lateralT - 0.5) * 2;
      const lateral = (lateralT - 0.5) * (width + edgeNoise * edgeT);
      const point = center.clone().addScaledVector(side, lateral);

      positions[positionOffset] = point.x;
      positions[positionOffset + 1] = point.y;
      positions[positionOffset + 2] = point.z;
      positionOffset += 3;

      uvs[uvOffset] = t;
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

function createPathStripGeometry(
  curve,
  terrain,
  width,
  longitudinalSegments,
  lateralSegments,
  getHeight,
  getFade = () => 1,
  {
    flowSpeed = 0.5,
    getRapidMask = () => 0,
    getDisturbanceMask = () => 0,
    viewDistance = 260,
  } = {},
) {
  const verticesPerRow = lateralSegments + 1;
  const vertexCount = (longitudinalSegments + 1) * verticesPerRow;
  const positions = new Float32Array((longitudinalSegments + 1) * verticesPerRow * 3);
  const uvs = new Float32Array((longitudinalSegments + 1) * verticesPerRow * 2);
  const waterDepths = new Float32Array(vertexCount);
  const shoreDistances = new Float32Array(vertexCount);
  const flowSpeeds = new Float32Array(vertexCount);
  const rapidMasks = new Float32Array(vertexCount);
  const flowDirections = new Float32Array(vertexCount * 2);
  const flowUvs = new Float32Array(vertexCount * 2);
  const junctionFlowDirections = new Float32Array(vertexCount * 2);
  const disturbanceMasks = new Float32Array(vertexCount);
  const waterFades = new Float32Array(vertexCount);
  const junctionMasks = new Float32Array(vertexCount);
  const viewDistances = new Float32Array(vertexCount);
  const indices = new Uint32Array(longitudinalSegments * lateralSegments * 6);
  const pathLength = curve.getLength();
  let positionOffset = 0;
  let uvOffset = 0;
  let attributeOffset = 0;

  for (let i = 0; i <= longitudinalSegments; i += 1) {
    const t = i / longitudinalSegments;
    const center = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const edgeNoise = Math.sin(i * 1.71) * 0.18 + Math.sin(i * 0.39) * 0.24;

    for (let j = 0; j <= lateralSegments; j += 1) {
      const lateralT = j / lateralSegments;
      const localWidth = width + edgeNoise;
      const lateral = (lateralT - 0.5) * localWidth;
      const x = center.x + side.x * lateral;
      const z = center.z + side.z * lateral;
      const y = getHeight(x, z, t, terrain);
      const fade = getFade(x, z, t, terrain);

      positions[positionOffset] = x;
      positions[positionOffset + 1] = y;
      positions[positionOffset + 2] = z;
      positionOffset += 3;

      uvs[uvOffset] = t * pathLength;
      uvs[uvOffset + 1] = lateralT;
      uvOffset += 2;

      waterDepths[attributeOffset] = Math.max(y - terrain.getHeightAt(x, z), 0);
      shoreDistances[attributeOffset] = (
        1 - Math.abs(lateralT * 2 - 1)
      ) * localWidth * 0.5;
      flowSpeeds[attributeOffset] = flowSpeed;
      rapidMasks[attributeOffset] = THREE.MathUtils.clamp(getRapidMask(x, z, t), 0, 1);
      flowDirections[attributeOffset * 2] = tangent.x;
      flowDirections[attributeOffset * 2 + 1] = tangent.z;
      flowUvs[attributeOffset * 2] = t * pathLength;
      flowUvs[attributeOffset * 2 + 1] = (lateralT - 0.5) * 8;
      junctionFlowDirections[attributeOffset * 2] = tangent.x;
      junctionFlowDirections[attributeOffset * 2 + 1] = tangent.z;
      disturbanceMasks[attributeOffset] = THREE.MathUtils.clamp(
        getDisturbanceMask(x, z, t),
        0,
        1,
      );
      waterFades[attributeOffset] = THREE.MathUtils.clamp(fade, 0, 1);
      junctionMasks[attributeOffset] = 0;
      viewDistances[attributeOffset] = viewDistance;
      attributeOffset += 1;
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
  geometry.setAttribute('waterDepth', new THREE.BufferAttribute(waterDepths, 1));
  geometry.setAttribute('shoreDistance', new THREE.BufferAttribute(shoreDistances, 1));
  geometry.setAttribute('flowSpeed', new THREE.BufferAttribute(flowSpeeds, 1));
  geometry.setAttribute('rapidMask', new THREE.BufferAttribute(rapidMasks, 1));
  geometry.setAttribute('flowDirection', new THREE.BufferAttribute(flowDirections, 2));
  geometry.setAttribute('flowUv', new THREE.BufferAttribute(flowUvs, 2));
  geometry.setAttribute(
    'junctionFlowDirection',
    new THREE.BufferAttribute(junctionFlowDirections, 2),
  );
  geometry.setAttribute('disturbanceMask', new THREE.BufferAttribute(disturbanceMasks, 1));
  geometry.setAttribute('waterFade', new THREE.BufferAttribute(waterFades, 1));
  geometry.setAttribute('junctionMask', new THREE.BufferAttribute(junctionMasks, 1));
  geometry.setAttribute('viewDistance', new THREE.BufferAttribute(viewDistances, 1));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

function createWaterfallGeometry(layer, terrain) {
  const verticalSegments = 28;
  const lateralSegments = 7;
  const verticesPerRow = lateralSegments + 1;
  const positions = new Float32Array((verticalSegments + 1) * verticesPerRow * 3);
  const uvs = new Float32Array((verticalSegments + 1) * verticesPerRow * 2);
  const indices = new Uint32Array(verticalSegments * lateralSegments * 6);
  const lip = getWaterfallLip(terrain);
  const right = getOutletLipSide();
  const forward = new THREE.Vector3(
    WATERFALL_BASE.x - lip.x,
    0,
    WATERFALL_BASE.z - lip.z,
  ).normalize();
  let positionOffset = 0;
  let uvOffset = 0;

  for (let i = 0; i <= verticalSegments; i += 1) {
    const t = i / verticalSegments;
    const eased = t * t * (3 - 2 * t);
    const center = new THREE.Vector3().lerpVectors(lip, WATERFALL_BASE, eased);
    const offsetMask = smoothstep(0.04, 0.28, t);
    center.addScaledVector(right, layer.xOffset);
    center.addScaledVector(forward, Math.sin(t * Math.PI) * 2.8 + layer.zOffset * offsetMask);
    const width = WATERFALL_WIDTH * layer.width * THREE.MathUtils.lerp(0.62, 1.28, t);
    const lipBlend = 1 - smoothstep(0, 0.12, t);

    for (let j = 0; j <= lateralSegments; j += 1) {
      const lateralT = j / lateralSegments;
      const lateral = (lateralT - 0.5) * width;
      const breakup = Math.sin(i * 1.9 + j * 2.7) * 0.18 * t;
      const point = center.clone().addScaledVector(right, lateral + breakup);
      point.y = THREE.MathUtils.lerp(
        point.y,
        getOutletSurfaceHeight(terrain, point.x, point.z),
        lipBlend,
      );

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

function createWaterfallLipFoamGeometry(terrain) {
  const radialSegments = 44;
  const lip = getWaterfallLip(terrain);
  const side = getOutletLipSide();
  const forward = getOutletLipForward();
  const positions = new Float32Array((radialSegments + 1) * 3);
  const uvs = new Float32Array((radialSegments + 1) * 2);
  const indices = new Uint32Array(radialSegments * 3);
  const center = lip.clone().addScaledVector(forward, -WATERFALL_LIP_FOAM_LENGTH * 0.24);

  positions[0] = center.x;
  positions[1] = getOutletSurfaceHeight(terrain, center.x, center.z) + 0.08;
  positions[2] = center.z;
  uvs[0] = 0.5;
  uvs[1] = 0.5;

  for (let i = 0; i < radialSegments; i += 1) {
    const angle = (i / radialSegments) * Math.PI * 2;
    const widthNoise = 0.88 + pseudoRandom(i * 13.7) * 0.24;
    const lengthNoise = 0.82 + pseudoRandom(i * 7.9) * 0.32;
    const lateral = Math.cos(angle) * WATERFALL_LIP_FOAM_WIDTH * 0.5 * widthNoise;
    const longitudinal = Math.sin(angle) * WATERFALL_LIP_FOAM_LENGTH * 0.5 * lengthNoise;
    const point = center.clone()
      .addScaledVector(side, lateral)
      .addScaledVector(forward, longitudinal);
    const vertex = i + 1;

    positions[vertex * 3] = point.x;
    positions[vertex * 3 + 1] = getOutletSurfaceHeight(terrain, point.x, point.z) + 0.1;
    positions[vertex * 3 + 2] = point.z;
    uvs[vertex * 2] = 0.5 + (lateral / WATERFALL_LIP_FOAM_WIDTH);
    uvs[vertex * 2 + 1] = 0.5 + (longitudinal / WATERFALL_LIP_FOAM_LENGTH);
  }

  for (let i = 0; i < radialSegments; i += 1) {
    const next = i === radialSegments - 1 ? 1 : i + 2;

    indices[i * 3] = 0;
    indices[i * 3 + 1] = i + 1;
    indices[i * 3 + 2] = next;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

export function createLakeSurfaceMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    forceSinglePass: true,
    depthWrite: false,
    depthTest: true,
    uniforms: createWaterUniforms(),
    vertexShader: `
      uniform float uTime;

      attribute float lakeDepth;
      attribute float lakeEdge;
      attribute float lakeBedVisibility;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vLakeDepth;
      varying float vLakeEdge;
      varying float vLakeBedVisibility;
      ${WATER_FOG_VERTEX_PARS_GLSL}

      void main() {
        vUv = uv;
        vLakeDepth = lakeDepth;
        vLakeEdge = lakeEdge;
        vLakeBedVisibility = lakeBedVisibility;
        vec3 transformed = position;
        float waveMask = smoothstep(0.04, 0.9, lakeEdge);
        float waveA = sin(position.x * 0.08 + uTime * 0.95) * 0.055;
        float waveB = sin(position.z * 0.11 - uTime * 0.76) * 0.04;
        transformed.y += (waveA + waveB) * waveMask;
        vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
        vWorldPosition = worldPosition.xyz;
        ${WATER_FOG_VERTEX_GLSL}
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uCameraPosition;
      uniform vec3 uShallowColor;
      uniform vec3 uDeepColor;
      uniform vec3 uFoamColor;
      uniform vec3 uReflectionColor;
      uniform vec3 uHorizonReflectionColor;
      uniform vec3 uBankReflectionColor;
      uniform vec3 uSunReflectionColor;
      uniform vec3 uSunDirection;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vLakeDepth;
      varying float vLakeEdge;
      varying float vLakeBedVisibility;
      ${WATER_FOG_FRAGMENT_PARS_GLSL}

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
        float amplitude = 0.68;
        for (int i = 0; i < 2; i += 1) {
          value += noise(p) * amplitude;
          p = p * 2.0 + vec2(6.7, -4.1);
          amplitude *= 0.47;
        }
        return value;
      }

      ${WATER_DUAL_WAVE_GLSL}
      ${WATER_REFLECTION_GLSL}

      vec3 getWaterNormal(vec2 worldUv, float strength) {
        vec2 windUv = worldUv + vec2(-uTime * 0.025, uTime * 0.012);

        return getDualWaveNormal(windUv, worldUv, uTime, strength);
      }

      float getSunSparkle(
        vec2 worldPosition,
        vec3 surfaceNormal,
        vec3 lightDirection,
        vec3 viewDirection,
        float detailNoise,
        float windMask
      ) {
        vec2 microUv = worldPosition * 1.35 + vec2(uTime * 0.18, -uTime * 0.12);
        vec2 microSlope = (
          vec2(noise(microUv), noise(microUv + vec2(19.17, 7.31))) - 0.5
        ) * mix(1.0, 1.35, windMask);
        vec3 microNormal = normalize(vec3(
          surfaceNormal.x + microSlope.x,
          surfaceNormal.y,
          surfaceNormal.z + microSlope.y
        ));
        vec3 halfDirection = normalize(lightDirection + viewDirection);
        float NoL = max(dot(microNormal, lightDirection), 0.0);
        float NoV = max(dot(microNormal, viewDirection), 0.001);
        float NoH = max(dot(microNormal, halfDirection), 0.0);
        float VoH = max(dot(viewDirection, halfDirection), 0.0);
        float roughness = mix(0.075, 0.1, windMask);
        float alpha2 = roughness * roughness;
        float denominator = NoH * NoH * (alpha2 - 1.0) + 1.0;
        float distribution = alpha2 / (3.14159265 * denominator * denominator + 0.0001);
        float geometryK = (roughness + 1.0) * (roughness + 1.0) * 0.125;
        float geometry = (NoV / (NoV * (1.0 - geometryK) + geometryK))
          * (NoL / (NoL * (1.0 - geometryK) + geometryK));
        float fresnel = 0.0204 + 0.9796 * pow(1.0 - VoH, 5.0);
        float sunBrdf = distribution * geometry * fresnel / max(4.0 * NoV * NoL, 0.02);
        float cells = noise(worldPosition * 2.4 + vec2(-uTime * 0.28, uTime * 0.09));
        float coverageField = detailNoise * 0.62 + cells * 0.38;
        float coverageWidth = max(fwidth(coverageField), 0.015);
        float coverage = smoothstep(
          0.72 - coverageWidth,
          0.72 + coverageWidth,
          coverageField
        );

        return min(sunBrdf * NoL, 0.85) * coverage;
      }

      void main() {
        vec2 p = vWorldPosition.xz;
        float broadNoise = fbm(p * 0.035 + vec2(uTime * 0.035, -uTime * 0.018));
        float rippleNoise = fbm(p * 0.22 + vec2(-uTime * 0.085, uTime * 0.052));
        float detailNoise = fbm(p * 0.72 + vec2(uTime * 0.19, -uTime * 0.14));
        float edgeNoise = rippleNoise - 0.5;
        float edgeAlpha = smoothstep(0.035, 0.23, vLakeEdge + edgeNoise * 0.045);
        edgeAlpha *= mix(
          1.0,
          smoothstep(0.025, 0.72, vLakeDepth),
          uDepthShorelineEnabled
        );
        float depthOpacity = 1.0 - exp(-max(vLakeDepth, 0.0) * 0.85);
        float basinCenter = smoothstep(0.12, 0.82, vLakeEdge);
        float deepMask = max(smoothstep(2.2, 12.0, vLakeDepth), basinCenter * 0.72);
        float shallowMask = 1.0 - smoothstep(0.8, 3.8, vLakeDepth);
        float windSweep = sin(uTime * 0.38 + p.x * 0.018 + p.y * 0.011) * 0.18;
        float windPulse = smoothstep(0.62, 0.92, broadNoise + windSweep);
        float windMask = windPulse * smoothstep(0.08, 0.86, vLakeEdge);
        float waveStrength = mix(0.72, 1.08, deepMask) + windMask * 0.34;
        vec3 normal = getWaterNormal(p * 0.1, waveStrength);
        vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);
        float reflectionMask = smoothstep(0.06, 0.78, fresnel);
        vec3 color = mix(uShallowColor, uDeepColor, deepMask);
        vec3 bedTint = mix(uShallowColor, uDeepColor, 0.26) * vec3(0.68, 0.74, 0.68);
        float bedInfluence = vLakeBedVisibility * edgeAlpha * 0.12;
        color = mix(color, bedTint, bedInfluence);
        float sedimentMask = (1.0 - smoothstep(0.025, 0.2, vLakeEdge + edgeNoise * 0.035)) * shallowMask;
        color = mix(color, uBankReflectionColor * vec3(0.82, 0.88, 0.84), sedimentMask * 0.38);
        color = mix(color, uDeepColor * vec3(0.78, 0.94, 1.0), deepMask * 0.1);

        float surfaceRipple = rippleNoise;
        float fineRipple = detailNoise;
        float windWrinkle = smoothstep(0.5, 0.9, fineRipple) * windMask;
        color *= mix(0.88, 1.12, surfaceRipple);
        color += uReflectionColor * smoothstep(0.54, 0.9, fineRipple) * edgeAlpha * (0.045 + windMask * 0.07);
        color += uHorizonReflectionColor * windWrinkle * edgeAlpha * 0.045;

        float causticRidges = 1.0 - abs(rippleNoise - detailNoise) * 6.0;
        float caustics = smoothstep(0.74, 0.96, causticRidges);
        color += vec3(0.74, 0.96, 1.0) * caustics * shallowMask * vLakeBedVisibility * 0.13;

        vec3 lightDir = normalize(uSunDirection);
        vec3 reflectionDirection = reflect(-viewDir, normal);
        vec3 skyReflection = getTieredWaterReflection(
          mix(uHorizonReflectionColor, uReflectionColor, smoothstep(0.18, 0.92, normal.y)),
          vWorldPosition,
          normal,
          viewDir
        );
        float sunCone = smoothstep(0.975, 0.9985, max(dot(reflectionDirection, lightDir), 0.0));
        float reflectionPeak = max(max(skyReflection.r, skyReflection.g), skyReflection.b);
        float sunPeakScale = min(1.0, 0.9 / max(reflectionPeak, 0.001));
        skyReflection *= mix(1.0, sunPeakScale, sunCone);
        color = mix(color, skyReflection, 0.025 + reflectionMask * 0.2);
        float bankReflection = (1.0 - basinCenter) * edgeAlpha * smoothstep(0.32, 0.86, broadNoise);
        color = mix(color, uBankReflectionColor, bankReflection * 0.18);

        float sunSparkle = getSunSparkle(
          p,
          normal,
          lightDir,
          viewDir,
          detailNoise,
          windMask
        ) * edgeAlpha * basinCenter;
        color += uSunReflectionColor * sunSparkle * mix(1.35, 1.85, windMask);

        float foamEdge = vLakeEdge + edgeNoise * 0.04;
        float foamStart = smoothstep(0.035, 0.095, foamEdge);
        float foamEnd = 1.0 - smoothstep(0.18, 0.31, foamEdge);
        float shoreBand = foamStart * foamEnd;
        float shallowFoamSupport = smoothstep(0.15, 1.15, vLakeDepth) * (1.0 - smoothstep(3.8, 8.0, vLakeDepth));
        float foamBreakup = smoothstep(0.38, 0.78, broadNoise);
        float foamCells = smoothstep(0.56, 0.86, detailNoise + (rippleNoise - 0.5) * 0.28);
        float foamThreadField = 0.5 + sin(p.x * 2.15 - uTime * 0.22) * sin(p.y * 1.7 + uTime * 0.11) * 0.5;
        float foamThreads = smoothstep(0.64, 0.91, foamThreadField + edgeNoise * 0.12);
        float shoreFoam = shoreBand * shallowFoamSupport * foamBreakup * max(foamCells * 0.72, foamThreads * 0.36);
        color = mix(color, uFoamColor, shoreFoam * 0.56);

        float alpha = edgeAlpha * mix(0.12, 1.0, max(depthOpacity, basinCenter * 0.4));
        alpha = max(alpha, reflectionMask * 0.24 * edgeAlpha);
        alpha = max(alpha, shoreFoam * 0.28);

        gl_FragColor = vec4(color, alpha);
        ${WATER_FOG_FRAGMENT_GLSL}
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function createWaterfallMaterial(layer) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    forceSinglePass: true,
    depthWrite: false,
    depthTest: true,
    uniforms: createWaterUniforms({
      uLayerAlpha: { value: layer.alpha },
      uFallSpeed: { value: layer.speed },
    }),
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      ${WATER_FOG_VERTEX_PARS_GLSL}

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        ${WATER_FOG_VERTEX_GLSL}
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uLayerAlpha;
      uniform float uFallSpeed;
      uniform vec3 uCameraPosition;
      uniform vec3 uShallowColor;
      uniform vec3 uDeepColor;
      uniform vec3 uFoamColor;
      uniform vec3 uSunReflectionColor;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      ${WATER_FOG_FRAGMENT_PARS_GLSL}

      ${WATER_NOISE_GLSL}

      void main() {
        float edge = smoothstep(0.0, 0.16, vUv.x) * (1.0 - smoothstep(0.84, 1.0, vUv.x));
        float fallUv = vUv.y * 6.0 - uTime * uFallSpeed * 2.4;
        float longStreak = smoothstep(0.4, 0.8, waterNoise2(vec2(vUv.x * 12.0, fallUv * 1.8)));
        float fineStreak = smoothstep(0.55, 0.88, waterNoise(vec2(vUv.x * 38.0 + 3.0, fallUv * 3.2)));
        float lowerBreakup = smoothstep(0.35, 1.0, vUv.y);
        float curtainNoise = waterNoise2(vec2(vUv.x * 7.0 + uTime * 0.25, vUv.y * 9.0));
        float broken = mix(0.86, smoothstep(0.34, 0.72, curtainNoise), lowerBreakup);
        float gaps = smoothstep(0.28, 0.54, waterNoise2(vec2(vUv.x * 4.2 - uTime * 0.08, vUv.y * 2.7)));
        float whiteWater = max(longStreak, fineStreak * 0.82);
        vec3 baseColor = mix(uDeepColor * vec3(0.84, 0.94, 0.96), uShallowColor, 0.52);
        vec3 color = mix(baseColor, uFoamColor, whiteWater * 0.72);
        color += uSunReflectionColor * fineStreak * 0.06;
        float alpha = edge * broken * gaps * uLayerAlpha * mix(0.5, 1.0, whiteWater);
        alpha += smoothstep(0.78, 1.0, vUv.y) * fineStreak * gaps * 0.018;

        gl_FragColor = vec4(color, alpha);
        ${WATER_FOG_FRAGMENT_GLSL}
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
    forceSinglePass: true,
    depthWrite: false,
    depthTest: true,
    uniforms: createWaterUniforms(),
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      ${WATER_FOG_VERTEX_PARS_GLSL}

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        ${WATER_FOG_VERTEX_GLSL}
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uFoamColor;

      varying vec2 vUv;
      ${WATER_FOG_FRAGMENT_PARS_GLSL}

      ${WATER_NOISE_GLSL}

      void main() {
        float lateral = abs(vUv.y - 0.5) * 2.0;
        float startFade = smoothstep(0.04, 0.24, vUv.x);
        float tailFade = 1.0 - smoothstep(0.62, 1.0, vUv.x);
        float lateralFade = 1.0 - smoothstep(0.58, 1.0, lateral);
        float center = 1.0 - smoothstep(0.12, 0.76, lateral);
        float broken = smoothstep(0.34, 0.8, waterNoise2(vUv * vec2(16.0, 24.0) + vec2(-uTime * 0.32, uTime * 0.08)));
        float threads = smoothstep(0.48, 0.86, waterNoise(vUv * vec2(7.0, 48.0) + vec2(-uTime * 0.16, uTime * 0.22)));
        float impact = 1.0 - smoothstep(0.1, 0.42, vUv.x);
        float alpha = (impact * 0.16 + center * max(broken * 0.22, threads * 0.12)) * startFade * tailFade * lateralFade;

        gl_FragColor = vec4(uFoamColor, alpha);
        ${WATER_FOG_FRAGMENT_GLSL}
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function createWaterfallLipFoamMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    forceSinglePass: true,
    depthWrite: false,
    depthTest: true,
    uniforms: createWaterUniforms(),
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      ${WATER_FOG_VERTEX_PARS_GLSL}

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        ${WATER_FOG_VERTEX_GLSL}
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uFoamColor;
      uniform vec3 uShallowColor;

      varying vec2 vUv;
      ${WATER_FOG_FRAGMENT_PARS_GLSL}

      ${WATER_NOISE_GLSL}

      void main() {
        vec2 centered = vUv - vec2(0.5);
        float radial = 1.0 - smoothstep(0.18, 0.58, length(centered));
        float downstream = smoothstep(0.22, 0.72, vUv.y);
        float broken = smoothstep(0.34, 0.8, waterNoise2(vUv * vec2(18.0, 11.0) + vec2(-uTime * 0.3, uTime * 0.08)));
        float fine = smoothstep(0.52, 0.88, waterNoise(vUv * vec2(42.0, 24.0) + vec2(uTime * 0.18, -uTime * 0.13)));
        float alpha = radial * mix(0.07, 0.24, max(broken, fine * 0.62)) * mix(0.65, 1.0, downstream);
        vec3 color = mix(uShallowColor, uFoamColor, max(broken, downstream));

        gl_FragColor = vec4(color, alpha);
        ${WATER_FOG_FRAGMENT_GLSL}
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function createMistParticles() {
  const count = 72;
  const positions = new Float32Array(count * 3);
  const randoms = new Float32Array(count);
  const outflow = new THREE.Vector3(PLUNGE_OUTFLOW_DIRECTION.x, 0, PLUNGE_OUTFLOW_DIRECTION.y);
  const side = new THREE.Vector3(-outflow.z, 0, outflow.x);

  for (let i = 0; i < count; i += 1) {
    const r = pseudoRandom(i * 12.2);
    const lateral = (pseudoRandom(i * 4.7) - 0.5) * 5.2;
    const downstream = pseudoRandom(i * 9.3) * 7.4 - 1.8;
    const lift = pseudoRandom(i * 2.1) * 7.2;
    const point = WATERFALL_BASE.clone()
      .addScaledVector(side, lateral)
      .addScaledVector(outflow, downstream);

    positions[i * 3] = point.x;
    positions[i * 3 + 1] = WATERFALL_BASE.y + lift;
    positions[i * 3 + 2] = point.z;
    randoms[i] = r;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('randomSeed', new THREE.BufferAttribute(randoms, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: createWaterUniforms(),
    vertexShader: `
      uniform float uTime;

      attribute float randomSeed;

      varying float vAlpha;
      ${WATER_FOG_VERTEX_PARS_GLSL}

      void main() {
        vec3 animated = position;
        animated.x += sin(uTime * 0.7 + randomSeed * 11.0) * 0.48;
        animated.y += fract(uTime * 0.075 + randomSeed) * 3.2;
        animated.z += cos(uTime * 0.62 + randomSeed * 9.0) * 0.42;
        vec4 mvPosition = modelViewMatrix * vec4(animated, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = (5.0 + randomSeed * 8.0) * (180.0 / -mvPosition.z);
        vAlpha = 0.012 + randomSeed * 0.018;
        vWaterFogDepth = -mvPosition.z;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      uniform vec3 uFoamColor;
      uniform vec3 uHorizonReflectionColor;
      ${WATER_FOG_FRAGMENT_PARS_GLSL}

      void main() {
        vec2 centered = gl_PointCoord - vec2(0.5);
        float d = length(centered);
        float alpha = (1.0 - smoothstep(0.1, 0.5, d)) * vAlpha;
        vec3 mistColor = mix(uHorizonReflectionColor, uFoamColor, 0.62);
        gl_FragColor = vec4(mistColor, alpha);
        ${WATER_FOG_FRAGMENT_GLSL}
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'WaterfallMistParticles';
  points.renderOrder = WATER_RENDER_ORDER.mist;

  return points;
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

function getRiverNetworkMaterialFrame(x, z) {
  const frame = getNearestRiverReach(x, z, 16);
  let bedMask = 0;
  let wetMask = 0;

  if (frame && frame.distance <= frame.influence) {
    const wetOuter = Math.min(frame.influence, frame.halfWidth + 3);

    bedMask = 1 - smoothstep(frame.halfWidth * 0.58, frame.halfWidth, frame.distance);
    wetMask = (1 - smoothstep(frame.halfWidth * 0.82, wetOuter, frame.distance)) * 0.72;
  }

  for (const lake of RIVER_NETWORK.lakeFeatures) {
    if (lake.existing) continue;

    const center = lake.center ?? lake.position;
    const distance = Math.hypot(x - center[0], z - center[1]);
    const lakeBed = 1 - smoothstep(lake.radius - 1, lake.radius + 0.35, distance);
    const innerWet = smoothstep(lake.radius - 5, lake.radius - 0.8, distance)
      * (1 - smoothstep(lake.radius - 0.8, lake.radius + 0.2, distance));
    const outerWet = 1 - smoothstep(lake.radius, lake.radius + lake.shoreWidth, distance);

    bedMask = Math.max(bedMask, lakeBed);
    wetMask = Math.max(wetMask, innerWet * 0.72, outerWet);
  }

  return {
    bedMask: THREE.MathUtils.clamp(bedMask, 0, 1),
    wetMask: THREE.MathUtils.clamp(wetMask, 0, 1),
  };
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
  const materials = new Set();

  object.traverse((child) => {
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];

    childMaterials.forEach((material) => {
      if (material?.uniforms) materials.add(material);
    });
  });

  materials.forEach((material) => {
    if (material.uniforms.uTime) {
      material.uniforms.uTime.value = elapsedTime;
    }
    if (material.uniforms.uCameraPosition) {
      material.uniforms.uCameraPosition.value.copy(camera.position);
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

function isNearWaterSystem(x, z, buffer = 0) {
  return x >= WATER_SYSTEM_MIN_X - buffer
    && x <= WATER_SYSTEM_MAX_X + buffer
    && z >= WATER_SYSTEM_MIN_Z - buffer
    && z <= WATER_SYSTEM_MAX_Z + buffer;
}

function boundsIntersect(a, b) {
  return a.maxX >= b.minX
    && a.minX <= b.maxX
    && a.maxZ >= b.minZ
    && a.minZ <= b.maxZ;
}
