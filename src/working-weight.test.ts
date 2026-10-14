import { describe, it, expect } from "vitest";
import { freshState } from "./defaults";
import {
  changeWorkingWeight,
  startSession,
  finishSession,
  tapWorkingSet,
} from "./engine";
import { makeBackup, parseBackup } from "./backup";

describe("explicit working-weight changes", () => {
  it("saves a shared future target for A and B without changing the catalog or templates", () => {
    const s = freshState(),
      before = structuredClone(s);
    s.progression.squat.failures = 1;
    s.progression.squat.failureWeight = 20;
    changeWorkingWeight(s, "squat", 55.5);
    expect(s.progression.squat).toEqual({
      ...before.progression.squat,
      weight: 55.5,
      failures: 1,
      failureWeight: 20,
    });
    expect(s.exercises).toEqual(before.exercises);
    expect(s.templates).toEqual(before.templates);
    startSession(s, "B");
    expect(s.active!.lifts[0].sets.every((set) => set.weight === 55.5)).toBe(
      true,
    );
  });
  it("changes all active work sets and preserves reps, warm-ups, timer, and completed history", async () => {
    const s = freshState();
    changeWorkingWeight(s, "squat", 100);
    startSession(s, "A");
    finishSession(s);
    startSession(s, "B");
    tapWorkingSet(s, 0, 0, 1000);
    s.active!.lifts[0].sets[1].weight = 95;
    s.progression.squat.suggestion = 105;
    const before = structuredClone(s);
    changeWorkingWeight(s, "squat", 80);
    expect(s.active!.lifts[0].prescribedWeight).toBe(80);
    expect(s.active!.lifts[0].sets.map((set) => set.weight)).toEqual([
      80, 80, 80, 80, 80,
    ]);
    expect(s.active!.lifts[0].sets.map((set) => set.reps)).toEqual(
      before.active!.lifts[0].sets.map((set) => set.reps),
    );
    expect(s.active!.lifts[0].warmups).toEqual(before.active!.lifts[0].warmups);
    expect(s.active!.lifts.slice(1)).toEqual(before.active!.lifts.slice(1));
    expect(s.history).toEqual(before.history);
    expect(s.timerEnd).toBe(before.timerEnd);
    expect(s.progression.squat.suggestion).toBeNull();
    expect((await parseBackup(await makeBackup(s))).state).toEqual(s);
    s.active!.lifts[0].sets.forEach((set) => {
      set.reps = 5;
    });
    finishSession(s);
    expect(s.progression.squat.weight).toBe(82.5);
    expect(s.history[0].lifts[0].prescribedWeight).toBe(100);
    expect(s.history[1].lifts[0].prescribedWeight).toBe(80);
  });
  it("rejects invalid weights and unknown exercises before changing state", () => {
    const s = freshState(),
      before = structuredClone(s);
    for (const weight of [-1, NaN, Infinity, 2001])
      expect(() => changeWorkingWeight(s, "squat", weight)).toThrow(
        "Working weight",
      );
    expect(() => changeWorkingWeight(s, "missing", 30)).toThrow(
      "Unknown exercise",
    );
    expect(s).toEqual(before);
  });
});
