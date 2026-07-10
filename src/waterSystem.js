import * as THREE from 'three';
import { SUN_LIGHT_DIRECTION } from './lighting.js';
import {
  WATER_BANK_REFLECTION_COLOR,
  WATER_DEEP_COLOR,
  WATER_FOAM_COLOR,
  WATER_HORIZON_REFLECTION_COLOR,
  WATER_REFLECTION_COLOR,
  WATER_SHALLOW_COLOR,
  WATER_SUN_REFLECTION_COLOR,
} from './waterPalette.js';

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

const OUTLET_POINTS = [
  new THREE.Vector3(340, 0, -410),
  new THREE.Vector3(365, 0, -417),
  new THREE.Vector3(392, 0, -419),
  new THREE.Vector3(409, 0, -421),
];
const OUTLET_WIDTH = 5.2;
const OUTLET_INFLUENCE = 8.5;
const OUTLET_WATER_OFFSET = 0.35;
const WATERFALL_LIP_FOAM_LENGTH = 4.2;
const WATERFALL_LIP_FOAM_WIDTH = 7.2;

const WATERFALL_LIP = new THREE.Vector3(409, LAKE_WATER_LEVEL - 0.6, -421);
const WATERFALL_BASE = new THREE.Vector3(418, 1.5, -424);
const WATERFALL_WIDTH = 7.5;
const WATERFALL_LAYERS = [
  { name: 'WaterfallMainVeil', xOffset: 0, zOffset: 0, width: 0.72, alpha: 0.105, speed: 1.15 },
  { name: 'WaterfallLeftThreads', xOffset: -1.7, zOffset: -0.45, width: 0.3, alpha: 0.052, speed: 1.35 },
  { name: 'WaterfallRightThreads', xOffset: 1.7, zOffset: 0.3, width: 0.32, alpha: 0.056, speed: 1.28 },
  { name: 'WaterfallMistVeil', xOffset: 0.3, zOffset: 0.8, width: 0.82, alpha: 0.024, speed: 0.72 },
];

const PLUNGE_CENTER = new THREE.Vector2(418, -424);
const PLUNGE_RADIUS = 10;
const PLUNGE_FLOOR = -2.2;
const PLUNGE_OUTFLOW_DIRECTION = new THREE.Vector2(0.82, 0.57).normalize();
const PLUNGE_OUTFLOW_LENGTH = 24;
const PLUNGE_OUTFLOW_START_WIDTH = 8.5;
const PLUNGE_OUTFLOW_END_WIDTH = 4.2;

const SNOWMELT_PATHS = [
  [
    new THREE.Vector3(188, 0, -610),
    new THREE.Vector3(205, 0, -570),
    new THREE.Vector3(226, 0, -528),
    new THREE.Vector3(244, 0, -490),
    new THREE.Vector3(260, 0, -456),
    new THREE.Vector3(267.3, 0, -441.9),
  ],
  [
    new THREE.Vector3(286, 0, -628),
    new THREE.Vector3(294, 0, -586),
    new THREE.Vector3(301, 0, -542),
    new THREE.Vector3(307, 0, -501),
    new THREE.Vector3(310, 0, -462),
    new THREE.Vector3(309.1, 0, -448.3),
  ],
  [
    new THREE.Vector3(148, 0, -558),
    new THREE.Vector3(176, 0, -530),
    new THREE.Vector3(204, 0, -498),
    new THREE.Vector3(230, 0, -466),
    new THREE.Vector3(254, 0, -437),
    new THREE.Vector3(265.9, 0, -428.3),
  ],
];
const SNOWMELT_WIDTH = 2.1;
const SNOWMELT_INFLUENCE = 6.6;
const SNOWMELT_CARVE_DEPTH = 0.72;
const SNOWMELT_SURFACE_OFFSET = 0.38;
const WATER_SURFACE_RENDER_ORDER = 20;

const outletCurve = new THREE.CatmullRomCurve3(OUTLET_POINTS, false, 'centripetal');
const outletSamples = createPathSamples(outletCurve, 100);
const snowmeltCurves = SNOWMELT_PATHS.map((points) => new THREE.CatmullRomCurve3(points, false, 'centripetal'));
const snowmeltSamples = snowmeltCurves.map((curve) => createPathSamples(curve, 90));

