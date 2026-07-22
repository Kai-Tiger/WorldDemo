import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { isInWaterSystemVegetationExclusion } from './waterSystem.js';

const ENEMY_MODEL_PATH = '/assets/enemy/e2.fbx';
const ENEMY_ANIMATION_PATHS = Object.freeze({
  stand: '/assets/enemy/Stand.fbx',
  run: '/assets/enemy/run.fbx',
  attack: '/assets/enemy/attack.fbx',
  hurt: '/assets/enemy/hurt.fbx',
  death: '/assets/enemy/death.fbx',
});
const ENEMY_HEIGHT = 1.8;
const ENEMY_HIT_RADIUS = 0.45;
const ENEMY_MAX_HP = 90;
const GROUND_OFFSET = 0.03;
const ENGAGE_RANGE = 18;
const DISENGAGE_RANGE = 26;
const ATTACK_START_RANGE = 2.2;
const CHASE_SPEED = 4;
const ATTACK_COOLDOWN = 1;
const ATTACK_TIME_SCALE = 1.25;
const MAX_SLOPE_NORMAL_Y = Math.cos(THREE.MathUtils.degToRad(40));
const MAX_ADJACENT_HEIGHT_DIFFERENCE = 0.75;
const MAX_MOVEMENT_STEP = 0.25;
const ACTION_FADE_DURATION = 0.16;
const ATTACK_WINDOWS = Object.freeze([
  Object.freeze({ start: 0.23, end: 0.28, range: 2, angleDeg: 95, damage: 14 * 0.8 }),
  Object.freeze({ start: 0.38, end: 0.45, range: 2.2, angleDeg: 105, damage: 14 }),
  Object.freeze({ start: 0.70, end: 0.85, range: 2.4, angleDeg: 115, damage: 14 * 1.2 }),
]);

const loader = new FBXLoader();
const fbxCache = new Map();

function loadFbx(path) {
  if (!fbxCache.has(path)) {
    const promise = loader.loadAsync(path).catch((error) => {
      fbxCache.delete(path);
      throw error;
    });
    fbxCache.set(path, promise);
  }

  return fbxCache.get(path).then((source) => cloneSkeleton(source));
}

function normalizeRigNodeName(name) {
  return String(name ?? '')
    .replace(/[:|_\-\s]/g, '')
    .replace(/^mixamorig\d*/i, '')
    .toLowerCase();
}

function getTrackTargetName(trackName) {
  const dot = trackName.lastIndexOf('.');
  return dot > 0 ? trackName.slice(0, dot) : null;
}

function getTrackPropertyName(trackName) {
  const dot = trackName.lastIndexOf('.');
  return dot > 0 ? trackName.slice(dot) : '';
}

export function didAnimationWindowOverlap(previous, current, window) {
  if (
    !Number.isFinite(previous)
    || !Number.isFinite(current)
    || !Number.isFinite(window?.start)
    || !Number.isFinite(window?.end)
    || current < previous
    || window.end < window.start
  ) return false;

  return current >= window.start && previous <= window.end;
}

export function isTargetInAttackArc(origin, yaw, target, range, angleDeg) {
  if (
    !origin
    || !target
    || !Number.isFinite(yaw)
    || !Number.isFinite(range)
    || !Number.isFinite(angleDeg)
    || range < 0
    || angleDeg < 0
  ) return false;

  const offsetX = target.x - origin.x;
  const offsetZ = target.z - origin.z;
  const distanceSquared = offsetX * offsetX + offsetZ * offsetZ;

  if (distanceSquared > range * range) return false;
  if (distanceSquared === 0 || angleDeg >= 360) return true;

  const inverseDistance = 1 / Math.sqrt(distanceSquared);
  const directionDot = (
    Math.sin(yaw) * offsetX + Math.cos(yaw) * offsetZ
  ) * inverseDistance;
  const minimumDot = Math.cos(THREE.MathUtils.degToRad(angleDeg * 0.5));

  return directionDot >= minimumDot;
}

export class Enemy {
  constructor({ x = 0, y = 0, z = 0, rotationY = 0 } = {}) {
    this.group = new THREE.Group();
    this.group.position.set(x, y, z);
    this.group.rotation.y = rotationY;
    this.model = null;
    this.mixer = null;
    this.standAction = null;
    this.runAction = null;
    this.attackAction = null;
    this.hurtAction = null;
    this.deathAction = null;
    this.currentAction = null;
    this.actionState = null;
    this.rigNodeNameMap = null;
    this.hp = ENEMY_MAX_HP;
    this.hurtTriggered = false;
    this.engaged = false;
    this.attackCooldown = 0;
    this.attackPreviousNormalizedTime = 0;
    this.attackWindowsHit = new Set();
    this.handleMixerFinished = (event) => this.handleActionFinished(event.action);
    this.ready = this.loadAssets();
  }

