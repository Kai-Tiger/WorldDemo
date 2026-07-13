import assert from 'node:assert/strict';
import test from 'node:test';
import { CatmullRomCurve3, Vector3 } from 'three';
import {
  HERO_RIVER_NETWORK_DEFINITION,
  LOWLAND_BAKE_COUNTS,
  LOWLAND_HEIGHT_SETTINGS,
  LOWLAND_HILLS,
  LOWLAND_LAKES,
  LOWLAND_STREAM_DEFINITION,
  LOWLAND_STREAM_DEFINITIONS,
  LOWLAND_STREAM_PLAN,
  MAIN_RIVER_CHANNEL,
  PLUNGE_POOL,
  SOUTHERN_LOWLAND_LAKES,
  TERMINAL_LOWLAND_LAKE,
  getBakedLowlandHeight,
  getHeroRiverConfluenceMask,
  getHeroRiverCorridorFrame,
  getHeroRiverTerrainTarget,
  getLowlandPlanStatistics,
  getLowlandTerrainHeight,
  getLowlandWaterTerrainTarget,
} from '../src/lowlandHeightPlan.js';
import {
  DEFAULT_SOURCE_PATH,
  bakeBlackLowlandsRaw,
  checkLowlandHeightmap,
  loadRawHeightmap,
} from '../tools/bake-black-lowlands.mjs';

test('shared lowland plan preserves ten hills and adds the locked regional counts', () => {
  assert.equal(Object.isFrozen(LOWLAND_HILLS), true);
  assert.equal(LOWLAND_HILLS.length, 28);
  assert.deepEqual(LOWLAND_BAKE_COUNTS, {
    hills: 28,
    preservedHills: 10,
    addedHills: 18,
    northAddedHills: 10,
    eastAddedHills: 2,
    southAddedHills: 6,
    lowlandLakes: 3,
    southernLakes: 4,
    streamBasins: 3,
    streamReaches: 5,
    heroRiverReaches: 5,
    heroRiverConfluences: 2,
    heroRiverDisturbances: 9,
  });

  const additions = LOWLAND_HILLS.filter((hill) => hill.region !== 'preserved');

  assert.ok(additions.every((hill) => hill.height >= 3.5 && hill.height <= 7));
  assert.ok(additions.every((hill) => (
    hill.radiusX >= 35 && hill.radiusX <= 80
    && hill.radiusZ >= 35 && hill.radiusZ <= 80
  )));
});

test('added hills avoid every authored lowland water body', () => {
  const additions = LOWLAND_HILLS.filter((hill) => hill.region !== 'preserved');
  const lakes = [
    ...LOWLAND_LAKES,
    ...SOUTHERN_LOWLAND_LAKES,
    TERMINAL_LOWLAND_LAKE,
    PLUNGE_POOL,
  ];

  for (const hill of additions) {
    const hillRadius = Math.max(hill.radiusX, hill.radiusZ) * (1 + hill.shapeAmp);

    for (const lake of lakes) {
      const lakeRadius = Math.max(lake.radiusX ?? lake.radius, lake.radiusZ ?? lake.radius)
        * (1 + (lake.shapeAmp ?? 0)) + (lake.shoreWidth ?? 0);
      const distance = Math.hypot(hill.cx - lake.cx, hill.cz - lake.cz);

      assert.ok(distance > hillRadius + lakeRadius, `${hill.id} overlaps ${lake.id}`);
    }

    for (let index = 0; index < 16; index += 1) {
      const angle = index / 16 * Math.PI * 2;
      const x = hill.cx + Math.cos(angle) * hill.radiusX * 0.5;
      const z = hill.cz + Math.sin(angle) * hill.radiusZ * 0.5;
      const water = getLowlandWaterTerrainTarget(getLowlandTerrainHeight(x, z), x, z);

      assert.equal(water, null, `${hill.id} inner footprint overlaps ${water?.featureId}`);
    }
  }
});

