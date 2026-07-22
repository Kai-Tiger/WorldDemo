import { MAP_SIZE } from './vegetationConfig.js';
import { isInWaterSystemVegetationExclusion } from './waterSystem.js';

const DEFAULT_COUNT = 6;
const DEFAULT_MIN_PLAYER_DISTANCE = 12;
const DEFAULT_MAX_PLAYER_DISTANCE = 38;
const DEFAULT_MIN_ENEMY_SPACING = 5;
const DEFAULT_MAX_SLOPE_DEGREES = 40;
const ENEMY_GROUND_RADIUS = 0.35;
const GROUND_OFFSET = 0.03;
const HALF_MAP_SIZE = MAP_SIZE * 0.5;

export function createEnemySpawnPositions(terrain, center, options = {}) {
  const count = Math.max(0, Math.floor(options.count ?? DEFAULT_COUNT));
  const minPlayerDistance = options.minPlayerDistance ?? DEFAULT_MIN_PLAYER_DISTANCE;
  const maxPlayerDistance = options.maxPlayerDistance ?? DEFAULT_MAX_PLAYER_DISTANCE;
  const minEnemySpacing = options.minEnemySpacing ?? DEFAULT_MIN_ENEMY_SPACING;
  const maxSlopeDegrees = options.maxSlopeDegrees ?? DEFAULT_MAX_SLOPE_DEGREES;
  const random = options.random ?? Math.random;
  const maxAttempts = options.maxAttempts ?? Math.max(count * 100, 100);
  const minimumNormalY = Math.cos(maxSlopeDegrees * Math.PI / 180);
  const minDistanceSquared = minPlayerDistance * minPlayerDistance;
  const maxDistanceSquared = maxPlayerDistance * maxPlayerDistance;
  const minSpacingSquared = minEnemySpacing * minEnemySpacing;
  const positions = [];

  for (let attempt = 0; attempt < maxAttempts && positions.length < count; attempt += 1) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(
      minDistanceSquared + random() * (maxDistanceSquared - minDistanceSquared),
    );
    const x = center.x + Math.cos(angle) * distance;
    const z = center.z + Math.sin(angle) * distance;

    if (Math.abs(x) > HALF_MAP_SIZE || Math.abs(z) > HALF_MAP_SIZE) continue;
    if (isInWaterSystemVegetationExclusion(x, z)) continue;
    if (terrain.getNormalAt(x, z).y < minimumNormalY) continue;
    if (positions.some((position) => (
      (position.x - x) ** 2 + (position.z - z) ** 2 < minSpacingSquared
    ))) continue;

    const groundHeight = typeof terrain.getMaxHeightInRadius === 'function'
      ? terrain.getMaxHeightInRadius(x, z, ENEMY_GROUND_RADIUS)
      : terrain.getHeightAt(x, z);

    positions.push({
      x,
      y: groundHeight + GROUND_OFFSET,
      z,
      rotationY: random() * Math.PI * 2,
    });
  }

  return positions;
}
