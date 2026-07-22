import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HERO_RIVER_NETWORK_DEFINITION } from './lowlandHeightPlan.js';

const ROCK_PATHS = Array.from(
  { length: 9 },
  (_, index) => `/assets/vegetation/rock_${String(index + 1).padStart(2, '0')}.glb`,
);

const HERO_ROCK_LAYOUT = [
  { model: 0, x: 326, z: -351, height: 2.8, yaw: 0.6 },
  { model: 1, x: 345, z: -365, height: 2.2, yaw: 2.1 },
  { model: 2, x: 345, z: -389, height: 3.8, yaw: 1.2 },
  { model: 3, x: 334, z: -425, height: 2.5, yaw: 4.5 },
  { model: 4, x: 367, z: -401, height: 4.4, yaw: 0.25 },
  { model: 5, x: 322, z: -381, height: 2.4, yaw: 1.7 },
  { model: 6, x: 355, z: -424, height: 3.0, yaw: 3.4 },
  { model: 7, x: 372, z: -442, height: 2.6, yaw: 5.1 },
  { model: 8, x: 312, z: -444, height: 2.3, yaw: 2.75 },
  { model: 2, x: 350, z: -337, height: 2.1, yaw: 4.2 },
  { model: 5, x: 371, z: -348, height: 3.2, yaw: 0.9 },
  { model: 0, x: 316, z: -365, height: 1.8, yaw: 5.6 },
];

export const HERO_RIVER_ROCK_SEED = 'hero-river-20260712';

const HERO_RIVER_MODEL_INDEX = Object.freeze({
  'rock_02.glb': 1,
  'rock_05.glb': 4,
  'rock_08.glb': 7,
});

const loader = new GLTFLoader();

export function getHeroRiverRockPlacements() {
  const placements = [];

  for (const reach of HERO_RIVER_NETWORK_DEFINITION.reaches) {
    if (!reach.disturbances?.length) continue;

    const curve = new THREE.CatmullRomCurve3(
      reach.points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
      false,
      'centripetal',
    );
    const length = curve.getLength();

    for (const disturbance of reach.disturbances) {
      const t = THREE.MathUtils.clamp(disturbance.distanceM / length, 0, 1);
      const center = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
      const width = THREE.MathUtils.lerp(reach.width[0], reach.width[1], t);
      const lateralOffset = disturbance.lateral * width * 0.5;

      placements.push({
        seed: HERO_RIVER_ROCK_SEED,
        reachId: reach.id,
        distanceM: disturbance.distanceM,
        model: disturbance.model,
        modelIndex: HERO_RIVER_MODEL_INDEX[disturbance.model],
        x: center.x + side.x * lateralOffset,
        z: center.z + side.z * lateralOffset,
        height: disturbance.height,
        yaw: disturbance.yaw,
      });
    }
  }

  return placements;
}

export function createHeroRiverRockInstances(assets, terrain, colliders = null) {
  const group = new THREE.Group();
  const placementsByModel = new Map();

  for (const placement of getHeroRiverRockPlacements()) {
    const placements = placementsByModel.get(placement.modelIndex) ?? [];

    placements.push(placement);
    placementsByModel.set(placement.modelIndex, placements);
  }

  group.name = 'HeroRiverRockSetDressing';

  for (const [modelIndex, placements] of placementsByModel) {
    const { geometry, material, height, width, depth } = createInstancedRockPrototype(
      assets[modelIndex].scene,
    );
    const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();

    mesh.name = `HeroRiverRockInstances_${String(modelIndex + 1).padStart(2, '0')}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    for (let index = 0; index < placements.length; index += 1) {
      const placement = placements[index];
      const uniformScale = placement.height / height;

      position.set(
        placement.x,
        terrain.getHeightAt(placement.x, placement.z),
        placement.z,
      );
      quaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, placement.yaw);
      scale.setScalar(uniformScale);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
      colliders?.push({
        x: position.x,
        z: position.z,
        radius: Math.hypot(width, depth) * uniformScale * 0.5,
        minY: position.y,
        maxY: position.y + placement.height,
      });
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }

  return group;
}

export async function createHeroRocks(terrain, worldCollision = null) {
  const assets = await Promise.all(ROCK_PATHS.map((path) => loader.loadAsync(path)));
  const group = new THREE.Group();
  const colliders = [];

  group.name = 'HeroRockSetDressing';

  for (const placement of HERO_ROCK_LAYOUT) {
    const source = assets[placement.model].scene;
    const rock = source.clone(true);
    const instance = new THREE.Group();
    const box = new THREE.Box3().setFromObject(rock);
    const size = box.getSize(new THREE.Vector3());
    const scale = placement.height / Math.max(size.y, 0.001);

    rock.scale.setScalar(scale);
    rock.updateMatrixWorld(true);
    const scaledBox = new THREE.Box3().setFromObject(rock);
    const scaledSize = scaledBox.getSize(new THREE.Vector3());

    const center = scaledBox.getCenter(new THREE.Vector3());
    const groundY = placement.y ?? terrain.getHeightAt(placement.x, placement.z);

    rock.position.set(-center.x, -scaledBox.min.y, -center.z);
    rock.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      if ('roughness' in child.material) {
        child.material = child.material.clone();
        child.material.roughness = Math.max(child.material.roughness, 0.72);
        child.material.metalness = 0;
      }
    });
    instance.name = `HeroRock_${placement.model + 1}`;
    instance.position.set(placement.x, groundY, placement.z);
    instance.rotation.y = placement.yaw;
    instance.add(rock);
    group.add(instance);
    colliders.push({
      x: placement.x,
      z: placement.z,
      radius: Math.hypot(scaledSize.x, scaledSize.z) * 0.5,
      minY: groundY,
      maxY: groundY + scaledSize.y,
    });
  }

  group.add(createHeroRiverRockInstances(assets, terrain, colliders));
  worldCollision?.replaceOwner(group, colliders);

  return group;
}

function createInstancedRockPrototype(scene) {
  let sourceMesh = null;

  scene.updateMatrixWorld(true);
  scene.traverse((child) => {
    if (!sourceMesh && child.isMesh) sourceMesh = child;
  });

  const geometry = sourceMesh.geometry.clone();
  const material = cloneRiverRockMaterial(sourceMesh.material);

  geometry.applyMatrix4(sourceMesh.matrixWorld);
  geometry.computeBoundingBox();

  const box = geometry.boundingBox;
  const center = box.getCenter(new THREE.Vector3());
  const height = Math.max(box.max.y - box.min.y, 0.001);
  const width = box.max.x - box.min.x;
  const depth = box.max.z - box.min.z;

  geometry.translate(-center.x, -box.min.y, -center.z);

  return { geometry, material, height, width, depth };
}

function cloneRiverRockMaterial(source) {
  if (Array.isArray(source)) return source.map(cloneRiverRockMaterial);

  const material = source.clone();

  if ('roughness' in material) material.roughness = Math.max(material.roughness, 0.72);
  if ('metalness' in material) material.metalness = 0;
  return material;
}
