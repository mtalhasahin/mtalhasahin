// Renders the neofetch-style terminal card as a self-contained animated SVG.
//
// Alignment note: monospace fonts differ in advance width between machines, and
// GitHub has no say in which one renders the image. Every line is therefore
// padded to a fixed column count and pinned with textLength, so the character
// grid holds no matter which font the viewer ends up with.

const FS = 12;              // font size
const CW = FS * 0.6;        // one character cell
const LH = 15.5;            // line height
const PAD = 24;
const BAR = 32;             // title bar height
const GUTTER = 4;           // columns between the portrait and the stats

export const THEMES = {
  dark: {
    bg: '#0d1117', chrome: '#161b22', border: '#30363d',
    art: ['#e6edf3', '#79c0ff', '#bc8cff'],
    title: '#8b949e', key: '#58a6ff', value: '#c9d1d9',
    leader: '#30363d', rule: '#484f58', accent: '#7ee787',
    plus: '#3fb950', minus: '#f85149', muted: '#8b949e',
  },
  light: {
    bg: '#ffffff', chrome: '#f6f8fa', border: '#d0d7de',
    art: ['#1f2328', '#0969da', '#8250df'],
    title: '#57606a', key: '#0969da', value: '#1f2328',
    leader: '#d8dee4', rule: '#8c959f', accent: '#1a7f37',
    plus: '#1a7f37', minus: '#cf222e', muted: '#57606a',
  },
};

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pad = (s, n) => s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);

// A neofetch row: key on the left, value on the right, dotted leader between.
function row(key, value, cols) {
  const left = `${key}:`;
  const gap = cols - left.length - value.length;
  if (gap < 1) return pad(`${left} ${value}`, cols);
  let leader = '';
  for (let i = 0; i < gap; i++) leader += i % 2 === 1 && i > 0 && i < gap - 1 ? '.' : ' ';
  return left + leader + value;
}

function heading(text, cols) {
  return pad(`${text} ${'─'.repeat(Math.max(0, cols - text.length - 1))}`, cols);
}

function uptime(since) {
  const a = new Date(since), b = new Date();
  let y = b.getUTCFullYear() - a.getUTCFullYear();
  let m = b.getUTCMonth() - a.getUTCMonth();
  let d = b.getUTCDate() - a.getUTCDate();
  if (d < 0) { m--; d += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate(); }
  if (m < 0) { y--; m += 12; }
  const part = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  return `${part(y, 'year')}, ${part(m, 'month')}, ${part(d, 'day')}`;
}

const num = n => n.toLocaleString('en-US');

// Builds the right-hand column as {text, kind} segments so parts can be coloured.
function statLines(cfg, s, cols) {
  const L = [];
  const plain = (text, kind = 'value') => L.push([[text, kind]]);
  const kv = ([k, v]) => L.push([[row(k, v, cols), 'kv']]);

  plain(pad(`${cfg.username}@github`, cols), 'title');
  plain('─'.repeat(cols), 'rule');
  kv(['Uptime', uptime(cfg.since)]);
  cfg.system.forEach(kv);
  plain('');
  cfg.languages.forEach(kv);
  plain('');
  cfg.hobbies.forEach(kv);
  plain('');
  plain(heading('Contact', cols), 'rule');
  cfg.contact.forEach(kv);
  plain('');
  plain(heading('GitHub Stats', cols), 'rule');
  kv(['Repos', `${num(s.repos)} {Contributed: ${num(s.contributedTo)}}  Stars: ${num(s.stars)}`]);
  kv(['Commits', `${num(s.commits)}  Followers: ${num(s.followers)}`]);

  // Split so the ++/-- counts can carry their own colour.
  const locKey = 'Lines of Code';
  const locVal = `${num(s.loc.net)} ( ${num(s.loc.added)}++, ${num(s.loc.deleted)}-- )`;
  const line = row(locKey, locVal, cols);
  const at = line.length - locVal.length;
  L.push([
    [line.slice(0, at), 'kv'],
    [`${num(s.loc.net)} ( `, 'value'],
    [`${num(s.loc.added)}++`, 'plus'],
    [', ', 'value'],
    [`${num(s.loc.deleted)}--`, 'minus'],
    [' )', 'value'],
  ]);
  return L;
}

