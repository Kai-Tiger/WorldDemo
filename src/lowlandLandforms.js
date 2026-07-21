import * as THREE from 'three';
import {
  compileRiverNetwork,
  getNearestRiverReach,
  getRiverNetworkGrassAcceptance,
  isInRiverNetworkVegetationExclusion,
} from './hydrology/riverNetwork.js';
import {
  LOWLAND_HILLS as BAKED_LOWLAND_HILLS,
  LOWLAND_LAKES as BAKED_LOWLAND_LAKES,
  LOWLAND_STREAM_DEFINITION as BAKED_LOWLAND_STREAM_DEFINITION,
  LOWLAND_STREAM_DEFINITIONS as BAKED_LOWLAND_STREAM_DEFINITIONS,
  LOWLAND_STREAM_PLAN as BAKED_LOWLAND_STREAM_PLAN,
  HERO_RIVER_NETWORK_DEFINITION,
  SOUTHERN_LOWLAND_LAKES,
  TERMINAL_LOWLAND_LAKE,
  getTerminalLowlandLakeInletFade,
} from './lowlandHeightPlan.js';
import {
  getLakeBoundaryFrame,
  getLakeBoundaryRadius,
  getLakeOutsideFade,
  getLakesOutsideFade,
} from './lakeBoundary.js';

const LOWLAND_FEATURE_SEGMENTS = 256;
const LAKE_ANGLE_SEGMENTS = 72;
const LAKE_RADIAL_RINGS = 12;

export const LOWLAND_HILLS = BAKED_LOWLAND_HILLS;
export const LOWLAND_LAKES = BAKED_LOWLAND_LAKES;
export const LOWLAND_STREAM_DEFINITION = BAKED_LOWLAND_STREAM_DEFINITION;
export const LOWLAND_STREAM_DEFINITIONS = BAKED_LOWLAND_STREAM_DEFINITIONS;
export const LOWLAND_STREAM_PLAN = BAKED_LOWLAND_STREAM_PLAN;
export const LOWLAND_STREAM_NETWORKS = Object.freeze(
  LOWLAND_STREAM_DEFINITIONS.map((definition) => compileRiverNetwork(definition)),
);
export const LOWLAND_STREAM_NETWORK = LOWLAND_STREAM_NETWORKS[0];

const heroRiverNetwork = compileRiverNetwork(HERO_RIVER_NETWORK_DEFINITION);
const streamDetailBounds = createStreamDetailBounds([
  ...LOWLAND_STREAM_NETWORKS,
  heroRiverNetwork,
]);
const lakeDetailBounds = LOWLAND_LAKES.map(createLakeBounds);
const streamTransitionLakes = [
  TERMINAL_LOWLAND_LAKE,
  ...LOWLAND_LAKES,
  ...SOUTHERN_LOWLAND_LAKES,
];

export function applyLowlandHillsTerrain(baseHeight, x, z) {
  return baseHeight;
}

export function applyLowlandWaterTerrain(baseHeight, x, z) {
  return baseHeight;
}

export function applyLowlandMacroTerrain(baseHeight, x, z) {
  return baseHeight;
}

export function getLowlandMaterialFrame(x, z) {
  let bedMask = 0;
  let wetMask = 0;
  let lakeBedMask = 0;

  for (const network of LOWLAND_STREAM_NETWORKS) {
    const reach = getNearestRiverReach(x, z, 16, network);

    if (reach && reach.distance <= reach.influence) {
      const wetOuter = Math.min(reach.influence, reach.halfWidth + 3);
      const inletFade = getLowlandStreamLakeFade(x, z);

      bedMask = Math.max(
        bedMask,
        (
          1 - smoothstep(reach.halfWidth * 0.58, reach.halfWidth, reach.distance)
        ) * inletFade,
      );
      wetMask = Math.max(
        wetMask,
        (
          1 - smoothstep(reach.halfWidth * 0.82, wetOuter, reach.distance)
        ) * 0.72 * inletFade,
      );
    }
  }

  const riverWetMask = wetMask;

  for (const lake of LOWLAND_LAKES) {
    const frame = getLakeBoundaryFrame(lake, x, z);
    const currentBedMask = 1 - smoothstep(-1, 0.35, frame.signedDistance);
    const innerWet = smoothstep(-5, -0.8, frame.signedDistance)
      * (1 - smoothstep(-0.8, 0.15, frame.signedDistance));
    const outerWet = frame.signedDistance > 0
      ? 1 - smoothstep(0, lake.shoreWidth, frame.signedDistance)
      : 0;

    lakeBedMask = Math.max(lakeBedMask, currentBedMask);
    wetMask = Math.max(wetMask, innerWet * 0.72, outerWet);
  }

  return {
    bedMask: THREE.MathUtils.clamp(bedMask, 0, 1),
    wetMask: THREE.MathUtils.clamp(wetMask, 0, 1),
    lakeBedMask: THREE.MathUtils.clamp(lakeBedMask, 0, 1),
    riverWetMask: THREE.MathUtils.clamp(riverWetMask, 0, 1),
  };
}

