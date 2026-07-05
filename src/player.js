import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MAP_SIZE } from './vegetationConfig.js';

const UP = new THREE.Vector3(0, 1, 0);
const PLAYER_MODEL_PATH = '/assets/player/stand.fbx';
const WALK_ANIMATION_PATH = '/assets/player/walk.fbx';
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.35;
const PLAYER_EMISSIVE_COLOR = 0x1c2630;
const PLAYER_EMISSIVE_INTENSITY = 0.13;
const PLAYER_MAX_METALNESS = 0.35;
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

export class Player {
  constructor() {
    this.group = new THREE.Group();
    this.moveDirection = new THREE.Vector3();
    this.cameraForward = new THREE.Vector3();
    this.cameraRight = new THREE.Vector3();
    this.mixer = null;
    this.idleAction = null;
    this.walkAction = null;
    this.currentAction = null;
    this.verticalVelocity = 0;
    this.isDroppingFromLedge = false;
    this.isHovering = false;

    this.loadModel();
  }

  loadModel() {
    const loader = new FBXLoader();

    loader.load(
      PLAYER_MODEL_PATH,
      (model) => {
        this.setupModel(model);
        this.setupIdleAnimation(model);
        this.loadWalkAnimation();
        this.group.add(model);
      },
      undefined,
      (error) => {
        console.error('Failed to load player model:', error);
      },
    );
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
      const readableMaterial = material.clone();

      if ('emissive' in readableMaterial) {
        readableMaterial.emissive = new THREE.Color(PLAYER_EMISSIVE_COLOR);
        readableMaterial.emissiveIntensity = PLAYER_EMISSIVE_INTENSITY;
      }

      if ('metalness' in readableMaterial) {
        readableMaterial.metalness = Math.min(readableMaterial.metalness, PLAYER_MAX_METALNESS);
      }

      readableMaterial.needsUpdate = true;
      return readableMaterial;
    });

    mesh.material = Array.isArray(mesh.material) ? readableMaterials : readableMaterials[0];
  }

  setupIdleAnimation(model) {
    if (model.animations.length === 0) return;

    this.mixer = new THREE.AnimationMixer(model);
    this.idleAction = this.mixer.clipAction(model.animations[0]);
    this.idleAction.setLoop(THREE.LoopRepeat, Infinity);
    this.setAction(this.idleAction);
  }

  loadWalkAnimation() {
    if (!this.mixer) return;

    const loader = new FBXLoader();

    loader.load(
      WALK_ANIMATION_PATH,
      (model) => {
        if (model.animations.length === 0) return;

        const walkClip = this.removeRootMotion(model.animations[0]);
        this.walkAction = this.mixer.clipAction(walkClip);
        this.walkAction.setLoop(THREE.LoopRepeat, Infinity);
      },
      undefined,
      (error) => {
        console.error('Failed to load walk animation:', error);
      },
    );
  }

  removeRootMotion(clip) {
    const tracks = clip.tracks
      .filter((track) => track.name !== 'mixamorigHips.position')
      .map((track) => track.clone());

    return new THREE.AnimationClip(`${clip.name}-no-root-motion`, clip.duration, tracks);
  }

  setAction(nextAction) {
    if (!nextAction || nextAction === this.currentAction) return;

    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);
    nextAction.fadeIn(ACTION_FADE_DURATION);
    nextAction.play();

    if (this.currentAction) {
      this.currentAction.fadeOut(ACTION_FADE_DURATION);
    }

    this.currentAction = nextAction;
  }

  update(deltaTime, input, camera, terrain) {
    this.mixer?.update(deltaTime);

    this.cameraForward.copy(camera.getWorldDirection(this.cameraForward));
    this.cameraForward.y = 0;
    this.cameraForward.normalize();

    this.cameraRight.crossVectors(this.cameraForward, UP).normalize();

    this.moveDirection.set(0, 0, 0);

    if (input.isKeyDown('KeyW')) this.moveDirection.add(this.cameraForward);
    if (input.isKeyDown('KeyS')) this.moveDirection.sub(this.cameraForward);
    if (input.isKeyDown('KeyA')) this.moveDirection.sub(this.cameraRight);
    if (input.isKeyDown('KeyD')) this.moveDirection.add(this.cameraRight);

    const isMovingHorizontally = this.moveDirection.lengthSq() > 0;
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

    if (isMovingHorizontally) {
      this.setAction(this.walkAction);

      this.moveDirection.normalize();
      const speed = isAirborne ? AIR_SPEED : GROUND_SPEED;
      const nextX = THREE.MathUtils.clamp(
        this.group.position.x + this.moveDirection.x * speed * deltaTime,
        -MAP_BOUNDARY, MAP_BOUNDARY,
      );
      const nextZ = THREE.MathUtils.clamp(
        this.group.position.z + this.moveDirection.z * speed * deltaTime,
        -MAP_BOUNDARY, MAP_BOUNDARY,
      );
      const isDroppingOffEdge = !this.isHovering && this.isDroppingOffEdge(terrain, nextX, nextZ);

      if (!isAirborne && !isDroppingOffEdge && !this.canStandAt(terrain, nextX, nextZ)) {
        this.setAction(this.idleAction);
        return;
      }

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

      this.group.rotation.y = Math.atan2(this.moveDirection.x, this.moveDirection.z);
      return;
    }

    this.setAction(this.idleAction);
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

    return nextGroundHeight < currentGroundHeight - LEDGE_DROP_THRESHOLD;
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
