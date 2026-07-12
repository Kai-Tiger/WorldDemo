import * as THREE from 'three';
import {
  SOUTHERN_LOWLAND_LAKES,
  TERMINAL_LOWLAND_LAKE,
} from './lowlandHeightPlan.js';
import { MAP_SIZE } from './vegetationConfig.js';
import { createLakeSurfaceMaterial } from './waterSystem.js';
import { WATER_RENDER_ORDER } from './waterContext.js';

const LAKES = [
  ...SOUTHERN_LOWLAND_LAKES,
  { ...TERMINAL_LOWLAND_LAKE, isTerminal: true },
];

const SHORE_WIDTH = 6;
const VEG_BUFFER = 10;
const ANGLE_SEGMENTS = 64;
const RADIAL_RINGS = 12;
const BED_MASK_RADIUS = 1;
const HALF_MAP_SIZE = MAP_SIZE / 2;
export const SMALL_LAKES = Object.freeze(LAKES.filter(isLakeFullyInsideMap));
const ACTIVE_LAKES = SMALL_LAKES;

export function applySmallLakesTerrain(baseHeight, x, z) {
  return baseHeight;
}

export function isInSmallLakeExclusion(x, z, buffer = 0) {
  for (let i = 0; i < ACTIVE_LAKES.length; i += 1) {
    const lake = ACTIVE_LAKES[i];
    const dx = x - lake.cx;
    const dz = z - lake.cz;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (lake.isTerminal) {
      if (dist < lake.radius + lake.shoreWidth + buffer) return true;
      continue;
    }

    const angle = Math.atan2(dz, dx);
    const actualRadius = lakeRadiusAt(angle, lake);

    if (dist < actualRadius + buffer) return true;
  }

  return false;
}

export function getSmallLakesMaterialMask(x, z) {
  let mask = 0;

  for (let i = 0; i < ACTIVE_LAKES.length; i += 1) {
    const lake = ACTIVE_LAKES[i];
    const dx = x - lake.cx;
    const dz = z - lake.cz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const actualRadius = lake.isTerminal
      ? lake.radius
      : lakeRadiusAt(Math.atan2(dz, dx), lake);

    const bedMask = lake.isTerminal
      ? smoothstep(actualRadius, actualRadius - 2, dist)
      : smoothstep(actualRadius + BED_MASK_RADIUS, actualRadius - 1, dist);

    mask = Math.max(mask, bedMask);
  }

  return mask;
}

export function createSmallLakes(terrain) {
  const group = new THREE.Group();
  group.name = 'SmallLakes';

  for (let i = 0; i < ACTIVE_LAKES.length; i += 1) {
    const lake = ACTIVE_LAKES[i];

    if (lake.isTerminal) {
      const geometry = createTerminalLakeGeometry(lake, terrain);
      const mesh = new THREE.Mesh(geometry, createLakeSurfaceMaterial());

      mesh.name = 'RiverTerminalLake';
      mesh.renderOrder = WATER_RENDER_ORDER.surface + 1;
      group.add(mesh);
      continue;
    }

    const lr = lakeRadiusAt;

    const geometry = createLakeGeometry(
      lake,
      lake.waterLevel + lake.surfaceOffset,
      lr,
    );
    const material = createLakeSurfaceMaterial();
    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = `SmallLake_${lake.id}`;
    mesh.renderOrder = WATER_RENDER_ORDER.surface;

    group.add(mesh);
  }

  return group;
}

export function updateSmallLakes(group, camera, elapsedTime) {
  for (let i = 0; i < group.children.length; i += 1) {
    const child = group.children[i];

    if (child.material && child.material.uniforms) {
      child.material.uniforms.uTime.value = elapsedTime;
      child.material.uniforms.uCameraPosition.value.copy(camera.position);
    }
  }
}

function isLakeFullyInsideMap(lake) {
  const maxRadius = lake.isTerminal
    ? lake.radius + lake.shoreWidth
    : lake.radius * (1 + lake.shapeAmp) + SHORE_WIDTH;

  return lake.cx - maxRadius >= -HALF_MAP_SIZE
    && lake.cx + maxRadius <= HALF_MAP_SIZE
    && lake.cz - maxRadius >= -HALF_MAP_SIZE
    && lake.cz + maxRadius <= HALF_MAP_SIZE;
}

function lakeRadiusAt(angle, lake) {
  const phase = lake.phase ?? 0;

  return lake.radius * (1 + lake.shapeAmp * (
    Math.sin(angle * 3 + phase) * 0.5
    + Math.sin(angle * 5 - phase * 0.7) * 0.3
    + Math.sin(angle * 7 + phase * 1.3) * 0.2
  ));
}

