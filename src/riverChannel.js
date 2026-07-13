import * as THREE from 'three';
import { createFlowingRiverMaterial } from './flowingRiverMaterial.js';
import {
  compileRiverNetwork,
  getRiverBankGrassAcceptance,
  isInRiverNetworkVegetationExclusion,
} from './hydrology/riverNetwork.js';
import { createRiverNetworkWaterGeometry } from './hydrology/riverNetworkWaterGeometry.js';
import {
  HERO_RIVER_NETWORK_DEFINITION,
  TERMINAL_LOWLAND_LAKE,
  getHeroRiverConfluenceMask,
  getHeroRiverConfluenceMaterialFrame,
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
const HERO_RIVER_CONFLUENCES = HERO_RIVER_NETWORK_DEFINITION.nodes.filter(
  (node) => node.type === 'confluence',
);
const HERO_CONFLUENCE_SPARSE_ACCEPTANCE = 0.35;
const HERO_CONFLUENCE_RECOVERY_WIDTH = 2.5;
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
  const confluenceMask = getHeroRiverConfluenceMask(x, z);
  const confluenceFrame = getHeroRiverConfluenceMaterialFrame(x, z);
  const coordinateBlend = confluenceFrame?.mask ?? 0;

  if (!frame && confluenceMask <= 0) return createEmptyRiverMaterialFrame();

  return {
    riverMask: THREE.MathUtils.clamp(Math.max(frame?.wetBankMask ?? 0, confluenceMask), 0, 1),
    riverBedMask: THREE.MathUtils.clamp(Math.max(frame?.bedMask ?? 0, confluenceMask), 0, 1),
    riverUnderwaterMask: THREE.MathUtils.clamp(
      Math.max(frame?.underwaterMask ?? 0, confluenceMask),
      0,
      1,
    ),
    riverGravelMask: THREE.MathUtils.clamp(frame?.gravelBankMask ?? 0, 0, 1),
    riverDistance: THREE.MathUtils.lerp(
      frame?.networkDistance ?? confluenceFrame?.riverDistance ?? 0,
      confluenceFrame?.riverDistance ?? frame?.networkDistance ?? 0,
      coordinateBlend,
    ),
    riverLateral: THREE.MathUtils.lerp(
      frame?.lateralM ?? confluenceFrame?.riverLateral ?? 0,
      confluenceFrame?.riverLateral ?? frame?.lateralM ?? 0,
      coordinateBlend,
    ),
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

export function getRiverGrassAcceptance(x, z) {
  const lakeDistance = Math.hypot(
    x - RIVER_TERMINAL_LAKE.cx,
    z - RIVER_TERMINAL_LAKE.cz,
  );

  if (
    lakeDistance
    <= RIVER_TERMINAL_LAKE.radius + RIVER_TERMINAL_LAKE.shoreWidth + 4
  ) return 0;
  if (getHeroRiverConfluenceMask(x, z) > 0.02) return 0;

  const frame = getHeroRiverCorridorFrame(x, z);

  const bankAcceptance = frame
    ? getRiverBankGrassAcceptance({
      distance: frame.lateralDistance,
      halfWidth: frame.halfWidth,
      influence: frame.corridorOuter,
      wetBankWidth: frame.wetBankWidth,
      gravelBankWidth: frame.gravelBankWidth,
      hasAuthoredBankWidths: true,
    })
    : 1;

  return Math.min(bankAcceptance, getHeroConfluenceGrassAcceptance(x, z));
}

function getHeroConfluenceGrassAcceptance(x, z) {
  let acceptance = 1;

  for (const confluence of HERO_RIVER_CONFLUENCES) {
    const distance = Math.hypot(x - confluence.position[0], z - confluence.position[1]);
    const recovery = THREE.MathUtils.lerp(
      HERO_CONFLUENCE_SPARSE_ACCEPTANCE,
      1,
      THREE.MathUtils.smoothstep(
        distance,
        confluence.poolRadius,
        confluence.poolRadius + HERO_CONFLUENCE_RECOVERY_WIDTH,
      ),
    );

    acceptance = Math.min(acceptance, recovery);
  }

  return acceptance;
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