// A kv row is drawn as three runs so key, leader and value differ in colour.
function kvRuns(text) {
  const colon = text.indexOf(':');
  const m = text.slice(colon + 1).match(/^[ .]*/);
  const lead = colon + 1 + m[0].length;
  return [
    [text.slice(0, colon + 1), 'key'],
    [text.slice(colon + 1, lead), 'leader'],
    [text.slice(lead), 'value'],
  ];
}

export function render(art, cfg, stats, theme) {
  const t = THEMES[theme];
  const artCols = Math.max(...art.map(l => l.length));
  const statCols = 66;
  const rows = Math.max(art.length, 0);
  const lines = statLines(cfg, stats, statCols);
  const bodyRows = Math.max(rows, lines.length);

  const W = Math.round(PAD * 2 + (artCols + GUTTER + statCols) * CW);
  const H = Math.round(BAR + PAD + bodyRows * LH + PAD);
  const artX = PAD;
  const statX = Math.round(PAD + (artCols + GUTTER) * CW);
  const top = BAR + PAD + FS;

  // Stagger every line so the card types itself out on load.
  const step = 0.035;
  let out = [];

  art.forEach((line, i) => {
    const s = pad(line, artCols);
    out.push(`<text class="ln" x="${artX}" y="${(top + i * LH).toFixed(1)}" `
      + `textLength="${(artCols * CW).toFixed(1)}" lengthAdjust="spacing" `
      + `fill="url(#artgrad)" style="animation-delay:${(i * step).toFixed(3)}s">${esc(s)}</text>`);
  });

  lines.forEach((runs, i) => {
    const y = (top + i * LH).toFixed(1);
    const expanded = runs.length === 1 && runs[0][1] === 'kv' ? kvRuns(runs[0][0]) : runs;
    const spans = expanded.map(([text, kind]) =>
      `<tspan fill="${t[kind] ?? t.value}">${esc(text)}</tspan>`).join('');
    const len = expanded.reduce((n, [text]) => n + text.length, 0);
    out.push(`<text class="ln" x="${statX}" y="${y}" `
      + `textLength="${(len * CW).toFixed(1)}" lengthAdjust="spacing" `
      + `style="animation-delay:${((art.length * 0.4 + i) * step).toFixed(3)}s">${spans}</text>`);
  });

  const cursorY = top + lines.length * LH - FS + 2;
  const cursorDelay = ((art.length * 0.4 + lines.length) * step).toFixed(3);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(cfg.username)} GitHub profile summary">
<title>${esc(cfg.username)}@github</title>
<defs>
  <linearGradient id="artgrad" x1="0" y1="0" x2="0.35" y2="1">
    <stop offset="0%" stop-color="${t.art[0]}"/>
    <stop offset="55%" stop-color="${t.art[1]}"/>
    <stop offset="100%" stop-color="${t.art[2]}"/>
  </linearGradient>
  <clipPath id="chrome"><rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10"/></clipPath>
</defs>
<style>
  text { font-family: "SFMono-Regular", "JetBrains Mono", Consolas, "Liberation Mono", Menlo, monospace;
         font-size: ${FS}px; white-space: pre; dominant-baseline: alphabetic; }
  .ln { opacity: 0; animation: reveal .5s cubic-bezier(.2,.7,.3,1) forwards; }
  @keyframes reveal { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }
  #cursor { animation: blink 1.1s steps(1) infinite; }
  @keyframes blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .ln { opacity: 1; animation: none; }
    #cursor { animation: none; }
  }
</style>
<g clip-path="url(#chrome)">
  <rect width="${W}" height="${H}" fill="${t.bg}"/>
  <rect width="${W}" height="${BAR}" fill="${t.chrome}"/>
  <line x1="0" y1="${BAR}" x2="${W}" y2="${BAR}" stroke="${t.border}"/>
  <circle cx="20" cy="${BAR / 2}" r="5" fill="#ff5f56"/>
  <circle cx="38" cy="${BAR / 2}" r="5" fill="#ffbd2e"/>
  <circle cx="56" cy="${BAR / 2}" r="5" fill="#27c93f"/>
  <text x="${W / 2}" y="${BAR / 2 + 4}" text-anchor="middle" fill="${t.title}" font-size="11">${esc(cfg.username)}@github: ~</text>
${out.join('\n')}
  <rect id="cursor" x="${statX}" y="${cursorY.toFixed(1)}" width="${CW.toFixed(1)}" height="${FS}" fill="${t.accent}"
        opacity="0" style="animation-delay:${cursorDelay}s"/>
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="none" stroke="${t.border}"/>
</svg>
`;
}