test('every added hill is centered in the fixed pure-black mask with an intact inner footprint', async () => {
  const source = await loadRawHeightmap(DEFAULT_SOURCE_PATH);
  const additions = LOWLAND_HILLS.filter((hill) => hill.region !== 'preserved');

  for (const hill of additions) {
    const cos = Math.cos(hill.rotation);
    const sin = Math.sin(hill.rotation);
    let innerPixels = 0;
    let innerBlackPixels = 0;

    for (let z = hill.cz - hill.radiusZ * 0.55; z <= hill.cz + hill.radiusZ * 0.55; z += 2) {
      for (let x = hill.cx - hill.radiusX * 0.55; x <= hill.cx + hill.radiusX * 0.55; x += 2) {
        const dx = x - hill.cx;
        const dz = z - hill.cz;
        const localX = dx * cos + dz * sin;
        const localZ = -dx * sin + dz * cos;

        if (Math.hypot(localX / hill.radiusX, localZ / hill.radiusZ) > 0.5) continue;

        const pixelX = Math.round(
          (x + LOWLAND_HEIGHT_SETTINGS.worldSize * 0.5)
          / LOWLAND_HEIGHT_SETTINGS.worldSize
          * (source.width - 1),
        );
        const pixelY = Math.round(
          (1 - (z + LOWLAND_HEIGHT_SETTINGS.worldSize * 0.5)
          / LOWLAND_HEIGHT_SETTINGS.worldSize)
          * (source.height - 1),
        );
        const offset = (pixelY * source.width + pixelX) * source.channels;

        innerPixels += 1;
        if (
          source.data[offset] === 0
          && source.data[offset + 1] === 0
          && source.data[offset + 2] === 0
        ) innerBlackPixels += 1;
      }
    }

    assert.ok(innerBlackPixels / innerPixels >= 0.98, `${hill.id} is clipped by the source mask`);
  }
});

test('three stream basins use the locked lake levels and never rise downstream', () => {
  assert.equal(Object.isFrozen(LOWLAND_STREAM_DEFINITIONS), true);
  assert.deepEqual(LOWLAND_STREAM_DEFINITIONS.map((basin) => basin.id), [
    'east-lowland-basin',
    'north-lowland-basin',
    'south-lowland-basin',
  ]);
  assert.deepEqual(LOWLAND_STREAM_DEFINITIONS.map((basin) => basin.reaches.length), [1, 1, 3]);

  const eastLevels = LOWLAND_STREAM_DEFINITIONS[0].reaches[0].waterLevels;
  const northLevels = LOWLAND_STREAM_DEFINITIONS[1].reaches[0].waterLevels;
  const southLevels = LOWLAND_STREAM_DEFINITIONS[2].reaches.map((reach) => [
    reach.waterLevels[0],
    reach.waterLevels.at(-1),
  ]);

  assert.deepEqual(eastLevels.slice(0, 3), [3.2, 3.2, 3.2]);
  assert.deepEqual(eastLevels.slice(-2), [1.6, 1.6]);
  assert.deepEqual([northLevels[0], northLevels.at(-1)], [3.5, 2]);
  assert.deepEqual(southLevels, [[3.5, 2.8], [3.2, 2.8], [2.8, 1.8]]);

  assert.equal(LOWLAND_STREAM_DEFINITION, LOWLAND_STREAM_DEFINITIONS[0]);
  assert.equal(LOWLAND_STREAM_PLAN.reaches.length, 5);

  for (const reach of [MAIN_RIVER_CHANNEL, ...LOWLAND_STREAM_PLAN.reaches]) {
    for (let index = 1; index < reach.waterLevels.length; index += 1) {
      assert.ok(
        reach.waterLevels[index] <= reach.waterLevels[index - 1],
        `${reach.id} rises downstream`,
      );
    }
  }
});

