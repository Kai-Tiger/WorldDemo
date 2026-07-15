import * as THREE from 'three';

const SPATIAL_CELL_SIZE = 64;
const DEFAULT_INNER_HALF_WIDTH = 4;
const DEFAULT_OUTER_HALF_WIDTH = 22;
const MOUNTAIN_PASS_INNER_HALF_WIDTH = 3;
const MOUNTAIN_PASS_OUTER_HALF_WIDTH = 18;
const TRAIL_HALF_WIDTH = 1.6;
const TRAIL_EDGE_SOFTNESS = 0.42;
const TRAIL_EDGE_NOISE = 0.35;
const TREE_EXCLUSION_HALF_WIDTH = 4;
const SUMMIT_INNER_RADIUS = 3;
const SUMMIT_OUTER_RADIUS = 14;
const SUMMIT_ROUTE_PLATEAU_LENGTH = 3;
const STANDARD_TRAIL_SEGMENTS = 128;
const HIGH_DETAIL_TRAIL_SEGMENTS = 256;

function point(x, z, height) {
  return Object.freeze({ x, z, height });
}

function route(id, name, points, options = {}) {
  return Object.freeze({
    id,
    name,
    points: Object.freeze(points),
    innerHalfWidth: options.innerHalfWidth ?? DEFAULT_INNER_HALF_WIDTH,
    outerHalfWidth: options.outerHalfWidth ?? DEFAULT_OUTER_HALF_WIDTH,
    minimumSegments: options.minimumSegments ?? STANDARD_TRAIL_SEGMENTS,
  });
}

const WEST_START_TO_HIGHEST = [
  point(-217, -364, 124),
  point(-208, -352, 120),
  point(-192, -352, 116),
  point(-176, -368, 112),
  point(-160, -384, 120),
  point(-160, -400, 128),
  point(-160, -416, 136),
  point(-160, -432, 140),
  point(-160, -448, 142),
  point(-176, -464, 136),
  point(-192, -480, 144),
  point(-208, -496, 158),
  point(-224, -496, 166),
  point(-240, -496, 174),
  point(-256, -480, 188),
  point(-272, -464, 202),
  point(-272, -448, 210),
  point(-256, -432, 220),
  point(-256, -416, 228),
  point(-272, -400, 242),
  point(-288, -416, 256),
  point(-304, -432, 270),
  point(-320, -432, 278),
  point(-344, -420, 294),
  point(-337, -412, 297),
];

const HIGHEST_TO_SOUTHWEST = [
  point(-337, -412, 297),
  point(-336, -396, 288),
  point(-348, -384, 278),
  point(-348, -372, 272),
  point(-360, -360, 262),
  point(-372, -360, 256),
  point(-384, -360, 250),
  point(-396, -360, 246),
  point(-408, -360, 246),
  point(-420, -360, 240),
  point(-432, -372, 230),
  point(-444, -384, 220),
  point(-456, -396, 210),
  point(-468, -408, 218),
  point(-480, -420, 228),
  point(-480, -432, 226),
  point(-492, -444, 236),
  point(-504, -444, 242),
  point(-516, -444, 238),
  point(-528, -432, 242),
  point(-540, -420, 238),
  point(-540, -408, 232),
  point(-552, -396, 240),
  point(-552, -384, 246),
  point(-552, -372, 252),
  point(-564, -360, 262),
  point(-576, -348, 266),
  point(-588, -348, 272),
  point(-575, -359, 281),
];

