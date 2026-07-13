import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import * as THREE from 'three';
import { getGoldenShotFromLocation, listGoldenShotNames } from '../src/goldenShots.js';
import { compileRiverNetwork } from '../src/hydrology/riverNetwork.js';
import { createRiverNetworkWaterGeometry } from '../src/hydrology/riverNetworkWaterGeometry.js';
import { createRiverWaterMesh, RIVER_TERMINAL_LAKE } from '../src/riverChannel.js';
import {
  LOWLAND_HILLS,
  LOWLAND_LAKES,
  LOWLAND_STREAM_DEFINITION,
  LOWLAND_STREAM_DEFINITIONS,
  LOWLAND_STREAM_NETWORK,
  LOWLAND_STREAM_NETWORKS,
  LOWLAND_STREAM_PLAN,
  applyLowlandHillsTerrain,
  applyLowlandMacroTerrain,
  applyLowlandWaterTerrain,
  createLowlandLakeGeometry,
  getLowlandStreamGrassAcceptance,
  getLowlandMaterialFrame,
  getLowlandMinimumSegmentsForBounds,
  isInLowlandVegetationExclusion,
} from '../src/lowlandLandforms.js';
import {
  createWaterSystem,
  getWaterSystemMaterialFrame,
  isInWaterSystemVegetationExclusion,
} from '../src/waterSystem.js';
import { createSmallLakes } from '../src/smallLakes.js';
import { Terrain } from '../src/terrain.js';
import { isPreciseWaterHeightCode } from '../src/terrainHeightEncoding.js';
import {
  HERO_RIVER_NETWORK_DEFINITION,
  PLUNGE_POOL,
  SOUTHERN_LOWLAND_LAKES,
  TERMINAL_LOWLAND_LAKE,
  getHeroRiverTerrainTarget,
} from '../src/lowlandHeightPlan.js';

const MAP_MIN = -1024;
const CHUNK_SIZE = 256;

test('lowland definitions cover the east, north, and south watersheds with frozen hill groups', () => {
  assert.equal(Object.isFrozen(LOWLAND_HILLS), true);
  assert.equal(Object.isFrozen(LOWLAND_LAKES), true);
  assert.equal(Object.isFrozen(LOWLAND_STREAM_DEFINITION), true);
  assert.equal(Object.isFrozen(LOWLAND_STREAM_DEFINITIONS), true);
  assert.equal(LOWLAND_HILLS.length, 28);
  assert.equal(LOWLAND_LAKES.length, 3);
  assert.equal(LOWLAND_STREAM_DEFINITIONS.length, 3);
  assert.equal(LOWLAND_STREAM_DEFINITION.reaches.length, 1);
  assert.equal(LOWLAND_STREAM_PLAN.reaches.length, 5);
  assert.equal(LOWLAND_STREAM_NETWORK.definition, LOWLAND_STREAM_DEFINITION);

  const pond = LOWLAND_LAKES.find((lake) => lake.cx === 820 && lake.cz === -260);
  const northWestLake = LOWLAND_LAKES.find((lake) => lake.cx === -520 && lake.cz === 720);
  const northEastLake = LOWLAND_LAKES.find((lake) => lake.cx === -120 && lake.cz === 800);
  const reach = LOWLAND_STREAM_DEFINITION.reaches[0];

  assert.deepEqual([pond.cx, pond.cz, pond.waterLevel], [820, -260, 3.2]);
  assert.deepEqual([northWestLake.waterLevel, northEastLake.waterLevel], [3.5, 2]);
  assert.ok(pond.maxDepth >= 2.8);
  assert.deepEqual(reach.points[0], [820, -260]);
  assert.deepEqual(reach.points.at(-1), [690, -340]);
  assert.equal(reach.waterLevels[0], pond.waterLevel);
  assert.equal(reach.waterLevels.at(-1), 1.6);
  assert.deepEqual(reach.waterLevels.slice(0, 3), Array(3).fill(pond.waterLevel));
  assert.deepEqual(reach.waterLevels.slice(-2), Array(2).fill(1.6));
  assert.notEqual(pond.radiusX, pond.radiusZ);

  for (const definition of LOWLAND_STREAM_DEFINITIONS) {
    for (const currentReach of definition.reaches) {
      for (let index = 1; index < currentReach.waterLevels.length; index += 1) {
        assert.ok(currentReach.waterLevels[index] <= currentReach.waterLevels[index - 1]);
      }
    }
  }

  const regions = new Set(LOWLAND_HILLS.map((hill) => hill.id.split('-')[0]));

  assert.ok(regions.size >= 3);
  assert.ok(LOWLAND_HILLS.every((hill) => Object.isFrozen(hill)));
  assert.ok(LOWLAND_HILLS.some((hill) => hill.radiusX > hill.radiusZ * 1.5));
  assert.ok(LOWLAND_HILLS.some((hill) => hill.radiusZ > hill.radiusX * 1.4));
});

