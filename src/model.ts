export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "weighted bodyweight"
  | "assisted bodyweight"
  | "bodyweight"
  | "timed";
export interface Exercise {
  id: string;
  name: string;
  equipment: Equipment;
  description: string;
}
export interface Rule {
  mode: "linear" | "double" | "manual";
  increment: number;
  frequency: 1 | 2 | 3;
  deloadPercent: number;
  failuresBeforeDeload: number;
}
export interface Prescription {
  exerciseId: string;
  core: boolean;
  sets: number;
  minReps: number;
  maxReps: number;
  rest: number;
  rule: Rule;
}
export interface LiftState {
  weight: number;
  failures: number;
  successes: number;
  failureWeight: number | null;
  suggestion: number | null;
}
export interface SetLog {
  reps: number | null;
  weight: number;
}
export interface Warmup {
  reps: number;
  weight: number;
  done: boolean;
  skipped: boolean;
}
export interface SessionLift {
  exercise: Exercise;
  prescription: Prescription;
  prescribedWeight: number;
  sets: SetLog[];
  warmups: Warmup[];
  skipped: boolean;
  outcome?: "success" | "failure" | "skipped";
  deload?: boolean;
}
export interface Session {
  id: string;
  template: "A" | "B";
  startedAt: string;
  completedAt: string | null;
  paused: boolean;
  lifts: SessionLift[];
  notes: string;
}
export interface Settings {
  units: "kg" | "lb";
  barWeight: number;
  plateIncrement: number;
  defaultRest: number;
  audio: boolean;
  vibration: boolean;
  theme: "dark" | "system";
  primaryColor?: string;
  secondaryColor?: string;
}
export interface State {
  schemaVersion: 2;
  exercises: Exercise[];
  templates: { A: Prescription[]; B: Prescription[] };
  progression: Record<string, LiftState>;
  history: Session[];
  active: Session | null;
  next: "A" | "B";
  settings: Settings;
  timerEnd: number | null;
  lastBackup: string | null;
  workoutsSinceBackup: number;
  reminderDismissedAt: string | null;
  createdAt: string;
}
export const rule = (mode: Rule["mode"] = "linear"): Rule => ({
  mode,
  increment: 2.5,
  frequency: 1,
  deloadPercent: 10,
  failuresBeforeDeload: 3,
});
export const initialLift = (weight = 20): LiftState => ({
  weight,
  failures: 0,
  successes: 0,
  failureWeight: null,
  suggestion: null,
});
