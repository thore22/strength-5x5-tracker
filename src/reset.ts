import { initialLift, type State } from "./model";

export function resetProgress(state: State): void {
  state.history = [];
  state.active = null;
  state.timerEnd = null;
  state.next = "A";
  for (const [id, lift] of Object.entries(state.progression))
    state.progression[id] = initialLift(lift.weight);
  state.lastBackup = null;
  state.workoutsSinceBackup = 0;
  state.reminderDismissedAt = null;
}
