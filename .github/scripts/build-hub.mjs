// Build step for GitHub Pages.
//
//  1. Injects <meta name="robots" content="noindex,nofollow"> into every
//     <slug>/index.html. Audits are committed RAW (exactly as uploaded) —
//     this is the single place noindex is applied, so any newly uploaded
//     audit is covered automatically.
//  2. Regenerates tasks/index.html (the audit index) from configs/*.json,
//     so the hub can never go stale.
//
// Runs against the working tree, whose contents become the Pages artifact.
// Nothing here is committed back.
//
// CAUTION: running this locally MUTATES the working tree (injects noindex into
// the audits + writes tasks/index.html). If you run it to test, `git checkout`
// the audit files before committing — the repo must hold RAW audits so CI is
// the sole injector. tasks/ is gitignored, so it won't be committed regardless.
//
// Fails the build if an audit cannot be injected — deploying an indexable
// client audit is worse than a failed deploy.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ROBOTS = '<meta name="robots" content="noindex,nofollow">';
const RESERVED = new Set(['tasks', 'configs', 'node_modules']);

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
           .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── discover audits: any top-level dir holding an index.html ──────────────
const slugs = (await readdir(ROOT, { withFileTypes: true }))
  .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !RESERVED.has(e.name))
  .map((e) => e.name)
  .filter((s) => existsSync(path.join(ROOT, s, 'index.html')))
  .sort();

if (slugs.length === 0) {
  console.error('::error::no audit folders found (expected <slug>/index.html)');
  process.exit(1);
}

// ── load configs/<slug>.json → { name, domain } ───────────────────────────
const cfg = {};
const cfgDir = path.join(ROOT, 'configs');
if (existsSync(cfgDir)) {
  for (const f of await readdir(cfgDir)) {
    if (!f.endsWith('.json')) continue;
    const slug = f.slice(0, -5);
    try {
      cfg[slug] = JSON.parse(await readFile(path.join(cfgDir, f), 'utf8'));
    } catch (err) {
      console.error(`::error::configs/${f} is not valid JSON — ${err.message}`);
      process.exit(1);
    }
  }
}

for (const slug of Object.keys(cfg)) {
  if (!slugs.includes(slug)) {
    console.warn(`::warning::configs/${slug}.json has no ${slug}/index.html — not on the hub`);
  }
}

// ── 1. inject noindex into every audit ───────────────────────────────────
let failed = false;
for (const slug of slugs) {
  const p = path.join(ROOT, slug, 'index.html');
  const html = await readFile(p, 'utf8');

  if (/<meta[^>]+name=["']robots["']/i.test(html)) {
    console.log(`noindex: ${slug} — already present, left as-is`);
    continue;
  }
  if (!/<head[^>]*>/i.test(html)) {
    console.error(`::error::${slug}/index.html has no <head> — cannot inject noindex`);
    failed = true;
    continue;
  }
  await writeFile(p, html.replace(/<head[^>]*>/i, (m) => `${m}\n  ${ROBOTS}`));
  console.log(`noindex: ${slug} — injected`);
}
if (failed) {
  console.error('::error::refusing to deploy: one or more audits could not be noindexed');
  process.exit(1);
}

// ── 2. regenerate the hub ────────────────────────────────────────────────
const cards = slugs.map((slug) => {
  const { name, domain } = cfg[slug] ?? {};
  if (!cfg[slug]) {
    console.warn(`::warning::no configs/${slug}.json — hub card falls back to the slug`);
  }
  const label = name || slug;
  const dom = domain || '';
  const favicon = dom ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(dom)}&sz=32` : '';
  return `
  <a class="card" href="../${esc(slug)}/" target="_blank">
    <img class="favicon" src="${esc(favicon)}" alt="">
    <div class="card-body">
      <div class="card-name">${esc(label)}</div>
      <div class="card-domain">${esc(dom)}</div>
    </div>
    <span class="arrow">→</span>
  </a>`;
}).join('\n');

const hub = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reddit Audits</title>
<meta name="robots" content="noindex,nofollow">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f1117;color:#e2e8f0;min-height:100vh;padding:32px 24px}
  h1{font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:4px}
  .subtitle{font-size:.85rem;color:#64748b;margin-bottom:32px}
  .section-title{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#475569;margin:28px 0 12px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
  .card{background:#1e2330;border:1px solid #2a3040;border-radius:12px;padding:18px 20px;display:flex;align-items:center;gap:14px;text-decoration:none;color:inherit;transition:border-color .15s,background .15s}
  .card:hover{border-color:#3b82f6;background:#1a2340}
  .favicon{width:32px;height:32px;border-radius:6px;flex-shrink:0;background:#2a3040;object-fit:contain}
  .card-body{flex:1;min-width:0}
  .card-name{font-size:.95rem;font-weight:600;color:#f1f5f9;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .card-domain{font-size:.78rem;color:#64748b}
  .arrow{color:#334155;font-size:1rem;flex-shrink:0}
  .card:hover .arrow{color:#3b82f6}
  .footer{font-size:.72rem;color:#334155;margin-top:36px}
  .footer a{color:#475569;text-decoration:none}
  .footer a:hover{color:#64748b}
</style>
</head>
<body>

<h1>Reddit Audits</h1>
<p class="subtitle">Reddit brand &amp; community audits — one-off, updated on request</p>

<div class="section-title">Active Audits</div>
<div class="grid">
${cards}
</div>

<div class="footer">
  <a href="https://gregunik.github.io/ai-visibility/tasks/" target="_blank">AI Visibility Reports</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/GregUniK/reddit-audits" target="_blank">Repo</a>
</div>

</body>
</html>
`;

await mkdir(path.join(ROOT, 'tasks'), { recursive: true });
await writeFile(path.join(ROOT, 'tasks', 'index.html'), hub);
console.log(`hub: tasks/index.html rebuilt with ${slugs.length} audit(s) — ${slugs.join(', ')}`);
