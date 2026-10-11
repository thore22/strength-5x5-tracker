import { freshState } from "./defaults";
import type { State } from "./model";
import { migrateState, validateState } from "./validation";
export const DB_NAME = "strength-tracker";
export async function rawState(
  name = DB_NAME,
): Promise<{ state: unknown; revision: number } | null> {
  const db = await openDatabase(name);
  try {
    return await new Promise((resolve, reject) => {
      const r = db
        .transaction("state", "readonly")
        .objectStore("state")
        .get("current");
      r.onsuccess = () => resolve(r.result ?? null);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
export interface Loaded {
  state: State;
  revision: number;
  fresh: boolean;
}
export function openDatabase(name = DB_NAME): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(name, 2);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains("state")) d.createObjectStore("state");
      if (!d.objectStoreNames.contains("recovery"))
        d.createObjectStore("recovery");
    };
    r.onsuccess = () => {
      r.result.onversionchange = () => r.result.close();
      resolve(r.result);
    };
    r.onerror = () => reject(r.error);
    r.onblocked = () =>
      reject(
        new Error("Close other Strength tabs to finish the storage upgrade."),
      );
  });
}
export async function loadState(name = DB_NAME): Promise<Loaded> {
  const db = await openDatabase(name);
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("state", "readonly");
      const r = tx.objectStore("state").get("current");
      r.onsuccess = () => {
        try {
          const saved = r.result;
          resolve(
            saved
              ? {
                  state: migrateState(saved.state),
                  revision: saved.revision,
                  fresh: false,
                }
              : { state: freshState(), revision: 0, fresh: true },
          );
        } catch (e) {
          reject(e);
        }
      };
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
export async function saveState(
  state: State,
  expectedRevision: number,
  name = DB_NAME,
  recovery = false,
): Promise<number> {
  validateState(state);
  const db = await openDatabase(name);
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(["state", "recovery"], "readwrite");
      const s = tx.objectStore("state");
      let reason: Error | null = null;
      const r = s.get("current");
      r.onsuccess = () => {
        if ((r.result?.revision ?? 0) !== expectedRevision) {
          reason = new Error(
            "Another tab changed your data. Reload before continuing. Your unsaved change was not applied.",
          );
          tx.abort();
          return;
        }
        if (recovery && r.result)
          tx.objectStore("recovery").put(r.result, "before-restore");
        s.put({ state, revision: expectedRevision + 1 }, "current");
      };
      tx.oncomplete = () => resolve(expectedRevision + 1);
      tx.onabort = () =>
        reject(
          reason ??
            tx.error ??
            new Error(
              "Storage write failed. Export a backup and free device space.",
            ),
        );
      tx.onerror = () => {
        reason = tx.error;
      };
    });
  } finally {
    db.close();
  }
}
export async function recoveryState(name = DB_NAME): Promise<State | null> {
  const db = await openDatabase(name);
  try {
    return await new Promise((resolve, reject) => {
      const r = db
        .transaction("recovery", "readonly")
        .objectStore("recovery")
        .get("before-restore");
      r.onsuccess = () => {
        try {
          resolve(r.result ? migrateState(r.result.state) : null);
        } catch (e) {
          reject(e);
        }
      };
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
