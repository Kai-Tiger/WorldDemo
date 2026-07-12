import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  SMALL_LAKES,
  applySmallLakesTerrain,
  createSmallLakes,
} from '../src/smallLakes.js';
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

  assert.equal(lakes.children.length, 5);
  for (const lake of lakes.children) {
    assertGeometryFacesUp(lake.geometry);
    lake.geometry.dispose();
    lake.material.dispose();
  }
});

test('baked southern lakes keep fixed water levels without runtime terrain carving', () => {
  const lakes = createSmallLakes(createTerrainStub());
  const expectedLevels = new Map([
    ['south-northwest-lake', 3.5],
    ['south-east-lake', 3.2],
    ['south-central-lake', 2.8],
    ['south-terminal-lake', 1.8],
  ]);

  assert.equal(applySmallLakesTerrain(12.5, 755, -657), 12.5);
  for (const lake of SMALL_LAKES.filter((entry) => !entry.isTerminal)) {
    const mesh = lakes.getObjectByName(`SmallLake_${lake.id}`);

    assert.equal(lake.waterLevel, expectedLevels.get(lake.id));
    assert.ok(Math.abs(
      mesh.geometry.getAttribute('position').getY(0)
        - (lake.waterLevel + lake.surfaceOffset),
    ) < 1e-6);
  }

  for (const lake of lakes.children) {
    lake.geometry.dispose();
    lake.material.dispose();
  }
});

test('lake sunlight uses bounded sparse microfacet sparkles instead of broad glint bands', () => {
  const lakes = createSmallLakes(createTerrainStub());
  const shader = lakes.children[0].material.fragmentShader;

  assert.match(shader, /float getSunSparkle\(/);
  assert.match(shader, /fwidth\(coverageField\)/);
  assert.match(shader, /min\(sunBrdf \* NoL, 0\.85\)/);
  assert.match(shader, /float sunCone = smoothstep\(0\.975, 0\.9985/);
  assert.match(shader, /color = mix\(color, skyReflection, 0\.025 \+ reflectionMask \* 0\.2\)/);
  assert.match(shader, /1\.0 - exp\(-max\(vLakeDepth, 0\.0\) \* 0\.85\)/);
  assert.match(shader, /mix\(0\.12, 1\.0, max\(depthOpacity, basinCenter \* 0\.4\)\)/);
  assert.doesNotMatch(shader, /float getSunGlint\(/);
  assert.doesNotMatch(shader, /float broadGlint/);

  for (const lake of lakes.children) {
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
  assert.deepEqual(shot.target, { x: 690, z: -340, y: 1.645 });
  assert.ok(Math.hypot(shot.player.x - 690, shot.player.z + 340) > 26);
});
