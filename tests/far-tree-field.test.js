import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FAR_TREE_SPACING,
  createFarTreeField,
} from '../src/farTreeField.js';
import {
  MAP_SIZE,
  WORLD_VIEW_DISTANCE,
} from '../src/vegetationConfig.js';

function createFlatTerrain() {
  return {
    sampleSurfaceAt(_x, _z, target) {
      Object.assign(target, {
        height: 15,
        normalX: 0,
        normalY: 1,
        normalZ: 0,
        groundMask: 1,
      });
      return target;
    },
  };
}

test('one far-tree batch covers the full map with a bounded silhouette sample', () => {
  const field = createFarTreeField(createFlatTerrain());

  assert.equal(FAR_TREE_SPACING, 28);
  assert.ok(WORLD_VIEW_DISTANCE > Math.SQRT2 * MAP_SIZE);
  assert.ok(field.count > 20000 && field.count < 32000, field.count);
  assert.equal(field.mesh.name, 'FarTreeField');
  assert.equal(field.mesh.geometry.instanceCount, field.count);
  assert.equal(field.mesh.geometry.index.count, 6);
  assert.equal(field.mesh.frustumCulled, false);
  assert.equal(field.mesh.castShadow, false);
  assert.equal(field.mesh.material.fog, true);
  assert.ok(field.mesh.material.uniforms.fogColor.value.isColor);
  assert.equal(field.mesh.material.uniforms.fogFar.value, WORLD_VIEW_DISTANCE);

  const tintValues = field.mesh.geometry.attributes.instanceTint.array;
  assert.ok(Math.max(...tintValues) < 0.09);
  assert.ok(new Set(tintValues).size > 20);

  field.dispose();
});

test('far trees cross-fade after detailed tree zones and remain visible to the world edge', () => {
  const field = createFarTreeField(createFlatTerrain());
  const uniforms = field.mesh.material.uniforms;

  field.update({ x: 120, z: -340 }, 520);

  assert.deepEqual(uniforms.uViewerPosition.value.toArray(), [120, -340]);
  assert.equal(uniforms.uNearDistance.value, 520);
  assert.equal(uniforms.uViewDistance.value, WORLD_VIEW_DISTANCE);
  assert.match(field.mesh.material.fragmentShader, /uNearDistance - uFadeWidth/);
  assert.match(field.mesh.material.fragmentShader, /uViewDistance - uEdgeFade/);
  assert.match(field.mesh.material.fragmentShader, /crownWidth/);

  field.dispose();
});
