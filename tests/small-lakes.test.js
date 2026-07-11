import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createSmallLakes } from '../src/smallLakes.js';
import { getGoldenShotFromLocation, listGoldenShotNames } from '../src/goldenShots.js';

const ANGLE_SEGMENTS = 64;
const RADIAL_RINGS = 12;
const EXPECTED_VERTEX_COUNT = 1 + ANGLE_SEGMENTS * RADIAL_RINGS;
const EXPECTED_TRIANGLE_COUNT = ANGLE_SEGMENTS
  + (RADIAL_RINGS - 1) * ANGLE_SEGMENTS * 2;

function createTerrainStub() {
  return {
    getBaseHeightAt: () => 8,
    getHeightAt: () => -4,
  };
}

function assertGeometryFacesUp(geometry) {
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const indices = geometry.index;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const faceNormal = new THREE.Vector3();

  assert.equal(positions.count, EXPECTED_VERTEX_COUNT);
  assert.equal(indices.count / 3, EXPECTED_TRIANGLE_COUNT);

  for (let triangle = 0; triangle < indices.count; triangle += 3) {
    a.fromBufferAttribute(positions, indices.getX(triangle));
    b.fromBufferAttribute(positions, indices.getX(triangle + 1));
    c.fromBufferAttribute(positions, indices.getX(triangle + 2));
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    faceNormal.crossVectors(ab, ac);

    assert.ok(
      faceNormal.y > 0,
      `triangle ${triangle / 3} must face +Y, received normal.y=${faceNormal.y}`,
    );
  }

  for (let vertex = 0; vertex < normals.count; vertex += 1) {
    assert.ok(
      normals.getY(vertex) > 0.999,
      `vertex ${vertex} must have an upward computed normal`,
    );
  }
}

test('radial lake surfaces keep their vertex budget and every triangle faces +Y', () => {
  const lakes = createSmallLakes(createTerrainStub());

  assert.ok(lakes.children.length > 1);
  for (const lake of lakes.children) {
    assertGeometryFacesUp(lake.geometry);
    lake.geometry.dispose();
    lake.material.dispose();
  }
});

test('terminal lake overhead golden shot is fixed above the new circular lake', () => {
  const shot = getGoldenShotFromLocation({
    search: '?shot=terminal-lake-overhead',
  });

  assert.ok(listGoldenShotNames().includes('terminal-lake-overhead'));
  assert.equal(shot.key, 'terminal-lake-overhead');
  assert.deepEqual(shot.camera, { x: 690, z: -340, y: 55 });
  assert.deepEqual(shot.target, { x: 690, z: -340, y: -1.235 });
  assert.ok(Math.hypot(shot.player.x - 690, shot.player.z + 340) > 26);
});
