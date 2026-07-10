export class FrameBenchmark {
  constructor({
    warmupMs = 20_000,
    durationMs = 30_000,
    runCount = 3,
    onRunComplete = () => {},
    onComplete = () => {},
  } = {}) {
    this.warmupMs = warmupMs;
    this.durationMs = durationMs;
    this.runCount = runCount;
    this.onRunComplete = onRunComplete;
    this.onComplete = onComplete;
    this.startedAt = null;
    this.runStartedAt = null;
    this.lastFrameAt = null;
    this.frameTimes = [];
    this.metricTotals = {};
    this.metricSamples = 0;
    this.results = [];
    this.complete = false;
  }

  sample(timestamp, metrics = {}) {
    if (this.complete || !Number.isFinite(timestamp)) return;

    if (this.startedAt === null) {
      this.startedAt = timestamp;
      this.lastFrameAt = timestamp;
      return;
    }

    if (this.runStartedAt === null) {
      if (timestamp - this.startedAt < this.warmupMs) {
        this.lastFrameAt = timestamp;
        return;
      }

      this.runStartedAt = timestamp;
      this.lastFrameAt = timestamp;
      return;
    }

    const frameTime = timestamp - this.lastFrameAt;
    this.lastFrameAt = timestamp;
    if (frameTime > 0) this.frameTimes.push(frameTime);
    this.accumulateMetrics(metrics);

    if (timestamp - this.runStartedAt < this.durationMs) return;

    const result = {
      run: this.results.length + 1,
      durationMs: timestamp - this.runStartedAt,
      ...summarizeFrameTimes(this.frameTimes),
      metrics: averageMetrics(this.metricTotals, this.metricSamples),
    };

    this.results.push(result);
    this.onRunComplete(result);

    if (this.results.length >= this.runCount) {
      this.complete = true;
      this.onComplete(this.results.slice());
      return;
    }

    this.runStartedAt = timestamp;
    this.frameTimes = [];
    this.metricTotals = {};
    this.metricSamples = 0;
  }

  accumulateMetrics(metrics) {
    for (const [key, value] of Object.entries(metrics)) {
      if (!Number.isFinite(value)) continue;
      this.metricTotals[key] = (this.metricTotals[key] ?? 0) + value;
    }
    this.metricSamples += 1;
  }
}

export function summarizeFrameTimes(frameTimes) {
  if (frameTimes.length === 0) {
    return {
      averageFps: 0,
      p95FrameMs: 0,
      onePercentLowFps: 0,
      framesOver33Ms: 0,
      framesOver50Ms: 0,
      frameCount: 0,
    };
  }

  const sorted = [...frameTimes].sort((a, b) => a - b);
  const mean = frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length;
  const p95 = percentile(sorted, 0.95);
  const p99 = percentile(sorted, 0.99);

  return {
    averageFps: 1000 / mean,
    p95FrameMs: p95,
    onePercentLowFps: 1000 / p99,
    framesOver33Ms: frameTimes.filter((value) => value > 33).length,
    framesOver50Ms: frameTimes.filter((value) => value > 50).length,
    frameCount: frameTimes.length,
  };
}

function percentile(sorted, ratio) {
  return sorted[Math.floor((sorted.length - 1) * ratio)];
}

function averageMetrics(totals, sampleCount) {
  if (sampleCount === 0) return {};

  return Object.fromEntries(
    Object.entries(totals).map(([key, value]) => [key, value / sampleCount]),
  );
}