test('singular lowland stream definition remains directly compilable as the east basin', () => {
  const compiled = compileRiverNetwork(LOWLAND_STREAM_DEFINITION);

  assert.equal(LOWLAND_STREAM_DEFINITION.id, 'east-lowland-basin');
  assert.equal(compiled.definition, LOWLAND_STREAM_DEFINITION);
  assert.deepEqual(compiled.reaches.map((reach) => reach.id), ['east-meadow-outlet']);
  assert.deepEqual(LOWLAND_STREAM_NETWORK.reaches.map((reach) => reach.id), [
    'east-meadow-outlet',
  ]);
});

test('all three compiled lowland watersheds descend continuously', () => {
  assert.equal(LOWLAND_STREAM_NETWORKS.length, 3);

  for (const network of LOWLAND_STREAM_NETWORKS) {
    for (const reach of network.reaches) {
      let previousLevel = Infinity;

      for (const sample of reach.samples) {
        assert.ok(sample.waterLevel <= previousLevel + 1e-8);
        previousLevel = sample.waterLevel;
      }
    }
  }
});

test('runtime lowland terrain helpers leave the baked height unchanged', () => {
  const baseHeight = 11.25;
  const points = [
    ...LOWLAND_HILLS.map((hill) => ({ x: hill.cx, z: hill.cz })),
    ...LOWLAND_LAKES.map((lake) => ({ x: lake.cx, z: lake.cz })),
    ...LOWLAND_STREAM_PLAN.reaches.flatMap((reach) => (
      reach.points.map(([x, z]) => ({ x, z }))
    )),
  ];

  for (const point of points) {
    assert.equal(applyLowlandHillsTerrain(baseHeight, point.x, point.z), baseHeight);
    assert.equal(applyLowlandWaterTerrain(baseHeight, point.x, point.z), baseHeight);
    assert.equal(applyLowlandMacroTerrain(baseHeight, point.x, point.z), baseHeight);
  }
});

test('pond terrain, masks, geometry, and vegetation share one irregular boundary', () => {
  const pond = LOWLAND_LAKES[0];
  const centerHeight = applyLowlandWaterTerrain(7, pond.cx, pond.cz);
  const streamFrame = getLowlandMaterialFrame(758, -296);
  const northStreamFrame = getLowlandMaterialFrame(-350, 765);
  const southStreamFrame = getLowlandMaterialFrame(690, -620);
  const pondFrame = getLowlandMaterialFrame(pond.cx, pond.cz);
  const northLakeFrame = getLowlandMaterialFrame(-520, 720);

  assert.equal(centerHeight, 7);
  assert.equal(applyLowlandWaterTerrain(9, 0, 0), 9);
  assert.ok(pondFrame.lakeBedMask > 0.99);
  assert.ok(northLakeFrame.lakeBedMask > 0.99);
  assert.ok(streamFrame.bedMask > 0.99);
  assert.ok(northStreamFrame.bedMask > 0.99);
  assert.ok(southStreamFrame.bedMask > 0.99);
  assert.equal(getLowlandMaterialFrame(0, 0).bedMask, 0);
  assert.equal(getLowlandMaterialFrame(690, -340).bedMask, 0);
  assert.equal(applyLowlandWaterTerrain(0, 690, -340), 0);
  assert.equal(isInLowlandVegetationExclusion(pond.cx, pond.cz), true);
  assert.equal(isInLowlandVegetationExclusion(758, -296), true);
  assert.equal(isInLowlandVegetationExclusion(-350, 765), true);
  assert.equal(isInLowlandVegetationExclusion(690, -620), true);
  assert.equal(isInLowlandVegetationExclusion(0, 0), false);

  const geometry = createLowlandLakeGeometry(pond, {
    getHeightAt: () => pond.waterLevel - pond.maxDepth,
  });
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const depths = geometry.getAttribute('lakeDepth');
  const outerStart = positions.count - 72;
  const halfRadiusStart = 1 + 5 * 72;
  const radii = [];

  assert.equal(positions.count, 865);
  assert.equal(geometry.index.count / 3, 1656);
  assert.ok(geometry.getAttribute('lakeDepth'));
  assert.ok(geometry.getAttribute('lakeEdge'));
  assert.ok(geometry.getAttribute('lakeBedVisibility'));
  assert.ok(depths.getX(0) >= 2.79);
  assert.ok(depths.getX(halfRadiusStart) >= 2.79);

  for (let vertex = 0; vertex < normals.count; vertex += 1) {
    assert.ok(normals.getY(vertex) > 0.999);
  }
  for (let vertex = outerStart; vertex < positions.count; vertex += 1) {
    radii.push(Math.hypot(
      positions.getX(vertex) - pond.cx,
      positions.getZ(vertex) - pond.cz,
    ));
  }

  assert.ok(Math.max(...radii) - Math.min(...radii) > 8);
  geometry.dispose();
});

