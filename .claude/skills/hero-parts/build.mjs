// Builds the grading page (the "parts forge") from the skill's scripts.
//   node .claude/skills/hero-parts/build.mjs [out.html]
// Inlines kit.js, parts.js and hero.js into forge.template.html. Publish the result as an
// Artifact with capabilities { db: {}, user: {} } so Stefan's grades and combos are saved.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(here, f), 'utf8');

export function bundle() {
  return ['kit.js', 'parts.js', 'hero.js'].map(read).join('\n');
}

export function buildForge() {
  return read('forge.template.html').replace('/*PARTS*/', () => bundle());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] || 'forge.html';
  writeFileSync(out, buildForge());
  console.log('wrote', out);
}