function createLakeGeometry(lake, waterLevel, lr) {
  const vertices = [];
  const uvs = [];
  const depths = [];
  const edges = [];
  const bedVisibilities = [];

  vertices.push(lake.cx, waterLevel, lake.cz);
  uvs.push(0.5, 0.5);
  depths.push(lake.maxDepth);
  edges.push(1);
  bedVisibilities.push(1 - smoothstep(1.4, 8.5, lake.maxDepth));

  for (let ring = 1; ring <= RADIAL_RINGS; ring += 1) {
    const t = ring / RADIAL_RINGS;

    for (let a = 0; a < ANGLE_SEGMENTS; a += 1) {
      const angle = (a / ANGLE_SEGMENTS) * Math.PI * 2;
      const r = t * lake.radius * lr(angle, lake) / lake.radius;
      const x = lake.cx + Math.cos(angle) * r;
      const z = lake.cz + Math.sin(angle) * r;

      vertices.push(x, waterLevel, z);
      uvs.push(0.5 + Math.cos(angle) * t * 0.5, 0.5 + Math.sin(angle) * t * 0.5);

      const depth = lake.maxDepth * (1 - t);
      depths.push(depth);
      edges.push(1 - t);
      bedVisibilities.push(1 - smoothstep(1.4, 8.5, depth));
    }
  }

  const geometry = new THREE.BufferGeometry();
  const vertexCount = 1 + RADIAL_RINGS * ANGLE_SEGMENTS;
  const positions = new Float32Array(vertexCount * 3);
  const uvArray = new Float32Array(vertexCount * 2);
  const depthArray = new Float32Array(vertexCount);
  const edgeArray = new Float32Array(vertexCount);
  const bedVisibilityArray = new Float32Array(vertexCount);

  for (let i = 0; i < vertexCount; i += 1) {
    positions[i * 3] = vertices[i * 3];
    positions[i * 3 + 1] = vertices[i * 3 + 1];
    positions[i * 3 + 2] = vertices[i * 3 + 2];
    uvArray[i * 2] = uvs[i * 2];
    uvArray[i * 2 + 1] = uvs[i * 2 + 1];
    depthArray[i] = depths[i];
    edgeArray[i] = edges[i];
    bedVisibilityArray[i] = bedVisibilities[i];
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
  geometry.setAttribute('lakeDepth', new THREE.BufferAttribute(depthArray, 1));
  geometry.setAttribute('lakeEdge', new THREE.BufferAttribute(edgeArray, 1));
  geometry.setAttribute('lakeBedVisibility', new THREE.BufferAttribute(bedVisibilityArray, 1));

  const indices = [];
  for (let ring = 0; ring < RADIAL_RINGS; ring += 1) {
    for (let a = 0; a < ANGLE_SEGMENTS; a += 1) {
      const curr = 1 + ring * ANGLE_SEGMENTS + a;
      const next = 1 + ring * ANGLE_SEGMENTS + (a + 1) % ANGLE_SEGMENTS;
      const currInner = ring === 0 ? 0 : 1 + (ring - 1) * ANGLE_SEGMENTS + a;
      const nextInner = ring === 0 ? 0 : 1 + (ring - 1) * ANGLE_SEGMENTS + (a + 1) % ANGLE_SEGMENTS;

      if (ring === 0) {
        indices.push(0, next, curr);
      } else {
        indices.push(currInner, nextInner, curr);
        indices.push(nextInner, next, curr);
      }
    }
  }

  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

function createTerminalLakeGeometry(lake, terrain) {
  const geometry = createLakeGeometry(
    lake,
    lake.waterLevel + lake.surfaceOffset,
    (_angle, currentLake) => currentLake.radius,
  );
  const positions = geometry.getAttribute('position');
  const uvs = geometry.getAttribute('uv');
  const depths = geometry.getAttribute('lakeDepth');
  const edges = geometry.getAttribute('lakeEdge');
  const bedVisibilities = new Float32Array(positions.count);

  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const distance = Math.hypot(x - lake.cx, z - lake.cz);
    const radialT = THREE.MathUtils.clamp(distance / lake.radius, 0, 1);
    const depth = Math.max(lake.waterLevel - terrain.getHeightAt(x, z), 0);

    uvs.setXY(
      i,
      (x - lake.cx) / (lake.radius * 2) + 0.5,
      (z - lake.cz) / (lake.radius * 2) + 0.5,
    );
    depths.setX(i, depth);
    edges.setX(i, 1 - radialT);
    bedVisibilities[i] = THREE.MathUtils.clamp(1 - smoothstep(1.4, 8.5, depth), 0, 1);
  }

  geometry.setAttribute('lakeBedVisibility', new THREE.BufferAttribute(bedVisibilities, 1));

  return geometry;
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}