test('lowland grass acceptance protects every lake and stream without changing tree exclusions', () => {
  for (const lake of [...LOWLAND_LAKES, ...SOUTHERN_LOWLAND_LAKES]) {
    assert.equal(getLowlandStreamGrassAcceptance(lake.cx, lake.cz), 0);
  }

  for (const lake of SOUTHERN_LOWLAND_LAKES) {
    const phase = lake.phase ?? 0;
    const shapeScale = 1 + (lake.shapeAmp ?? 0) * (
      Math.sin(phase) * 0.5
      + Math.sin(-phase * 0.7) * 0.3
      + Math.sin(phase * 1.3) * 0.2
    );
    const protectedShoreX = lake.cx
      + shapeScale * ((lake.radiusX ?? lake.radius) + lake.shoreWidth + 3.9);
    const restoredShoreX = lake.cx
      + shapeScale * ((lake.radiusX ?? lake.radius) + lake.shoreWidth + 4.1);

    assert.equal(getLowlandStreamGrassAcceptance(protectedShoreX, lake.cz), 0);
    assert.equal(getLowlandStreamGrassAcceptance(restoredShoreX, lake.cz), 1);
  }

  for (const network of LOWLAND_STREAM_NETWORKS) {
    const sample = network.reaches[0].samples[Math.floor(network.reaches[0].samples.length / 2)];

    assert.equal(getLowlandStreamGrassAcceptance(sample.point.x, sample.point.z), 0);
  }

  assert.equal(getLowlandStreamGrassAcceptance(0, 0), 1);
  assert.equal(isInLowlandVegetationExclusion(758, -296), true);
  assert.equal(isInLowlandVegetationExclusion(0, 0), false);
});

test('lowland LOD promotes every lake and stream locally without filling unrelated gaps', () => {
  for (const lake of LOWLAND_LAKES) {
    assert.equal(getLowlandMinimumSegmentsForBounds(getChunkBounds(lake.cx, lake.cz)), 256);
  }

  for (const reach of LOWLAND_STREAM_PLAN.reaches) {
    const midpoint = reach.points[Math.floor(reach.points.length / 2)];

    assert.equal(getLowlandMinimumSegmentsForBounds(getChunkBounds(...midpoint)), 256);
  }

  assert.equal(getLowlandMinimumSegmentsForBounds({
    minX: -256,
    maxX: 0,
    minZ: 0,
    maxZ: 256,
  }), 0);
});

