import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MOUNTAIN_TRAIL_SUMMITS,
  applyMountainTrailTerrain,
} from '../src/mountainTrailNetwork.js';

test('trail and summit shaping cannot raise natural terrain into rock pillars', () => {
  for (const summit of MOUNTAIN_TRAIL_SUMMITS) {
    assert.ok(applyMountainTrailTerrain(200, summit.x, summit.z) <= 204);
  }

  assert.ok(applyMountainTrailTerrain(200, -552, -372) <= 204);
});
