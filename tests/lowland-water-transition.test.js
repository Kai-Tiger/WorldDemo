import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getLowlandMaterialFrame,
  getLowlandTerminalInletFade,
} from '../src/lowlandLandforms.js';
import {
  LOWLAND_STREAM_DEFINITION,
  TERMINAL_LOWLAND_LAKE,
  getHeroRiverCorridorFrame,
  getHeroRiverTerrainTarget,
} from '../src/lowlandHeightPlan.js';
import { getRiverMaterialFrame } from '../src/riverChannel.js';

test('terminal lake fades both inlets outside the shore and owns its full interior', () => {
  const { cx, cz, radius } = TERMINAL_LOWLAND_LAKE;

  assert.equal(getLowlandTerminalInletFade(cx + radius + 4, cz), 1);
  assert.ok(Math.abs(getLowlandTerminalInletFade(cx + radius + 2, cz) - 0.5) < 1e-8);
  assert.equal(getLowlandTerminalInletFade(cx + radius, cz), 0);
  assert.equal(getLowlandTerminalInletFade(cx + radius - 1, cz), 0);
  assert.equal(getLowlandTerminalInletFade(cx, cz), 0);
});

test('east inlet material masks use the same outside-shore fade', () => {
  const { cx, cz, radius } = TERMINAL_LOWLAND_LAKE;
  const approach = LOWLAND_STREAM_DEFINITION.reaches[0].points.at(-2);
  const dx = approach[0] - cx;
  const dz = approach[1] - cz;
  const length = Math.hypot(dx, dz);
  const sampleAtRadius = (sampleRadius) => getLowlandMaterialFrame(
    cx + dx / length * sampleRadius,
    cz + dz / length * sampleRadius,
  );
  const fadeStart = sampleAtRadius(radius + 4);
  const midpoint = sampleAtRadius(radius + 2);

  assert.ok(fadeStart.bedMask > 0.999999);
  assert.ok(Math.abs(midpoint.bedMask - 0.5) < 1e-8);
  for (const sample of [
    sampleAtRadius(radius),
    sampleAtRadius(radius - 1),
    sampleAtRadius(0),
  ]) {
    assert.equal(sample.bedMask, 0);
    assert.equal(sample.wetMask, 0);
  }
});

test('terminal lake rejects every hero river layer across its full circle', () => {
  const { cx, cz, radius } = TERMINAL_LOWLAND_LAKE;
  const radii = [0, 4, 8, 12, 16, 19, 19.5, 19.9, radius];

  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 90) {
    for (const sampleRadius of radii) {
      const x = cx + Math.cos(angle) * sampleRadius;
      const z = cz + Math.sin(angle) * sampleRadius;
      const material = getRiverMaterialFrame(10, x, z);
      const lowland = getLowlandMaterialFrame(x, z);

      assert.equal(getHeroRiverCorridorFrame(x, z), null);
      assert.equal(getHeroRiverTerrainTarget(10, x, z), null);
      assert.deepEqual(
        [
          material.riverMask,
          material.riverBedMask,
          material.riverUnderwaterMask,
          material.riverGravelMask,
          lowland.bedMask,
          lowland.wetMask,
        ],
        [0, 0, 0, 0, 0, 0],
      );
    }
  }
});
