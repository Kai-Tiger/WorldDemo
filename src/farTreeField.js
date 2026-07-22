import * as THREE from 'three';
import { isInRiverGrassExclusion } from './riverChannel.js';
import { isInWaterSystemVegetationExclusion } from './waterSystem.js';
import { isInSmallLakeExclusion } from './smallLakes.js';
import { isInMountainTrailTreeExclusion } from './mountainTrailNetwork.js';
import { hash2, sampleTerrainSurface } from './grassClumps.js';
import { getTreeDensity, isTreeArea } from './treePlacements.js';
import {
  MAP_SIZE,
  TREE_DENSITY_LOWLAND,
  TREE_RIVER_BUFFER,
  WORLD_VIEW_DISTANCE,
} from './vegetationConfig.js';

export const FAR_TREE_SPACING = 28;
export const FAR_TREE_FADE_WIDTH = 320;

const HALF_MAP_SIZE = MAP_SIZE / 2;
const FAR_TREE_DENSITY = 0.70;
const FAR_TREE_WATER_BUFFER = Math.max(TREE_RIVER_BUFFER, 10);
const FAR_TREE_EDGE_FADE = 640;
const FAR_TREE_MIN_HEIGHT = 16.8;
const FAR_TREE_MAX_HEIGHT = 28.8;
const FAR_TREE_MIN_WIDTH = 7.2;
const FAR_TREE_MAX_WIDTH = 12;
const FAR_TREE_GROVE_MACRO_SIZE = 420;
const FAR_TREE_GROVE_DETAIL_SIZE = 170;
const FAR_TREE_COLORS = [
  new THREE.Color('#1f4036'),
  new THREE.Color('#254843'),
  new THREE.Color('#3f462c'),
];

export function createFarTreeField(terrain) {
  const placements = createFarTreePlacements(terrain);
  const geometry = createFarTreeGeometry(placements);
  const material = createFarTreeMaterial();
  const mesh = new THREE.Mesh(geometry, material);

  mesh.name = 'FarTreeField';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.userData.farTreeCount = placements.length;

  return {
    mesh,
    count: placements.length,
    update(viewerPosition, nearDistance) {
      material.uniforms.uViewerPosition.value.set(viewerPosition.x, viewerPosition.z);
      material.uniforms.uNearDistance.value = nearDistance;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

export function createFarTreePlacements(terrain) {
  const placements = [];
  const surface = {};
  const gridCount = Math.ceil(MAP_SIZE / FAR_TREE_SPACING);

  for (let gridZ = 0; gridZ < gridCount; gridZ += 1) {
    for (let gridX = 0; gridX < gridCount; gridX += 1) {
      const jitterX = (hash2(gridX + 11.7, gridZ - 4.3) - 0.5) * FAR_TREE_SPACING;
      const jitterZ = (hash2(gridX - 8.9, gridZ + 19.1) - 0.5) * FAR_TREE_SPACING;
      const x = -HALF_MAP_SIZE + (gridX + 0.5) * FAR_TREE_SPACING + jitterX;
      const z = -HALF_MAP_SIZE + (gridZ + 0.5) * FAR_TREE_SPACING + jitterZ;

      if (Math.abs(x) > HALF_MAP_SIZE || Math.abs(z) > HALF_MAP_SIZE) continue;

      sampleTerrainSurface(terrain, x, z, surface);
      const densityRatio = getTreeDensity(surface.height) / (TREE_DENSITY_LOWLAND * 3);
      const cluster = getFarTreeClusterFactor(x, z, gridX, gridZ, densityRatio);

      if (hash2(gridX + 401, gridZ - 233) >= FAR_TREE_DENSITY * densityRatio * cluster) {
        continue;
      }
      if (!isTreeArea(terrain, x, z, surface)) continue;
      if (isInRiverGrassExclusion(x, z, TREE_RIVER_BUFFER)) continue;
      if (isInWaterSystemVegetationExclusion(x, z, FAR_TREE_WATER_BUFFER)) continue;
      if (isInSmallLakeExclusion(x, z, TREE_RIVER_BUFFER)) continue;
      if (isInMountainTrailTreeExclusion(x, z)) continue;

      const scale = THREE.MathUtils.lerp(
        0.82,
        1.18,
        hash2(gridX - 55.4, gridZ + 72.8),
      );
      const colorRoll = hash2(gridX + 14.6, gridZ + 28.2);
      const color = FAR_TREE_COLORS[
        colorRoll < 0.68 ? 0 : colorRoll < 0.90 ? 1 : 2
      ];
      const brightness = THREE.MathUtils.lerp(
        0.86,
        1.06,
        hash2(gridX - 79.3, gridZ + 51.7),
      );

      placements.push({
        x,
        y: surface.height,
        z,
        width: THREE.MathUtils.lerp(
          FAR_TREE_MIN_WIDTH,
          FAR_TREE_MAX_WIDTH,
          hash2(gridX + 63.2, gridZ - 18.7),
        ) * scale,
        height: THREE.MathUtils.lerp(
          FAR_TREE_MIN_HEIGHT,
          FAR_TREE_MAX_HEIGHT,
          hash2(gridX - 31.5, gridZ + 44.9),
        ) * scale,
        tint: [
          color.r * brightness,
          color.g * brightness,
          color.b * brightness,
        ],
      });
    }
  }

  return placements;
}

function getFarTreeClusterFactor(x, z, gridX, gridZ, densityRatio) {
  if (densityRatio < 0.95) {
    return THREE.MathUtils.lerp(
      0.45,
      1,
      hash2(Math.floor(gridX / 5) + 91, Math.floor(gridZ / 5) - 37),
    );
  }

  const macro = sampleRotatedValueNoise(x, z, FAR_TREE_GROVE_MACRO_SIZE, 0.84, -0.54);
  const detail = sampleRotatedValueNoise(x, z, FAR_TREE_GROVE_DETAIL_SIZE, 0.93, 0.37);
  const grove = THREE.MathUtils.smoothstep(macro * 0.76 + detail * 0.24, 0.36, 0.68);

  return THREE.MathUtils.lerp(0.07, 1.55, grove);
}

function sampleRotatedValueNoise(x, z, cellSize, cos, sin) {
  const rotatedX = ((x * cos) - (z * sin)) / cellSize;
  const rotatedZ = ((x * sin) + (z * cos)) / cellSize;
  const x0 = Math.floor(rotatedX);
  const z0 = Math.floor(rotatedZ);
  const tx = rotatedX - x0;
  const tz = rotatedZ - z0;
  const sx = tx * tx * (3 - 2 * tx);
  const sz = tz * tz * (3 - 2 * tz);
  const top = THREE.MathUtils.lerp(
    hash2(x0 + 117.3, z0 - 52.7),
    hash2(x0 + 118.3, z0 - 52.7),
    sx,
  );
  const bottom = THREE.MathUtils.lerp(
    hash2(x0 + 117.3, z0 - 51.7),
    hash2(x0 + 118.3, z0 - 51.7),
    sx,
  );

  return THREE.MathUtils.lerp(top, bottom, sz);
}

function createFarTreeGeometry(placements) {
  const geometry = new THREE.InstancedBufferGeometry();
  const instancePositions = new Float32Array(placements.length * 3);
  const instanceSizes = new Float32Array(placements.length * 2);
  const instanceTints = new Float32Array(placements.length * 3);

  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.5, 0, 0,
    0.5, 0, 0,
    0.5, 1, 0,
    -0.5, 1, 0,
  ], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
    0, 0,
    1, 0,
    1, 1,
    0, 1,
  ], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);

  for (let index = 0; index < placements.length; index += 1) {
    const placement = placements[index];

    instancePositions.set([placement.x, placement.y, placement.z], index * 3);
    instanceSizes.set([placement.width, placement.height], index * 2);
    instanceTints.set(placement.tint, index * 3);
  }

  geometry.setAttribute(
    'instancePosition',
    new THREE.InstancedBufferAttribute(instancePositions, 3),
  );
  geometry.setAttribute(
    'instanceSize',
    new THREE.InstancedBufferAttribute(instanceSizes, 2),
  );
  geometry.setAttribute(
    'instanceTint',
    new THREE.InstancedBufferAttribute(instanceTints, 3),
  );
  geometry.instanceCount = placements.length;
  geometry.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(0, 150, 0),
    Math.hypot(HALF_MAP_SIZE, HALF_MAP_SIZE, 150),
  );

  return geometry;
}