test('water system batches three bounded watersheds through the shared river material pipeline', () => {
  const system = createWaterSystem({ getHeightAt: () => -4 });
  const {
    stream, streams, lakes, group,
  } = system.lowlands;
  const waterFrame = getWaterSystemMaterialFrame(0, 820, -260);
  const { geometry, stats } = createRiverNetworkWaterGeometry(LOWLAND_STREAM_NETWORK);

  assert.equal(group.name, 'LowlandWaterFeatures');
  assert.equal(stream.name, 'LowlandStreamSurface');
  assert.equal(streams.length, 1);
  assert.equal(lakes.length, 3);
  assert.equal(lakes[0].name, 'LowlandLake_east-meadow-pond');
  assert.equal(group.children.length, 4);
  assert.ok(streams.every((mesh) => mesh.userData.waterReflectionModeCap === 1));
  assert.equal(
    streams.reduce((total, mesh) => total + mesh.userData.riverNetworkStats.reachCount, 0),
    5,
  );
  assert.ok(streams.every((mesh) => mesh.userData.riverNetworkStats.triangleCount < 6000));
  assert.ok(stats.triangleCount > 0 && stats.triangleCount < 1000);
  assert.ok(waterFrame.lakeBedMask > 0.99);
  assert.equal(isInWaterSystemVegetationExclusion(820, -260), true);
  assert.match(stream.material.vertexShader, /attribute float junctionMask/);
  assertStreamHiddenInsideLake(stream, -520, 720);
  assertStreamHiddenInsideLake(stream, -120, 800);
  assertStreamHiddenInsideLake(stream, 755, -657);
  assertStreamHiddenInsideLake(stream, 717, -751);

  const positions = stream.geometry.getAttribute('position');
  const waterFades = stream.geometry.getAttribute('waterFade');
  const waterEdges = stream.geometry.getAttribute('waterEdge');
  const pond = LOWLAND_LAKES[0];
  let maximumInnerFade = 0;
  let maximumPondInnerFade = 0;
  let inletOverlapVisible = false;
  let pondShore = null;
  let terminalShore = null;

  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    const distance = Math.hypot(
      positions.getX(vertex) - 690,
      positions.getZ(vertex) + 340,
    );

    if (distance < 12) maximumInnerFade = Math.max(maximumInnerFade, waterFades.getX(vertex));
    if (distance >= 20 && distance <= 23 && waterFades.getX(vertex) > 0.8) {
      inletOverlapVisible = true;
    }

    const pondDistance = Math.hypot(
      positions.getX(vertex) - pond.cx,
      positions.getZ(vertex) - pond.cz,
    );

    if (pondDistance < 12) {
      maximumPondInnerFade = Math.max(maximumPondInnerFade, waterFades.getX(vertex));
    }
    if (waterEdges.getX(vertex) < 0.999) continue;

    pondShore = getCloserWaterVertex(pondShore, positions, waterFades, vertex, 795.46, -273.06);
    terminalShore = getCloserWaterVertex(
      terminalShore,
      positions,
      waterFades,
      vertex,
      706.4,
      -328.55,
    );
  }

  assert.ok(maximumInnerFade < 1e-6);
  assert.ok(maximumPondInnerFade < 1e-6);
  assert.equal(inletOverlapVisible, true);
  assert.ok(pondShore.fade > 0.25 && pondShore.fade < 0.95);
  assert.ok(Math.abs(pondShore.y - (pond.waterLevel + pond.surfaceOffset)) < 0.01);
  assert.ok(Math.abs(
    terminalShore.y
      - (RIVER_TERMINAL_LAKE.waterLevel + RIVER_TERMINAL_LAKE.surfaceOffset),
  ) < 0.01);

  geometry.dispose();
  disposeSystem(system);
});