const SOUTHWEST_JUNCTION_TO_NORTHWEST = [
  point(-480, -432, 226),
  point(-480, -416, 228),
  point(-464, -400, 214),
  point(-464, -384, 212),
  point(-464, -368, 220),
  point(-448, -352, 214),
  point(-432, -336, 214),
  point(-416, -320, 228),
  point(-400, -304, 242),
  point(-384, -288, 242),
  point(-368, -272, 228),
  point(-352, -256, 220),
  point(-336, -240, 226),
  point(-336, -224, 218),
  point(-336, -208, 210),
  point(-336, -192, 206),
  point(-336, -176, 198),
  point(-336, -160, 190),
  point(-336, -144, 182),
  point(-336, -128, 174),
  point(-336, -112, 182),
  point(-336, -96, 190),
  point(-336, -80, 188),
  point(-336, -64, 184),
  point(-336, -48, 178),
  point(-336, -32, 176),
  point(-352, -16, 190),
  point(-352, 0, 198),
  point(-352, 16, 206),
  point(-352, 32, 214),
  point(-352, 48, 214),
  point(-352, 64, 210),
  point(-352, 80, 218),
  point(-352, 96, 216),
  point(-336, 112, 228),
  point(-320, 128, 233),
  point(-311, 130, 237),
];

const NORTHWEST_TO_CENTRAL = [
  point(-311, 130, 237),
  point(-320, 128, 233),
  point(-336, 112, 226),
  point(-336, 96, 220),
  point(-336, 80, 216),
  point(-336, 64, 216),
  point(-336, 48, 212),
  point(-320, 32, 208),
  point(-304, 16, 200),
  point(-288, 0, 190),
  point(-272, -16, 188),
  point(-256, -32, 180),
  point(-240, -48, 170),
  point(-224, -48, 164),
  point(-208, -48, 160),
  point(-192, -48, 156),
  point(-176, -48, 152),
  point(-160, -48, 150),
  point(-144, -48, 146),
  point(-128, -48, 146),
  point(-112, -48, 148),
  point(-96, -64, 162),
  point(-80, -80, 176),
  point(-80, -96, 174),
  point(-80, -112, 174),
  point(-80, -128, 180),
  point(-80, -144, 182),
  point(-80, -160, 186),
  point(-80, -176, 192),
  point(-64, -192, 202),
  point(-48, -192, 210),
  point(-32, -192, 218),
  point(-16, -192, 223),
  point(-7, -175, 232),
];

const MOUNTAIN_WEST_LOOP_POINTS = [
  ...WEST_START_TO_HIGHEST,
  ...HIGHEST_TO_SOUTHWEST.slice(1),
  ...HIGHEST_TO_SOUTHWEST.slice(15, -1).reverse(),
  ...SOUTHWEST_JUNCTION_TO_NORTHWEST.slice(1),
  ...NORTHWEST_TO_CENTRAL.slice(1),
];

const SOUTH_SUMMIT_SPUR = [
  point(-32, -593, 128),
  point(-40, -600, 134),
  point(-40, -608, 138),
  point(-48, -624, 148),
  point(-64, -640, 162),
  point(-80, -656, 176),
  point(-64, -672, 186),
  point(-48, -688, 192),
  point(-32, -688, 196),
  point(-16, -704, 204),
  point(0, -720, 218),
  point(-16, -736, 220),
  point(-32, -752, 222),
  point(-48, -752, 230),
  point(-64, -736, 240),
  point(-80, -720, 242),
  point(-96, -704, 242),
  point(-112, -688, 248),
  point(-128, -688, 254),
  point(-144, -704, 264),
  point(-160, -704, 272),
  point(-160, -688, 270),
  point(-144, -672, 282),
  point(-140, -652, 288),
  point(-153, -665, 295),
];

