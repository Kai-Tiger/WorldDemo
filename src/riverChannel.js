import * as THREE from 'three';
import { createFlowingRiverMaterial } from './flowingRiverMaterial.js';
import {
  compileRiverNetwork,
  isInRiverNetworkVegetationExclusion,
} from './hydrology/riverNetwork.js';
import { createRiverNetworkWaterGeometry } from './hydrology/riverNetworkWaterGeometry.js';
import {
  HERO_RIVER_NETWORK_DEFINITION,
  TERMINAL_LOWLAND_LAKE,
  getHeroRiverCorridorFrame,
} from './lowlandHeightPlan.js';
import { WATER_RENDER_ORDER } from './waterContext.js';

export const RIVER_TERMINAL_LAKE = TERMINAL_LOWLAND_LAKE;
export const RIVER_BED_TEXTURE_PATH = '/assets/terrain/river-bed.webp';
export const RIVER_BED_TEXTURE_WORLD_SIZE = 12;
export const RIVER_BANK_TEXTURE_PATH = '/assets/terrain/river-bank-rock-wet-light-alt.webp';
export const RIVER_BANK_TEXTURE_WORLD_SIZE = 3.8;
export const HERO_RIVER_NETWORK = compileRiverNetwork(HERO_RIVER_NETWORK_DEFINITION);

const HERO_RIVER_SURFACE_OFFSET = RIVER_TERMINAL_LAKE.surfaceOffset;
const MAIN_RIVER_LENGTH = HERO_RIVER_NETWORK.reaches
  .filter((reach) => reach.role === 'main')
  .reduce((length, reach) => length + reach.length, 0);

export async function loadRiverTextures() {
  const loader = new THREE.TextureLoader();
  const riverBank = await loader.loadAsync(RIVER_BANK_TEXTURE_PATH);

  riverBank.wrapS = THREE.RepeatWrapping;
  riverBank.wrapT = THREE.RepeatWrapping;
  riverBank.colorSpace = THREE.SRGBColorSpace;

  return { riverBank };
}

export function applyRiverChannel(baseHeight, x, z) {
  return baseHeight;
}

export function getRiverMaterialMask(baseHeight, x, z) {
  return getRiverMaterialFrame(baseHeight, x, z).riverMask;
}

export function getRiverBedMaterialMask(baseHeight, x, z) {
  return getRiverMaterialFrame(baseHeight, x, z).riverBedMask;
}

export function getRiverMaterialFrame(baseHeight, x, z) {
  const frame = getHeroRiverCorridorFrame(baseHeight, x, z);

  if (!frame) return createEmptyRiverMaterialFrame();

  return {
    riverMask: THREE.MathUtils.clamp(frame.wetBankMask, 0, 1),
    riverBedMask: THREE.MathUtils.clamp(frame.bedMask, 0, 1),
    riverUnderwaterMask: THREE.MathUtils.clamp(frame.underwaterMask, 0, 1),
    riverGravelMask: THREE.MathUtils.clamp(frame.gravelBankMask, 0, 1),
    riverDistance: frame.networkDistance,
    riverLateral: frame.lateralM,
  };
}

export function createRiverWaterMesh(terrain) {
  const { geometry, stats } = createRiverNetworkWaterGeometry(HERO_RIVER_NETWORK, terrain);
  const positions = geometry.getAttribute('position');
  const waterDepths = geometry.getAttribute('waterDepth');

  geometry.translate(0, HERO_RIVER_SURFACE_OFFSET, 0);
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    waterDepths.setX(vertex, Math.max(
      positions.getY(vertex) - terrain.getHeightAt(positions.getX(vertex), positions.getZ(vertex)),
      0,
    ));
  }
  waterDepths.needsUpdate = true;

  const mesh = new THREE.Mesh(geometry, createFlowingRiverMaterial());

  mesh.name = 'RiverWater';
  mesh.renderOrder = WATER_RENDER_ORDER.surface;
  mesh.userData.waterReflectionModeCap = 1;
  mesh.userData.riverNetworkStats = stats;

  return mesh;
}

export function getRiverWaterGeometryMaxDistance() {
  return MAIN_RIVER_LENGTH;
}

export function createWetBankMesh() {
  const group = new THREE.Group();

  group.name = 'RiverWetBanks';
  return group;
}

export function updateRiverVisuals(water, wetBanks, camera, elapsedTime) {
  if (water?.material?.uniforms) {
    water.material.uniforms.uTime.value = elapsedTime;
    water.material.uniforms.uCameraPosition.value.copy(camera.position);
  }

  for (const bank of wetBanks?.children ?? []) {
    if (bank.material?.uniforms) bank.material.uniforms.uTime.value = elapsedTime;
  }
}

export function isInRiverGrassExclusion(x, z, buffer = 2) {
  return isInRiverNetworkVegetationExclusion(x, z, buffer, HERO_RIVER_NETWORK);
}

function createEmptyRiverMaterialFrame() {
  return {
    riverMask: 0,
    riverBedMask: 0,
    riverUnderwaterMask: 0,
    riverGravelMask: 0,
    riverDistance: 0,
    riverLateral: 0,
  };
}
