# Reddit Audits

Self-contained Reddit brand & community audits, hosted on GitHub Pages.
One folder per client slug; each audit is that folder's `index.html`.

**Index of all audits:** https://gregunik.github.io/reddit-audits/tasks/
(mirrors https://gregunik.github.io/ai-visibility/tasks/ — `noindex`, hand-maintained)

| Client | Folder | Live URL |
|--------|--------|----------|
| REDUNIQ | [`reduniq/`](reduniq/) | https://gregunik.github.io/reddit-audits/reduniq/ |
| WiZink Portugal | [`wizink-pt/`](wizink-pt/) | https://gregunik.github.io/reddit-audits/wizink-pt/ |
| WiZink España | [`wizink-es/`](wizink-es/) | https://gregunik.github.io/reddit-audits/wizink-es/ |

## Adding a client

1. Create `<slug>/index.html` (the self-contained audit).
2. Commit + push — the Pages workflow ([`.github/workflows/pages.yml`](.github/workflows/pages.yml)) redeploys automatically.

Reports carry `noindex,nofollow` and are meant to be shared by direct link, not
found via search. Slugs mirror the [`ai-visibility`](https://github.com/GregUniK/ai-visibility) repo.