test('tracked bake keeps every visible lowland water surface above runtime terrain', async () => {
  const heightmapPath = fileURLToPath(new URL(
    '../public/assets/terrain/height.webp',
    import.meta.url,
  ));
  const { data, info } = await sharp(heightmapPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const texture = new THREE.Texture();
  const terrain = new Terrain(data, info.width, info.height, {
    rock: texture,
    rockNormal: texture,
    forestFloorBaseColor: texture,
    forestFloorNormal: texture,
    riverBank: texture,
    riverBed: texture,
    riverGravel: texture,
  });
  const system = createWaterSystem(terrain);
  const smallLakes = createSmallLakes(terrain);
  const mainRiver = createRiverWaterMesh(terrain);
  const reports = [
    ...system.lowlands.streams.flatMap((stream) => getStreamClearanceReports(stream, terrain)),
    ...system.lowlands.lakes.map((lake) => getLakeClearanceReport(lake, terrain)),
    ...smallLakes.children.map((lake) => getLakeClearanceReport(lake, terrain)),
    getMeshClearanceReport(mainRiver, terrain),
    getPlungePoolClearanceReport(terrain),
  ];
  const failures = reports.filter((report) => report.minimumClearance <= 0);
  const heroEdgeClearances = getHeroReachEdgeClearances(mainRiver, terrain);
  const heroJunctionClearances = getHeroJunctionClearances(mainRiver, terrain);
  const maximumPreciseBoundaryStep = getMaximumHeroPreciseBoundaryHeightStep(
    data,
    info,
    terrain,
  );
  const confluenceSlopeSteps = getHeroConfluenceSlopeSteps(terrain);

  try {
    assert.ok(reports.every((report) => report.sampleCount > 0));
    assert.deepEqual(failures, [], failures.map((report) => (
      `${report.name}: ${report.minimumClearance.toFixed(3)}m`
    )).join(', '));
    assert.ok(heroEdgeClearances.length > 0);
    assert.ok(Math.min(...heroEdgeClearances) >= -0.1);
    assert.ok(Math.max(...heroEdgeClearances) <= 0.65);
    assert.ok(maximumPreciseBoundaryStep <= 0.75);
    assert.ok(confluenceSlopeSteps.every((step) => step <= 0.2));
    for (const report of heroJunctionClearances) {
      const confluence = HERO_RIVER_NETWORK_DEFINITION.confluences.find(
        (entry) => entry.id === report.nodeId,
      );
      const outgoing = HERO_RIVER_NETWORK_DEFINITION.reaches.find(
        (reach) => reach.id === confluence.outgoing,
      );
      const junctionDepth = Array.isArray(outgoing.depth) ? outgoing.depth[0] : outgoing.depth;

      assert.ok(
        report.minimumVisibleClearance >= 0.08,
        `${report.nodeId}: ${report.minimumVisibleClearance.toFixed(3)}m visible minimum`,
      );
      assert.ok(
        report.minimumBoundaryClearance >= -0.65,
        `${report.nodeId}: ${report.minimumBoundaryClearance.toFixed(3)}m boundary minimum`,
      );
      assert.ok(
        report.maximumVisibleClearance <= junctionDepth + 0.2,
        `${report.nodeId}: ${report.maximumVisibleClearance.toFixed(3)}m visible maximum`,
      );
    }
  } finally {
    disposeSystem(system);
    disposeMeshGroup(smallLakes);
    mainRiver.geometry.dispose();
    mainRiver.material.dispose();
    terrain.dispose();
    texture.dispose();
  }
});

function getHeroReachEdgeClearances(mesh, terrain) {
  const positions = mesh.geometry.getAttribute('position');
  const waterFades = mesh.geometry.getAttribute('waterFade');
  const clearances = [];

  for (const reach of mesh.userData.riverNetworkStats.reaches) {
    for (let row = 0; row < reach.rowCount; row += 1) {
      const rowStart = reach.startVertex + row * reach.rowSize;

      for (const vertex of [rowStart, rowStart + reach.rowSize - 1]) {
        if (waterFades.getX(vertex) < 0.99) continue;

        const x = positions.getX(vertex);
        const z = positions.getZ(vertex);
        const target = getHeroRiverTerrainTarget(0, x, z);
        const nearConfluence = HERO_RIVER_NETWORK_DEFINITION.confluences.some((confluence) => (
          Math.hypot(x - confluence.position[0], z - confluence.position[1])
            <= confluence.poolRadius + 1
        ));
        const insideTerminalLake = Math.hypot(
          x - TERMINAL_LOWLAND_LAKE.cx,
          z - TERMINAL_LOWLAND_LAKE.cz,
        ) <= TERMINAL_LOWLAND_LAKE.radius + 3;
        const insidePlungePool = Math.hypot(x - PLUNGE_POOL.cx, z - PLUNGE_POOL.cz)
          <= PLUNGE_POOL.radius + 3;

        if (
          target?.featureId !== reach.id
          || nearConfluence
          || insideTerminalLake
          || insidePlungePool
        ) continue;
        clearances.push(positions.getY(vertex) - terrain.getHeightAt(x, z));
      }
    }
  }

  return clearances;
}

function getHeroJunctionClearances(mesh, terrain) {
  const positions = mesh.geometry.getAttribute('position');
  const shoreDistances = mesh.geometry.getAttribute('shoreDistance');
  const indices = mesh.geometry.index.array;

  return mesh.userData.riverNetworkStats.junctions.map((junction) => {
    let minimumVisibleClearance = Infinity;
    let maximumVisibleClearance = -Infinity;
    let minimumBoundaryClearance = Infinity;
    const endVertex = junction.firstPatchVertex + junction.patchVertexCount;
    const addSample = (x, y, z, shoreDistance) => {
      const clearance = y - terrain.getHeightAt(x, z);

      if (shoreDistance >= 0.85) {
        minimumVisibleClearance = Math.min(minimumVisibleClearance, clearance);
        maximumVisibleClearance = Math.max(maximumVisibleClearance, clearance);
      } else {
        minimumBoundaryClearance = Math.min(minimumBoundaryClearance, clearance);
      }
    };

    for (let vertex = junction.firstPatchVertex; vertex < endVertex; vertex += 1) {
      addSample(
        positions.getX(vertex),
        positions.getY(vertex),
        positions.getZ(vertex),
        shoreDistances.getX(vertex),
      );
    }

    for (
      let offset = junction.startIndex;
      offset < junction.startIndex + junction.indexCount;
      offset += 3
    ) {
      const a = indices[offset];
      const b = indices[offset + 1];
      const c = indices[offset + 2];
      const subdivisions = 20;

      for (let row = 0; row <= subdivisions; row += 1) {
        for (let column = 0; column <= subdivisions - row; column += 1) {
          const aWeight = row / subdivisions;
          const bWeight = column / subdivisions;
          const cWeight = 1 - aWeight - bWeight;

          addSample(
            positions.getX(a) * aWeight
              + positions.getX(b) * bWeight
              + positions.getX(c) * cWeight,
            positions.getY(a) * aWeight
              + positions.getY(b) * bWeight
              + positions.getY(c) * cWeight,
            positions.getZ(a) * aWeight
              + positions.getZ(b) * bWeight
              + positions.getZ(c) * cWeight,
            shoreDistances.getX(a) * aWeight
              + shoreDistances.getX(b) * bWeight
              + shoreDistances.getX(c) * cWeight,
          );
        }
      }
    }

    return {
      nodeId: junction.nodeId,
      minimumVisibleClearance,
      maximumVisibleClearance,
      minimumBoundaryClearance,
    };
  });
}

function getMaximumHeroPreciseBoundaryHeightStep(data, info, terrain) {
  const toPixel = (x, z) => ({
    x: Math.round((x - MAP_MIN) / (Math.abs(MAP_MIN) * 2) * (info.width - 1)),
    y: Math.round((1 - (z - MAP_MIN) / (Math.abs(MAP_MIN) * 2)) * (info.height - 1)),
  });
  const minimum = toPixel(500, -250);
  const maximum = toPixel(720, -430);
  let maximumStep = 0;

  for (let y = minimum.y; y <= maximum.y; y += 1) {
    for (let x = minimum.x; x <= maximum.x; x += 1) {
      const index = (y * info.width + x) * 4;
      const precise = isPreciseWaterHeightCode(data[index], data[index + 2]);

      for (const [offsetX, offsetY] of [[1, 0], [0, 1]]) {
        const neighborIndex = ((y + offsetY) * info.width + x + offsetX) * 4;
        const neighborPrecise = isPreciseWaterHeightCode(
          data[neighborIndex],
          data[neighborIndex + 2],
        );

        if (precise === neighborPrecise) continue;

        const point = terrain.heightMapPixelToWorld(x, y);
        const neighbor = terrain.heightMapPixelToWorld(x + offsetX, y + offsetY);

        maximumStep = Math.max(
          maximumStep,
          Math.abs(
            terrain.getHeightAt(point.x, point.z)
              - terrain.getHeightAt(neighbor.x, neighbor.z),
          ),
        );
      }
    }
  }

  return maximumStep;
}

function getHeroConfluenceSlopeSteps(terrain) {
  return HERO_RIVER_NETWORK_DEFINITION.confluences.map((confluence) => {
    let maximumStep = 0;

    for (let angleIndex = 0; angleIndex < 72; angleIndex += 1) {
      const angle = angleIndex / 72 * Math.PI * 2;

      for (let radius = confluence.poolRadius; radius < confluence.poolRadius + 5.25; radius += 0.1) {
        const nextRadius = radius + 0.1;
        const height = terrain.getHeightAt(
          confluence.position[0] + Math.cos(angle) * radius,
          confluence.position[1] + Math.sin(angle) * radius,
        );
        const nextHeight = terrain.getHeightAt(
          confluence.position[0] + Math.cos(angle) * nextRadius,
          confluence.position[1] + Math.sin(angle) * nextRadius,
        );

        maximumStep = Math.max(maximumStep, Math.abs(nextHeight - height));
      }
    }

    return maximumStep;
  });
}

test('north, east, and south lowlands have deterministic overview cameras', () => {
  const names = listGoldenShotNames();
  const creek = getGoldenShotFromLocation({ search: '?shot=lowland-creek' });
  const lake = getGoldenShotFromLocation({ search: '?shot=lowland-lake' });
  const hills = getGoldenShotFromLocation({ search: '?shot=lowland-hills' });
  const north = getGoldenShotFromLocation({ search: '?shot=lowland-north-overview' });
  const east = getGoldenShotFromLocation({ search: '?shot=lowland-east-overview' });
  const south = getGoldenShotFromLocation({ search: '?shot=lowland-south-overview' });
  const riverOverhead = getGoldenShotFromLocation({ search: '?shot=river-reference-overhead' });
  const riverJunctions = getGoldenShotFromLocation({ search: '?shot=river-junctions-overhead' });
  const riverBank = getGoldenShotFromLocation({ search: '?shot=river-reference-bank' });
  const riverFlow = getGoldenShotFromLocation({ search: '?shot=river-reference-flow' });

  assert.ok(names.includes('lowland-creek'));
  assert.ok(names.includes('lowland-lake'));
  assert.ok(names.includes('lowland-hills'));
  assert.ok(names.includes('lowland-north-overview'));
  assert.ok(names.includes('lowland-east-overview'));
  assert.ok(names.includes('lowland-south-overview'));
  assert.ok(names.includes('river-reference-overhead'));
  assert.ok(names.includes('river-junctions-overhead'));
  assert.ok(names.includes('river-reference-bank'));
  assert.ok(names.includes('river-reference-flow'));
  assert.deepEqual(creek.target, { x: 735, z: -308, y: 2.395 });
  assert.deepEqual(lake.target, { x: 820, z: -260, y: 3.245 });
  assert.deepEqual(hills.target, { x: -650, z: 510, y: 16.1 });
  assert.deepEqual(north.target, { x: -320, z: 760, y: 4 });
  assert.deepEqual(east.target, { x: 755, z: -310, y: 3 });
  assert.deepEqual(south.target, { x: 750, z: -680, y: 3 });
  assert.deepEqual(riverOverhead.camera, { x: 570, z: -515, y: 105 });
  assert.deepEqual(riverJunctions.target, { x: 604, z: -343, y: 2.2 });
  assert.deepEqual(riverBank.target, { x: 620, z: -345, y: 2.5 });
  assert.deepEqual(riverFlow.camera, { x: 505, z: -385, y: 6 });
});

function disposeSystem(system) {
  const geometries = new Set();
  const materials = new Set();

  system.group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) materials.add(object.material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function disposeMeshGroup(group) {
  const materials = new Set();

  group.traverse((object) => {
    object.geometry?.dispose();
    if (object.material) materials.add(object.material);
  });
  materials.forEach((material) => material.dispose());
}

function getStreamClearanceReports(stream, terrain) {
  const positions = stream.geometry.getAttribute('position');
  const waterFades = stream.geometry.getAttribute('waterFade');

  return stream.userData.riverNetworkStats.reaches.map((reach) => {
    let minimumClearance = Infinity;
    let sampleCount = 0;

    for (let row = 0; row < reach.rowCount; row += 1) {
      const rowStart = reach.startVertex + row * reach.rowSize;
      const leftCenter = rowStart + Math.floor((reach.rowSize - 1) * 0.5);
      const rightCenter = rowStart + Math.ceil((reach.rowSize - 1) * 0.5);
      const waterFade = (waterFades.getX(leftCenter) + waterFades.getX(rightCenter)) * 0.5;

      if (waterFade <= 0.05) continue;

      const x = (positions.getX(leftCenter) + positions.getX(rightCenter)) * 0.5;
      const z = (positions.getZ(leftCenter) + positions.getZ(rightCenter)) * 0.5;
      const waterHeight = (positions.getY(leftCenter) + positions.getY(rightCenter)) * 0.5;

      minimumClearance = Math.min(minimumClearance, waterHeight - terrain.getHeightAt(x, z));
      sampleCount += 1;
    }

    return { name: reach.id, minimumClearance, sampleCount };
  });
}

function getLakeClearanceReport(lake, terrain) {
  const positions = lake.geometry.getAttribute('position');
  const lakeEdges = lake.geometry.getAttribute('lakeEdge');
  let minimumClearance = Infinity;
  let sampleCount = 0;

  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    if (lakeEdges.getX(vertex) < 0.1) continue;

    minimumClearance = Math.min(
      minimumClearance,
      positions.getY(vertex) - terrain.getHeightAt(
        positions.getX(vertex),
        positions.getZ(vertex),
      ),
    );
    sampleCount += 1;
  }

  return { name: lake.name, minimumClearance, sampleCount };
}

function getMeshClearanceReport(mesh, terrain) {
  const positions = mesh.geometry.getAttribute('position');
  const waterEdges = mesh.geometry.getAttribute('waterEdge');
  const waterFades = mesh.geometry.getAttribute('waterFade');
  let minimumClearance = Infinity;
  let sampleCount = 0;

  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    if (waterEdges.getX(vertex) <= 0.01 || waterFades.getX(vertex) <= 0.01) continue;

    const clearance = positions.getY(vertex) - terrain.getHeightAt(
      positions.getX(vertex),
      positions.getZ(vertex),
    );

    minimumClearance = Math.min(minimumClearance, clearance);
    sampleCount += 1;
  }

  return { name: mesh.name, minimumClearance, sampleCount };
}

