import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  accessoryOptions,
  similarAccessoryIds,
  swapAccessory,
} from "./accessories";
import { freshState } from "./defaults";
import {
  discardSession,
  finishSession,
  startSession,
  tapWorkingSet,
} from "./engine";
import { initialLift, rule, type State } from "./model";
import { makeBackup, parseBackup } from "./backup";
import { loadState, openDatabase, recoveryState, saveState } from "./storage";
import { validateState } from "./validation";

function withAccessory(id = "curl") {
  const s = freshState();
  s.templates.A.push({
    exerciseId: id,
    core: false,
    sets: 4,
    minReps: 9,
    maxReps: 11,
    rest: 75,
    rule: rule("double"),
  });
  startSession(s, "A");
  return s;
}
describe("curated in-workout accessory swaps", () => {
  it.each([
    ["curl", ["db-curl", "hammer"]],
    ["db-curl", ["curl", "hammer"]],
    ["hammer", ["curl", "db-curl"]],
    ["pullups", ["chinups"]],
    ["chinups", ["pullups"]],
    ["triceps", ["skull"]],
    ["skull", ["triceps"]],
    ["leg-raise", ["knee-raise"]],
    ["knee-raise", ["leg-raise"]],
    ["plank", ["ab-wheel"]],
    ["ab-wheel", ["plank"]],
    ["rdl", ["back-extension"]],
    ["back-extension", ["rdl"]],
    ["dips", []],
    ["lateral", []],
    ["face-pull", []],
    ["calf", []],
    ["bench", []],
    ["unknown", []],
  ])("%s permits only its reviewed matches", (id, allowed) => {
    expect(similarAccessoryIds(id as string)).toEqual(allowed);
  });
  it("preserves original snapshots, other lifts, history, timer and A/B templates", () => {
    const s = withAccessory();
    tapWorkingSet(s, 0, 0, 1000);
    s.progression.curl = { ...initialLift(35), failures: 2, failureWeight: 35 };
    const before = structuredClone(s);
    swapAccessory(s, 5, "db-curl", 8);
    const l = s.active!.lifts[5];
    expect(l.replaced).toEqual({
      exercise: before.active!.lifts[5].exercise,
      prescription: before.active!.lifts[5].prescription,
      prescribedWeight: before.active!.lifts[5].prescribedWeight,
    });
    expect(l.exercise.id).toBe("db-curl");
    expect(l.prescribedWeight).toBe(8);
    expect(l.sets).toEqual(
      Array.from({ length: 3 }, () => ({ reps: null, weight: 8 })),
    );
    expect(l.prescription).toMatchObject({
      sets: 3,
      minReps: 8,
      maxReps: 12,
      rest: 75,
      core: false,
    });
    expect(s.templates).toEqual(before.templates);
    expect(s.active!.lifts.slice(0, 5)).toEqual(
      before.active!.lifts.slice(0, 5),
    );
    expect(s.history).toEqual(before.history);
    expect(s.timerEnd).toBe(before.timerEnd);
    expect(s.progression.curl).toEqual(before.progression.curl);
    expect(s.progression["db-curl"].weight).toBe(8);
    expect(validateState(s)).toEqual(s);
  });
  it("keeps options anchored to the started workout, restores the original custom prescription, and does not chain into unrelated exercises", () => {
    const s = withAccessory();
    const original = structuredClone(s.active!.lifts[5]);
    swapAccessory(s, 5, "db-curl", 9);
    s.templates.A[5].exerciseId = "skull";
    s.templates.B.push({ ...s.templates.A[5], exerciseId: "hammer", sets: 8 });
    expect(accessoryOptions(s, 5).map((o) => o.exercise.id)).toEqual([
      "curl",
      "hammer",
    ]);
    swapAccessory(s, 5, "hammer", 7);
    expect(s.active!.lifts[5].replaced!.exercise.id).toBe("curl");
    expect(() => swapAccessory(s, 5, "skull", 20)).toThrow("approved");
    swapAccessory(s, 5, "curl", original.prescribedWeight);
    expect(s.active!.lifts[5]).toEqual(original);
  });
  it("rejects core lifts, duplicates, unrelated alternatives, paused sessions, invalid loads and unknown indices without mutations", () => {
    const s = withAccessory();
    for (const [index, id, weight] of [
      [0, "front-squat", 20],
      [5, "skull", 20],
      [99, "hammer", 5],
      [5, "db-curl", NaN],
      [5, "db-curl", -1],
      [5, "db-curl", 2001],
    ] as const) {
      const before = structuredClone(s);
      expect(() => swapAccessory(s, index, id, weight)).toThrow();
      expect(s).toEqual(before);
    }
    s.active!.paused = true;
    expect(() => swapAccessory(s, 5, "db-curl", 8)).toThrow("Resume");
    s.active!.paused = false;
    s.active!.lifts.push({
      ...structuredClone(s.active!.lifts[5]),
      exercise: structuredClone(s.exercises.find((e) => e.id === "db-curl")!),
      prescription: {
        ...s.active!.lifts[5].prescription,
        exerciseId: "db-curl",
      },
    });
    expect(accessoryOptions(s, 5).map((o) => o.exercise.id)).toEqual([
      "hammer",
    ]);
    expect(() => swapAccessory(s, 5, "db-curl", 8)).toThrow("approved");
  });
  it.each([0, 9])("never removes logged sets, including %s reps", (reps) => {
    const s = withAccessory();
    s.active!.lifts[5].sets[0].reps = reps;
    const before = structuredClone(s);
    expect(accessoryOptions(s, 5)).toEqual([]);
    expect(() => swapAccessory(s, 5, "hammer", 5)).toThrow("Already started");
    expect(s).toEqual(before);
  });
  it("also protects completed warm-ups and excludes custom IDs or changed equipment", () => {
    const s = withAccessory();
    s.active!.lifts[5].warmups = [
      { reps: 5, weight: 20, done: true, skipped: false },
    ];
    expect(() => swapAccessory(s, 5, "hammer", 5)).toThrow("Already started");
    s.active!.lifts[5].warmups = [];
    s.exercises.find((e) => e.id === "db-curl")!.equipment = "machine";
    expect(accessoryOptions(s, 5).map((o) => o.exercise.id)).toEqual([
      "hammer",
    ]);
    s.active!.lifts[5].exercise.id = "custom-curl";
    expect(accessoryOptions(s, 5)).toEqual([]);
  });
  it("progresses only the performed variant and leaves the original failure counters and historical records intact", () => {
    const s = withAccessory();
    s.progression.curl = { ...initialLift(30), failures: 2, failureWeight: 30 };
    const original = structuredClone(s.progression.curl);
    swapAccessory(s, 5, "db-curl", 8);
    s.active!.lifts[5].sets.forEach((set) => {
      set.reps = 12;
    });
    finishSession(s);
    expect(s.progression.curl).toEqual(original);
    expect(s.progression["db-curl"]).toMatchObject({
      weight: 8,
      suggestion: 10.5,
    });
    const history = structuredClone(s.history);
    startSession(s, "A");
    expect(s.active!.lifts[5].exercise.id).toBe("curl");
    swapAccessory(s, 5, "hammer", 6);
    discardSession(s);
    expect(s.progression.curl).toEqual(original);
    expect(s.progression.hammer.failures).toBe(0);
    expect(s.history).toEqual(history);
  });
  it("skipped or unfinished replacements create no false failure", () => {
    const s = withAccessory();
    swapAccessory(s, 5, "db-curl", 7);
    s.active!.lifts[5].sets[0].reps = 0;
    const before = structuredClone(s.progression);
    finishSession(s);
    expect(s.progression).toEqual(before);
    expect(s.history[0].lifts[5].outcome).toBe("skipped");
  });
  it("previews a replacement's actual previous performance and independent saved target", () => {
    const s = withAccessory();
    swapAccessory(s, 5, "db-curl", 8);
    s.active!.lifts[5].sets.forEach((set, i) => {
      set.reps = 10 - i;
      set.weight = i === 0 ? 8 : 7;
    });
    finishSession(s);
    startSession(s, "A");
    s.progression["db-curl"].weight = 9;
    const option = accessoryOptions(s, 5).find(
      (o) => o.exercise.id === "db-curl",
    )!;
    expect(option.weight).toBe(9);
    expect(option.previous!.sets.map((set) => set.weight)).toEqual([8, 7, 7]);
    const historical = structuredClone(s.history);
    swapAccessory(s, 5, "db-curl", option.weight);
    expect(s.active!.lifts[5].prescribedWeight).toBe(9);
    expect(s.history).toEqual(historical);
    // Definition edits do not make saved historical snapshots unrestorable.
    s.exercises.find((e) => e.id === "curl")!.equipment = "machine";
    expect(validateState(s)).toEqual(s);
  });
  it("uses independent seconds/reps prescriptions and no load for unweighted bracing exercises", () => {
    const s = withAccessory("ab-wheel");
    swapAccessory(s, 5, "plank", 0);
    expect(s.active!.lifts[5].prescription).toMatchObject({
      minReps: 20,
      maxReps: 40,
      rule: { mode: "manual" },
    });
    expect(() => swapAccessory(s, 5, "ab-wheel", 5)).toThrow(
      "without added load",
    );
    s.active!.lifts[5].sets.forEach((set) => {
      set.reps = 40;
    });
    finishSession(s);
    expect(s.progression.plank).toEqual(initialLift(0));
    expect(s.progression["ab-wheel"]).toEqual(initialLift(0));
  });
  it("persists swaps through database reopen, full backup restoration and recovery snapshots", async () => {
    const s = withAccessory();
    swapAccessory(s, 5, "hammer", 8);
    finishSession(s);
    startSession(s, "A");
    swapAccessory(s, 5, "db-curl", 9);
    const name = crypto.randomUUID();
    await saveState(s, 0, name);
    expect((await loadState(name)).state).toEqual(s);
    const backup = await makeBackup(s);
    expect(JSON.parse(backup).version).toBe(3);
    const restored = (await parseBackup(backup)).state;
    const before = freshState();
    await saveState(before, 1, name);
    await saveState(restored, 2, name, true);
    expect((await loadState(name)).state).toEqual(s);
    expect(await recoveryState(name)).toEqual(before);
    const invalid = structuredClone(restored);
    invalid.active!.lifts[5].replaced!.exercise.id = "missing";
    await expect(saveState(invalid, 3, name, true)).rejects.toThrow();
    expect((await loadState(name)).state).toEqual(s);
    expect(await recoveryState(name)).toEqual(before);
  });
  it("migrates real v2 data and checksum-protected v2 backups without rewriting active or historical snapshots", async () => {
    const s = freshState();
    startSession(s, "A");
    tapWorkingSet(s, 0, 0);
    finishSession(s);
    startSession(s, "B");
    tapWorkingSet(s, 0, 0);
    const legacy = { ...s, schemaVersion: 2 } as unknown as State;
    const backup = JSON.parse(await makeBackup(legacy));
    backup.version = 2;
    expect((await parseBackup(JSON.stringify(backup))).state).toEqual(s);
    const name = crypto.randomUUID();
    const db = await openDatabase(name);
    await new Promise<void>((resolve) => {
      const tx = db.transaction("state", "readwrite");
      tx.objectStore("state").put({ state: legacy, revision: 12 }, "current");
      tx.oncomplete = () => resolve();
    });
    db.close();
    expect(await loadState(name)).toMatchObject({ state: s, revision: 12 });
  });
  it("rejects malformed, core or self-referencing original snapshots", () => {
    const s = withAccessory();
    swapAccessory(s, 5, "hammer", 7);
    const invalid = structuredClone(s);
    invalid.active!.lifts[5].replaced!.prescription.core = true;
    expect(() => validateState(invalid)).toThrow();
    invalid.active!.lifts[5].replaced!.prescription.core = false;
    invalid.active!.lifts[5].replaced!.exercise.id = "hammer";
    invalid.active!.lifts[5].replaced!.prescription.exerciseId = "hammer";
    expect(() => validateState(invalid)).toThrow();
  });
});
