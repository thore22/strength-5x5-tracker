import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { freshState } from "./defaults";
import { startSession, finishSession } from "./engine";
import { loadState, saveState, recoveryState } from "./storage";
import { resetProgress } from "./reset";

function trainedState() {
  const state = freshState();
  startSession(state, "A");
  state.active!.lifts[0].sets.forEach((set) => {
    set.reps = 5;
  });
  finishSession(state);
  startSession(state, "B");
  state.timerEnd = Date.now() + 10000;
  state.progression.bench.failures = 2;
  state.progression.bench.failureWeight = 20;
  state.progression.dips.suggestion = 2.5;
  state.settings.primaryColor = "#aa33cc";
  state.lastBackup = new Date().toISOString();
  return state;
}
describe("explicit progress reset", () => {
  it("clears history, active workout and progression while preserving setup and weights", () => {
    const state = trainedState();
    const before = structuredClone(state);
    resetProgress(state);
    expect(state.history).toEqual([]);
    expect(state.active).toBeNull();
    expect(state.timerEnd).toBeNull();
    expect(state.next).toBe("A");
    expect(state.exercises).toEqual(before.exercises);
    expect(state.templates).toEqual(before.templates);
    expect(state.settings).toEqual(before.settings);
    for (const [id, lift] of Object.entries(state.progression)) {
      expect(lift).toEqual({
        weight: before.progression[id].weight,
        successes: 0,
        failures: 0,
        failureWeight: null,
        suggestion: null,
      });
    }
    expect(state.lastBackup).toBeNull();
    expect(state.workoutsSinceBackup).toBe(0);
  });
  it("atomically clears recovery on confirmed reset and protects against stale tabs", async () => {
    const name = crypto.randomUUID();
    const before = trainedState();
    await saveState(before, 0, name);
    await saveState(before, 1, name, true);
    expect(await recoveryState(name)).toEqual(before);
    const reset = structuredClone(before);
    resetProgress(reset);
    await expect(saveState(reset, 1, name, false, true)).rejects.toThrow(
      "Another tab",
    );
    expect((await loadState(name)).state).toEqual(before);
    expect(await recoveryState(name)).toEqual(before);
    await saveState(reset, 2, name, false, true);
    expect((await loadState(name)).state).toEqual(reset);
    expect(await recoveryState(name)).toBeNull();
  });
});