const SOUTH_TO_HIGHEST = [
  point(-32, -593, 128),
  point(-40, -600, 134),
  point(-40, -608, 138),
  point(-48, -600, 144),
  point(-48, -592, 148),
  point(-56, -584, 154),
  point(-64, -584, 156),
  point(-72, -584, 156),
  point(-80, -584, 160),
  point(-88, -584, 164),
  point(-96, -584, 168),
  point(-104, -592, 174),
  point(-112, -592, 172),
  point(-120, -592, 176),
  point(-128, -600, 182),
  point(-136, -608, 187),
  point(-144, -616, 188),
  point(-152, -616, 190),
  point(-160, -616, 194),
  point(-168, -608, 200),
  point(-176, -600, 203),
  point(-184, -592, 197),
  point(-192, -592, 201),
  point(-200, -592, 204),
  point(-208, -584, 207),
  point(-216, -576, 207),
  point(-224, -576, 207),
  point(-232, -576, 211),
  point(-240, -584, 217),
  point(-248, -584, 221),
  point(-256, -576, 227),
  point(-256, -568, 231),
  point(-256, -560, 235),
  point(-256, -552, 237),
  point(-256, -544, 239),
  point(-256, -536, 239),
  point(-264, -528, 242),
  point(-272, -520, 246),
  point(-280, -512, 248),
  point(-280, -504, 248),
  point(-280, -496, 252),
  point(-288, -488, 254),
  point(-296, -480, 255),
  point(-296, -472, 256),
  point(-304, -464, 256),
  point(-312, -456, 261),
  point(-312, -448, 263),
  point(-312, -440, 264),
  point(-304, -432, 270),
  point(-320, -432, 278),
  point(-344, -420, 294),
  point(-337, -412, 297),
];

const MOUNTAIN_SOUTH_LOOP_POINTS = [
  ...SOUTH_SUMMIT_SPUR,
  ...SOUTH_SUMMIT_SPUR.slice(0, -1).reverse(),
  ...SOUTH_TO_HIGHEST.slice(1),
];

export const MOUNTAIN_TRAIL_ROUTES = Object.freeze([
  route('mountain-pass', 'Lowland Mountain Pass', [
    point(444, -380, 0),
    point(432, -382, 2),
    point(427, -378, 5),
    point(421, -370, 10),
    point(412, -368, 16),
    point(401, -356, 23),
    point(389, -345, 28),
  ], {
    innerHalfWidth: MOUNTAIN_PASS_INNER_HALF_WIDTH,
    outerHalfWidth: MOUNTAIN_PASS_OUTER_HALF_WIDTH,
    minimumSegments: HIGH_DETAIL_TRAIL_SEGMENTS,
  }),
  route('mountain-east', 'East Ridge Trail', [
    point(260, -81, 120),
    point(260, -60, 132),
    point(280, -40, 148),
    point(280, -20, 160),
    point(260, -20, 158),
    point(240, -40, 174),
    point(220, -60, 190),
    point(200, -60, 202),
    point(180, -80, 216),
    point(160, -60, 232),
    point(163, -78, 240),
    point(160, -60, 232),
    point(180, -80, 216),
    point(176, -96, 214),
    point(160, -112, 206),
    point(144, -112, 198),
    point(128, -112, 190),
    point(112, -112, 182),
    point(96, -96, 172),
    point(80, -96, 166),
    point(64, -96, 162),
    point(48, -96, 162),
    point(32, -96, 166),
    point(16, -96, 166),
    point(0, -112, 172),
    point(-16, -128, 174),
    point(-32, -144, 178),
    point(-48, -160, 186),
    point(-64, -176, 194),
    point(-64, -192, 202),
    point(-48, -192, 210),
    point(-32, -192, 218),
    point(-16, -192, 223),
    point(-7, -175, 232),
  ]),
  route('mountain-west-loop', 'Central-West Mountain Loop', MOUNTAIN_WEST_LOOP_POINTS),
  route('mountain-south-loop', 'Southern Mountain Loop', MOUNTAIN_SOUTH_LOOP_POINTS),
]);

export const MOUNTAIN_TRAIL_SUMMITS = Object.freeze([
  Object.freeze({ id: 'highest', name: 'Highest Summit', ...point(-337, -412, 297) }),
  Object.freeze({ id: 'south', name: 'South Summit', ...point(-153, -665, 295) }),
  Object.freeze({ id: 'southwest', name: 'Southwest Summit', ...point(-575, -359, 281) }),
  Object.freeze({ id: 'east', name: 'East Summit', ...point(163, -78, 240) }),
  Object.freeze({ id: 'northwest', name: 'Northwest Summit', ...point(-311, 130, 237) }),
  Object.freeze({ id: 'central', name: 'Central Summit', ...point(-7, -175, 232) }),
]);

