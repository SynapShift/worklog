# Security Policy

## Supported Version

WorkLog is currently an early-stage personal project. Security fixes should target the latest version on the main branch.

## Current Security Model

- Passwords are stored as PBKDF2 hashes with per-user salts.
- Sessions expire after 30 days.
- Expired sessions are cleaned during login and registration.
- Model API keys are local-only and are not uploaded to D1.
- JSON exports intentionally exclude model API keys.
- Cloud sync stores records, project metadata, goals, ideas, wishes, report settings, report templates, and non-secret model configuration.
- Password recovery is not supported until a trustworthy email or identity flow is added.

## Reporting Issues

If you find a vulnerability, please open a private report if the hosting platform supports it. If not, create a minimal public issue without exploit details and ask for a secure contact path.

## Known Limitations

- No email verification yet.
- No account recovery yet.
- No end-to-end encryption for cloud-synced records.
- No rate limiting beyond Cloudflare platform-level protections.

Do not use this as a multi-tenant production service without an additional security review.
