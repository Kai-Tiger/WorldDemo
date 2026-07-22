import assert from 'node:assert/strict';
import test from 'node:test';
import { createEnemySpawnPositions } from '../src/enemySpawns.js';
import { MAP_SIZE } from '../src/vegetationConfig.js';
import { isInWaterSystemVegetationExclusion } from '../src/waterSystem.js';

const MAX_SLOPE_DEGREES = 40;

function createFlatTerrain() {
  return {
    getHeightAt: () => 9.5,
    getMaxHeightInRadius: () => 9.5,
    getNormalAt: () => ({ x: 0, y: 1, z: 0 }),
  };
}

function createSeededRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test('flat terrain receives the full default enemy count at safe positions', () => {
  const terrain = createFlatTerrain();
  const center = { x: 0, z: 0 };
  const positions = createEnemySpawnPositions(terrain, center, {
    random: createSeededRandom(12345),
  });

  assert.equal(positions.length, 6);

  for (const [index, position] of positions.entries()) {
    const playerDistance = Math.hypot(position.x - center.x, position.z - center.z);
    const slopeDegrees = Math.acos(terrain.getNormalAt(position.x, position.z).y)
      * 180 / Math.PI;

    assert.ok(playerDistance >= 12 && playerDistance <= 38, playerDistance);
    assert.ok(Math.abs(position.x) <= MAP_SIZE * 0.5);
    assert.ok(Math.abs(position.z) <= MAP_SIZE * 0.5);
    assert.ok(slopeDegrees <= MAX_SLOPE_DEGREES);
    assert.equal(isInWaterSystemVegetationExclusion(position.x, position.z), false);
    assert.equal(position.y, 9.53);
    assert.ok(position.rotationY >= 0 && position.rotationY < Math.PI * 2);

    for (const other of positions.slice(0, index)) {
      assert.ok(Math.hypot(position.x - other.x, position.z - other.z) >= 5);
    }
  }
});

test('an injected random source produces deterministic spawn positions', () => {
  const options = { random: createSeededRandom(9876) };
  const first = createEnemySpawnPositions(createFlatTerrain(), { x: -80, z: 60 }, options);
  const second = createEnemySpawnPositions(createFlatTerrain(), { x: -80, z: 60 }, {
    random: createSeededRandom(9876),
  });

  assert.deepEqual(first, second);
});

test('water, steep slopes, and out-of-bounds candidates are excluded', () => {
  const flatTerrain = createFlatTerrain();
  const steepTerrain = {
    ...flatTerrain,
    getNormalAt: () => ({ y: Math.cos(41 * Math.PI / 180) }),
  };
  const zeroRadiusOptions = {
    count: 1,
    minPlayerDistance: 0,
    maxPlayerDistance: 0,
    maxAttempts: 4,
    random: () => 0,
  };

  assert.equal(isInWaterSystemVegetationExclusion(820, -260), true);
  assert.deepEqual(
    createEnemySpawnPositions(flatTerrain, { x: 820, z: -260 }, zeroRadiusOptions),
    [],
  );
  assert.deepEqual(
    createEnemySpawnPositions(steepTerrain, { x: 0, z: 0 }, zeroRadiusOptions),
    [],
  );
  assert.deepEqual(
    createEnemySpawnPositions(flatTerrain, { x: MAP_SIZE * 0.5 + 1, z: 0 }, zeroRadiusOptions),
    [],
  );
});
