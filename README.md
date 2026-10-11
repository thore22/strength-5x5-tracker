# Strength

Personal offline-first 5×5 tracker. Requirements: [APP_SPEC.md](APP_SPEC.md).

## Development
Node 22 or newer. `npm install`, `npm run dev`, `npm test`, `npm run build`.
All training state is local to the current browser and origin in IndexedDB. GitHub and Cloudflare do **not** back up workout data.

## Deployment
Cloudflare Pages must use native Git integration with this private repository, production branch `main`, build `npm run build`, output `dist`. Use the production URL consistently; preview URLs have separate local training data.

## Data safety
History and unfinished workouts are stored with exercise snapshots. Template edits never rewrite history. Storage failures stop writes and display an error. Keep JSON backups in Files/iCloud Drive.
