const GOLDEN_SHOTS = Object.freeze({
  spawn: {
    player: { x: 335, z: -358 },
    camera: { x: 340, z: -351, heightOffset: 3.4 },
    target: { x: 335, z: -358, heightOffset: 1.25 },
  },
  shore: {
    player: { x: 342, z: -390 },
    camera: { x: 351, z: -375, heightOffset: 5.8 },
    target: { x: 310, z: -405, heightOffset: 2.2 },
  },
  waterfall: {
    player: { x: 397, z: -405 },
    camera: { x: 450, z: -398, y: 30 },
    target: { x: 413, z: -423, y: 7 },
  },
  forest: {
    player: { x: 356, z: -332 },
    camera: { x: 349, z: -322, heightOffset: 4.8 },
    target: { x: 358, z: -342, heightOffset: 2.2 },
  },
  vista: {
    player: { x: 347, z: -350 },
    camera: { x: 365, z: -322, y: 88 },
    target: { x: 300, z: -400, y: 38 },
  },
  'carriage-road': {
    player: { x: 545, z: -339 },
    camera: { x: 535, z: -370, heightOffset: 9 },
    target: { x: 580, z: -326, heightOffset: 1.3 },
  },
  'terminal-lake-overhead': {
    player: { x: 720, z: -340 },
    camera: { x: 690, z: -340, y: 55 },
    target: { x: 690, z: -340, y: -1.235 },
  },
});

export function getGoldenShotFromLocation(location = window.location) {
  const key = new URLSearchParams(location.search).get('shot');

  return key && GOLDEN_SHOTS[key] ? { key, ...GOLDEN_SHOTS[key] } : null;
}

export function applyGoldenShot(shot, terrain, player, camera) {
  if (!shot) return false;

  const playerY = terrain.getHeightAt(shot.player.x, shot.player.z) + 0.03;
  const cameraY = getShotHeight(shot.camera, terrain);
  const targetY = getShotHeight(shot.target, terrain);

  player.position.set(shot.player.x, playerY, shot.player.z);
  camera.position.set(shot.camera.x, cameraY, shot.camera.z);
  camera.lookAt(shot.target.x, targetY, shot.target.z);
  return true;
}

function getShotHeight(anchor, terrain) {
  return Number.isFinite(anchor.y)
    ? anchor.y
    : terrain.getHeightAt(anchor.x, anchor.z) + anchor.heightOffset;
}

export function listGoldenShotNames() {
  return Object.keys(GOLDEN_SHOTS);
}
