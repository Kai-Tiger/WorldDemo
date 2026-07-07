import * as THREE from 'three';
import { hash2 } from './grassClumps.js';

const LEAF1_PATH = '/assets/terrain/leaf1.png';
const LEAF2_PATH = '/assets/terrain/leaf2.png';
const LEAF_COUNT_MIN = 3;
const LEAF_COUNT_MAX = 5;
const LEAF_SCATTER_RADIUS = 2.0;
const LEAF_SIZE_MIN = 0.5;
const LEAF_SIZE_MAX = 0.8;
const LEAF_HEIGHT_OFFSET = 0.05;

const PLANE_NORMAL = new THREE.Vector3(0, 0, 1);

export async function createLeafDecals(treePlacements, terrain) {
  return buildLeafDecals(treePlacements, terrain, await loadLeafDecalTextures());
}

export async function loadLeafDecalTextures() {
  const loader = new THREE.TextureLoader();
  const [leaf1Texture, leaf2Texture] = await Promise.all([
    loader.loadAsync(LEAF1_PATH),
    loader.loadAsync(LEAF2_PATH),
  ]);

  for (const texture of [leaf1Texture, leaf2Texture]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
  }

  return { leaf1Texture, leaf2Texture };
}

export function buildLeafDecals(treePlacements, terrain, textures) {
  const { leaf1Texture, leaf2Texture } = textures;
  const leaf1Matrices = [];
  const leaf2Matrices = [];

  for (let i = 0; i < treePlacements.length; i += 1) {
    const matrix = treePlacements[i].matrix;
    const treeX = matrix.elements[12];
    const treeZ = matrix.elements[14];

    const leafCount = LEAF_COUNT_MIN
      + Math.floor(hash2(treeX + 99.3, treeZ - 47.1) * (LEAF_COUNT_MAX - LEAF_COUNT_MIN + 1));

    for (let l = 0; l < leafCount; l += 1) {
      const seedA = hash2(treeX + l * 73.7, treeZ + l * 241.1);
      const angle = seedA * Math.PI * 2;
      const radius = 0.3
        + (hash2(treeX + l * 53.1, treeZ - l * 87.3) * 0.5 + 0.5) * LEAF_SCATTER_RADIUS;
      const offsetX = Math.cos(angle) * radius;
      const offsetZ = Math.sin(angle) * radius;

      const leafX = treeX + offsetX;
      const leafZ = treeZ + offsetZ;
      const leafY = terrain.getHeightAt(leafX, leafZ) + LEAF_HEIGHT_OFFSET;

      const normal = terrain.getNormalAt(leafX, leafZ);
      const tilt = new THREE.Quaternion().setFromUnitVectors(PLANE_NORMAL, normal);
      const yaw = seedA * Math.PI * 2;
      const yawRotation = new THREE.Quaternion().setFromAxisAngle(normal, yaw);
      const rotation = yawRotation.multiply(tilt);

      const scaleValue = THREE.MathUtils.lerp(
        LEAF_SIZE_MIN,
        LEAF_SIZE_MAX,
        hash2(leafX + l * 33.9, leafZ - l * 119.7),
      );
      const scale = new THREE.Vector3(scaleValue, scaleValue, 1);

      const leafMatrix = new THREE.Matrix4().compose(
        new THREE.Vector3(leafX, leafY, leafZ),
        rotation,
        scale,
      );

      if (hash2(treeX + l * 199.9, treeZ + l * 311.3) < 0.5) {
        leaf1Matrices.push(leafMatrix);
      } else {
        leaf2Matrices.push(leafMatrix);
      }
    }
  }

  const group = new THREE.Group();
  group.name = 'LeafDecals';

  const geometry = new THREE.PlaneGeometry(1, 1);

  if (leaf1Matrices.length > 0) {
    const mesh = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshStandardMaterial({
        map: leaf1Texture,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: true,
      }),
      leaf1Matrices.length,
    );
    mesh.name = 'LeafDecals_1';
    mesh.receiveShadow = true;
    for (let i = 0; i < leaf1Matrices.length; i += 1) {
      mesh.setMatrixAt(i, leaf1Matrices[i]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }

  if (leaf2Matrices.length > 0) {
    const mesh = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshStandardMaterial({
        map: leaf2Texture,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: true,
      }),
      leaf2Matrices.length,
    );
    mesh.name = 'LeafDecals_2';
    mesh.receiveShadow = true;
    for (let i = 0; i < leaf2Matrices.length; i += 1) {
      mesh.setMatrixAt(i, leaf2Matrices[i]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }

  return group;
}
