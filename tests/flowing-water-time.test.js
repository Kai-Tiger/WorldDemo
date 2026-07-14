import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('golden-shot water stays live unless deterministic capture is requested', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(source, /const captureMode = query\.get\('capture'\) === '1';/);
  assert.match(source, /const visualTime = goldenShot \? 18\.5 : clock\.elapsedTime;/);
  assert.match(source, /const flowingWaterTime = captureMode \? 18\.5 : clock\.elapsedTime;/);
  assert.match(source, /unifiedWaterSystem\.update\(flowingWaterTime, camera\);/);
  assert.match(source, /postProcessing\.setWaterTime\(flowingWaterTime\);/);
  assert.match(
    source,
    /waterRenderController\.update\(\s*renderFrame,\s*player\.position,\s*camera,\s*flowingWaterTime,\s*\);/,
  );
  assert.match(source, /clouds\.update\(visualTime, camera\);/);
  assert.doesNotMatch(
    source,
    /updateRiverVisuals|updateWaterSystemVisuals|updateSmallLakes/,
  );
});
