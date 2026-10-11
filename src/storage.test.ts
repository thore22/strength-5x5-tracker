import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { loadState, saveState } from "./storage";
import { startSession } from "./engine";
describe("durable storage", () => {
  it("unfinished session survives closing and reopening the database", async () => {
    const name = crypto.randomUUID();
    const x = await loadState(name);
    startSession(x.state, "B");
    x.state.active!.lifts[0].sets[0].reps = 5;
    await saveState(x.state, 0, name);
    const next = await loadState(name);
    expect(next.state.active).toEqual(x.state.active);
  });
  it("persists templates and prevents stale tabs overwriting changes", async () => {
    const name = crypto.randomUUID();
    const x = await loadState(name);
    x.state.templates.A.pop();
    expect(await saveState(x.state, 0, name)).toBe(1);
    const y = await loadState(name);
    expect(y.state.templates.A).toHaveLength(5);
    await expect(saveState(x.state, 0, name)).rejects.toThrow("Another tab");
    expect((await loadState(name)).state).toEqual(x.state);
  });
});
