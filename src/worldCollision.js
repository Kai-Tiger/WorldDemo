const DEFAULT_CELL_SIZE = 16;
const COLLISION_SKIN = 0.001;
const MAX_SLIDE_ITERATIONS = 3;

export class WorldCollision {
  constructor(cellSize = DEFAULT_CELL_SIZE) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.ownerColliders = new Map();
  }

  replaceOwner(owner, colliders) {
    this.removeOwner(owner);
    this.ownerColliders.set(owner, colliders);

    for (const collider of colliders) {
      this.addToCells(collider);
    }
  }

  removeOwner(owner) {
    const colliders = this.ownerColliders.get(owner);

    if (!colliders) return;

    for (const collider of colliders) {
      this.removeFromCells(collider);
    }

    this.ownerColliders.delete(owner);
  }

  resolveMovement(start, end, minY, maxY, radius, target) {
    let x = start.x;
    let z = start.z;
    let moveX = end.x - x;
    let moveZ = end.z - z;

    ({ x, z } = this.resolveOverlaps(x, z, minY, maxY, radius, moveX, moveZ));

    for (let iteration = 0; iteration < MAX_SLIDE_ITERATIONS; iteration += 1) {
      if (moveX * moveX + moveZ * moveZ < 1e-10) break;

      const hit = this.findFirstHit(x, z, moveX, moveZ, minY, maxY, radius);

      if (!hit) {
        x += moveX;
        z += moveZ;
        break;
      }

      x += moveX * hit.time + hit.normalX * COLLISION_SKIN;
      z += moveZ * hit.time + hit.normalZ * COLLISION_SKIN;

      const remaining = 1 - hit.time;
      moveX *= remaining;
      moveZ *= remaining;
      const inwardSpeed = moveX * hit.normalX + moveZ * hit.normalZ;

      if (inwardSpeed < 0) {
        moveX -= hit.normalX * inwardSpeed;
        moveZ -= hit.normalZ * inwardSpeed;
      }
    }

    target.set(x, z);
    return target;
  }

  resolveOverlaps(x, z, minY, maxY, radius, fallbackX, fallbackZ) {
    for (let iteration = 0; iteration < MAX_SLIDE_ITERATIONS; iteration += 1) {
      const candidates = this.query(x - radius, z - radius, x + radius, z + radius);
      let deepest = null;

      for (const collider of candidates) {
        if (!overlapsHeight(minY, maxY, collider)) continue;

        const dx = x - collider.x;
        const dz = z - collider.z;
        const combinedRadius = radius + collider.radius;
        const distanceSq = dx * dx + dz * dz;

        if (distanceSq >= combinedRadius * combinedRadius) continue;

        const distance = Math.sqrt(distanceSq);
        const penetration = combinedRadius - distance;

        if (!deepest || penetration > deepest.penetration) {
          let normalX = distance > 1e-6 ? dx / distance : -fallbackX;
          let normalZ = distance > 1e-6 ? dz / distance : -fallbackZ;
          const normalLength = Math.hypot(normalX, normalZ);

          if (normalLength < 1e-6) {
            normalX = 1;
            normalZ = 0;
          } else {
            normalX /= normalLength;
            normalZ /= normalLength;
          }

          deepest = { penetration, normalX, normalZ };
        }
      }

      if (!deepest) break;

      x += deepest.normalX * (deepest.penetration + COLLISION_SKIN);
      z += deepest.normalZ * (deepest.penetration + COLLISION_SKIN);
    }

    return { x, z };
  }

  findFirstHit(x, z, moveX, moveZ, minY, maxY, radius) {
    const candidates = this.query(
      Math.min(x, x + moveX) - radius,
      Math.min(z, z + moveZ) - radius,
      Math.max(x, x + moveX) + radius,
      Math.max(z, z + moveZ) + radius,
    );
    const movementLengthSq = moveX * moveX + moveZ * moveZ;
    let firstHit = null;

    for (const collider of candidates) {
      if (!overlapsHeight(minY, maxY, collider)) continue;

      const dx = x - collider.x;
      const dz = z - collider.z;
      const combinedRadius = radius + collider.radius;
      const distanceSq = dx * dx + dz * dz;
      const approach = dx * moveX + dz * moveZ;

      if (distanceSq <= combinedRadius * combinedRadius && approach >= 0) continue;

      const discriminant = approach * approach
        - movementLengthSq * (distanceSq - combinedRadius * combinedRadius);

      if (discriminant < 0) continue;

      const time = (-approach - Math.sqrt(discriminant)) / movementLengthSq;

      if (time < 0 || time > 1 || (firstHit && time >= firstHit.time)) continue;

      const hitX = x + moveX * time;
      const hitZ = z + moveZ * time;
      const normalLength = Math.hypot(hitX - collider.x, hitZ - collider.z);

      if (normalLength < 1e-6) continue;

      firstHit = {
        time,
        normalX: (hitX - collider.x) / normalLength,
        normalZ: (hitZ - collider.z) / normalLength,
      };
    }

    return firstHit;
  }

  query(minX, minZ, maxX, maxZ) {
    const colliders = new Set();

    this.forEachCell(minX, minZ, maxX, maxZ, (key) => {
      for (const collider of this.cells.get(key) ?? []) {
        colliders.add(collider);
      }
    });

    return colliders;
  }

  addToCells(collider) {
    this.forEachCell(
      collider.x - collider.radius,
      collider.z - collider.radius,
      collider.x + collider.radius,
      collider.z + collider.radius,
      (key) => {
        const cell = this.cells.get(key) ?? new Set();

        cell.add(collider);
        this.cells.set(key, cell);
      },
    );
  }

  removeFromCells(collider) {
    this.forEachCell(
      collider.x - collider.radius,
      collider.z - collider.radius,
      collider.x + collider.radius,
      collider.z + collider.radius,
      (key) => {
        const cell = this.cells.get(key);

        cell?.delete(collider);
        if (cell?.size === 0) this.cells.delete(key);
      },
    );
  }

  forEachCell(minX, minZ, maxX, maxZ, callback) {
    const startX = Math.floor(minX / this.cellSize);
    const startZ = Math.floor(minZ / this.cellSize);
    const endX = Math.floor(maxX / this.cellSize);
    const endZ = Math.floor(maxZ / this.cellSize);

    for (let cellZ = startZ; cellZ <= endZ; cellZ += 1) {
      for (let cellX = startX; cellX <= endX; cellX += 1) {
        callback(`${cellX},${cellZ}`);
      }
    }
  }
}

function overlapsHeight(minY, maxY, collider) {
  return minY < collider.maxY && maxY > collider.minY;
}
