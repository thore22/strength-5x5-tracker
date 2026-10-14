import { useRef, useState } from "react";
import type { Exercise, Settings } from "../model";
import type { Change } from "./Program";
import { changeWorkingWeight } from "../engine";

export default function WorkingWeight({
  exercise,
  weight,
  units,
  change,
  busy,
}: {
  exercise: Exercise;
  weight: number;
  units: Settings["units"];
  change: Change;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const close = () => {
    setEditing(false);
    button.current?.focus();
  };
  const label =
    exercise.equipment === "assisted bodyweight"
      ? "Assistance"
      : exercise.equipment.includes("bodyweight")
        ? "Added load"
        : "Working weight";
  return (
    <>
      <button
        ref={button}
        className="working-weight"
        aria-label={`Change working weight for ${exercise.name}`}
        aria-expanded={editing}
        disabled={busy}
        onClick={() => setEditing(!editing)}
      >
        <strong>
          {weight}
          <small> {units}</small>
        </strong>
        <span aria-hidden="true">Edit</span>
      </button>
      {editing && (
        <form
          className="weight-editor"
          aria-label={`Working weight for ${exercise.name}`}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
          onSubmit={async (e) => {
            e.preventDefault();
            const next = Number(new FormData(e.currentTarget).get("weight"));
            if (await change((s) => changeWorkingWeight(s, exercise.id, next)))
              close();
          }}
        >
          <label>
            {label} ({units})
            <input
              name="weight"
              type="number"
              min="0"
              max="2000"
              step="any"
              required
              defaultValue={weight}
              autoFocus
              disabled={busy}
            />
          </label>
          <p>
            Applies to all working sets, including logged sets, and saves your
            future working weight. Reps, warm-ups, and rest stay unchanged.
          </p>
          {exercise.equipment === "barbell" && <p>Include the bar weight.</p>}
          {exercise.equipment === "dumbbell" && (
            <p>Enter the weight per dumbbell.</p>
          )}
          <div className="row">
            <button className="primary" disabled={busy}>
              Save weight
            </button>
            <button
              type="button"
              aria-label="Cancel weight change"
              disabled={busy}
              onClick={close}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </>
  );
}