const trailRuntime = createTrailRuntime(MOUNTAIN_TRAIL_ROUTES);

export function applyMountainTrailTerrain(baseHeight, x, z) {
  const deformation = getMountainTrailTerrainDeformation(baseHeight, x, z);
  const frame = deformation?.frame ?? null;
  const summit = getClosestSummitFrame(x, z);
  let height = deformation?.height ?? baseHeight;

  if (summit && summit.distance <= SUMMIT_OUTER_RADIUS) {
    const radialBlend = 1 - smoothstepRange(
      SUMMIT_INNER_RADIUS,
      SUMMIT_OUTER_RADIUS,
      summit.distance,
    );
    const coreBlend = 1 - smoothstepRange(
      SUMMIT_INNER_RADIUS,
      SUMMIT_INNER_RADIUS + 1,
      summit.distance,
    );
    const trailSuppression = frame
      ? smoothstepRange(
        frame.route.innerHalfWidth,
        frame.route.innerHalfWidth + 2,
        frame.distance,
      )
      : 1;
    const blend = Math.max(coreBlend, radialBlend * trailSuppression);

    height = THREE.MathUtils.lerp(height, summit.summit.height, blend);
  }

  return height;
}

function getMountainTrailTerrainDeformation(baseHeight, x, z) {
  const candidates = trailRuntime.spatialIndex.get(getSpatialKey(x, z));

  if (!candidates) return null;

  const candidateFrame = {};
  let nearestFrame = null;
  let weightedCorrection = 0;
  let totalWeight = 0;
  let maximumBlend = 0;

  for (const segmentIndex of candidates) {
    const segment = trailRuntime.segments[segmentIndex];

    getSegmentFrame(segment, x, z, candidateFrame);
    if (candidateFrame.distance > segment.route.outerHalfWidth) continue;

    if (!nearestFrame || candidateFrame.distanceSq < nearestFrame.distanceSq) {
      nearestFrame = { ...candidateFrame };
    }

    const blend = 1 - smoothstepRange(
      segment.route.innerHalfWidth,
      segment.route.outerHalfWidth,
      candidateFrame.distance,
    );

    if (blend <= 0) continue;

    const proximityWeight = 1 / (1 + candidateFrame.distanceSq);
    const weight = blend * proximityWeight;

    weightedCorrection += (candidateFrame.targetHeight - baseHeight) * weight;
    totalWeight += weight;
    maximumBlend = Math.max(maximumBlend, blend);
  }

  if (!nearestFrame || totalWeight <= 0) return null;

  return {
    frame: nearestFrame,
    height: baseHeight + weightedCorrection / totalWeight * maximumBlend,
  };
}

export function getMountainTrailFrame(x, z, target = {}) {
  const candidates = trailRuntime.spatialIndex.get(getSpatialKey(x, z));

  if (!candidates) return null;

  let closest = null;

  for (const segmentIndex of candidates) {
    const segment = trailRuntime.segments[segmentIndex];
    const frame = getSegmentFrame(segment, x, z, target);

    if (!closest || frame.distanceSq < closest.distanceSq) {
      closest = { ...frame };
    }
  }

  return closest;
}

export function getMountainTrailMaterialFrame(x, z, target = {}) {
  const frame = getMountainTrailFrame(x, z);
  const summit = getClosestSummitFrame(x, z);
  let mask = 0;

  if (frame) {
    const widthNoise = valueNoise(x * 0.12 + 17.3, z * 0.12 - 8.7)
      * TRAIL_EDGE_NOISE;
    const halfWidth = TRAIL_HALF_WIDTH + widthNoise;

    mask = 1 - smoothstepRange(
      halfWidth - TRAIL_EDGE_SOFTNESS,
      halfWidth + TRAIL_EDGE_SOFTNESS,
      frame.distance,
    );
  }

  if (summit) {
    const summitMask = 1 - smoothstepRange(
      SUMMIT_INNER_RADIUS,
      SUMMIT_INNER_RADIUS + 1.5,
      summit.distance,
    );

    mask = Math.max(mask, summitMask);
  }

  target.mask = THREE.MathUtils.clamp(mask, 0, 1);
  target.routeId = frame?.route.id ?? null;
  target.distance = frame?.distance ?? Infinity;
  return target;
}

