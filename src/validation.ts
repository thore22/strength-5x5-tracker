import { z } from "zod";
import type { State } from "./model";
const num = z.number().finite().min(0).max(100000);
const count = z.number().int().min(0).max(1000000);
const timestamp = z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER);
const id = z.string().min(1).max(200);
const date = z
  .string()
  .refine((x) => Number.isFinite(Date.parse(x)), "Invalid date");
const exercise = z
  .object({
    id,
    name: z.string().trim().min(1).max(100),
    equipment: z.enum([
      "barbell",
      "dumbbell",
      "machine",
      "weighted bodyweight",
      "assisted bodyweight",
      "bodyweight",
      "timed",
    ]),
    description: z.string().max(1000),
  })
  .strict();
const rule = z
  .object({
    mode: z.enum(["linear", "double", "manual"]),
    increment: num.positive(),
    frequency: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    deloadPercent: z.number().min(1).max(50),
    failuresBeforeDeload: count.min(1).max(10),
  })
  .strict();
const prescription = z
  .object({
    exerciseId: id,
    core: z.boolean(),
    sets: count.min(1).max(20),
    minReps: count.min(1).max(3600),
    maxReps: count.min(1).max(3600),
    rest: num.max(3600),
    rule,
  })
  .strict()
  .refine(
    (x) => x.maxReps >= x.minReps,
    "Rep range maximum must be at least minimum",
  );
const liftState = z
  .object({
    weight: num.max(2000),
    failures: count,
    successes: count,
    failureWeight: num.nullable(),
    suggestion: num.nullable(),
  })
  .strict();
// Validate stored snapshot integrity independently of today's curated swap list:
// future catalog-policy edits must never invalidate historical training data.
const lift = z
  .object({
    exercise,
    prescription,
    prescribedWeight: num.max(2000),
    sets: z
      .array(
        z
          .object({ reps: count.max(3600).nullable(), weight: num.max(2000) })
          .strict(),
      )
      .max(20),
    warmups: z
      .array(
        z
          .object({
            reps: count.min(1).max(100),
            weight: num.max(2000),
            done: z.boolean(),
            skipped: z.boolean(),
            custom: z.boolean().optional(),
          })
          .strict(),
      )
      .max(20),
    skipped: z.boolean(),
    outcome: z.enum(["success", "failure", "skipped"]).optional(),
    deload: z.boolean().optional(),
    replaced: z
      .object({
        exercise,
        prescription,
        prescribedWeight: num.max(2000),
      })
      .strict()
      .refine(
        (x) =>
          !x.prescription.core && x.exercise.id === x.prescription.exerciseId,
        "Invalid original accessory snapshot",
      )
      .optional(),
  })
  .strict()
  .refine(
    (x) =>
      x.exercise.id === x.prescription.exerciseId &&
      x.sets.length === x.prescription.sets &&
      (!x.replaced ||
        (!x.prescription.core && x.replaced.exercise.id !== x.exercise.id)),
    "Invalid session prescription",
  );
const session = z
  .object({
    id,
    template: z.enum(["A", "B"]),
    startedAt: date,
    completedAt: date.nullable(),
    paused: z.boolean(),
    lifts: z.array(lift).max(100),
    notes: z.string().max(5000),
  })
  .strict();
export const stateSchema = z
  .object({
    schemaVersion: z.literal(3),
    exercises: z.array(exercise).min(1).max(1000),
    templates: z
      .object({
        A: z.array(prescription).max(100),
        B: z.array(prescription).max(100),
      })
      .strict(),
    progression: z.record(id, liftState),
    history: z.array(session).max(100000),
    active: session.nullable(),
    next: z.enum(["A", "B"]),
    settings: z
      .object({
        units: z.enum(["kg", "lb"]),
        barWeight: num.max(2000),
        plateIncrement: num.positive().max(100),
        defaultRest: num.max(3600),
        audio: z.boolean(),
        vibration: z.boolean(),
        theme: z.enum(["dark", "system"]),
        primaryColor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        secondaryColor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
      })
      .strict(),
    timerEnd: timestamp.nullable(),
    lastBackup: date.nullable(),
    workoutsSinceBackup: count,
    reminderDismissedAt: date.nullable(),
    createdAt: date,
  })
  .strict();
export function validateState(input: unknown): State {
  const parsed = stateSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      `Invalid training data: ${parsed.error.issues[0].path.join(".")} — ${parsed.error.issues[0].message}`,
    );
  const s = parsed.data as State;
  const unique = (ids: string[]) => new Set(ids).size === ids.length;
  const ids = s.exercises.map((e) => e.id);
  if (!unique(ids) || !unique(s.history.map((h) => h.id)))
    throw new Error("Duplicate exercise or workout identifiers.");
  for (const template of Object.values(s.templates))
    if (
      !unique(template.map((p) => p.exerciseId)) ||
      template.some((p) => !ids.includes(p.exerciseId))
    )
      throw new Error("Template has duplicate or unknown exercise references.");
  if (
    ids.some((x) => !s.progression[x]) ||
    Object.keys(s.progression).some((x) => !ids.includes(x))
  )
    throw new Error("Missing or unknown exercise progression references.");
  for (const h of [...s.history, ...(s.active ? [s.active] : [])])
    if (
      !unique(h.lifts.map((l) => l.exercise.id)) ||
      h.lifts.some(
        (l) =>
          !ids.includes(l.exercise.id) ||
          (l.replaced && !ids.includes(l.replaced.exercise.id)),
      )
    )
      throw new Error("Workout has duplicate or unknown exercise references.");
  if (
    s.history.some((h) => h.completedAt === null) ||
    (s.active &&
      (s.active.completedAt !== null ||
        s.history.some((h) => h.id === s.active!.id)))
  )
    throw new Error("Invalid completed or active workout references.");
  return s;
}
export function migrateState(input: unknown): State {
  if (!input || typeof input !== "object")
    throw new Error("Missing training state.");
  const raw = input as Record<string, unknown>;
  if (raw.schemaVersion === 1 || raw.schemaVersion === 2)
    return validateState({
      ...raw,
      schemaVersion: 3,
      timerEnd: raw.timerEnd ?? null,
      reminderDismissedAt: raw.reminderDismissedAt ?? null,
    });
  if (raw.schemaVersion !== 3)
    throw new Error(
      "Unsupported data version. Update the app before restoring this file.",
    );
  return validateState(raw);
}
