import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { RENDER_QUALITY_PRESETS } from '../src/renderQuality.js';
import { createUnifiedWaterResolveMaterial } from '../src/unifiedWaterPass.js';

test('water controller leaves surface materials alone and has no scene-buffer binding path', async () => {
  const source = await readFile(
    new URL('../src/waterContext.js', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(source, /\.traverse\(/);
  assert.doesNotMatch(source, /bindSceneBuffers|uSceneColor|uSceneDepth/);
  assert.doesNotMatch(source, /USE_SINGLE_LAYER_WATER|NormalBlending|NoBlending/);
  assert.match(source, /const uniforms = resolveMaterial\?\.uniforms;/);
  assert.match(source, /setResolveMaterial\(nextResolveMaterial\)/);
});

test('unified resolve selects environment, probe, or planar reflection per pixel', () => {
  const material = createUnifiedWaterResolveMaterial();
  const shader = material.fragmentShader;

  assert.match(
    shader,
    /float probeWeight = uReflectionMode >= 1\.0\s*\? smoothstep\(0\.0, 0\.5, reflectionTier\)/,
  );
  assert.match(
    shader,
    /float planarWeight = uReflectionMode >= 2\.0\s*\? smoothstep\(0\.5, 1\.0, reflectionTier\)/,
  );
  assert.doesNotMatch(shader, /floor\(reflectionTier/);

  material.dispose();
});

test('quality presets and render loop use stronger bounded refraction and a local probe', async () => {
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map(
      (preset) => preset.water.refractionPixels,
    ),
    [0, 2, 3],
  );

  const [mainSource, waterContextSource] = await Promise.all([
    readFile(new URL('../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/waterContext.js', import.meta.url), 'utf8'),
  ]);

  assert.match(
    mainSource,
    /waterRenderController\.update\(\s*renderFrame,\s*player\.position,\s*camera,\s*flowingWaterTime,\s*\);/,
  );
  assert.match(waterContextSource, /distanceToSquared\(viewerPosition\) >= 64 \* 64/);
  assert.match(waterContextSource, /viewerPosition\.y \+ 2\.5/);
});
