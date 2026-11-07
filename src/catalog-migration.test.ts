import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { accessoryAdditionIds, freshState } from "./defaults";
import { finishSession, startSession, tapWorkingSet } from "./engine";
import { migrateState, validateState } from "./validation";
import { makeBackup, parseBackup } from "./backup";
import { initialLift, type State } from "./model";
import { loadState, openDatabase, recoveryState, saveState } from "./storage";
import { accessoryOptions, swapAccessory } from "./accessories";

function oldCatalog() {
  const state = freshState();
  state.exercises = state.exercises.filter(
    (e) => !accessoryAdditionIds.includes(e.id),
  );
  for (const id of accessoryAdditionIds) delete state.progression[id];
  startSession(state, "A");
  tapWorkingSet(state, 0, 0);
  finishSession(state);
  startSession(state, "B");
  tapWorkingSet(state, 0, 0);
  state.exercises.find((e) => e.id === "lateral")!.description =
    "My saved technique notes";
  state.progression.lateral = { ...initialLift(9), successes: 2 };
  return state;
}
describe("additive accessory catalog update", () => {
  it.each([1, 2, 3])(
    "adds only missing definitions to v%s without changing training data or input",
    (version) => {
      const old = oldCatalog();
      const input = { ...old, schemaVersion: version };
      const before = structuredClone(input);
      const next = migrateState(input);
      expect(input).toEqual(before);
      expect(next.history).toEqual(old.history);
      expect(next.active).toEqual(old.active);
      expect(next.templates).toEqual(old.templates);
      expect(next.settings).toEqual(old.settings);
      expect(next.exercises.slice(0, old.exercises.length)).toEqual(
        old.exercises,
      );
      for (const [id, progress] of Object.entries(old.progression))
        expect(next.progression[id]).toEqual(progress);
      expect(next.exercises).toHaveLength(old.exercises.length + 3);
      expect(validateState(next)).toEqual(next);
      expect(migrateState(next)).toEqual(next);
      expect(accessoryOptions(next, 4).map((o) => o.exercise.id)).toEqual([
        "cable-lateral",
      ]);
    },
  );
  it("never overwrites existing definitions, IDs or progression and does not repair invalid backups", () => {
    const state = freshState();
    state.exercises.find((e) => e.id === "cable-lateral")!.name =
      "My cable setup";
    state.progression["cable-lateral"] = {
      ...initialLift(17),
      suggestion: 19.5,
    };
    expect(migrateState(state)).toEqual(state);
    delete state.progression["db-reverse-fly"];
    expect(() => migrateState(state)).toThrow("references");
  });
  it("reopens an old catalog and restores old backups atomically with a recovery snapshot", async () => {
    const old = oldCatalog();
    const name = crypto.randomUUID();
    const db = await openDatabase(name);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("state", "readwrite");
      tx.objectStore("state").put({ state: old, revision: 4 }, "current");
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
    const reopened = await loadState(name);
    expect(reopened.state.active).toEqual(old.active);
    expect(reopened.state.history).toEqual(old.history);
    swapAccessory(reopened.state, 4, "cable-lateral", 4);
    await saveState(reopened.state, 4, name);
    const backup = JSON.parse(
      await makeBackup({ ...old, schemaVersion: 2 } as unknown as State),
    );
    backup.version = 2;
    const restored = (await parseBackup(JSON.stringify(backup))).state;
    await saveState(restored, 5, name, true);
    expect((await loadState(name)).state.active).toEqual(old.active);
    expect(await recoveryState(name)).toEqual(reopened.state);
    const newBackup = await parseBackup(await makeBackup(reopened.state));
    expect(newBackup.state).toEqual(reopened.state);
  });
});
