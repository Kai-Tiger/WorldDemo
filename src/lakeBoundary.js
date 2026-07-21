import * as THREE from 'three';

export const RIVER_LAKE_FADE_LENGTH = 4;

export const ALPINE_LAKE_BOUNDARY = Object.freeze({
  id: 'alpine-lake',
  cx: 300,
  cz: -400,
  radius: 47,
  shoreWidth: 9,
  waterLevel: 31,
  surfaceOffset: 0.045,
  maxDepth: 6.5,
  edgeDepth: 1.35,
  shapeKind: 'alpine',
});

export function getLakeBoundary(lake) {
  return lake?.lakeBoundary ?? lake;
}

export function hasLakeBoundary(lake) {
  const boundary = getLakeBoundary(lake);
  const center = boundary?.center ?? boundary?.position;
  const centerX = boundary?.cx ?? center?.[0];
  const centerZ = boundary?.cz ?? center?.[1];
  const radiusX = boundary?.radiusX ?? boundary?.radius;
  const radiusZ = boundary?.radiusZ ?? boundary?.radius;

  return Number.isFinite(centerX)
    && Number.isFinite(centerZ)
    && radiusX > 0
    && radiusZ > 0;
}

export function getLakeCenter(lake) {
  const boundary = getLakeBoundary(lake);
  const center = boundary.center ?? boundary.position;

  return {
    x: boundary.cx ?? center?.[0],
    z: boundary.cz ?? center?.[1],
  };
}

export function getLakeBoundaryRadius(lake, worldAngle) {
  const boundary = getLakeBoundary(lake);

  if (boundary.shapeKind === 'alpine') {
    const radius = boundary.radius
      + Math.sin(worldAngle * 3 + 0.7) * 4.4
      + Math.sin(worldAngle * 5 - 1.1) * 3.1
      + Math.sin(worldAngle * 9 + 2.2) * 1.8;

    return THREE.MathUtils.clamp(radius, 39, 56);
  }

  const rotation = boundary.rotation ?? 0;
  const radiusX = boundary.radiusX ?? boundary.radius;
  const radiusZ = boundary.radiusZ ?? boundary.radius;
  const directionX = Math.cos(worldAngle);
  const directionZ = Math.sin(worldAngle);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const localDirectionX = directionX * cos + directionZ * sin;
  const localDirectionZ = -directionX * sin + directionZ * cos;
  const normalizedX = localDirectionX / radiusX;
  const normalizedZ = localDirectionZ / radiusZ;
  const normalizedDirectionLength = Math.hypot(normalizedX, normalizedZ);
  const normalizedAngle = Math.atan2(normalizedZ, normalizedX);
  const shapeScale = getLakeShapeScale(boundary, normalizedAngle);

  return shapeScale / normalizedDirectionLength;
}

export function getLakeBoundaryFrame(lake, x, z) {
  const center = getLakeCenter(lake);
  const dx = x - center.x;
  const dz = z - center.z;
  const radius = Math.hypot(dx, dz);
  const angle = radius > 1e-9 ? Math.atan2(dz, dx) : 0;
  const boundaryRadius = getLakeBoundaryRadius(lake, angle);
  const signedDistance = radius - boundaryRadius;

  return {
    centerX: center.x,
    centerZ: center.z,
    radius,
    boundaryRadius,
    signedDistance,
    normalizedRadius: radius / boundaryRadius,
    angle,
    inside: signedDistance <= 0,
  };
}

export function getLakeOutsideFade(
  lake,
  x,
  z,
  fadeLength = RIVER_LAKE_FADE_LENGTH,
) {
  const signedDistance = getLakeBoundaryFrame(lake, x, z).signedDistance;

  return getLakeOutsideFadeFromSignedDistance(signedDistance, fadeLength);
}

export function getLakeOutsideFadeFromSignedDistance(
  signedDistance,
  fadeLength = RIVER_LAKE_FADE_LENGTH,
) {
  if (signedDistance <= 1e-6) return 0;
  return smoothstep(0, fadeLength, signedDistance);
}

export function getLakesOutsideFade(
  lakes,
  x,
  z,
  fadeLength = RIVER_LAKE_FADE_LENGTH,
) {
  let fade = 1;

  for (const lake of lakes) {
    fade = Math.min(fade, getLakeOutsideFade(lake, x, z, fadeLength));
  }

  return fade;
}

