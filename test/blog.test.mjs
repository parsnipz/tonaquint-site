import test from 'node:test'; import assert from 'node:assert'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { build, parseFrontmatter, markdown } from '../scripts/build.mjs';
test('frontmatter + markdown', () => {
  const { data, body } = parseFrontmatter('---\ntitle: Hi\n---\n# H\n\nx <b>');
  assert.equal(data.title, 'Hi'); assert.match(markdown(body), /<h2>H<\/h2>[\s\S]*x &lt;b&gt;/);
});
test('build outputs crawlable site', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'tq-')); build(out);
  const post = fs.readFileSync(path.join(out, 'posts/hello.html'), 'utf8');
  assert.match(post, /rel="canonical" href="https:\/\/tonaquint.cc\/posts\/hello"/); assert.match(post, /og:title/);
  assert.match(fs.readFileSync(path.join(out, 'sitemap.xml'), 'utf8'), /tonaquint.cc\/posts\/hello/);
  assert.match(fs.readFileSync(path.join(out, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/tonaquint.cc\/sitemap.xml/);
  const subs = fs.readFileSync(path.join(out, 'subs.html'), 'utf8');
  assert.match(subs, /D&amp;B Painting/); assert.doesNotMatch(subs, /Dana|Mesquite/i);
  fs.rmSync(out, { recursive: true });
});
