import { useEffect, useState } from "react";
import { download, makeBackup, parseBackup } from "../backup";
import type { State } from "../model";
import type { Change } from "./Program";
import { recoveryState } from "../storage";
import Help from "./Help";
import { defaultPrimary, defaultSecondary } from "../appearance";
import { applyDefaultRest } from "../engine";
export default function Settings({
  data,
  change,
  restore,
  reset,
  busy,
}: {
  data: State;
  change: Change;
  restore: (s: State) => Promise<void>;
  reset: () => Promise<boolean>;
  busy: boolean;
}) {
  const [pending, setPending] = useState<Awaited<
      ReturnType<typeof parseBackup>
    > | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [storage, setStorage] = useState("Checking…"),
    [backupFile, setBackupFile] = useState<File | null>(null),
    [section, setSection] = useState<"preferences" | "help">("preferences"),
    [confirmReset, setConfirmReset] = useState(false),
    [resetText, setResetText] = useState(""),
    [resetNotice, setResetNotice] = useState("");
  async function storageStatus() {
    try {
      const persistent = await navigator.storage?.persisted?.();
      const estimate = await navigator.storage?.estimate?.();
      setStorage(
        `${persistent ? "Persistent storage granted" : "Browser-managed storage"}${estimate?.usage ? ` · ${(estimate.usage / 1024 / 1024).toFixed(1)} MB used` : ""}`,
      );
    } catch {
      setStorage("Storage estimate is unavailable.");
    }
  }
  useEffect(() => {
    void storageStatus();
  }, []);
  async function exportBackup() {
    try {
      const now = new Date().toISOString();
      const state = {
        ...data,
        lastBackup: now,
        workoutsSinceBackup: 0,
        reminderDismissedAt: null,
      };
      const text = await makeBackup(state, now);
      const name = `strength-tracker-backup-${now.slice(0, 10)}.json`;
      setBackupFile(new File([text], name, { type: "application/json" }));
      download(text, name);
      await change((s) => {
        s.lastBackup = now;
        s.workoutsSinceBackup = 0;
        s.reminderDismissedAt = null;
      });
      setNotice(
        "Backup generated. Use Download or Share to save it to Files / iCloud Drive. Confirm the saved file in Files yourself.",
      );
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <>
      <div
        className="row settings-tabs"
        role="tablist"
        aria-label="Settings sections"
        onKeyDown={(e) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
            return;
          e.preventDefault();
          const next =
            e.key === "Home"
              ? "preferences"
              : e.key === "End"
                ? "help"
                : section === "help"
                  ? "preferences"
                  : "help";
          setSection(next);
          document.getElementById(`settings-${next}-tab`)?.focus();
        }}
      >
        {(["preferences", "help"] as const).map((tab) => (
          <button
            key={tab}
            id={`settings-${tab}-tab`}
            role="tab"
            aria-selected={section === tab}
            aria-controls={`settings-${tab}-panel`}
            tabIndex={section === tab ? 0 : -1}
            onClick={() => setSection(tab)}
          >
            {tab === "help" ? "Help" : "Preferences"}
          </button>
        ))}
      </div>
      <div
        id="settings-help-panel"
        role="tabpanel"
        aria-labelledby="settings-help-tab"
        hidden={section !== "help"}
      >
        <Help />
      </div>
      <div
        id="settings-preferences-panel"
        role="tabpanel"
        aria-labelledby="settings-preferences-tab"
        hidden={section !== "preferences"}
      >
        <article>
          <h2>Training preferences</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              change((s) => {
                s.settings = {
                  ...s.settings,
                  barWeight: Number(f.get("bar")),
                  plateIncrement: Number(f.get("plate")),
                  audio: f.get("audio") === "on",
                  vibration: f.get("vibration") === "on",
                  theme: f.get("theme") as "dark" | "system",
                };
                applyDefaultRest(s, Number(f.get("rest")));
              });
            }}
          >
            <div className="fields">
              <label>
                Bar weight ({data.settings.units})
                <input
                  name="bar"
                  type="number"
                  min="0"
                  max="2000"
                  step="any"
                  defaultValue={data.settings.barWeight}
                  required
                />
              </label>
              <label>
                Achievable total-load increment
                <input
                  name="plate"
                  type="number"
                  min="0.25"
                  max="100"
                  step="any"
                  defaultValue={data.settings.plateIncrement}
                  required
                />
              </label>
              <label>
                Default rest seconds
                <input
                  name="rest"
                  type="number"
                  min="0"
                  max="3600"
                  defaultValue={data.settings.defaultRest}
                  required
                />
              </label>
              <label>
                Theme
                <select name="theme" defaultValue={data.settings.theme}>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </label>
            </div>
            <p>
              Saving preferences applies this rest time to every exercise in A
              and B for future workouts. Customize individual rest times
              afterward in Program. Active workouts and history keep their saved
              settings. Barbell weights include the bar; dumbbell weights are
              per dumbbell.
            </p>
            <label>
              <input
                type="checkbox"
                name="audio"
                defaultChecked={data.settings.audio}
              />{" "}
              Foreground timer sound
            </label>
            <label>
              <input
                type="checkbox"
                name="vibration"
                defaultChecked={data.settings.vibration}
              />{" "}
              Vibration where supported
            </label>
            <button disabled={busy}>Save preferences</button>
          </form>
          <label>
            Units
            <select
              value={data.settings.units}
              disabled={busy || !!data.active}
              onChange={(e) => {
                const units = e.target.value as "kg" | "lb";
                if (units !== data.settings.units)
                  change((s) => {
                    const factor =
                      units === "lb" ? 2.2046226218 : 1 / 2.2046226218;
                    const convert = (n: number) =>
                      Number((n * factor).toFixed(6));
                    s.settings.units = units;
                    s.settings.barWeight = convert(s.settings.barWeight);
                    s.settings.plateIncrement = convert(
                      s.settings.plateIncrement,
                    );
                    for (const p of Object.values(s.progression)) {
                      p.weight = convert(p.weight);
                      if (p.failureWeight !== null)
                        p.failureWeight = convert(p.failureWeight);
                      if (p.suggestion !== null)
                        p.suggestion = convert(p.suggestion);
                    }
                    for (const p of Object.values(s.templates).flat())
                      p.rule.increment = convert(p.rule.increment);
                    for (const h of s.history)
                      for (const l of h.lifts) {
                        l.prescribedWeight = convert(l.prescribedWeight);
                        l.prescription.rule.increment = convert(
                          l.prescription.rule.increment,
                        );
                        l.sets.forEach((x) => {
                          x.weight = convert(x.weight);
                        });
                        l.warmups.forEach((x) => {
                          x.weight = convert(x.weight);
                        });
                      }
                  });
              }}
            >
              <option value="kg">Kilograms (kg)</option>
              <option value="lb">Pounds (lb)</option>
            </select>
          </label>
          <p>
            Switching units converts stored loads without changing performance.
            Finish your active session first.
          </p>
        </article>
        <article>
          <h2>Appearance</h2>
          <p>
            Changes preview immediately and save automatically on this device.
            Text contrast adjusts for your colors. Custom background colors
            override the system theme palette.
          </p>
          <div className="fields">
            <label>
              Primary color
              <input
                type="color"
                aria-label="Primary color"
                value={data.settings.primaryColor ?? defaultPrimary}
                disabled={busy}
                onChange={(e) => {
                  const color = e.target.value;
                  void change((s) => {
                    s.settings.primaryColor = color;
                  });
                }}
              />
              <span>Buttons, completed sets, and highlights</span>
            </label>
            <label>
              Secondary color
              <input
                type="color"
                aria-label="Secondary color"
                value={data.settings.secondaryColor ?? defaultSecondary}
                disabled={busy}
                onChange={(e) => {
                  const color = e.target.value;
                  void change((s) => {
                    s.settings.secondaryColor = color;
                  });
                }}
              />
              <span>Backgrounds, cards, and supporting elements</span>
            </label>
          </div>
          <div className="appearance-preview" aria-label="Color preview">
            <strong>Color preview</strong>
            <p>Your training, in your colors.</p>
            <span className="primary preview-chip">Completed set · 5 reps</span>
          </div>
          <button
            disabled={busy}
            onClick={() =>
              void change((s) => {
                delete s.settings.primaryColor;
                delete s.settings.secondaryColor;
              })
            }
          >
            Reset colors to defaults
          </button>
        </article>
        <article>
          <h2>Backup & Restore</h2>
          <p>
            Your data stays on this device. GitHub and Cloudflare do not back up
            your workouts. Keep a complete JSON backup in Files or iCloud Drive.
          </p>
          <p>
            Last generated:{" "}
            <strong>
              {data.lastBackup
                ? new Date(data.lastBackup).toLocaleString()
                : "Never"}
            </strong>
            <br />
            {data.workoutsSinceBackup} workouts since backup
          </p>
          <div className="row">
            <button className="primary" disabled={busy} onClick={exportBackup}>
              Generate JSON backup
            </button>
            {backupFile && (
              <>
                <button
                  onClick={() => {
                    void backupFile
                      .text()
                      .then((text) => download(text, backupFile.name));
                  }}
                >
                  Download again
                </button>
                {navigator.canShare?.({ files: [backupFile] }) && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.share({
                          files: [backupFile],
                          title: "Strength backup",
                        });
                        setNotice(
                          "Share interface completed. Check your chosen destination to confirm the file was saved.",
                        );
                      } catch (e) {
                        if ((e as Error).name !== "AbortError")
                          setError(String(e));
                      }
                    }}
                  >
                    Share to Files
                  </button>
                )}
              </>
            )}
          </div>
          {notice && <p role="status">{notice}</p>}
          <label>
            Choose JSON backup
            <input
              type="file"
              accept=".json,application/json"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  setError("");
                  if (!file.name.toLowerCase().endsWith(".json"))
                    throw new Error("Choose a .json backup file.");
                  if (file.size > 50 * 1024 * 1024)
                    throw new Error("File exceeds 50 MB.");
                  setPending(await parseBackup(await file.text()));
                } catch (e) {
                  setPending(null);
                  setError(String(e));
                }
              }}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          {pending && (
            <div className="restore-preview">
              <h3>Backup preview</h3>
              <p>
                Generated {new Date(pending.exportedAt).toLocaleString()}
                <br />
                {pending.state.history.length} workouts ·{" "}
                {pending.state.exercises.length} exercises ·{" "}
                {pending.state.active
                  ? "unfinished session included"
                  : "no unfinished session"}
              </p>
              <p>
                Restore replaces all current training data. Export your current
                database first. A local pre-restore recovery snapshot is
                retained in the same atomic transaction.
              </p>
              <div className="row">
                <button onClick={() => setPending(null)}>Cancel</button>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      await restore(pending.state);
                      setPending(null);
                    } catch (e) {
                      setError(String(e));
                    }
                  }}
                >
                  Replace with this backup
                </button>
              </div>
            </div>
          )}
        </article>
        <article>
          <h2>Storage & recovery</h2>
          <button
            aria-describedby="recovery-description"
            disabled={busy}
            onClick={async () => {
              try {
                const state = await recoveryState();
                if (!state) {
                  setNotice("No pre-restore snapshot exists yet.");
                  return;
                }
                setPending({
                  state,
                  exportedAt: state.lastBackup ?? state.createdAt,
                  version: 2,
                });
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            Preview pre-restore recovery snapshot
          </button>
          <p id="recovery-description">
            Preview the local copy saved before your most recent backup restore.
            Nothing is replaced until you confirm. Available only after a
            restore.
          </p>
          <p>{storage}</p>
          <button
            aria-describedby="persistent-storage-description"
            onClick={async () => {
              try {
                const granted = await navigator.storage?.persist?.();
                setNotice(
                  granted
                    ? "Persistent storage granted. Continue keeping external backups."
                    : "This browser manages storage automatically. Keep external backups.",
                );
                await storageStatus();
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            Request persistent storage
          </button>
          <p id="persistent-storage-description">
            Ask the browser to protect local data from automatic removal when
            space is low. Approval is browser-dependent; this does not create a
            backup or protect against clearing website data.
          </p>
          <p>
            Use the same production URL every time. Browser data can be lost if
            website data is cleared or the device removes it. Restore a JSON
            backup above if your history disappears.
          </p>
        </article>
        <article>
          <h2>Reset progress</h2>
          {resetNotice && <p role="status">{resetNotice}</p>}
          <p>
            Clear progress stored in this browser or PWA on this device. Your
            exercise catalog, workout templates, current working weights, and
            preferences stay in place.
          </p>
          {!confirmReset ? (
            <button
              disabled={busy}
              onClick={() => {
                setResetText("");
                setResetNotice("");
                setConfirmReset(true);
              }}
            >
              Reset all progress
            </button>
          ) : (
            <form
              className="restore-preview"
              aria-label="Confirm progress reset"
              onSubmit={async (e) => {
                e.preventDefault();
                if (busy || resetText !== "RESET") return;
                if (await reset()) {
                  setConfirmReset(false);
                  setResetText("");
                  setPending(null);
                  setBackupFile(null);
                  setError("");
                  setNotice("");
                  setResetNotice(
                    "Progress reset. Your workout setup and preferences were kept. The next workout is A.",
                  );
                }
              }}
            >
              <h3>Confirm progress reset</h3>
              <p>
                This deletes workout history and its charts/records, the
                unfinished workout, rest timer, progression counters and
                suggestions, and the local recovery snapshot. The next workout
                returns to A. Download a JSON backup first if you want to
                restore your progress later.
              </p>
              <button type="button" disabled={busy} onClick={exportBackup}>
                Download backup before reset
              </button>
              <label>
                Type RESET to confirm
                <input
                  value={resetText}
                  onChange={(e) => setResetText(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={busy}
                  required
                />
              </label>
              <div className="row">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setConfirmReset(false);
                    setResetText("");
                  }}
                >
                  Cancel reset
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={busy || resetText !== "RESET"}
                >
                  Delete progress permanently
                </button>
              </div>
            </form>
          )}
        </article>
      </div>
    </>
  );
}
