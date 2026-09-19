// Pulls the numbers the card shows out of the GitHub GraphQL API.
//
// Counting lines of code means walking every commit you authored, which is far
// too slow to redo daily. Each repo's totals are cached against the SHA its
// default branch was on, so a repo is only re-walked after it actually moves.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const API = 'https://api.github.com/graphql';
const CACHE = path.join(import.meta.dirname, 'loc-cache.json');

async function graphql(query, variables, token) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  const body = await res.json();
  if (body.errors) throw new Error(`GitHub API: ${body.errors.map(e => e.message).join('; ')}`);
  return body.data;
}

async function identity(login, token) {
  const d = await graphql(
    `query($login:String!){ user(login:$login){ id createdAt followers{totalCount}
       repositoriesContributedTo(contributionTypes:[COMMIT,PULL_REQUEST,ISSUE,REPOSITORY]){totalCount} } }`,
    { login }, token);
  return d.user;
}

// Commit totals are only exposed a year at a time, so walk back to signup.
async function commitCount(login, createdAt, token) {
  let total = 0;
  const start = new Date(createdAt).getUTCFullYear();
  const end = new Date().getUTCFullYear();
  for (let y = start; y <= end; y++) {
    const d = await graphql(
      `query($login:String!,$from:DateTime!,$to:DateTime!){ user(login:$login){
         contributionsCollection(from:$from,to:$to){ totalCommitContributions restrictedContributionsCount } } }`,
      { login, from: `${y}-01-01T00:00:00Z`, to: `${y}-12-31T23:59:59Z` }, token);
    const c = d.user.contributionsCollection;
    total += c.totalCommitContributions + c.restrictedContributionsCount;
  }
  return total;
}

async function ownedRepos(login, token) {
  const repos = [];
  let after = null;
  do {
    const d = await graphql(
      `query($login:String!,$after:String){ user(login:$login){
         repositories(first:100,after:$after,ownerAffiliations:OWNER,isFork:false){
           pageInfo{hasNextPage endCursor}
           nodes{ name owner{login} stargazerCount
                  defaultBranchRef{ target{ ... on Commit { oid } } } } } } }`,
      { login, after }, token);
    const page = d.user.repositories;
    repos.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return repos;
}

async function repoLoc(owner, name, authorId, token) {
  let added = 0, deleted = 0, commits = 0, after = null;
  do {
    const d = await graphql(
      `query($owner:String!,$name:String!,$id:ID!,$after:String){
         repository(owner:$owner,name:$name){ defaultBranchRef{ target{ ... on Commit {
           history(first:100,after:$after,author:{id:$id}){
             pageInfo{hasNextPage endCursor} nodes{ additions deletions } } } } } } }`,
      { owner, name, id: authorId, after }, token);
    const h = d.repository?.defaultBranchRef?.target?.history;
    if (!h) break;
    for (const c of h.nodes) { added += c.additions; deleted += c.deletions; commits++; }
    after = h.pageInfo.hasNextPage ? h.pageInfo.endCursor : null;
  } while (after);
  return { added, deleted, commits };
}

export async function fetchStats(login, token) {
  const user = await identity(login, token);
  const repos = await ownedRepos(login, token);

  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch { /* first run */ }

  const next = {};
  let added = 0, deleted = 0, walked = 0, empty = 0;
  for (const repo of repos) {
    // This file gets committed to a public repo, so it must not carry the names
    // of private ones. A hash is just as stable a key and says nothing.
    const key = crypto.createHash('sha256')
      .update(`${repo.owner.login}/${repo.name}`).digest('hex').slice(0, 16);
    const head = repo.defaultBranchRef?.target?.oid ?? null;
    if (head === null) { next[key] = { head, added: 0, deleted: 0 }; empty++; continue; }

    let entry = cache[key];
    if (!entry || entry.head !== head) {
      entry = { head, ...(await repoLoc(repo.owner.login, repo.name, user.id, token)) };
      walked++;
    }
    next[key] = entry;
    added += entry.added;
    deleted += entry.deleted;
  }
  fs.writeFileSync(CACHE, JSON.stringify(next, null, 2) + '\n');
  console.log(`  ${repos.length} repos: ${walked} walked, `
    + `${repos.length - walked - empty} unchanged, ${empty} empty`);

  return {
    createdAt: user.createdAt,
    followers: user.followers.totalCount,
    contributedTo: user.repositoriesContributedTo.totalCount,
    repos: repos.length,
    stars: repos.reduce((n, r) => n + r.stargazerCount, 0),
    commits: await commitCount(login, user.createdAt, token),
    loc: { added, deleted, net: added - deleted },
  };
}
