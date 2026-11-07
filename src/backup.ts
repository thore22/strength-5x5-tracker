import { migrateState } from "./validation";
import type { State } from "./model";
export interface Backup {
  format: "strength-tracker";
  version: 1 | 2 | 3;
  exportedAt: string;
  checksum?: string;
  data: unknown;
}
async function checksum(data: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(data)),
  );
  return Array.from(new Uint8Array(digest), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
}
export async function makeBackup(
  state: State,
  now = new Date().toISOString(),
): Promise<string> {
  const data = structuredClone(state);
  return JSON.stringify(
    {
      format: "strength-tracker",
      version: 3,
      exportedAt: now,
      checksum: await checksum(data),
      data,
    },
    null,
    2,
  );
}
export async function parseBackup(
  text: string,
): Promise<{ state: State; exportedAt: string; version: number }> {
  if (text.length > 50 * 1024 * 1024)
    throw new Error("Backup is too large (maximum 50 MB).");
  let b: Backup;
  try {
    b = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  if (
    !b ||
    b.format !== "strength-tracker" ||
    ![1, 2, 3].includes(b.version) ||
    !Number.isFinite(Date.parse(b.exportedAt))
  )
    throw new Error("Unsupported or invalid Strength backup.");
  if (
    b.version >= 2 &&
    (typeof b.checksum !== "string" || (await checksum(b.data)) !== b.checksum)
  )
    throw new Error(
      "Backup integrity check failed. This file may be incomplete or changed.",
    );
  const state = migrateState(b.data);
  return { state, exportedAt: b.exportedAt, version: b.version };
}
export function backupDue(s: State, now = Date.now()): boolean {
  const since = s.lastBackup ?? s.createdAt;
  const due =
    s.workoutsSinceBackup >= 3 || now - Date.parse(since) >= 7 * 86400000;
  return (
    due &&
    (!s.reminderDismissedAt ||
      now - Date.parse(s.reminderDismissedAt) >= 86400000)
  );
}
export function download(
  text: string,
  name: string,
  type = "application/json",
): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
