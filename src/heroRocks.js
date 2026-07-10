import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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

const loader = new GLTFLoader();

export async function createHeroRocks(terrain) {
  const assets = await Promise.all(ROCK_PATHS.map((path) => loader.loadAsync(path)));
  const group = new THREE.Group();

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
  }

  return group;
}
