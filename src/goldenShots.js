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
  'mountain-pass': {
    player: { x: 444, z: -397 },
    camera: { x: 454, z: -407, heightOffset: 6 },
    target: { x: 414, z: -372, y: 14 },
  },
  'mountain-east': {
    player: { x: 245, z: -135 },
    camera: { x: 286, z: -178, y: 181 },
    target: { x: 163, z: -78, y: 218 },
  },
  'mountain-west-loop': {
    player: { x: -460, z: -380 },
    camera: { x: -405, z: -454, y: 278 },
    target: { x: -555, z: -350, y: 263 },
  },
  'mountain-south-loop': {
    player: { x: -105, z: -635 },
    camera: { x: 40, z: -820, y: 360 },
    target: { x: -153, z: -665, y: 250 },
  },
  'river-tree-j1': {
    player: { x: 45, z: -370 },
    camera: { x: 55, z: -390, y: 68 },
    target: { x: 16, z: -352, y: 50.6 },
  },
  'river-tree-tarn': {
    player: { x: 108, z: -535 },
    camera: { x: 132, z: -505, y: 91 },
    target: { x: 76, z: -552, y: 49.5 },
  },
  'river-tree-inlet': {
    player: { x: 310, z: -472 },
    camera: { x: 310, z: -500, y: 52 },
    target: { x: 278, z: -458, y: 31.6 },
  },
  'terminal-lake-overhead': {
    player: { x: 720, z: -340 },
    camera: { x: 690, z: -340, y: 55 },
    target: { x: 690, z: -340, y: -1.235 },
  },
  'lowland-creek': {
    player: { x: 748, z: -286 },
    camera: { x: 790, z: -236, y: 14 },
    target: { x: 735, z: -308, y: -0.7 },
  },
  'lowland-lake': {
    player: { x: 858, z: -278 },
    camera: { x: 874, z: -226, y: 18 },
    target: { x: 820, z: -260, y: -0.2 },
  },
  'lowland-hills': {
    player: { x: -555, z: 505 },
    camera: { x: -505, z: 430, y: 31 },
    target: { x: -650, z: 510, y: 8 },
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
