import * as THREE from 'three';

const FIREBALL_RADIUS = 0.34;
const FIREBALL_SPEED = 15.65;
const FIREBALL_LIFETIME = 1.55;
const FIREBALL_LAUNCH_UP_VELOCITY = 2.2;
const FIREBALL_GRAVITY = 8.5;
const FIREBALL_HIT_RADIUS_BONUS = 0.18;
const FIREBALL_SPAWN_FORWARD = 0.72;
const FIREBALL_SPAWN_HEIGHT = 1.18;
const TRAIL_POINT_COUNT = 14;
const BURST_LIFETIME = 0.35;

export function distanceSquaredPointToSegment(point, start, end) {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentZ = end.z - start.z;
  const segmentLengthSquared = segmentX ** 2 + segmentY ** 2 + segmentZ ** 2;

  if (segmentLengthSquared <= 0.000001) {
    return (point.x - start.x) ** 2
      + (point.y - start.y) ** 2
      + (point.z - start.z) ** 2;
  }

  const projection = THREE.MathUtils.clamp(
    (
      (point.x - start.x) * segmentX
      + (point.y - start.y) * segmentY
      + (point.z - start.z) * segmentZ
    ) / segmentLengthSquared,
    0,
    1,
  );
  const closestX = start.x + segmentX * projection;
  const closestY = start.y + segmentY * projection;
  const closestZ = start.z + segmentZ * projection;

  return (point.x - closestX) ** 2
    + (point.y - closestY) ** 2
    + (point.z - closestZ) ** 2;
}

export function segmentIntersectsSphere(start, end, center, radius) {
  return distanceSquaredPointToSegment(center, start, end) <= radius ** 2;
}

