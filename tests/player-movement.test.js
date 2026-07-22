import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { Player } from '../src/player.js';

function createPlayer() {
  const player = Object.create(Player.prototype);
  player.group = new THREE.Group();
  player.moveDirection = new THREE.Vector3(1, 0, 0);
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

test('world collision receives an x/z endpoint and returns its Vector2 result', () => {
  const player = createPlayer();
  player.group.position.set(1, 2, 3);
  player.collisionEndPosition = { x: 0, z: 0 };
  player.nextHorizontalPosition = new THREE.Vector2();
  const collision = {
    resolveMovement(start, end, minY, maxY, radius, target) {
      assert.equal(start, player.group.position);
      assert.deepEqual(end, { x: 8, z: 9 });
      assert.equal(minY, 2);
      assert.equal(maxY, 3.8);
      assert.equal(radius, 0.35);
      target.set(4, 5);
    },
  };

  const resolved = player.resolveWorldCollision(collision, 8, 9);

  assert.equal(resolved.x, 4);
  assert.equal(resolved.y, 5);
});

test('blocked movement stays idle and resets the run timer', () => {
  const player = createPlayer();
  Object.assign(player, {
    cameraForward: new THREE.Vector3(),
    cameraRight: new THREE.Vector3(),
    collisionEndPosition: { x: 0, z: 0 },
    nextHorizontalPosition: new THREE.Vector2(),
    mixer: null,
    actionState: null,
    spellCooldown: 0,
    spellReleaseTimer: 0,
    spellReleaseReady: false,
    stamina: 100,
    staminaDepleted: false,
    moveHoldTime: 0.9,
    verticalVelocity: 0,
    isDroppingFromLedge: false,
    isHovering: false,
    attackHitEvents: [],
    comboQueued: false,
    idleAction: { name: 'idle' },
    walkAction: { name: 'walk' },
    runAction: { name: 'run' },
  });
  player.group.position.set(0, 0.03, 0);
  const selected = [];
  player.setAction = (action) => selected.push(action.name);

  const input = {
    consumePressed: () => false,
    isKeyDown: (code) => code === 'KeyW',
  };
  const camera = {
    getWorldDirection(target) {
      return target.set(0, 0, 1);
    },
  };
  const terrain = {
    getHeightAt: () => 0,
    getMaxHeightInRadius: () => 0,
    getNormalAt: () => new THREE.Vector3(0, 1, 0),
  };
  const collision = {
    resolveMovement(start, end, minY, maxY, radius, target) {
      target.set(start.x, start.z);
    },
  };

  player.update(0.2, input, camera, terrain, collision);

  assert.equal(player.moveHoldTime, 0);
  assert.deepEqual(selected, ['idle']);
});
