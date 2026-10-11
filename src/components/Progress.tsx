import { useState } from "react";
import { download } from "../backup";
import { editHistory, historyCsv } from "../history";
import type { Session, State } from "../model";
import type { Change } from "./Program";
export default function Progress({
  data,
  change,
  busy,
}: {
  data: State;
  change: Change;
  busy: boolean;
}) {
  const [id, setId] = useState("squat"),
    [editing, setEditing] = useState<Session | null>(null);
  const samples = data.history
    .flatMap((h) =>
      h.lifts
        .filter((l) => l.exercise.id === id && !l.skipped)
        .map((l) => ({ date: h.completedAt!, lift: l })),
    )
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const ex = data.exercises.find((e) => e.id === id)!;
  const successful = samples.filter((x) => x.lift.outcome === "success");
  const record = successful.length
    ? (ex.equipment === "assisted bodyweight" ? Math.min : Math.max)(
        ...successful.map((x) => x.lift.prescribedWeight),
      )
    : null;
  return (
    <>
      <div className="stats">
        <article>
          <strong>{data.history.length}</strong>
          <small>WORKOUTS COMPLETED</small>
        </article>
        <article>
          <strong>{successful.length}</strong>
          <small>SUCCESSFUL {ex.name.toUpperCase()} SESSIONS</small>
        </article>
      </div>
      <article>
        <h2>A little stronger, every week.</h2>
        <label>
          Exercise
          <select value={id} onChange={(e) => setId(e.target.value)}>
            {data.exercises.map((e) => (
              <option value={e.id} key={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        {samples.length ? (
          <Chart
            samples={samples.map((x) => ({
              date: x.date,
              weight: x.lift.prescribedWeight,
              success: x.lift.outcome === "success",
              deload: !!x.lift.deload,
            }))}
            units={data.settings.units}
          />
        ) : (
          <p>Your first logged attempt will start this chart.</p>
        )}
        <div className="row">
          <span className="badge">
            RECORD ·{" "}
            {record === null ? "—" : `${record} ${data.settings.units}`}
          </span>
          <span className="muted">
            {samples.filter((x) => x.lift.outcome === "failure").length}{" "}
            failures · {samples.filter((x) => x.lift.deload).length} deloads
          </span>
        </div>
        <p>
          Records use successful prescribed sessions. Assisted exercises show
          the lowest assistance.
        </p>
      </article>
      <div className="section-heading">
        <h2>Training log</h2>
        <button
          onClick={() =>
            download(
              historyCsv(data),
              `strength-history-${new Date().toISOString().slice(0, 10)}.csv`,
              "text/csv",
            )
          }
        >
          Export CSV
        </button>
      </div>
      {!data.history.length && (
        <article>
          <h2>Your story starts here</h2>
          <p>Finish a workout to see every set, your records and progress.</p>
        </article>
      )}
      {[...data.history]
        .sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!))
        .map((h) => (
          <article key={h.id}>
            <small>
              {new Date(h.completedAt!).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </small>
            <div className="section-heading">
              <h2>Workout {h.template}</h2>
              <button onClick={() => setEditing(structuredClone(h))}>
                Edit workout
              </button>
            </div>
            <p>
              {h.lifts.filter((l) => l.outcome === "success").length} successful
              exercises ·{" "}
              {Math.max(
                0,
                Math.round(
                  (Date.parse(h.completedAt!) - Date.parse(h.startedAt)) /
                    60000,
                ),
              )}{" "}
              min
            </p>
            <details>
              <summary>View every set</summary>
              {h.lifts.map((l) => (
                <div className="history-lift" key={l.exercise.id}>
                  <h3>{l.exercise.name}</h3>
                  <p>
                    {l.outcome ?? "logged"}
                    {l.deload ? " · deload triggered" : ""}
                  </p>
                  {l.sets.map((s, j) => (
                    <p key={j}>
                      Set {j + 1} · {s.reps ?? "not logged"}{" "}
                      {l.exercise.equipment === "timed" ? "sec" : "reps"} ×{" "}
                      {s.weight} {data.settings.units}
                    </p>
                  ))}
                </div>
              ))}
              {h.notes && <p>Notes: {h.notes}</p>}
            </details>
          </article>
        ))}
      {editing && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label="Edit completed workout"
        >
          <article>
            <h2>Edit Workout {editing.template}</h2>
            <p>
              Changes update this historical record. Choose explicitly whether
              future progression should be recalculated.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget),
                  next = structuredClone(editing);
                next.notes = String(f.get("notes"));
                next.completedAt = new Date(
                  String(f.get("date")),
                ).toISOString();
                next.lifts.forEach((l, i) =>
                  l.sets.forEach((set, j) => {
                    const r = String(f.get(`r-${i}-${j}`));
                    set.reps = r === "" ? null : Number(r);
                    set.weight = Number(f.get(`w-${i}-${j}`));
                  }),
                );
                const saved = await change((s) =>
                  editHistory(s, next, f.get("recalculate") === "on"),
                );
                if (saved) setEditing(null);
              }}
            >
              <label>
                Completion date and time
                <input
                  type="datetime-local"
                  name="date"
                  required
                  defaultValue={new Date(
                    Date.parse(editing.completedAt!) -
                      new Date(editing.completedAt!).getTimezoneOffset() *
                        60000,
                  )
                    .toISOString()
                    .slice(0, 16)}
                />
              </label>
              {editing.lifts.map((l, i) => (
                <details key={i}>
                  <summary>{l.exercise.name}</summary>
                  {l.sets.map((set, j) => (
                    <div className="fields" key={j}>
                      <label>
                        Set {j + 1} reps / seconds
                        <input
                          name={`r-${i}-${j}`}
                          type="number"
                          min="0"
                          max="3600"
                          step="1"
                          defaultValue={set.reps ?? ""}
                        />
                      </label>
                      <label>
                        Weight ({data.settings.units})
                        <input
                          name={`w-${i}-${j}`}
                          type="number"
                          min="0"
                          max="2000"
                          step="any"
                          defaultValue={set.weight}
                          required
                        />
                      </label>
                    </div>
                  ))}
                </details>
              ))}
              <label>
                Notes
                <textarea
                  name="notes"
                  maxLength={5000}
                  defaultValue={editing.notes}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  name="recalculate"
                  disabled={!!data.active}
                />{" "}
                Recalculate future progression for these exercises from
                historical prescriptions
              </label>
              <p>
                Leave unchecked to preserve current targets, counters and manual
                overrides.
              </p>
              <div className="row">
                <button type="button" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button className="primary" disabled={busy}>
                  Save history edit
                </button>
              </div>
            </form>
          </article>
        </div>
      )}
    </>
  );
}
function Chart({
  samples,
  units,
}: {
  samples: {
    date: string;
    weight: number;
    success: boolean;
    deload: boolean;
  }[];
  units: string;
}) {
  const w = 640,
    h = 250,
    pad = 45;
  const minT = Date.parse(samples[0].date),
    maxT = Date.parse(samples.at(-1)!.date);
  const minW = Math.max(0, Math.min(...samples.map((x) => x.weight)) - 5),
    maxW = Math.max(...samples.map((x) => x.weight)) + 5;
  const x = (date: string) =>
      maxT === minT
        ? w / 2
        : pad + ((Date.parse(date) - minT) / (maxT - minT)) * (w - pad * 2),
    y = (weight: number) =>
      h - pad - ((weight - minW) / (maxW - minW)) * (h - pad * 2);
  return (
    <svg
      className="chart"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Exercise weight over time. Accent-colored circles indicate success, orange indicates failure, outlined circles indicate deload."
    >
      <line
        x1={pad}
        y1={h - pad}
        x2={w - pad}
        y2={h - pad}
        stroke="var(--border, #526340)"
      />
      {[minW, (minW + maxW) / 2, maxW].map((n) => (
        <g key={n}>
          <line
            x1={pad}
            y1={y(n)}
            x2={w - pad}
            y2={y(n)}
            stroke="var(--border, #30392a)"
          />
          <text x="0" y={y(n) + 4} fill="var(--muted, #a6b19f)" fontSize="11">
            {n.toFixed(1)}
          </text>
        </g>
      ))}
      <polyline
        points={samples.map((s) => `${x(s.date)},${y(s.weight)}`).join(" ")}
        fill="none"
        stroke="var(--accent, #c7ed84)"
        strokeWidth="2"
      />
      {samples.map((s, i) => (
        <circle
          key={i}
          cx={x(s.date)}
          cy={y(s.weight)}
          r={s.deload ? 7 : 4}
          fill={s.success ? "var(--accent, #c7ed84)" : "#ee9b78"}
          stroke={s.deload ? "var(--text, #fff)" : "none"}
          strokeWidth="2"
        >
          <title>
            {new Date(s.date).toLocaleString()} · {s.weight} {units} ·{" "}
            {s.success ? "success" : "failure / partial"}
          </title>
        </circle>
      ))}
      <text x={pad} y={h - 10} fill="var(--muted, #a6b19f)" fontSize="11">
        {new Date(minT).toLocaleDateString()}
      </text>
      <text
        x={w - pad}
        y={h - 10}
        textAnchor="end"
        fill="var(--muted, #a6b19f)"
        fontSize="11"
      >
        {new Date(maxT).toLocaleDateString()}
      </text>
    </svg>
  );
}
