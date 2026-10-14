import type { CSSProperties } from "react";
import type { SessionLift, Settings } from "../model";
import type { Change } from "./Program";

export default function WarmupSets({
  lift,
  index,
  units,
  paused,
  busy,
  change,
}: {
  lift: SessionLift;
  index: number;
  units: Settings["units"];
  paused: boolean;
  busy: boolean;
  change: Change;
}) {
  if (!lift.warmups.length) return null;
  return (
    <>
      <div
        className="warmup-sets"
        style={{ "--warmup-count": lift.warmups.length } as CSSProperties}
        aria-label={`Warm-up sets for ${lift.exercise.name}`}
      >
        {lift.warmups.map((set, j) => (
          <button
            key={j}
            className={set.done ? "done" : set.skipped ? "skipped" : "pending"}
            aria-label={`Warm-up ${j + 1} ${lift.exercise.name}`}
            aria-pressed={set.done}
            aria-description={`${set.weight} ${units}, ${set.reps} reps. Tap to toggle completion.`}
            disabled={busy || paused || lift.skipped || set.skipped}
            onClick={() =>
              change((s) => {
                const target = s.active!.lifts[index].warmups[j];
                target.done = !target.done;
              })
            }
          >
            <small>
              SET {j + 1}
              {set.done ? " ✓" : ""}
            </small>
            <strong>{set.weight}</strong>
            <span className="warmup-unit">{units}</span>
            <span>× {set.reps} reps</span>
            {set.skipped && <span>Skipped</span>}
          </button>
        ))}
      </div>
      <details>
        <summary>Edit reps / load per warm-up set</summary>
        <p>These are prescribed warm-up reps, not a record of achieved reps.</p>
        {lift.warmups.map((set, j) => (
          <form
            className="row"
            key={`${lift.prescribedWeight}-${set.weight}-${set.reps}-${j}`}
            aria-label={`Edit warm-up ${j + 1} ${lift.exercise.name}`}
            onSubmit={(e) => {
              e.preventDefault();
              const fields = new FormData(e.currentTarget);
              const weight = Number(fields.get("weight")),
                reps = Number(fields.get("reps"));
              void change((s) => {
                const target = s.active!.lifts[index].warmups[j];
                if (target.weight !== weight || target.reps !== reps) {
                  target.weight = weight;
                  target.reps = reps;
                  target.custom = true;
                }
              });
            }}
          >
            <span>Warm-up {j + 1}</span>
            <label>
              Weight ({units})
              <input
                name="weight"
                aria-label={`Warm-up ${j + 1} weight ${lift.exercise.name}`}
                type="number"
                min="0"
                max="2000"
                step="any"
                defaultValue={set.weight}
                required
                disabled={busy || paused || lift.skipped}
              />
            </label>
            <label>
              Target reps
              <input
                name="reps"
                aria-label={`Warm-up ${j + 1} reps ${lift.exercise.name}`}
                type="number"
                min="1"
                max="100"
                step="1"
                defaultValue={set.reps}
                required
                disabled={busy || paused || lift.skipped}
              />
            </label>
            <button disabled={busy || paused || lift.skipped}>
              Save warm-up
            </button>
            <button
              type="button"
              disabled={busy || paused || lift.skipped}
              onClick={() =>
                change((s) => {
                  const target = s.active!.lifts[index].warmups[j];
                  target.skipped = !target.skipped;
                })
              }
            >
              {set.skipped ? "Unskip" : "Skip"}
            </button>
          </form>
        ))}
      </details>
    </>
  );
}
