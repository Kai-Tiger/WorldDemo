import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  didAnimationWindowOverlap,
  Enemy,
  isTargetInAttackArc,
} from '../src/enemy.js';

test('animation windows are detected when a frame crosses the whole window', () => {
  const window = { start: 0.23, end: 0.28 };

  assert.equal(didAnimationWindowOverlap(0.2, 0.3, window), true);
  assert.equal(didAnimationWindowOverlap(0, 0.22, window), false);
  assert.equal(didAnimationWindowOverlap(0.29, 0.4, window), false);
  assert.equal(didAnimationWindowOverlap(0.3, 0.2, window), false);
});

test('attack arcs include targets in front and in range only', () => {
  const origin = { x: 0, z: 0 };

  assert.equal(isTargetInAttackArc(origin, 0, { x: 0, z: 2 }, 2, 95), true);
  assert.equal(isTargetInAttackArc(origin, 0, { x: 0, z: -1 }, 2, 95), false);
  assert.equal(isTargetInAttackArc(origin, 0, { x: 0, z: 2.01 }, 2, 95), false);
  assert.equal(isTargetInAttackArc(origin, Math.PI / 2, { x: 1, z: 0 }, 2, 95), true);
});

test('each enemy attack window can damage the player only once', () => {
  const enemy = Object.create(Enemy.prototype);
  enemy.group = new THREE.Group();
  enemy.attackAction = {
    time: 0.3,
    getClip: () => ({ duration: 1 }),
  };
  enemy.attackPreviousNormalizedTime = 0;
  enemy.attackWindowsHit = new Set();
  const damage = [];
  const player = {
    position: new THREE.Vector3(0, 0, 1.5),
    receiveEnemyAttack: (amount) => damage.push(amount),
  };

  enemy.updateAttackWindows(player);
  enemy.updateAttackWindows(player);
  enemy.attackAction.time = 0.5;
  enemy.updateAttackWindows(player);
  enemy.updateAttackWindows(player);
  enemy.attackAction.time = 0.9;
  enemy.updateAttackWindows(player);

  assert.equal(damage.length, 3);
  assert.ok(Math.abs(damage[0] - 11.2) < 1e-9);
  assert.equal(damage[1], 14);
  assert.equal(damage[2], 16.8);
});

test('an engaged enemy pursues a player outside melee range', () => {
  const enemy = Object.create(Enemy.prototype);
  enemy.group = new THREE.Group();
  enemy.hp = 90;
  enemy.engaged = true;
  enemy.actionState = null;
  enemy.attackCooldown = 0;
  enemy.mixer = null;
  enemy.standAction = { name: 'stand' };
  enemy.runAction = { name: 'run' };
  enemy.canMoveTo = () => true;
  enemy.getGroundHeight = () => 0.03;
  enemy.playedActions = [];
  enemy.setAction = function setAction(action) {
    this.playedActions.push(action.name);
  };

  enemy.update(
    0.5,
    { position: new THREE.Vector3(0, 0, 10), isDead: () => false },
    {},
  );

  assert.equal(enemy.position.z, 2);
  assert.equal(enemy.position.y, 0.03);
  assert.deepEqual(enemy.playedActions, ['run']);
});

test('enemy animation preparation removes tracks for absent bones', () => {
  const enemy = Object.create(Enemy.prototype);
  enemy.model = new THREE.Group();
  const hips = new THREE.Object3D();
  hips.name = 'mixamorigHips';
  enemy.model.add(hips);
  enemy.rigNodeNameMap = null;
  const clip = new THREE.AnimationClip('attack', 1, [
    new THREE.VectorKeyframeTrack(
      'mixamorigHips.position',
      [0, 1],
      [1, 2, 3, 4, 5, 6],
    ),
    new THREE.QuaternionKeyframeTrack(
      'mixamorigMissingSkirt.quaternion',
      [0, 1],
      [0, 0, 0, 1, 0, 0, 0, 1],
    ),
  ]);

  const prepared = enemy.prepareAnimationClip(clip);

  assert.equal(prepared.tracks.length, 1);
  assert.deepEqual(Array.from(prepared.tracks[0].values), [1, 2, 3, 1, 5, 3]);
});

function createEnemyState() {
  const enemy = Object.create(Enemy.prototype);
  enemy.group = new THREE.Group();
  enemy.hp = 90;
  enemy.hurtTriggered = false;
  enemy.engaged = true;
  enemy.actionState = null;
  enemy.hurtAction = { name: 'hurt' };
  enemy.deathAction = { name: 'death' };
  enemy.playedActions = [];
  enemy.setAction = function setAction(action, reset) {
    this.playedActions.push({ action, reset });
  };
  return enemy;
}

test('hurt plays once on the first drop to half health or below', () => {
  const enemy = createEnemyState();

  assert.equal(enemy.takeDamage(44), 46);
  assert.deepEqual(enemy.playedActions, []);
  assert.equal(enemy.takeDamage(1), 45);
  assert.equal(enemy.actionState, 'hurt');
  assert.deepEqual(enemy.playedActions, [{ action: enemy.hurtAction, reset: true }]);

  enemy.actionState = null;
  assert.equal(enemy.takeDamage(1), 44);
  assert.equal(enemy.actionState, null);
  assert.equal(enemy.playedActions.length, 1);
});

test('death reaches zero health, stops AI, and plays death', () => {
  const enemy = createEnemyState();

  assert.equal(enemy.takeDamage(200), 0);
  assert.equal(enemy.isAlive(), false);
  assert.equal(enemy.engaged, false);
  assert.equal(enemy.actionState, 'dead');
  assert.equal(enemy.getHp(), 0);
  assert.equal(enemy.getMaxHp(), 90);
  assert.deepEqual(enemy.playedActions, [{ action: enemy.deathAction, reset: true }]);

  enemy.takeDamage(10);
  assert.equal(enemy.playedActions.length, 1);
});
