import * as THREE from 'three';

const CAMERA_GROUND_CLEARANCE = 0.4;
const CAMERA_COLLISION_STEPS = 16;
const MIN_SAFE_CAMERA_DISTANCE = 1.2;
const MIN_CAMERA_PITCH = -0.85;
const MAX_CAMERA_PITCH = 1.2;

export class ThirdPersonCamera {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target;
    this.yaw = 0;
    this.pitch = 0.45;
    this.distance = 6;
    this.minDistance = 3;
    this.maxDistance = 18;
    this.rotateSpeed = 0.006;
    this.zoomSpeed = 0.006;
    this.lookAtOffset = new THREE.Vector3(0, 1.25, 0);
    this.targetPosition = new THREE.Vector3();
    this.desiredPosition = new THREE.Vector3();
    this.safePosition = new THREE.Vector3();
    this.samplePosition = new THREE.Vector3();
  }

  update(input, terrain) {
    const pointerDelta = input.consumePointerDelta();
    const wheelDelta = input.consumeWheelDelta();

    this.yaw -= pointerDelta.x * this.rotateSpeed;
    this.pitch += pointerDelta.y * this.rotateSpeed;
    this.pitch = THREE.MathUtils.clamp(this.pitch, MIN_CAMERA_PITCH, MAX_CAMERA_PITCH);

    this.distance += wheelDelta * this.zoomSpeed;
    this.distance = THREE.MathUtils.clamp(this.distance, this.minDistance, this.maxDistance);

    this.targetPosition.copy(this.target.position).add(this.lookAtOffset);

    const horizontalDistance = Math.cos(this.pitch) * this.distance;
    const height = Math.sin(this.pitch) * this.distance;

    this.desiredPosition.set(
      this.targetPosition.x + Math.sin(this.yaw) * horizontalDistance,
      this.targetPosition.y + height,
      this.targetPosition.z + Math.cos(this.yaw) * horizontalDistance,
    );

    this.resolveTerrainCollision(terrain);
    this.camera.lookAt(this.targetPosition);
  }

  resolveTerrainCollision(terrain) {
    this.safePosition.copy(this.desiredPosition);
    this.clampAboveTerrain(this.safePosition, terrain);

    const desiredDistance = this.targetPosition.distanceTo(this.safePosition);

    for (let step = 1; step <= CAMERA_COLLISION_STEPS; step += 1) {
      const t = step / CAMERA_COLLISION_STEPS;
      this.samplePosition.lerpVectors(this.targetPosition, this.safePosition, t);

      const minY = terrain.getHeightAt(this.samplePosition.x, this.samplePosition.z)
        + CAMERA_GROUND_CLEARANCE;

      if (this.samplePosition.y >= minY) continue;

      const safeT = Math.max((step - 1) / CAMERA_COLLISION_STEPS, MIN_SAFE_CAMERA_DISTANCE / desiredDistance);
      this.safePosition.lerpVectors(this.targetPosition, this.safePosition, safeT);
      this.clampAboveTerrain(this.safePosition, terrain);
      break;
    }

    this.camera.position.copy(this.safePosition);
  }

  clampAboveTerrain(position, terrain) {
    const minY = terrain.getHeightAt(position.x, position.z) + CAMERA_GROUND_CLEARANCE;
    position.y = Math.max(position.y, minY);
  }
}
