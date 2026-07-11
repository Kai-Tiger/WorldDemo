import * as THREE from 'three';

const SAMPLE_SPACING = 1;
const END_FADE_DISTANCE = 7;
const ROAD_EDGE_FADE = 1.2;
const ROAD_WIDTH_VARIATION = 0.08;
const ROAD_MINIMUM_SEGMENTS = 256;

export const ROAD_ROUTES = Object.freeze([
  Object.freeze({
    id: 'river-valley-carriage-road',
    type: 'cart',
    width: 5,
    points: Object.freeze([
      Object.freeze([430, -405]),
      Object.freeze([456, -389]),
      Object.freeze([485, -379]),
      Object.freeze([512, -366]),
      Object.freeze([539, -342]),
      Object.freeze([573, -326]),
      Object.freeze([606, -327]),
      Object.freeze([635, -339]),
      Object.freeze([658, -328]),
      Object.freeze([674, -314]),
      Object.freeze([697, -307]),
      Object.freeze([725, -315]),
      Object.freeze([755, -300]),
    ]),
  }),
  Object.freeze({
    id: 'waterfall-overlook-trail',
    type: 'trail',
    width: 2.2,
    points: Object.freeze([
      Object.freeze([335, -358]),
      Object.freeze([339, -346]),
      Object.freeze([346, -331]),
      Object.freeze([360, -325]),
      Object.freeze([374, -332]),
      Object.freeze([389, -345]),
      Object.freeze([401, -365]),
      Object.freeze([401, -395]),
    ]),
  }),
  Object.freeze({
    id: 'mountain-access-trail',
    type: 'trail',
    width: 4.8,
    terrainProfile: Object.freeze({
      lowHeight: 0,
      highHeight: 28,
      innerHalfWidth: 3,
      outerHalfWidth: 18,
    }),
    points: Object.freeze([
      Object.freeze([444, -397]),
      Object.freeze([432, -398]),
      Object.freeze([427, -391]),
      Object.freeze([421, -380]),
      Object.freeze([412, -368]),
      Object.freeze([401, -356]),
      Object.freeze([389, -345]),
    ]),
  }),
]);

const routes = ROAD_ROUTES.map(createRouteRuntime);

export function getRoadMaterialFrame(x, z, target = {}) {
  target.trailMask = 0;
  target.cartMask = 0;
  target.trailLateral = 0;
  target.cartLateral = 0;

  for (const route of routes) {
    if (!isPointNearBounds(x, z, route.bounds, route.maxHalfWidth + ROAD_EDGE_FADE)) continue;

    const frame = getClosestRouteFrame(route, x, z);

    if (!frame) continue;

    const edgeMask = 1 - smoothstep(
      frame.halfWidth * 0.45,
      frame.halfWidth + ROAD_EDGE_FADE,
      frame.distance,
    );
    const endMask = smoothstep(0, END_FADE_DISTANCE, frame.along)
      * smoothstep(0, END_FADE_DISTANCE, route.length - frame.along);
    const mask = edgeMask * endMask;
    const maskKey = route.type === 'cart' ? 'cartMask' : 'trailMask';

    if (mask <= target[maskKey]) continue;

    target[maskKey] = mask;
    target[`${route.type}Lateral`] = THREE.MathUtils.clamp(
      frame.lateral / frame.halfWidth,
      -1.5,
      1.5,
    );
  }

  return target;
}

export function isInRoadVegetationExclusion(x, z, buffer = 0) {
  for (const route of routes) {
    if (!isPointNearBounds(x, z, route.bounds, route.maxHalfWidth + buffer)) continue;

    const frame = getClosestRouteFrame(route, x, z);

    if (
      frame
      && frame.distance <= frame.halfWidth + buffer
      && frame.along >= -buffer
      && frame.along <= route.length + buffer
    ) {
      return true;
    }
  }

  return false;
}

export function applyRoadTerrain(baseHeight, x, z) {
  let height = baseHeight;

  for (const route of routes) {
    const profile = route.terrainProfile;

    if (!profile || !isPointNearBounds(x, z, route.bounds, 0)) continue;

    const frame = getClosestRouteFrame(route, x, z);

    if (!frame || frame.distance > profile.outerHalfWidth) continue;

    const progress = smoothstep(0, route.length, frame.along);
    const targetHeight = THREE.MathUtils.lerp(
      profile.lowHeight,
      profile.highHeight,
      progress,
    );
    const blend = 1 - smoothstep(
      profile.innerHalfWidth,
      profile.outerHalfWidth,
      frame.distance,
    );

    height = THREE.MathUtils.lerp(height, targetHeight, blend);
  }

  return height;
}

export function getRoadMinimumSegmentsForBounds(bounds) {
  return routes.some((route) => boundsIntersect(bounds, route.bounds))
    ? ROAD_MINIMUM_SEGMENTS
    : 0;
}

function createRouteRuntime(route) {
  const curve = new THREE.CatmullRomCurve3(
    route.points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal',
  );
  const sampleCount = Math.max(2, Math.ceil(curve.getLength() / SAMPLE_SPACING));
  const samples = [];
  let distance = 0;

  for (let index = 0; index <= sampleCount; index += 1) {
    const t = index / sampleCount;
    const point = curve.getPointAt(t);

    if (index > 0) distance += point.distanceTo(samples[index - 1].point);

    const widthScale = 1
      + Math.sin(distance * 0.073 + route.width) * ROAD_WIDTH_VARIATION
      + Math.sin(distance * 0.21 - route.width) * ROAD_WIDTH_VARIATION * 0.35;

    samples.push({
      point,
      distance,
      halfWidth: route.width * widthScale * 0.5,
    });
  }

  const maxHalfWidth = route.width * (1 + ROAD_WIDTH_VARIATION * 1.35) * 0.5;

  return {
    ...route,
    samples,
    length: distance,
    maxHalfWidth,
    bounds: createRouteBounds(
      samples,
      Math.max(maxHalfWidth + ROAD_EDGE_FADE, route.terrainProfile?.outerHalfWidth ?? 0),
    ),
  };
}

function getClosestRouteFrame(route, x, z) {
  let closest = null;

  for (let index = 0; index < route.samples.length - 1; index += 1) {
    const start = route.samples[index];
    const end = route.samples[index + 1];
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

    closest = {
      distanceSq,
      distance: Math.sqrt(distanceSq),
      lateral: deltaX * (-segmentZ / segmentLength) + deltaZ * (segmentX / segmentLength),
      along: THREE.MathUtils.lerp(start.distance, end.distance, segmentT),
      halfWidth: THREE.MathUtils.lerp(start.halfWidth, end.halfWidth, segmentT),
    };
  }

  return closest;
}

function createRouteBounds(samples, padding) {
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

function isPointNearBounds(x, z, bounds, padding) {
  return x >= bounds.minX - padding
    && x <= bounds.maxX + padding
    && z >= bounds.minZ - padding
    && z <= bounds.maxZ + padding;
}

function boundsIntersect(a, b) {
  return a.maxX >= b.minX
    && a.minX <= b.maxX
    && a.maxZ >= b.minZ
    && a.minZ <= b.maxZ;
}

function smoothstep(edge0, edge1, value) {
  const amount = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return amount * amount * (3 - 2 * amount);
}
