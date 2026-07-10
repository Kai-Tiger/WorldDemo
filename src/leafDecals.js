import * as THREE from 'three';
import { hash2, sampleTerrainSurface } from './grassClumps.js';

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
  const leaf1Texture = createLeafTexture('#7a5a32', '#3c2c1d', 0.16);
  const leaf2Texture = createLeafTexture('#66502f', '#2f271c', -0.22);

  for (const texture of [leaf1Texture, leaf2Texture]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
  }

  return { leaf1Texture, leaf2Texture };
}

function createLeafTexture(fillColor, veinColor, rotation) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');

  context.translate(32, 32);
  context.rotate(rotation);
  context.fillStyle = fillColor;
  context.beginPath();
  context.moveTo(0, -27);
  context.bezierCurveTo(23, -15, 22, 14, 0, 27);
  context.bezierCurveTo(-22, 14, -23, -15, 0, -27);
  context.fill();
  context.strokeStyle = veinColor;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, -23);
  context.lineTo(0, 24);
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `ProceduralLeaf_${fillColor}`;
  return texture;
}

export function buildLeafDecals(treePlacements, terrain, textures) {
  const { leaf1Texture, leaf2Texture } = textures;
  const leaf1Matrices = [];
  const leaf2Matrices = [];
  const surface = {};
  const normal = new THREE.Vector3();

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
      sampleTerrainSurface(terrain, leafX, leafZ, surface);
      const leafY = surface.height + LEAF_HEIGHT_OFFSET;

      normal.set(surface.normalX, surface.normalY, surface.normalZ);
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
