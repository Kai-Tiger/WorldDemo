import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { Player } from '../src/player.js';

function createPlayer() {
  const player = Object.create(Player.prototype);
  player.group = new THREE.Group();
  player.moveDirection = new THREE.Vector3(1, 0, 0);
  player.cameraForward = new THREE.Vector3();
  player.cameraRight = new THREE.Vector3();
  player.verticalVelocity = 0;
  player.isDroppingFromLedge = false;
  player.isHovering = true;
  player.setAction = () => {};
  return player;
}

test('walkable downhill terrain does not trigger a ledge drop', () => {
  const player = createPlayer();
  const slopeRadians = THREE.MathUtils.degToRad(35);
  const slope = Math.tan(slopeRadians);
  const terrain = {
    getHeightAt: (x) => -x * slope,
    getNormalAt: () => new THREE.Vector3(Math.sin(slopeRadians), Math.cos(slopeRadians), 0),
  };

  player.group.position.set(0, 0.03, 0);

  assert.equal(player.isDroppingOffEdge(terrain, 0.25, 0), false);
});

test('an unwalkable cliff still triggers a ledge drop', () => {
  const player = createPlayer();
  const terrain = {
    getHeightAt: (x) => (x < 0.5 ? 1 : 0),
    getNormalAt: () => new THREE.Vector3(1, 0, 0),
  };

  player.group.position.set(0, 1.03, 0);

  assert.equal(player.isDroppingOffEdge(terrain, 0.25, 0), true);
});

test('player movement uses the expanded ±2048 meter map boundary', () => {
  const player = createPlayer();
  const terrain = {
    getHeightAt: () => 0,
    getMaxHeightInRadius: () => 0,
    getNormalAt: () => new THREE.Vector3(0, 1, 0),
  };
  const input = {
    isKeyDown: (code) => code === 'KeyW',
  };
  const camera = {
    direction: 1,
    getWorldDirection(target) {
      return target.set(this.direction, 0, 0);
    },
  };

  player.group.position.set(2040, 100, 0);
  player.update(1, input, camera, terrain);
  assert.equal(player.group.position.x, 2048 - 0.35);

  camera.direction = -1;
  player.group.position.set(-2040, 100, 0);
  player.update(1, input, camera, terrain);
  assert.equal(player.group.position.x, -2048 + 0.35);
});
