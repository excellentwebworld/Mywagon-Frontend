import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = existsSync(join(HERE, '../src'))
  ? join(HERE, '../src')
  : join(process.cwd(), 'src');
const SKIP = [/Login/, /Register/, /Auth/, /PublicTracking/, /Legal/, /mv-app-tokens\.css$/, /mv-ui\.jsx$/];
const PATTERNS = [
  { name: 'JetBrains Mono', re: /JetBrains\s*Mono/ },
  { name: 'DM Sans', re: /DM\s*Sans/ },
];

const hits = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP.some((r) => r.test(p))) continue;
    const st = statSync(p);
    if (st.isDirectory()) {
      walk(p);
      continue;
    }
    if (!/\.(css|tsx?|jsx?)$/.test(name)) continue;
    const text = readFileSync(p, 'utf8');
    for (const { name: label, re } of PATTERNS) {
      if (re.test(text)) hits.push(`${relative(join(ROOT, '..'), p)}: ${label}`);
    }
  }
}

walk(ROOT);
if (hits.length) {
  console.error('Brand lint failed:\n' + hits.map((h) => '  - ' + h).join('\n'));
  process.exit(1);
}
console.log('Brand lint OK');