export function getMountainTrailMaterialMask(x, z) {
  return getMountainTrailMaterialFrame(x, z).mask;
}

export function isInMountainTrailGrassExclusion(x, z) {
  const frame = getMountainTrailFrame(x, z);

  if (frame?.distance <= TRAIL_HALF_WIDTH) return true;
  return getClosestSummitFrame(x, z)?.distance <= SUMMIT_INNER_RADIUS;
}

export function isInMountainTrailTreeExclusion(x, z) {
  const frame = getMountainTrailFrame(x, z);

  if (frame?.distance <= TREE_EXCLUSION_HALF_WIDTH) return true;
  return getClosestSummitFrame(x, z)?.distance <= TREE_EXCLUSION_HALF_WIDTH;
}

export function getMountainTrailMinimumSegmentsForBounds(bounds) {
  let minimum = 0;

  for (const segment of trailRuntime.segments) {
    if (!boundsIntersect(bounds, segment.bounds)) continue;

    minimum = Math.max(minimum, segment.route.minimumSegments);
  }

  for (const summit of MOUNTAIN_TRAIL_SUMMITS) {
    const summitBounds = {
      minX: summit.x - SUMMIT_OUTER_RADIUS,
      maxX: summit.x + SUMMIT_OUTER_RADIUS,
      minZ: summit.z - SUMMIT_OUTER_RADIUS,
      maxZ: summit.z + SUMMIT_OUTER_RADIUS,
    };

    if (boundsIntersect(bounds, summitBounds)) {
      minimum = Math.max(minimum, HIGH_DETAIL_TRAIL_SEGMENTS);
    }
  }

  return minimum;
}

function createTrailRuntime(routes) {
  const segments = [];
  const spatialIndex = new Map();
  const physicalSegments = new Map();

  for (const trailRoute of routes) {
    let along = 0;

    for (let index = 0; index < trailRoute.points.length - 1; index += 1) {
      const start = trailRoute.points[index];
      const end = trailRoute.points[index + 1];
      const deltaX = end.x - start.x;
      const deltaZ = end.z - start.z;
      const length = Math.hypot(deltaX, deltaZ);

      if (length <= 0) continue;

      const physicalKey = getPhysicalSegmentKey(start, end);
      let segment = physicalSegments.get(physicalKey);

      if (!segment) {
        segment = {
          route: trailRoute,
          start,
          end,
          deltaX,
          deltaZ,
          length,
          lengthSq: length * length,
          startAlong: along,
          startSummit: isSummitPoint(start),
          endSummit: isSummitPoint(end),
          bounds: {
            minX: Math.min(start.x, end.x) - trailRoute.outerHalfWidth,
            maxX: Math.max(start.x, end.x) + trailRoute.outerHalfWidth,
            minZ: Math.min(start.z, end.z) - trailRoute.outerHalfWidth,
            maxZ: Math.max(start.z, end.z) + trailRoute.outerHalfWidth,
          },
        };

        const segmentIndex = segments.length;

        segments.push(segment);
        physicalSegments.set(physicalKey, segment);
        addSegmentToSpatialIndex(spatialIndex, segment, segmentIndex);
      }

      along += length;
    }
  }

  return { segments, spatialIndex };
}

function getPhysicalSegmentKey(start, end) {
  const startKey = `${start.x},${start.z},${start.height}`;
  const endKey = `${end.x},${end.z},${end.height}`;

  return startKey < endKey
    ? `${startKey}|${endKey}`
    : `${endKey}|${startKey}`;
}