export function applyWaterSystemTerrain(baseHeight, x, z) {
  if (!isNearWaterSystem(x, z)) return baseHeight;

  let height = applyLakeBasin(baseHeight, x, z);
  height = applyOutletChannel(height, x, z);
  height = applySnowmeltChannels(height, x, z);
  height = applyPlungePool(height, x, z);

  return height;
}

export function getWaterSystemMaterialFrame(baseHeight, x, z) {
  if (!isNearWaterSystem(x, z)) return createEmptyWaterSystemMaterialFrame();

  const lake = getLakeFrame(x, z);
  const outlet = getPathFrame(outletSamples, x, z);
  const snowmelt = getClosestSnowmeltFrame(x, z);
  const plungeDistance = new THREE.Vector2(x, z).distanceTo(PLUNGE_CENTER);
  const lakeBedMask = lake.inside * (1 - smoothstep(lake.lakeRadius - 1.2, lake.lakeRadius + 0.4, lake.radius));
  const lakeInnerShoreMask = lake.inside * smoothstep(lake.lakeRadius - 8, lake.lakeRadius - 1.4, lake.radius);
  const lakeOuterShoreMask = (1 - lake.inside) * (1 - smoothstep(lake.lakeRadius, lake.lakeRadius + LAKE_SHORE_WIDTH, lake.radius));
  const outletMask = outlet ? 1 - smoothstep(OUTLET_WIDTH * 0.5, OUTLET_INFLUENCE, Math.abs(outlet.lateral)) : 0;
  const snowmeltMask = snowmelt ? 1 - smoothstep(SNOWMELT_WIDTH * 0.4, SNOWMELT_INFLUENCE, Math.abs(snowmelt.lateral)) : 0;
  const plungeMask = 1 - smoothstep(PLUNGE_RADIUS * 0.45, PLUNGE_RADIUS, plungeDistance);
  const wetShoreMask = Math.max(lakeInnerShoreMask * 0.68, lakeOuterShoreMask, outletMask * 0.65, snowmeltMask * 0.8, plungeMask * 0.8);

  return {
    lakeBedMask: THREE.MathUtils.clamp(lakeBedMask, 0, 1),
    wetShoreMask: THREE.MathUtils.clamp(wetShoreMask, 0, 1),
    snowmeltWetMask: THREE.MathUtils.clamp(snowmeltMask, 0, 1),
    outletMask: THREE.MathUtils.clamp(outletMask, 0, 1),
    plungeMask: THREE.MathUtils.clamp(plungeMask, 0, 1),
    lakeDistance: lake.radius,
  };
}

export function isInWaterSystemVegetationExclusion(x, z, buffer = 2) {
  if (!isNearWaterSystem(x, z, buffer + 12)) return false;

  const lake = getLakeFrame(x, z);
  if (lake.radius <= lake.lakeRadius + LAKE_SHORE_WIDTH + buffer) return true;

  const outlet = getPathFrame(outletSamples, x, z);
  if (outlet && Math.abs(outlet.lateral) <= OUTLET_WIDTH * 0.5 + buffer + 1.5) return true;

  const snowmelt = getClosestSnowmeltFrame(x, z);
  if (snowmelt && Math.abs(snowmelt.lateral) <= SNOWMELT_WIDTH * 0.5 + buffer + 1) return true;

  const plungeDistance = new THREE.Vector2(x, z).distanceTo(PLUNGE_CENTER);

  return plungeDistance <= PLUNGE_RADIUS + buffer;
}

function createEmptyWaterSystemMaterialFrame() {
  return {
    lakeBedMask: 0,
    wetShoreMask: 0,
    snowmeltWetMask: 0,
    outletMask: 0,
    plungeMask: 0,
    lakeDistance: 0,
  };
}