test('hero river is a frozen five-reach DAG with the locked confluences and profiles', () => {
  const network = HERO_RIVER_NETWORK_DEFINITION;
  const nodeById = new Map(network.nodes.map((node) => [node.id, node]));
  const incoming = new Map(network.nodes.map((node) => [node.id, []]));
  const outgoing = new Map(network.nodes.map((node) => [node.id, []]));

  assert.equal(Object.isFrozen(network), true);
  assert.equal(network.terminalLakeId, 'terminal-lake');
  assert.deepEqual(network.reaches.map((reach) => reach.id), [
    'hero-main-upper',
    'hero-main-middle',
    'hero-main-lower',
    'hero-west-tributary',
    'hero-east-tributary',
  ]);

  for (const reach of network.reaches) {
    const from = nodeById.get(reach.from);
    const to = nodeById.get(reach.to);

    assert.ok(from, `${reach.id} has no source node`);
    assert.ok(to, `${reach.id} has no target node`);
    assert.deepEqual(reach.points[0], from.position);
    assert.deepEqual(reach.points.at(-1), to.position);
    assert.equal(reach.waterLevels[0], from.waterLevel);
    assert.equal(reach.waterLevels.at(-1), to.waterLevel);
    incoming.get(reach.to).push(reach.id);
    outgoing.get(reach.from).push(reach.id);

    for (let index = 1; index < reach.waterLevels.length; index += 1) {
      assert.ok(reach.waterLevels[index] <= reach.waterLevels[index - 1]);
    }
  }

  assert.deepEqual(incoming.get('hero-j1').sort(), [
    'hero-main-upper',
    'hero-west-tributary',
  ]);
  assert.deepEqual(incoming.get('hero-j2').sort(), [
    'hero-east-tributary',
    'hero-main-middle',
  ]);
  assert.deepEqual(outgoing.get('hero-j1'), ['hero-main-middle']);
  assert.deepEqual(outgoing.get('hero-j2'), ['hero-main-lower']);
  assert.deepEqual(
    network.nodes.filter((node) => outgoing.get(node.id).length === 0).map((node) => node.id),
    ['terminal-lake'],
  );

  assert.deepEqual(network.confluences, [
    {
      id: 'hero-j1', position: [575, -336], waterLevel: 2.2,
      incoming: ['hero-main-upper', 'hero-west-tributary'], outgoing: 'hero-main-middle',
      poolRadius: 10,
    },
    {
      id: 'hero-j2', position: [633, -349], waterLevel: 1.88,
      incoming: ['hero-main-middle', 'hero-east-tributary'], outgoing: 'hero-main-lower',
      poolRadius: 12,
    },
  ]);

  const profiles = network.reaches.map((reach) => ({
    id: reach.id,
    width: reach.width,
    depth: reach.depth,
    wet: reach.wetBankWidth,
    gravel: reach.gravelBankWidth,
    blend: reach.terrainBlendWidth,
    flow: reach.flowSpeed,
  }));

  assert.deepEqual(profiles, [
    { id: 'hero-main-upper', width: [5.2, 7], depth: [0.8, 1], wet: [1.2, 1.8], gravel: [2, 8], blend: [5, 5], flow: [0.55, 0.75] },
    { id: 'hero-main-middle', width: [7, 8.2], depth: [1, 1.15], wet: [1.8, 2], gravel: [8, 10], blend: [5, 5], flow: [0.65, 0.8] },
    { id: 'hero-main-lower', width: [8.2, 6.4], depth: [1.15, 1], wet: [2, 1.5], gravel: [10, 6], blend: [5, 5], flow: [0.7, 0.55] },
    { id: 'hero-west-tributary', width: [2, 3.3], depth: [0.35, 0.65], wet: [0.7, 1.2], gravel: [3, 5], blend: [3, 3], flow: [0.75, 1] },
    { id: 'hero-east-tributary', width: [2.2, 3.6], depth: [0.4, 0.75], wet: [0.8, 1.3], gravel: [3.5, 5.5], blend: [3, 3], flow: [0.7, 1] },
  ]);
});

test('hero confluences keep three wet arms while leaving dry wedges between them', () => {
  for (const confluence of HERO_RIVER_NETWORK_DEFINITION.confluences) {
    const reaches = [...confluence.incoming, confluence.outgoing].map((id) => (
      HERO_RIVER_NETWORK_DEFINITION.reaches.find((reach) => reach.id === id)
    ));
    const directions = reaches.map((reach) => {
      const point = reach.to === confluence.id
        ? reach.points.at(-2)
        : reach.points[1];
      const dx = point[0] - confluence.position[0];
      const dz = point[1] - confluence.position[1];
      const length = Math.hypot(dx, dz);

      return { x: dx / length, z: dz / length, angle: Math.atan2(dz, dx) };
    }).sort((a, b) => a.angle - b.angle);
    const radius = confluence.poolRadius * 0.8;

    for (const direction of directions) {
      assert.ok(getHeroRiverConfluenceMask(
        confluence.position[0] + direction.x * radius,
        confluence.position[1] + direction.z * radius,
      ) > 0.8, `${confluence.id} must retain each river arm`);
    }

    let largestGap = null;

    for (let index = 0; index < directions.length; index += 1) {
      const start = directions[index].angle;
      const end = index === directions.length - 1
        ? directions[0].angle + Math.PI * 2
        : directions[index + 1].angle;

      if (!largestGap || end - start > largestGap.size) {
        largestGap = { start, size: end - start };
      }
    }

    const wedgeAngle = largestGap.start + largestGap.size * 0.5;

    assert.ok(getHeroRiverConfluenceMask(
      confluence.position[0] + Math.cos(wedgeAngle) * radius,
      confluence.position[1] + Math.sin(wedgeAngle) * radius,
    ) < 0.1, `${confluence.id} must not retain a circular pool between its arms`);
  }
});