  async loadAssets() {
    try {
      const [model, ...animationModels] = await Promise.all([
        loadFbx(ENEMY_MODEL_PATH),
        ...Object.values(ENEMY_ANIMATION_PATHS).map((path) => loadFbx(path)),
      ]);

      this.setupModel(model);
      this.model = model;
      this.mixer = new THREE.AnimationMixer(model);
      this.mixer.addEventListener('finished', this.handleMixerFinished);
      this.group.add(model);

      Object.keys(ENEMY_ANIMATION_PATHS).forEach((name, index) => {
        const sourceClip = animationModels[index].animations[0];
        if (sourceClip) this.setupAction(name, sourceClip);
      });

      if (!this.isAlive()) {
        this.setAction(this.deathAction, true);
      } else if (this.actionState === 'hurt') {
        this.setAction(this.hurtAction, true);
      } else {
        this.setAction(this.standAction, true);
      }
      return true;
    } catch (error) {
      console.error('Failed to load enemy model or animations:', error);
      return false;
    }
  }

  setupModel(model) {
    model.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    if (size.y > 0) model.scale.multiplyScalar(ENEMY_HEIGHT / size.y);
    model.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(model);
    const center = scaledBox.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.y -= scaledBox.min.y;
    model.position.z -= center.z;
  }

  setupAction(name, sourceClip) {
    const clip = this.prepareAnimationClip(sourceClip);
    const action = this.mixer.clipAction(clip);
    const isLooping = name === 'stand' || name === 'run';

    action.setLoop(isLooping ? THREE.LoopRepeat : THREE.LoopOnce, isLooping ? Infinity : 1);
    action.clampWhenFinished = !isLooping;
    action.enabled = true;
    if (name === 'attack') action.timeScale = ATTACK_TIME_SCALE;
    this[`${name}Action`] = action;
  }

  prepareAnimationClip(sourceClip) {
    const clip = sourceClip.clone();
    const nodeMap = this.getRigNodeNameMap();

    clip.tracks = clip.tracks.filter((track) => {
      const targetName = getTrackTargetName(track.name);
      const propertyName = getTrackPropertyName(track.name);
      const normalizedTargetName = normalizeRigNodeName(targetName);
      const mappedName = nodeMap.get(normalizedTargetName);

      if (targetName && !this.model.getObjectByName(targetName) && !mappedName) {
        return false;
      }
      if (targetName && mappedName && !this.model.getObjectByName(targetName)) {
        track.name = `${mappedName}${propertyName}`;
      }

      if (propertyName !== '.position' || normalizedTargetName !== 'hips') return true;
      const baseX = track.values[0];
      const baseZ = track.values[2];
      for (let index = 0; index < track.values.length; index += 3) {
        track.values[index] = baseX;
        track.values[index + 2] = baseZ;
      }
      return true;
    });

    return clip;
  }

  getRigNodeNameMap() {
    if (this.rigNodeNameMap) return this.rigNodeNameMap;

    this.rigNodeNameMap = new Map();
    this.model?.traverse((node) => {
      const normalizedName = normalizeRigNodeName(node.name);
      if (normalizedName && !this.rigNodeNameMap.has(normalizedName)) {
        this.rigNodeNameMap.set(normalizedName, node.name);
      }
    });
    return this.rigNodeNameMap;
  }

  setAction(nextAction, reset = false) {
    if (!nextAction) return;

    if (nextAction === this.currentAction) {
      if (reset) nextAction.reset();
      nextAction.enabled = true;
      nextAction.paused = false;
      if (!nextAction.isRunning()) nextAction.fadeIn(ACTION_FADE_DURATION).play();
      return;
    }

    this.currentAction?.fadeOut(ACTION_FADE_DURATION);
    if (reset) nextAction.reset();
    nextAction.enabled = true;
    nextAction.paused = false;
    nextAction.fadeIn(ACTION_FADE_DURATION).play();
    this.currentAction = nextAction;
  }

  update(deltaTime, player, terrain, enemies = []) {
    void enemies;
    const frameTime = Number.isFinite(deltaTime) ? Math.max(0, deltaTime) : 0;
    const wasAttacking = this.actionState === 'attack';

    this.attackCooldown = Math.max(0, this.attackCooldown - frameTime);
    this.mixer?.update(frameTime);
    if (wasAttacking) this.updateAttackWindows(player);

    if (!this.isAlive()) return;
    if (!player?.position || player.isDead?.()) {
      this.stopAI();
      return;
    }
    if (this.actionState === 'attack' || this.actionState === 'hurt') return;

    const offsetX = player.position.x - this.position.x;
    const offsetZ = player.position.z - this.position.z;
    const distance = Math.hypot(offsetX, offsetZ);

    if (this.engaged && distance > DISENGAGE_RANGE) this.stopAI();
    if (!this.engaged && distance <= ENGAGE_RANGE) this.engaged = true;
    if (!this.engaged) {
      this.setAction(this.standAction);
      return;
    }

    if (distance > 0) this.group.rotation.y = Math.atan2(offsetX, offsetZ);

    if (distance <= ATTACK_START_RANGE) {
      if (this.attackCooldown <= 0) this.startAttack();
      else this.setAction(this.standAction);
      return;
    }

    if (this.moveTowardPlayer(frameTime, offsetX, offsetZ, distance, terrain)) {
      this.setAction(this.runAction ?? this.standAction);
    } else {
      this.setAction(this.standAction);
    }
  }

