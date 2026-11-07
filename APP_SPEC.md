# Strength Tracker — Application Specification

**Version:** 1.0  
**Status:** Approved requirements for initial implementation  
**Purpose:** Personal, iPhone-first, offline-capable strength-training PWA inspired by StrongLifts 5×5.

## 1. Technology and architecture

- React, TypeScript, Vite and Tailwind CSS.
- Progressive Web App, optimized for iPhone Safari and Home Screen installation.
- IndexedDB for all training data, optionally via Dexie.
- Service worker for offline app loading and operation.
- Static deployment to Cloudflare Pages from a private GitHub repository.
- No backend, account, login, analytics, advertisements, subscription or cloud database.
- All training data remains on the user's device unless explicitly exported.
- Stable production URL; database migrations must preserve previous records.
- Dark, minimalist interface, large touch targets, responsive iPhone layout, accessible controls and safe-area support.

## 2. Workout templates

Use the classic alternating A/B structure, three sessions per week, with no mandatory calendar schedule.

**Workout A**

- Barbell Back Squat: 5×5
- Barbell Bench Press: 5×5
- Bent-Over Barbell Row: 5×5
- Dips: 3×6–10
- Barbell Curl: 3×8–12
- Hanging Leg Raise: 3×8–15

**Workout B**

- Barbell Back Squat: 5×5
- Standing Barbell Overhead Press: 5×5
- Conventional Barbell Deadlift: 1×5
- Pull-ups: 3×5–10
- Romanian Deadlift: 2×8–10
- Dumbbell Lateral Raise: 3×10–15

The three core lifts in each template must be visually distinguished from accessories.

Workout A/B alternation advances after a completed workout, not an abandoned or deleted workout. Allow manual selection of A or B and preserve history when templates change.

## 3. Exercise library and customization

- Users can add, remove, replace and reorder exercises.
- Main lifts can be replaced with defined variants, such as front squat, incline bench, dumbbell bench, dumbbell overhead press, trap-bar deadlift, or other row variations.
- Include a small initial accessory catalog: dips, pull-ups, chin-ups, barbell curls, dumbbell curls, hammer curls, Romanian deadlifts, lateral raises, face pulls, triceps extensions, skull crushers, hanging leg/knee raises, planks, ab wheel, back extensions and calf raises.
- Support custom exercises.
- Allow editing target sets, repetitions or repetition ranges, rest times, weights, equipment, and progression rules.
- Support barbell, dumbbell, machine, weighted bodyweight, assisted bodyweight, unweighted bodyweight and timed exercises.
- Use stable exercise identifiers. Different exercise variants have independent progression histories unless explicitly configured otherwise.
- Accessories have an optional information panel with a short text description and buttons for Google search, Google Images and YouTube exercise searches. Do not embed or host videos.

## 4. Starting weights and progression

- Users enter their starting working weight for every applicable exercise.
- All barbell working weights include the bar.
- Default units: kg. Default bar weight: 20 kg, editable.
- Default weight increment: +2.5 kg per successful occurrence of the exercise.
- Deadlift increment configurable, including +5 kg.
- Each exercise independently supports progression every 1, 2 or 3 successful attempts, or manual progression.
- Main exercise success means all prescribed working sets and repetitions were completed.
- An unsuccessful attempt repeats the same working weight at the next occurrence.
- After three consecutive genuine failed attempts at the same prescribed working weight, reduce the next target by approximately 10%, rounded to an achievable increment.
- A completed successful attempt resets that exercise's consecutive failure count. A deload also resets the failure count.
- Skipped exercises and interrupted workouts must not count as failed attempts.
- A progression frequency of multiple successful sessions uses a separate success counter, reset on failure or deload.
- Squat progression is shared between workouts A and B.
- All other exercise progression is based on exercise identity, not simply workout type.
- Provide editable starting weights, manual overrides and optional reset of progression state.
- Exercise history must remain intact after changing or deleting a template.
- Never retroactively alter completed workout records when progression settings change.

## 5. Accessories and double progression

- Default accessory progression uses a configurable repetition range.
- When all prescribed sets reach the upper end of that range, suggest a configurable weight increase for the next session.
- Keep accessory increases suggestions rather than mandatory automatic changes.
- Record bodyweight repetitions separately from added external weight or assistance.
- Allow zero added weight and different equipment types.
- Users can turn off accessory progression and adjust weight manually.

## 6. Warm-up calculator

- Automatically generate warm-up sets for compound barbell exercises based on working weight.
- Use the empty bar and progressively heavier warm-up sets where feasible.
- A configurable starting algorithm may use approximately 40%, 60% and 80% of working weight, with decreasing repetitions, after initial light sets.
- Respect minimum load, bar weight and available plate increments; omit redundant or invalid warm-up sets.
- At very low working weights, use fewer warm-up sets.
- Display warm-ups separately from working sets.
- Do not count warm-up sets toward workout completion or weight progression.
- Allow modifying or skipping individual warm-up sets.
- Do not require warm-up sets for accessories.

## 7. Active workout logger

- Main screen displays the next Workout A or B.
- Display target weights, target repetitions, warm-ups, working sets, and accessories.
- Start, pause, resume, finish or discard a session.
- Each set has a large tappable completion control.
- One tap logs the prescribed repetitions; users can edit actual repetitions and weight per set.
- Visually distinguish pending, completed and failed sets.
- Show previous performance for the exercise directly in the logging interface.
- Automatically start the rest timer after logging a set.
- Allow configurable rest periods, timer adjustments, and foreground audio/vibration notifications where supported.
- Rest timer must use real elapsed timestamps so it remains accurate if iOS suspends the app.
- Save changes immediately to IndexedDB; survive refresh, app closure and reopening.
- On reopening, restore an unfinished session.
- On completion, show a summary and the next planned exercise targets.
- Prevent duplicate session completion.

