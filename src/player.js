import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MAP_SIZE } from './vegetationConfig.js';

const UP = new THREE.Vector3(0, 1, 0);
const PLAYER_MODEL_PATH = '/assets/player/stand.fbx';
const PLAYER_ANIMATION_PATHS = Object.freeze({
  walk: '/assets/player/walk.fbx',
  run: '/assets/player/run.fbx',
  attack: '/assets/player/attack.fbx',
  attack2: '/assets/player/SwordAttack2.fbx',
  defense: '/assets/player/defense.fbx',
  defenseMove: '/assets/player/defenseMove.fbx',
  spell: '/assets/player/throwMagic.fbx',
  hurt: '/assets/player/hurt.fbx',
  death: '/assets/enemy/death.fbx',
});
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.35;
const PLAYER_EMISSIVE_COLOR = 0x1c2630;
const PLAYER_EMISSIVE_INTENSITY = 0.11;
const PLAYER_MAX_METALNESS = 0.35;
const PLAYER_MIN_ROUGHNESS = 0.28;
const PLAYER_ENVIRONMENT_INTENSITY = 1.3;
const PLAYER_ALBEDO_LIFT = new THREE.Color(0x68747d);
const GROUND_OFFSET = 0.03;
const MIN_WALKABLE_NORMAL_Y = Math.cos(THREE.MathUtils.degToRad(50));
const GROUND_SPEED = 5;
const AIR_SPEED = 60;
const GRAVITY = 30;
const MAP_BOUNDARY = MAP_SIZE / 2 - PLAYER_RADIUS;
const MAX_FALL_SPEED = 55;
const GROUND_SNAP_DISTANCE = 0.08;
const LEDGE_DROP_THRESHOLD = 0.45;
const LEDGE_PROBE_DISTANCE = PLAYER_RADIUS + 0.35;
const ACTION_FADE_DURATION = 0.2;
const INPUT_ACTION_FADE_DURATION = 0.16;
const RUN_TRIGGER_SECONDS = 1;
const DEFENSE_MOVE_SPEED_MULTIPLIER = 0.675;
const PLAYER_MAX_HP = 200;
const PLAYER_MAX_MP = 100;
const PLAYER_MAX_STAMINA = 100;
const PLAYER_ATTACK_DAMAGE = 20;
const ATTACK_STAMINA_COSTS = [25, 35];
const STAMINA_REGEN_PER_SECOND = 22.5;
const DEFENSE_STAMINA_REGEN_MULTIPLIER = 0.5;
const RUN_STAMINA_REGEN_MULTIPLIER = 0.75;
const EMPTY_STAMINA_MOVE_SPEED_MULTIPLIER = 0.8;
const BLOCK_STAMINA_COST_DAMAGE_MULTIPLIER = 1.5;
const GUARD_BREAK_DAMAGE_MULTIPLIER = 0.5;
const ATTACK_TIME_SCALE = 1.8;
const ATTACK_HIT_WINDOWS = Object.freeze([
  Object.freeze({ start: 0.3, end: 0.52, damageMul: 1, rangeMul: 1 }),
  Object.freeze({ start: 0.28, end: 0.5, damageMul: 1.2, rangeMul: 1.2 }),
]);
const COMBO_INPUT_WINDOW = Object.freeze({ start: 0.45, end: 0.78 });
const COMBO_LINK_AT = 0.45;
const SPELL_MP_COST = 25;
const SPELL_COOLDOWN = 0.72;
const SPELL_RELEASE_DELAY = 0.8;
const SPELL_DAMAGE = 52;

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