function getPlungePoolClearanceReport(terrain) {
  let minimumClearance = Infinity;
  let sampleCount = 0;

  for (let ring = 0; ring <= 9; ring += 1) {
    const radius = ring / 10 * PLUNGE_POOL.radius;

    for (let segment = 0; segment < 48; segment += 1) {
      const angle = segment / 48 * Math.PI * 2;
      const x = PLUNGE_POOL.cx + Math.cos(angle) * radius;
      const z = PLUNGE_POOL.cz + Math.sin(angle) * radius;

      minimumClearance = Math.min(
        minimumClearance,
        PLUNGE_POOL.waterLevel - terrain.getHeightAt(x, z),
      );
      sampleCount += 1;
    }
  }

  return { name: PLUNGE_POOL.id, minimumClearance, sampleCount };
}

function getCloserWaterVertex(current, positions, waterFades, vertex, x, z) {
  const distance = Math.hypot(positions.getX(vertex) - x, positions.getZ(vertex) - z);

  if (current && current.distance <= distance) return current;

  return {
    distance,
    fade: waterFades.getX(vertex),
    y: positions.getY(vertex),
  };
}

function assertStreamHiddenInsideLake(stream, x, z) {
  const positions = stream.geometry.getAttribute('position');
  const waterFades = stream.geometry.getAttribute('waterFade');
  let maximumFade = 0;
  let sampleCount = 0;

  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    if (Math.hypot(positions.getX(vertex) - x, positions.getZ(vertex) - z) > 4) continue;

    maximumFade = Math.max(maximumFade, waterFades.getX(vertex));
    sampleCount += 1;
  }

  assert.ok(sampleCount > 0);
  assert.ok(maximumFade < 1e-6);
}

function getChunkBounds(x, z) {
  const chunkX = Math.floor((x - MAP_MIN) / CHUNK_SIZE);
  const chunkZ = Math.floor((z - MAP_MIN) / CHUNK_SIZE);
  const minX = MAP_MIN + chunkX * CHUNK_SIZE;
  const minZ = MAP_MIN + chunkZ * CHUNK_SIZE;

  return {
    minX,
    maxX: minX + CHUNK_SIZE,
    minZ,
    maxZ: minZ + CHUNK_SIZE,
  };
}
