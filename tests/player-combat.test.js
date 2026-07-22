import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { Player } from '../src/player.js';
import {
  distanceSquaredPointToSegment,
  segmentIntersectsSphere,
  SpellSystem,
} from '../src/spellSystem.js';

function createCombatPlayer({
  actionState = null,
  hp = 200,
  stamina = 100,
} = {}) {
  const player = Object.create(Player.prototype);
  player.actionState = actionState;
  player.hp = hp;
  player.stamina = stamina;
  player.staminaDepleted = false;
  player.comboQueued = false;
  player.comboIndex = 0;
  player.attackPreviousNormalizedTime = 0;
  player.attackHitConsumed = false;
  player.attackHitEvents = [];
  player.attackEventId = 0;
  player.spellReleaseReady = false;
  player.spellReleaseTimer = 0;
  player.spellCooldown = 0;
  player.mp = 100;
  player.deathAction = null;
  player.hurtAction = null;
  return player;
}

function createInput({ pressed = [], held = [] } = {}) {
  const pressedKeys = new Set(pressed);
  const heldKeys = new Set(held);
  return {
    consumePressed(code) {
      const value = pressedKeys.has(code);
      pressedKeys.delete(code);
      return value;
    },
    isKeyDown(code) {
      return heldKeys.has(code);
    },
  };
}

test('combat inputs enter attack, defense, and spell states', () => {
  const player = createCombatPlayer();
  player.attackAction = { name: 'attack' };
  player.defenseAction = { name: 'defense' };
  player.spellAction = { name: 'spell' };
  player.playedActions = [];
  player.setAction = function setAction(action) {
    this.playedActions.push(action.name);
  };

  player.updateCombatInput(createInput({ pressed: ['KeyJ'] }));
  assert.equal(player.actionState, 'attack');
  assert.equal(player.stamina, 75);
  assert.deepEqual(player.playedActions, ['attack']);

  player.actionState = null;
  player.updateCombatInput(createInput({ held: ['KeyK'] }));
  assert.equal(player.actionState, 'defense');
  assert.deepEqual(player.playedActions, ['attack', 'defense']);

  player.actionState = null;
  player.updateCombatInput(createInput({ pressed: ['KeyE'] }));
  assert.equal(player.actionState, 'spell');
  assert.equal(player.mp, 75);
  assert.deepEqual(player.playedActions, ['attack', 'defense', 'spell']);
});

test('movement state selects walk, run, and defensive movement animations', () => {
  const player = createCombatPlayer();
  player.idleAction = { name: 'idle' };
  player.walkAction = { name: 'walk' };
  player.runAction = { name: 'run' };
  player.defenseAction = { name: 'defense' };
  player.defenseMoveAction = { name: 'defenseMove' };
  const selected = [];
  player.setAction = (action) => selected.push(action.name);

  player.moveHoldTime = 0.5;
  player.updateMovementAction(true);
  player.moveHoldTime = 1;
  player.updateMovementAction(true);
  player.actionState = 'defense';
  player.updateMovementAction(true);

  assert.deepEqual(selected, ['walk', 'run', 'defenseMove']);
});