export class Player {
  constructor() {
    this.group = new THREE.Group();
    this.moveDirection = new THREE.Vector3();
    this.cameraForward = new THREE.Vector3();
    this.cameraRight = new THREE.Vector3();
    this.collisionEndPosition = { x: 0, z: 0 };
    this.nextHorizontalPosition = new THREE.Vector2();
    this.mixer = null;
    this.model = null;
    this.idleAction = null;
    this.walkAction = null;
    this.runAction = null;
    this.attackAction = null;
    this.attack2Action = null;
    this.defenseAction = null;
    this.defenseMoveAction = null;
    this.spellAction = null;
    this.hurtAction = null;
    this.deathAction = null;
    this.currentAction = null;
    this.actionState = null;
    this.verticalVelocity = 0;
    this.isDroppingFromLedge = false;
    this.isHovering = false;
    this.moveHoldTime = 0;
    this.comboIndex = 0;
    this.comboQueued = false;
    this.attackPreviousNormalizedTime = 0;
    this.attackHitConsumed = false;
    this.attackHitEvents = [];
    this.attackEventId = 0;
    this.spellCooldown = 0;
    this.spellReleaseTimer = 0;
    this.spellReleaseReady = false;
    this.hp = PLAYER_MAX_HP;
    this.mp = PLAYER_MAX_MP;
    this.stamina = PLAYER_MAX_STAMINA;
    this.staminaDepleted = false;
    this.rigNodeNameMap = null;

    this.ready = this.loadModel();
  }

  async loadModel() {
    const loader = new FBXLoader();

    try {
      const model = await loader.loadAsync(PLAYER_MODEL_PATH);
      this.setupModel(model);
      this.model = model;
      this.mixer = new THREE.AnimationMixer(model);
      this.mixer.addEventListener('finished', (event) => this.handleActionFinished(event.action));
      this.setupIdleAnimation(model);
      this.group.add(model);

      await Promise.all(Object.entries(PLAYER_ANIMATION_PATHS).map(async ([name, path]) => {
        try {
          const animationModel = await loader.loadAsync(path);
          if (animationModel.animations.length > 0) {
            this.setupAction(name, animationModel.animations[0]);
          }
        } catch (error) {
          console.error(`Failed to load player ${name} animation:`, error);
        }
      }));

      return true;
    } catch (error) {
      console.error('Failed to load player model:', error);
      return false;
    }
  }

  setupModel(model) {
    model.traverse((child) => {
      if (!child.isMesh) return;

      child.castShadow = true;
      child.receiveShadow = true;
      this.configureReadableMaterial(child);
    });

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = PLAYER_HEIGHT / size.y;

    model.scale.multiplyScalar(scale);
    model.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(model);
    const center = scaledBox.getCenter(new THREE.Vector3());

    model.position.x -= center.x;
    model.position.y -= scaledBox.min.y;
    model.position.z -= center.z;
  }

  configureReadableMaterial(mesh) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    const readableMaterials = materials.map((material) => {
      const readableMaterial = material.isMeshStandardMaterial
        ? material.clone()
        : new THREE.MeshStandardMaterial({
            name: material.name,
            color: material.color,
            map: material.map,
            normalMap: material.normalMap,
            normalScale: material.normalScale,
            bumpMap: material.bumpMap,
            bumpScale: material.bumpScale,
            alphaMap: material.alphaMap,
            alphaTest: material.alphaTest,
            opacity: material.opacity,
            transparent: material.transparent,
            side: material.side,
            vertexColors: material.vertexColors,
          });

      if ('emissive' in readableMaterial) {
        readableMaterial.emissive = new THREE.Color(PLAYER_EMISSIVE_COLOR);
        readableMaterial.emissiveIntensity = PLAYER_EMISSIVE_INTENSITY;
      }

      if ('color' in readableMaterial) {
        readableMaterial.color.lerp(PLAYER_ALBEDO_LIFT, 0.48);
      }

      if ('metalness' in readableMaterial) {
        readableMaterial.metalness = Math.min(readableMaterial.metalness, PLAYER_MAX_METALNESS);
      }

      if ('roughness' in readableMaterial) {
        readableMaterial.roughness = Math.max(readableMaterial.roughness, PLAYER_MIN_ROUGHNESS);
      }

      if ('envMapIntensity' in readableMaterial) {
        readableMaterial.envMapIntensity = PLAYER_ENVIRONMENT_INTENSITY;
      }

      readableMaterial.needsUpdate = true;
      return readableMaterial;
    });

