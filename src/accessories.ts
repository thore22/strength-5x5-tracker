import { catalog } from "./defaults";
import {
  rule,
  type Exercise,
  type Prescription,
  type SessionLift,
  type State,
} from "./model";

// Explicit movement-role matches, not transitive muscle-group matching.
// Research, exclusions, and prescription rationale: ACCESSORY_SWAPS.md.
const groups = [
  {
    ids: ["curl", "db-curl", "hammer"],
    reason: "Elbow-flexion accessory; grip and loading differ.",
  },
  {
    ids: ["pullups", "chinups"],
    reason: "Vertical pulling; grip and arm emphasis differ.",
  },
  {
    ids: ["triceps", "skull"],
    reason: "Elbow-extension accessory; arm position and loading differ.",
  },
  {
    ids: ["leg-raise", "knee-raise"],
    reason: "Hanging raise; straight legs are more demanding than bent knees.",
  },
  {
    ids: ["plank", "ab-wheel"],
    reason:
      "Trunk bracing; rollouts are more demanding. Seconds and reps use separate targets.",
  },
  {
    ids: ["rdl", "back-extension"],
    reason:
      "Hip-extension accessory; use a hip hinge on the back-extension bench. Loading and emphasis differ.",
  },
];
const targets: Record<string, [number, number, number]> = {
  curl: [3, 8, 12],
  "db-curl": [3, 8, 12],
  hammer: [3, 8, 12],
  pullups: [3, 5, 10],
  chinups: [3, 5, 10],
  triceps: [3, 8, 12],
  skull: [3, 8, 12],
  "leg-raise": [3, 8, 15],
  "knee-raise": [3, 8, 15],
  plank: [3, 20, 40],
  "ab-wheel": [3, 6, 10],
  rdl: [2, 8, 10],
  "back-extension": [2, 8, 12],
};
export function similarAccessoryIds(id: string): string[] {
  return (
    groups.find((g) => g.ids.includes(id))?.ids.filter((x) => x !== id) ?? []
  );
}
const isCatalogExercise = (ex: Exercise) =>
  catalog.some(
    (known) => known.id === ex.id && known.equipment === ex.equipment,
  );
function previousPerformance(s: State, id: string): SessionLift | undefined {
  for (let i = s.history.length - 1; i >= 0; i--) {
    const previous = s.history[i].lifts.find(
      (l) =>
        l.exercise.id === id &&
        !l.skipped &&
        l.sets.some((set) => set.reps !== null),
    );
    if (previous) return previous;
  }
}

export function accessorySwapBlock(lift: SessionLift): string | null {
  if (lift.prescription.core)
    return "Core lifts cannot be swapped during a workout.";
  if (
    lift.sets.some((s) => s.reps !== null) ||
    lift.warmups.some((s) => s.done)
  )
    return "Already started — keep your logged sets and skip the remaining sets if needed.";
  return null;
}
export interface AccessoryOption {
  exercise: Exercise;
  prescription: Prescription;
  weight: number;
  previous: SessionLift | undefined;
  reason: string;
  original: boolean;
}
export function accessoryOptions(s: State, index: number): AccessoryOption[] {
  const active = s.active,
    lift = active?.lifts[index];
  if (!active || !lift || accessorySwapBlock(lift)) return [];
  const planned = lift.replaced ?? lift;
  if (!isCatalogExercise(planned.exercise)) return [];
  const group = groups.find((g) => g.ids.includes(planned.exercise.id));
  if (!group) return [];
  return group.ids.flatMap((id) => {
    if (
      id === lift.exercise.id ||
      active.lifts.some((l, i) => i !== index && l.exercise.id === id)
    )
      return [];
    const original = id === planned.exercise.id;
    const exercise = original
      ? planned.exercise
      : s.exercises.find((e) => e.id === id);
    if (!exercise || !isCatalogExercise(exercise) || !s.progression[id])
      return [];
    const [sets, minReps, maxReps] = targets[id];
    return [
      {
        exercise: structuredClone(exercise),
        prescription: original
          ? structuredClone(planned.prescription)
          : {
              exerciseId: id,
              core: false,
              sets,
              minReps,
              maxReps,
              rest: planned.prescription.rest,
              rule: rule(
                ["bodyweight", "timed"].includes(exercise.equipment)
                  ? "manual"
                  : "double",
              ),
            },
        weight: original ? planned.prescribedWeight : s.progression[id].weight,
        previous: previousPerformance(s, id),
        reason: group.reason,
        original,
      },
    ];
  });
}

export function swapAccessory(
  s: State,
  index: number,
  exerciseId: string,
  weight: number,
): void {
  if (!s.active || s.active.paused)
    throw new Error("Resume your workout before swapping an accessory.");
  const lift = s.active.lifts[index];
  if (!lift) throw new Error("Accessory not found.");
  const blocked = accessorySwapBlock(lift);
  if (blocked) throw new Error(blocked);
  const option = accessoryOptions(s, index).find(
    (o) => o.exercise.id === exerciseId,
  );
  if (!option)
    throw new Error(
      "Choose an approved alternative that is not already in this workout.",
    );
  if (!Number.isFinite(weight) || weight < 0 || weight > 2000)
    throw new Error("Working weight must be between 0 and 2000.");
  if (
    ["bodyweight", "timed"].includes(option.exercise.equipment) &&
    weight !== 0
  )
    throw new Error("This exercise is logged without added load.");
  const planned = structuredClone(
    lift.replaced ?? {
      exercise: lift.exercise,
      prescription: lift.prescription,
      prescribedWeight: lift.prescribedWeight,
    },
  );
  s.active.lifts[index] = {
    exercise: option.exercise,
    prescription: option.prescription,
    prescribedWeight: weight,
    sets: Array.from({ length: option.prescription.sets }, () => ({
      reps: null,
      weight,
    })),
    warmups: [],
    skipped: false,
    ...(option.original ? {} : { replaced: planned }),
  };
  // Like the working-weight editor, save only this exercise's own target.
  const progression = s.progression[exerciseId];
  if (progression.weight !== weight) progression.suggestion = null;
  progression.weight = weight;
}
