import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  WATER_FOG_FRAGMENT_GLSL,
  WATER_FOG_FRAGMENT_PARS_GLSL,
  WATER_FOG_VERTEX_GLSL,
  WATER_FOG_VERTEX_PARS_GLSL,
  WATER_NOISE_GLSL,
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
import {
  PLUNGE_POOL,
  WATERFALL_HYDRAULIC_FRAME,
  applyWaterfallTerrainProfile,
} from './lowlandHeightPlan.js';
import {
  ALPINE_LAKE_BOUNDARY,
  getLakeBoundary,
  getLakeBoundaryFrame,
  getLakeBoundaryRadius,
  getLakeOutsideFade,
  getLakesOutsideFade,
  projectPointToLakeBoundary,
} from './lakeBoundary.js';
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
import { VISUAL_ENVIRONMENT } from './visualEnvironment.js';
import {
  applyExpandedWaterTerrain,
  getExpandedWaterGrassAcceptance,
  getExpandedWaterMaterialFrame,
  getExpandedWaterMinimumSegmentsForBounds,
  isInExpandedWaterVegetationExclusion,
} from './expandedTerrainPlan.js';

export const LAKE_CENTER = new THREE.Vector2(
  ALPINE_LAKE_BOUNDARY.cx,
  ALPINE_LAKE_BOUNDARY.cz,
);
export const LAKE_WATER_LEVEL = ALPINE_LAKE_BOUNDARY.waterLevel;
const LAKE_BASE_RADIUS = ALPINE_LAKE_BOUNDARY.radius;
const LAKE_SHORE_WIDTH = ALPINE_LAKE_BOUNDARY.shoreWidth;
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

const OUTLET_POINTS = WATERFALL_HYDRAULIC_FRAME.outletPoints.map(
  ([x, z]) => new THREE.Vector3(x, 0, z),
);
const OUTLET_WIDTH = WATERFALL_HYDRAULIC_FRAME.crestWidth;
const OUTLET_INFLUENCE = WATERFALL_HYDRAULIC_FRAME.outletInfluence;
const OUTLET_GRASS_FULL_WIDTH = OUTLET_INFLUENCE + 2.5;
const OUTLET_GRASS_BOUNDS = {
  minX: Math.min(...OUTLET_POINTS.map((point) => point.x)) - OUTLET_GRASS_FULL_WIDTH,
  maxX: Math.max(...OUTLET_POINTS.map((point) => point.x)) + OUTLET_GRASS_FULL_WIDTH,
  minZ: Math.min(...OUTLET_POINTS.map((point) => point.z)) - OUTLET_GRASS_FULL_WIDTH,
  maxZ: Math.max(...OUTLET_POINTS.map((point) => point.z)) + OUTLET_GRASS_FULL_WIDTH,
};
const OUTLET_WATER_OFFSET = WATERFALL_HYDRAULIC_FRAME.outletWaterOffset;
const WATERFALL_VERTICAL_SEGMENTS = 64;
const WATERFALL_LATERAL_SEGMENTS = 16;
const WATERFALL_LIP_FOAM_LENGTH = WATERFALL_HYDRAULIC_FRAME.lipBlendLength;
const WATERFALL_LIP_FOAM_OVERLAP = WATERFALL_HYDRAULIC_FRAME.lipOverlapLength;
const WATERFALL_LIP_FOAM_SURFACE_OFFSET = 0.018;
const WATERFALL_IMPACT_RADIUS = 6;
const WATERFALL_SPRAY_COUNT = 128;
const WATERFALL_MIST_COUNT = 64;
const WATERFALL_PARTICLE_COUNT = WATERFALL_SPRAY_COUNT + WATERFALL_MIST_COUNT;
const WATERFALL_GRAVITY = 9.81;

const outletCurve = new THREE.CatmullRomCurve3(OUTLET_POINTS, false, 'centripetal');
const outletSamples = createPathSamples(outletCurve, 100);
export function applyWaterSystemTerrain(baseHeight, x, z) {
  let height = applyWaterSystemMacroTerrain(baseHeight, x, z);

  height = applyRiverNetworkTerrain(height, x, z);
  height = applyExpandedWaterTerrain(height, x, z);

  return height;
}

export function applyWaterSystemMacroTerrain(baseHeight, x, z) {
  if (!isNearWaterSystem(x, z)) return baseHeight;

  return applyWaterfallTerrainProfile(applyLakeBasin(baseHeight, x, z), x, z);
}

export function getWaterSystemMaterialFrame(baseHeight, x, z) {
  const riverNetwork = getRiverNetworkMaterialFrame(x, z);
  const lowland = getLowlandMaterialFrame(x, z);
  const expanded = getExpandedWaterMaterialFrame(x, z);
  const networkBedMask = Math.max(riverNetwork.bedMask, lowland.bedMask, expanded.bedMask);
  const networkWetMask = Math.max(riverNetwork.wetMask, lowland.wetMask, expanded.wetMask);
  const networkRiverWetMask = Math.max(
    riverNetwork.riverWetMask,
    lowland.riverWetMask,
    expanded.riverWetMask,
  );

  if (!isNearWaterSystem(x, z)) {
    return {
      ...createEmptyWaterSystemMaterialFrame(),
      lakeBedMask: Math.max(
        riverNetwork.lakeBedMask,
        lowland.lakeBedMask,
        expanded.lakeBedMask,
      ),
      wetShoreMask: networkWetMask,
      snowmeltWetMask: Math.max(networkRiverWetMask, networkBedMask),
      riverNetworkBedMask: networkBedMask,
    };
  }

  const lake = getLakeFrame(x, z);
  const outlet = getPathFrame(outletSamples, x, z);
  const outletFade = getLakeOutsideFade(ALPINE_LAKE_BOUNDARY, x, z);
  const plungeFrame = getLakeBoundaryFrame(PLUNGE_POOL, x, z);
  const lakeBedMask = lake.inside * (1 - smoothstep(lake.lakeRadius - 1.2, lake.lakeRadius + 0.4, lake.radius));
  const lakeInnerShoreMask = lake.inside * smoothstep(lake.lakeRadius - 8, lake.lakeRadius - 1.4, lake.radius);
  const lakeOuterShoreMask = (1 - lake.inside) * (1 - smoothstep(lake.lakeRadius, lake.lakeRadius + LAKE_SHORE_WIDTH, lake.radius));
  const outletMask = outlet
    ? (1 - smoothstep(
      OUTLET_WIDTH * 0.5,
      OUTLET_INFLUENCE,
      Math.abs(outlet.lateral),
    )) * outletFade
    : 0;
  const plungeMask = 1 - smoothstep(0.45, 1, plungeFrame.normalizedRadius);
  const wetShoreMask = Math.max(
    lakeInnerShoreMask * 0.68,
    lakeOuterShoreMask,
    outletMask * 0.65,
    networkWetMask,
    plungeMask * 0.8,
  );

  return {
    lakeBedMask: THREE.MathUtils.clamp(Math.max(
      lakeBedMask,
      riverNetwork.lakeBedMask,
      lowland.lakeBedMask,
      expanded.lakeBedMask,
    ), 0, 1),
    wetShoreMask: THREE.MathUtils.clamp(wetShoreMask, 0, 1),
    snowmeltWetMask: Math.max(networkRiverWetMask, networkBedMask),
    outletMask: THREE.MathUtils.clamp(outletMask, 0, 1),
    plungeMask: THREE.MathUtils.clamp(plungeMask, 0, 1),
    lakeDistance: lake.radius,
    riverNetworkBedMask: networkBedMask,
  };
}

