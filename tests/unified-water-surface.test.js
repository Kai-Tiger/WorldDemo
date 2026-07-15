import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  RIVER_LAKE_INTERFACE_REGISTRY,
  UNIFIED_WATER_ATTRIBUTE_SCHEMA,
  WATER_BASIN_DEFINITIONS,
  createUnifiedWaterSystem,
  getFiveRowTransitionInfluences,
  getRiverLakeTransitionInfluence,
  validateUnifiedWaterGeometry,
} from '../src/unifiedWaterSurface.js';

const terrain = {
  getHeightAt(x, z) {
    return 0.5 + Math.sin(x * 0.003) * 0.2 + Math.cos(z * 0.004) * 0.2;
  },
};

test('the scene water topology includes the eight expanded-cell basin batches', () => {
  const system = createUnifiedWaterSystem(terrain);

  assert.equal(WATER_BASIN_DEFINITIONS.length, 12);
  assert.equal(system.stats.basinCount, 12);
  assert.equal(system.stats.batchCount, 12);
  assert.equal(system.batches.length, 12);
  assert.equal(system.group.children.length, 12);
  assert.deepEqual(
    system.batches.map((batch) => batch.userData.stats.lakeCount),
    [2, 2, 2, 4, 1, 1, 1, 1, 1, 1, 1, 1],
  );
  assert.deepEqual(
    system.batches.map((batch) => batch.userData.stats.interfaceCount),
    [4, 3, 2, 6, 1, 1, 1, 1, 1, 1, 1, 1],
  );

  for (const batch of system.batches) {
    assert.equal(batch.name, `BasinWaterSurfaceBatch_${batch.userData.basinId}`);
    assert.equal(batch.geometry.index !== null, true);
    assert.equal(batch.material.userData.unifiedWaterPlaceholder, true);
    assert.equal(batch.material.colorWrite, false);
    assert.equal(batch.material.depthWrite, false);
    assert.equal(batch.visible, true);
    assert.equal(batch.userData.waterSurfaceBatch, true);
    assert.equal(validateUnifiedWaterGeometry(batch.geometry), true);
  }

  disposeSystem(system);
});

test('every basin batch exposes the fixed twelve-attribute water info contract', () => {
  const system = createUnifiedWaterSystem(terrain);
  const schemaEntries = Object.entries(UNIFIED_WATER_ATTRIBUTE_SCHEMA);

  assert.equal(schemaEntries.length, 12);
  assert.deepEqual(schemaEntries, [
    ['waterDepth', 1],
    ['shoreDistanceMeters', 1],
    ['shoreFoamMask', 1],
    ['flowUv', 2],
    ['flowDirection', 2],
    ['junctionFlowDirection', 2],
    ['flowSpeed', 1],
    ['riverInfluence', 1],
    ['rapidMask', 1],
    ['junctionMask', 1],
    ['disturbanceMask', 1],
    ['reflectionTier', 1],
  ]);

  for (const batch of system.batches) {
    const { geometry } = batch;
    const vertexCount = geometry.getAttribute('position').count;

    assert.equal(geometry.getAttribute('normal').count, vertexCount);
    assert.equal(geometry.getAttribute('uv').count, vertexCount);

    for (const [name, itemSize] of schemaEntries) {
      const attribute = geometry.getAttribute(name);

      assert.equal(attribute.itemSize, itemSize, name);
      assert.equal(attribute.count, vertexCount, name);
    }
  }

  disposeSystem(system);
});

