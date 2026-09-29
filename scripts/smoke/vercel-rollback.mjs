#!/usr/bin/env node
// Vercel instant rollback to the previous production deployment (plan §3).
//
//   VERCEL_TOKEN=… VERCEL_PROJECT_ID=… [VERCEL_ORG_ID=…] node scripts/smoke/vercel-rollback.mjs [--dry]
//
// The workflow calls this ONLY when the run's failing class is frontend_dead,
// the push touched no supabase/** or api/**, and the token secret is set —
// the gating lives in .github/workflows/smoke.yml and is test-pinned; this
// script does the one action. Project and team ids: .vercel/project.json when
// the repo carries one (it does not today), else VERCEL_PROJECT_ID / VERCEL_ORG_ID.
//
// REST (vercel.com/docs/rest-api, read 2026-09-29):
//   GET  /v9/projects/{id}                       → targets.production.id (what is live)
//   GET  /v6/deployments?projectId&target=production&state=READY
//   POST /v1/projects/{projectId}/rollback/{deploymentId}?teamId   → 201
import fs from 'node:fs';
import path from 'node:path';

export const API = 'https://api.vercel.com';

export function readProjectIds(env = process.env, cwd = process.cwd()) {
  const file = path.join(cwd, '.vercel', 'project.json');
  let fromFile = {};
  try { fromFile = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { /* absent */ }
  const projectId = env.VERCEL_PROJECT_ID || fromFile.projectId || null;
  const orgId = env.VERCEL_ORG_ID || fromFile.orgId || null;
  return { projectId, orgId, source: env.VERCEL_PROJECT_ID ? 'env' : fromFile.projectId ? '.vercel/project.json' : 'none' };
}

const teamQ = (orgId) => (orgId ? `teamId=${encodeURIComponent(orgId)}` : '');

// The deployment to roll back TO: the newest READY production deployment
// that is not the one currently serving. Never the current one, never a
// non-READY one, never a preview.
export function pickPrevious(deployments, currentId) {
  return (deployments || [])
    .filter(d => d.target === 'production' && (d.readyState || d.state) === 'READY' && d.uid !== currentId)
    .sort((a, b) => (b.created || b.createdAt || 0) - (a.created || a.createdAt || 0))[0] || null;
}

export async function rollback({ env = process.env, fetchImpl = fetch, dry = false, log = console.log, reason = 'smoke bot: front end dead after deploy' } = {}) {
  const token = env.VERCEL_TOKEN;
  if (!token) { log('rollback skipped: VERCEL_TOKEN not set'); return { skipped: 'VERCEL_TOKEN not set' }; }
  const { projectId, orgId, source } = readProjectIds(env);
  if (!projectId) { log('rollback skipped: no project id (VERCEL_PROJECT_ID secret or .vercel/project.json)'); return { skipped: 'no project id' }; }
  const h = { authorization: `Bearer ${token}` };
  const q = teamQ(orgId);

  const proj = await fetchImpl(`${API}/v9/projects/${encodeURIComponent(projectId)}${q ? `?${q}` : ''}`, { headers: h });
  if (!proj.ok) throw new Error(`GET project → HTTP ${proj.status} ${(await proj.text().catch(() => '')).slice(0, 200)}`);
  const project = await proj.json();
  const currentId = project?.targets?.production?.id || null;

  const list = await fetchImpl(`${API}/v6/deployments?projectId=${encodeURIComponent(projectId)}&target=production&state=READY&limit=10${q ? `&${q}` : ''}`, { headers: h });
  if (!list.ok) throw new Error(`GET deployments → HTTP ${list.status}`);
  const previous = pickPrevious((await list.json()).deployments, currentId);
  if (!previous) { log('rollback skipped: no earlier READY production deployment'); return { skipped: 'no previous deployment', currentId }; }

  log(`project ${projectId} (${source}) current=${currentId} → rollback to ${previous.uid} (${previous.meta?.githubCommitSha || previous.url || ''})${dry ? ' [dry]' : ''}`);
  if (dry) return { dry: true, currentId, to: previous.uid };
  const params = new URLSearchParams({ description: reason.slice(0, 200) });
  if (orgId) params.set('teamId', orgId);
  const res = await fetchImpl(`${API}/v1/projects/${encodeURIComponent(projectId)}/rollback/${encodeURIComponent(previous.uid)}?${params}`, { method: 'POST', headers: { ...h, 'content-type': 'application/json' } });
  if (!res.ok) throw new Error(`POST rollback → HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`);
  log(`rolled back: production now ${previous.uid}`);
  return { rolledBack: true, from: currentId, to: previous.uid, commit: previous.meta?.githubCommitSha || null };
}

if (process.argv[1] && /vercel-rollback\.mjs$/.test(process.argv[1])) {
  rollback({ dry: process.argv.includes('--dry') }).then((r) => {
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `result=${JSON.stringify(r)}\n`);
  }).catch((e) => {
    console.error(`rollback failed: ${e.message}`);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `result=${JSON.stringify({ error: String(e.message) })}\n`);
    process.exit(1);
  });
}