test('hero river disturbances are fixed, sparse, and avoid both junction cores', () => {
  const nodeById = new Map(
    HERO_RIVER_NETWORK_DEFINITION.nodes.map((node) => [node.id, node]),
  );
  const expectedCounts = [3, 2, 1, 1, 2];
  const allowedModels = new Set(['rock_02.glb', 'rock_05.glb', 'rock_08.glb']);

  assert.deepEqual(
    HERO_RIVER_NETWORK_DEFINITION.reaches.map((reach) => reach.disturbances.length),
    expectedCounts,
  );

  for (const reach of HERO_RIVER_NETWORK_DEFINITION.reaches) {
    const length = createReachCurve(reach).getLength();
    const from = nodeById.get(reach.from);
    const to = nodeById.get(reach.to);

    for (let index = 0; index < reach.disturbances.length; index += 1) {
      const disturbance = reach.disturbances[index];

      assert.ok(disturbance.distanceM >= 0 && disturbance.distanceM <= length);
      assert.ok(disturbance.lateral >= -1 && disturbance.lateral <= 1);
      assert.ok(disturbance.radius > 0);
      assert.ok(disturbance.strength >= 0 && disturbance.strength <= 1);
      assert.ok(allowedModels.has(disturbance.model));
      assert.ok(disturbance.height >= 1.1 && disturbance.height <= 2);
      assert.ok(Number.isFinite(disturbance.yaw));
      const point = getReachPointAtDistance(reach, disturbance.distanceM);
      const centerFrame = getHeroRiverCorridorFrame(point.x, point.z);
      const disturbanceFrame = getHeroRiverCorridorFrame(
        centerFrame.center.x
          + centerFrame.side.x * disturbance.lateral * centerFrame.waterWidth * 0.5,
        centerFrame.center.z
          + centerFrame.side.z * disturbance.lateral * centerFrame.waterWidth * 0.5,
      );

      assert.ok(disturbanceFrame.disturbanceMask >= disturbance.strength * 0.8);
      if (index > 0) {
        assert.ok(
          disturbance.distanceM - reach.disturbances[index - 1].distanceM >= 18,
          `${reach.id} disturbance spacing is too small`,
        );
      }
      if (from.type === 'confluence') assert.ok(disturbance.distanceM > from.poolRadius);
      if (to.type === 'confluence') assert.ok(length - disturbance.distanceM > to.poolRadius);
    }
  }
});

test('hero river corridor shares layered bed, wet bank, gravel bank, and blend targets', () => {
  const reach = HERO_RIVER_NETWORK_DEFINITION.reaches[0];
  const point = getReachPointAtDistance(reach, 80);
  const centerFrame = getHeroRiverCorridorFrame(8, point.x, point.z);

  assert.equal(centerFrame.reachId, reach.id);
  assert.ok(centerFrame.waterDepth > centerFrame.edgeDepth);
  assert.ok(Math.abs(centerFrame.thalwegOffset) <= centerFrame.waterWidth * 0.25 + 1e-8);
  assert.ok(Math.hypot(centerFrame.flowDirection.x, centerFrame.flowDirection.z) > 0.999999);

  const sample = (lateral) => {
    const x = centerFrame.center.x + centerFrame.side.x * lateral;
    const z = centerFrame.center.z + centerFrame.side.z * lateral;

    return {
      frame: getHeroRiverCorridorFrame(8, x, z),
      target: getHeroRiverTerrainTarget(8, x, z),
    };
  };
  const center = sample(centerFrame.thalwegOffset);
  const shallow = sample(centerFrame.halfWidth * 0.92);
  const wet = sample(centerFrame.halfWidth + centerFrame.wetBankWidth * 0.5);
  const gravel = sample(
    centerFrame.halfWidth
    + centerFrame.wetBankWidth
    + centerFrame.gravelBankWidth * 0.5,
  );
  const blend = sample(centerFrame.corridorOuter - 0.35);

  assert.equal(center.target.region, 'bed');
  assert.equal(shallow.target.region, 'bed');
  assert.equal(wet.target.region, 'wet-bank');
  assert.equal(gravel.target.region, 'gravel-bank');
  assert.equal(blend.target.region, 'terrain-blend');
  assert.ok(center.target.height < shallow.target.height);
  assert.ok(shallow.target.height < wet.target.height);
  assert.ok(wet.target.height < gravel.target.height);
  assert.ok(gravel.target.height < blend.target.height);
  assert.ok(center.frame.underwaterMask > 0.99);
  assert.ok(wet.frame.wetBankMask > 0.9);
  assert.ok(gravel.frame.gravelBankMask > 0.25);
  assert.ok(gravel.frame.gravelBankMask <= 0.8);
  assert.ok(gravel.frame.vegetationMask > 0.9);
});

