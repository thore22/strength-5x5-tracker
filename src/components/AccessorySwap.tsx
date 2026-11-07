import { useState } from "react";
import { accessoryOptions, swapAccessory } from "../accessories";
import type { State } from "../model";
import type { Change } from "./Program";
import ModalSheet from "./ModalSheet";

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
  const [selected, setSelected] = useState("");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState("");
  const options = accessoryOptions(data, index);
  const option = options.find((o) => o.exercise.id === selected);
  const unweighted =
    option && ["bodyweight", "timed"].includes(option.exercise.equipment);
  const lift = data.active!.lifts[index];
  return (
    <ModalSheet
      title={`Swap ${lift.exercise.name}`}
      description={`Workout ${data.active!.template} · Today only. Your program stays the same.`}
      closeLabel="Close accessory swap"
      close={close}
      busy={busy}
    >
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
    </ModalSheet>
  );
}
