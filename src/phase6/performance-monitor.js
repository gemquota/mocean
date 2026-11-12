const DEFAULT_WINDOW = 120;
const DEFAULT_METRICS = Object.freeze(['frame', 'simulation', 'render']);

export function createPerformanceMonitor({ windowSize = DEFAULT_WINDOW, metrics = DEFAULT_METRICS } = {}) {
  if (!Number.isInteger(windowSize) || windowSize < 2) throw new RangeError('windowSize must be an integer of at least 2.');
  const samples = new Map(metrics.map(name => [name, []]));
  function record(name, value) {
    if (!samples.has(name)) throw new RangeError('Unknown performance metric: ' + name);
    if (!Number.isFinite(value) || value < 0) return;
    const values = samples.get(name);
    values.push(value);
    if (values.length > windowSize) values.shift();
  }
  function percentile(values, fraction) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)];
  }
  function snapshot() {
    return Object.fromEntries([...samples].map(([name, values]) => [name, Object.freeze({
      count: values.length,
      latest: values.length ? values[values.length - 1] : null,
      p50: percentile(values, .5),
      p95: percentile(values, .95)
    })]));
  }
  return Object.freeze({ record, snapshot });
}
