import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  getPhysicalRenderSize,
  getPhysicalTexelSize,
  getPostProcessingPassOrder,
} from '../src/postProcessing.js';
import { RENDER_QUALITY_PRESETS } from '../src/renderQuality.js';

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