    mesh.material = Array.isArray(mesh.material) ? readableMaterials : readableMaterials[0];
  }

  setupIdleAnimation(model) {
    if (model.animations.length === 0) return;

    const clip = this.prepareAnimationClip(model.animations[0]);
    this.idleAction = this.mixer.clipAction(clip);
    this.idleAction.setLoop(THREE.LoopRepeat, Infinity);
    this.idleAction.clampWhenFinished = false;
    this.setAction(this.idleAction, true);
  }

  setupAction(name, sourceClip) {
    if (!this.mixer) return;

    const clip = this.prepareAnimationClip(sourceClip);
    const action = this.mixer.clipAction(clip);
    const isLooping = name === 'walk' || name === 'run' || name === 'defenseMove';

    action.setLoop(isLooping ? THREE.LoopRepeat : THREE.LoopOnce, isLooping ? Infinity : 1);
    action.clampWhenFinished = !isLooping;
    action.enabled = true;

    if (name === 'attack' || name === 'attack2') action.timeScale = ATTACK_TIME_SCALE;
    if (name === 'defense') action.timeScale = 5;
    if (name === 'spell') action.timeScale = 1.2;

    this[`${name}Action`] = action;
  }

  prepareAnimationClip(sourceClip) {
    const clip = sourceClip.clone();
    const nodeMap = this.getRigNodeNameMap();

    clip.tracks = clip.tracks.filter((track) => {
      const targetName = getTrackTargetName(track.name);
      if (targetName && !this.model?.getObjectByName(targetName)) {
        const mappedName = nodeMap.get(normalizeRigNodeName(targetName));
        if (!mappedName) return false;
        track.name = `${mappedName}${getTrackPropertyName(track.name)}`;
      }

      if (!/hips.*\.position$/i.test(track.name)) return true;
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
      const key = normalizeRigNodeName(node.name);
      if (key && !this.rigNodeNameMap.has(key)) {
        this.rigNodeNameMap.set(key, node.name);
      }
    });
    return this.rigNodeNameMap;
  }

  setAction(nextAction, reset = false, fadeDuration = ACTION_FADE_DURATION) {
    if (!nextAction) return;

    if (nextAction === this.currentAction) {
      if (!reset) return;
      nextAction.reset();
      nextAction.enabled = true;
      nextAction.paused = false;
      if (!nextAction.isRunning()) nextAction.fadeIn(fadeDuration).play();
      return;
    }

    if (this.currentAction) this.currentAction.fadeOut(fadeDuration);
    if (reset) nextAction.reset();
    nextAction.enabled = true;
    nextAction.paused = false;
    nextAction.fadeIn(fadeDuration).play();
    this.currentAction = nextAction;
  }

  setAnimationTime(time) {
    this.mixer?.setTime(time);
  }

  update(deltaTime, input, camera, terrain, worldCollision = null) {
    this.spellCooldown = Math.max(0, this.spellCooldown - deltaTime);
    this.mixer?.update(deltaTime);
    this.updateAttackWindow();
    this.updateSpellRelease(deltaTime);
    this.updateCombatInput(input);
    this.updateStamina(deltaTime);

    if (this.actionState === 'dead') return;

    this.cameraForward.copy(camera.getWorldDirection(this.cameraForward));
    this.cameraForward.y = 0;
    this.cameraForward.normalize();

    this.cameraRight.crossVectors(this.cameraForward, UP).normalize();
    this.moveDirection.set(0, 0, 0);

    if (input.isKeyDown('KeyW')) this.moveDirection.add(this.cameraForward);
    if (input.isKeyDown('KeyS')) this.moveDirection.sub(this.cameraForward);
    if (input.isKeyDown('KeyA')) this.moveDirection.sub(this.cameraRight);
    if (input.isKeyDown('KeyD')) this.moveDirection.add(this.cameraRight);

    const hasMovementInput = this.moveDirection.lengthSq() > 0;
    const canMove = this.actionState === null || this.actionState === 'defense';
    const wantsToMoveHorizontally = hasMovementInput && canMove;
    const groundHeight = this.getActiveGroundHeight(terrain, this.group.position.x, this.group.position.z);
    const isAscending = input.isKeyDown('AltLeft') || input.isKeyDown('AltRight');
    const isDescending = input.isKeyDown('ControlLeft') || input.isKeyDown('ControlRight');

    if (isAscending) {
      this.group.position.y += AIR_SPEED * deltaTime;
      this.verticalVelocity = 0;
      this.isDroppingFromLedge = false;
      this.isHovering = true;
    } else if (isDescending) {
      this.group.position.y = Math.max(this.group.position.y - AIR_SPEED * deltaTime, groundHeight);
      this.verticalVelocity = 0;
      this.updateHoverLanding(groundHeight);
    } else if (this.isHovering) {
      this.holdHover(groundHeight);
    } else {
      this.updateVerticalMotion(deltaTime, groundHeight);
    }

    const isAirborne = this.group.position.y > groundHeight + GROUND_SNAP_DISTANCE;

    let didMoveHorizontally = false;

    if (wantsToMoveHorizontally) {
      this.moveDirection.normalize();
      const staminaSpeedMultiplier = this.staminaDepleted
        ? EMPTY_STAMINA_MOVE_SPEED_MULTIPLIER
        : 1;
      const defenseSpeedMultiplier = this.actionState === 'defense'
        ? DEFENSE_MOVE_SPEED_MULTIPLIER
        : 1;
      const speed = (isAirborne ? AIR_SPEED : GROUND_SPEED)
        * staminaSpeedMultiplier
        * defenseSpeedMultiplier;
      let nextX = THREE.MathUtils.clamp(
        this.group.position.x + this.moveDirection.x * speed * deltaTime,
        -MAP_BOUNDARY, MAP_BOUNDARY,
      );
      let nextZ = THREE.MathUtils.clamp(
        this.group.position.z + this.moveDirection.z * speed * deltaTime,
        -MAP_BOUNDARY, MAP_BOUNDARY,
      );

      if (worldCollision) {
        const resolvedPosition = this.resolveWorldCollision(worldCollision, nextX, nextZ);
        nextX = THREE.MathUtils.clamp(resolvedPosition.x, -MAP_BOUNDARY, MAP_BOUNDARY);
        nextZ = THREE.MathUtils.clamp(resolvedPosition.y, -MAP_BOUNDARY, MAP_BOUNDARY);
      }

      const isDroppingOffEdge = !this.isHovering && this.isDroppingOffEdge(terrain, nextX, nextZ);

      if (!isAirborne && !isDroppingOffEdge && !this.canStandAt(terrain, nextX, nextZ)) {
        this.moveHoldTime = 0;
        this.updateMovementAction(false);
        return;
      }

      didMoveHorizontally = Math.hypot(
        nextX - this.group.position.x,
        nextZ - this.group.position.z,
      ) > 0.0001;
      this.group.position.x = nextX;
      this.group.position.z = nextZ;

      if (isDroppingOffEdge) {
        this.isDroppingFromLedge = true;
        this.isHovering = false;
        this.verticalVelocity = Math.min(this.verticalVelocity, 0);
      }

      const nextGroundHeight = this.getActiveGroundHeight(terrain, nextX, nextZ);

      if (!isAirborne && !isDroppingOffEdge) {
        this.group.position.y = nextGroundHeight;
        this.verticalVelocity = 0;
        this.isDroppingFromLedge = false;
        this.isHovering = false;
      } else if (this.group.position.y <= nextGroundHeight) {
        this.group.position.y = nextGroundHeight;
        this.verticalVelocity = 0;
        this.isDroppingFromLedge = false;
        this.isHovering = false;
      }

      if (didMoveHorizontally) {
        this.group.rotation.y = Math.atan2(this.moveDirection.x, this.moveDirection.z);
      }
    }

    if (this.actionState === 'defense') {
      this.moveHoldTime = 0;
    } else if (didMoveHorizontally) {
      this.moveHoldTime += deltaTime;
    } else {
      this.moveHoldTime = 0;
    }

    this.updateMovementAction(didMoveHorizontally);
  }

  updateCombatInput(input) {
    const attackPressed = input.consumePressed?.('KeyJ') ?? false;
    const spellPressed = input.consumePressed?.('KeyE') ?? false;
    const defenseDown = input.isKeyDown('KeyK');

    if (this.actionState === 'attack') {
      if (defenseDown && this.canCancelAttackIntoDefense()) {
        this.resetAttackState();
        this.startDefense();
        return;
      }

      if (attackPressed && this.comboIndex === 0) {
        const normalizedTime = this.getNormalizedActionTime(this.attackAction);
        if (
          normalizedTime >= COMBO_INPUT_WINDOW.start
          && normalizedTime <= COMBO_INPUT_WINDOW.end
        ) {
          this.comboQueued = true;
        }
      }

      if (
        this.comboQueued
        && this.comboIndex === 0
        && this.getNormalizedActionTime(this.attackAction) >= COMBO_LINK_AT
      ) {
        if (!this.startAttackStep(1)) this.comboQueued = false;
      }
      return;
    }

    if (this.actionState === 'hurt' || this.actionState === 'spell' || this.actionState === 'dead') {
      return;
    }

    if (defenseDown) {
      if (this.actionState !== 'defense') this.startDefense();
      return;
    }

    if (this.actionState === 'defense') {
      this.actionState = null;
    }

    if (attackPressed) {
      this.startAttackStep(0);
    } else if (spellPressed) {
      this.startSpell();
    }
  }

  startAttackStep(index) {
    const action = index === 1 ? this.attack2Action : this.attackAction;
    if (!action || !this.spendStamina(ATTACK_STAMINA_COSTS[index])) return false;

    if (index === 0) this.attackHitEvents.length = 0;
    this.actionState = 'attack';
    this.comboIndex = index;
    this.comboQueued = false;
    this.attackPreviousNormalizedTime = 0;
    this.attackHitConsumed = false;
    this.setAction(action, true, INPUT_ACTION_FADE_DURATION);
    return true;
  }

  resetAttackState() {
    this.comboIndex = 0;
    this.comboQueued = false;
    this.attackPreviousNormalizedTime = 0;
    this.attackHitConsumed = false;
    this.attackHitEvents.length = 0;
    if (this.actionState === 'attack') this.actionState = null;
  }

  updateAttackWindow() {
    if (this.actionState !== 'attack') return;

    const action = this.comboIndex === 1 ? this.attack2Action : this.attackAction;
    const normalizedTime = this.getNormalizedActionTime(action);
    const window = ATTACK_HIT_WINDOWS[this.comboIndex];

    if (
      !this.attackHitConsumed
      && normalizedTime >= window.start
      && this.attackPreviousNormalizedTime <= window.end
    ) {
      this.attackHitConsumed = true;
      this.attackEventId += 1;
      this.attackHitEvents.push({
        id: this.attackEventId,
        comboIndex: this.comboIndex,
        damageMul: window.damageMul,
        rangeMul: window.rangeMul,
      });
    }

    this.attackPreviousNormalizedTime = normalizedTime;
  }

  canCancelAttackIntoDefense() {
    if (this.actionState !== 'attack' || this.comboIndex !== 0) return false;
    return this.getNormalizedActionTime(this.attackAction) >= ATTACK_HIT_WINDOWS[0].end;
  }

  startDefense() {
    if (!this.defenseAction) return false;
    this.actionState = 'defense';
    this.setAction(this.defenseAction, true, INPUT_ACTION_FADE_DURATION);
    return true;
  }

  startSpell() {
    if (
      !this.spellAction
      || this.spellCooldown > 0
      || this.mp < SPELL_MP_COST
    ) return false;

    this.mp -= SPELL_MP_COST;
    this.spellCooldown = SPELL_COOLDOWN;
    this.spellReleaseTimer = SPELL_RELEASE_DELAY;
    this.spellReleaseReady = false;
    this.actionState = 'spell';
    this.setAction(this.spellAction, true, INPUT_ACTION_FADE_DURATION);
    return true;
  }

  updateSpellRelease(deltaTime) {
    if (this.actionState !== 'spell' || this.spellReleaseReady) return;

    this.spellReleaseTimer -= deltaTime;
    if (this.spellReleaseTimer <= 0) this.spellReleaseReady = true;
  }

  handleActionFinished(action) {
    if (action === this.attackAction || action === this.attack2Action) {
      const activeAttackAction = this.comboIndex === 1 ? this.attack2Action : this.attackAction;
      if (this.actionState === 'attack' && action === activeAttackAction) {
        this.actionState = null;
        this.comboIndex = 0;
        this.comboQueued = false;
      }
      return;
    }

    if (action === this.spellAction && this.actionState === 'spell') {
      this.actionState = null;
      return;
    }

    if (action === this.hurtAction && this.actionState === 'hurt') {
      this.actionState = null;
    }
  }

  updateMovementAction(isMoving) {
    if (this.actionState === 'attack' || this.actionState === 'spell' || this.actionState === 'hurt' || this.actionState === 'dead') {
      return;
    }

    if (this.actionState === 'defense') {
      this.setAction(isMoving && this.defenseMoveAction
        ? this.defenseMoveAction
        : this.defenseAction ?? this.idleAction);
      return;
    }

    if (isMoving) {
      const locomotionAction = this.moveHoldTime >= RUN_TRIGGER_SECONDS && this.runAction
        ? this.runAction
        : this.walkAction;
      this.setAction(locomotionAction ?? this.idleAction);
      return;
    }

    this.setAction(this.idleAction);
  }

  updateStamina(deltaTime) {
    if (this.stamina >= PLAYER_MAX_STAMINA) return;

    let multiplier = 1;
    if (this.actionState === 'defense') multiplier = DEFENSE_STAMINA_REGEN_MULTIPLIER;
    else if (this.moveHoldTime >= RUN_TRIGGER_SECONDS) multiplier = RUN_STAMINA_REGEN_MULTIPLIER;

    this.stamina = Math.min(
      PLAYER_MAX_STAMINA,
      this.stamina + STAMINA_REGEN_PER_SECOND * multiplier * deltaTime,
    );
    if (this.staminaDepleted && this.stamina >= ATTACK_STAMINA_COSTS[0]) {
      this.staminaDepleted = false;
    }
  }

  spendStamina(amount) {
    if (this.stamina < amount) return false;

    this.stamina = Math.max(0, this.stamina - amount);
    if (this.stamina === 0) this.staminaDepleted = true;
    return true;
  }

  receiveEnemyAttack(amount) {
    if (this.actionState === 'dead' || this.hp <= 0) {
      return { blocked: false, hp: this.hp };
    }

    if (this.actionState === 'defense') {
      const blockCost = Math.max(0, amount) * BLOCK_STAMINA_COST_DAMAGE_MULTIPLIER;
      if (blockCost <= 0 || this.stamina > blockCost) {
        this.spendStamina(blockCost);
        return { blocked: true, hp: this.hp };
      }

      this.stamina = 0;
      this.staminaDepleted = true;
      this.takeDamage(amount * GUARD_BREAK_DAMAGE_MULTIPLIER);
      return { blocked: false, hp: this.hp };
    }

    this.takeDamage(amount);
    return { blocked: false, hp: this.hp };
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - Math.max(0, amount));
    this.comboQueued = false;
    this.attackHitEvents.length = 0;
    this.spellReleaseReady = false;
    this.spellReleaseTimer = 0;

    if (this.hp <= 0) {
      this.actionState = 'dead';
      this.setAction(this.deathAction ?? this.hurtAction, true, INPUT_ACTION_FADE_DURATION);
      return this.hp;
    }

    this.actionState = 'hurt';
    if (this.hurtAction) {
      this.setAction(this.hurtAction, true, INPUT_ACTION_FADE_DURATION);
    } else {
      this.actionState = null;
    }
    return this.hp;
  }

  consumeAttackHitWindow() {
    return this.attackHitEvents.shift() ?? false;
  }

  consumeSpellRelease() {
    if (!this.spellReleaseReady) return false;

    this.spellReleaseReady = false;
    return { damage: SPELL_DAMAGE };
  }

  getNormalizedActionTime(action) {
    const duration = action?.getClip?.()?.duration ?? 0;
    return duration > 0 ? action.time / duration : 0;
  }

  getForward(target = new THREE.Vector3()) {
    return target.set(
      Math.sin(this.group.rotation.y),
      0,
      Math.cos(this.group.rotation.y),
    );
  }

  getHp() {
    return this.hp;
  }

  getMaxHp() {
    return PLAYER_MAX_HP;
  }

  getMp() {
    return this.mp;
  }

  getMaxMp() {
    return PLAYER_MAX_MP;
  }

  getStamina() {
    return this.stamina;
  }

  getMaxStamina() {
    return PLAYER_MAX_STAMINA;
  }

  getAttackDamage() {
    return PLAYER_ATTACK_DAMAGE;
  }

  isDefending() {
    return this.actionState === 'defense';
  }

  isDead() {
    return this.hp <= 0;
  }

  resolveWorldCollision(worldCollision, nextX, nextZ) {
    this.collisionEndPosition.x = nextX;
    this.collisionEndPosition.z = nextZ;
    worldCollision.resolveMovement(
      this.group.position,
      this.collisionEndPosition,
      this.group.position.y,
      this.group.position.y + PLAYER_HEIGHT,
      PLAYER_RADIUS,
      this.nextHorizontalPosition,
    );
    return this.nextHorizontalPosition;
  }

  canStandAt(terrain, x, z) {
    return terrain.getNormalAt(x, z).y >= MIN_WALKABLE_NORMAL_Y;
  }

  isDroppingOffEdge(terrain, nextX, nextZ) {
    const currentGroundHeight = this.getCenterGroundHeight(
      terrain,
      this.group.position.x,
      this.group.position.z,
    );
    const nextCenterHeight = this.getCenterGroundHeight(terrain, nextX, nextZ);
    const nextFrontHeight = this.getCenterGroundHeight(
      terrain,
      nextX + this.moveDirection.x * LEDGE_PROBE_DISTANCE,
      nextZ + this.moveDirection.z * LEDGE_PROBE_DISTANCE,
    );
    const nextGroundHeight = Math.min(nextCenterHeight, nextFrontHeight);

    return nextGroundHeight < currentGroundHeight - LEDGE_DROP_THRESHOLD
      && !this.canStandAt(terrain, nextX, nextZ);
  }

  updateVerticalMotion(deltaTime, groundHeight) {
    const isNearGround = this.group.position.y <= groundHeight + GROUND_SNAP_DISTANCE;

    if (isNearGround && this.verticalVelocity <= 0) {
      this.group.position.y = groundHeight;
      this.verticalVelocity = 0;
      this.isDroppingFromLedge = false;
      this.isHovering = false;
      return;
    }

    this.verticalVelocity = Math.max(
      this.verticalVelocity - GRAVITY * deltaTime,
      -MAX_FALL_SPEED,
    );
    this.group.position.y += this.verticalVelocity * deltaTime;

    if (this.group.position.y <= groundHeight) {
      this.group.position.y = groundHeight;
      this.verticalVelocity = 0;
      this.isDroppingFromLedge = false;
      this.isHovering = false;
    }
  }

  holdHover(groundHeight) {
    this.verticalVelocity = 0;
    this.isDroppingFromLedge = false;
    this.updateHoverLanding(groundHeight);
  }

  updateHoverLanding(groundHeight) {
    if (this.group.position.y > groundHeight + GROUND_SNAP_DISTANCE) return;

    this.group.position.y = groundHeight;
    this.isHovering = false;
    this.isDroppingFromLedge = false;
  }

  getActiveGroundHeight(terrain, x, z) {
    if (this.isDroppingFromLedge) {
      return this.getCenterGroundHeight(terrain, x, z);
    }

    return this.getGroundHeight(terrain, x, z);
  }

  getCenterGroundHeight(terrain, x, z) {
    return terrain.getHeightAt(x, z) + GROUND_OFFSET;
  }

  getGroundHeight(terrain, x, z) {
    return terrain.getMaxHeightInRadius(x, z, PLAYER_RADIUS) + GROUND_OFFSET;
  }

  get position() {
    return this.group.position;
  }
}