test('all river-lake interfaces own five continuous transition rows', () => {
  const system = createUnifiedWaterSystem(terrain);
  const patches = system.batches.flatMap((batch) => batch.userData.transitionPatches);
  const influences = getFiveRowTransitionInfluences();

  assert.equal(RIVER_LAKE_INTERFACE_REGISTRY.length, 23);
  assert.equal(system.stats.interfaceCount, 23);
  assert.equal(system.stats.transitionPatchCount, 23);
  assert.equal(system.stats.transitionRowCount, 115);
  assert.equal(patches.length, 23);
  assert.deepEqual(
    patches.map((patch) => patch.id).sort(),
    RIVER_LAKE_INTERFACE_REGISTRY.map((entry) => entry.id).sort(),
  );
  assert.deepEqual(
    RIVER_LAKE_INTERFACE_REGISTRY.reduce((counts, entry) => {
      counts[entry.basinId] = (counts[entry.basinId] ?? 0) + 1;
      return counts;
    }, {}),
    {
      'alpine-basin': 4,
      'hero-east-basin': 3,
      'north-lowland-basin': 2,
      'south-lowland-basin': 6,
      'northwest-outer-basin': 1,
      'north-outer-basin': 1,
      'northeast-outer-basin': 1,
      'west-outer-basin': 1,
      'east-outer-basin': 1,
      'southwest-outer-basin': 1,
      'south-outer-basin': 1,
      'southeast-outer-basin': 1,
    },
  );
  assert.equal(influences.length, 5);
  assert.deepEqual(influences, [1, 0.84375, 0.5, 0.15625, 0]);
  assert.equal(influences.at(-1), 0);

  for (const batch of system.batches) {
    const shoreDistance = batch.geometry.getAttribute('shoreDistanceMeters');
    const shoreFoamMask = batch.geometry.getAttribute('shoreFoamMask');
    const riverInfluence = batch.geometry.getAttribute('riverInfluence');
    const transitionVertices = new Set(
      batch.userData.transitionPatches.flatMap((patch) => patch.rows.flat()),
    );

    for (const patch of batch.userData.transitionPatches) {
      assert.equal(patch.coverage, 1);
      assert.equal(patch.rowCount, 5);
      assert.equal(patch.rows.length, 5);
      assert.ok(patch.transitionLength >= 1 && patch.transitionLength <= 3);
      assert.ok(patch.rows.every((row) => row.length === patch.rows[0].length));
      assert.deepEqual(patch.signedDistances, [
        patch.transitionLength,
        patch.transitionLength * 0.5,
        0,
        -patch.transitionLength * 0.5,
        -patch.transitionLength,
      ]);

      const shoreValues = patch.rows[2].map(
        (vertex) => riverInfluence.getX(vertex),
      );

      for (let row = 0; row < patch.rows.length; row += 1) {
        const values = patch.rows[row].map((vertex) => riverInfluence.getX(vertex));

        assert.ok(values.every((value, lateral) => Math.abs(
          value - influences[row] * shoreValues[lateral] * 2
        ) < 2e-5));
      }
      assert.ok(patch.rows.slice(2).flat().every(
        (vertex) => shoreDistance.getX(vertex) >= 0.5,
      ));
      assert.ok(patch.rows.flat().every(
        (vertex) => shoreFoamMask.getX(vertex) === 0,
      ));

      const positions = batch.geometry.getAttribute('position');

      for (let lateral = 0; lateral < patch.rows[0].length; lateral += 1) {
        const points = patch.rows.map((row) => {
          const vertex = row[lateral];

          return [positions.getX(vertex), positions.getZ(vertex)];
        });
        const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

        assert.ok(Math.abs(
          distance(points[0], points[2]) - patch.transitionLength
        ) < 1e-3);
        assert.ok(Math.abs(
          distance(points[1], points[2]) - patch.transitionLength * 0.5
        ) < 1e-3);
        assert.ok(Math.abs(
          distance(points[3], points[2]) - patch.transitionLength * 0.5
        ) < 1e-3);
        assert.ok(Math.abs(
          distance(points[4], points[2]) - patch.transitionLength
        ) < 1e-3);
      }
    }
    let trueWaterLandShoreVertexCount = 0;
    for (let vertex = 0; vertex < shoreDistance.count; vertex += 1) {
      assert.equal(
        shoreFoamMask.getX(vertex),
        transitionVertices.has(vertex) ? 0 : 1,
      );
      if (
        !transitionVertices.has(vertex)
        && shoreDistance.getX(vertex) === 0
      ) {
        trueWaterLandShoreVertexCount += 1;
      }
    }
    assert.ok(trueWaterLandShoreVertexCount > 0);
  }

  disposeSystem(system);
});

test('river mouth rows are indexed by both the river strip and lake transition topology', () => {
  const system = createUnifiedWaterSystem(terrain);

  for (const batch of system.batches) {
    const edgeUse = countUndirectedEdges(batch.geometry.index.array);

    for (const patch of batch.userData.transitionPatches) {
      const shoreRow = patch.rows[2];

      for (let vertex = 0; vertex < shoreRow.length - 1; vertex += 1) {
        assert.equal(
          edgeUse.get(edgeKey(shoreRow[vertex], shoreRow[vertex + 1])),
          2,
          `${patch.id} shore edge must be shared by river and lake triangles`,
        );
      }
    }
  }

  disposeSystem(system);
});