export function projectPointToLakeBoundary(lake, x, z) {
  const frame = getLakeBoundaryFrame(lake, x, z);
  const directionX = frame.radius > 1e-9
    ? (x - frame.centerX) / frame.radius
    : 1;
  const directionZ = frame.radius > 1e-9
    ? (z - frame.centerZ) / frame.radius
    : 0;

  return {
    x: frame.centerX + directionX * frame.boundaryRadius,
    z: frame.centerZ + directionZ * frame.boundaryRadius,
  };
}

export function findLakeBoundaryIntersection(lake, start, end) {
  const startPoint = toPoint(start);
  const endPoint = toPoint(end);
  const startDistance = getLakeBoundaryFrame(lake, startPoint.x, startPoint.z).signedDistance;
  const endDistance = getLakeBoundaryFrame(lake, endPoint.x, endPoint.z).signedDistance;

  if (Math.abs(startDistance) <= 1e-6) return { ...startPoint, t: 0 };
  if (Math.abs(endDistance) <= 1e-6) return { ...endPoint, t: 1 };
  if (Math.sign(startDistance) === Math.sign(endDistance)) {
    throw new Error('Lake boundary intersection requires points on opposite sides of the shore.');
  }

  let low = 0;
  let high = 1;
  let lowDistance = startDistance;

  for (let iteration = 0; iteration < 40; iteration += 1) {
    const t = (low + high) * 0.5;
    const x = THREE.MathUtils.lerp(startPoint.x, endPoint.x, t);
    const z = THREE.MathUtils.lerp(startPoint.z, endPoint.z, t);
    const signedDistance = getLakeBoundaryFrame(lake, x, z).signedDistance;

    if (Math.sign(signedDistance) === Math.sign(lowDistance)) {
      low = t;
      lowDistance = signedDistance;
    } else {
      high = t;
    }
  }

  const t = (low + high) * 0.5;

  return {
    x: THREE.MathUtils.lerp(startPoint.x, endPoint.x, t),
    z: THREE.MathUtils.lerp(startPoint.z, endPoint.z, t),
    t,
  };
}

export function getLakeMaximumRadius(lake) {
  const boundary = getLakeBoundary(lake);

  if (boundary.shapeKind === 'alpine') return 56;

  return Math.max(boundary.radiusX ?? boundary.radius, boundary.radiusZ ?? boundary.radius)
    * (1 + Math.abs(boundary.shapeAmp ?? 0));
}

export function getLakeShaderDescriptor(lake) {
  const boundary = getLakeBoundary(lake);
  const center = getLakeCenter(boundary);

  return {
    id: boundary.id,
    center,
    radiusX: boundary.radiusX ?? boundary.radius,
    radiusZ: boundary.radiusZ ?? boundary.radius,
    rotation: boundary.rotation ?? 0,
    shapeAmp: boundary.shapeAmp ?? 0,
    phase: boundary.phase ?? 0,
    shapeKind: boundary.shapeKind === 'alpine' ? 1 : 0,
  };
}

export function getUniqueLakeBoundaries(lakes) {
  const unique = new Map();

  for (const lake of lakes) {
    const boundary = getLakeBoundary(lake);

    unique.set(boundary.id, boundary);
  }

  return [...unique.values()];
}

function getLakeShapeScale(lake, angle) {
  const amplitude = lake.shapeAmp ?? 0;
  const phase = lake.phase ?? 0;

  if (lake.shapeKind === 'rugged') {
    return 1 + amplitude * (
      Math.sin(angle * 2 + phase) * 0.28
      + Math.sin(angle * 3 - phase * 0.61) * 0.22
      + Math.sin(angle * 5 + phase * 1.17) * 0.16
      + Math.sin(angle * 11 - phase * 1.73) * 0.14
      + Math.sin(angle * 19 + phase * 0.43) * 0.12
      + Math.sin(angle * 29 - phase * 2.11) * 0.08
    );
  }

  return 1 + amplitude * (
    Math.sin(angle * 3 + phase) * 0.5
    + Math.sin(angle * 5 - phase * 0.7) * 0.3
    + Math.sin(angle * 7 + phase * 1.3) * 0.2
  );
}

function toPoint(point) {
  if (Array.isArray(point)) return { x: point[0], z: point[1] };
  return { x: point.x, z: point.z };
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}
