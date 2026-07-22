import assert from 'node:assert/strict';
import test from 'node:test';
import { Input } from '../src/input.js';

test('clearing keyboard state releases held and edge-triggered actions', () => {
  const input = Object.create(Input.prototype);
  input.keys = new Set(['KeyW', 'KeyK']);
  input.pressedKeys = new Set(['KeyJ', 'KeyE']);

  input.clearKeyboard();

  assert.equal(input.keys.size, 0);
  assert.equal(input.pressedKeys.size, 0);
});