export function isInWaterSystemVegetationExclusion(x, z, buffer = 2) {
  if (isInRiverNetworkVegetationExclusion(x, z, buffer)) return true;
  if (isInLowlandVegetationExclusion(x, z, buffer)) return true;
  if (isInExpandedWaterVegetationExclusion(x, z, buffer)) return true;
  if (!isNearWaterSystem(x, z, buffer + 12)) return false;

  const lake = getLakeFrame(x, z);
  if (lake.radius <= lake.lakeRadius + LAKE_SHORE_WIDTH + buffer) return true;

  const outlet = getPathFrame(outletSamples, x, z);
  if (outlet && Math.abs(outlet.lateral) <= OUTLET_WIDTH * 0.5 + buffer + 1.5) return true;

  return getLakeBoundaryFrame(PLUNGE_POOL, x, z).signedDistance <= buffer;
}

export function getFlowingWaterGrassAcceptance(x, z) {
  const lake = getLakeFrame(x, z);

  if (lake.radius <= lake.lakeRadius + LAKE_SHORE_WIDTH + 4) return 0;

  if (getLakeBoundaryFrame(PLUNGE_POOL, x, z).signedDistance <= 4) return 0;

  let acceptance = Math.min(
    getRiverGrassAcceptance(x, z),
    getRiverNetworkGrassAcceptance(x, z, RIVER_NETWORK),
    getLowlandStreamGrassAcceptance(x, z),
    getExpandedWaterGrassAcceptance(x, z),
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
  let minimum = getExpandedWaterMinimumSegmentsForBounds(bounds);

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
  const sourceMaterial = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    visible: false,
  });
  const lake = createLakeWater(terrain, sourceMaterial);
  const outletStream = createOutletStream(terrain, sourceMaterial);
  const tributaries = createRiverNetworkWaterSurface(terrain, sourceMaterial);
  const cirqueTarn = createCirqueTarn(terrain, sourceMaterial);
  const waterfall = createWaterfallGroup(terrain);
  const waterfallLipFoam = createWaterfallLipFoam(terrain);
  const confluence = createConfluenceFoam();
  const lowlands = createLowlandWaterFeatures(terrain, sourceMaterial);
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

