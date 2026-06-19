# Contributing

Thanks for considering a contribution to WorkLog.

## Local Setup

```bash
npm install
npm run web
```

Run the production build check before opening a pull request:

```bash
npm run check
```

## Development Notes

- Keep WorkLog local-first. Features should still work without login whenever possible.
- Do not store model API keys in Cloudflare D1 or exported backup files.
- Keep UI copy concise and product-facing.
- Prefer small, focused pull requests over broad rewrites.
- Update `README.md`, `DEPLOY.md`, or `ROADMAP.md` when behavior or setup changes.

## Pull Request Checklist

- The app builds with `npm run check`.
- Cloudflare database changes are reflected in `migrations/schema.sql`.
- No personal `wrangler.toml`, `.env`, build output, or installation package is committed.
- User-facing changes are documented briefly.
