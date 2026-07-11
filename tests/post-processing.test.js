import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as THREE from 'three';
import {
  getGtaoExcludedRoots,
  getPhysicalRenderSize,
  getPhysicalTexelSize,
  getPostProcessingPassOrder,
  renderWithGtaoExclusions,
} from '../src/postProcessing.js';
import {
  getShadowCameraFit,
  getShadowCameraSize,
  RENDER_QUALITY_PRESETS,
} from '../src/renderQuality.js';

test('post-processing uses FXAA after output or SMAA before output and never uses TAA', async () => {
  assert.deepEqual(
    getPostProcessingPassOrder(RENDER_QUALITY_PRESETS.performance.postProcessing),
    ['RenderPass', 'ColorGradePass', 'OutputPass', 'FXAAPass'],
  );
  assert.deepEqual(
    getPostProcessingPassOrder(RENDER_QUALITY_PRESETS.balanced.postProcessing),
    ['RenderPass', 'GTAOPass', 'ColorGradePass', 'SMAAPass', 'OutputPass'],
  );
  assert.deepEqual(
    getPostProcessingPassOrder(RENDER_QUALITY_PRESETS.quality.postProcessing),
    ['RenderPass', 'GTAOPass', 'ColorGradePass', 'SMAAPass', 'OutputPass'],
  );

  const source = await readFile(new URL('../src/postProcessing.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /TAARenderPass/);
  assert.match(source, /SMAAPass/);
  assert.match(source, /uBloomThreshold/);
  assert.match(source, /setResolutionScale/);
  assert.match(source, /getResolutionScaleRange/);
  assert.match(source, /getTargetFrameMs/);
});

test('color-grade texel size follows scaled composer physical dimensions', () => {
  assert.deepEqual(getPhysicalTexelSize(100, 80, 1), { x: 1 / 100, y: 1 / 80 });
  assert.deepEqual(getPhysicalTexelSize(100, 80, 1.25), { x: 1 / 125, y: 1 / 100 });
  assert.deepEqual(getPhysicalTexelSize(100, 80, 1.25 * 0.75), { x: 1 / 93, y: 1 / 75 });
  assert.deepEqual(getPhysicalRenderSize(100, 80, 1.25 * 0.75), { width: 93, height: 75 });
});

test('pre-tonemap grading preserves terrain shadows with neutral contrast and restrained vignette', async () => {
  const source = await readFile(new URL('../src/postProcessing.js', import.meta.url), 'utf8');

  assert.match(source, /uContrast:\s*\{ value: 1\.0 \}/);
  assert.match(source, /uShadowLift:\s*\{ value: 0\.015 \}/);
  assert.match(source, /uVignetteStrength:\s*\{ value: 0\.08 \}/);
});

test('GTAO temporarily hides only explicitly excluded roots and always restores visibility', () => {
  const scene = new THREE.Scene();
  const water = new THREE.Group();
  const foam = new THREE.Group();
  const grass = new THREE.Group();

  water.userData.excludeFromGtao = true;
  foam.userData.excludeFromGtao = true;
  foam.visible = false;
  scene.add(water, foam, grass);

  const excludedRoots = getGtaoExcludedRoots(scene);

  assert.deepEqual(excludedRoots, [water, foam]);
  assert.throws(() => renderWithGtaoExclusions(excludedRoots, () => {
    assert.equal(water.visible, false);
    assert.equal(foam.visible, false);
    assert.equal(grass.visible, true);
    throw new Error('render failed');
  }), /render failed/);
  assert.equal(water.visible, true);
  assert.equal(foam.visible, false);
  assert.equal(grass.visible, true);
});

test('quality presets lock resolution, AA, AO, streaming and shadow budgets', () => {
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.pixelRatioCap),
    [1, 1.25, 1.5],
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.resolution),
    [
      { minScale: 0.7, maxScale: 1, targetFrameMs: 33.3 },
      { minScale: 0.75, maxScale: 1, targetFrameMs: 33.3 },
      { minScale: 0.85, maxScale: 1, targetFrameMs: 33.3 },
    ],
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.postProcessing.antiAliasing),
    ['fxaa', 'smaa', 'smaa'],
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.postProcessing.gtaoSamples),
    [0, 6, 12],
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.streamingBudgets.totalMs),
    [3, 4, 5],
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.shadows.mapSize),
    [1024, 2048, 2048],
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => getShadowCameraSize(preset.shadows)),
    [360, 520, 840],
  );
  const sunDirection = new THREE.Vector3(0.48, 0.48, 0.73).normalize();
  const shadowFits = Object.values(RENDER_QUALITY_PRESETS).map((preset) => (
    getShadowCameraFit(preset.shadows, sunDirection, -40, 340, 0.5)
  ));

  for (const fit of shadowFits) {
    const horizontalSunLength = Math.hypot(sunDirection.x, sunDirection.z);
    const projectedHeight = 190.5 * horizontalSunLength;

    assert.equal(fit.centerY, 150);
    assert.ok(fit.halfWidth >= fit.cameraSize * 0.5 + 0.5);
    assert.ok(fit.halfHeight >= fit.halfWidth * Math.abs(sunDirection.y) + projectedHeight);
    assert.ok(fit.halfDepth >= fit.halfWidth * horizontalSunLength + 190.5 * Math.abs(sunDirection.y));
  }
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.terrain.lodSegments),
    [[128, 64], [256, 128, 64], [256, 128, 64]],
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.water.reflectionMode),
    ['environment', 'probe', 'planar'],
  );
});

test('render entry gates capture buffers and adapts only internal resolution', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(source, /preserveDrawingBuffer:\s*query\.get\('capture'\) === '1'/);
  assert.match(source, /requestAnimationFrame\(animate\)/);
  assert.match(source, /DYNAMIC_RESOLUTION/);
  assert.match(source, /postProcessing\.setResolutionScale/);
  assert.doesNotMatch(source, /renderer\.setPixelRatio\([^\n]*resolutionScale/);
});
