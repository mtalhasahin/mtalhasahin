// Regenerates both portraits from the photo named in config.js.
//
//   node scripts/art.js path/to/photo.jpg
//
// The photo itself is never committed — only the two .txt files it produces.
import fs from 'node:fs';
import path from 'node:path';
import cfg from '../config.js';
import { toAscii } from './portrait.js';

const root = path.join(import.meta.dirname, '..');
const photo = process.argv[2] || cfg.portrait.photo;

if (!photo || !fs.existsSync(photo)) {
  console.error(`Photo not found: ${photo || '(none given)'}`);
  console.error('Usage: node scripts/art.js path/to/photo.jpg');
  process.exit(1);
}

const buf = fs.readFileSync(photo);
const base = { cols: cfg.portrait.cols, crop: cfg.portrait.crop };

for (const [name, file] of [['dark', 'art.txt'], ['light', 'art-light.txt']]) {
  const lines = toAscii(buf, { ...base, ...cfg.portrait[name] });
  fs.writeFileSync(path.join(root, 'assets', file), lines.join('\n') + '\n');
  console.log(`assets/${file}: ${base.cols} cols x ${lines.length} rows`);
}