### 7.1 In-workout accessory swaps

- Each active accessory card has a **Swap** button opening an accessible bottom sheet.
- Offer only curated, built-in alternatives matching the original accessory’s movement role; exclude exercises already in the active workout. Core lifts and unclassified custom exercises cannot be swapped.
- Swap only before any working sets or warm-ups have been logged for that accessory, while the session is running. Never remove logged performance.
- Choices are anchored to the original accessory snapshot from the started A/B workout, even if templates subsequently change. Preserve that original exercise/configuration/load snapshot when swapping; returning to the original restores its prescription.
- Swaps affect this session only, never A/B templates. Show the original exercise in the active card and history.
- Preview the replacement’s own sets/reps (seconds for timed exercises), equipment, previous performance, rest and progression. Use curated replacement defaults; preserve the slot’s rest period. Require explicit starting-load entry for a loaded alternative with no history. Never convert weights between exercises.
- Save the replacement’s confirmed load as its own future target, as with normal working-weight edits. Only performed exercises affect progression; replaced exercises never receive a failure.
- Preserve swaps through restart, app updates, atomic restore and complete JSON backups. Migrate stored schema v1/v2 to v3 without dropping data; continue accepting supported v1/v2 backups. Older app versions reject the new schema instead of silently discarding swap metadata.
- Curated groups and research rationale are maintained in `ACCESSORY_SWAPS.md`.

## 8. History and progress

- Chronological completed-workout history.
- Detailed record of every exercise, set, repetition count, working weight and date.
- Exercise-specific weight progression charts, with time on the horizontal axis.
- Track successful sessions, failed attempts, deloads and personal records.
- Display next workout and recent workout summary.
- Allow editing a completed workout, with explicit control over whether future progression is recalculated.
- Preserve original historical performance records after template or exercise changes.
- Optional CSV export of history for analysis.

## 9. Offline storage and backups — critical requirements

The application must remain functional without internet access after successful installation and caching.

All training records, exercise definitions, configurations, progression counters, historical workouts and unfinished sessions must be stored in IndexedDB.

Provide a dedicated **Backup & Restore** section:

**Export**

- Generate a complete, downloadable, human-readable JSON backup.
- Use a versioned backup schema, export timestamp and descriptive filename, e.g. `strength-tracker-backup-2026-10-11.json`.
- Include all required information for reconstructing the exact training state.
- On iPhone, support file sharing/saving through the native share interface if available, and provide a download fallback.
- Support saving to iCloud Drive through the iOS Files interface.
- Never require account registration.
- Show the time a backup was last generated. Do not falsely claim it was saved to iCloud without confirmation.

**Import**

- Choose a JSON backup using the native iOS file picker.
- Validate file type, schema version, required fields and internal references.
- Preview the backup timestamp, number of workouts and exercise data before restoring.
- Warn before replacing data.
- Recommend exporting the current database before replacement.
- Restore atomically wherever feasible, so failed imports do not destroy existing records.
- Preserve progress, counters, routines, settings and unfinished sessions.
- Support future schema migrations.
- Reject invalid backups with understandable errors.
- Do not silently merge, duplicate, delete or overwrite records.

**Reminders**

- Remind after three completed workouts or seven days since the last generated backup, whichever occurs first.
- Allow dismissing the reminder, but keep backup status visible in Settings.
- Reminders must work without a server or push notifications.

**Storage protection**

- Request persistent storage through browser APIs where supported.
- Handle storage errors gracefully.
- Do not erase IndexedDB during deployment updates, cache cleanups or service-worker upgrades.
- Show a helpful recovery screen if local data disappears.
- Clearly explain that GitHub and Cloudflare do not back up user workout records.

## 10. Application screens

**Workout:** Next session, warm-ups, sets, weights, rest timer and workout completion.

**Program:** Workout A/B editor, exercise variations, accessory library and progression settings.

**Progress:** Workout history, exercise charts, records and previous performances.

**Settings:** Units, bar weight, plate increments, timers, theme, storage status, backup export/import and recovery tools.

Use bottom navigation on iPhone.

## 11. Quality and testing

Use a separate, testable progression calculation module with automated unit tests.

Required tests:

- Successful 5×5 increases the next weight correctly.
- Missing repetitions keeps the same weight.
- Three consecutive failures trigger the configured deload.
- A successful attempt resets the failure count.
- Squats share progression across A and B.
- Deadlift uses 1×5 and has its own increment.
- Skipped exercises and abandoned sessions do not create false failures.
- Custom frequency settings work correctly.
- Accessories correctly implement double progression.
- Warm-ups respect bar and plate restrictions.
- Editing templates never destroys previous history.
- An unfinished workout survives app restart.
- Export/import restores every record and setting.
- Invalid imports leave existing data untouched.
- Older supported backups can migrate safely.
- Existing data survives a new application deployment.
- Offline mode supports logging and history.
- iPhone Home Screen installation, export and import are manually tested.

## 12. Out of scope for Version 1

No Apple Watch application, cloud synchronization, accounts, nutrition tracking, exercise videos, social features or AI API integrations.

Do not reproduce proprietary StrongLifts app assets, branding or copyrighted interface designs.

## 13. Development delivery

Use a private GitHub repository. Develop features in separate branches and create pull requests into `main`.

Production deployment must use Cloudflare Pages.

All major changes must pass automated tests and build successfully before merging.

Prioritize workout data integrity over visual polish. Never introduce a database migration or new feature that can silently erase historical workouts.