export function createWaterEffects(terrain) {
  const waterfall = createWaterfallGroup(terrain);
  const waterfallLipFoam = createWaterfallLipFoam(terrain);
  const confluence = createConfluenceFoam();
  const group = new THREE.Group();

  group.name = 'UnifiedWaterEffectsRoot';
  group.add(waterfall, waterfallLipFoam, confluence);

  return {
    group,
    waterfall,
    waterfallLipFoam,
    confluence,
    update(camera, elapsedTime) {
      updateShaderGroup(group, camera, elapsedTime);
    },
    setAerialPerspectiveEnabled(enabled) {
      setWaterEffectFog(group, enabled ? 0 : VISUAL_ENVIRONMENT.fog.density);
    },
    dispose() {
      disposeWaterEffects(group);
    },
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
    const target = THREE.MathUtils.lerp(
      LAKE_BASIN_FLOOR,
      LAKE_WATER_LEVEL - ALPINE_LAKE_BOUNDARY.edgeDepth,
      basinT,
    );

    height = Math.min(baseHeight, target);
  } else {
    const shoreT = smoothstep(lakeRadius, shoreOuter, frame.radius);
    const target = THREE.MathUtils.lerp(
      LAKE_WATER_LEVEL - ALPINE_LAKE_BOUNDARY.edgeDepth,
      baseHeight,
      shoreT,
    );

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

function createLakeWater(terrain, material) {
  const geometry = createLakeGeometry(terrain);
  const lake = new THREE.Group();
  const surface = new THREE.Mesh(geometry, material);

  lake.name = 'AlpineLakeWater';
  surface.name = 'AlpineLakeSurface';
  surface.visible = false;
  lake.add(surface);

  return lake;
}

function createRiverNetworkWaterSurface(terrain, material) {
  const { geometry, stats } = createRiverNetworkWaterGeometry(RIVER_NETWORK, terrain);
  const positions = geometry.getAttribute('position');
  const waterDepths = geometry.getAttribute('waterDepth');

  geometry.translate(0, ALPINE_LAKE_BOUNDARY.surfaceOffset, 0);
  for (let vertex = 0; vertex < waterDepths.count; vertex += 1) {
    waterDepths.setX(vertex, Math.max(
      positions.getY(vertex) - terrain.getHeightAt(positions.getX(vertex), positions.getZ(vertex)),
      0,
    ));
  }
  waterDepths.needsUpdate = true;

  const water = new THREE.Mesh(geometry, material);

  water.name = 'AlpineRiverNetworkSurface';
  water.visible = false;
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
  stream.visible = false;
  stream.userData.riverNetworkStats = mergeRiverNetworkStats(streamParts);
  streamParts.forEach((part) => part.geometry.dispose());

  const lakes = LOWLAND_LAKES.map((lake) => {
    const mesh = new THREE.Mesh(
      createLowlandLakeGeometry(lake, terrain),
      streamMaterial,
    );

    mesh.name = `LowlandLake_${lake.id}`;
    mesh.visible = false;
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

    waterFades.setX(vertex, Math.min(waterFades.getX(vertex), lakeFade));
  }

  waterFades.needsUpdate = true;
}

function createCirqueTarn(terrain, material) {
  const tarn = RIVER_NETWORK.nodeById.get('cirque-tarn');
  const water = new THREE.Mesh(
    createCircularLakeGeometry(terrain, tarn),
    material,
  );

  water.name = 'CirqueTarnSurface';
  water.visible = false;

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
    (x, z, t) => getLakeOutsideFade(ALPINE_LAKE_BOUNDARY, x, z)
      * (1 - smoothstep(0.93, 1, t)),
    {
      flowSpeed: 0.9,
      getRapidMask: (_x, _z, t) => smoothstep(0.58, 0.94, t),
    },
  );
  clipOutletGeometryToLakeShore(geometry, terrain);
  const stream = new THREE.Mesh(geometry, material);

  stream.name = 'LakeOutletStream';
  stream.visible = false;

  return stream;
}

function getOutletSurfaceHeight(terrain, x, z) {
  const riverHeight = terrain.getHeightAt(x, z) + OUTLET_WATER_OFFSET;
  const signedDistance = getLakeBoundaryFrame(
    ALPINE_LAKE_BOUNDARY,
    x,
    z,
  ).signedDistance;
  const levelBlend = smoothstep(0, 12, signedDistance);
  const lakeSurface = LAKE_WATER_LEVEL + ALPINE_LAKE_BOUNDARY.surfaceOffset;

  return THREE.MathUtils.lerp(lakeSurface, riverHeight, levelBlend);
}

function clipOutletGeometryToLakeShore(geometry, terrain) {
  const positions = geometry.getAttribute('position');
  const flowUvs = geometry.getAttribute('flowUv');
  const waterFades = geometry.getAttribute('waterFade');
  const waterDepths = geometry.getAttribute('waterDepth');
  const firstRowSize = 11;

  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    const x = positions.getX(vertex);
    const z = positions.getZ(vertex);
    const frame = getLakeBoundaryFrame(ALPINE_LAKE_BOUNDARY, x, z);

    if (vertex >= firstRowSize && frame.signedDistance >= 0) continue;

    const projected = projectPointToLakeBoundary(ALPINE_LAKE_BOUNDARY, x, z);
    const y = getOutletSurfaceHeight(terrain, projected.x, projected.z);

    positions.setXYZ(vertex, projected.x, y, projected.z);
    waterFades.setX(vertex, 0);
    waterDepths.setX(vertex, Math.max(
      y - terrain.getHeightAt(projected.x, projected.z),
      0,
    ));
  }

  const firstRowWidth = Math.hypot(
    positions.getX(firstRowSize - 1) - positions.getX(0),
    positions.getZ(firstRowSize - 1) - positions.getZ(0),
  );

  for (let vertex = 0; vertex < firstRowSize; vertex += 1) {
    flowUvs.setY(
      vertex,
      THREE.MathUtils.lerp(-firstRowWidth * 0.5, firstRowWidth * 0.5, vertex / (firstRowSize - 1)),
    );
  }

  positions.needsUpdate = true;
  flowUvs.needsUpdate = true;
  waterFades.needsUpdate = true;
  waterDepths.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

function getWaterfallLip() {
  const { lip } = WATERFALL_HYDRAULIC_FRAME;

  return new THREE.Vector3(lip.x, lip.y, lip.z);
}

function getWaterfallImpact() {
  const { impact, poolSurfaceY } = WATERFALL_HYDRAULIC_FRAME;

  return new THREE.Vector3(impact.x, poolSurfaceY, impact.z);
}

function getOutletLipSide() {
  const tangent = outletCurve.getTangentAt(1).normalize();

  return new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
}

function getOutletLipForward() {
  const tangent = outletCurve.getTangentAt(1).normalize();

  return new THREE.Vector3(tangent.x, 0, tangent.z).normalize();
}

function getWaterfallOutflow() {
  const { outflowDirection } = WATERFALL_HYDRAULIC_FRAME;

  return new THREE.Vector3(outflowDirection.x, 0, outflowDirection.z).normalize();
}

function createWaterfallGroup() {
  const group = new THREE.Group();
  const curtain = new THREE.Mesh(
    createWaterfallGeometry(),
    createWaterfallMaterial(),
  );
  const particles = createWaterfallParticles();

  group.name = 'WaterfallSystem';
  curtain.name = 'WaterfallMountainThinVeil';
  curtain.renderOrder = WATER_RENDER_ORDER.waterfall;
  group.add(curtain, particles);

  return group;
}

function createWaterfallLipFoam() {
  const geometry = createWaterfallLipFoamGeometry();
  const mesh = new THREE.Mesh(geometry, createWaterfallLipFoamMaterial());

  mesh.name = 'WaterfallLipFoam';
  mesh.renderOrder = WATER_RENDER_ORDER.foam;

  return mesh;
}

function createConfluenceFoam() {
  const geometry = createWaterfallImpactFoamGeometry();
  const mesh = new THREE.Mesh(geometry, createFoamOverlayMaterial());
  mesh.name = 'WaterfallConfluenceFoam';
  mesh.userData.effectType = 'localized-waterfall-impact';
  mesh.renderOrder = WATER_RENDER_ORDER.foam;

  return mesh;
}

function createWaterfallImpactFoamGeometry() {
  const radialSegments = 48;
  const radialRings = 4;
  const vertexCount = 1 + radialSegments * radialRings;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = [];
  const impact = getWaterfallImpact();
  const forward = getWaterfallOutflow();
  const side = new THREE.Vector3(-forward.z, 0, forward.x);

  positions.set([impact.x, impact.y + 0.025, impact.z], 0);
  uvs.set([0.5, 0.5], 0);

  for (let ring = 1; ring <= radialRings; ring += 1) {
    const ringT = ring / radialRings;

    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = segment / radialSegments * Math.PI * 2;
      const edgeNoise = ring === radialRings
        ? 0.95 + pseudoRandom(segment * 8.17) * 0.1
        : 1;
      const radius = WATERFALL_IMPACT_RADIUS * 0.9 * ringT * edgeNoise;
      const downstreamShift = 0.28 * ringT * ringT;
      const point = impact.clone()
        .addScaledVector(side, Math.cos(angle) * radius)
        .addScaledVector(forward, Math.sin(angle) * radius + downstreamShift);
      const vertex = 1 + (ring - 1) * radialSegments + segment;

      positions[vertex * 3] = point.x;
      positions[vertex * 3 + 1] = impact.y + 0.025;
      positions[vertex * 3 + 2] = point.z;
      uvs[vertex * 2] = 0.5 + Math.cos(angle) * radius / (WATERFALL_IMPACT_RADIUS * 2);
      uvs[vertex * 2 + 1] = 0.5
        + (Math.sin(angle) * radius + downstreamShift) / (WATERFALL_IMPACT_RADIUS * 2);
    }
  }

  for (let segment = 0; segment < radialSegments; segment += 1) {
    indices.push(0, 1 + segment, 1 + (segment + 1) % radialSegments);
  }

  for (let ring = 1; ring < radialRings; ring += 1) {
    const innerStart = 1 + (ring - 1) * radialSegments;
    const outerStart = innerStart + radialSegments;

    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      const a = innerStart + segment;
      const b = innerStart + next;
      const c = outerStart + segment;
      const d = outerStart + next;

      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.userData.impactRadius = WATERFALL_IMPACT_RADIUS;

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
      flowUvs[attributeOffset * 2 + 1] = lateral;
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

function getWaterfallCurtainWidth(s) {
  const contraction = 1 - 0.22 * smoothstep(0.04, 0.62, s);
  const lowerSpread = 0.35 * smoothstep(0.68, 1, s);

  return WATERFALL_HYDRAULIC_FRAME.crestWidth * (contraction + lowerSpread);
}

function createWaterfallGeometry() {
  const verticesPerRow = WATERFALL_LATERAL_SEGMENTS + 1;
  const vertexCount = (WATERFALL_VERTICAL_SEGMENTS + 1) * verticesPerRow;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const fallTimes = new Float32Array(vertexCount);
  const lateralMeters = new Float32Array(vertexCount);
  const sheetThicknesses = new Float32Array(vertexCount);
  const indices = new Uint32Array(
    WATERFALL_VERTICAL_SEGMENTS * WATERFALL_LATERAL_SEGMENTS * 6,
  );
  const lip = getWaterfallLip();
  const impact = getWaterfallImpact();
  const right = getOutletLipSide();
  const drop = lip.y - impact.y;
  const flightTime = Math.sqrt(2 * drop / WATERFALL_GRAVITY);
  let positionOffset = 0;
  let uvOffset = 0;
  let attributeOffset = 0;

  for (let i = 0; i <= WATERFALL_VERTICAL_SEGMENTS; i += 1) {
    const s = i / WATERFALL_VERTICAL_SEGMENTS;
    const center = new THREE.Vector3(
      THREE.MathUtils.lerp(lip.x, impact.x, s),
      lip.y - drop * s * s,
      THREE.MathUtils.lerp(lip.z, impact.z, s),
    );
    const width = getWaterfallCurtainWidth(s);
    const lowerBreakup = smoothstep(0.64, 1, s);
    const thickness = Math.max(0.055, 0.16 / Math.sqrt(1 + 4.2 * s));

    for (let j = 0; j <= WATERFALL_LATERAL_SEGMENTS; j += 1) {
      const lateralT = j / WATERFALL_LATERAL_SEGMENTS;
      const lateral = (lateralT - 0.5) * width;
      const breakup = (
        Math.sin(i * 1.37 + j * 2.71)
        + Math.sin(i * 0.53 - j * 1.43) * 0.55
      ) * 0.075 * lowerBreakup * Math.abs(lateralT - 0.5) * 2;
      const point = center.clone().addScaledVector(right, lateral + breakup);

      positions[positionOffset] = point.x;
      positions[positionOffset + 1] = point.y;
      positions[positionOffset + 2] = point.z;
      positionOffset += 3;

      uvs[uvOffset] = lateralT;
      uvs[uvOffset + 1] = s;
      uvOffset += 2;

      fallTimes[attributeOffset] = s * flightTime;
      lateralMeters[attributeOffset] = lateral;
      sheetThicknesses[attributeOffset] = thickness;
      attributeOffset += 1;
    }
  }

  let indexOffset = 0;
  for (let i = 0; i < WATERFALL_VERTICAL_SEGMENTS; i += 1) {
    for (let j = 0; j < WATERFALL_LATERAL_SEGMENTS; j += 1) {
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
  geometry.setAttribute('fallTime', new THREE.BufferAttribute(fallTimes, 1));
  geometry.setAttribute('lateralMeters', new THREE.BufferAttribute(lateralMeters, 1));
  geometry.setAttribute('sheetThickness', new THREE.BufferAttribute(sheetThicknesses, 1));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.userData.waterfall = Object.freeze({
    verticalSegments: WATERFALL_VERTICAL_SEGMENTS,
    lateralSegments: WATERFALL_LATERAL_SEGMENTS,
    flightTime,
    topWidth: WATERFALL_HYDRAULIC_FRAME.crestWidth,
    impactY: impact.y,
  });

  return geometry;
}

function createWaterfallLipFoamGeometry() {
  const longitudinalSegments = 8;
  const lipSegment = 6;
  const lateralSegments = WATERFALL_LATERAL_SEGMENTS;
  const verticesPerRow = lateralSegments + 1;
  const positions = new Float32Array((longitudinalSegments + 1) * verticesPerRow * 3);
  const uvs = new Float32Array((longitudinalSegments + 1) * verticesPerRow * 2);
  const crestCoverages = new Float32Array((longitudinalSegments + 1) * verticesPerRow);
  const indices = new Uint32Array(longitudinalSegments * lateralSegments * 6);
  const lip = getWaterfallLip();
  const impact = getWaterfallImpact();
  const side = getOutletLipSide();
  const forward = getOutletLipForward();
  const fallDistance = Math.hypot(impact.x - lip.x, impact.z - lip.z);
  const drop = lip.y - impact.y;
  let positionOffset = 0;
  let uvOffset = 0;
  let attributeOffset = 0;

  for (let i = 0; i <= longitudinalSegments; i += 1) {
    const t = i / longitudinalSegments;
    const upstream = i <= lipSegment;
    const upstreamT = Math.min(i / lipSegment, 1);
    const overlapT = upstream
      ? 0
      : (i - lipSegment) / (longitudinalSegments - lipSegment);
    const fallS = Math.min(
      overlapT * WATERFALL_LIP_FOAM_OVERLAP / Math.max(fallDistance, 1e-6),
      1,
    );
    const center = upstream
      ? lip.clone().addScaledVector(
        forward,
        (upstreamT - 1) * WATERFALL_LIP_FOAM_LENGTH,
      )
      : new THREE.Vector3(
        THREE.MathUtils.lerp(lip.x, impact.x, fallS),
        lip.y - drop * fallS * fallS,
        THREE.MathUtils.lerp(lip.z, impact.z, fallS),
      );
    const width = upstream
      ? WATERFALL_HYDRAULIC_FRAME.crestWidth
      : getWaterfallCurtainWidth(fallS);
    const crestCoverage = upstream
      ? smoothstep(0, 0.55, upstreamT)
      : 1 - smoothstep(0, 1, overlapT);

    center.y += WATERFALL_LIP_FOAM_SURFACE_OFFSET;

    for (let j = 0; j <= lateralSegments; j += 1) {
      const lateralT = j / lateralSegments;
      const edgeT = Math.abs(lateralT - 0.5) * 2;
      const widthNoise = (
        Math.sin(i * 1.17 + j * 2.31)
        + Math.sin(i * 2.07 - j * 0.73) * 0.5
      ) * 0.045 * edgeT * (upstream ? 1 - upstreamT : 0);
      const lateral = (lateralT - 0.5)
        * width
        * (1 + (upstream ? 0.04 * (1 - upstreamT) : 0) + widthNoise);
      const point = center.clone().addScaledVector(side, lateral);

      positions[positionOffset] = point.x;
      positions[positionOffset + 1] = point.y;
      positions[positionOffset + 2] = point.z;
      positionOffset += 3;
      uvs[uvOffset] = lateralT;
      uvs[uvOffset + 1] = t;
      uvOffset += 2;
      crestCoverages[attributeOffset] = crestCoverage;
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
  geometry.setAttribute(
    'crestCoverage',
    new THREE.BufferAttribute(crestCoverages, 1),
  );
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.userData.crestWidth = WATERFALL_HYDRAULIC_FRAME.crestWidth;
  geometry.userData.crestLength = WATERFALL_LIP_FOAM_LENGTH;
  geometry.userData.crestOverlapLength = WATERFALL_LIP_FOAM_OVERLAP;
  geometry.userData.lipRow = lipSegment;
  geometry.userData.rowSize = verticesPerRow;

  return geometry;
}

function createWaterfallMaterial() {
  const material = new THREE.ShaderMaterial({
    name: 'WaterfallMountainThinVeilMaterial',
    side: THREE.DoubleSide,
    transparent: true,
    forceSinglePass: true,
    depthWrite: false,
    depthTest: true,
    premultipliedAlpha: true,
    blending: THREE.NormalBlending,
    extensions: { derivatives: true },
    uniforms: createWaterUniforms({
      tSceneColor: { value: null },
      tSceneDepth: { value: null },
      tWaterDepth: { value: null },
      tEnvironmentMap: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uProjectionMatrixInverse: { value: new THREE.Matrix4() },
      uCameraWorldMatrix: { value: new THREE.Matrix4() },
      uViewMatrix: { value: new THREE.Matrix4() },
      uSunDirection: { value: VISUAL_ENVIRONMENT.sun.direction.clone() },
      uSunColor: { value: new THREE.Color(VISUAL_ENVIRONMENT.sun.glowColor) },
      uHasEnvironmentMap: { value: 0 },
      uWaterEffectOpticsReady: { value: 0 },
    }),
    vertexShader: `
      uniform float uTime;

      attribute float fallTime;
      attribute float lateralMeters;
      attribute float sheetThickness;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying float vFallTime;
      varying float vLateralMeters;
      varying float vSheetThickness;
      ${WATER_FOG_VERTEX_PARS_GLSL}

      void main() {
        vUv = uv;
        vFallTime = fallTime;
        vLateralMeters = lateralMeters;
        vSheetThickness = sheetThickness;
        float displacementMask = smoothstep(0.05, 0.34, uv.y)
          * (1.0 - smoothstep(0.9, 1.0, uv.y));
        float normalDisplacement = (
          sin(lateralMeters * 2.8 + fallTime * 8.0 - uTime * 4.6)
          + sin(lateralMeters * 6.1 - fallTime * 5.2 + uTime * 2.1) * 0.42
        ) * 0.055 * displacementMask;
        vec3 displacedPosition = position + normal * normalDisplacement;
        vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        ${WATER_FOG_VERTEX_GLSL}
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D tSceneColor;
      uniform sampler2D tSceneDepth;
      uniform sampler2D tWaterDepth;
      uniform sampler2D tEnvironmentMap;

      uniform float uTime;
      uniform float uHasEnvironmentMap;
      uniform float uWaterEffectOpticsReady;
      uniform vec2 uResolution;
      uniform mat4 uProjectionMatrixInverse;
      uniform mat4 uViewMatrix;
      uniform vec3 uCameraPosition;
      uniform vec3 uSunDirection;
      uniform vec3 uSunColor;
      uniform vec3 uShallowColor;
      uniform vec3 uDeepColor;
      uniform vec3 uFoamColor;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying float vFallTime;
      varying float vLateralMeters;
      varying float vSheetThickness;
      ${WATER_FOG_FRAGMENT_PARS_GLSL}

      ${WATER_NOISE_GLSL}

      float reconstructViewDistance(vec2 uv, float depth) {
        vec4 viewPosition = uProjectionMatrixInverse * vec4(
          uv * 2.0 - 1.0,
          depth * 2.0 - 1.0,
          1.0
        );
        viewPosition /= max(viewPosition.w, 0.0001);
        return -viewPosition.z;
      }

      vec2 equirectangularUv(vec3 direction) {
        vec3 unitDirection = normalize(direction);
        return vec2(
          atan(unitDirection.z, unitDirection.x) / 6.2831853 + 0.5,
          asin(clamp(unitDirection.y, -1.0, 1.0)) / 3.14159265 + 0.5
        );
      }

      void main() {
        float phase = vFallTime - uTime;
        float edgeDistance = min(vUv.x, 1.0 - vUv.x);
        float edgeAa = max(fwidth(vUv.x) * 1.5, 0.006);
        float edgeCoverage = smoothstep(0.0, 0.055 + edgeAa, edgeDistance);
        float macroStreak = waterNoise2(vec2(vLateralMeters * 0.78, phase * 3.4));
        float fineStreak = waterNoise(vec2(vLateralMeters * 3.8 + 9.7, phase * 8.2));
        float whiteWater = smoothstep(0.48, 0.82, macroStreak * 0.68 + fineStreak * 0.52);
        float lowerBreakup = smoothstep(0.64, 0.9, vUv.y);
        float strandWave = sin(vUv.x * 31.4159265 + phase * 2.1) * 0.5 + 0.5;
        float strandNoise = waterNoise2(vec2(vLateralMeters * 1.34, phase * 1.7));
        float strandField = strandWave * 0.62 + strandNoise * 0.38;
        float strandAa = max(fwidth(strandField) * 1.15, 0.025);
        float strands = smoothstep(0.46 - strandAa, 0.46 + strandAa, strandField);
        float coverage = edgeCoverage * mix(1.0, strands, lowerBreakup);
        coverage *= smoothstep(0.0, 0.055, vUv.y);

        if (coverage < 0.012) discard;

        vec3 worldNormal = normalize(vWorldNormal + vec3(
          (macroStreak - 0.5) * 0.28,
          (fineStreak - 0.5) * 0.12,
          (fineStreak - macroStreak) * 0.22
        ));
        if (!gl_FrontFacing) worldNormal = -worldNormal;
        vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
        vec3 viewNormal = normalize(mat3(uViewMatrix) * worldNormal);
        vec3 baseColor = mix(uDeepColor, uShallowColor, 0.64);
        vec3 refractedColor = baseColor;
        float depthVisibility = 1.0;

        if (uWaterEffectOpticsReady > 0.5) {
          vec2 screenUv = clamp(
            gl_FragCoord.xy / max(uResolution, vec2(1.0)),
            vec2(0.001),
            vec2(0.999)
          );
          float fragmentDistance = reconstructViewDistance(screenUv, gl_FragCoord.z);
          float refractionPixels = mix(2.4, 0.4, smoothstep(0.56, 1.0, vUv.y));
          vec2 refractedUv = clamp(
            screenUv + viewNormal.xy * refractionPixels / max(uResolution, vec2(1.0)),
            vec2(0.001),
            vec2(0.999)
          );
          float candidateDepth = texture2D(tSceneDepth, refractedUv).r;
          float candidateDistance = reconstructViewDistance(refractedUv, candidateDepth);
          if (candidateDistance <= fragmentDistance + 0.02) refractedUv = screenUv;
          refractedColor = texture2D(tSceneColor, refractedUv).rgb;

          float sceneDepth = texture2D(tSceneDepth, screenUv).r;
          float sceneDistance = reconstructViewDistance(screenUv, sceneDepth);
          float rockIntersection = sceneDepth >= 0.999999
            ? 1.0
            : smoothstep(-0.04, 0.22, sceneDistance - fragmentDistance);
          float waterDepth = texture2D(tWaterDepth, screenUv).r;
          float poolVisibility = 1.0;
          if (waterDepth < 0.999999) {
            float waterDistance = reconstructViewDistance(screenUv, waterDepth);
            poolVisibility = smoothstep(-0.035, 0.18, waterDistance - fragmentDistance);
          }
          depthVisibility = rockIntersection * poolVisibility;
        }

        float aeration = clamp(
          whiteWater * 0.7 + smoothstep(0.55, 1.0, vUv.y) * 0.58,
          0.0,
          1.0
        );
        vec3 transmission = exp(-vSheetThickness * vec3(1.9, 1.15, 0.78));
        vec3 color = refractedColor * transmission
          + baseColor * (1.0 - transmission) * 0.92;
        color = mix(color, uFoamColor, aeration * 0.76);

        float fresnel = 0.02037 + 0.97963 * pow(
          1.0 - max(dot(worldNormal, viewDirection), 0.0),
          5.0
        );
        vec3 reflectionColor = uShallowColor;
        if (uHasEnvironmentMap > 0.5) {
          vec3 reflectedDirection = reflect(-viewDirection, worldNormal);
          reflectionColor = texture2D(
            tEnvironmentMap,
            equirectangularUv(reflectedDirection)
          ).rgb;
        }
        color = mix(color, reflectionColor, fresnel * (1.0 - aeration) * 0.34);

        vec3 lightDirection = normalize(uSunDirection);
        vec3 halfDirection = normalize(viewDirection + lightDirection);
        float sunSpecular = pow(max(dot(worldNormal, halfDirection), 0.0), 72.0);
        color += uSunColor * sunSpecular * (1.0 - aeration) * 0.32;

        float alpha = coverage
          * depthVisibility
          * mix(0.34, 0.68, aeration)
          * mix(0.92, 0.74, fresnel);
        if (alpha < 0.008) discard;
        float waterFogFactor = 1.0 - exp(
          -uWaterFogDensity * uWaterFogDensity * vWaterFogDepth * vWaterFogDepth
        );
        color = mix(color, uWaterFogColor, clamp(waterFogFactor, 0.0, 1.0));
        gl_FragColor = vec4(color * alpha, alpha);
      }
    `,
  });

  material.userData.waterEffectOptics = true;
  material.userData.waterfallStyle = 'mountain-thin-veil';

  return material;
}

function createFoamOverlayMaterial() {
  return new THREE.ShaderMaterial({
    name: 'WaterfallImpactFoamMaterial',
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
        vec2 centered = (vUv - vec2(0.5)) * 2.0;
        float radius = length(centered);
        float outerFade = 1.0 - smoothstep(0.74, 0.96, radius);
        float core = 1.0 - smoothstep(0.08, 0.42, radius);
        float ring = smoothstep(0.18, 0.42, radius)
          * (1.0 - smoothstep(0.62, 0.88, radius));
        float broken = smoothstep(
          0.38,
          0.78,
          waterNoise2(centered * 7.2 + vec2(-uTime * 0.45, uTime * 0.17))
        );
        float fine = smoothstep(
          0.54,
          0.88,
          waterNoise(centered * 18.0 + vec2(uTime * 0.28, -uTime * 0.21))
        );
        float downstreamBias = smoothstep(-0.62, 0.48, centered.y);
        float alpha = outerFade * (
          core * mix(0.2, 0.38, fine)
          + ring * max(broken * 0.3, fine * 0.18)
        ) * mix(0.82, 1.0, downstreamBias);

        gl_FragColor = vec4(uFoamColor, alpha);
        ${WATER_FOG_FRAGMENT_GLSL}
      }
    `,
  });
}

function createWaterfallLipFoamMaterial() {
  return new THREE.ShaderMaterial({
    name: 'WaterfallCrestFoamMaterial',
    side: THREE.DoubleSide,
    transparent: true,
    forceSinglePass: true,
    depthWrite: false,
    depthTest: true,
    uniforms: createWaterUniforms(),
    vertexShader: `
      attribute float crestCoverage;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vCrestCoverage;
      ${WATER_FOG_VERTEX_PARS_GLSL}

      void main() {
        vUv = uv;
        vCrestCoverage = crestCoverage;
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
      varying float vCrestCoverage;
      ${WATER_FOG_FRAGMENT_PARS_GLSL}

      ${WATER_NOISE_GLSL}

      void main() {
        float edge = smoothstep(0.0, 0.08, vUv.x)
          * (1.0 - smoothstep(0.92, 1.0, vUv.x));
        float crest = smoothstep(0.44, 1.0, vUv.y);
        float broken = smoothstep(
          0.38,
          0.78,
          waterNoise2(vUv * vec2(16.0, 10.0) + vec2(-uTime * 0.38, uTime * 0.09))
        );
        float fine = smoothstep(
          0.54,
          0.88,
          waterNoise(vUv * vec2(44.0, 25.0) + vec2(uTime * 0.22, -uTime * 0.17))
        );
        float coverage = edge
          * vCrestCoverage
          * mix(0.58, 1.0, max(broken, fine));
        float alpha = coverage * mix(0.12, 0.34, crest);
        vec3 color = mix(uShallowColor, uFoamColor, max(broken * 0.72, crest));

        gl_FragColor = vec4(color, alpha);
        ${WATER_FOG_FRAGMENT_GLSL}
      }
    `,
  });
}

function createWaterfallParticles() {
  const positions = new Float32Array(WATERFALL_PARTICLE_COUNT * 3);
  const velocities = new Float32Array(WATERFALL_PARTICLE_COUNT * 3);
  const randoms = new Float32Array(WATERFALL_PARTICLE_COUNT);
  const particleTypes = new Float32Array(WATERFALL_PARTICLE_COUNT);
  const lifetimes = new Float32Array(WATERFALL_PARTICLE_COUNT);
  const pointSizes = new Float32Array(WATERFALL_PARTICLE_COUNT);
  const impact = getWaterfallImpact();
  const outflow = getWaterfallOutflow();
  const side = new THREE.Vector3(-outflow.z, 0, outflow.x);

  for (let i = 0; i < WATERFALL_PARTICLE_COUNT; i += 1) {
    const seed = pseudoRandom(i * 12.2 + 3.7);
    const isMist = i >= WATERFALL_SPRAY_COUNT;
    const lateralRange = isMist ? 4.4 : 3.2;
    const downstreamRange = isMist ? 4.6 : 2.4;
    const lateral = (pseudoRandom(i * 4.7 + 1.3) - 0.5) * lateralRange;
    const downstream = pseudoRandom(i * 9.3 + 2.1) * downstreamRange - 0.8;
    const point = impact.clone()
      .addScaledVector(side, lateral)
      .addScaledVector(outflow, downstream);
    const sideVelocity = (pseudoRandom(i * 3.1 + 0.7) - 0.5) * (isMist ? 0.55 : 3.4);
    const forwardVelocity = isMist
      ? 0.28 + pseudoRandom(i * 5.8 + 0.4) * 0.62
      : 0.45 + pseudoRandom(i * 5.8 + 0.4) * 1.9;
    const verticalVelocity = isMist
      ? 0.34 + pseudoRandom(i * 8.9 + 1.1) * 0.72
      : 3.1 + pseudoRandom(i * 8.9 + 1.1) * 3.8;
    const velocity = outflow.clone()
      .multiplyScalar(forwardVelocity)
      .addScaledVector(side, sideVelocity);
    velocity.y = verticalVelocity;

    positions[i * 3] = point.x;
    positions[i * 3 + 1] = impact.y + 0.08 + pseudoRandom(i * 2.1) * 0.14;
    positions[i * 3 + 2] = point.z;
    velocities[i * 3] = velocity.x;
    velocities[i * 3 + 1] = velocity.y;
    velocities[i * 3 + 2] = velocity.z;
    randoms[i] = seed;
    particleTypes[i] = isMist ? 1 : 0;
    lifetimes[i] = isMist
      ? 2.3 + pseudoRandom(i * 6.2 + 0.9) * 1.4
      : 0.72 + pseudoRandom(i * 6.2 + 0.9) * 0.42;
    pointSizes[i] = isMist
      ? 10 + pseudoRandom(i * 7.4 + 1.8) * 9
      : 3.4 + pseudoRandom(i * 7.4 + 1.8) * 4.8;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
  geometry.setAttribute('randomSeed', new THREE.BufferAttribute(randoms, 1));
  geometry.setAttribute('particleType', new THREE.BufferAttribute(particleTypes, 1));
  geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
  geometry.setAttribute('pointSize', new THREE.BufferAttribute(pointSizes, 1));
  geometry.userData.sprayCount = WATERFALL_SPRAY_COUNT;
  geometry.userData.mistCount = WATERFALL_MIST_COUNT;
  geometry.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(impact.x, impact.y + 3, impact.z),
    9,
  );

  const material = new THREE.ShaderMaterial({
    name: 'WaterfallSprayMistMaterial',
    transparent: true,
    depthWrite: false,
    depthTest: true,
    premultipliedAlpha: true,
    blending: THREE.NormalBlending,
    uniforms: createWaterUniforms({
      tSceneDepth: { value: null },
      tWaterDepth: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uProjectionMatrixInverse: { value: new THREE.Matrix4() },
      uCameraWorldMatrix: { value: new THREE.Matrix4() },
      uViewMatrix: { value: new THREE.Matrix4() },
      uWaterEffectOpticsReady: { value: 0 },
      uPoolSurfaceY: { value: WATERFALL_HYDRAULIC_FRAME.poolSurfaceY },
    }),
    vertexShader: `
      uniform float uTime;
      uniform float uPoolSurfaceY;

      attribute vec3 velocity;
      attribute float randomSeed;
      attribute float particleType;
      attribute float lifetime;
      attribute float pointSize;

      varying float vAlpha;
      varying float vParticleType;
      ${WATER_FOG_VERTEX_PARS_GLSL}

      void main() {
        float age = mod(uTime + randomSeed * lifetime, lifetime);
        float lifeT = age / lifetime;
        vec3 animated = position;
        if (particleType < 0.5) {
          animated += velocity * age;
          animated.y -= 4.905 * age * age;
          vAlpha = sin(lifeT * 3.14159265)
            * smoothstep(uPoolSurfaceY + 0.01, uPoolSurfaceY + 0.18, animated.y)
            * mix(0.24, 0.48, randomSeed);
        } else {
          animated += velocity * age;
          animated.x += sin(age * 1.7 + randomSeed * 17.0) * 0.38 * lifeT;
          animated.z += cos(age * 1.3 + randomSeed * 13.0) * 0.34 * lifeT;
          vAlpha = sin(lifeT * 3.14159265) * mix(0.045, 0.105, randomSeed);
        }
        vec4 worldPosition = modelMatrix * vec4(animated, 1.0);
        vec4 mvPosition = viewMatrix * worldPosition;
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = pointSize * (180.0 / max(-mvPosition.z, 0.01));
        vParticleType = particleType;
        ${WATER_FOG_VERTEX_GLSL}
      }
    `,
    fragmentShader: `
      uniform sampler2D tSceneDepth;
      uniform sampler2D tWaterDepth;
      uniform float uWaterEffectOpticsReady;
      uniform vec2 uResolution;
      uniform mat4 uProjectionMatrixInverse;

      varying float vAlpha;
      varying float vParticleType;
      uniform vec3 uFoamColor;
      uniform vec3 uHorizonReflectionColor;
      ${WATER_FOG_FRAGMENT_PARS_GLSL}

      float reconstructViewDistance(vec2 uv, float depth) {
        vec4 viewPosition = uProjectionMatrixInverse * vec4(
          uv * 2.0 - 1.0,
          depth * 2.0 - 1.0,
          1.0
        );
        viewPosition /= max(viewPosition.w, 0.0001);
        return -viewPosition.z;
      }

      void main() {
        vec2 centered = gl_PointCoord - vec2(0.5);
        float d = length(centered);
        float profile = mix(
          1.0 - smoothstep(0.2, 0.5, d),
          1.0 - smoothstep(0.05, 0.5, d),
          vParticleType
        );
        float depthFade = 1.0;
        if (uWaterEffectOpticsReady > 0.5) {
          vec2 screenUv = clamp(
            gl_FragCoord.xy / max(uResolution, vec2(1.0)),
            vec2(0.001),
            vec2(0.999)
          );
          float fragmentDistance = reconstructViewDistance(screenUv, gl_FragCoord.z);
          float sceneDepth = texture2D(tSceneDepth, screenUv).r;
          if (sceneDepth < 0.999999) {
            float sceneDistance = reconstructViewDistance(screenUv, sceneDepth);
            depthFade *= smoothstep(-0.03, 0.42, sceneDistance - fragmentDistance);
          }
          float waterDepth = texture2D(tWaterDepth, screenUv).r;
          if (waterDepth < 0.999999) {
            float waterDistance = reconstructViewDistance(screenUv, waterDepth);
            depthFade *= smoothstep(-0.025, 0.26, waterDistance - fragmentDistance);
          }
        }
        float alpha = profile * vAlpha * depthFade;
        if (alpha < 0.004) discard;
        vec3 color = mix(uFoamColor, uHorizonReflectionColor, vParticleType * 0.38);
        float waterFogFactor = 1.0 - exp(
          -uWaterFogDensity * uWaterFogDensity * vWaterFogDepth * vWaterFogDepth
        );
        color = mix(color, uWaterFogColor, clamp(waterFogFactor, 0.0, 1.0));
        gl_FragColor = vec4(color * alpha, alpha);
      }
    `,
  });
  material.userData.waterEffectOptics = true;
  material.userData.waterfallParticleCount = WATERFALL_PARTICLE_COUNT;

  const points = new THREE.Points(geometry, material);
  points.name = 'WaterfallSprayMistParticles';
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
  const frame = getLakeBoundaryFrame(ALPINE_LAKE_BOUNDARY, x, z);

  return {
    radius: frame.radius,
    lakeRadius: frame.boundaryRadius,
    signedDistance: frame.signedDistance,
    inside: frame.inside ? 1 : 0,
    normalized: frame.normalizedRadius,
  };
}

function lakeRadiusAt(angle) {
  return getLakeBoundaryRadius(ALPINE_LAKE_BOUNDARY, angle);
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
  const riverLakeFade = getLakesOutsideFade(RIVER_NETWORK.lakeFeatures, x, z);
  let bedMask = 0;
  let wetMask = 0;
  let lakeBedMask = 0;

  if (frame && frame.distance <= frame.influence) {
    const wetOuter = Math.min(frame.influence, frame.halfWidth + 3);

    bedMask = (
      1 - smoothstep(frame.halfWidth * 0.58, frame.halfWidth, frame.distance)
    ) * riverLakeFade;
    wetMask = (
      1 - smoothstep(frame.halfWidth * 0.82, wetOuter, frame.distance)
    ) * 0.72 * riverLakeFade;
  }

  const riverWetMask = wetMask;

  for (const lake of RIVER_NETWORK.lakeFeatures) {
    if (lake.existing) continue;

    const boundary = getLakeBoundary(lake);
    const lakeFrame = getLakeBoundaryFrame(boundary, x, z);
    const lakeBed = 1 - smoothstep(-1, 0.35, lakeFrame.signedDistance);
    const innerWet = smoothstep(-5, -0.8, lakeFrame.signedDistance)
      * (1 - smoothstep(-0.8, 0.2, lakeFrame.signedDistance));
    const outerWet = lakeFrame.signedDistance > 0
      ? 1 - smoothstep(0, boundary.shoreWidth, lakeFrame.signedDistance)
      : 0;

    lakeBedMask = Math.max(lakeBedMask, lakeBed);
    wetMask = Math.max(wetMask, innerWet * 0.72, outerWet);
  }

  return {
    bedMask: THREE.MathUtils.clamp(bedMask, 0, 1),
    wetMask: THREE.MathUtils.clamp(wetMask, 0, 1),
    lakeBedMask: THREE.MathUtils.clamp(lakeBedMask, 0, 1),
    riverWetMask: THREE.MathUtils.clamp(riverWetMask, 0, 1),
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

function disposeWaterEffects(root) {
  const geometries = new Set();
  const materials = new Set();

  root.traverse((child) => {
    if (child.geometry) geometries.add(child.geometry);
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];

    childMaterials.forEach((material) => {
      if (material) materials.add(material);
    });
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function setWaterEffectFog(root, density) {
  const materials = new Set();

  root.traverse((child) => {
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];

    childMaterials.forEach((material) => {
      if (material?.uniforms?.uWaterFogDensity) materials.add(material);
    });
  });

  materials.forEach((material) => {
    material.uniforms.uWaterFogDensity.value = density;
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
