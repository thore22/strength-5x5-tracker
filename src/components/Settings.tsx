import { useEffect, useState } from "react";
import { download, makeBackup, parseBackup } from "../backup";
import type { State } from "../model";
import type { Change } from "./Program";
import { recoveryState } from "../storage";
import Help from "./Help";
export default function Settings({
  data,
  change,
  restore,
  busy,
}: {
  data: State;
  change: Change;
  restore: (s: State) => Promise<void>;
  busy: boolean;
}) {
  const [pending, setPending] = useState<Awaited<
      ReturnType<typeof parseBackup>
    > | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [storage, setStorage] = useState("Checking…"),
    [backupFile, setBackupFile] = useState<File | null>(null),
    [section, setSection] = useState<"preferences" | "help">("preferences");
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
                  defaultRest: Number(f.get("rest")),
                  audio: f.get("audio") === "on",
                  vibration: f.get("vibration") === "on",
                  theme: f.get("theme") as "dark" | "system",
                };
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
              Existing exercises keep their individual rest settings in Program.
              Barbell weights include the bar; dumbbell weights are per
              dumbbell.
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
          <p>{storage}</p>
          <button
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
          <p>
            Use the same production URL every time. Browser data can be lost if
            website data is cleared or the device removes it. Restore a JSON
            backup above if your history disappears.
          </p>
        </article>
      </div>
    </>
  );
}
