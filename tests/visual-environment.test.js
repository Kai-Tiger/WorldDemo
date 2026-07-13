import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as THREE from 'three';
import {
  createProceduralEnvironmentTexture,
  VISUAL_ENVIRONMENT,
} from '../src/visualEnvironment.js';

test('clear alpine lighting keeps the authored azimuth at a 48 degree elevation', () => {
  const direction = VISUAL_ENVIRONMENT.sun.direction;
  const elevation = THREE.MathUtils.radToDeg(Math.asin(direction.y));

  assert.equal(VISUAL_ENVIRONMENT.name, 'clear-alpine-late-morning');
  assert.equal(VISUAL_ENVIRONMENT.timeOfDay, 'late-morning');
  assert.equal(VISUAL_ENVIRONMENT.weather, 'clear');
  assert.ok(Math.abs(elevation - 48) < 0.001);
  assert.ok(Math.abs(direction.x / direction.z - 0.48 / 0.73) < 0.000001);
});

test('clear alpine fill lighting uses the calibrated clear-weather values', () => {
  assert.equal(VISUAL_ENVIRONMENT.exposure, 1.14);
  assert.equal(VISUAL_ENVIRONMENT.sun.intensity, 3.25);
  assert.equal(VISUAL_ENVIRONMENT.fog.density, 0.00030);
  assert.equal(VISUAL_ENVIRONMENT.fog.color.getHexString(), '719bb7');
  assert.equal(VISUAL_ENVIRONMENT.sky.zenithColor.getHexString(), '236fc4');
  assert.equal(VISUAL_ENVIRONMENT.sky.horizonColor.getHexString(), '67a9d6');
  assert.equal(VISUAL_ENVIRONMENT.sky.cloudColor.getHexString(), 'e8eef2');
  assert.equal(VISUAL_ENVIRONMENT.sky.cloudShadowColor.getHexString(), '7890a0');
  assert.equal(VISUAL_ENVIRONMENT.sky.cloudCover, 0.48);
  assert.equal(VISUAL_ENVIRONMENT.environmentMap.intensity, 1.20);
  assert.equal(VISUAL_ENVIRONMENT.hemisphere.intensity, 2.05);
});

test('aerial perspective exposes one shared clear-air atmosphere profile', () => {
  const atmosphere = VISUAL_ENVIRONMENT.atmosphere;

  assert.equal(atmosphere.density, 0.00048);
  assert.equal(atmosphere.heightFalloff, 0.004);
  assert.equal(atmosphere.minimumHeightDensity, 0.18);
  assert.equal(atmosphere.nearClearDistance, 180);
  assert.equal(atmosphere.fullDensityDistance, 900);
  assert.equal(atmosphere.sunScatter, 0.20);
  assert.equal(atmosphere.maxOpacity, 0.32);
  assert.equal(atmosphere.rayleighColor.getHexString(), '73a3c5');
  assert.equal(atmosphere.mieColor.getHexString(), 'e6c38f');
  assert.equal(atmosphere.rayleighColor.isColor, true);
  assert.equal(atmosphere.mieColor.isColor, true);
});

test('sky shader restrains horizon haze and the broad solar Mie halo', async () => {
  const source = await readFile(new URL('../src/clouds.js', import.meta.url), 'utf8');

  assert.match(source, /uHorizonColor \* 1\.01/);
  assert.match(source, /pow\(1\.0 - h, 3\.0\) \* 0\.24/);
  assert.match(source, /pow\(sunDot, 7\.0\) \* 0\.25/);
  assert.match(source, /pow\(sunDot, 260\.0\) \* 0\.9/);
});

test('procedural environment keeps a readable lower hemisphere', () => {
  const environment = {
    ...VISUAL_ENVIRONMENT,
    environmentMap: {
      ...VISUAL_ENVIRONMENT.environmentMap,
      width: 16,
      height: 8,
    },
  };
  const texture = createProceduralEnvironmentTexture(environment);
  const { width, height, data } = texture.image;
  const sampleOffset = (Math.floor(height * 0.25) * width + Math.floor(width * 0.5)) * 4;
  const luminance = (
    THREE.DataUtils.fromHalfFloat(data[sampleOffset]) * 0.2126
    + THREE.DataUtils.fromHalfFloat(data[sampleOffset + 1]) * 0.7152
    + THREE.DataUtils.fromHalfFloat(data[sampleOffset + 2]) * 0.0722
  );

  assert.equal(texture.name, 'ClearAlpineLateMorningEnvironment');
  assert.ok(luminance > 0.12);
  texture.dispose();
});

test('scene excludes deferred vegetation hosts from GTAO', async () => {
  const source = await readFile(new URL('../src/scene.js', import.meta.url), 'utf8');

  assert.match(source, /grassManager\.group\.userData\.excludeFromGtao = true/);
  assert.match(source, /treeManager\.group\.userData\.excludeFromGtao = true/);
});
