import { describe, it, expect } from "vitest";
import { freshState } from "./defaults";
import { startSession, finishSession } from "./engine";
import { editHistory, historyCsv } from "./history";
describe("history editing", () => {
  it("preserves targets unless recalculation explicitly selected", () => {
    const s = freshState();
    startSession(s, "A");
    s.active!.lifts[0].sets.forEach((x) => {
      x.reps = 5;
    });
    finishSession(s);
    const h = structuredClone(s.history[0]);
    h.lifts[0].sets[0].reps = 3;
    editHistory(s, h, false);
    expect(s.progression.squat.weight).toBe(22.5);
    expect(s.history[0].lifts[0].outcome).toBe("failure");
    editHistory(s, h, true);
    expect(s.progression.squat.weight).toBe(20);
    expect(s.progression.squat.failures).toBe(1);
  });
  it("protects active sessions from retrospective recalculation", () => {
    const s = freshState();
    startSession(s, "A");
    finishSession(s);
    startSession(s, "B");
    expect(() => editHistory(s, s.history[0], true)).toThrow("active workout");
  });
  it("CSV records sets and escapes notes in exercise names", () => {
    const s = freshState();
    startSession(s, "A");
    s.active!.lifts[0].exercise.name = 'Squat, "barbell"';
    finishSession(s);
    const text = historyCsv(s);
    expect(text).toContain('"Squat, ""barbell"""');
    expect(text).toContain('"reps_or_seconds"');
    expect(text.split("\r\n")).toHaveLength(25);
  });
});
