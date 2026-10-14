import { describe, it, expect } from "vitest";
import { freshState } from "./defaults";
import {
  changeWorkingWeight,
  startSession,
  finishSession,
  tapWorkingSet,
  warmups,
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
  it("changes active work sets and warm-up suggestions while preserving reps, timer, and history", async () => {
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
    expect(s.active!.lifts[0].warmups).toEqual(warmups(80, s.settings));
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
  it("creates and removes unlogged warm-ups when crossing the bar-weight threshold", () => {
    const s = freshState();
    startSession(s, "A");
    expect(s.active!.lifts[0].warmups).toEqual([]);
    changeWorkingWeight(s, "squat", 100);
    expect(s.active!.lifts[0].warmups).toEqual(warmups(100, s.settings));
    changeWorkingWeight(s, "squat", 20);
    expect(s.active!.lifts[0].warmups).toEqual([]);
  });
  it("preserves completed, skipped, and custom warm-ups through repeated changes and backup restore", async () => {
    const s = freshState();
    changeWorkingWeight(s, "squat", 100);
    startSession(s, "A");
    const lift = s.active!.lifts[0];
    lift.warmups[0].done = true;
    lift.warmups[1].skipped = true;
    lift.warmups[2] = {
      weight: 55,
      reps: 4,
      done: false,
      skipped: false,
      custom: true,
    };
    const preserved = structuredClone(lift.warmups.slice(0, 3));
    changeWorkingWeight(s, "squat", 80);
    for (const set of preserved) expect(lift.warmups).toContainEqual(set);
    expect(lift.warmups.some((set) => set.weight === 80)).toBe(false);
    expect(
      lift.warmups.some((set) => set.weight === 65 && set.reps === 2),
    ).toBe(true);
    changeWorkingWeight(s, "squat", 120);
    for (const set of preserved) expect(lift.warmups).toContainEqual(set);
    expect(lift.warmups.some((set) => set.weight === 65)).toBe(false);
    expect((await parseBackup(await makeBackup(s))).state).toEqual(s);
  });
  it("retains older manually edited warm-ups without metadata and respects the stored set limit", () => {
    const s = freshState();
    changeWorkingWeight(s, "squat", 100);
    startSession(s, "A");
    const lift = s.active!.lifts[0];
    lift.warmups[1].weight = 35;
    changeWorkingWeight(s, "squat", 80);
    expect(lift.warmups).toContainEqual({
      weight: 35,
      reps: 5,
      done: false,
      skipped: false,
      custom: true,
    });
    lift.warmups = Array.from({ length: 20 }, (_, i) => ({
      weight: i + 20,
      reps: 5,
      done: true,
      skipped: false,
    }));
    changeWorkingWeight(s, "squat", 120);
    expect(lift.warmups).toHaveLength(20);
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