test('river source triangles do not extend wholly inside their connected lakes', () => {
  const system = createUnifiedWaterSystem(terrain);

  for (const batch of system.batches) {
    const positions = batch.geometry.getAttribute('position');
    const indices = batch.geometry.index.array;
    const riverVertexLimit = Math.max(
      ...batch.userData.stats.riverParts.map(
        (part) => part.vertexOffset + part.vertexCount,
      ),
    );

    for (const part of batch.userData.stats.riverParts) {
      assert.equal(part.removedLakeInteriorTriangles, 0);
      for (let offset = part.startIndex; offset < part.startIndex + part.indexCount; offset += 3) {
        assert.ok(indices[offset] < riverVertexLimit);
        assert.ok(indices[offset + 1] < riverVertexLimit);
        assert.ok(indices[offset + 2] < riverVertexLimit);
      }
    }

    for (const patch of batch.userData.transitionPatches) {
      const lakeRows = patch.rows.slice(3);

      assert.ok(lakeRows.flat().every((vertex) => vertex >= riverVertexLimit));
      assert.ok(patch.rows.slice(0, 3).flat().every(
        (vertex) => vertex < riverVertexLimit,
      ));
      assert.ok(patch.rows.flat().every((vertex) => (
        Number.isFinite(positions.getX(vertex))
        && Number.isFinite(positions.getY(vertex))
        && Number.isFinite(positions.getZ(vertex))
      )));
    }
  }

  disposeSystem(system);
});

test('river influence is full outside, half at shore, and zero one transition length inside', () => {
  assert.equal(getRiverLakeTransitionInfluence(4, 2), 1);
  assert.equal(getRiverLakeTransitionInfluence(0, 2), 0.5);
  assert.equal(getRiverLakeTransitionInfluence(-2, 2), 0);
  assert.throws(
    () => getRiverLakeTransitionInfluence(0, 0),
    /greater than zero/,
  );
});

test('river flow coordinates keep one metric centerline through every lake transition', () => {
  const system = createUnifiedWaterSystem(terrain);

  for (const batch of system.batches) {
    const positions = batch.geometry.getAttribute('position');
    const flowUv = batch.geometry.getAttribute('flowUv');
    const flowDirection = batch.geometry.getAttribute('flowDirection');
    const junctionFlowDirection = batch.geometry.getAttribute('junctionFlowDirection');
    const flowSpeed = batch.geometry.getAttribute('flowSpeed');
    const riverInfluence = batch.geometry.getAttribute('riverInfluence');
    const rapidMask = batch.geometry.getAttribute('rapidMask');
    const junctionMask = batch.geometry.getAttribute('junctionMask');
    const disturbanceMask = batch.geometry.getAttribute('disturbanceMask');
    const indices = batch.geometry.index.array;

    for (const patch of batch.userData.transitionPatches) {
      const flowSign = patch.endpoint === 'start' ? -1 : 1;
      const rowSize = patch.rows[0].length;
      const outerSourceCenter = patch.outerSourceRow.reduce((center, vertex) => [
        center[0] + positions.getX(vertex) / rowSize,
        center[1] + positions.getZ(vertex) / rowSize,
      ], [0, 0]);
      const fullCenter = patch.rows[0].reduce((center, vertex) => [
        center[0] + positions.getX(vertex) / rowSize,
        center[1] + positions.getZ(vertex) / rowSize,
      ], [0, 0]);
      const outerSourceU = patch.outerSourceRow.reduce(
        (sum, vertex) => sum + flowUv.getX(vertex) / rowSize,
        0,
      );
      const sourceWorldDistance = Math.hypot(
        fullCenter[0] - outerSourceCenter[0],
        fullCenter[1] - outerSourceCenter[1],
      );
      const sourceFlowDistance = Math.abs(
        flowUv.getX(patch.rows[0][0]) - outerSourceU,
      );

      assert.equal(patch.outerSourceRow.length, patch.rows[0].length);
      assert.ok(
        Math.abs(sourceFlowDistance - sourceWorldDistance) < 1e-3,
        `${patch.id} source-to-transition centerline distance`,
      );

      for (let row = 0; row < patch.rows.length; row += 1) {
        const rowUs = patch.rows[row].map((vertex) => flowUv.getX(vertex));
        const rowVs = patch.rows[row].map((vertex) => flowUv.getY(vertex));
        const vDeltas = rowVs.slice(1).map((value, index) => value - rowVs[index]);
        const vDirection = Math.sign(vDeltas.find((value) => Math.abs(value) > 1e-6) ?? 1);

        assert.ok(
          Math.max(...rowUs) - Math.min(...rowUs) < 5e-4,
          `${patch.id} row ${row} shares one longitudinal coordinate`,
        );
        assert.ok(
          vDeltas.every((value) => Math.abs(value) < 1e-6 || Math.sign(value) === vDirection),
          `${patch.id} row ${row} lateral coordinates remain monotonic`,
        );
      }

      for (let lateral = 0; lateral < patch.rows[0].length; lateral += 1) {
        const outerSourceVertex = patch.outerSourceRow[lateral];
        const shoreVertex = patch.rows[2][lateral];
        const shoreU = flowUv.getX(shoreVertex);
        const shoreV = flowUv.getY(shoreVertex);

        for (let row = 0; row < patch.rows.length; row += 1) {
          const vertex = patch.rows[row][lateral];

          assert.ok(Math.abs(
            flowUv.getX(vertex)
              - (shoreU - flowSign * patch.signedDistances[row])
          ) < 5e-5, `${patch.id} row ${row} longitudinal flow coordinate`);
          assert.ok(
            Math.abs(flowUv.getY(vertex) - shoreV) < 5e-5,
            `${patch.id} row ${row} lateral flow coordinate`,
          );
        }
        assert.ok(
          Math.abs(flowUv.getY(outerSourceVertex) - shoreV) < 5e-5,
          `${patch.id} preserves source lateral flow coordinate`,
        );

        for (let row = 0; row < patch.rows.length - 1; row += 1) {
          const a = patch.rows[row][lateral];
          const b = patch.rows[row + 1][lateral];
          const worldDistance = Math.hypot(
            positions.getX(b) - positions.getX(a),
            positions.getZ(b) - positions.getZ(a),
          );
          const flowDistance = Math.hypot(
            flowUv.getX(b) - flowUv.getX(a),
            flowUv.getY(b) - flowUv.getY(a),
          );

          assert.ok(
            Math.abs(flowDistance - worldDistance) < 1e-3,
            `${patch.id} row ${row}-${row + 1} metric flow distance`,
          );
        }
      }

      const patchVertices = new Set(patch.rows.flat());
      const uvOrientationSigns = [];

      for (let offset = 0; offset < indices.length; offset += 3) {
        const triangle = [indices[offset], indices[offset + 1], indices[offset + 2]];

        if (!triangle.every((vertex) => patchVertices.has(vertex))) continue;
        const [a, b, c] = triangle;
        const determinant = (
          (flowUv.getX(b) - flowUv.getX(a))
            * (flowUv.getY(c) - flowUv.getY(a))
          - (flowUv.getY(b) - flowUv.getY(a))
            * (flowUv.getX(c) - flowUv.getX(a))
        );

        if (Math.abs(determinant) > 1e-6) {
          uvOrientationSigns.push(Math.sign(determinant));
        }
      }
      assert.ok(uvOrientationSigns.length > 0);
      assert.equal(new Set(uvOrientationSigns).size, 1, `${patch.id} UV orientation`);

      for (const vertex of patch.rows[4]) {
        assert.equal(flowDirection.getX(vertex), 0);
        assert.equal(flowDirection.getY(vertex), 0);
        assert.equal(junctionFlowDirection.getX(vertex), 0);
        assert.equal(junctionFlowDirection.getY(vertex), 0);
        assert.equal(flowSpeed.getX(vertex), 0);
        assert.equal(riverInfluence.getX(vertex), 0);
        assert.equal(rapidMask.getX(vertex), 0);
        assert.equal(junctionMask.getX(vertex), 0);
        assert.equal(disturbanceMask.getX(vertex), 0);
      }
    }
  }

  disposeSystem(system);
});

