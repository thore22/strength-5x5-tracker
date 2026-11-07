export default function Help() {
  return (
    <div className="help-guide">
      <article>
        <h2>Getting started</h2>
        <h3>Install on your iPhone</h3>
        <p>
          Open the app’s{" "}
          <a href="https://strength-5x5-tracker.pages.dev/">production URL</a>{" "}
          in Safari. Tap <strong>Share → Add to Home Screen → Add</strong>. Open
          the installed app online once so it can cache the files needed for
          offline use.
        </p>
        <h3>Set up your program and working weights</h3>
        <p>Before starting your first workout:</p>
        <ol>
          <li>
            Open <strong>Settings</strong> and configure your units, bar weight,
            achievable total-load increment, and timer preferences.
          </li>
          <li>
            Open <strong>Program</strong> and select <strong>Workout A</strong>{" "}
            or <strong>Workout B</strong>.
          </li>
          <li>
            Tap <strong>Edit</strong> on each exercise. Enter your{" "}
            <strong>Next working weight</strong>, check the target sets/reps and
            rest period, then choose your progression settings.
          </li>
          <li>
            Tap <strong>Save prescription</strong>. Repeat for the remaining
            exercises in both workouts.
          </li>
        </ol>
        <p>
          Barbell working weights include the bar. Dumbbell weights are recorded{" "}
          <strong>per dumbbell</strong>. For weighted bodyweight exercises,
          enter only the added load; for assisted exercises, enter the
          assistance.
        </p>
        <p>
          Squats share their working weight and progression across A/B.
          Different exercise variants keep independent progression.
        </p>
      </article>
      <article>
        <h2>The four bottom tabs</h2>
        <h3>Workout — train and log sets</h3>
        <p>
          This screen shows your next session and its target loads. Choose A/B
          if you want to override the suggested session, then tap{" "}
          <strong>Start Workout A/B</strong>.
        </p>
        <ul>
          <li>
            Tap the displayed working weight before or during a workout, enter a
            new load, and select <strong>Save weight</strong>. It updates all
            work sets, including logged sets, and the future target. Warm-up
            suggestions recalculate; completed, skipped, or edited warm-ups are
            kept. Completed workout history is unchanged.
          </li>
          <li>
            Tap a working-set box to log the target reps. Further taps reduce
            the count by one, down to zero. Tap again after zero to return to
            the target reps without restarting rest.
          </li>
          <li>
            Open <strong>Edit reps / load per set</strong> to enter other rep
            counts or loads.
          </li>
          <li>
            Tap <strong>Warm-up sets</strong> on core barbell exercises to view
            warm-ups. When no lighter sets can be generated, the panel explains
            why. Each box shows the weight and target reps; tap to complete or
            undo completion. Expand{" "}
            <strong>Edit reps / load per warm-up set</strong>
            to change its prescription or skip it. Warm-up taps do not reduce
            reps or affect progression.
          </li>
          <li>
            Logging a set starts rest. Use <strong>+15s</strong>,{" "}
            <strong>−15s</strong>, or <strong>Stop</strong>; reducing reps
            through the set box does not restart it.
          </li>
          <li>
            Use <strong>Pause</strong>, <strong>Resume</strong>, or{" "}
            <strong>Skip exercise</strong> as needed. Your unfinished session
            saves automatically.
          </li>
          <li>
            Equipment occupied? Tap <strong>Swap</strong> on an accessory before
            logging any of its sets. Choose a similar exercise, confirm its
            targets and its own load, then tap{" "}
            <strong>Use for this workout</strong>. Only today’s session changes;
            A/B templates stay the same. Swaps, including the original plan,
            survive reopening and backups. Only the performed exercise affects
            progression. Some accessories have no close match in the catalog;
            skip them if needed.
          </li>
          <li>
            Tap <strong>Finish workout → Complete &amp; save</strong> to record
            the session and advance A/B. Discarding does not advance the
            program.
          </li>
        </ul>
        <p>
          Only fully logged, unskipped exercises at their prescribed load affect
          progression. Missing reps repeat the load; repeated failures can
          trigger a deload. Accessory increases remain suggestions.
        </p>
        <h3>Program — customize future sessions</h3>
        <p>
          Add, remove, replace, or reorder exercises. Use <strong>Edit</strong>{" "}
          to change working weights, sets/reps, rest, increments, progression
          frequency, and deload rules.
        </p>
        <p>
          Accept accessory weight suggestions here when you’re ready. Program
          changes preserve completed history and the prescriptions captured in
          an active session.
        </p>
        <h3>Progress — review your training</h3>
        <p>
          Browse completed workouts and their individual sets. Select an
          exercise to view its dated chart and records, or export history as
          CSV.
        </p>
        <p>
          When editing a completed workout, future targets stay unchanged unless
          you explicitly select <strong>Recalculate future progression</strong>.
        </p>
        <h3>Settings — preferences, backups, and help</h3>
        <p>
          Configure units, equipment defaults, timer notifications, theme, and
          storage protection. Saving preferences applies the default rest time
          to A/B exercises for future workouts. You can then set individual
          exercise rest periods in <strong>Program</strong>.
        </p>
        <p>
          In <strong>Backup &amp; Restore</strong>, generate a complete JSON
          backup and save it through Share or Download to Files/iCloud Drive. To
          restore, choose the JSON file, inspect its preview, and confirm
          replacement. Export your current data first.
        </p>
      </article>
      <aside className="data-information" aria-labelledby="help-data-title">
        <small>YOUR DATA</small>
        <h2 id="help-data-title">Stored locally on this device</h2>
        <p>
          Workout history, settings, progression, and unfinished sessions live
          in this browser/PWA’s IndexedDB storage. The app has no account,
          backend, analytics, or automatic cloud sync. GitHub and Cloudflare
          host the application files; they do not receive or back up your
          workout records.
        </p>
        <p>
          Data leaves the app when you explicitly export or share a backup.
          Clearing website data or browser storage eviction can remove it, so
          keep external JSON backups. Always train on the same production
          URL—other URLs, browsers, and devices have separate storage.
        </p>
      </aside>
    </div>
  );
}
