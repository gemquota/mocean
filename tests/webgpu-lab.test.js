import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

test('isolated WebGPU lab module parses as JavaScript', async () => {
  const html = await readFile(new URL('../webgpu-lab.html', import.meta.url), 'utf8');
  const match = html.match(/<script type="module">([\\s\\S]*?)<\\/script>/);
  assert.ok(match, 'module script exists');
  const result = spawnSync(process.execPath, ['--check', '--input-type=module'], {
    input: match[1], encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('compute is gated on the native WebGPU backend and live habitat is not imported', async () => {
  const html = await readFile(new URL('../webgpu-lab.html', import.meta.url), 'utf8');
  assert.match(html, /renderer\\.backend\\?\\.isWebGPUBackend===true/);
  assert.match(html, /renderer\\.compute\\(computeNode\\)/);
  assert.match(html, /forceWebGL:activeMode==='webgpu-cpu'/);
  assert.doesNotMatch(html, /src\\/schooling\\.js/);
  assert.match(html, /CPU update p50 \/ p95/);
});
