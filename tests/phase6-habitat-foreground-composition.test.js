import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('habitat camera brings vegetation and creatures closer without changing model alignment', () => {
  const html = readFileSync(new URL('../schooling.html', import.meta.url), 'utf8');
  const camera = html.match(/const worldUp=vec3\(0,1,0\),camera=\{p:vec3\(([-\d.]+),([-\d.]+),([-\d.]+)\),target:vec3\(\)\};/);
  assert.ok(camera, 'shared habitat camera is declared');
  const [x, y, z] = camera.slice(1).map(Number);
  assert.equal(x, 0);
  assert.ok(z > 0 && z <= 56, 'camera is materially closer to the habitat');
  assert.ok(Math.abs(y / z - 0.27) < 0.02, 'camera keeps approximately the existing downward viewing angle');
  assert.match(html, /modelCamera\.position\.set\(camera\.p\.x,camera\.p\.y,camera\.p\.z\)/,
    'Three.js creatures use the same camera position as the plant and terrain projection');
});

test('vegetation and creature projection continue to share the same perspective zoom', () => {
  const html = readFileSync(new URL('../schooling.html', import.meta.url), 'utf8');
  assert.match(html, /function project\(point,projectionZoom=zoom\)/);
  assert.match(html, /focal=Math\.min\(viewWidth,viewHeight\)\*1\.08\*projectionZoom/);
  assert.match(html, /modelCamera\.fov=2\*Math\.atan\(viewHeight\/\(2\*focal\)\)/);
});
