# Permanent development instructions

APP_SPEC.md is the primary source of truth. Use React, TypeScript, Vite, Tailwind and local IndexedDB. No accounts, backend, analytics or paid APIs.

- Never delete, reset, or silently overwrite workout history during updates.
- Every modification to progression or deload logic requires automated tests.
- Database migrations must preserve existing training data.
- Backup compatibility and successful restoration must be tested before production deployment.
- Preserve unfinished workout sessions across app restarts and updates.
- Never introduce breaking stored-data changes without a safe migration strategy.
- Do not modify unrelated GitHub repositories or Cloudflare projects.
- Never expose credentials, API tokens or sensitive configuration in source code.
- Prioritize data integrity, reliability and iPhone usability over visual complexity.
- Use dedicated milestone branches and reviewed PRs; run `npm test` and `npm run build` before merging.
- Keep stable exercise IDs and immutable exercise/configuration snapshots in sessions. Skips and abandoned sessions never create failures.
- Restore only validated backups, inside one atomic transaction, preserving a recovery snapshot. Never delete IndexedDB in service workers.
- Deploy via GitHub-integrated Cloudflare Pages (main, npm run build, dist). Never substitute Direct Upload.
- Clearly distinguish automated desktop browser tests from actual iPhone device tests.