function createFarTreeMaterial() {
  return new THREE.ShaderMaterial({
    name: 'FarTreeSilhouetteMaterial',
    uniforms: {
      fogColor: { value: new THREE.Color() },
      fogDensity: { value: 0 },
      fogNear: { value: 1 },
      fogFar: { value: WORLD_VIEW_DISTANCE },
      uViewerPosition: { value: new THREE.Vector2() },
      uNearDistance: { value: 380 },
      uFadeWidth: { value: FAR_TREE_FADE_WIDTH },
      uViewDistance: { value: WORLD_VIEW_DISTANCE },
      uEdgeFade: { value: FAR_TREE_EDGE_FADE },
    },
    vertexShader: `
      attribute vec3 instancePosition;
      attribute vec2 instanceSize;
      attribute vec3 instanceTint;
      varying vec2 vUv;
      varying vec3 vTint;
      varying float vViewerDistance;
      uniform vec2 uViewerPosition;
      #include <fog_pars_vertex>

      void main() {
        vec3 cameraRight = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[0][2]));
        vec3 worldPosition = instancePosition;
        worldPosition += cameraRight * position.x * instanceSize.x;
        worldPosition.y += position.y * instanceSize.y;
        vUv = uv;
        vTint = instanceTint;
        vViewerDistance = distance(instancePosition.xz, uViewerPosition);
        vec4 mvPosition = viewMatrix * vec4(worldPosition, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #ifdef USE_FOG
          vFogDepth = -mvPosition.z;
        #endif
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vTint;
      varying float vViewerDistance;
      uniform float uNearDistance;
      uniform float uFadeWidth;
      uniform float uViewDistance;
      uniform float uEdgeFade;
      #include <fog_pars_fragment>

      float ditherThreshold(vec2 pixel) {
        return fract(52.9829189 * fract(dot(floor(pixel), vec2(0.06711056, 0.00583715))));
      }

      void main() {
        float localX = abs(vUv.x - 0.5) * 2.0;
        float crownWidth = mix(0.72, 0.025, smoothstep(0.14, 1.0, vUv.y));
        crownWidth *= 0.90 + sin(vUv.y * 28.0) * 0.10;
        float crown = 1.0 - step(crownWidth, localX);
        float trunk = (1.0 - step(0.12, localX)) * (1.0 - step(0.24, vUv.y));
        float silhouette = max(crown * step(0.12, vUv.y), trunk);
        float nearFade = smoothstep(
          uNearDistance - uFadeWidth,
          uNearDistance,
          vViewerDistance
        );
        float farFade = 1.0 - smoothstep(
          uViewDistance - uEdgeFade,
          uViewDistance,
          vViewerDistance
        );
        float visibility = silhouette * nearFade * farFade;

        if (visibility < ditherThreshold(gl_FragCoord.xy)) discard;
        gl_FragColor = vec4(vTint, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
    fog: true,
    side: THREE.DoubleSide,
    depthWrite: true,
    transparent: false,
  });
}
