# Strength

Strength is a free, offline-capable strength-training tracker built around alternating 5×5 workouts. Plan your training, log sets, and follow your progress in a mobile-friendly web app designed for iPhone use.

No account, subscription, advertisements, or analytics are required. Your training data stays in your browser on your device, with complete backups you can export and restore yourself.

**[Open Strength](https://strength-5x5-tracker.pages.dev/)**

## Features

- **Alternating workouts:** Built-in Workout A and Workout B templates with core barbell lifts and accessories. The next workout advances when you complete a session, and you can select A or B manually.
- **Flexible programs:** Add, replace, remove, and reorder exercises; create custom exercises; and configure sets, rep ranges, rest periods, and starting weights. Supports barbells, dumbbells, machines, bodyweight, assisted exercises, and timed holds.
- **Set-by-set logging:** Tap to record sets, correct reps, edit individual loads, add session notes, and see previous performance. Pause and resume an unfinished workout, including after reopening the app.
- **Progression guidance:** Configurable weight increases, progression frequency, deload rules, and manual control. Accessories suggest a weight increase when every set reaches the top of its rep range.
- **Warm-ups and rest timers:** Suggested warm-ups for core barbell exercises, separate completion controls, editable warm-up prescriptions, and an adjustable rest timer.
- **Accessory alternatives:** Swap an unstarted accessory for a curated alternative during a workout. Changes apply only to that session. Exercise information includes offline descriptions and links to technique searches.
- **History and progress:** Review completed workouts, exercise charts, and personal records. Edit historical sets with explicit control over recalculating future targets, or export history as CSV.
- **Offline use and backups:** Train offline after the app has cached successfully. Export complete JSON backups, preview a backup before restoring, and access a local pre-restore recovery snapshot.
- **Personal preferences:** Choose kg or lb, equipment defaults, timer sound/vibration, theme, and primary and secondary interface colors.

## Getting started

### Open or install the app

Open the [production app](https://strength-5x5-tracker.pages.dev/) in your browser. On iPhone, open it in Safari and choose **Share → Add to Home Screen → Add** for quick access.

Open the installed app online once to let it cache the files needed for offline use. Continue using the same app URL, browser, and installation for your training; other browsers, devices, and preview URLs have separate storage.

### Set up your training

1. In **Settings**, choose your units, bar weight, achievable total-load increment, and timer preferences.
2. In **Program**, select Workout A or Workout B. Tap **Edit** for each exercise, enter your **Next working weight**, and review sets, reps, rest, and progression settings.
3. Choose **Save prescription** and repeat for both workouts. Add or replace exercises to suit your equipment and program.

Barbell loads include the bar. Dumbbell loads are recorded **per dumbbell**. For weighted bodyweight exercises, enter only the added load; for assisted exercises, enter the assistance. Timed exercises use seconds in place of reps.

The core lifts follow this structure; **5×5** means five sets of five repetitions:

| Workout A | Workout B |
| --- | --- |
| Barbell Back Squat — 5×5 | Barbell Back Squat — 5×5 |
| Barbell Bench Press — 5×5 | Standing Barbell Overhead Press — 5×5 |
| Bent-Over Barbell Row — 5×5 | Conventional Barbell Deadlift — 1×5 |

Both templates also include accessories that you can customize in **Program**. The intended rhythm is three sessions per week, alternating A and B, without a mandatory calendar schedule.

### Log a workout

1. Open **Workout**, review the suggested session, and tap **Start Workout A/B**.
2. Expand **Warm-up sets** where available. Tap a warm-up box to mark it complete, or expand its editing controls to change or skip it. Warm-ups do not affect progression.
3. Tap a working-set box to log its target reps and start the rest timer. Further taps reduce the rep count by one; after zero, the next tap returns to the target. These corrections do not restart rest. Use **Edit reps / load per set** for other values.
4. Adjust rest with **+15s**, **−15s**, or **Stop**. Use **Pause**, **Resume**, or **Skip exercise** as needed. Changes save automatically on this device.
5. When finished, choose **Finish workout → Complete & save** to record the session and see your next targets.

Tap the displayed working weight to change it before or during a workout. During a session, this updates all of that exercise's work sets, including logged sets, and its future target. Suggested warm-ups recalculate while completed, skipped, and manually edited warm-ups are preserved. Use per-set editing when only one set needs a different load.

If equipment is unavailable, tap **Swap** on an accessory before logging any of its working or warm-up sets. Review the alternative's own targets and load, then select **Use for this workout**. The A/B templates stay unchanged. Tap **?** beside an active accessory's name for its description and load guidance; external Google, Images, and YouTube searches require internet.

### Understand progression

By default, successful core lifts increase by 2.5 kg, with a 5 kg increment for deadlifts. A fully logged attempt that misses prescribed reps repeats the load. Three consecutive failed attempts at the same target trigger an approximately 10% deload, rounded to the configured load increment. These rules can be adjusted in **Program**, including progression after every one, two, or three successes, or manual progression.

Squats share progression across A and B. Other exercise variants keep their own progression. Skipped exercises, unfinished exercises, and discarded sessions never count as failures; sets at a different load are saved without changing progression. Accessory increases remain suggestions you can accept in **Program**.

### Review your progress

Open **Progress** to browse completed workouts, inspect individual sets, view an exercise's chart and records, or export CSV history. When editing a completed workout, future targets stay unchanged unless you explicitly select **Recalculate future progression**.

For more guidance inside the app, open **Settings → Help**.

## Your data and backups

Workout history, exercise definitions, programs, progression, preferences, and unfinished sessions are stored locally in **IndexedDB**, your browser's on-device database. There is no automatic cloud synchronization. GitHub and Cloudflare host the app files; they do **not** receive or back up your workout records.

Browser storage can be removed by clearing website data or by the device reclaiming space. A persistent-storage request in **Settings** may help where supported, but external backups remain essential.

### Save a complete backup

1. Open **Settings → Backup & Restore → Generate JSON backup**.
2. Choose **Share** when available, or **Download**, and save the file to Files, iCloud Drive, or another location you control.
3. Confirm that the file exists in your chosen location. The app reports when a backup was generated; this does not confirm that it was saved externally.

The app reminds you after three completed workouts or seven days since the last generated backup, whichever comes first. JSON backups include the complete training state, including unfinished sessions and accessory swaps. CSV exports are for analysis and cannot restore the app.

### Restore or move to another device

1. Export your current data before replacing it.
2. On the destination browser or device, open **Settings → Backup & Restore → Choose JSON backup**.
3. Review the backup preview, then confirm **Replace with this backup**.

Restore replaces the current training state rather than merging it. Only validated backups are accepted, and replacement happens in one atomic transaction. A local recovery snapshot of the previous state is retained; use **Preview pre-restore recovery snapshot** in **Storage & recovery** to inspect it before restoring. This local snapshot is also vulnerable to cleared browser storage.

Current exports use backup version 3. Supported version 1 and 2 backups migrate on import; invalid files and unknown future versions are rejected. Current backups include a SHA-256 check for accidental corruption, which does not establish authenticity. Program edits preserve the exercise and configuration snapshots captured in completed and active sessions.

## Platform notes

- Offline operation requires a successful initial online load and caching.
- Rest timers use real timestamps so remaining time stays accurate after the app is suspended. Sound and vibration depend on browser support and are best effort while the app is in the foreground; there is no background push notification service.
- There is no Apple Watch app or automatic synchronization between devices. Transfer your state with a JSON backup when needed.

## Development

Built with **React, TypeScript, Vite, Tailwind CSS, IndexedDB, and a service worker**. No backend or paid API is required. [APP_SPEC.md](APP_SPEC.md) is the primary requirements document, and [AGENTS.md](AGENTS.md) defines development and data-safety rules. See [ACCESSORY_SWAPS.md](ACCESSORY_SWAPS.md) for the curated accessory groups and their rationale.

### Run locally

Use Node.js 22 or newer and npm. From the repository directory:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Local development has its own training data, separate from production.

### Verify changes

```sh
npm test
npm run build
```

To run automated desktop browser tests:

```sh
npx playwright install chromium
npm run test:e2e
```

The unit and integration suites cover progression, deloads, warm-ups, persistence, migration, backups, restoration, and history edits. Playwright covers mobile-sized Chromium layouts, offline operation, backup flows, reload recovery, and service-worker updates. CI runs both suites and the production build.

These automated desktop browser tests do **not** constitute actual iPhone testing. Home Screen installation, Safari behavior, native Files/iCloud sharing, audio, and storage behavior require verification on a physical iPhone.

### Contribute and deploy

Use dedicated branches and reviewed pull requests into `main`. Run `npm test` and `npm run build` before merging. Progression or deload changes require automated tests, and storage migrations must preserve existing history and unfinished sessions. Verify backup compatibility and successful restoration before production deployment.

Deploy through **Cloudflare Pages' GitHub integration** with production branch `main`, build command `npm run build`, and output directory `dist`. Do not substitute Direct Upload. Keep the production URL stable; preview deployments have separate local data. Service-worker updates must never delete IndexedDB.

## Changelog — latest five updates

The repository has no version tags in its current history. This changelog therefore summarizes the five most recent merged updates, newest first, without assigning release versions or implying a verified deployment date.

| Merge date | Update | Changes |
| --- | --- | --- |
| 2026-11-07 | [Accessory swaps and exercise information (#17)](https://github.com/thore22/strength-5x5-tracker/pull/17) | Added session-only accessory alternatives, exercise-information dialogs, and three accessory catalog entries. Backup version 3 preserves swap details and supports migration from older supported backups. |
| 2026-11-07 | [Navigation and input usability (#16)](https://github.com/thore22/strength-5x5-tracker/pull/16) | Navigation returns to the top of the screen. Input sizing addresses unwanted focus zoom on iPhone. |
| 2026-10-14 | [Warm-up completion controls (#15)](https://github.com/thore22/strength-5x5-tracker/pull/15) | Warm-ups use tappable completion boxes with expandable controls for editing reps and load. |
| 2026-10-14 | [Warm-up recalculation (#14)](https://github.com/thore22/strength-5x5-tracker/pull/14) | Changing an active working weight refreshes suggested warm-ups while preserving completed, skipped, and manually edited sets. |
| 2026-10-14 | [Narrow-screen set layout (#13)](https://github.com/thore22/strength-5x5-tracker/pull/13) | Standard set rows fit narrow screens, with wrapping retained for larger set counts. |
