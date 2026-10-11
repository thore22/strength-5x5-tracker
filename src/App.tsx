import { useEffect, useRef, useState } from "react";
import { loadState, saveState } from "./storage";
import type { State } from "./model";
import Program from "./components/Program";
import Workout from "./components/Workout";
import Settings from "./components/Settings";
import Progress from "./components/Progress";
import Recovery from "./components/Recovery";
import { backupDue } from "./backup";
import { activateUpdate, updateAvailable } from "./pwa";
export default function App() {
  const [data, setData] = useState<State | null>(null),
    [page, setPage] = useState("Workout"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [fresh, setFresh] = useState(false),
    [missing, setMissing] = useState(false),
    [updateReady, setUpdateReady] = useState(updateAvailable);
  const current = useRef<{ state: State; revision: number } | null>(null),
    queue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    void navigator.storage?.persist?.().catch(() => {});
    loadState()
      .then((x) => {
        current.current = x;
        setData(x.state);
        setFresh(x.fresh);
        try {
          setMissing(
            x.fresh && localStorage.getItem("strength-has-data") === "yes",
          );
        } catch {}
      })
      .catch((e) => setError(String(e)));
  }, []);
  async function change(fn: (s: State) => void) {
    if (!current.current) return false;
    setBusy(true);
    let saved = false;
    const work = queue.current.then(async () => {
      try {
        const s = structuredClone(current.current!.state);
        fn(s);
        const revision = await saveState(s, current.current!.revision);
        current.current = { state: s, revision };
        setData(s);
        setError("");
        setFresh(false);
        try {
          localStorage.setItem("strength-has-data", "yes");
        } catch {}
        saved = true;
      } catch (e) {
        setError(String(e));
      }
    });
    queue.current = work;
    await work;
    if (queue.current === work) setBusy(false);
    return saved;
  }
  async function restore(s: State) {
    if (!current.current) throw new Error("Storage is not ready.");
    setBusy(true);
    await queue.current;
    try {
      const revision = await saveState(
        s,
        current.current.revision,
        undefined,
        true,
      );
      current.current = { state: s, revision };
      setData(s);
      setError("");
      setFresh(false);
      setMissing(false);
    } catch (e) {
      setError(String(e));
      throw e;
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const update = () => setUpdateReady(true);
    window.addEventListener("strength-update", update);
    return () => window.removeEventListener("strength-update", update);
  }, []);
  return (
    <div className="shell" data-theme={data?.settings.theme ?? "dark"}>
      <header>
        <span className="brand">
          5x5 <b>gromritt</b>
        </span>
        <small>YOUR TRAINING. YOUR PACE.</small>
      </header>
      {error && <p role="alert">{error}</p>}
      {!data ? (
        error ? (
          <Recovery />
        ) : (
          <p>Opening your training log…</p>
        )
      ) : (
        <main>
          {fresh && (
            <article>
              <h2>
                {missing
                  ? "Your local history is missing"
                  : "Welcome to your training log"}
              </h2>
              <p>
                {missing
                  ? "No saved database was found at this origin. Restore a JSON backup before continuing."
                  : "Set your working weights in Program before starting. Restore a backup in Settings if you have trained here before."}
              </p>
              <button onClick={() => setPage("Settings")}>
                Backup &amp; recovery
              </button>
            </article>
          )}
          {backupDue(data) && (
            <article>
              <h2>Time for a backup</h2>
              <p>Keep your progress safe in Files / iCloud Drive.</p>
              <div className="row">
                <button onClick={() => setPage("Settings")}>Back up now</button>
                <button
                  onClick={() =>
                    change((s) => {
                      s.reminderDismissedAt = new Date().toISOString();
                    })
                  }
                >
                  Remind me tomorrow
                </button>
              </div>
            </article>
          )}
          {updateReady && (
            <article>
              <h2>Update ready</h2>
              <p>Your workout is saved. Apply after finishing your session.</p>
              <button
                disabled={busy || !!data.active}
                onClick={() => activateUpdate()}
              >
                Apply update
              </button>
            </article>
          )}
          <p className="eyebrow">
            {page === "Workout" ? "READY WHEN YOU ARE" : page.toUpperCase()}
          </p>
          <h1>
            {page === "Workout"
              ? `Workout ${data.active?.template ?? data.next}`
              : page}
          </h1>
          {page === "Workout" && (
            <Workout data={data} change={change} busy={busy} />
          )}
          {page === "Program" && (
            <Program data={data} change={change} busy={busy} />
          )}
          {page === "Progress" && (
            <Progress data={data} change={change} busy={busy} />
          )}
          {page === "Settings" && (
            <Settings
              key={data.settings.units}
              data={data}
              change={change}
              restore={restore}
              busy={busy}
            />
          )}
        </main>
      )}
      <nav aria-label="Main navigation">
        {["Workout", "Program", "Progress", "Settings"].map((p) => (
          <button
            aria-current={page === p ? "page" : undefined}
            key={p}
            onClick={() => setPage(p)}
          >
            {p}
          </button>
        ))}
      </nav>
    </div>
  );
}