  moveTowardPlayer(deltaTime, offsetX, offsetZ, distance, terrain) {
    if (distance <= 0 || deltaTime <= 0 || !terrain) return false;

    const movementDistance = Math.min(CHASE_SPEED * deltaTime, distance - ATTACK_START_RANGE);
    if (movementDistance <= 0) return false;

    const directionX = offsetX / distance;
    const directionZ = offsetZ / distance;
    const stepCount = Math.max(1, Math.ceil(movementDistance / MAX_MOVEMENT_STEP));
    const stepDistance = movementDistance / stepCount;
    let moved = false;

    for (let step = 0; step < stepCount; step += 1) {
      const nextX = this.position.x + directionX * stepDistance;
      const nextZ = this.position.z + directionZ * stepDistance;
      if (!this.canMoveTo(terrain, nextX, nextZ)) break;

      this.position.set(nextX, this.getGroundHeight(terrain, nextX, nextZ), nextZ);
      moved = true;
    }

    return moved;
  }

  canMoveTo(terrain, x, z) {
    if (isInWaterSystemVegetationExclusion(x, z, ENEMY_HIT_RADIUS)) return false;
    if (terrain.getNormalAt(x, z).y < MAX_SLOPE_NORMAL_Y) return false;

    const currentHeight = this.getGroundHeight(terrain, this.position.x, this.position.z);
    const nextHeight = this.getGroundHeight(terrain, x, z);
    return Math.abs(nextHeight - currentHeight) <= MAX_ADJACENT_HEIGHT_DIFFERENCE;
  }

  getGroundHeight(terrain, x, z) {
    const height = typeof terrain.getMaxHeightInRadius === 'function'
      ? terrain.getMaxHeightInRadius(x, z, ENEMY_HIT_RADIUS)
      : terrain.getHeightAt(x, z);
    return height + GROUND_OFFSET;
  }

  startAttack() {
    if (!this.attackAction) return false;

    this.actionState = 'attack';
    this.attackCooldown = ATTACK_COOLDOWN;
    this.attackPreviousNormalizedTime = 0;
    this.attackWindowsHit.clear();
    this.setAction(this.attackAction, true);
    return true;
  }

  updateAttackWindows(player) {
    const normalizedTime = this.getNormalizedActionTime(this.attackAction);

    ATTACK_WINDOWS.forEach((window, index) => {
      if (
        this.attackWindowsHit.has(index)
        || !didAnimationWindowOverlap(
          this.attackPreviousNormalizedTime,
          normalizedTime,
          window,
        )
      ) return;

      this.attackWindowsHit.add(index);
      if (
        player?.receiveEnemyAttack
        && isTargetInAttackArc(
          this.position,
          this.group.rotation.y,
          player.position,
          window.range,
          window.angleDeg,
        )
      ) {
        player.receiveEnemyAttack(window.damage);
      }
    });

    this.attackPreviousNormalizedTime = normalizedTime;
  }

  getNormalizedActionTime(action) {
    const duration = action?.getClip?.()?.duration ?? 0;
    return duration > 0 ? Math.min(action.time / duration, 1) : 0;
  }

  handleActionFinished(action) {
    if (action === this.attackAction && this.actionState === 'attack') {
      this.actionState = null;
      this.setAction(this.standAction);
      return;
    }

    if (action === this.hurtAction && this.actionState === 'hurt') {
      this.actionState = null;
      this.setAction(this.standAction);
    }
  }

  stopAI() {
    this.engaged = false;
    if (this.isAlive() && this.actionState !== 'hurt') this.setAction(this.standAction);
  }

  takeDamage(amount) {
    if (!this.isAlive()) return this.hp;

    this.hp = Math.max(0, this.hp - Math.max(0, Number(amount) || 0));
    if (this.hp === 0) {
      this.engaged = false;
      this.actionState = 'dead';
      this.setAction(this.deathAction, true);
      return this.hp;
    }

    if (!this.hurtTriggered && this.hp <= ENEMY_MAX_HP * 0.5) {
      this.hurtTriggered = true;
      this.actionState = 'hurt';
      this.setAction(this.hurtAction, true);
    }
    return this.hp;
  }

  isAlive() {
    return this.hp > 0;
  }

  getHitRadius() {
    return ENEMY_HIT_RADIUS;
  }

  getHp() {
    return this.hp;
  }

  getMaxHp() {
    return ENEMY_MAX_HP;
  }

  setAnimationTime(time) {
    this.mixer?.setTime(time);
  }

  dispose() {
    if (this.mixer) {
      this.mixer.removeEventListener('finished', this.handleMixerFinished);
      this.mixer.stopAllAction();
      if (this.model) this.mixer.uncacheRoot(this.model);
    }
    this.group.removeFromParent();
    this.group.clear();
    this.model = null;
    this.mixer = null;
  }

  get position() {
    return this.group.position;
  }
}