test('animation preparation drops missing bones and freezes hips root motion', () => {
  const player = Object.create(Player.prototype);
  player.model = new THREE.Group();
  const hips = new THREE.Object3D();
  hips.name = 'Hips';
  player.model.add(hips);
  player.rigNodeNameMap = null;
  const clip = new THREE.AnimationClip('walk', 1, [
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

  const prepared = player.prepareAnimationClip(clip);

  assert.equal(prepared.tracks.length, 1);
  assert.equal(prepared.tracks[0].name, 'Hips.position');
  assert.deepEqual(Array.from(prepared.tracks[0].values), [1, 2, 3, 1, 5, 3]);
});

test('a melee step emits one hit event inside its animation window', () => {
  const player = createCombatPlayer({ actionState: 'attack' });
  player.attackAction = {
    time: 0.4,
    getClip: () => ({ duration: 1 }),
  };

  player.updateAttackWindow();
  assert.deepEqual(player.consumeAttackHitWindow(), {
    id: 1,
    comboIndex: 0,
    damageMul: 1,
    rangeMul: 1,
  });

  player.attackAction.time = 0.5;
  player.updateAttackWindow();
  assert.equal(player.consumeAttackHitWindow(), false);
});

test('one spell action releases exactly one fireball after its delay', () => {
  const player = createCombatPlayer();
  player.spellAction = { name: 'spell' };
  player.setAction = () => {};

  assert.equal(player.startSpell(), true);
  assert.equal(player.mp, 75);
  player.updateSpellRelease(0.79);
  assert.equal(player.consumeSpellRelease(), false);
  player.updateSpellRelease(0.02);
  assert.deepEqual(player.consumeSpellRelease(), { damage: 52 });
  assert.equal(player.consumeSpellRelease(), false);
  player.updateSpellRelease(0.02);
  assert.equal(player.consumeSpellRelease(), false);
});

test('defense spends stamina and blocks enemy damage', () => {
  const player = createCombatPlayer({ actionState: 'defense' });
  const result = player.receiveEnemyAttack(14);

  assert.deepEqual(result, { blocked: true, hp: 200 });
  assert.equal(player.stamina, 79);
});

test('insufficient guard stamina causes half damage', () => {
  const player = createCombatPlayer({ actionState: 'defense', stamina: 10 });
  const result = player.receiveEnemyAttack(14);

  assert.deepEqual(result, { blocked: false, hp: 193 });
  assert.equal(player.stamina, 0);
  assert.equal(player.staminaDepleted, true);
});

test('fireball segment collision catches a target crossed between frames', () => {
  const start = { x: 0, y: 1, z: 0 };
  const end = { x: 8, y: 1, z: 0 };
  const target = { x: 4, y: 1.4, z: 0 };

  assert.ok(Math.abs(distanceSquaredPointToSegment(target, start, end) - 0.16) < 1e-9);
  assert.equal(segmentIntersectsSphere(start, end, target, 0.5), true);
  assert.equal(segmentIntersectsSphere(start, end, { x: 4, y: 2, z: 0 }, 0.5), false);
});

test('a cast fireball damages its first enemy once and is removed', () => {
  const scene = new THREE.Scene();
  const spells = new SpellSystem(scene);
  const damage = [];
  const enemy = {
    position: new THREE.Vector3(0, 0, 2.3),
    isAlive: () => true,
    getHitRadius: () => 0.45,
    takeDamage: (amount) => damage.push(amount),
  };
  const terrain = { getHeightAt: () => -100 };

  assert.equal(
    spells.cast(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), 52),
    true,
  );
  let projectileLights = 0;
  scene.traverse((object) => {
    if (object.isPointLight) projectileLights += 1;
  });
  assert.equal(projectileLights, 0);
  spells.update(0.1, [enemy], terrain);
  spells.update(0.1, [enemy], terrain);

  assert.deepEqual(damage, [52]);
  assert.equal(spells.projectiles.length, 0);
  spells.dispose();
});

test('a finished defense pose stays clamped without repeating finished events', () => {
  const mixer = new THREE.AnimationMixer(new THREE.Object3D());
  const clip = new THREE.AnimationClip('defense', 0.1, [
    new THREE.NumberKeyframeTrack('.position[x]', [0, 0.1], [0, 1]),
  ]);
  const action = mixer.clipAction(clip);
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();

  const player = Object.create(Player.prototype);
  player.currentAction = action;

  let finishedEvents = 0;
  mixer.addEventListener('finished', () => {
    finishedEvents += 1;
  });

  for (let frame = 0; frame < 10; frame += 1) {
    mixer.update(0.05);
    player.setAction(action);
  }

  assert.equal(finishedEvents, 1);
  assert.equal(action.paused, true);
});