test('basin batches contain no duplicate, degenerate, or non-manifold triangles', () => {
  const system = createUnifiedWaterSystem(terrain);

  assert.ok(system.stats.triangleCount <= 150000);

  for (const batch of system.batches) {
    const positions = batch.geometry.getAttribute('position');
    const indices = batch.geometry.index.array;
    const triangles = new Set();
    const edges = countUndirectedEdges(indices);

    for (let offset = 0; offset < indices.length; offset += 3) {
      const vertices = [indices[offset], indices[offset + 1], indices[offset + 2]];
      const triangleKey = [...vertices].sort((a, b) => a - b).join(':');
      const [a, b, c] = vertices.map((vertex) => new THREE.Vector3(
        positions.getX(vertex),
        positions.getY(vertex),
        positions.getZ(vertex),
      ));
      const crossY = (b.z - a.z) * (c.x - a.x)
        - (b.x - a.x) * (c.z - a.z);
      const areaSquared = b.sub(a).cross(c.sub(a)).lengthSq();

      assert.equal(new Set(vertices).size, 3);
      assert.ok(crossY > 1e-12, `${batch.name} has a downward triangle`);
      assert.ok(areaSquared > 1e-12, `${batch.name} has a degenerate triangle`);
      assert.equal(triangles.has(triangleKey), false);
      triangles.add(triangleKey);
    }

    assert.ok([...edges.values()].every((count) => count <= 2));
  }

  disposeSystem(system);
});

function countUndirectedEdges(indices) {
  const counts = new Map();

  for (let offset = 0; offset < indices.length; offset += 3) {
    for (const [a, b] of [
      [indices[offset], indices[offset + 1]],
      [indices[offset + 1], indices[offset + 2]],
      [indices[offset + 2], indices[offset]],
    ]) {
      const key = edgeKey(a, b);

      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return counts;
}

function edgeKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function disposeSystem(system) {
  system.dispose();
}