export function isInLowlandVegetationExclusion(x, z, buffer = 0) {
  for (const network of LOWLAND_STREAM_NETWORKS) {
    if (isInRiverNetworkVegetationExclusion(x, z, buffer, network)) return true;
  }

  for (const lake of LOWLAND_LAKES) {
    const frame = getLakeBoundaryFrame(lake, x, z);

    if (frame.signedDistance <= lake.shoreWidth + buffer) return true;
  }

  return false;
}

export function getLowlandStreamGrassAcceptance(x, z) {
  for (const lake of streamTransitionLakes) {
    if (getLakeBoundaryFrame(lake, x, z).signedDistance <= lake.shoreWidth + 4) return 0;
  }

  let acceptance = 1;

  for (const network of LOWLAND_STREAM_NETWORKS) {
    acceptance = Math.min(
      acceptance,
      getRiverNetworkGrassAcceptance(x, z, network),
    );
  }

  return acceptance;
}

export function getLowlandMinimumSegmentsForBounds(bounds) {
  if (streamDetailBounds.some((feature) => boundsIntersect(bounds, feature))) {
    return LOWLAND_FEATURE_SEGMENTS;
  }
  if (lakeDetailBounds.some((feature) => boundsIntersect(bounds, feature))) {
    return LOWLAND_FEATURE_SEGMENTS;
  }

  return 0;
}

export function getLowlandTerminalInletFade(x, z) {
  return getTerminalLowlandLakeInletFade(x, z);
}

export function getLowlandLakeOutletFade(x, z) {
  return getLakeOutsideFade(LOWLAND_LAKES[0], x, z);
}

export function getLowlandStreamLakeFade(x, z) {
  return getLakesOutsideFade(streamTransitionLakes, x, z);
}

