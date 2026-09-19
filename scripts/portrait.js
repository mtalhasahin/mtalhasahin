// Photo -> ASCII portrait.
//
// "Ink" here means glyph density. On the dark card the bright parts of the photo
// carry it; on the light card the shadows do. Same photo, two renderings, so the
// face reads right against either background.
import fs from 'node:fs';
import jpeg from 'jpeg-js';

const CELL_RATIO = 0.46; // monospace cells are roughly twice as tall as wide

/**
 * @param {Buffer} buf            JPEG bytes
 * @param {object} o
 * @param {number} o.cols         output width in characters
 * @param {string} o.crop         "x0,y0,x1,y1" as fractions of the source
 * @param {string} [o.ramp]       glyphs from lightest to densest
 * @param {number} [o.gamma]      <1 lifts midtones, >1 hardens contrast
 * @param {number} [o.floor]      ink below this becomes blank
 * @param {number} [o.vignette]   elliptical edge fade; 0 disables it
 * @param {boolean} [o.invert]    ink the shadows instead of the highlights
 */
export function toAscii(buf, o) {
  const ramp = o.ramp ?? ' .:-=+*#%@';
  const gamma = o.gamma ?? 1;
  const floor = o.floor ?? 0;
  const vignette = o.vignette ?? 0;

  const img = jpeg.decode(buf, { useTArray: true });
  const [cx0, cy0, cx1, cy1] = String(o.crop ?? '0,0,1,1').split(',').map(Number);
  const ox = Math.floor(cx0 * img.width), oy = Math.floor(cy0 * img.height);
  const w = Math.floor(cx1 * img.width) - ox, h = Math.floor(cy1 * img.height) - oy;

  const lum = (x, y) => {
    const i = ((y + oy) * img.width + (x + ox)) * 4;
    return 0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2];
  };

  const cellW = w / o.cols;
  const cellH = cellW / CELL_RATIO;
  const rows = Math.floor(h / cellH);

  // Average each cell, tracking the range so contrast can be stretched over it.
  const cells = [];
  let lo = 255, hi = 0;
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < o.cols; c++) {
      const x0 = Math.floor(c * cellW), x1 = Math.min(w, Math.ceil((c + 1) * cellW));
      const y0 = Math.floor(r * cellH), y1 = Math.min(h, Math.ceil((r + 1) * cellH));
      let sum = 0, n = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { sum += lum(x, y); n++; }
      const v = n ? sum / n : 0;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
      row.push(v);
    }
    cells.push(row);
  }

  const span = Math.max(1, hi - lo);
  const lines = cells.map((row, r) => row.map((v, c) => {
    const t = Math.pow((v - lo) / span, gamma);
    let ink = o.invert ? 1 - t : t;
    // Fade the edges out last, so the background goes blank either way round.
    if (vignette > 0) {
      const dx = (c + 0.5) / o.cols * 2 - 1, dy = (r + 0.5) / rows * 2 - 1;
      ink *= Math.min(1, Math.max(0, (vignette + 0.35 - Math.hypot(dx, dy)) / 0.35));
    }
    if (ink < floor) return ' ';
    const g = (ink - floor) / (1 - floor);
    return ramp[Math.min(ramp.length - 1, Math.round(g * (ramp.length - 1)))];
  }).join('').replace(/\s+$/, ''));

  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines;
}

// CLI: node scripts/portrait.js photo.jpg cols=42 crop=0.31,0.33,0.44,0.46 floor=0.15 ...
if (process.argv[1]?.endsWith('portrait.js')) {
  const args = Object.fromEntries(process.argv.slice(3).map(a => {
    const i = a.indexOf('=');
    return [a.slice(0, i), a.slice(i + 1)];
  }));
  const lines = toAscii(fs.readFileSync(process.argv[2]), {
    cols: Number(args.cols || 42),
    crop: args.crop,
    ramp: args.ramp,
    gamma: args.gamma === undefined ? undefined : Number(args.gamma),
    floor: args.floor === undefined ? undefined : Number(args.floor),
    vignette: args.vignette === undefined ? undefined : Number(args.vignette),
    invert: args.invert === '1' || args.invert === 'true',
  });
  console.log(lines.join('\n'));
  console.error(`# ${args.cols || 42} cols x ${lines.length} rows`);
}
