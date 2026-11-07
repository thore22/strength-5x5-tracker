# Strength

Personal offline-first 5×5 tracker. Requirements: [APP_SPEC.md](APP_SPEC.md).

## Development

Node 22 or newer. `npm install`, `npm run dev`, `npm test`, `npm run build`.
All training state is local to the current browser and origin in IndexedDB. GitHub and Cloudflare do **not** back up workout data.

## Deployment

Cloudflare Pages must use native Git integration with this private repository, production branch `main`, build `npm run build`, output `dist`. Use the production URL consistently; preview URLs have separate local training data.

## Data safety

History and unfinished workouts are stored with exercise snapshots. Template edits never rewrite history. Storage failures stop writes and display an error. Keep JSON backups in Files/iCloud Drive.

## Install and test on iPhone

Open the production URL in Safari. Use Share → Add to Home Screen → Add. Open the Home Screen app online once, then reopen in Airplane Mode and log a test session. Start with your own working weights in Program.

In Settings, Generate JSON backup, then Share to Files (when offered) or use the download fallback. Save to Files/iCloud Drive and confirm the file exists. Choose that `.json` file using the native file picker, inspect its preview, and explicitly restore it. Export the current database first. A recovery snapshot is retained locally before each replacement.

Timers use real timestamps; sound and vibration are best effort while the app is foregrounded. This app has no background push notification service. Browser storage can be evicted; persistent-storage requests are best effort and external backups remain essential. Production and previews have separate IndexedDB stores: always train on production.

## Verification

`npm test` covers engine rules, deloads, warm-ups, persistence, migration, backup integrity/restore and history edits. `npm run test:e2e` tests touch-sized Chromium layouts, offline operation, JSON import/export, recovery across reloads and service-worker deployment updates. Install its test browser with `npx playwright install chromium` first. CI runs both suites and the build. These automated tests are **not** physical iPhone/Safari verification; device installation, native Files/iCloud sharing, audio and storage behavior must still be checked on an iPhone.

Backup v3 includes original-plan snapshots for in-workout accessory swaps, full nested validation and a SHA-256 corruption check. Existing v2 backups remain supported. The documented legacy v1 format uses `format: strength-tracker`, `version: 1`, an ISO `exportedAt` and a complete v1 data state. State migration from v1/v2 preserves history and unfinished sessions, adding missing timer/reminder metadata for v1. Unknown future versions are rejected. Checksums detect corruption, not authenticity.

During an active workout, tap **Swap** on an unstarted accessory to choose from a short curated list. Confirm its own load and targets; the change is for this workout only. Logged sets cannot be replaced, and templates stay unchanged. See [ACCESSORY_SWAPS.md](ACCESSORY_SWAPS.md) for researched groups, exclusions and default replacement targets.
