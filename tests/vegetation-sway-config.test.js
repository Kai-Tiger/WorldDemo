import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GRASS_SWAY_STRENGTH,
  TREE_SWAY_STRENGTH,
} from '../src/vegetationConfig.js';

test('grass and tree sway amplitudes use the requested 50 percent increase', () => {
  assert.equal(GRASS_SWAY_STRENGTH, 0.09);
  assert.equal(TREE_SWAY_STRENGTH, 0.009);
});
