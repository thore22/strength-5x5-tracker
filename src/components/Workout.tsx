import { useEffect, useRef, useState } from "react";
import {
  discardSession,
  finishSession,
  remainingSeconds,
  startSession,
  tapWorkingSet,
} from "../engine";
import type { State } from "../model";
import type { Change } from "./Program";
import WorkingWeight from "./WorkingWeight";
import WarmupSets from "./WarmupSets";
export default function Workout({
  data,
  change,
  busy,
}: {
  data: State;
  change: Change;
  busy: boolean;
}) {
  const [choice, setChoice] = useState<"A" | "B">(data.next),
    [now, setNow] = useState(Date.now()),
    [summary, setSummary] = useState(false),
    [confirm, setConfirm] = useState<"finish" | "discard" | null>(null),
    [openWarmups, setOpenWarmups] = useState<string[]>([]);
  const notified = useRef<number | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (
      data.timerEnd &&
      now >= data.timerEnd &&
      notified.current !== data.timerEnd
    ) {
      notified.current = data.timerEnd;
      if (data.settings.vibration) navigator.vibrate?.([150, 50, 150]);
      if (data.settings.audio) {
        try {
          const ac = new AudioContext();
          const o = ac.createOscillator(),
            g = ac.createGain();
          g.gain.value = 0.1;
          o.connect(g);
          g.connect(ac.destination);
          o.start();
          o.stop(ac.currentTime + 0.25);
          o.onended = () => {
            void ac.close();
          };
        } catch {
          /* notifications are best effort */
        }
      }
    }
  }, [now, data.timerEnd, data.settings]);
  const a = data.active;
  if (!a)
    return (
      <>
        <p className="lead">Three core lifts. One stronger you.</p>
        <div className="row">
          <span className="badge">NEXT UP · {data.next}</span>
          <span className="muted">
            {data.history.length} workouts in the bank
          </span>
        </div>
        {summary && (
          <article className="summary">
            <h2>Workout complete ✓</h2>
            <p>
              Your next session is {data.next}. Your next targets are shown
              below.
            </p>
            {data.history.at(-1)?.lifts.map((l) => (
              <p key={l.exercise.id}>
                {l.exercise.name}: {l.outcome}
                {l.deload ? " · deload" : ""} →{" "}
                {data.progression[l.exercise.id].weight} {data.settings.units}
                {data.progression[l.exercise.id].suggestion !== null
                  ? ` · suggested ${data.progression[l.exercise.id].suggestion}`
                  : ""}
              </p>
            ))}
          </article>
        )}
        {!summary && data.history.at(-1) && (
          <article>
            <small>LAST SESSION</small>
            <h2>
              Workout {data.history.at(-1)!.template} ·{" "}
              {new Date(data.history.at(-1)!.completedAt!).toLocaleDateString()}
            </h2>
            <p>
              {
                data.history
                  .at(-1)!
                  .lifts.filter((l) => l.outcome === "success").length
              }{" "}
              successful exercises. Your next targets are ready below.
            </p>
          </article>
        )}
        <div className="row">
          {(["A", "B"] as const).map((t) => (
            <button
              aria-pressed={choice === t}
              key={t}
              onClick={() => setChoice(t)}
            >
              Workout {t}
            </button>
          ))}
        </div>
        <button
          className="primary wide"
          disabled={busy}
          onClick={() =>
            change((s) => {
              startSession(s, choice);
              setSummary(false);
            })
          }
        >
          Start Workout {choice} →
        </button>
        {data.templates[choice].map((p, i) => {
          const ex = data.exercises.find((e) => e.id === p.exerciseId)!;
          return (
            <article
              className={p.core ? "lift core" : "lift"}
              key={p.exerciseId}
            >
              <small>
                {String(i + 1).padStart(2, "0")} /{" "}
                {p.core ? "CORE LIFT" : "ACCESSORY"}
              </small>
              <div className="lift-title">
                <h2>{ex.name}</h2>
                <WorkingWeight
                  exercise={ex}
                  weight={data.progression[ex.id].weight}
                  units={data.settings.units}
                  change={change}
                  busy={busy}
                />
              </div>
              <p>
                {p.sets} × {p.minReps}
                {p.maxReps !== p.minReps ? `–${p.maxReps}` : ""}
                {ex.equipment === "timed" ? " seconds" : ""} · {p.rest / 60} min
                rest
              </p>
            </article>
          );
        })}
      </>
    );
  const remaining = remainingSeconds(data.timerEnd, now);
  return (
    <>
      <div className="row">
        <span className="badge">
          {a.paused ? "PAUSED" : "IN PROGRESS"} · WORKOUT {a.template}
        </span>
        <span className="muted">Saved on this device</span>
      </div>
      {data.timerEnd !== null && (
        <aside className="timer" role="status">
          <span>REST</span>
          <strong>
            {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, "0")}
          </strong>
          <div className="row">
            <button
              disabled={busy}
              onClick={() =>
                change((s) => {
                  s.timerEnd =
                    Math.max(Date.now(), s.timerEnd ?? Date.now()) + 15000;
                })
              }
            >
              +15s
            </button>
            <button
              disabled={busy}
              onClick={() =>
                change((s) => {
                  s.timerEnd = Math.max(
                    Date.now(),
                    (s.timerEnd ?? Date.now()) - 15000,
                  );
                })
              }
            >
              −15s
            </button>
            <button
              disabled={busy}
              onClick={() =>
                change((s) => {
                  s.timerEnd = null;
                })
              }
            >
              Stop
            </button>
          </div>
        </aside>
      )}
      <div className="row">
        <button
          disabled={busy}
          onClick={() =>
            change((s) => {
              s.active!.paused = !s.active!.paused;
              if (s.active!.paused) s.timerEnd = null;
            })
          }
        >
          {a.paused ? "Resume" : "Pause"}
        </button>
        <button onClick={() => setConfirm("discard")}>Discard</button>
      </div>
      {a.lifts.map((lift, i) => {
        const prior = [...data.history]
          .reverse()
          .flatMap((h) => h.lifts)
          .find((l) => l.exercise.id === lift.exercise.id);
        return (
          <article
            className={lift.prescription.core ? "lift core" : "lift"}
            key={lift.exercise.id}
          >
            <small>{lift.prescription.core ? "CORE LIFT" : "ACCESSORY"}</small>
            <div className="lift-title">
              <h2>{lift.exercise.name}</h2>
              <WorkingWeight
                exercise={lift.exercise}
                weight={lift.prescribedWeight}
                units={data.settings.units}
                change={change}
                busy={busy}
              />
            </div>
            <p>
              {lift.prescription.sets} × {lift.prescription.minReps}–
              {lift.prescription.maxReps}
              {lift.exercise.equipment === "timed" ? " seconds" : ""}
            </p>
            {prior && (
              <p className="previous">
                Last time · {prior.sets.map((s) => s.reps ?? "—").join(" / ")}{" "}
                at {prior.prescribedWeight} {data.settings.units}
              </p>
            )}
            {(lift.warmups.length > 0 ||
              (lift.prescription.core &&
                lift.exercise.equipment === "barbell")) && (
              <>
                <button
                  className="warmup-toggle"
                  aria-label={`Warm-up sets for ${lift.exercise.name}`}
                  aria-expanded={openWarmups.includes(lift.exercise.id)}
                  aria-controls={`warmups-${lift.exercise.id}`}
                  onClick={() =>
                    setOpenWarmups((open) =>
                      open.includes(lift.exercise.id)
                        ? open.filter((id) => id !== lift.exercise.id)
                        : [...open, lift.exercise.id],
                    )
                  }
                >
                  Warm-up sets{" "}
                  <span aria-hidden="true">
                    {openWarmups.includes(lift.exercise.id) ? "−" : "+"}
                  </span>
                </button>
                <div
                  id={`warmups-${lift.exercise.id}`}
                  hidden={!openWarmups.includes(lift.exercise.id)}
                >
                  <p>
                    Separate from working sets; warm-ups do not affect
                    progression.
                  </p>
                  {lift.warmups.length === 0 && (
                    <p>
                      No lighter warm-up sets can be generated with this working
                      weight, bar weight, and plate increment. You can still
                      warm up before logging your working sets.
                    </p>
                  )}
                  <WarmupSets
                    lift={lift}
                    index={i}
                    units={data.settings.units}
                    paused={a.paused}
                    busy={busy}
                    change={change}
                  />
                </div>
              </>
            )}
            <div className="sets">
              {lift.sets.map((set, j) => (
                <button
                  className={
                    set.reps === null
                      ? "pending"
                      : set.reps >= lift.prescription.minReps
                        ? "done"
                        : "failed"
                  }
                  aria-label={`${lift.exercise.name} set ${j + 1}`}
                  aria-description="First tap logs target reps and starts rest. Further taps reduce reps by one; after zero, the next tap returns to target reps. Corrections do not restart rest."
                  disabled={busy || a.paused || lift.skipped}
                  key={j}
                  onClick={() => change((s) => tapWorkingSet(s, i, j))}
                >
                  <small>SET {j + 1}</small>
                  <strong>{set.reps ?? "○"}</strong>
                </button>
              ))}
            </div>
            <details>
              <summary>
                Edit reps /{" "}
                {lift.exercise.equipment === "timed" ? "seconds" : "load"} per
                set
              </summary>
              {lift.sets.map((set, j) => (
                <form
                  className="row"
                  key={j}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    change((s) => {
                      s.active!.lifts[i].sets[j] = {
                        reps: Number(f.get("reps")),
                        weight: Number(f.get("weight")),
                      };
                      s.timerEnd = Date.now() + lift.prescription.rest * 1000;
                    });
                  }}
                >
                  <span>Set {j + 1}</span>
                  <label>
                    Reps / seconds
                    <input
                      name="reps"
                      type="number"
                      min="0"
                      max="3600"
                      step="1"
                      required
                      defaultValue={set.reps ?? lift.prescription.minReps}
                      key={`reps-${set.reps}`}
                    />
                  </label>
                  <label>
                    {lift.exercise.equipment === "assisted bodyweight"
                      ? "Assistance"
                      : lift.exercise.equipment.includes("bodyweight")
                        ? "Added load"
                        : "Weight"}{" "}
                    ({data.settings.units})
                    <input
                      name="weight"
                      type="number"
                      min="0"
                      max="2000"
                      step="any"
                      required
                      defaultValue={set.weight}
                      key={`load-${set.weight}`}
                    />
                  </label>
                  <button disabled={busy || a.paused || lift.skipped}>
                    Log
                  </button>
                </form>
              ))}
              <p>
                Sets at a different load or incomplete exercises are logged
                without changing progression.
              </p>
            </details>
            <button
              className="text-button"
              disabled={busy || a.paused}
              onClick={() =>
                change((s) => {
                  s.active!.lifts[i].skipped = !lift.skipped;
                })
              }
            >
              {lift.skipped ? "Include exercise" : "Skip exercise"}
            </button>
            {lift.skipped && <p>Skipped · no progression or failure</p>}
          </article>
        );
      })}
      <label>
        Session notes
        <textarea
          defaultValue={a.notes}
          maxLength={5000}
          onChange={(e) =>
            change((s) => {
              s.active!.notes = e.target.value;
            })
          }
        />
      </label>
      <button
        className="primary wide"
        disabled={busy || a.paused}
        onClick={() => setConfirm("finish")}
      >
        Finish workout
      </button>
      {confirm && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <article>
            <h2 id="confirm-title">
              {confirm === "finish"
                ? "Finish this workout?"
                : "Discard this session?"}
            </h2>
            <p>
              {confirm === "finish"
                ? "Only fully logged exercises at their prescribed load affect progression. Unfinished or skipped exercises never count as failures."
                : "The unfinished session will be removed. Completed history and progression stay intact."}
            </p>
            <div className="row">
              <button onClick={() => setConfirm(null)}>Keep training</button>
              <button
                className="primary"
                disabled={busy}
                onClick={async () => {
                  const mode = confirm;
                  let next: "A" | "B" = "A";
                  const saved = await change((s) => {
                    if (confirm === "finish") {
                      finishSession(s);
                      next = s.next;
                    } else discardSession(s);
                  });
                  if (saved) {
                    if (mode === "finish") {
                      setSummary(true);
                      setChoice(next);
                    }
                    setConfirm(null);
                  }
                }}
              >
                {confirm === "finish" ? "Complete & save" : "Discard session"}
              </button>
            </div>
          </article>
        </div>
      )}
    </>
  );
}