export function createWaterSystem(terrain) {
  const lake = createLakeWater(terrain);
  const outletStream = createOutletStream(terrain);
  const snowmelt = createSnowmeltGroup(terrain);
  const waterfall = createWaterfallGroup(terrain);
  const waterfallLipFoam = createWaterfallLipFoam(terrain);
  const confluence = createConfluenceFoam();
  const group = new THREE.Group();

  group.name = 'WaterSystem';
  group.add(lake, outletStream, snowmelt, waterfall, waterfallLipFoam, confluence);

  return {
    group,
    lake,
    outletStream,
    snowmelt,
    waterfall,
    waterfallLipFoam,
    confluence,
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

function applySnowmeltChannels(height, x, z) {
  let nextHeight = height;

  for (const samples of snowmeltSamples) {
    const frame = getPathFrame(samples, x, z);

    if (!frame) continue;

    const lateralDistance = Math.abs(frame.lateral);
    if (lateralDistance > SNOWMELT_INFLUENCE) continue;

    const groove = 1 - smoothstep(0, SNOWMELT_WIDTH * 0.65, lateralDistance);
    nextHeight -= groove * SNOWMELT_CARVE_DEPTH;
  }

  return nextHeight;
}

function applyPlungePool(height, x, z) {
  const distance = new THREE.Vector2(x, z).distanceTo(PLUNGE_CENTER);

  if (distance > PLUNGE_RADIUS) return height;

  const poolMask = 1 - smoothstep(PLUNGE_RADIUS * 0.25, PLUNGE_RADIUS, distance);

  return Math.min(height, THREE.MathUtils.lerp(height, PLUNGE_FLOOR, poolMask));
}

function createLakeWater(terrain) {
  const geometry = createLakeGeometry(terrain);
  const lake = new THREE.Group();
  const surface = new THREE.Mesh(geometry, createLakeSurfaceMaterial());

  lake.name = 'AlpineLakeWater';
  surface.name = 'AlpineLakeSurface';
  surface.renderOrder = WATER_SURFACE_RENDER_ORDER;
  lake.add(surface);

  return lake;
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

function createOutletStream(terrain) {
  const geometry = createPathStripGeometry(
    outletCurve,
    terrain,
    OUTLET_WIDTH,
    90,
    10,
    (x, z, _t, terrain) => getOutletSurfaceHeight(terrain, x, z),
    (_x, _z, t) => smoothstep(0.08, 0.24, t),
  );
  const stream = new THREE.Mesh(geometry, createStreamMaterial({
    shallow: WATER_SHALLOW_COLOR,
    deep: WATER_DEEP_COLOR,
    foam: WATER_FOAM_COLOR,
    speed: 0.9,
    alpha: 0.48,
  }));

  stream.name = 'LakeOutletStream';
  stream.renderOrder = WATER_SURFACE_RENDER_ORDER;

  return stream;
}

function createSnowmeltGroup(terrain) {
  const group = new THREE.Group();
  group.name = 'SnowmeltSystem';

  for (let i = 0; i < snowmeltCurves.length; i += 1) {
    const geometry = createPathStripGeometry(
      snowmeltCurves[i],
      terrain,
      SNOWMELT_WIDTH,
      72,
      5,
      (x, z) => terrain.getHeightAt(x, z) + SNOWMELT_SURFACE_OFFSET,
      (x, z, t) => getSnowmeltWaterFade(x, z, t),
    );
    const mesh = new THREE.Mesh(geometry, createSnowmeltMaterial());

    mesh.name = `SnowmeltRunoff_${i + 1}`;
    mesh.renderOrder = WATER_SURFACE_RENDER_ORDER;
    group.add(mesh);
  }

  return group;
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

  for (const layer of WATERFALL_LAYERS) {
    const mesh = new THREE.Mesh(createWaterfallGeometry(layer, terrain), createWaterfallMaterial(layer));
    mesh.name = layer.name;
    mesh.renderOrder = 30;
    group.add(mesh);
  }

  group.add(createMistParticles());

  return group;
}

function createWaterfallLipFoam(terrain) {
  const geometry = createWaterfallLipFoamGeometry(terrain);
  const mesh = new THREE.Mesh(geometry, createWaterfallLipFoamMaterial());

  mesh.name = 'WaterfallLipFoam';
  mesh.renderOrder = 32;

  return mesh;
}

function createConfluenceFoam() {
  const geometry = createConfluenceFoamGeometry();
  const mesh = new THREE.Mesh(geometry, createFoamOverlayMaterial());
  mesh.name = 'WaterfallConfluenceFoam';
  mesh.renderOrder = 31;

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
  const start = new THREE.Vector3(PLUNGE_CENTER.x, 1.02, PLUNGE_CENTER.y);
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
) {
  const verticesPerRow = lateralSegments + 1;
  const positions = new Float32Array((longitudinalSegments + 1) * verticesPerRow * 3);
  const uvs = new Float32Array((longitudinalSegments + 1) * verticesPerRow * 2);
  const waterFades = new Float32Array((longitudinalSegments + 1) * verticesPerRow);
  const indices = new Uint32Array(longitudinalSegments * lateralSegments * 6);
  let positionOffset = 0;
  let uvOffset = 0;
  let fadeOffset = 0;

  for (let i = 0; i <= longitudinalSegments; i += 1) {
    const t = i / longitudinalSegments;
    const center = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const edgeNoise = Math.sin(i * 1.71) * 0.18 + Math.sin(i * 0.39) * 0.24;

    for (let j = 0; j <= lateralSegments; j += 1) {
      const lateralT = j / lateralSegments;
      const lateral = (lateralT - 0.5) * (width + edgeNoise);
      const x = center.x + side.x * lateral;
      const z = center.z + side.z * lateral;
      const y = getHeight(x, z, t, terrain);
      const fade = getFade(x, z, t, terrain);

      positions[positionOffset] = x;
      positions[positionOffset + 1] = y;
      positions[positionOffset + 2] = z;
      positionOffset += 3;

      uvs[uvOffset] = t * 8;
      uvs[uvOffset + 1] = lateralT;
      uvOffset += 2;

      waterFades[fadeOffset] = THREE.MathUtils.clamp(fade, 0, 1);
      fadeOffset += 1;
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
  geometry.setAttribute('waterFade', new THREE.BufferAttribute(waterFades, 1));
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

function getSnowmeltWaterFade(x, z, t) {
  const lake = getLakeFrame(x, z);
  const shoreFade = smoothstep(0.5, 9, lake.radius - lake.lakeRadius);
  const startFade = smoothstep(0.02, 0.1, t);
  const endpointFade = 1 - smoothstep(0.92, 1, t);

  return Math.min(shoreFade, startFade, endpointFade);
}

export function createLakeSurfaceMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
      uShallowColor: { value: new THREE.Color(WATER_SHALLOW_COLOR) },
      uDeepColor: { value: new THREE.Color(WATER_DEEP_COLOR) },
      uFoamColor: { value: new THREE.Color(WATER_FOAM_COLOR) },
      uReflectionColor: { value: new THREE.Color(WATER_REFLECTION_COLOR) },
      uHorizonReflectionColor: { value: new THREE.Color(WATER_HORIZON_REFLECTION_COLOR) },
      uBankReflectionColor: { value: new THREE.Color(WATER_BANK_REFLECTION_COLOR) },
      uSunReflectionColor: { value: new THREE.Color(WATER_SUN_REFLECTION_COLOR) },
      uSunDirection: { value: SUN_LIGHT_DIRECTION.clone().normalize() },
    },
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
        float amplitude = 0.5;
        for (int i = 0; i < 4; i += 1) {
          value += noise(p) * amplitude;
          p = p * 2.0 + vec2(6.7, -4.1);
          amplitude *= 0.5;
        }
        return value;
      }

      vec3 getWaterNormal(vec2 worldUv, float strength) {
        float broad = fbm(worldUv * 0.5 + vec2(uTime * 0.055, -uTime * 0.044));
        float rippleA = fbm(worldUv * 1.75 + vec2(-uTime * 0.32, uTime * 0.12));
        float rippleB = fbm(worldUv.yx * 2.25 + vec2(uTime * 0.2, -uTime * 0.22));
        vec2 slope = vec2(
          (broad - 0.5) * 0.075 + (rippleA - 0.5) * 0.105,
          (rippleB - 0.5) * 0.11
        ) * strength;

        return normalize(vec3(slope.x, 1.0, slope.y));
      }

      float getCaustics(vec2 worldUv) {
        vec2 driftA = worldUv * 0.55 + vec2(uTime * 0.055, -uTime * 0.028);
        vec2 driftB = worldUv * 0.78 + vec2(-uTime * 0.04, uTime * 0.036);
        float nA = fbm(driftA);
        float nB = fbm(driftB + vec2(nA * 0.65, -nA * 0.35));
        float ridges = 1.0 - abs(nA - nB) * 6.0;

        return smoothstep(0.74, 0.96, ridges);
      }

      float getSunGlint(vec2 worldPosition, vec2 sunDir) {
        vec2 sideDir = vec2(-sunDir.y, sunDir.x);
        vec2 bandUv = vec2(
          dot(worldPosition, sunDir) * 0.055 - uTime * 0.32,
          dot(worldPosition, sideDir) * 0.42 + sin(uTime * 0.23) * 0.28
        );
        float bands = smoothstep(0.58, 0.92, fbm(bandUv));
        float flecks = smoothstep(0.62, 0.9, fbm(worldPosition * 1.18 + sunDir * uTime * 0.58));
        float breakup = smoothstep(0.34, 0.78, fbm(worldPosition * 0.16 + vec2(uTime * 0.045, -uTime * 0.028)));

        return bands * max(flecks, 0.28) * breakup;
      }

      void main() {
        vec2 p = vWorldPosition.xz;
        float edgeNoise = fbm(p * 0.24 + vec2(uTime * 0.01, -uTime * 0.006)) - 0.5;
        float edgeAlpha = smoothstep(0.035, 0.23, vLakeEdge + edgeNoise * 0.045);
        float depthMask = smoothstep(0.65, 9.5, vLakeDepth);
        float basinCenter = smoothstep(0.12, 0.82, vLakeEdge);
        float deepMask = max(smoothstep(2.2, 12.0, vLakeDepth), basinCenter * 0.72);
        float shallowMask = 1.0 - smoothstep(0.8, 3.8, vLakeDepth);
        float windField = fbm(p * 0.035 + vec2(uTime * 0.035, -uTime * 0.018));
        float windSweep = sin(uTime * 0.38 + p.x * 0.018 + p.y * 0.011) * 0.18;
        float windPulse = smoothstep(0.62, 0.92, windField + windSweep);
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
        color = mix(color, uDeepColor * vec3(0.78, 0.94, 1.0), deepMask * 0.1);

        float surfaceRipple = fbm(p * 0.22 + vec2(-uTime * 0.085, uTime * 0.052));
        float fineRipple = fbm(p * 0.72 + vec2(uTime * 0.19, -uTime * 0.14));
        float windWrinkle = smoothstep(0.5, 0.9, fineRipple) * windMask;
        color *= mix(0.88, 1.12, surfaceRipple);
        color += uReflectionColor * smoothstep(0.54, 0.9, fineRipple) * edgeAlpha * (0.045 + windMask * 0.07);
        color += uHorizonReflectionColor * windWrinkle * edgeAlpha * 0.045;

        float caustics = getCaustics(p * 0.12);
        color += vec3(0.74, 0.96, 1.0) * caustics * shallowMask * vLakeBedVisibility * 0.13;

        vec3 skyReflection = mix(uHorizonReflectionColor, uReflectionColor, smoothstep(0.18, 0.92, normal.y));
        color = mix(color, skyReflection, 0.12 + reflectionMask * 0.3);
        float bankNoise = fbm(p * 0.18 + vec2(uTime * 0.018, -uTime * 0.012));
        float bankReflection = (1.0 - basinCenter) * edgeAlpha * smoothstep(0.32, 0.86, bankNoise);
        color = mix(color, uBankReflectionColor, bankReflection * 0.18);

        vec3 lightDir = normalize(uSunDirection);
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 120.0);
        float broadSpec = pow(max(dot(normal, halfDir), 0.0), 38.0);
        float sparkle = smoothstep(0.54, 0.9, fbm(p * 0.55 + vec2(-uTime * 0.28, uTime * 0.07)));
        vec3 reflectedSun = reflect(-lightDir, normal);
        float mirrorFacing = max(dot(reflectedSun, viewDir), 0.0);
        float sharpGlint = pow(mirrorFacing, 96.0);
        float broadGlint = pow(mirrorFacing, 20.0);
        vec2 sunDir2 = normalize(lightDir.xz + vec2(0.001, -0.001));
        float sunGlint = getSunGlint(p, sunDir2) * edgeAlpha * basinCenter;
        float sunGlintMask = smoothstep(0.08, 0.72, mirrorFacing) * (0.55 + reflectionMask * 0.45);
        color += uSunReflectionColor * (
          spec * sparkle * (0.4 + windMask * 0.28)
          + broadSpec * reflectionMask * (0.055 + windMask * 0.055)
          + sunGlint * sunGlintMask * (sharpGlint * 1.35 + broadGlint * 0.16) * (0.78 + windMask * 0.5)
        );

        float foamEdge = vLakeEdge + edgeNoise * 0.04;
        float foamStart = smoothstep(0.035, 0.095, foamEdge);
        float foamEnd = 1.0 - smoothstep(0.18, 0.31, foamEdge);
        float shoreBand = foamStart * foamEnd;
        float shallowFoamSupport = smoothstep(0.15, 1.15, vLakeDepth) * (1.0 - smoothstep(3.8, 8.0, vLakeDepth));
        float foamBreakup = smoothstep(0.38, 0.78, fbm(p * 0.08 + vec2(-uTime * 0.012, uTime * 0.007)));
        float foamDrift = fbm(p * 0.38 + vec2(-uTime * 0.12, uTime * 0.05));
        float foamCells = smoothstep(0.58, 0.88, fbm(p * 0.95 + vec2(uTime * 0.16, -uTime * 0.07) + foamDrift));
        float foamThreads = smoothstep(0.66, 0.92, fbm(p * 2.15 + vec2(-uTime * 0.22, uTime * 0.11) + edgeNoise));
        float shoreFoam = shoreBand * shallowFoamSupport * foamBreakup * max(foamCells * 0.72, foamThreads * 0.36);
        color = mix(color, uFoamColor, shoreFoam * 0.56);

        float alpha = edgeAlpha * mix(0.12, 0.48, max(depthMask, basinCenter * 0.74));
        alpha = max(alpha, reflectionMask * 0.24 * edgeAlpha);
        alpha = max(alpha, shoreFoam * 0.28);

        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function createStreamMaterial(options) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
      uShallowColor: { value: new THREE.Color(options.shallow) },
      uDeepColor: { value: new THREE.Color(options.deep) },
      uFoamColor: { value: new THREE.Color(options.foam) },
      uReflectionColor: { value: new THREE.Color(WATER_REFLECTION_COLOR) },
      uHorizonReflectionColor: { value: new THREE.Color(WATER_HORIZON_REFLECTION_COLOR) },
      uBankReflectionColor: { value: new THREE.Color(WATER_BANK_REFLECTION_COLOR) },
      uSunReflectionColor: { value: new THREE.Color(WATER_SUN_REFLECTION_COLOR) },
      uSunDirection: { value: SUN_LIGHT_DIRECTION.clone().normalize() },
      uFlowSpeed: { value: options.speed },
      uBaseAlpha: { value: options.alpha },
      uFoamStrength: { value: options.foamStrength ?? 1 },
    },
    vertexShader: `
      attribute float waterFade;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vWaterFade;

      void main() {
        vUv = uv;
        vWaterFade = waterFade;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uFlowSpeed;
      uniform float uBaseAlpha;
      uniform float uFoamStrength;
      uniform vec3 uShallowColor;
      uniform vec3 uDeepColor;
      uniform vec3 uFoamColor;
      uniform vec3 uReflectionColor;
      uniform vec3 uHorizonReflectionColor;
      uniform vec3 uBankReflectionColor;
      uniform vec3 uSunReflectionColor;
      uniform vec3 uSunDirection;
      uniform vec3 uCameraPosition;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vWaterFade;

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
        float amplitude = 0.5;
        for (int i = 0; i < 4; i += 1) {
          value += noise(p) * amplitude;
          p = p * 2.03 + vec2(11.7, 4.8);
          amplitude *= 0.5;
        }
        return value;
      }

      vec3 getWaterNormal(vec2 flowUv, vec2 worldUv, float strength) {
        float broad = fbm(worldUv * 0.5 + vec2(-uTime * 0.03, uTime * 0.012));
        float rippleA = fbm(flowUv * vec2(1.25, 1.9) + vec2(-uTime * 0.18, 0.05));
        float rippleB = fbm((flowUv.yx + worldUv * 0.18) * vec2(1.7, 1.0) + vec2(uTime * 0.1, -uTime * 0.08));
        vec2 slope = vec2(
          (broad - 0.5) * 0.032 + (rippleA - 0.5) * 0.07,
          (rippleB - 0.5) * 0.075
        ) * strength;

        return normalize(vec3(slope.x, 1.0, slope.y));
      }

      void main() {
        float edge = min(vUv.y, 1.0 - vUv.y);
        float center = smoothstep(0.03, 0.45, edge);
        vec2 flowUv = vec2(vUv.x - uTime * uFlowSpeed, vUv.y);
        float lipFade = smoothstep(6.9, 8.0, vUv.x);
        float lipAlpha = 1.0 - smoothstep(7.45, 8.0, vUv.x);
        float streak = smoothstep(0.46, 0.88, fbm(flowUv * vec2(7.5, 26.0)));
        float foamEdge = (1.0 - smoothstep(0.018, 0.12, edge)) * smoothstep(0.46, 0.9, fbm(flowUv * vec2(16.0, 58.0))) * vWaterFade;
        vec3 color = mix(uShallowColor, uDeepColor, center);
        vec3 normal = getWaterNormal(flowUv, vWorldPosition.xz * 0.18, mix(0.58, 1.0, center));
        vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);
        vec3 skyReflection = mix(uHorizonReflectionColor, uReflectionColor, smoothstep(0.18, 0.92, normal.y));
        color = mix(color, skyReflection, 0.12 + fresnel * 0.32);
        float bankNoise = fbm(vWorldPosition.xz * 0.18 + vec2(uTime * 0.018, -uTime * 0.012));
        float bankReflection = (1.0 - center) * smoothstep(0.32, 0.86, bankNoise);
        color = mix(color, uBankReflectionColor, bankReflection * 0.14);

        vec3 lightDir = normalize(uSunDirection);
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 110.0);
        float sparkle = smoothstep(0.52, 0.9, fbm(vWorldPosition.xz * 0.82 + vec2(-uTime * 0.34, uTime * 0.06)));
        color += uSunReflectionColor * spec * sparkle * 0.46;
        color = mix(color, uFoamColor, max(foamEdge * 0.5, streak * 0.1 * vWaterFade) * uFoamStrength);
        color = mix(color, uFoamColor, lipFade * (0.28 + streak * 0.22));
        float alpha = uBaseAlpha * smoothstep(0.012, 0.16, edge);
        alpha = max(alpha, fresnel * 0.22 * smoothstep(0.04, 0.2, edge));
        alpha = max(alpha, foamEdge * 0.18 * uFoamStrength);
        alpha *= vWaterFade * mix(1.0, 0.42, lipFade) * lipAlpha;

        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function createSnowmeltMaterial() {
  return createStreamMaterial({
    shallow: WATER_SHALLOW_COLOR,
    deep: WATER_DEEP_COLOR,
    foam: WATER_FOAM_COLOR,
    speed: 0.5,
    alpha: 0.34,
    foamStrength: 0.38,
  });
}

function createWaterfallMaterial(layer) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
      uLayerAlpha: { value: layer.alpha },
      uFallSpeed: { value: layer.speed },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uLayerAlpha;
      uniform float uFallSpeed;
      uniform vec3 uCameraPosition;

      varying vec2 vUv;
      varying vec3 vWorldPosition;

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
        float amplitude = 0.5;
        for (int i = 0; i < 4; i += 1) {
          value += noise(p) * amplitude;
          p = p * 2.05 + vec2(8.1, -3.2);
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        float edge = smoothstep(0.0, 0.16, vUv.x) * (1.0 - smoothstep(0.84, 1.0, vUv.x));
        float fallUv = vUv.y * 6.0 - uTime * uFallSpeed * 2.4;
        float longStreak = smoothstep(0.42, 0.86, fbm(vec2(vUv.x * 12.0, fallUv * 1.8)));
        float fineStreak = smoothstep(0.56, 0.92, fbm(vec2(vUv.x * 38.0 + 3.0, fallUv * 3.2)));
        float lowerBreakup = smoothstep(0.35, 1.0, vUv.y);
        float broken = mix(1.0, smoothstep(0.26, 0.78, fbm(vec2(vUv.x * 7.0 + uTime * 0.25, vUv.y * 9.0))), lowerBreakup);
        vec3 color = mix(vec3(0.3, 0.62, 0.76), vec3(0.72, 0.9, 0.94), max(longStreak, fineStreak * 0.85));
        float alpha = edge * broken * uLayerAlpha * mix(0.42, 1.0, max(longStreak, fineStreak));
        alpha += smoothstep(0.78, 1.0, vUv.y) * fineStreak * 0.012;

        gl_FragColor = vec4(color, alpha);
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
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;

      varying vec2 vUv;

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

      void main() {
        float lateral = abs(vUv.y - 0.5) * 2.0;
        float startFade = smoothstep(0.04, 0.24, vUv.x);
        float tailFade = 1.0 - smoothstep(0.62, 1.0, vUv.x);
        float lateralFade = 1.0 - smoothstep(0.58, 1.0, lateral);
        float center = 1.0 - smoothstep(0.12, 0.76, lateral);
        float broken = smoothstep(0.36, 0.86, noise(vUv * vec2(16.0, 24.0) + vec2(-uTime * 0.32, uTime * 0.08)));
        float threads = smoothstep(0.48, 0.9, noise(vUv * vec2(7.0, 48.0) + vec2(-uTime * 0.16, uTime * 0.22)));
        float impact = 1.0 - smoothstep(0.1, 0.42, vUv.x);
        float alpha = (impact * 0.035 + center * max(broken * 0.07, threads * 0.045)) * startFade * tailFade * lateralFade;

        gl_FragColor = vec4(vec3(0.68, 0.9, 0.96), alpha);
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
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;

      varying vec2 vUv;

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

      void main() {
        vec2 centered = vUv - vec2(0.5);
        float radial = 1.0 - smoothstep(0.18, 0.58, length(centered));
        float downstream = smoothstep(0.22, 0.72, vUv.y);
        float broken = smoothstep(0.36, 0.82, noise(vUv * vec2(18.0, 11.0) + vec2(-uTime * 0.3, uTime * 0.08)));
        float fine = smoothstep(0.52, 0.9, noise(vUv * vec2(42.0, 24.0) + vec2(uTime * 0.18, -uTime * 0.13)));
        float alpha = radial * mix(0.035, 0.17, max(broken, fine * 0.62)) * mix(0.65, 1.0, downstream);
        vec3 color = mix(vec3(0.48, 0.84, 0.92), vec3(0.82, 0.95, 0.97), max(broken, downstream));

        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function createMistParticles() {
  const count = 54;
  const positions = new Float32Array(count * 3);
  const randoms = new Float32Array(count);
  const outflow = new THREE.Vector3(PLUNGE_OUTFLOW_DIRECTION.x, 0, PLUNGE_OUTFLOW_DIRECTION.y);
  const side = new THREE.Vector3(-outflow.z, 0, outflow.x);

  for (let i = 0; i < count; i += 1) {
    const r = pseudoRandom(i * 12.2);
    const lateral = (pseudoRandom(i * 4.7) - 0.5) * 3.4;
    const downstream = pseudoRandom(i * 9.3) * 5.6 - 1.0;
    const lift = pseudoRandom(i * 2.1) * 9.2;
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
    uniforms: {
      uTime: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
    },
    vertexShader: `
      uniform float uTime;

      attribute float randomSeed;

      varying float vAlpha;

      void main() {
        vec3 animated = position;
        animated.x += sin(uTime * 0.7 + randomSeed * 11.0) * 0.32;
        animated.y += fract(uTime * 0.08 + randomSeed) * 2.1;
        animated.z += cos(uTime * 0.62 + randomSeed * 9.0) * 0.28;
        vec4 mvPosition = modelViewMatrix * vec4(animated, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = (8.0 + randomSeed * 9.0) * (300.0 / -mvPosition.z);
        vAlpha = 0.004 + randomSeed * 0.01;
      }
    `,
    fragmentShader: `
      varying float vAlpha;

      void main() {
        vec2 centered = gl_PointCoord - vec2(0.5);
        float d = length(centered);
        float alpha = (1.0 - smoothstep(0.12, 0.5, d)) * vAlpha;
        gl_FragColor = vec4(0.72, 0.92, 0.98, alpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'WaterfallMistParticles';
  points.renderOrder = 34;

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

function getClosestSnowmeltFrame(x, z) {
  let closest = null;

  for (const samples of snowmeltSamples) {
    const frame = getPathFrame(samples, x, z);

    if (!frame) continue;
    if (!closest || Math.abs(frame.lateral) < Math.abs(closest.lateral)) {
      closest = frame;
    }
  }

  return closest;
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
  object.traverse((child) => {
    if (!child.material?.uniforms) return;

    if (child.material.uniforms.uTime) {
      child.material.uniforms.uTime.value = elapsedTime;
    }
    if (child.material.uniforms.uCameraPosition) {
      child.material.uniforms.uCameraPosition.value.copy(camera.position);
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
