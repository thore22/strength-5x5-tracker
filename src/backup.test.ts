import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { freshState } from "./defaults";
import { backupDue, makeBackup, parseBackup } from "./backup";
import { finishSession, startSession } from "./engine";
import { loadState, saveState, openDatabase } from "./storage";
import { migrateState, validateState } from "./validation";
describe("complete backup and recovery", () => {
  it("round-trips every record, settings, counters, timer and unfinished session", async () => {
    const s = freshState();
    startSession(s, "A");
    s.active!.lifts[0].sets.forEach((x) => {
      x.reps = 5;
    });
    finishSession(s);
    startSession(s, "B");
    s.active!.lifts[0].sets[0].reps = 4;
    s.timerEnd = Date.now() + 10000;
    s.settings.audio = true;
    s.settings.primaryColor = "#e040fb";
    s.settings.secondaryColor = "#151525";
    const result = await parseBackup(await makeBackup(s));
    expect(result.state).toEqual(s);
  });
  it("rejects corrupted, invalid and future backups", async () => {
    const s = freshState();
    const b = JSON.parse(await makeBackup(s));
    b.data.next = "B";
    await expect(parseBackup(JSON.stringify(b))).rejects.toThrow("integrity");
    await expect(parseBackup("{")).rejects.toThrow("JSON");
    b.version = 99;
    await expect(parseBackup(JSON.stringify(b))).rejects.toThrow("Unsupported");
  });
  it("validates required nested fields and internal references", () => {
    const s = freshState();
    s.templates.A[0].exerciseId = "missing";
    expect(() => validateState(s)).toThrow("references");
    const t = freshState();
    t.progression.squat.weight = NaN;
    expect(() => validateState(t)).toThrow("Invalid training");
    const u = freshState();
    u.templates.A.push(u.templates.A[0]);
    expect(() => validateState(u)).toThrow("duplicate");
  });
  it("migrates version 1 backups while retaining history and active session", async () => {
    const s = freshState();
    startSession(s, "A");
    finishSession(s);
    startSession(s, "B");
    const legacy = { ...s, schemaVersion: 1 } as Record<string, unknown>;
    delete legacy.timerEnd;
    delete legacy.reminderDismissedAt;
    const b = {
      format: "strength-tracker",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: legacy,
    };
    const r = await parseBackup(JSON.stringify(b));
    expect(r.state).toEqual(s);
    expect(migrateState(legacy).history).toEqual(s.history);
  });
  it("failed validation leaves existing database untouched", async () => {
    const name = crypto.randomUUID();
    const { state } = await loadState(name);
    await saveState(state, 0, name);
    const invalid = structuredClone(state);
    invalid.exercises = [];
    await expect(saveState(invalid, 1, name, true)).rejects.toThrow();
    expect((await loadState(name)).state).toEqual(state);
  });
  it("atomic replacement retains pre-restore recovery snapshot", async () => {
    const name = crypto.randomUUID();
    const old = freshState();
    startSession(old, "A");
    await saveState(old, 0, name);
    const next = freshState();
    next.next = "B";
    await saveState(next, 1, name, true);
    expect((await loadState(name)).state).toEqual(next);
    const db = await openDatabase(name);
    const saved = await new Promise<{ state: unknown }>((resolve) => {
      const r = db
        .transaction("recovery")
        .objectStore("recovery")
        .get("before-restore");
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    expect(saved.state).toEqual(old);
  });
  it("version 1 IndexedDB upgrade preserves state and history", async () => {
    const name = crypto.randomUUID(),
      s = freshState();
    startSession(s, "A");
    finishSession(s);
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => r.result.createObjectStore("state");
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction("state", "readwrite");
      tx.objectStore("state").put(
        { state: { ...s, schemaVersion: 1 }, revision: 4 },
        "current",
      );
      tx.oncomplete = () => resolve();
    });
    db.close();
    const next = await loadState(name);
    expect(next.revision).toBe(4);
    expect(next.state).toEqual(s);
  });
  it("reminds after three workouts or seven days and supports one-day dismissal", () => {
    const s = freshState();
    const now = Date.parse(s.createdAt);
    expect(backupDue(s, now)).toBe(false);
    s.workoutsSinceBackup = 3;
    expect(backupDue(s, now)).toBe(true);
    s.reminderDismissedAt = s.createdAt;
    expect(backupDue(s, now)).toBe(false);
    expect(backupDue(s, now + 86400000)).toBe(true);
    s.workoutsSinceBackup = 0;
    s.reminderDismissedAt = null;
    expect(backupDue(s, now + 7 * 86400000)).toBe(true);
  });
});
