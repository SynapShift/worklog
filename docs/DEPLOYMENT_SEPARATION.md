# Deployment Separation

WorkLog can be open-sourced on GitHub while keeping the production website and user data private.

## What Goes To GitHub

Safe to publish:

- App source code.
- Cloudflare Pages Functions source.
- Database schema migrations.
- Example config files, such as `wrangler.example.toml` and `.env.example`.
- Product, security, architecture, and deployment docs.

Do not publish:

- `wrangler.toml`.
- `.dev.vars` or real environment files.
- Cloudflare API tokens.
- Production D1 `database_id` if you do not want it public.
- D1 exports or backups.
- User data.
- Local build output, native build output, and app packages.

## What Lives In Cloudflare

Production-only state:

- Pages project settings.
- D1 database binding named `DB`.
- Production D1 database data.
- Custom domain and DNS settings.
- Any future secrets or environment variables.

GitHub does not need access to user records or D1 table data.

## Runtime Data Boundary

Browser local-only:

- User model API key.
- Local cache before login.

Cloud D1 after login:

- Account email.
- Password hash and salt.
- Sessions.
- Records.
- Project metadata.
- Goals, ideas, and wishlist items.
- Report settings and templates.
- Non-secret model configuration.

Never stored in GitHub:

- User records.
- Account data.
- Password hashes.
- Model API keys.
- Cloudflare production credentials.

## Recommended Deployment Model

For a public open-source repo:

1. Commit only source code and example configs.
2. Keep `wrangler.toml` local.
3. Configure the D1 binding in the Cloudflare Pages dashboard.
4. Deploy from Cloudflare Pages or Wrangler.
5. Do not export D1 production data into the repository.

This way, the website can serve real users while GitHub only exposes the reusable project template.

## If Connecting GitHub To Cloudflare Pages

It is still safe if:

- The repo contains only example config.
- Production bindings are configured in Cloudflare, not committed.
- GitHub Actions secrets are not added unless truly needed.
- Pull requests from forks do not receive production secrets.

Cloudflare Pages can build the public code, then attach private production bindings at runtime.