function addSegmentToSpatialIndex(spatialIndex, segment, segmentIndex) {
  const minCellX = Math.floor(segment.bounds.minX / SPATIAL_CELL_SIZE);
  const maxCellX = Math.floor(segment.bounds.maxX / SPATIAL_CELL_SIZE);
  const minCellZ = Math.floor(segment.bounds.minZ / SPATIAL_CELL_SIZE);
  const maxCellZ = Math.floor(segment.bounds.maxZ / SPATIAL_CELL_SIZE);

  for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      const key = `${cellX},${cellZ}`;
      const entries = spatialIndex.get(key) ?? [];

      entries.push(segmentIndex);
      spatialIndex.set(key, entries);
    }
  }
}

function getSpatialKey(x, z) {
  return `${Math.floor(x / SPATIAL_CELL_SIZE)},${Math.floor(z / SPATIAL_CELL_SIZE)}`;
}

function getSegmentFrame(segment, x, z, target) {
  const amount = THREE.MathUtils.clamp(
    ((x - segment.start.x) * segment.deltaX + (z - segment.start.z) * segment.deltaZ)
      / segment.lengthSq,
    0,
    1,
  );
  const nearestX = segment.start.x + segment.deltaX * amount;
  const nearestZ = segment.start.z + segment.deltaZ * amount;
  const deltaX = x - nearestX;
  const deltaZ = z - nearestZ;
  const distanceSq = deltaX * deltaX + deltaZ * deltaZ;
  const cross = segment.deltaX * (z - segment.start.z)
    - segment.deltaZ * (x - segment.start.x);

  target.route = segment.route;
  target.segment = segment;
  target.amount = amount;
  target.distanceSq = distanceSq;
  target.distance = Math.sqrt(distanceSq);
  target.lateral = cross / segment.length;
  target.along = segment.startAlong + segment.length * amount;
  target.targetHeight = getSegmentTargetHeight(segment, amount);
  return target;
}

function getSegmentTargetHeight(segment, amount) {
  const along = amount * segment.length;

  if (segment.startSummit) {
    if (along <= SUMMIT_ROUTE_PLATEAU_LENGTH) return segment.start.height;

    return THREE.MathUtils.lerp(
      segment.start.height,
      segment.end.height,
      (along - SUMMIT_ROUTE_PLATEAU_LENGTH)
        / (segment.length - SUMMIT_ROUTE_PLATEAU_LENGTH),
    );
  }

  if (segment.endSummit) {
    const gradedLength = segment.length - SUMMIT_ROUTE_PLATEAU_LENGTH;

    if (along >= gradedLength) return segment.end.height;
    return THREE.MathUtils.lerp(
      segment.start.height,
      segment.end.height,
      along / gradedLength,
    );
  }

  return THREE.MathUtils.lerp(segment.start.height, segment.end.height, amount);
}

function getClosestSummitFrame(x, z) {
  let closest = null;

  for (const summit of MOUNTAIN_TRAIL_SUMMITS) {
    const distance = Math.hypot(x - summit.x, z - summit.z);

    if (!closest || distance < closest.distance) {
      closest = { summit, distance };
    }
  }

  return closest;
}

function isSummitPoint(trailPoint) {
  return MOUNTAIN_TRAIL_SUMMITS.some((summit) => (
    summit.x === trailPoint.x
    && summit.z === trailPoint.z
    && summit.height === trailPoint.height
  ));
}

function boundsIntersect(a, b) {
  return a.maxX >= b.minX
    && a.minX <= b.maxX
    && a.maxZ >= b.minZ
    && a.minZ <= b.maxZ;
}

function smoothstepRange(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;

  const amount = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return amount * amount * (3 - 2 * amount);
}

function valueNoise(x, z) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = smoothstep(x - x0);
  const tz = smoothstep(z - z0);
  const a = random2d(x0, z0);
  const b = random2d(x0 + 1, z0);
  const c = random2d(x0, z0 + 1);
  const d = random2d(x0 + 1, z0 + 1);
  const top = THREE.MathUtils.lerp(a, b, tx);
  const bottom = THREE.MathUtils.lerp(c, d, tx);

  return THREE.MathUtils.lerp(top, bottom, tz) * 2 - 1;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function random2d(x, z) {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}