test('hero river material masks widen wet gravel and keep dry gravel softly partial', () => {
  const reach = HERO_RIVER_NETWORK_DEFINITION.reaches[0];
  const point = getReachPointAtDistance(reach, 80);
  const center = getHeroRiverCorridorFrame(point.x, point.z);
  const sample = (lateral) => getHeroRiverCorridorFrame(
    center.center.x + center.side.x * lateral,
    center.center.z + center.side.z * lateral,
  );
  const wetOuter = center.halfWidth + center.wetBankWidth;
  const gravelOuter = wetOuter + center.gravelBankWidth;
  const innerWet = sample(center.halfWidth + center.wetBankWidth * 0.35);
  const wetShoulder = sample(wetOuter + Math.min(0.8, center.gravelBankWidth * 0.16));
  const gravelCenter = sample(wetOuter + center.gravelBankWidth * 0.58);
  const grassShoulder = sample(gravelOuter - 0.25);

  assert.ok(innerWet.wetBankMask > 0.9);
  assert.ok(wetShoulder.wetBankMask > 0.45);
  assert.ok(gravelCenter.gravelBankMask > 0.25);
  assert.ok(gravelCenter.gravelBankMask <= 0.8);
  assert.ok(grassShoulder.gravelBankMask > 0);
  assert.ok(grassShoulder.gravelBankMask < gravelCenter.gravelBankMask);

  for (const heroReach of HERO_RIVER_NETWORK_DEFINITION.reaches) {
    const curve = createReachCurve(heroReach);

    for (const t of [0.15, 0.35, 0.55, 0.75, 0.9]) {
      const curvePoint = curve.getPointAt(t);
      const frame = getHeroRiverCorridorFrame(curvePoint.x, curvePoint.z);

      for (let lateral = -frame.corridorHalfWidth; lateral <= frame.corridorHalfWidth; lateral += 0.5) {
        const material = getHeroRiverCorridorFrame(
          frame.center.x + frame.side.x * lateral,
          frame.center.z + frame.side.z * lateral,
        );

        assert.ok(material.gravelBankMask <= 0.8 + 1e-8);
      }
    }
  }
});

test('hero riffles are shallower and faster without changing downstream levels', () => {
  const reach = HERO_RIVER_NETWORK_DEFINITION.reaches[0];
  const rapidPoint = getReachPointAtDistance(reach, 40);
  const calmPoint = getReachPointAtDistance(reach, 80);
  const rapid = getHeroRiverCorridorFrame(rapidPoint.x, rapidPoint.z);
  const calm = getHeroRiverCorridorFrame(calmPoint.x, calmPoint.z);

  assert.ok(rapid.rapidMask > 0.8);
  assert.ok(rapid.flowSpeed > 1.3 && rapid.flowSpeed <= 1.8);
  assert.ok(rapid.depth <= rapid.authoredDepth * 0.75);
  assert.equal(calm.rapidMask, 0);
  assert.ok(calm.flowSpeed < 1);
  assert.ok(rapid.waterLevel > calm.waterLevel);
});

