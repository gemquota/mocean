import test from 'node:test';
import assert from 'node:assert/strict';
import { createPerformanceMonitor } from '../src/phase6/performance-monitor.js';

test('performance monitor reports rolling p50 and p95 samples', () => {
  const monitor = createPerformanceMonitor({ windowSize: 5, metrics: ['render'] });
  [1, 2, 3, 4, 100].forEach(value => monitor.record('render', value));
  assert.deepEqual(monitor.snapshot().render, { count: 5, latest: 100, p50: 3, p95: 100 });
});

test('performance monitor discards samples outside its rolling window', () => {
  const monitor = createPerformanceMonitor({ windowSize: 3, metrics: ['frame'] });
  [2, 4, 6, 8].forEach(value => monitor.record('frame', value));
  assert.deepEqual(monitor.snapshot().frame, { count: 3, latest: 8, p50: 6, p95: 8 });
});

test('performance monitor ignores invalid measurements and rejects unknown metrics', () => {
  const monitor = createPerformanceMonitor({ metrics: ['simulation'] });
  monitor.record('simulation', NaN);
  monitor.record('simulation', -1);
  assert.equal(monitor.snapshot().simulation.count, 0);
  assert.throws(() => monitor.record('terrain', 1), /Unknown performance metric/);
});

test('performance monitor validates its rolling window', () => {
  assert.throws(() => createPerformanceMonitor({ windowSize: 1 }), /windowSize/);
});
