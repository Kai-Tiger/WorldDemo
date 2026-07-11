import * as THREE from 'three';

const SAMPLE_SPACING = 1;
const NATURAL_MOUNTAIN_PASS_MINIMUM_SEGMENTS = 256;

export const NATURAL_MOUNTAIN_PASS = Object.freeze({
  profile: Object.freeze({
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
});

const mountainPass = createMountainPassRuntime(NATURAL_MOUNTAIN_PASS);

export function applyNaturalMountainPassTerrain(baseHeight, x, z) {
  const { bounds, length, profile } = mountainPass;

  if (!isPointNearBounds(x, z, bounds)) return baseHeight;

  const frame = getClosestMountainPassFrame(mountainPass, x, z);

  if (!frame || frame.distance > profile.outerHalfWidth) return baseHeight;

  const progress = smoothstep(0, length, frame.along);
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

  return THREE.MathUtils.lerp(baseHeight, targetHeight, blend);
}

export function getNaturalMountainPassMinimumSegmentsForBounds(bounds) {
  return boundsIntersect(bounds, mountainPass.bounds)
    ? NATURAL_MOUNTAIN_PASS_MINIMUM_SEGMENTS
    : 0;
}

function createMountainPassRuntime(pass) {
  const curve = new THREE.CatmullRomCurve3(
    pass.points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal',
  );
  const sampleCount = Math.max(2, Math.ceil(curve.getLength() / SAMPLE_SPACING));
  const samples = [];
  let distance = 0;

  for (let index = 0; index <= sampleCount; index += 1) {
    const point = curve.getPointAt(index / sampleCount);

    if (index > 0) distance += point.distanceTo(samples[index - 1].point);
    samples.push({ point, distance });
  }

  return {
    ...pass,
    samples,
    length: distance,
    bounds: createMountainPassBounds(samples, pass.profile.outerHalfWidth),
  };
}

function getClosestMountainPassFrame(pass, x, z) {
  let closest = null;

  for (let index = 0; index < pass.samples.length - 1; index += 1) {
    const start = pass.samples[index];
    const end = pass.samples[index + 1];
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

    closest = {
      distanceSq,
      distance: Math.sqrt(distanceSq),
      along: THREE.MathUtils.lerp(start.distance, end.distance, segmentT),
    };
  }

  return closest;
}

function createMountainPassBounds(samples, padding) {
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

function isPointNearBounds(x, z, bounds) {
  return x >= bounds.minX
    && x <= bounds.maxX
    && z >= bounds.minZ
    && z <= bounds.maxZ;
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