export class SpellSystem {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
    this.bursts = [];
    this.enemyCenter = new THREE.Vector3();
  }

  cast(playerPosition, direction, damage) {
    if (direction.lengthSq() <= 0.0001) return false;

    const forward = direction.clone().normalize();
    const origin = playerPosition.clone()
      .addScaledVector(forward, FIREBALL_SPAWN_FORWARD);
    origin.y += FIREBALL_SPAWN_HEIGHT;

    const group = new THREE.Group();
    group.position.copy(origin);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(FIREBALL_RADIUS, 20, 14),
      new THREE.MeshStandardMaterial({
        color: 0xffc259,
        emissive: 0xff4d00,
        emissiveIntensity: 5,
        roughness: 0.35,
        metalness: 0,
      }),
    );
    group.add(core);

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(FIREBALL_RADIUS * 1.18, 14, 10),
      new THREE.MeshBasicMaterial({
        color: 0xff7417,
        wireframe: true,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
      }),
    );
    group.add(shell);

    const ringGeometry = new THREE.TorusGeometry(FIREBALL_RADIUS * 1.28, 0.018, 6, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd36d,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
    });
    const ringA = new THREE.Mesh(ringGeometry, ringMaterial);
    ringA.rotation.x = Math.PI / 2;
    group.add(ringA);
    const ringB = new THREE.Mesh(ringGeometry, ringMaterial.clone());
    ringB.rotation.y = Math.PI / 2;
    group.add(ringB);

    const trailPositions = new Float32Array(TRAIL_POINT_COUNT * 3);
    for (let index = 0; index < TRAIL_POINT_COUNT; index += 1) {
      trailPositions[index * 3] = origin.x;
      trailPositions[index * 3 + 1] = origin.y;
      trailPositions[index * 3 + 2] = origin.z;
    }
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trail = new THREE.Points(
      trailGeometry,
      new THREE.PointsMaterial({
        color: 0xff8a2b,
        size: 0.18,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    trail.frustumCulled = false;

    this.scene.add(group);
    this.scene.add(trail);
    this.projectiles.push({
      group,
      shell,
      ringA,
      ringB,
      trail,
      previousPosition: origin.clone(),
      velocity: forward.multiplyScalar(FIREBALL_SPEED).add(new THREE.Vector3(0, FIREBALL_LAUNCH_UP_VELOCITY, 0)),
      damage,
      age: 0,
    });
    return true;
  }

  update(deltaTime, enemies, terrain) {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      projectile.age += deltaTime;
      projectile.previousPosition.copy(projectile.group.position);
      projectile.velocity.y -= FIREBALL_GRAVITY * deltaTime;
      projectile.group.position.addScaledVector(projectile.velocity, deltaTime);
      projectile.shell.rotation.y += deltaTime * 4.2;
      projectile.ringA.rotation.z += deltaTime * 5.4;
      projectile.ringB.rotation.x -= deltaTime * 4.6;
      this.updateTrail(projectile);

      let hitEnemy = null;
      for (const enemy of enemies) {
        if (!enemy.isAlive()) continue;
        this.enemyCenter.copy(enemy.position);
        this.enemyCenter.y += 0.9;
        const hitRadius = enemy.getHitRadius() + FIREBALL_RADIUS + FIREBALL_HIT_RADIUS_BONUS;
        if (segmentIntersectsSphere(
          projectile.previousPosition,
          projectile.group.position,
          this.enemyCenter,
          hitRadius,
        )) {
          hitEnemy = enemy;
          break;
        }
      }

      const hitTerrain = projectile.group.position.y
        <= terrain.getHeightAt(projectile.group.position.x, projectile.group.position.z) + 0.2;
      const expired = projectile.age >= FIREBALL_LIFETIME;

      if (hitEnemy) hitEnemy.takeDamage(projectile.damage);
      if (hitEnemy || hitTerrain || expired) {
        this.createBurst(projectile.group.position);
        this.removeProjectile(index);
      }
    }

    this.updateBursts(deltaTime);
  }

  updateTrail(projectile) {
    const positions = projectile.trail.geometry.getAttribute('position');

    for (let index = TRAIL_POINT_COUNT - 1; index > 0; index -= 1) {
      positions.setXYZ(
        index,
        positions.getX(index - 1),
        positions.getY(index - 1),
        positions.getZ(index - 1),
      );
    }
    positions.setXYZ(
      0,
      projectile.group.position.x,
      projectile.group.position.y,
      projectile.group.position.z,
    );
    positions.needsUpdate = true;
  }

  createBurst(position) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(FIREBALL_RADIUS, 18, 12),
      new THREE.MeshBasicMaterial({
        color: 0xff7b22,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    mesh.position.copy(position);
    mesh.scale.setScalar(0.35);
    this.scene.add(mesh);
    this.bursts.push({ mesh, age: 0 });
  }

  updateBursts(deltaTime) {
    for (let index = this.bursts.length - 1; index >= 0; index -= 1) {
      const burst = this.bursts[index];
      burst.age += deltaTime;
      const progress = burst.age / BURST_LIFETIME;
      burst.mesh.scale.setScalar(0.35 + progress * 4.5);
      burst.mesh.material.opacity = 0.78 * (1 - progress);

      if (progress >= 1) {
        this.scene.remove(burst.mesh);
        burst.mesh.geometry.dispose();
        burst.mesh.material.dispose();
        this.bursts.splice(index, 1);
      }
    }
  }

  removeProjectile(index) {
    const projectile = this.projectiles[index];
    this.scene.remove(projectile.group);
    this.scene.remove(projectile.trail);
    projectile.group.traverse((object) => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material?.dispose();
    });
    projectile.trail.geometry.dispose();
    projectile.trail.material.dispose();
    this.projectiles.splice(index, 1);
  }

  dispose() {
    while (this.projectiles.length > 0) this.removeProjectile(this.projectiles.length - 1);
    for (const burst of this.bursts) {
      this.scene.remove(burst.mesh);
      burst.mesh.geometry.dispose();
      burst.mesh.material.dispose();
    }
    this.bursts.length = 0;
  }
}