test('both hero tributary 15m corridors stay entirely inside the fixed pure-black source', async () => {
  const source = await loadRawHeightmap(DEFAULT_SOURCE_PATH);
  const tributaries = HERO_RIVER_NETWORK_DEFINITION.reaches.filter(
    (reach) => reach.role === 'tributary',
  );

  for (const reach of tributaries) {
    const curve = createReachCurve(reach);

    for (let index = 0; index <= 120; index += 1) {
      const t = index / 120;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();

      for (let lateral = -15; lateral <= 15; lateral += 1) {
        const x = point.x - tangent.z * lateral;
        const z = point.z + tangent.x * lateral;
        const pixelX = Math.round(
          (x + LOWLAND_HEIGHT_SETTINGS.worldSize * 0.5)
          / LOWLAND_HEIGHT_SETTINGS.worldSize
          * (source.width - 1),
        );
        const pixelY = Math.round(
          (1 - (z + LOWLAND_HEIGHT_SETTINGS.worldSize * 0.5)
          / LOWLAND_HEIGHT_SETTINGS.worldSize)
          * (source.height - 1),
        );
        const offset = (pixelY * source.width + pixelX) * source.channels;

        assert.deepEqual(
          [...source.data.subarray(offset, offset + 3)],
          [0, 0, 0],
          `${reach.id} leaves the pure-black source at ${x},${z}`,
        );
      }
    }
  }
});

test('all authored beds are non-negative and remain below their water surfaces', () => {
  const lakes = [
    ...LOWLAND_LAKES,
    ...SOUTHERN_LOWLAND_LAKES,
    TERMINAL_LOWLAND_LAKE,
    PLUNGE_POOL,
  ];

  assert.equal(getLowlandPlanStatistics().minimumAuthoredBedHeight, 0);

  for (const lake of lakes) {
    const bed = getBakedLowlandHeight(lake.cx, lake.cz);

    assert.ok(bed >= 0, `${lake.id} bed is below 0m`);
    assert.ok(bed < lake.waterLevel, `${lake.id} bed is not below its water level`);
  }
});

test('synthetic baking changes exact black only, feathers inward, and is deterministic', () => {
  const width = 65;
  const height = 65;
  const channels = 3;
  const source = Buffer.alloc(width * height * channels);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x !== 0 && x !== width - 1 && y !== 0 && y !== height - 1) continue;

      const offset = (y * width + x) * channels;

      source[offset] = 20;
      source[offset + 1] = 21;
      source[offset + 2] = 22;
    }
  }

  const first = bakeBlackLowlandsRaw(source, width, height, channels, { worldSize: 64 });
  const second = bakeBlackLowlandsRaw(source, width, height, channels, { worldSize: 64 });

  assert.deepEqual(first.data, second.data);
  assert.equal(first.stats.nonBlackPixels, width * 4 - 4);
  assert.ok(first.stats.modifiedCoreBlackPixels > 0);

  for (let pixel = 0, offset = 0; pixel < width * height; pixel += 1, offset += channels) {
    const sourceIsBlack = source[offset] === 0
      && source[offset + 1] === 0
      && source[offset + 2] === 0;

    if (!sourceIsBlack) {
      assert.deepEqual(
        [...first.data.subarray(offset, offset + channels)],
        [...source.subarray(offset, offset + channels)],
      );
    }
  }

  const sample = (x, y = 32) => first.data[(y * width + x) * channels];

  assert.equal(sample(1), 0);
  assert.ok(sample(13) > sample(1));
  assert.ok(sample(32) >= sample(13));
});

test('tracked heightmap exactly matches the fixed source and deterministic bake', async () => {
  const result = await checkLowlandHeightmap();

  assert.equal(result.mismatchedPixels, 0);
  assert.equal(result.changedNonBlackPixels, 0);
  assert.ok(result.coreCoverage >= 0.99);
  assert.ok(result.maximumBakedHeight <= LOWLAND_HEIGHT_SETTINGS.maximumBakedHeight);
});

function createReachCurve(reach) {
  return new CatmullRomCurve3(
    reach.points.map(([x, z]) => new Vector3(x, 0, z)),
    false,
    'centripetal',
  );
}

function getReachPointAtDistance(reach, distance) {
  const curve = createReachCurve(reach);
  const point = curve.getPointAt(Math.min(distance / curve.getLength(), 1));

  return { x: point.x, z: point.z };
}
