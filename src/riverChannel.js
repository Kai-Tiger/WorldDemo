import * as THREE from 'three';

const CHANNEL_POINTS = [
  new THREE.Vector3(415, 0, -430),
  new THREE.Vector3(430, 0, -417),
  new THREE.Vector3(455, 0, -398),
  new THREE.Vector3(500, 0, -375),
  new THREE.Vector3(535, 0, -335),
  new THREE.Vector3(585, 0, -300),
  new THREE.Vector3(610, 0, -280),
  new THREE.Vector3(625, 0, -265),
];

const CHANNEL_WIDTH = 8;
const CHANNEL_DEPTH = 3;
const INFLUENCE_RADIUS = 7;
const HIGHLAND_FADE_START = 10;
const HIGHLAND_FADE_END = 18;
const PATH_SAMPLE_COUNT = 260;
const RIVERBED_STEP = 0.5;
const RIVERBED_HEIGHT_OFFSET = 0.04;
const END_TAPER_LENGTH = 10;

const HALF_CHANNEL_WIDTH = CHANNEL_WIDTH * 0.5;
const channelCurve = new THREE.CatmullRomCurve3(CHANNEL_POINTS, false, 'centripetal');
const channelSamples = createChannelSamples();
const channelLength = channelSamples[channelSamples.length - 1].distance;
const channelBounds = createChannelBounds();

export function applyRiverChannel(baseHeight, x, z) {
  const frame = getChannelFrameAt(x, z);

  if (!frame) return baseHeight;

  const heightMask = 1 - smoothstep(HIGHLAND_FADE_START, HIGHLAND_FADE_END, baseHeight);

  if (heightMask <= 0) return baseHeight;

  const lateralDistance = Math.abs(frame.lateral);
  const bedShape = 1 - smoothstep(0, HALF_CHANNEL_WIDTH, lateralDistance);
  const bankShape = 1 - smoothstep(HALF_CHANNEL_WIDTH, INFLUENCE_RADIUS, lateralDistance);
  const endMask = getEndMask(frame.distance);
  const carveDepth = CHANNEL_DEPTH * Math.max(bedShape, bankShape * 0.22) * heightMask * endMask;

  return baseHeight - carveDepth;
}

export function createRiverbedMesh(terrain) {
  const longitudinalSegments = Math.ceil(channelLength / RIVERBED_STEP);
  const lateralSegments = Math.ceil((INFLUENCE_RADIUS * 2) / RIVERBED_STEP);
  const verticesPerRow = lateralSegments + 1;
  const vertexCount = (longitudinalSegments + 1) * verticesPerRow;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = new Uint32Array(longitudinalSegments * lateralSegments * 6);

  let positionOffset = 0;
  let uvOffset = 0;

  for (let i = 0; i <= longitudinalSegments; i += 1) {
    const t = i / longitudinalSegments;
    const center = channelCurve.getPointAt(t);
    const tangent = channelCurve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    for (let j = 0; j <= lateralSegments; j += 1) {
      const lateralT = j / lateralSegments;
      const lateral = THREE.MathUtils.lerp(-INFLUENCE_RADIUS, INFLUENCE_RADIUS, lateralT);
      const x = center.x + side.x * lateral;
      const z = center.z + side.z * lateral;
      const y = terrain.getHeightAt(x, z) + RIVERBED_HEIGHT_OFFSET;

      positions[positionOffset] = x;
      positions[positionOffset + 1] = y;
      positions[positionOffset + 2] = z;
      positionOffset += 3;

      uvs[uvOffset] = (t * channelLength) / 8;
      uvs[uvOffset + 1] = lateralT;
      uvOffset += 2;
    }
  }

  let indexOffset = 0;

  for (let i = 0; i < longitudinalSegments; i += 1) {
    for (let j = 0; j < lateralSegments; j += 1) {
      const topLeft = i * verticesPerRow + j;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + verticesPerRow;
      const bottomRight = bottomLeft + 1;

      indices[indexOffset] = topLeft;
      indices[indexOffset + 1] = bottomLeft;
      indices[indexOffset + 2] = topRight;
      indices[indexOffset + 3] = topRight;
      indices[indexOffset + 4] = bottomLeft;
      indices[indexOffset + 5] = bottomRight;
      indexOffset += 6;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({
    color: 0x4f3b2a,
    roughness: 0.96,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'ValleyRiverbed';
  mesh.receiveShadow = true;

  return mesh;
}

function getChannelFrameAt(x, z) {
  if (
    x < channelBounds.minX
    || x > channelBounds.maxX
    || z < channelBounds.minZ
    || z > channelBounds.maxZ
  ) {
    return null;
  }

  let closest = null;
  let minDistanceSq = Infinity;

  for (let i = 0; i < channelSamples.length - 1; i += 1) {
    const start = channelSamples[i];
    const end = channelSamples[i + 1];
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

  if (!closest || minDistanceSq > INFLUENCE_RADIUS * INFLUENCE_RADIUS) return null;

  return closest;
}

function createChannelSamples() {
  const samples = [];
  let distance = 0;
  let previous = null;

  for (let i = 0; i <= PATH_SAMPLE_COUNT; i += 1) {
    const point = channelCurve.getPoint(i / PATH_SAMPLE_COUNT);

    if (previous) {
      distance += point.distanceTo(previous);
    }

    samples.push({ x: point.x, z: point.z, distance });
    previous = point;
  }

  return samples;
}

function createChannelBounds() {
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };

  for (const sample of channelSamples) {
    bounds.minX = Math.min(bounds.minX, sample.x - INFLUENCE_RADIUS);
    bounds.maxX = Math.max(bounds.maxX, sample.x + INFLUENCE_RADIUS);
    bounds.minZ = Math.min(bounds.minZ, sample.z - INFLUENCE_RADIUS);
    bounds.maxZ = Math.max(bounds.maxZ, sample.z + INFLUENCE_RADIUS);
  }

  return bounds;
}

function getEndMask(distance) {
  return smoothstep(0, END_TAPER_LENGTH, distance)
    * (1 - smoothstep(channelLength - END_TAPER_LENGTH, channelLength, distance));
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}
