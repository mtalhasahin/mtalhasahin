// Writes assets/dark_mode.svg and assets/light_mode.svg.
//
//   node scripts/build.js          full stats, needs ACCESS_TOKEN
//   node scripts/build.js --public public REST data only, no token, no LOC
import fs from 'node:fs';
import path from 'node:path';
import cfg from '../config.js';
import { render, THEMES } from './card.js';
import { fetchStats } from './github.js';

const root = path.join(import.meta.dirname, '..');
const token = process.env.ACCESS_TOKEN || process.env.GITHUB_TOKEN;
const publicOnly = process.argv.includes('--public');

// Enough for a local preview: everything the REST API hands out anonymously.
async function publicStats(login) {
  const get = async url => {
    const r = await fetch(url, { headers: { 'User-Agent': login } });
    if (!r.ok) throw new Error(`GitHub REST ${r.status}: ${url}`);
    return r.json();
  };
  const user = await get(`https://api.github.com/users/${login}`);
  const repos = await get(`https://api.github.com/users/${login}/repos?per_page=100`);
  const owned = repos.filter(r => !r.fork);
  return {
    createdAt: user.created_at,
    followers: user.followers,
    contributedTo: 0,
    repos: owned.length,
    stars: owned.reduce((n, r) => n + r.stargazers_count, 0),
    commits: 0,
    loc: { added: 0, deleted: 0, net: 0 },
  };
}

// Each theme gets its own portrait; fall back to the dark one if the light
// variant was never generated.
const readArt = name => {
  const file = path.join(root, 'assets', name);
  const from = fs.existsSync(file) ? file : path.join(root, 'assets', 'art.txt');
  return fs.readFileSync(from, 'utf8').replace(/\n+$/, '').split('\n');
};
const art = { dark: readArt('art.txt'), light: readArt('art-light.txt') };

let stats;
if (publicOnly || !token) {
  if (!publicOnly) console.warn('! No ACCESS_TOKEN set — falling back to public data (no commits or LOC).');
  stats = await publicStats(cfg.username);
} else {
  console.log(`Fetching stats for ${cfg.username}...`);
  stats = await fetchStats(cfg.username, token);
}

for (const theme of Object.keys(THEMES)) {
  const file = path.join(root, 'assets', `${theme}_mode.svg`);
  fs.writeFileSync(file, render(art[theme], cfg, stats, theme));
  console.log(`Wrote assets/${theme}_mode.svg`);
}
