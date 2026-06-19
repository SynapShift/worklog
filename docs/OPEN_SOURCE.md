# Open Source Guide

This project is intended to be useful as both a personal tool and a portfolio-quality AI product sample.

## Before Publishing

Keep:

- Source files.
- `functions/`.
- `migrations/`.
- `scripts/`.
- `docs/`.
- `.github/`.
- `wrangler.example.toml`.
- `.env.example`.

Do not publish:

- `wrangler.toml`.
- `.dev.vars`.
- `.wrangler/`.
- `dist/`.
- `node_modules/`.
- Local native build outputs.
- Real API keys, test accounts, or production database IDs outside example files.
- D1 exports or backups with user data.

## Suggested Repository Description

```text
Local-first WorkLog PWA that turns daily fragments into project progress and weekly reports, with optional user-provided AI polish and Cloudflare D1 sync.
```

## Good First Issues

- Add more report templates.
- Improve mobile interaction details.
- Add project merge support.
- Add manual project-goal linking.
- Add export-to-Markdown.
- Add better conflict handling for cloud sync.

## Release Checklist

- Run `npm run check:open-source`.
- Run `npm run check`.
- Confirm `/api/health` works after deployment.
- Confirm API keys are not exported or synced.
- Confirm `wrangler.toml`, `.dev.vars`, and production data are not staged.
- Test direct record saving without model config.
- Test model preset selection.
- Test JSON export/import.
- Test cloud login and logout with a disposable account.

## Product Principles

- Local-first by default.
- AI is optional and user-controlled.
- Records should be easy to write.
- Reports should be easy to copy.
- Project views should be inferred first, manually managed only when needed.