export function createLowlandLakeGeometry(lake, terrain) {
  const angleSegments = lake.angularSegments ?? LAKE_ANGLE_SEGMENTS;
  const vertexCount = 1 + LAKE_RADIAL_RINGS * angleSegments;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const lakeDepths = new Float32Array(vertexCount);
  const lakeEdges = new Float32Array(vertexCount);
  const lakeBedVisibilities = new Float32Array(vertexCount);
  const indices = [];

  writeLakeVertex(
    positions,
    uvs,
    lakeDepths,
    lakeEdges,
    lakeBedVisibilities,
    0,
    lake,
    terrain,
    lake.cx,
    lake.cz,
    0,
  );

  for (let ring = 1; ring <= LAKE_RADIAL_RINGS; ring += 1) {
    const radiusT = ring / LAKE_RADIAL_RINGS;

    for (let segment = 0; segment < angleSegments; segment += 1) {
      const angle = segment / angleSegments * Math.PI * 2;
      const radialPoint = rotateLocalPoint(
        lake,
        Math.cos(angle) * lake.radiusX,
        Math.sin(angle) * lake.radiusZ,
      );
      const worldAngle = Math.atan2(radialPoint.z - lake.cz, radialPoint.x - lake.cx);
      const boundaryRadius = getLakeBoundaryRadius(lake, worldAngle) * radiusT;
      const world = {
        x: lake.cx + Math.cos(worldAngle) * boundaryRadius,
        z: lake.cz + Math.sin(worldAngle) * boundaryRadius,
      };
      const vertex = 1 + (ring - 1) * angleSegments + segment;

      writeLakeVertex(
        positions,
        uvs,
        lakeDepths,
        lakeEdges,
        lakeBedVisibilities,
        vertex,
        lake,
        terrain,
        world.x,
        world.z,
        radiusT,
      );
    }
  }

  for (let ring = 0; ring < LAKE_RADIAL_RINGS; ring += 1) {
    for (let segment = 0; segment < angleSegments; segment += 1) {
      const current = 1 + ring * angleSegments + segment;
      const next = 1 + ring * angleSegments
        + (segment + 1) % angleSegments;
      const currentInner = ring === 0
        ? 0
        : 1 + (ring - 1) * angleSegments + segment;
      const nextInner = ring === 0
        ? 0
        : 1 + (ring - 1) * angleSegments
          + (segment + 1) % angleSegments;

      if (ring === 0) indices.push(0, next, current);
      else {
        indices.push(currentInner, nextInner, current);
        indices.push(nextInner, next, current);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('lakeDepth', new THREE.BufferAttribute(lakeDepths, 1));
  geometry.setAttribute('lakeEdge', new THREE.BufferAttribute(lakeEdges, 1));
  geometry.setAttribute('lakeBedVisibility', new THREE.BufferAttribute(lakeBedVisibilities, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.userData.lowlandLakeId = lake.id;

  return geometry;
}

function toLocalPoint(feature, x, z) {
  const dx = x - feature.cx;
  const dz = z - feature.cz;
  const cosine = Math.cos(feature.rotation ?? 0);
  const sine = Math.sin(feature.rotation ?? 0);

  return {
    x: dx * cosine + dz * sine,
    z: -dx * sine + dz * cosine,
  };
}

function rotateLocalPoint(feature, localX, localZ) {
  const cosine = Math.cos(feature.rotation);
  const sine = Math.sin(feature.rotation);

  return {
    x: feature.cx + localX * cosine - localZ * sine,
    z: feature.cz + localX * sine + localZ * cosine,
  };
}

function writeLakeVertex(
  positions,
  uvs,
  lakeDepths,
  lakeEdges,
  lakeBedVisibilities,
  vertex,
  lake,
  terrain,
  x,
  z,
  radiusT,
) {
  const positionOffset = vertex * 3;
  const uvOffset = vertex * 2;
  const local = toLocalPoint(lake, x, z);
  const depth = Math.max(lake.waterLevel - terrain.getHeightAt(x, z), 0);

  positions[positionOffset] = x;
  positions[positionOffset + 1] = lake.waterLevel + lake.surfaceOffset;
  positions[positionOffset + 2] = z;
  uvs[uvOffset] = local.x / (lake.radiusX * 2) + 0.5;
  uvs[uvOffset + 1] = local.z / (lake.radiusZ * 2) + 0.5;
  lakeDepths[vertex] = depth;
  lakeEdges[vertex] = 1 - radiusT;
  lakeBedVisibilities[vertex] = THREE.MathUtils.clamp(
    1 - smoothstep(1.4, 8.5, depth),
    0,
    1,
  );
}

function createStreamDetailBounds(networks) {
  const bounds = [];

  for (const network of networks) {
    for (const reach of network.reaches) {
      for (let index = 0; index < reach.samples.length - 1; index += 1) {
        const start = reach.samples[index];
        const end = reach.samples[index + 1];
        const padding = Math.max(start.influence, end.influence);

        bounds.push({
          minX: Math.min(start.point.x, end.point.x) - padding,
          maxX: Math.max(start.point.x, end.point.x) + padding,
          minZ: Math.min(start.point.z, end.point.z) - padding,
          maxZ: Math.max(start.point.z, end.point.z) + padding,
        });
      }
    }
  }

  return bounds;
}

function createLakeBounds(lake) {
  const radius = Math.max(lake.radiusX, lake.radiusZ)
    * (1 + lake.shapeAmp)
    + lake.shoreWidth;

  return {
    minX: lake.cx - radius,
    maxX: lake.cx + radius,
    minZ: lake.cz - radius,
    maxZ: lake.cz + radius,
  };
}

function boundsIntersect(a, b) {
  return a.minX <= b.maxX
    && a.maxX >= b.minX
    && a.minZ <= b.maxZ
    && a.maxZ >= b.minZ;
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;

  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}
