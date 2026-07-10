import assert from 'node:assert/strict';
import test from 'node:test';
import { FrameBenchmark, summarizeFrameTimes } from '../src/performanceBenchmark.js';

test('frame summary reports average, p95, 1% low and long frames', () => {
  const frames = Array.from({ length: 98 }, () => 16).concat([40, 60]);
  const summary = summarizeFrameTimes(frames);

  assert.ok(summary.averageFps > 55 && summary.averageFps < 63);
  assert.equal(summary.p95FrameMs, 16);
  assert.equal(summary.onePercentLowFps, 25);
  assert.equal(summary.framesOver33Ms, 2);
  assert.equal(summary.framesOver50Ms, 1);
  assert.equal(summary.frameCount, 100);
});

test('benchmark honors warmup and emits the requested number of runs', () => {
  const completedRuns = [];
  let finalResults = null;
  const benchmark = new FrameBenchmark({
    warmupMs: 10,
    durationMs: 30,
    runCount: 2,
    onRunComplete: (result) => completedRuns.push(result),
    onComplete: (results) => { finalResults = results; },
  });

  for (const timestamp of [0, 10, 20, 30, 40, 50, 60, 70, 80]) {
    benchmark.sample(timestamp, { drawCalls: 4 });
  }

  assert.equal(benchmark.complete, true);
  assert.equal(completedRuns.length, 2);
  assert.equal(finalResults.length, 2);
  assert.ok(finalResults.every((result) => result.metrics.drawCalls === 4));
});
