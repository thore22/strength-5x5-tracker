import { useEffect, useRef, useState } from "react";
import { accessoryOptions, swapAccessory } from "../accessories";
import type { State } from "../model";
import type { Change } from "./Program";

export default function AccessorySwap({
  data,
  index,
  change,
  busy,
  close,
}: {
  data: State;
  index: number;
  change: Change;
  busy: boolean;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState("");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState("");
  const options = accessoryOptions(data, index);
  const option = options.find((o) => o.exercise.id === selected);
  const unweighted =
    option && ["bodyweight", "timed"].includes(option.exercise.equipment);
  const lift = data.active!.lifts[index];
  useEffect(() => {
    const element = dialog.current!;
    const focus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      // The workout keeps the slot mounted when its exercise changes.
      focus?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="swap-sheet"
      aria-labelledby="swap-title"
      aria-describedby="swap-description"
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const controls = [
          ...e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), [tabindex="0"]',
          ),
        ].filter((control) => control.getClientRects().length);
        const first = controls[0],
          last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
    >
      <div className="swap-sheet-content">
        <div className="section-heading">
          <h2 id="swap-title">Swap {lift.exercise.name}</h2>
          <button
            type="button"
            disabled={busy}
            onClick={close}
            aria-label="Close accessory swap"
          >
            Close
          </button>
        </div>
        <p id="swap-description">
          Workout {data.active!.template} · Today only. Your program stays the
          same.
        </p>
        <fieldset className="swap-options" disabled={busy}>
          <legend>Similar accessories</legend>
          {options.map((o) => (
            <label className="swap-option" key={o.exercise.id}>
              <input
                type="radio"
                name="accessory"
                value={o.exercise.id}
                checked={selected === o.exercise.id}
                onChange={() => {
                  setSelected(o.exercise.id);
                  setWeight(
                    ["bodyweight", "timed"].includes(o.exercise.equipment)
                      ? "0"
                      : o.previous || o.original
                        ? String(o.weight)
                        : "",
                  );
                }}
              />
              <span>
                <strong>
                  {o.exercise.name}
                  {o.original ? " · Original plan" : ""}
                </strong>
                <span>
                  {o.exercise.equipment} · {o.prescription.sets} ×{" "}
                  {o.prescription.minReps}–{o.prescription.maxReps}
                  {o.exercise.equipment === "timed" ? " sec" : " reps"}
                </span>
                <span>{o.reason}</span>
                {o.previous ? (
                  <span>
                    Last time ·{" "}
                    {o.previous.sets.map((s) => s.reps ?? "—").join(" / ")}{" "}
                    {o.exercise.equipment === "timed" ? "sec" : "reps"}
                    {!["bodyweight", "timed"].includes(o.exercise.equipment) &&
                      ` · loads ${o.previous.sets.map((s) => s.weight).join(" / ")} ${data.settings.units}`}
                  </span>
                ) : (
                  <span>No previous performance</span>
                )}
              </span>
            </label>
          ))}
        </fieldset>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!option || weight === "") return;
            setError("");
            const saved = await change((s) =>
              swapAccessory(s, index, selected, Number(weight)),
            );
            if (saved) close();
            else
              setError(
                "Could not save the swap. Your workout is unchanged. Try again, or close this sheet to see the storage error.",
              );
          }}
        >
          {option && (
            <>
              {unweighted ? (
                <p>
                  No added load.{" "}
                  {option.exercise.equipment === "timed"
                    ? "Log seconds for each hold."
                    : "Log repetitions for each set."}
                </p>
              ) : (
                <label>
                  {option.exercise.equipment === "weighted bodyweight"
                    ? "Added load"
                    : "Working weight"}{" "}
                  ({data.settings.units})
                  <input
                    key={selected}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="2000"
                    step="any"
                    required
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    disabled={busy}
                  />
                  {option.exercise.equipment === "dumbbell"
                    ? "Weight per dumbbell."
                    : option.exercise.equipment === "barbell"
                      ? "Include the bar weight."
                      : "Use this exercise’s own load."}
                </label>
              )}
              <p>
                {option.prescription.rest} sec rest ·{" "}
                {option.prescription.rule.mode === "manual"
                  ? "Manual progression"
                  : option.prescription.rule.mode === "linear"
                    ? "Automatic linear progression"
                    : "Accessory weight suggestions"}
                . Only the performed exercise affects progression.
                {!unweighted &&
                  " This load becomes this exercise’s own future target."}
              </p>
            </>
          )}
          <div className="row">
            <button type="button" disabled={busy} onClick={close}>
              Cancel
            </button>
            <button
              className="primary"
              disabled={busy || !option || weight === ""}
            >
              Use for this workout
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </form>
      </div>
    </dialog>
  );
}
