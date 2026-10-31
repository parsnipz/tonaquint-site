import test from 'node:test'; import assert from 'node:assert';
import { robotsAllows, relevant, search } from '../lib/finder.js';
test('robots', () => {
  const t = 'User-agent: *\nDisallow: /private\nAllow: /private/ok\n\nUser-agent: GPTBot\nDisallow: /';
  assert.ok(robotsAllows(t, '/v0/servers')); assert.ok(!robotsAllows(t, '/private/x')); assert.ok(robotsAllows(t, '/private/ok/1'));
  assert.ok(!robotsAllows('User-agent: TonaquintFinder\nDisallow: /', '/x')); assert.ok(robotsAllows('', '/x'));
});
test('relevance + search', () => {
  assert.ok(relevant({ name: 'x', title: 'Find a local contractor', description: '' })); assert.ok(!relevant({ name: 'x', title: 'Weather', description: 'forecasts' }));
  const d = { results: [{ name: 'a', title: 'Utah contractors', description: '' }, { name: 'b', title: 'UK roofing', description: '' }, { name: 'c', title: 'Contractor licence', description: '' }] };
  assert.deepEqual(search(d, 'contractor', 'utah').map(x => x.name), ['a', 'c']);
});
