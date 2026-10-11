import { initialLift, type Session, type State } from "./model";
import { outcome, progress } from "./engine";
export function editHistory(
  s: State,
  record: Session,
  recalculate: boolean,
): void {
  const i = s.history.findIndex((h) => h.id === record.id);
  if (i < 0 || !record.completedAt)
    throw new Error("Completed workout not found.");
  if (recalculate && s.active)
    throw new Error(
      "Finish your active workout before recalculating future progression.",
    );
  s.history[i] = structuredClone(record);
  s.history[i].lifts.forEach((l) => {
    l.outcome = outcome(l);
  });
  if (recalculate) {
    const affected = new Set(record.lifts.map((l) => l.exercise.id));
    for (const id of affected) {
      const attempts = [...s.history]
        .sort((a, b) => Date.parse(a.completedAt!) - Date.parse(b.completedAt!))
        .flatMap((h) => h.lifts)
        .filter((l) => l.exercise.id === id);
      let current = initialLift(
        attempts[0]?.prescribedWeight ?? s.progression[id].weight,
      );
      for (const lift of attempts)
        current = progress(
          current,
          lift,
          s.settings.plateIncrement,
          lift.exercise.equipment === "barbell" ? s.settings.barWeight : 0,
        ).state;
      s.progression[id] = current;
    }
  }
}
export function historyCsv(s: State): string {
  const escape = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const rows: unknown[][] = [
    [
      "date",
      "workout",
      "exercise",
      "set",
      "reps_or_seconds",
      "weight",
      "units",
      "outcome",
      "deload",
    ],
  ];
  for (const h of s.history)
    for (const l of h.lifts)
      l.sets.forEach((set, i) =>
        rows.push([
          h.completedAt,
          h.template,
          l.exercise.name,
          i + 1,
          set.reps,
          set.weight,
          s.settings.units,
          l.outcome,
          l.deload ?? false,
        ]),
      );
  return rows.map((r) => r.map(escape).join(",")).join("\r\n");
}
