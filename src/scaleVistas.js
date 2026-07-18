import * as THREE from 'three';

export const SCALE_VISTAS = Object.freeze([
  Object.freeze({
    id: 'spawn-to-east-summit',
    origin: Object.freeze({ x: 335, z: -358 }),
    target: Object.freeze({ x: 163, z: -78, y: 240 }),
    length: 140,
    nearHalfWidth: 6,
    farHalfWidth: 24,
  }),
  Object.freeze({
    id: 'east-to-highest-summit',
    origin: Object.freeze({ x: 163, z: -78 }),
    target: Object.freeze({ x: -337, z: -412, y: 297 }),
    length: 120,
    nearHalfWidth: 8,
    farHalfWidth: 28,
  }),
  Object.freeze({
    id: 'south-summit-to-lowlands',
    origin: Object.freeze({ x: -153, z: -665 }),
    target: Object.freeze({ x: 690, z: -340, y: 3 }),
    length: 140,
    nearHalfWidth: 8,
    farHalfWidth: 34,
  }),
]);

export function isInScaleVistaTreeExclusion(x, z) {
  for (const vista of SCALE_VISTAS) {
    const directionX = vista.target.x - vista.origin.x;
    const directionZ = vista.target.z - vista.origin.z;
    const directionLength = Math.hypot(directionX, directionZ);
    const normalizedX = directionX / directionLength;
    const normalizedZ = directionZ / directionLength;
    const offsetX = x - vista.origin.x;
    const offsetZ = z - vista.origin.z;
    const along = offsetX * normalizedX + offsetZ * normalizedZ;

    if (along < 0 || along > vista.length) continue;

    const lateral = Math.abs(offsetX * -normalizedZ + offsetZ * normalizedX);
    const width = THREE.MathUtils.lerp(
      vista.nearHalfWidth,
      vista.farHalfWidth,
      along / vista.length,
    );

    if (lateral <= width) return true;
  }

  return false;
}
